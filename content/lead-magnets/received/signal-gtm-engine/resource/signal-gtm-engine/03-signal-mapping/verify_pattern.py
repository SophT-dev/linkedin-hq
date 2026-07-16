#!/usr/bin/env python3
"""
verify_pattern.py — Stage 03 · Signal Mapping · Detection Method 5 (TWO-SOURCE)

The false-positive killer. A single source is a PROXY; a proxy fires false
positives. This script takes a signal that already fired as a proxy (e.g. from
write_signals.py keyword scan, or a Trigify social hit routed onto the row) and
tries to CONFIRM it with a SECOND, INDEPENDENT source before promoting it to a
confident `true`.

Decision rule:
  proxy true  + confirm agrees   → confidence = "confirmed"   (defensible)
  proxy true  + confirm silent   → confidence = "proxy"       (kept, low weight)
  proxy true  + confirm disagrees→ confidence = "refuted"     (flag / drop)
  proxy false                    → left as-is (nothing to confirm)

The confirming source here is Serper (Google/News/job search) via SERPER_API_KEY,
because it's an independent web view of the same claim. The same pattern works
with any second source: a DNS probe (cname_probe.py), an enrichment call, or a
second Trigify platform. Trigify remains THE signal layer for social/buying
signals — Serper is a complementary web-search confirmer, not a signal/intent
tool.

Output: the signal column's `confidence` is upgraded/downgraded in place and a
second-source evidence URL is attached:

  "signal_hiring_ai_eng": {
      "value": true, "confidence": "confirmed", "method": "two_source",
      "version": "v1", "evidence": "...proxy snippet...",
      "source_b": {"tool": "serper", "url": "https://...", "hits": 3}, "weight": 0.8
  }

Env (read via os.environ ONLY — never hardcode):
  SERPER_API_KEY   required for the Serper confirmer

Usage:
  python3 verify_pattern.py \
      --in data/accounts_signals.jsonl \
      --signal signal_hiring_ai_eng \
      --query '"{company_name}" ("machine learning engineer" OR "ML platform")' \
      --out data/accounts_signals.jsonl

  # confirmer="none" → dry pass that only marks proxies without a 2nd source
  python3 verify_pattern.py --in a.jsonl --signal signal_x --confirmer none --out b.jsonl

Defensive: retries with backoff on transient HTTP errors, resumable (skips rows
already 'confirmed'/'refuted'), and a per-row failure never kills the run.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import tempfile
import time

import requests

SERPER_SEARCH_URL = "https://google.serper.dev/search"
DEFAULT_MIN_HITS = 1
MAX_RETRIES = 4
BACKOFF_BASE = 1.5
REQUEST_TIMEOUT = 30


def _fmt(template: str, row: dict) -> str:
    """Fill {placeholders} from the row; missing keys become empty strings."""
    class _Safe(dict):
        def __missing__(self, k):  # noqa: D401
            return ""
    return template.format_map(_Safe(row))


# ── second source: Serper web/job search ─────────────────────────────────────
def serper_confirm(query: str, api_key: str, min_hits: int) -> dict | None:
    """Return {confirmed, url, hits} or None on hard failure."""
    headers = {"X-API-KEY": api_key, "Content-Type": "application/json"}
    payload = {"q": query, "num": 10}
    for attempt in range(MAX_RETRIES):
        try:
            r = requests.post(SERPER_SEARCH_URL, headers=headers, json=payload, timeout=REQUEST_TIMEOUT)
            if r.status_code == 429 or r.status_code >= 500:
                raise requests.HTTPError(f"transient {r.status_code}")
            r.raise_for_status()
            data = r.json()
            organic = data.get("organic", []) or []
            hits = len(organic)
            top_url = organic[0].get("link") if organic else None
            return {"confirmed": hits >= min_hits, "url": top_url, "hits": hits}
        except (requests.RequestException, ValueError) as exc:
            if attempt == MAX_RETRIES - 1:
                sys.stderr.write(f"[warn] serper failed after retries: {exc}\n")
                return None
            time.sleep(BACKOFF_BASE ** attempt)
    return None


CONFIRMERS = {
    "serper": serper_confirm,
    # plug in others here: "dns": ..., "trigify": ..., "enrich": ...
}


def verify_row(row: dict, signal_col: str, query_tpl: str, confirmer: str,
               api_key: str | None, min_hits: int) -> str:
    """Mutate row[signal_col]['confidence'] in place. Returns the outcome label."""
    sig = row.get(signal_col)
    if not isinstance(sig, dict) or not sig.get("value"):
        return "skip"  # nothing to confirm

    if confirmer == "none" or not query_tpl:
        sig.setdefault("confidence", "proxy")
        return "proxy"

    query = _fmt(query_tpl, row)
    if "{" in query_tpl and query.strip() in ("", '""', "()"):
        sig["confidence"] = "proxy"  # couldn't build a real query
        return "proxy"

    fn = CONFIRMERS.get(confirmer)
    if fn is None:
        sys.stderr.write(f"[warn] unknown confirmer '{confirmer}'; leaving as proxy\n")
        sig.setdefault("confidence", "proxy")
        return "proxy"

    result = fn(query, api_key, min_hits)
    if result is None:
        sig.setdefault("confidence", "proxy")  # confirm errored → stay proxy
        return "error"

    sig["method"] = "two_source"
    sig["source_b"] = {"tool": confirmer, "url": result.get("url"), "hits": result.get("hits")}
    if result["confirmed"]:
        sig["confidence"] = "confirmed"
        return "confirmed"
    # second source actively found nothing → keep but mark proxy (not refuted;
    # silence is weaker than contradiction). Set "refuted" only if you add a
    # confirmer that returns explicit disagreement.
    sig["confidence"] = "proxy"
    return "unconfirmed"


def main() -> int:
    ap = argparse.ArgumentParser(description="Two-source verification: promote proxy signals to confirmed.")
    ap.add_argument("--in", dest="infile", required=True)
    ap.add_argument("--out", dest="outfile", required=True)
    ap.add_argument("--signal", required=True, help="signal column to verify, e.g. signal_hiring_ai_eng")
    ap.add_argument("--query", default="", help="confirm-query template; {field} pulls from the row")
    ap.add_argument("--confirmer", default="serper", choices=list(CONFIRMERS) + ["none"],
                    help="second source. 'none' = mark proxies without confirming")
    ap.add_argument("--min-hits", type=int, default=DEFAULT_MIN_HITS,
                    help="confirming results needed to flip to confirmed")
    ap.add_argument("--resume", action="store_true",
                    help="skip rows already 'confirmed' or 'refuted' for this signal")
    args = ap.parse_args()

    api_key = None
    if args.confirmer == "serper":
        api_key = os.environ.get("SERPER_API_KEY")
        if not api_key:
            sys.stderr.write("[error] SERPER_API_KEY not set. Export it or use --confirmer none.\n")
            return 2

    out_dir = os.path.dirname(os.path.abspath(args.outfile)) or "."
    os.makedirs(out_dir, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=out_dir, suffix=".tmp")
    counts: dict[str, int] = {}
    n = 0
    try:
        with open(args.infile, "r", encoding="utf-8") as fin, os.fdopen(fd, "w", encoding="utf-8") as fout:
            for line in fin:
                line = line.strip()
                if not line:
                    continue
                n += 1
                try:
                    row = json.loads(line)
                except json.JSONDecodeError:
                    sys.stderr.write(f"[warn] bad JSON on line {n}; passing through\n")
                    fout.write(line + "\n")
                    continue

                sig = row.get(args.signal)
                if args.resume and isinstance(sig, dict) and sig.get("confidence") in ("confirmed", "refuted"):
                    fout.write(json.dumps(row, ensure_ascii=False) + "\n")
                    counts["resumed"] = counts.get("resumed", 0) + 1
                    continue

                try:
                    outcome = verify_row(row, args.signal, args.query, args.confirmer, api_key, args.min_hits)
                except Exception as exc:  # one row must never kill the batch
                    sys.stderr.write(f"[warn] verify failed on row {n}: {exc}\n")
                    outcome = "error"
                counts[outcome] = counts.get(outcome, 0) + 1
                fout.write(json.dumps(row, ensure_ascii=False) + "\n")
        os.replace(tmp, args.outfile)
    except BaseException:
        if os.path.exists(tmp):
            os.remove(tmp)
        raise

    summary = " · ".join(f"{k}={v}" for k, v in sorted(counts.items()))
    sys.stderr.write(f"[done] {n} rows · {summary} · → {args.outfile}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
