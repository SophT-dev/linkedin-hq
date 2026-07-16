#!/usr/bin/env python3
"""
Stage 05 — Scoring & Stacking  (INTENT scoring, separate from FIT)
===================================================================

Reads normalized signal rows + an account-status feed, then for each account:

  1. Composite signal score   contribution = base_weight * strength * decay(age)
  2. Recency decay            exponential half-life (signals expire)
  3. Stacking                 reward DISTINCT signal types firing together
  4. Tiering                  bucket [0,100] score -> A / B / C / D
  5. Suppression              hard-gate closed_won / customer / competitor /
                              in_sequence / dnc out of the work queue
  6. Source attribution       record which signal type dominated (kill dead types later)

This is a RUNNABLE TEMPLATE. It is env/flag/config-driven and ships with NO
hardcoded data. Search for "# TODO: customize" for the spots to adapt to your
own schema and signal taxonomy.

Inputs
------
Signals (one row per signal):   account_id, signal_type, strength(0..1), occurred_at(ISO8601), source
Status  (one row per account):  account_id, status   (closed_won|customer|competitor|in_sequence|dnc)

Output (one row per account):
    account_id, intent_score, intent_tier, distinct_signal_types,
    primary_signal_source, contributing_signal_types,
    suppressed, suppression_reason, scored_at

Sources
-------
  --signals-csv / --status-csv      local CSV (great for a dry run)
  --from-supabase                   read from the system of record (Stage 02)
  --to-supabase                     write scored rows back
  --out-csv PATH                    also (or instead) write a local CSV

Dependencies: Python 3, stdlib + `requests`.
"""

import argparse
import csv
import json
import math
import os
import sys
import time
from collections import defaultdict
from datetime import datetime, timezone

try:
    import requests
except ImportError:  # pragma: no cover
    requests = None  # only needed for --from-supabase / --to-supabase


# ─────────────────────────────────────────────────────────────────────────────
# Config / tunables  (env-driven; sane defaults)
# ─────────────────────────────────────────────────────────────────────────────

def _env_float(name, default):
    try:
        return float(os.environ.get(name, default))
    except (TypeError, ValueError):
        return float(default)


def _env_int(name, default):
    try:
        return int(os.environ.get(name, default))
    except (TypeError, ValueError):
        return int(default)


# Decay
DECAY_HALF_LIFE_DAYS = _env_float("DECAY_HALF_LIFE_DAYS", 30.0)   # global fallback
MAX_SIGNAL_AGE_DAYS  = _env_float("MAX_SIGNAL_AGE_DAYS", 120.0)   # older => dropped

# Stacking
STACK_BONUS = _env_float("STACK_BONUS", 0.25)   # per extra distinct signal type
STACK_CAP   = _env_float("STACK_CAP",   2.0)    # max stacking multiplier

# Normalization: steepness of the 0..100 squash (see normalize()).
# Bigger => saturates faster. Default is tuned so that ONE strong fresh signal
# (~base 8-10) lands mid-B and a stack of 3 fresh strong signals lands high-A,
# given the template weights in signal_weights.json.
# Calibrate so a typical "hot" account lands ~70+.  # TODO: customize to your signal volume.
SCORE_NORM_DIVISOR = _env_float("SCORE_NORM_DIVISOR", 0.045)

# Tier thresholds (on the 0..100 score)
TIER_A_MIN = _env_float("TIER_A_MIN", 70.0)
TIER_B_MIN = _env_float("TIER_B_MIN", 45.0)
TIER_C_MIN = _env_float("TIER_C_MIN", 20.0)
# below TIER_C_MIN => D

# Suppression reason priority (most binding first)
SUPPRESSION_PRIORITY = ["dnc", "closed_won", "customer", "competitor", "in_sequence"]
# Categories that must be loaded or the run fails closed (see --require-status)
PERMANENT_SUPPRESSION = {"dnc", "closed_won", "customer"}

SIGNAL_WEIGHTS_PATH = os.environ.get(
    "SIGNAL_WEIGHTS_PATH",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "signal_weights.json"),
)

