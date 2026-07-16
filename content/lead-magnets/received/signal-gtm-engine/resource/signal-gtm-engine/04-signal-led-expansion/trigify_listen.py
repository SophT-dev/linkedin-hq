#!/usr/bin/env python3
"""
Stage 04 — Signal-Led Expansion :: Trigify listener (signal capture)

Trigify is THE signal layer for this engine: people and companies posting or
engaging on the topics you track. This script is the primary signal-capture
surface for the discovery loop (Loop B in the stage README).

What it does:
  1. Ensure a Trigify saved search exists for your topic (create or reuse).
  2. Poll the search until it has collected results (searches are async — they
     cast a net in the background).
  3. Pull the results and extract candidate ACCOUNTS (company name -> domain)
     from the people + posts that matched.
  4. Emit one normalized candidate record per line (JSONL) for feedback_loop.py
     to dedupe / qualify / admit.

It does NOT qualify or write to Supabase — that's feedback_loop.py's job. This
script only produces the candidate stream.

API: Trigify REST, base https://api.trigify.io, auth header `x-api-key`.
Docs: https://docs.trigify.io/api-reference  (searches/create, searches/results)

Usage:
  export TRIGIFY_API_KEY=...                       # never hard-code; from .env
  python trigify_listen.py --topic "<your-icp topic>" --out data/candidates.jsonl

  # reuse an existing saved search instead of creating one:
  python trigify_listen.py --search-id ss_123 --out data/candidates.jsonl --append

Python 3, stdlib + requests only.
"""

import argparse
import json
import os
import sys
import time
from urllib.parse import urlparse

import requests

# --------------------------------------------------------------------------- #
# Config
# --------------------------------------------------------------------------- #
BASE_URL = os.environ.get("TRIGIFY_BASE_URL", "https://api.trigify.io")
API_PREFIX = "/v1"

# Public, non-secret email/social domains we never treat as a company domain.
# TODO: extend with any free/personal domains you see in your niche.
GENERIC_DOMAINS = {
    "gmail.com", "googlemail.com", "yahoo.com", "outlook.com", "hotmail.com",
    "icloud.com", "protonmail.com", "aol.com", "live.com", "msn.com",
    "linkedin.com", "twitter.com", "x.com", "facebook.com", "instagram.com",
    "youtube.com", "reddit.com", "medium.com", "substack.com", "github.com",
    "bit.ly", "lnkd.in", "t.co",
}

DEFAULT_TIMEOUT = 30
MAX_RETRIES = 4
RETRY_BACKOFF = 2.0  # seconds, exponential


# --------------------------------------------------------------------------- #
# HTTP helper — defensive: retries on 429/5xx with exponential backoff
# --------------------------------------------------------------------------- #
def _headers():
    key = os.environ.get("TRIGIFY_API_KEY")
    if not key:
        sys.exit("ERROR: TRIGIFY_API_KEY is not set. Copy .env.example to .env "
                 "and fill it in, then `export TRIGIFY_API_KEY=...`.")
    return {"x-api-key": key, "Content-Type": "application/json"}


def _request(method, path, *, params=None, json_body=None):
    url = f"{BASE_URL}{API_PREFIX}{path}"
    last_err = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = requests.request(
                method, url, headers=_headers(),
                params=params, json=json_body, timeout=DEFAULT_TIMEOUT,
            )
        except requests.RequestException as e:
            last_err = e
            wait = RETRY_BACKOFF * (2 ** (attempt - 1))
            print(f"  [retry {attempt}/{MAX_RETRIES}] network error: {e} "
                  f"-> sleeping {wait:.0f}s", file=sys.stderr)
            time.sleep(wait)
            continue

        if resp.status_code == 401:
            sys.exit("ERROR: Trigify returned 401 Unauthorized. Check "
                     "TRIGIFY_API_KEY (header must be `x-api-key`).")
        if resp.status_code == 429 or resp.status_code >= 500:
            wait = RETRY_BACKOFF * (2 ** (attempt - 1))
            print(f"  [retry {attempt}/{MAX_RETRIES}] HTTP {resp.status_code} "
                  f"-> sleeping {wait:.0f}s", file=sys.stderr)
            time.sleep(wait)
            last_err = RuntimeError(f"HTTP {resp.status_code}: {resp.text[:200]}")
            continue

        if not resp.ok:
            raise RuntimeError(f"HTTP {resp.status_code}: {resp.text[:300]}")
        return resp.json() if resp.text else {}

    raise RuntimeError(f"Trigify request failed after {MAX_RETRIES} attempts: {last_err}")


