#!/usr/bin/env python3
"""
Stage 01 (b) — Parallel.ai company research (low-confidence keeps only).

When the coarse exclusion (step a) returned KEEP but with LOW confidence, the
short description was too thin to judge. This script asks Parallel.ai's Task API
to research the company from the public web and return a clean factual summary,
so the downstream homepage read has real context.

Cost discipline: by default we ONLY research rows where
  exclude_verdict == "keep" AND exclude_confidence == "low".
High-confidence keeps pass straight through untouched (use --all to override).

Parallel Task API (docs.parallel.ai):
  POST /v1/tasks/runs           -> create a run, returns run_id
  GET  /v1/tasks/runs/{run_id}  -> poll status until completed
  GET  /v1/tasks/runs/{run_id}/result -> fetch the structured output
Every Task output ships with citations + reasoning; we keep the summary text.

Keys are read from os.environ ONLY.
Requires: PARALLEL_API_KEY  (see .env.example)

  python parallel_research.py --in data/01a_excluded.jsonl --out data/01b_research.jsonl

Python 3, stdlib + requests only.
"""

import argparse
import json
import os
import sys
import time

import requests

PARALLEL_BASE = "https://api.parallel.ai/v1"
# TODO: customize — "lite"/"base"/"core"/"pro" trade cost for depth on the Task API.
PROCESSOR = "base"
POLL_INTERVAL = 5.0
POLL_TIMEOUT = 600.0          # give up on a single run after 10 min
MAX_CREATE_RETRIES = 5

# TODO: customize this research question for YOUR ICP. Keep it factual — you want
# the model downstream to be able to tell fit, not marketing spin.
RESEARCH_OBJECTIVE = (
    "Research this company and summarize, in 3-5 factual sentences: "
    "(1) what the company actually does / sells, "
    "(2) whether it is a software/product company, a services/agency/staffing "
    "firm, a physical-goods business, a content/media outlet, or a "
    "government/nonprofit entity, "
    "and (3) who its customers are. Be concrete and avoid marketing language."
)


def should_research(row, research_all):
    if research_all:
        return True
    return (
        str(row.get("exclude_verdict", "")).lower() == "keep"
        and str(row.get("exclude_confidence", "")).lower() == "low"
    )


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


def create_run(api_key, row):
    """Create a Parallel Task run. Returns run_id or None."""
    headers = {"x-api-key": api_key, "content-type": "application/json"}
    company = str(row.get("name") or row.get("domain") or "the company")
    domain = str(row.get("domain") or "")
    body = {
        "processor": PROCESSOR,
        "input": (
            f"Company: {company}\n"
            f"Website: {domain}\n\n"
            f"{RESEARCH_OBJECTIVE}"
        ),
        # Plain-text output is enough here; we just need a factual summary string.
        "task_spec": {"output_schema": {"type": "text"}},
    }

    delay = 2.0
    for attempt in range(1, MAX_CREATE_RETRIES + 1):
        try:
            resp = requests.post(f"{PARALLEL_BASE}/tasks/runs", headers=headers, json=body, timeout=60)
        except requests.RequestException as exc:
            if attempt == MAX_CREATE_RETRIES:
                print(f"  ! create network error (final): {exc}", file=sys.stderr)
                return None
            time.sleep(delay)
            delay = min(delay * 2, 60)
            continue

        if resp.status_code in (200, 201):
            data = resp.json()
            return data.get("run_id") or data.get("id")
        if resp.status_code == 429 or resp.status_code >= 500:
            if attempt == MAX_CREATE_RETRIES:
                print(f"  ! create HTTP {resp.status_code} (final)", file=sys.stderr)
                return None
            retry_after = resp.headers.get("retry-after")
            time.sleep(float(retry_after) if retry_after else delay)
            delay = min(delay * 2, 60)
            continue
        print(f"  ! create HTTP {resp.status_code}: {resp.text[:200]}", file=sys.stderr)
        return None
    return None


def poll_result(api_key, run_id):
    """Poll a run to completion and return the summary text, or None."""
    headers = {"x-api-key": api_key}
    deadline = time.time() + POLL_TIMEOUT
    while time.time() < deadline:
        try:
            resp = requests.get(f"{PARALLEL_BASE}/tasks/runs/{run_id}", headers=headers, timeout=60)
        except requests.RequestException:
            time.sleep(POLL_INTERVAL)
            continue

        if resp.status_code != 200:
            time.sleep(POLL_INTERVAL)
            continue

        status = str(resp.json().get("status", "")).lower()
        if status in ("completed", "succeeded"):
            return fetch_result(api_key, run_id)
        if status in ("failed", "cancelled", "canceled", "error"):
            print(f"  ! run {run_id} ended status={status}", file=sys.stderr)
            return None
        time.sleep(POLL_INTERVAL)

    print(f"  ! run {run_id} timed out", file=sys.stderr)
    return None


def fetch_result(api_key, run_id):
    headers = {"x-api-key": api_key}
    try:
        resp = requests.get(f"{PARALLEL_BASE}/tasks/runs/{run_id}/result", headers=headers, timeout=60)
    except requests.RequestException as exc:
        print(f"  ! result network error: {exc}", file=sys.stderr)
        return None
    if resp.status_code != 200:
        print(f"  ! result HTTP {resp.status_code}", file=sys.stderr)
        return None

    data = resp.json()
    # Parallel nests the output under output.content (shape can vary by processor).
    output = data.get("output") or {}
    content = output.get("content")
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, dict):
        # text-schema results may land as {"text": "..."} or similar
        for k in ("text", "summary", "value"):
            if isinstance(content.get(k), str):
                return content[k].strip()
        return json.dumps(content, ensure_ascii=False)
    if isinstance(content, list):
        parts = [c.get("text", "") if isinstance(c, dict) else str(c) for c in content]
        return "\n".join(p for p in parts if p).strip()
    return None


def main():
    ap = argparse.ArgumentParser(description="Stage 01(b) Parallel.ai research for low-confidence keeps.")
    ap.add_argument("--in", dest="infile", required=True)
    ap.add_argument("--out", dest="outfile", required=True)
    ap.add_argument("--all", action="store_true", help="research every row, not just low-confidence keeps")
    ap.add_argument("--checkpoint", default=None, help="resume checkpoint (default: <out>.done)")
    args = ap.parse_args()

    api_key = os.environ.get("PARALLEL_API_KEY")
    if not api_key:
        sys.exit("ERROR: PARALLEL_API_KEY is not set (see .env.example).")

    checkpoint = args.checkpoint or (args.outfile + ".done")
    done = load_done(checkpoint)

    researched = passed = skipped = 0
    with open(args.infile, "r", encoding="utf-8") as fin, \
         open(args.outfile, "a", encoding="utf-8") as fout:
        for line in fin:
            line = line.strip()
            if not line:
                continue
            row = json.loads(line)
            key = str(row.get("domain") or row.get("name") or "")
            if key and key in done:
                skipped += 1
                continue

            if should_research(row, args.all):
                run_id = create_run(api_key, row)
                summary = poll_result(api_key, run_id) if run_id else None
                if summary:
                    row["research_summary"] = summary
                    researched += 1
                else:
                    # Research failed: leave the row alone — downstream homepage
                    # scrape + final read is still the safety net. Never drop here.
                    row.setdefault("research_summary", "")
            else:
                passed += 1

            fout.write(json.dumps(row, ensure_ascii=False) + "\n")
            fout.flush()
            if key:
                append_checkpoint(checkpoint, key)

    print(f"done. researched={researched} passed(high-conf)={passed} skipped(resumed)={skipped}")


if __name__ == "__main__":
    main()