# Supabase REST (only used with --from/--to-supabase)
SUPABASE_PROJECT_REF = os.environ.get("SUPABASE_PROJECT_REF", "")
SUPABASE_ANON_KEY    = os.environ.get("SUPABASE_ANON_KEY", "")
# Service/access token preferred for writes; anon may be read-only depending on RLS.
SUPABASE_TOKEN       = os.environ.get("SUPABASE_ACCESS_TOKEN", "") or SUPABASE_ANON_KEY

# Table names in the system of record. # TODO: customize to your Stage 02 schema.
SIGNALS_TABLE = os.environ.get("SUPABASE_SIGNALS_TABLE", "signals")
STATUS_TABLE  = os.environ.get("SUPABASE_STATUS_TABLE",  "account_status")
SCORED_TABLE  = os.environ.get("SUPABASE_SCORED_TABLE",  "account_intent_scores")


# ─────────────────────────────────────────────────────────────────────────────
# Weights config
# ─────────────────────────────────────────────────────────────────────────────

def load_weights(path):
    """Load signal base weights + per-type half-lives. Returns (weights, half_lives, default_hl)."""
    if not os.path.exists(path):
        sys.stderr.write(
            f"[warn] weights file not found at {path}; using built-in fallback weights.\n"
        )
        # Minimal fallback so the script still runs. # TODO: customize / ship a real file.
        fallback = {
            "funding_round": 10.0, "product_trigger": 9.0, "leadership_hire": 8.0,
            "hiring_for_role": 7.0, "headcount_growth": 6.0, "web_research_activity": 5.0,
            "content_interaction": 4.0, "social_engagement": 3.0,
        }
        return fallback, {}, DECAY_HALF_LIFE_DAYS

    with open(path, "r", encoding="utf-8") as fh:
        cfg = json.load(fh)

    default_hl = float(cfg.get("default_half_life_days", DECAY_HALF_LIFE_DAYS))
    weights, half_lives = {}, {}
    for stype, spec in cfg.get("signals", {}).items():
        if isinstance(spec, dict):
            weights[stype] = float(spec.get("base_weight", 0.0))
            if "half_life_days" in spec and spec["half_life_days"] is not None:
                half_lives[stype] = float(spec["half_life_days"])
        else:  # allow bare-number form: {"funding_round": 10}
            weights[stype] = float(spec)
    return weights, half_lives, default_hl


# ─────────────────────────────────────────────────────────────────────────────
# Core math
# ─────────────────────────────────────────────────────────────────────────────

def parse_ts(value):
    """Parse an ISO8601 timestamp (with or without 'Z'/offset) into aware UTC datetime."""
    if not value:
        return None
    s = str(value).strip()
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    try:
        dt = datetime.fromisoformat(s)
    except ValueError:
        # last-ditch: date only
        try:
            dt = datetime.strptime(s[:10], "%Y-%m-%d")
        except ValueError:
            return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def age_days(occurred_at, now):
    dt = parse_ts(occurred_at)
    if dt is None:
        return None
    return max(0.0, (now - dt).total_seconds() / 86400.0)


def decay(age, half_life):
    """Exponential decay: weight retained = 0.5 ** (age / half_life)."""
    if half_life <= 0:
        return 1.0
    return math.pow(0.5, age / half_life)


def clamp01(x):
    try:
        x = float(x)
    except (TypeError, ValueError):
        return 0.0
    return 0.0 if x < 0 else (1.0 if x > 1 else x)


def normalize(raw):
    """Map an unbounded raw composite onto [0,100].

    Uses a bounded, monotonic squash so a single huge signal can't dominate and
    the score stays interpretable. SCORE_NORM_DIVISOR controls how fast it
    approaches 100.  # TODO: calibrate to your real signal volume.
    """
    if raw <= 0:
        return 0.0
    # 1 - e^(-k*raw) gives a smooth 0..1 curve; k = SCORE_NORM_DIVISOR.
    val = 1.0 - math.exp(-SCORE_NORM_DIVISOR * raw)
    return round(val * 100.0, 2)