# --------------------------------------------------------------------------- #
# Trigify operations
# --------------------------------------------------------------------------- #
def create_keyword_search(topic, *, monitoring_type="linkedin-posts",
                          time_frame="past-week", frequency="DAILY",
                          max_results=50):
    """Create a saved keyword search (the listening net).

    Boolean keyword model: max 6 keywords total across OR (`keywords`) +
    AND (`keywordsAnd`) + NOT (`keywordsNot`). Keep the net BROAD here — the
    qualify gate in Stage 01 does the precision filtering, not the search.

    TODO: customize keywords for YOUR ICP topic. Split very different angles
    into separate searches rather than over-filtering a single one.
    """
    payload = {
        "name": f"signal-expansion :: {topic}",
        "monitoringType": monitoring_type,
        # OR group — any of these phrases matches:
        "keywords": [topic],
        # AND group — narrow to your category (optional):
        # "keywordsAnd": ["<your-category>"],
        # NOT group — strip obvious noise (optional):
        "keywordsNot": ["hiring", "job post", "we're hiring"],
        "timeFrame": time_frame,
        "frequency": frequency,
        "maxResults": max_results,
    }
    print(f"  creating Trigify search for topic: {topic!r}", file=sys.stderr)
    data = _request("POST", "/searches", json_body=payload)
    search_id = data.get("id") or data.get("searchId") or (data.get("data") or {}).get("id")
    if not search_id:
        raise RuntimeError(f"Could not read search id from create response: {data}")
    print(f"  created search id={search_id}", file=sys.stderr)
    return search_id


def poll_until_results(search_id, *, max_wait=600, interval=20):
    """Poll the search until it has collected at least one result, or time out.

    Searches run asynchronously — a freshly created search may have zero
    results for a minute or two. We poll a small results page rather than a
    status field so this works regardless of the exact status enum.
    """
    waited = 0
    while waited <= max_wait:
        page = fetch_results(search_id, limit=1, offset=0)
        if page:
            return True
        print(f"  no results yet (waited {waited}s) — polling...", file=sys.stderr)
        time.sleep(interval)
        waited += interval
    print(f"  WARN: no results after {max_wait}s for search {search_id}. "
          f"It may still be collecting; re-run later with --search-id.",
          file=sys.stderr)
    return False


def fetch_results(search_id, *, limit=50, offset=0):
    """Fetch one page of collected results for a search."""
    params = {"limit": limit, "offset": offset}
    data = _request("GET", f"/searches/{search_id}/results", params=params)
    # Tolerate a few common envelope shapes.
    if isinstance(data, list):
        return data
    return data.get("results") or data.get("data") or data.get("items") or []


def iter_all_results(search_id, *, page_size=50, max_records=500):
    """Page through all results up to max_records (defensive cap)."""
    offset = 0
    fetched = 0
    while fetched < max_records:
        page = fetch_results(search_id, limit=page_size, offset=offset)
        if not page:
            break
        for rec in page:
            yield rec
            fetched += 1
            if fetched >= max_records:
                return
        if len(page) < page_size:
            break
        offset += page_size


# --------------------------------------------------------------------------- #
# Account extraction — turn a post/person result into a candidate ACCOUNT
# --------------------------------------------------------------------------- #
def _first(*vals):
    for v in vals:
        if v:
            return v
    return None


def _domain_from_url(url):
    if not url:
        return None
    try:
        netloc = urlparse(url if "://" in url else f"https://{url}").netloc.lower()
    except ValueError:
        return None
    netloc = netloc.split("@")[-1].split(":")[0]
    if netloc.startswith("www."):
        netloc = netloc[4:]
    if not netloc or "." not in netloc:
        return None
    if netloc in GENERIC_DOMAINS:
        return None
    return netloc


def _domain_from_email(email):
    if not email or "@" not in email:
        return None
    dom = email.split("@")[-1].strip().lower()
    return None if dom in GENERIC_DOMAINS else (dom or None)


