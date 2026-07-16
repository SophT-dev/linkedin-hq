#!/usr/bin/env python3
"""
STAGE 02 — SYSTEM OF RECORD · supabase_load.py
══════════════════════════════════════════════════════════════════════════════
Batch loader: pushes rows into the Supabase Data API (PostgREST) for any table
defined in schema.sql, into any tenant schema.

WHY this exists
---------------
Every stage of the engine produces rows that belong in the source of truth.
This is the ONE writer that gets them there reliably:
  • 200-row batches (PostgREST handles bulk arrays in a single POST)
  • Content-Profile header → routes the write to the right tenant SCHEMA
  • upsert via Prefer: resolution=merge-duplicates → re-runs are idempotent,
    so a re-pull of the same domain UPDATES the existing row (dedup) instead of
    erroring on the primary key
  • retry with exponential backoff on 5xx / network blips
  • resumable: writes a checkpoint after each successful batch so a crash mid-load
    can pick up where it left off

It is a RUNNABLE TEMPLATE: no hardcoded data, all config via env / CLI.

USAGE
-----
    # keys come from the environment (see .env.example at repo root)
    export SUPABASE_PROJECT_REF=your_ref
    export SUPABASE_ANON_KEY=your_anon_key

    # load a newline-delimited JSON file into the Company table in schema `acme`
    python supabase_load.py --table Company --schema acme --input companies.jsonl

    # load People (a JSON array file) and upsert on the unique key
    python supabase_load.py --table People --schema acme \
        --input people.json --on-conflict company_domain,email

INPUT FORMAT
------------
  • .jsonl  — one JSON object per line (preferred for big files; streamed)
  • .json   — a single JSON array of objects
Each object's keys MUST match column names in schema.sql for the target table.
Unknown keys are rejected by PostgREST, so clean your rows first.

Stdlib + requests only. Python 3.8+.
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

import requests

# ── Tunables (override via CLI) ──────────────────────────────────────────────
BATCH_SIZE = 200          # rows per POST. PostgREST is happy with a few hundred.
MAX_RETRIES = 5           # per-batch retry attempts on 5xx / network errors
BACKOFF_BASE = 2.0        # seconds; sleep = BACKOFF_BASE ** attempt
REQUEST_TIMEOUT = 60      # seconds per HTTP call


def env_or_die(name: str) -> str:
    """Read a required key from the environment. Never hardcode secrets."""
    val = os.environ.get(name)
    if not val:
        sys.exit(
            f"ERROR: ${name} is not set. Copy .env.example to .env, fill it in, "
            f"and `export` it (or `source .env`) before running."
        )
    return val


def load_rows(input_path: Path):
    """Yield row dicts from a .jsonl (streamed) or .json (array) file."""
    if not input_path.exists():
        sys.exit(f"ERROR: input file not found: {input_path}")

    if input_path.suffix == ".jsonl":
        with input_path.open("r", encoding="utf-8") as fh:
            for line_no, line in enumerate(fh, 1):
                line = line.strip()
                if not line:
                    continue
                try:
                    yield json.loads(line)
                except json.JSONDecodeError as e:
                    sys.exit(f"ERROR: bad JSON on line {line_no} of {input_path}: {e}")
    else:  # .json — single array
        with input_path.open("r", encoding="utf-8") as fh:
            data = json.load(fh)
        if not isinstance(data, list):
            sys.exit(f"ERROR: {input_path} must contain a JSON array of objects.")
        for row in data:
            yield row


def chunked(iterable, size):
    """Group an iterable into lists of `size`."""
    batch = []
    for item in iterable:
        batch.append(item)
        if len(batch) == size:
            yield batch
            batch = []
    if batch:
        yield batch


def post_batch(session, url, headers, batch, batch_idx):
    """POST one batch with retry + exponential backoff on 5xx / network errors."""
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = session.post(url, headers=headers, json=batch, timeout=REQUEST_TIMEOUT)
        except requests.RequestException as e:
            wait = BACKOFF_BASE ** attempt
            print(f"  batch {batch_idx}: network error ({e}); retry {attempt}/{MAX_RETRIES} in {wait:.0f}s")
            time.sleep(wait)
            continue

        if resp.status_code in (200, 201, 204):
            return True

        # 4xx (except 429) means the rows or request are malformed — retrying
        # won't help. Surface the body so the user can fix their data / config.
        if 400 <= resp.status_code < 500 and resp.status_code != 429:
            print(f"  batch {batch_idx}: HTTP {resp.status_code} — not retrying.")
            print(f"  response: {resp.text[:800]}")
            return False

        # 5xx or 429 → transient; back off and retry.
        wait = BACKOFF_BASE ** attempt
        print(f"  batch {batch_idx}: HTTP {resp.status_code}; retry {attempt}/{MAX_RETRIES} in {wait:.0f}s")
        time.sleep(wait)

    print(f"  batch {batch_idx}: exhausted {MAX_RETRIES} retries — giving up on this batch.")
    return False


def main():
    parser = argparse.ArgumentParser(description="Batch-load rows into Supabase via PostgREST.")
    parser.add_argument("--table", required=True,
                        help="Target table name, e.g. Company / People / Company_Not_ICP / Company_Parked")
    parser.add_argument("--schema", default="public",
                        help="Tenant Postgres schema to write into (routed via Content-Profile). Default: public")
    parser.add_argument("--input", required=True,
                        help="Path to a .jsonl (one object per line) or .json (array) file")
    parser.add_argument("--on-conflict", default="domain",
                        help="Comma-separated conflict target column(s) for upsert. "
                             "Default 'domain' (use 'company_domain,email' for People).")
    parser.add_argument("--batch-size", type=int, default=BATCH_SIZE)
    parser.add_argument("--checkpoint", default=None,
                        help="Checkpoint file path. Default: .<input>.ckpt next to the input.")
    parser.add_argument("--dry-run", action="store_true",
                        help="Parse + batch the input but send nothing. Validates the file.")
    args = parser.parse_args()

    project_ref = env_or_die("SUPABASE_PROJECT_REF")
    anon_key = env_or_die("SUPABASE_ANON_KEY")

    input_path = Path(args.input)
    ckpt_path = Path(args.checkpoint) if args.checkpoint else input_path.with_suffix(input_path.suffix + ".ckpt")

    # Resume: how many batches already succeeded?
    start_batch = 0
    if ckpt_path.exists():
        try:
            start_batch = int(ckpt_path.read_text().strip() or "0")
            print(f"Resuming: {start_batch} batch(es) already loaded (from {ckpt_path}).")
        except ValueError:
            start_batch = 0

    url = f"https://{project_ref}.supabase.co/rest/v1/{args.table}"
    headers = {
        "apikey": anon_key,
        "Authorization": f"Bearer {anon_key}",
        "Content-Type": "application/json",
        # Route the write to the tenant schema (PostgREST "Content-Profile").
        "Content-Profile": args.schema,
        # Upsert: merge duplicates on the conflict key → idempotent re-runs (dedup).
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }
    # PostgREST takes the conflict target as a query param.
    params_suffix = f"?on_conflict={args.on_conflict}"
    url_with_conflict = url + params_suffix

    print(f"Loading → {url}")
    print(f"  schema={args.schema}  on_conflict={args.on_conflict}  batch_size={args.batch_size}")

    session = requests.Session()

    total_rows = 0
    sent_rows = 0
    failed_batches = 0

    for batch_idx, batch in enumerate(chunked(load_rows(input_path), args.batch_size)):
        total_rows += len(batch)

        if batch_idx < start_batch:
            continue  # already loaded in a prior run

        if args.dry_run:
            print(f"  [dry-run] batch {batch_idx}: {len(batch)} rows OK")
            continue

        ok = post_batch(session, url_with_conflict, headers, batch, batch_idx)
        if ok:
            sent_rows += len(batch)
            # Checkpoint AFTER success so a crash resumes from the right place.
            ckpt_path.write_text(str(batch_idx + 1))
            print(f"  batch {batch_idx}: {len(batch)} rows OK  (total sent: {sent_rows})")
        else:
            failed_batches += 1
            print(f"  batch {batch_idx}: FAILED — left checkpoint at {start_batch}; "
                  f"fix the cause and re-run to resume.")
            break  # stop on first hard failure so you don't skip rows silently

    print("─" * 60)
    print(f"Done. rows seen={total_rows}  rows sent={sent_rows}  failed_batches={failed_batches}")
    if failed_batches == 0 and not args.dry_run:
        # Clean up the checkpoint on a full clean run.
        if ckpt_path.exists():
            ckpt_path.unlink()
        print("Checkpoint cleared — load complete.")
    elif args.dry_run:
        print("Dry run only — nothing was sent.")
    else:
        print(f"Checkpoint preserved at {ckpt_path} — re-run to resume.")
        sys.exit(1)


if __name__ == "__main__":
    main()