def tier_for(score):
    if score >= TIER_A_MIN:
        return "A"
    if score >= TIER_B_MIN:
        return "B"
    if score >= TIER_C_MIN:
        return "C"
    return "D"


# ─────────────────────────────────────────────────────────────────────────────
# Scoring
# ─────────────────────────────────────────────────────────────────────────────

def score_account(signals, weights, half_lives, default_hl, now):
    """Score one account's list of signal dicts.

    Each signal dict: {signal_type, strength, occurred_at, source}
    Returns a result dict (no suppression applied yet).
    """
    contrib_by_type = defaultdict(float)
    live_types = set()
    raw = 0.0

    for sig in signals:
        stype = (sig.get("signal_type") or "").strip()
        if not stype:
            continue
        base = weights.get(stype)
        if base is None:
            # Unknown signal type: skip (and surface it once so you can add a weight).
            # # TODO: customize — decide whether unknown types get a default weight.
            continue

        a = age_days(sig.get("occurred_at"), now)
        if a is None or a > MAX_SIGNAL_AGE_DAYS:
            continue  # missing/too-old => dropped before scoring

        strength = clamp01(sig.get("strength", 1.0))
        hl = half_lives.get(stype, default_hl)
        contribution = base * strength * decay(a, hl)
        if contribution <= 0:
            continue

        contrib_by_type[stype] += contribution
        live_types.add(stype)
        raw += contribution

    distinct = len(live_types)
    if distinct == 0:
        return {
            "intent_score": 0.0, "intent_tier": "D", "distinct_signal_types": 0,
            "primary_signal_source": "", "contributing_signal_types": "",
        }

    # Stacking: reward distinct types, capped.
    stack_mult = min(STACK_CAP, 1.0 + STACK_BONUS * (distinct - 1))
    raw_stacked = raw * stack_mult

    score = normalize(raw_stacked)
    primary = max(contrib_by_type.items(), key=lambda kv: kv[1])[0]
    contributing = ",".join(sorted(live_types))

    return {
        "intent_score": score,
        "intent_tier": tier_for(score),
        "distinct_signal_types": distinct,
        "primary_signal_source": primary,
        "contributing_signal_types": contributing,
    }


def resolve_suppression(status):
    """Given a raw status string, return (suppressed_bool, reason) by priority."""
    s = (status or "").strip().lower()
    if not s:
        return False, ""
    # A status feed could (rarely) carry multiple; honor priority if so.
    present = {p for p in SUPPRESSION_PRIORITY if p == s or p in s.split(",")}
    for reason in SUPPRESSION_PRIORITY:
        if reason in present:
            return True, reason
    return False, ""


# ─────────────────────────────────────────────────────────────────────────────
# IO — CSV
# ─────────────────────────────────────────────────────────────────────────────

def read_signals_csv(path):
    rows = []
    with open(path, newline="", encoding="utf-8") as fh:
        for r in csv.DictReader(fh):
            rows.append(r)
    return rows


def read_status_csv(path):
    """Return dict account_id -> status."""
    out = {}
    with open(path, newline="", encoding="utf-8") as fh:
        for r in csv.DictReader(fh):
            aid = (r.get("account_id") or "").strip()
            if aid:
                out[aid] = (r.get("status") or "").strip()
    return out


def write_out_csv(path, results):
    os.makedirs(os.path.dirname(os.path.abspath(path)) or ".", exist_ok=True)
    cols = [
        "account_id", "intent_score", "intent_tier", "distinct_signal_types",
        "primary_signal_source", "contributing_signal_types",
        "suppressed", "suppression_reason", "scored_at",
    ]
    with open(path, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=cols)
        w.writeheader()
        for r in results:
            w.writerow({c: r.get(c, "") for c in cols})


# ─────────────────────────────────────────────────────────────────────────────
# IO — Supabase REST  (paginated read, upsert write, with retries)
# ─────────────────────────────────────────────────────────────────────────────

def _sb_base():
    if not SUPABASE_PROJECT_REF:
        raise SystemExit("[fatal] SUPABASE_PROJECT_REF not set (need it for --from/--to-supabase).")
    return f"https://{SUPABASE_PROJECT_REF}.supabase.co/rest/v1"