def extract_candidate(result):
    """Map ONE Trigify result record to the normalized candidate contract.

    Trigify result records vary by monitoring type; we read defensively across
    the common field names for the author's company and website. The dedupe
    key is `domain` — we resolve it from (in order): explicit company website,
    company-page url, work email. If none resolve, we still emit the record
    with domain=null so the loop can try to resolve it before dropping.

    TODO: print a sample result (--dump-raw) once against your real search and
    tighten these field names to whatever your account actually returns.
    """
    # The author / person who triggered the signal.
    person = result.get("author") or result.get("person") or result.get("profile") or {}
    company = (result.get("company") or person.get("company")
               or person.get("currentCompany") or {})
    if isinstance(company, str):
        company = {"name": company}

    company_name = _first(
        company.get("name"), company.get("companyName"),
        person.get("companyName"), result.get("companyName"),
    )

    # Resolve a domain from any website-ish field, then fall back to email.
    domain = _first(
        _domain_from_url(company.get("website")),
        _domain_from_url(company.get("domain")),
        _domain_from_url(company.get("websiteUrl")),
        _domain_from_email(person.get("email")),
        _domain_from_email(result.get("email")),
    )

    person_name = _first(
        person.get("name"), person.get("fullName"),
        f"{person.get('firstName','')} {person.get('lastName','')}".strip() or None,
    )

    source_url = _first(
        result.get("postUrl"), result.get("url"), result.get("link"),
        result.get("sourceUrl"),
    )
    text = _first(result.get("text"), result.get("content"), result.get("body")) or ""

    return {
        "company_name": company_name,
        "domain": domain,
        "discovered_via": "trigify",
        "discovery_signal": result.get("monitoringType") or "linkedin_post_engagement",
        "signal_detail": (text[:200] + "...") if len(text) > 200 else text,
        "source_url": source_url,
        "person_name": person_name,
        "person_title": _first(person.get("title"), person.get("headline"),
                               person.get("jobTitle")),
        "person_url": _first(person.get("profileUrl"), person.get("url"),
                             person.get("linkedinUrl")),
        "captured_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }


def is_emittable(candidate):
    """A candidate is worth emitting if we have *something* to identify the
    account: a domain (best) or at least a company name (loop can resolve)."""
    return bool(candidate.get("domain") or candidate.get("company_name"))


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #
def main():
    ap = argparse.ArgumentParser(description="Trigify signal capture -> candidate accounts (JSONL).")
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--topic", help="Topic to listen for (creates a new saved search).")
    src.add_argument("--search-id", help="Reuse an existing Trigify search id.")
    ap.add_argument("--monitoring-type", default="linkedin-posts",
                    help="Trigify monitoring type (default: linkedin-posts).")
    ap.add_argument("--time-frame", default="past-week",
                    help="past-24h | past-week | past-month | all-time")
    ap.add_argument("--max-results", type=int, default=50,
                    help="Max results the search collects (1-100).")
    ap.add_argument("--max-records", type=int, default=500,
                    help="Defensive cap on results paged through.")
    ap.add_argument("--out", required=True, help="Output JSONL path.")
    ap.add_argument("--append", action="store_true",
                    help="Append to --out instead of overwriting.")
    ap.add_argument("--no-poll", action="store_true",
                    help="Don't wait for results (use with --search-id that's already warm).")
    ap.add_argument("--dump-raw", action="store_true",
                    help="Print one raw result to stderr to inspect field names, then continue.")
    args = ap.parse_args()

    # 1. Get a search id.
    if args.search_id:
        search_id = args.search_id
    else:
        search_id = create_keyword_search(
            args.topic, monitoring_type=args.monitoring_type,
            time_frame=args.time_frame, max_results=args.max_results,
        )

    # 2. Wait for the async search to collect something.
    if not args.no_poll:
        poll_until_results(search_id)

    # 3. Page results -> extract candidate accounts -> write JSONL.
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    mode = "a" if args.append else "w"
    seen_domains = set()
    written = 0
    dumped = False

    with open(args.out, mode, encoding="utf-8") as fh:
        for result in iter_all_results(search_id, max_records=args.max_records):
            if args.dump_raw and not dumped:
                print("  --- RAW RESULT SAMPLE ---", file=sys.stderr)
                print(json.dumps(result, indent=2)[:2000], file=sys.stderr)
                print("  --- END SAMPLE ---", file=sys.stderr)
                dumped = True

            cand = extract_candidate(result)
            if not is_emittable(cand):
                continue
            # In-run dedupe so we don't emit the same domain 10x from one search.
            key = cand.get("domain") or f"name::{cand.get('company_name','').lower()}"
            if key in seen_domains:
                continue
            seen_domains.add(key)
            fh.write(json.dumps(cand, ensure_ascii=False) + "\n")
            written += 1

    print(f"DONE: wrote {written} candidate account(s) to {args.out} "
          f"(search {search_id}).", file=sys.stderr)
    print(f"Next: python feedback_loop.py --in {args.out}", file=sys.stderr)


if __name__ == "__main__":
    main()
