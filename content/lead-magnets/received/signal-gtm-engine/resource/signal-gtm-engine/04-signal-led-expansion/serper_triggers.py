#!/usr/bin/env python3
"""
Stage 04 — Signal-Led Expansion :: Serper trigger-event search (complementary)

A second discovery surface for Loop B. Where Trigify captures *social* signal
(people/companies posting + engaging on your topics), Serper captures *event*
signal from Google + Google News: funding rounds, hiring sprees, product
launches, expansions — the recency-gated trigger events that mean "something
just changed at this account, now is the time."

Serper is complementary to Trigify, not a substitute. It does NOT do social
listening; it surfaces news/web mentions. Trigify remains THE signal layer.

What it does:
  1. Run one or more recency-filtered Google / Google News queries via Serper
     (tbs=qdr:* recency filters: hour/day/week/month/year).
  2. Extract candidate company mentions from titles + snippets + source links.
  3. Emit the SAME normalized candidate record (JSONL) that trigify_listen.py
     emits, so feedback_loop.py consumes both sources identically.

API: Serper, POST https://google.serper.dev/search and /news, header X-API-KEY,
JSON body { "q": ..., "tbs": "qdr:w", "num": 20, "gl": "us", "hl": "en" }.

Usage:
  export SERPER_API_KEY=...                         # never hard-code; from .env
  python serper_triggers.py --query "<your-icp> raises Series A" \
      --recency week --out data/candidates.jsonl --append

  # multiple trigger queries from a file (one per line):
  python serper_triggers.py --query-file triggers.txt --recency month \
      --endpoint news --out data/candidates.jsonl --append

Python 3, stdlib + requests only.
"""

import argparse
import json
import os
import re
import sys
import time
from urllib.parse import urlparse

import requests

# --------------------------------------------------------------------------- #
# Config
# --------------------------------------------------------------------------- #
SERPER_SEARCH_URL = "https://google.serper.dev/search"
SERPER_NEWS_URL = "https://google.serper.dev/news"

# Serper recency tokens (tbs=qdr:<token>).
RECENCY_MAP = {"hour": "h", "day": "d", "week": "w", "month": "m", "year": "y"}

# Aggregator / press-wire / generic domains that are NOT the target account.
# A mention hosted here is news ABOUT a company, not the company's own site.
# TODO: extend with outlets that dominate your niche's news.
AGGREGATOR_DOMAINS = {
    "techcrunch.com", "crunchbase.com", "businesswire.com", "prnewswire.com",
    "globenewswire.com", "finance.yahoo.com", "yahoo.com", "bloomberg.com",
    "reuters.com", "forbes.com", "venturebeat.com", "axios.com", "wsj.com",
    "linkedin.com", "twitter.com", "x.com", "facebook.com", "youtube.com",
    "medium.com", "substack.com", "prweb.com", "marketwatch.com",
    "pitchbook.com", "fortune.com", "cnbc.com", "theinformation.com",
}

DEFAULT_TIMEOUT = 30
MAX_RETRIES = 4
RETRY_BACKOFF = 2.0

# Words that, in a headline, signal a company name boundary. Used to pull the
# leading company name out of a "<Company> raises $X" / "<Company> launches Y"
# style headline when no company site link is available.
TRIGGER_VERBS = re.compile(
    r"\b(raises?|raised|secures?|secured|closes?|lands?|announces?|launches?|"
    r"unveils?|expands?|hires?|appoints?|names?|acquires?|acquired|partners?)\b",
    re.IGNORECASE,
)


# --------------------------------------------------------------------------- #
# HTTP helper
# --------------------------------------------------------------------------- #
def _headers():
    key = os.environ.get("SERPER_API_KEY")
    if not key:
        sys.exit("ERROR: SERPER_API_KEY is not set. Copy .env.example to .env "
                 "and fill it in, then `export SERPER_API_KEY=...`.")
    return {"X-API-KEY": key, "Content-Type": "application/json"}


def _post(url, payload):
    last_err = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = requests.post(url, headers=_headers(), json=payload,
                                 timeout=DEFAULT_TIMEOUT)
        except requests.RequestException as e:
            last_err = e
            wait = RETRY_BACKOFF * (2 ** (attempt - 1))
            print(f"  [retry {attempt}/{MAX_RETRIES}] network error: {e} "
                  f"-> sleeping {wait:.0f}s", file=sys.stderr)
            time.sleep(wait)
            continue

        if resp.status_code in (401, 403):
            sys.exit("ERROR: Serper returned auth error. Check SERPER_API_KEY "
                     "(header must be `X-API-KEY`).")
        if resp.status_code == 429 or resp.status_code >= 500:
            wait = RETRY_BACKOFF * (2 ** (attempt - 1))
            print(f"  [retry {attempt}/{MAX_RETRIES}] HTTP {resp.status_code} "
                  f"-> sleeping {wait:.0f}s", file=sys.stderr)
            time.sleep(wait)
            last_err = RuntimeError(f"HTTP {resp.status_code}")
            continue

        if not resp.ok:
            raise RuntimeError(f"HTTP {resp.status_code}: {resp.text[:300]}")
        return resp.json()

    raise RuntimeError(f"Serper request failed after {MAX_RETRIES} attempts: {last_err}")


# --------------------------------------------------------------------------- #
# Serper queries
# --------------------------------------------------------------------------- #
def serper_search(query, *, recency="week", endpoint="search", num=20,
                  gl="us", hl="en"):
    """Run one recency-filtered Serper query and return its raw JSON.

    recency -> tbs=qdr:<token>. endpoint -> 'search' (web) or 'news'.
    """
    token = RECENCY_MAP.get(recency)
    payload = {"q": query, "num": num, "gl": gl, "hl": hl}
    if token:
        payload["tbs"] = f"qdr:{token}"
    url = SERPER_NEWS_URL if endpoint == "news" else SERPER_SEARCH_URL
    print(f"  serper[{endpoint}] q={query!r} recency={recency}", file=sys.stderr)
    return _post(url, payload)


