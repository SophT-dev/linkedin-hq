#!/usr/bin/env python3
"""
Stage 04 — Signal-Led Expansion :: feedback loop (the glue that closes the loop)

This is the CONSUMER. The producers (trigify_listen.py = Trigify social signal;
serper_triggers.py = Serper trigger events) emit a stream of candidate accounts.
This script turns that stream into TAM growth:

    discovered account
        -> DEDUPE vs Supabase (domain is the key)
             |- already in TAM ? -> it's a fresh signal on a KNOWN account.
             |                       update last_signal_at + flag for re-score
             |                       (this falls back into Loop A) -> DONE
             '- net-new ?        -> continue:
        -> QUALIFY (push through Stage 01: scrape homepage / research vs ICP)
             |- DROP ? -> record the rejection (so we don't re-qualify it
             |            every cycle) -> DONE
             '- KEEP ? -> ADMIT: INSERT into Supabase company table with
                          provenance (discovered_via, discovery_signal),
                          flagged needs_signal_refresh = true so Stage 03
                          picks it up and Stage 05 re-scores it. -> DONE

Run the producers, then run this. On a daily schedule (see orchestration/), the
TAM grows on its own — gated only by the Stage 01 ICP filter.

Supabase access: PostgREST over the project's REST endpoint, using the anon key.
  base:  https://<SUPABASE_PROJECT_REF>.supabase.co/rest/v1
  auth:  apikey: <SUPABASE_ANON_KEY> + Authorization: Bearer <SUPABASE_ANON_KEY>
(If you run server-side and want to bypass RLS, swap in a service-role key via
 the SUPABASE_SERVICE_ROLE_KEY env var — never commit it.)

Usage:
  export SUPABASE_PROJECT_REF=...
  export SUPABASE_ANON_KEY=...
  python feedback_loop.py --in data/candidates.jsonl

  # dry run — show what WOULD happen, write nothing:
  python feedback_loop.py --in data/candidates.jsonl --dry-run

Python 3, stdlib + requests only.
"""

import argparse
import json
import os
import sys
import time

import requests

# --------------------------------------------------------------------------- #
# Config
# --------------------------------------------------------------------------- #
# TODO: customize to YOUR schema. These are the columns the loop reads/writes.
COMPANY_TABLE = os.environ.get("SUPABASE_COMPANY_TABLE", "company")
DOMAIN_COLUMN = "domain"            # dedupe key column on the company table
NAME_COLUMN = "company_name"

DEFAULT_TIMEOUT = 30
MAX_RETRIES = 4
RETRY_BACKOFF = 2.0


# --------------------------------------------------------------------------- #
# Supabase (PostgREST) helpers
# --------------------------------------------------------------------------- #
def _supabase_base():
    ref = os.environ.get("SUPABASE_PROJECT_REF")
    if not ref:
        sys.exit("ERROR: SUPABASE_PROJECT_REF not set (copy .env.example -> .env).")
    return f"https://{ref}.supabase.co/rest/v1"


def _supabase_key():
    # Prefer a service-role key if explicitly provided (server-side, bypasses
    # RLS); otherwise the anon key. Never hard-code either.
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_ANON_KEY")
    if not key:
        sys.exit("ERROR: SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY) not set.")
    return key


def _headers(extra=None):
    key = _supabase_key()
    h = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    if extra:
        h.update(extra)
    return h


