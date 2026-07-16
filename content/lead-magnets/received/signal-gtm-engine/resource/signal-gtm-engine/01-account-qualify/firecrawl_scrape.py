#!/usr/bin/env python3
"""
Stage 01 (c) — Firecrawl homepage scrape.

Scrapes each surviving company's homepage to clean markdown via Firecrawl
/v1/scrape. The markdown feeds the deterministic clean (step d) and then the
final KEEP/DROP read (step e).

  * onlyMainContent=True so Firecrawl strips most nav/footer chrome up front.
  * Retries transient failures with exponential backoff.
  * Resumable: a checkpoint records each domain scraped so a large run resumes
    instead of re-scraping (and re-paying) from zero after a crash.
  * Caches via maxAge (company homepages rarely change day to day).

Keys are read from os.environ ONLY.
Requires: FIRECRAWL_API_KEY  (see .env.example)

Input rows need a "domain". Output rows add: homepage_url, homepage_markdown,
scrape_status.

  python firecrawl_scrape.py --in data/01b_research.jsonl --out data/01c_scraped.jsonl

Python 3, stdlib + requests only.
"""

import argparse
import json
import os
import sys
import time

import requests

FIRECRAWL_URL = "https://api.firecrawl.dev/v1/scrape"
MAX_RETRIES = 4
# 1 week cache: homepages rarely change daily, and this is much faster/cheaper.
MAX_AGE_MS = 604800000


def to_url(domain):
    """Normalize a bare domain to an https URL."""
    domain = (domain or "").strip()
    if not domain:
        return ""
    if domain.startswith("http://") or domain.startswith("https://"):
        return domain
    return "https://" + domain.lstrip("/")


def load_done(checkpoint_path):
    done = set()
    if os.path.exists(checkpoint_path):
        with open(checkpoint_path, "r", encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if line:
                    done.add(line)
    return done


def append_checkpoint(checkpoint_path, key):
    with open(checkpoint_path, "a", encoding="utf-8") as fh:
        fh.write(key + "\n")


def scrape(api_key, url):
    """Scrape one URL to markdown. Returns (markdown, status_string)."""
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    body = {
        "url": url,
        "formats": ["markdown"],
        "onlyMainContent": True,
        "maxAge": MAX_AGE_MS,
        "timeout": 30000,
    }

    delay = 2.0
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = requests.post(FIRECRAWL_URL, headers=headers, json=body, timeout=90)
        except requests.RequestException as exc:
            if attempt == MAX_RETRIES:
                return "", f"network_error: {exc}"
            time.sleep(delay)
            delay = min(delay * 2, 60)
            continue

        if resp.status_code == 200:
            data = resp.json()
            md = (data.get("data") or {}).get("markdown", "")
            if md:
                return md, "ok"
            return "", "empty"

        if resp.status_code == 429 or resp.status_code >= 500:
            if attempt == MAX_RETRIES:
                return "", f"http_{resp.status_code}"
            retry_after = resp.headers.get("retry-after")
            time.sleep(float(retry_after) if retry_after else delay)
            delay = min(delay * 2, 60)
            continue

        # 4xx (bad/blocked URL etc.) — not retryable.
        return "", f"http_{resp.status_code}"

    return "", "exhausted"


def main():
    ap = argparse.ArgumentParser(description="Stage 01(c) Firecrawl homepage scrape (resumable).")
    ap.add_argument("--in", dest="infile", required=True)
    ap.add_argument("--out", dest="outfile", required=True)
    ap.add_argument("--checkpoint", default=None, help="resume checkpoint (default: <out>.done)")
    ap.add_argument("--sleep", type=float, default=0.0, help="optional seconds between scrapes (rate limiting)")
    args = ap.parse_args()

    api_key = os.environ.get("FIRECRAWL_API_KEY")
    if not api_key:
        sys.exit("ERROR: FIRECRAWL_API_KEY is not set (see .env.example).")

    checkpoint = args.checkpoint or (args.outfile + ".done")
    done = load_done(checkpoint)

    ok = failed = skipped = 0
    with open(args.infile, "r", encoding="utf-8") as fin, \
         open(args.outfile, "a", encoding="utf-8") as fout:
        for line in fin:
            line = line.strip()
            if not line:
                continue
            row = json.loads(line)

            # Already-dropped rows never need a homepage — pass them through.
            if str(row.get("exclude_verdict", "")).lower() == "drop":
                fout.write(json.dumps(row, ensure_ascii=False) + "\n")
                continue

            domain = str(row.get("domain") or "")
            key = domain or str(row.get("name") or "")
            if not key:
                continue
            if key in done:
                skipped += 1
                continue

            url = to_url(domain)
            if not url:
                row["homepage_url"] = ""
                row["homepage_markdown"] = ""
                row["scrape_status"] = "no_domain"
                failed += 1
            else:
                md, status = scrape(api_key, url)
                row["homepage_url"] = url
                row["homepage_markdown"] = md
                row["scrape_status"] = status
                if status == "ok":
                    ok += 1
                else:
                    failed += 1

            fout.write(json.dumps(row, ensure_ascii=False) + "\n")
            fout.flush()
            append_checkpoint(checkpoint, key)

            if args.sleep:
                time.sleep(args.sleep)

    print(f"done. scraped_ok={ok} failed={failed} skipped(resumed)={skipped}")


if __name__ == "__main__":
    main()