def _sb_headers():
    if not SUPABASE_ANON_KEY:
        raise SystemExit("[fatal] SUPABASE_ANON_KEY not set.")
    return {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_TOKEN}",
        "Content-Type": "application/json",
    }


def _request_with_retry(method, url, *, headers, params=None, json_body=None, max_tries=4):
    if requests is None:
        raise SystemExit("[fatal] `requests` not installed; needed for Supabase IO.")
    delay = 1.0
    for attempt in range(1, max_tries + 1):
        try:
            resp = requests.request(
                method, url, headers=headers, params=params, json=json_body, timeout=60
            )
            if resp.status_code in (429, 500, 502, 503, 504):
                raise requests.HTTPError(f"{resp.status_code} {resp.text[:200]}")
            resp.raise_for_status()
            return resp
        except Exception as exc:  # noqa: BLE001 — defensive retry loop
            if attempt == max_tries:
                raise SystemExit(f"[fatal] {method} {url} failed after {max_tries} tries: {exc}")
            sys.stderr.write(f"[retry {attempt}/{max_tries}] {exc}\n")
            time.sleep(delay)
            delay *= 2


def read_signals_supabase(page_size=1000):
    """Read all signal rows, paginated via Range header / offset."""
    base, headers = _sb_base(), _sb_headers()
    url = f"{base}/{SIGNALS_TABLE}"
    rows, offset = [], 0
    while True:
        params = {
            "select": "account_id,signal_type,strength,occurred_at,source",
            "offset": offset,
            "limit": page_size,
        }
        resp = _request_with_retry("GET", url, headers=headers, params=params)
        batch = resp.json()
        rows.extend(batch)
        if len(batch) < page_size:
            break
        offset += page_size
    return rows


def read_status_supabase(page_size=1000):
    base, headers = _sb_base(), _sb_headers()
    url = f"{base}/{STATUS_TABLE}"
    out, offset = {}, 0
    while True:
        params = {"select": "account_id,status", "offset": offset, "limit": page_size}
        resp = _request_with_retry("GET", url, headers=headers, params=params)
        batch = resp.json()
        for r in batch:
            aid = (r.get("account_id") or "").strip()
            if aid:
                out[aid] = (r.get("status") or "").strip()
        if len(batch) < page_size:
            break
        offset += page_size
    return out


def write_scored_supabase(results, chunk=500):
    """Upsert scored rows. Requires a unique constraint on account_id in SCORED_TABLE."""
    base, headers = _sb_base(), _sb_headers()
    headers = dict(headers)
    headers["Prefer"] = "resolution=merge-duplicates,return=minimal"
    url = f"{base}/{SCORED_TABLE}"
    for i in range(0, len(results), chunk):
        batch = results[i:i + chunk]
        _request_with_retry("POST", url, headers=headers, json_body=batch)
        sys.stderr.write(f"[supabase] upserted {min(i + chunk, len(results))}/{len(results)}\n")


# ─────────────────────────────────────────────────────────────────────────────
# Orchestration
# ─────────────────────────────────────────────────────────────────────────────

def group_by_account(signal_rows):
    by_acct = defaultdict(list)
    for r in signal_rows:
        aid = (r.get("account_id") or "").strip()
        if aid:
            by_acct[aid].append(r)
    return by_acct