def _request(method, path, *, params=None, json_body=None, extra_headers=None):
    url = f"{_supabase_base()}{path}"
    last_err = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = requests.request(
                method, url, headers=_headers(extra_headers),
                params=params, json=json_body, timeout=DEFAULT_TIMEOUT,
            )
        except requests.RequestException as e:
            last_err = e
            wait = RETRY_BACKOFF * (2 ** (attempt - 1))
            print(f"  [retry {attempt}/{MAX_RETRIES}] network error: {e} "
                  f"-> sleeping {wait:.0f}s", file=sys.stderr)
            time.sleep(wait)
            continue

        if resp.status_code in (401, 403):
            sys.exit("ERROR: Supabase auth error. Check SUPABASE_ANON_KEY / "
                     "SUPABASE_SERVICE_ROLE_KEY and RLS policy on "
                     f"`{COMPANY_TABLE}`.")
        if resp.status_code == 429 or resp.status_code >= 500:
            wait = RETRY_BACKOFF * (2 ** (attempt - 1))
            print(f"  [retry {attempt}/{MAX_RETRIES}] HTTP {resp.status_code} "
                  f"-> sleeping {wait:.0f}s", file=sys.stderr)
            time.sleep(wait)
            last_err = RuntimeError(f"HTTP {resp.status_code}: {resp.text[:200]}")
            continue

        if not resp.ok:
            raise RuntimeError(f"HTTP {resp.status_code}: {resp.text[:300]}")
        return resp.json() if resp.text else []

    raise RuntimeError(f"Supabase request failed after {MAX_RETRIES} attempts: {last_err}")


def find_existing(domain):
    """Return the existing company row for this domain, or None.

    Uses a case-insensitive exact match on the domain column. PostgREST filter:
    ?domain=ilike.example.com  (no wildcards => exact, case-insensitive).
    """
    if not domain:
        return None
    rows = _request(
        "GET", f"/{COMPANY_TABLE}",
        params={DOMAIN_COLUMN: f"ilike.{domain}", "select": "*", "limit": 1},
    )
    return rows[0] if rows else None


def mark_known_account_signal(row, candidate, *, dry_run=False):
    """A signal landed on an account already in the TAM. Update its signal
    metadata and flag it for re-score so it falls back into Loop A.

    TODO: align column names with your Stage 02 schema. `id` assumed PK.
    """
    pk = row.get("id")
    patch = {
        "last_signal_at": candidate["captured_at"],
        "last_signal_source": candidate["discovered_via"],
        "last_signal_detail": candidate.get("signal_detail"),
        "needs_signal_refresh": True,   # Stage 03 will re-pull; Stage 05 re-scores
    }
    if dry_run:
        print(f"    [dry-run] UPDATE known {row.get(DOMAIN_COLUMN)} -> {patch}",
              file=sys.stderr)
        return
    _request(
        "PATCH", f"/{COMPANY_TABLE}",
        params={"id": f"eq.{pk}"},
        json_body=patch,
        extra_headers={"Prefer": "return=minimal"},
    )


def admit_account(candidate, qualification, *, dry_run=False):
    """INSERT a newly qualified account into the TAM with provenance + a
    refresh flag so Stage 03/05 pick it up next pass.

    TODO: map these fields onto your actual company-table columns.
    """
    row = {
        NAME_COLUMN: candidate.get("company_name"),
        DOMAIN_COLUMN: candidate.get("domain"),
        # provenance — always be able to answer "how did this get here?"
        "discovered_via": candidate.get("discovered_via"),
        "discovery_signal": candidate.get("discovery_signal"),
        "discovery_source_url": candidate.get("source_url"),
        "discovery_signal_detail": candidate.get("signal_detail"),
        "admitted_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        # qualify outcome carried over from Stage 01:
        "qualify_status": "KEEP",
        "qualify_reason": qualification.get("reason"),
        "icp_confidence": qualification.get("confidence"),
        # hand-off flags:
        "needs_signal_refresh": True,   # Stage 03 picks this up
        "last_signal_at": candidate.get("captured_at"),
        "last_signal_source": candidate.get("discovered_via"),
    }
    if dry_run:
        print(f"    [dry-run] INSERT new {row.get(DOMAIN_COLUMN)} "
              f"({row.get(NAME_COLUMN)})", file=sys.stderr)
        return
    _request(
        "POST", f"/{COMPANY_TABLE}",
        json_body=row,
        # on_conflict makes the admit idempotent if two candidates race on the
        # same domain in one batch. TODO: ensure a UNIQUE constraint on domain.
        params={"on_conflict": DOMAIN_COLUMN},
        extra_headers={"Prefer": "resolution=merge-duplicates,return=minimal"},
    )