def iter_hits(raw, endpoint):
    """Yield normalized (title, snippet, link, source) tuples from a Serper response."""
    if endpoint == "news":
        for item in raw.get("news", []):
            yield (item.get("title", ""), item.get("snippet", ""),
                   item.get("link", ""), item.get("source", ""))
    else:
        for item in raw.get("organic", []):
            yield (item.get("title", ""), item.get("snippet", ""),
                   item.get("link", ""), "")
        # `topStories` sometimes carries fresh trigger news on web search too.
        for item in raw.get("topStories", []):
            yield (item.get("title", ""), item.get("snippet", ""),
                   item.get("link", ""), item.get("source", ""))


# --------------------------------------------------------------------------- #
# Account extraction
# --------------------------------------------------------------------------- #
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
    return netloc


def _company_name_from_headline(title):
    """Best-effort: pull the leading company name from a trigger headline.

    "Acme Corp raises $20M Series A" -> "Acme Corp"
    Falls back to the first 4 words if no trigger verb is found. This is a
    HEURISTIC — feedback_loop.py / Stage 01 will verify the account anyway.
    """
    if not title:
        return None
    m = TRIGGER_VERBS.search(title)
    head = title[:m.start()].strip(" -—:|") if m else title
    # Trim trailing connectors and over-long heads.
    head = re.split(r"\s+(?:and|&)\s+", head)[0].strip()
    words = head.split()
    if not words:
        return None
    # Keep it to a sane length (company names are short).
    name = " ".join(words[:6]).strip(" ,.-")
    return name or None


def extract_candidate(title, snippet, link, source):
    """Map ONE Serper hit to the normalized candidate contract.

    Domain resolution preference:
      1. The result link's domain IF it's not a known news aggregator
         (i.e. the company's own site/blog came up) — strongest signal.
      2. Otherwise leave domain=null and rely on the headline company name;
         feedback_loop.py will attempt to resolve the domain before dropping.
    """
    link_domain = _domain_from_url(link)
    domain = None
    if link_domain and link_domain not in AGGREGATOR_DOMAINS:
        domain = link_domain

    company_name = _company_name_from_headline(title)
    text = (snippet or title or "")

    return {
        "company_name": company_name,
        "domain": domain,
        "discovered_via": "serper",
        "discovery_signal": "trigger_event",
        "signal_detail": (text[:200] + "...") if len(text) > 200 else text,
        "source_url": link,
        "person_name": None,
        "person_title": None,
        "person_url": None,
        "captured_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "_source_outlet": source or link_domain,  # provenance breadcrumb
    }


def is_emittable(candidate):
    return bool(candidate.get("domain") or candidate.get("company_name"))


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #
def load_queries(args):
    queries = []
    if args.query:
        queries.append(args.query)
    if args.query_file:
        with open(args.query_file, encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if line and not line.startswith("#"):
                    queries.append(line)
    if not queries:
        sys.exit("ERROR: provide --query and/or --query-file with at least one query.")
    return queries


def main():
    ap = argparse.ArgumentParser(description="Serper trigger-event search -> candidate accounts (JSONL).")
    ap.add_argument("--query", help="A single trigger query, e.g. '<your-icp> raises Series A'.")
    ap.add_argument("--query-file", help="File of trigger queries, one per line (# = comment).")
    ap.add_argument("--recency", default="week", choices=list(RECENCY_MAP),
                    help="Recency window (tbs=qdr): hour|day|week|month|year.")
    ap.add_argument("--endpoint", default="news", choices=["news", "search"],
                    help="Serper endpoint: news (default) or web search.")
    ap.add_argument("--num", type=int, default=20, help="Results per query (max ~100).")
    ap.add_argument("--gl", default="us", help="Geo (country) code.")
    ap.add_argument("--hl", default="en", help="Language code.")
    ap.add_argument("--out", required=True, help="Output JSONL path.")
    ap.add_argument("--append", action="store_true",
                    help="Append to --out instead of overwriting.")
    args = ap.parse_args()

    # TODO: customize these example trigger queries for YOUR ICP. Strong trigger
    # patterns: '"<your-category>" raises', '"<your-category>" Series A',
    # '<your-icp> "now hiring" <key role>', '<your-icp> launches', etc.
    queries = load_queries(args)

    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    mode = "a" if args.append else "w"
    seen = set()
    written = 0

    with open(args.out, mode, encoding="utf-8") as fh:
        for q in queries:
            raw = serper_search(q, recency=args.recency, endpoint=args.endpoint,
                                num=args.num, gl=args.gl, hl=args.hl)
            for title, snippet, link, source in iter_hits(raw, args.endpoint):
                cand = extract_candidate(title, snippet, link, source)
                if not is_emittable(cand):
                    continue
                key = cand.get("domain") or f"name::{(cand.get('company_name') or '').lower()}"
                if key in seen:
                    continue
                seen.add(key)
                fh.write(json.dumps(cand, ensure_ascii=False) + "\n")
                written += 1
            # Be polite between queries.
            time.sleep(1)

    print(f"DONE: wrote {written} candidate account(s) to {args.out} "
          f"from {len(queries)} query(ies).", file=sys.stderr)
    print(f"Next: python feedback_loop.py --in {args.out}", file=sys.stderr)


if __name__ == "__main__":
    main()
