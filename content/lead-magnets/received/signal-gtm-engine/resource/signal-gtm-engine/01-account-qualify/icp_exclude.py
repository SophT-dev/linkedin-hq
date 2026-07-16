#!/usr/bin/env python3
"""
Stage 01 (a) — Coarse ICP exclusion.

Reads each company's SHORT DESCRIPTION ONLY and asks Claude (Anthropic) to
DROP it only when the description clearly proves a non-ICP category. ANY doubt
=> KEEP. This is a binary fit gate, not a score.

  * Cheap: reads one tiny field per company, low max_tokens, JSON-only output.
  * Resumable: a checkpoint file records every domain already judged, so a
    crashed 30k-row run resumes instead of re-paying from zero.
  * Prompt-driven: the actual exclusion logic lives in icp_prompt.example.txt
    (copy to icp_prompt.txt and customize for YOUR product / YOUR ICP).

Keys are read from os.environ ONLY — never hardcoded, never written to disk.
Requires: ANTHROPIC_API_KEY  (see .env.example)

I/O is JSONL (one company per line). Input rows need at least: domain, name,
description. Output rows add: exclude_verdict, exclude_confidence,
exclude_category, exclude_reason.

  python icp_exclude.py --in data/tam.jsonl --out data/01a_excluded.jsonl

Python 3, stdlib + requests only.
"""

import argparse
import json
import os
import sys
import time

import requests

ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_VERSION = "2023-06-01"
MODEL = "claude-opus-4-8"            # TODO: customize if you prefer a cheaper model for this coarse pass
MAX_TOKENS = 512
MAX_RETRIES = 5
PROMPT_PATH_DEFAULT = "icp_prompt.example.txt"  # copy to icp_prompt.txt and customize


def load_prompt(path):
    with open(path, "r", encoding="utf-8") as fh:
        return fh.read()


def load_done(checkpoint_path):
    """Return the set of domains already judged (so we can resume)."""
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


def build_prompt(template, row):
    """Fill the prompt template with this company's fields."""
    return (
        template
        .replace("{name}", str(row.get("name", "") or ""))
        .replace("{domain}", str(row.get("domain", "") or ""))
        .replace("{description}", str(row.get("description", "") or ""))
    )


def call_anthropic(api_key, prompt):
    """One Anthropic Messages call. Returns parsed JSON verdict dict or None."""
    headers = {
        "x-api-key": api_key,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
    }
    body = {
        "model": MODEL,
        "max_tokens": MAX_TOKENS,
        # Adaptive thinking is the recommended mode on Opus 4.8 for any judgment call.
        "thinking": {"type": "adaptive"},
        "messages": [{"role": "user", "content": prompt}],
    }

    delay = 2.0
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = requests.post(ANTHROPIC_URL, headers=headers, json=body, timeout=120)
        except requests.RequestException as exc:
            if attempt == MAX_RETRIES:
                print(f"  ! network error (final): {exc}", file=sys.stderr)
                return None
            time.sleep(delay)
            delay = min(delay * 2, 60)
            continue

        if resp.status_code == 200:
            return parse_verdict(resp.json())

        # 429 / 5xx are retryable; 4xx (other than 429) are not.
        if resp.status_code == 429 or resp.status_code >= 500:
            if attempt == MAX_RETRIES:
                print(f"  ! HTTP {resp.status_code} (final)", file=sys.stderr)
                return None
            retry_after = resp.headers.get("retry-after")
            time.sleep(float(retry_after) if retry_after else delay)
            delay = min(delay * 2, 60)
            continue

        print(f"  ! HTTP {resp.status_code}: {resp.text[:200]}", file=sys.stderr)
        return None

    return None


def parse_verdict(payload):
    """Pull the JSON verdict out of the Anthropic response content blocks."""
    text = ""
    for block in payload.get("content", []):
        if block.get("type") == "text":
            text += block.get("text", "")
    text = text.strip()
    if not text:
        return None

    # The model may wrap JSON in stray prose or fences; extract the object.
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end < start:
        return None
    try:
        return json.loads(text[start:end + 1])
    except json.JSONDecodeError:
        return None


def normalize_verdict(verdict):
    """Apply the conservative bias: anything that isn't a clean high-conf DROP is a KEEP."""
    if not isinstance(verdict, dict):
        # No usable verdict => KEEP (never drop on a parse failure).
        return {
            "exclude_verdict": "keep",
            "exclude_confidence": "low",
            "exclude_category": "none",
            "exclude_reason": "no parseable verdict; kept by safety rule",
        }

    v = str(verdict.get("verdict", "keep")).lower()
    conf = str(verdict.get("confidence", "low")).lower()
    cat = str(verdict.get("category", "none")).lower()
    reason = str(verdict.get("reason", ""))[:300]

    # Hard safety rail: only a HIGH-confidence DROP actually drops.
    if v == "drop" and conf == "high":
        return {
            "exclude_verdict": "drop",
            "exclude_confidence": "high",
            "exclude_category": cat,
            "exclude_reason": reason,
        }

    return {
        "exclude_verdict": "keep",
        "exclude_confidence": conf if conf in ("high", "low") else "low",
        "exclude_category": "none",
        "exclude_reason": reason or "kept",
    }


def main():
    ap = argparse.ArgumentParser(description="Stage 01(a) coarse ICP exclusion (description-only).")
    ap.add_argument("--in", dest="infile", required=True, help="input JSONL (domain, name, description)")
    ap.add_argument("--out", dest="outfile", required=True, help="output JSONL with exclusion verdict added")
    ap.add_argument("--prompt", default=PROMPT_PATH_DEFAULT, help="exclusion prompt template path")
    ap.add_argument("--checkpoint", default=None, help="resume checkpoint (default: <out>.done)")
    ap.add_argument("--sleep", type=float, default=0.0, help="optional seconds to sleep between calls")
    args = ap.parse_args()

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        sys.exit("ERROR: ANTHROPIC_API_KEY is not set (see .env.example).")

    template = load_prompt(args.prompt)
    checkpoint = args.checkpoint or (args.outfile + ".done")
    done = load_done(checkpoint)

    kept = dropped = skipped = 0
    with open(args.infile, "r", encoding="utf-8") as fin, \
         open(args.outfile, "a", encoding="utf-8") as fout:
        for line in fin:
            line = line.strip()
            if not line:
                continue
            row = json.loads(line)
            key = str(row.get("domain") or row.get("name") or "")
            if not key:
                continue
            if key in done:
                skipped += 1
                continue

            verdict = call_anthropic(api_key, build_prompt(template, row))
            row.update(normalize_verdict(verdict))

            fout.write(json.dumps(row, ensure_ascii=False) + "\n")
            fout.flush()
            append_checkpoint(checkpoint, key)

            if row["exclude_verdict"] == "drop":
                dropped += 1
            else:
                kept += 1

            if args.sleep:
                time.sleep(args.sleep)

    print(f"done. kept={kept} dropped={dropped} skipped(resumed)={skipped}")


if __name__ == "__main__":
    main()