def record_rejection(candidate, qualification, *, dry_run=False):
    """A discovered account was DROPPED by qualify. Write a lightweight reject
    record so we don't burn qualify budget re-checking it every cycle.

    TODO: point at your own reject/seen table. If you don't have one, this is a
    no-op you can leave disabled — but a reject cache pays for itself fast.
    """
    reject_table = os.environ.get("SUPABASE_REJECT_TABLE", "discovery_rejects")
    row = {
        DOMAIN_COLUMN: candidate.get("domain"),
        NAME_COLUMN: candidate.get("company_name"),
        "discovered_via": candidate.get("discovered_via"),
        "reason": qualification.get("reason"),
        "rejected_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    if dry_run:
        print(f"    [dry-run] reject-cache {row.get(DOMAIN_COLUMN)}", file=sys.stderr)
        return
    try:
        _request(
            "POST", f"/{reject_table}",
            json_body=row,
            params={"on_conflict": DOMAIN_COLUMN},
            extra_headers={"Prefer": "resolution=merge-duplicates,return=minimal"},
        )
    except RuntimeError as e:
        # Don't let a missing reject table break the loop.
        print(f"    (skip reject-cache: {e})", file=sys.stderr)


def already_rejected(domain):
    """Has this domain already been qualified-and-dropped before? Skip it."""
    if not domain:
        return False
    reject_table = os.environ.get("SUPABASE_REJECT_TABLE", "discovery_rejects")
    try:
        rows = _request(
            "GET", f"/{reject_table}",
            params={DOMAIN_COLUMN: f"ilike.{domain}", "select": DOMAIN_COLUMN, "limit": 1},
        )
        return bool(rows)
    except RuntimeError:
        return False  # no reject table yet -> treat as not-rejected


# --------------------------------------------------------------------------- #
# Stage 01 hand-off (qualify). Wire this to your real qualifier.
# --------------------------------------------------------------------------- #
def resolve_domain_if_missing(candidate):
    """A candidate may arrive with a company name but no domain (common for
    Serper headlines and some Trigify posts). Domain is the dedupe + admit key,
    so try to resolve it before qualifying.

    TODO: wire to your domain-resolution path (e.g. Serper "<name> official
    website" search, Prospeo / AI Ark company lookup, or Firecrawl). Return the
    resolved domain string, or None to drop the candidate as un-actionable.
    """
    if candidate.get("domain"):
        return candidate["domain"]
    # Placeholder: no resolver wired yet -> can't dedupe/admit without a domain.
    return None


def qualify_account(candidate):
    """Push a NET-NEW account through Stage 01 qualification.

    This is the ICP gate that keeps signal-led expansion high-precision: a
    topic-engager or news-mention is NOT automatically an ICP fit. Discovered
    accounts pass the SAME bar your hand-sourced accounts passed in Stage 00/01.

    TODO: replace this stub with a call to your Stage 01 entrypoint
    (01-account-qualify). Typical implementation:
        1. Firecrawl-scrape the homepage at candidate["domain"].
        2. (Optional) Parallel/AI Ark research when the homepage is thin.
        3. Run your ICP classifier (Anthropic/OpenAI) over the description.
        4. Return KEEP/DROP + a reason + a confidence score.

    Returns a dict: {"status": "KEEP"|"DROP", "reason": str, "confidence": float}
    """
    # --- STUB: default to a manual-review verdict so nothing is admitted by
    # --- accident before you wire Stage 01. Replace before running for real.
    return {
        "status": "DROP",
        "reason": "qualify_account() is a stub — wire it to 01-account-qualify",
        "confidence": 0.0,
    }


# --------------------------------------------------------------------------- #
# The loop
# --------------------------------------------------------------------------- #
def read_candidates(path):
    with open(path, encoding="utf-8") as fh:
        for ln, line in enumerate(fh, 1):
            line = line.strip()
            if not line:
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError as e:
                print(f"  WARN: skipping malformed line {ln}: {e}", file=sys.stderr)


def process_candidate(candidate, stats, *, dry_run=False):
    name = candidate.get("company_name") or "(unknown)"

    # Resolve a domain — the dedupe + admit key.
    domain = resolve_domain_if_missing(candidate)
    if not domain:
        print(f"  - {name}: no resolvable domain -> skip", file=sys.stderr)
        stats["no_domain"] += 1
        return
    candidate["domain"] = domain

    # 1. DEDUPE vs the TAM.
    existing = find_existing(domain)
    if existing:
        print(f"  ~ {domain}: KNOWN account -> fresh signal, flag for re-score "
              f"(Loop A)", file=sys.stderr)
        mark_known_account_signal(existing, candidate, dry_run=dry_run)
        stats["known_updated"] += 1
        return

    # 1b. Skip accounts we already qualified-and-dropped (don't burn budget).
    if already_rejected(domain):
        print(f"  x {domain}: previously rejected -> skip", file=sys.stderr)
        stats["already_rejected"] += 1
        return

    # 2. QUALIFY net-new via Stage 01.
    print(f"  ? {domain}: net-new -> qualifying via Stage 01...", file=sys.stderr)
    q = qualify_account(candidate)
    if q.get("status") != "KEEP":
        print(f"    DROP ({q.get('reason')})", file=sys.stderr)
        record_rejection(candidate, q, dry_run=dry_run)
        stats["dropped"] += 1
        return

    # 3. ADMIT to the TAM with provenance + refresh flag.
    print(f"    KEEP -> admitting {domain} (conf={q.get('confidence')})", file=sys.stderr)
    admit_account(candidate, q, dry_run=dry_run)
    stats["admitted"] += 1


def main():
    ap = argparse.ArgumentParser(
        description="Close the signal-led-expansion loop: dedupe -> qualify -> admit.")
    ap.add_argument("--in", dest="infile", required=True,
                    help="Candidate JSONL from trigify_listen.py / serper_triggers.py.")
    ap.add_argument("--dry-run", action="store_true",
                    help="Show what would happen; write nothing to Supabase.")
    ap.add_argument("--limit", type=int, default=0,
                    help="Process at most N candidates (0 = all).")
    args = ap.parse_args()

    if not os.path.exists(args.infile):
        sys.exit(f"ERROR: input file not found: {args.infile}")

    stats = {"known_updated": 0, "admitted": 0, "dropped": 0,
             "already_rejected": 0, "no_domain": 0, "total": 0}

    for candidate in read_candidates(args.infile):
        stats["total"] += 1
        if args.limit and stats["total"] > args.limit:
            stats["total"] -= 1
            break
        try:
            process_candidate(candidate, stats, dry_run=args.dry_run)
        except RuntimeError as e:
            print(f"  ERROR on {candidate.get('domain') or candidate.get('company_name')}: {e}",
                  file=sys.stderr)

    print("\n=== feedback loop summary ===", file=sys.stderr)
    print(f"  candidates read     : {stats['total']}", file=sys.stderr)
    print(f"  known (re-scored)   : {stats['known_updated']}  (fed back to Loop A)", file=sys.stderr)
    print(f"  net-new admitted    : {stats['admitted']}  (TAM grew)", file=sys.stderr)
    print(f"  dropped by qualify  : {stats['dropped']}", file=sys.stderr)
    print(f"  skipped (rejected)  : {stats['already_rejected']}", file=sys.stderr)
    print(f"  skipped (no domain) : {stats['no_domain']}", file=sys.stderr)
    if args.dry_run:
        print("  (dry-run: nothing written)", file=sys.stderr)
    print("Next: Stage 03 re-pulls signals on flagged rows, Stage 05 re-scores.",
          file=sys.stderr)


if __name__ == "__main__":
    main()