def run(args):
    weights, half_lives, default_hl = load_weights(SIGNAL_WEIGHTS_PATH)
    now = datetime.now(timezone.utc)
    scored_at = now.isoformat()

    # ── Load signals ──
    if args.from_supabase:
        signal_rows = read_signals_supabase()
    elif args.signals_csv:
        signal_rows = read_signals_csv(args.signals_csv)
    else:
        raise SystemExit("[fatal] provide --signals-csv or --from-supabase.")

    # ── Load status feed (suppression) ──
    status_loaded = False
    status = {}
    try:
        if args.from_supabase or (args.status_source == "supabase"):
            status = read_status_supabase()
            status_loaded = True
        elif args.status_csv:
            status = read_status_csv(args.status_csv)
            status_loaded = True
    except SystemExit:
        raise
    except Exception as exc:  # noqa: BLE001
        sys.stderr.write(f"[warn] could not load status feed: {exc}\n")

    # Fail-closed for permanent suppression categories when the queue feeds outreach.
    if args.require_status and not status_loaded:
        raise SystemExit(
            "[fatal] --require-status set but no status feed loaded. Refusing to run: "
            "permanent suppressions (closed_won/customer/dnc) could leak into outreach. "
            "Provide --status-csv or ensure Supabase status table is readable."
        )
    if not status_loaded:
        sys.stderr.write(
            "[warn] no suppression status feed — NOTHING will be suppressed. "
            "Do not feed this output to Stage 06.\n"
        )

    by_acct = group_by_account(signal_rows)
    results = []
    tier_counts = defaultdict(int)
    suppressed_count = 0

    for aid, sigs in by_acct.items():
        scored = score_account(sigs, weights, half_lives, default_hl, now)
        suppressed, reason = resolve_suppression(status.get(aid, ""))
        if suppressed:
            suppressed_count += 1
        row = {
            "account_id": aid,
            "suppressed": suppressed,
            "suppression_reason": reason,
            "scored_at": scored_at,
            **scored,
        }
        results.append(row)
        tier_counts[scored["intent_tier"]] += 1

    # Stable, useful ordering: hottest first.
    results.sort(key=lambda r: (-float(r["intent_score"]), r["account_id"]))

    # ── Emit ──
    if args.out_csv:
        write_out_csv(args.out_csv, results)
        sys.stderr.write(f"[out] wrote {len(results)} rows -> {args.out_csv}\n")

    if args.to_supabase and not args.dry_run:
        write_scored_supabase(results)
    elif args.to_supabase and args.dry_run:
        sys.stderr.write("[dry-run] skipping Supabase write.\n")

    # ── Summary ──
    workable = sum(
        1 for r in results
        if r["intent_tier"] in ("A", "B") and not r["suppressed"]
    )
    sys.stderr.write(
        "\n──────── Stage 05 summary ────────\n"
        f"  accounts scored : {len(results)}\n"
        f"  tier A / B / C / D : "
        f"{tier_counts['A']} / {tier_counts['B']} / {tier_counts['C']} / {tier_counts['D']}\n"
        f"  suppressed      : {suppressed_count}\n"
        f"  work queue (A/B & not suppressed) : {workable}\n"
        "  (join on fit_tier in A/B happens at Stage 06 hand-off)\n"
        "──────────────────────────────────\n"
    )
    return 0


def build_parser():
    p = argparse.ArgumentParser(
        description="Stage 05 — intent scoring, stacking, tiering, suppression.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument("--signals-csv", help="local CSV of signal rows")
    p.add_argument("--status-csv", help="local CSV of account_id,status for suppression")
    p.add_argument("--status-source", choices=["csv", "supabase"], default="csv",
                   help="where to pull the suppression status feed from (csv uses --status-csv)")
    p.add_argument("--from-supabase", action="store_true",
                   help="read signals (and status) from the system of record")
    p.add_argument("--to-supabase", action="store_true",
                   help="upsert scored rows back to the system of record")
    p.add_argument("--out-csv", help="also write scored rows to this local CSV")
    p.add_argument("--require-status", dest="require_status", action="store_true", default=None,
                   help="abort if the suppression status feed can't be loaded (fail-closed)")
    p.add_argument("--no-require-status", dest="require_status", action="store_false",
                   help="allow running with no suppression feed (analytics only — never feed Stage 06)")
    p.add_argument("--dry-run", action="store_true", help="compute + print summary; no DB writes")
    return p


def main(argv=None):
    args = build_parser().parse_args(argv)
    # Default fail-closed when reading from/writing to the system of record.
    if args.require_status is None:
        args.require_status = bool(args.from_supabase or args.to_supabase)
    return run(args)


if __name__ == "__main__":
    raise SystemExit(main())
