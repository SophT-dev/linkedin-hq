#!/usr/bin/env python3
"""
run_pipeline.py — thin orchestrator for the signal-led GTM engine.

It does ONE job: call stages 00 -> 06 in order, stopping early when a stage reports
"nothing left to do". It holds NO state of its own. Kill it mid-run and re-run; each
stage re-reads its own `WHERE <verdict> IS NULL` queue from Supabase and continues.

Design contract (see orchestration/README.md):
  - Resumable : a stage only processes rows whose verdict/signal column is NULL.
  - Idempotent: stages write keyed upserts AFTER the work succeeds, never before.
  - Stage-gated: the boundary between two stages is one Supabase column, not a file.

This file is a RUNNABLE TEMPLATE. Each stage's real logic lives in its own folder as a
`run.py` exposing two callables:

    run(max_rows: int | None, dry_run: bool) -> int   # returns rows processed this pass
    pending() -> int                                  # rows still waiting (queue depth)

Where a stage folder doesn't have a `run.py` yet, this orchestrator SKIPS it with a clear
notice instead of crashing — so you can build the engine stage by stage.

Keys are read by the STAGES via os.environ (names match .env.example). This orchestrator
itself reads no secrets; it only checks that the keys a given stage needs are present and
warns if they're missing. Never hardcode a key here or anywhere.

Usage:
    python3 orchestration/run_pipeline.py                 # full chain, default caps
    python3 orchestration/run_pipeline.py --status        # queue depth per stage, do nothing
    python3 orchestration/run_pipeline.py --stages 01,05  # only these stages
    python3 orchestration/run_pipeline.py --max-rows 500  # cap rows processed per stage
    python3 orchestration/run_pipeline.py --dry-run       # print plan, touch nothing
"""
from __future__ import annotations

import argparse
import importlib.util
import os
import sys
import time
from dataclasses import dataclass
from pathlib import Path

# Repo root = parent of this orchestration/ folder.
ROOT = Path(__file__).resolve().parent.parent


# --------------------------------------------------------------------------- #
# Stage registry — the pipeline spine, in order.
#
# Each Stage declares the folder it lives in and the env keys it needs. The
# `needs` list is used only to WARN about missing keys (the orchestrator never
# reads the values). Add/remove stages here as the engine grows; order = run order.
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class Stage:
    id: str            # "00".."06" — matches the folder prefix
    folder: str        # directory under repo root holding this stage's run.py
    title: str
    needs: tuple[str, ...]   # env var names this stage uses (warn-only)


STAGES: list[Stage] = [
    Stage("00", "00-tam-build", "Build raw TAM (companies)",
          ("PROSPEO_API_KEY", "BLITZ_API_KEY", "AI_ARK_API_KEY",
           "SUPABASE_PROJECT_REF", "SUPABASE_ACCESS_TOKEN")),
    Stage("01", "01-account-qualify", "Qualify accounts vs ICP (LLM-judged)",
          ("FIRECRAWL_API_KEY", "PARALLEL_API_KEY", "SERPER_API_KEY",
           "ANTHROPIC_API_KEY", "SUPABASE_PROJECT_REF", "SUPABASE_ACCESS_TOKEN")),
    Stage("02", "02-system-of-record", "Load survivors into Supabase",
          ("SUPABASE_PROJECT_REF", "SUPABASE_ACCESS_TOKEN")),
    Stage("03", "03-signal-mapping", "Attach signals to accounts (Trigify)",
          ("TRIGIFY_API_KEY", "SERPER_API_KEY",
           "SUPABASE_PROJECT_REF", "SUPABASE_ACCESS_TOKEN")),
    Stage("04", "04-signal-led-expansion", "Discover NEW accounts from signals (Trigify)",
          ("TRIGIFY_API_KEY", "APIFY_API_KEY",
           "SUPABASE_PROJECT_REF", "SUPABASE_ACCESS_TOKEN")),
    Stage("05", "05-scoring-stacking", "Score + stack signals into a priority tier",
          ("ANTHROPIC_API_KEY", "SUPABASE_PROJECT_REF", "SUPABASE_ACCESS_TOKEN")),
    Stage("06", "06-outreach", "Push top tier to the outreach layer",
          ("PROSPEO_API_KEY", "SUPABASE_PROJECT_REF", "SUPABASE_ACCESS_TOKEN")),
]


# --------------------------------------------------------------------------- #
# Stage module loading — defensive. A stage without a run.py is SKIPPED, not fatal.
# --------------------------------------------------------------------------- #
def load_stage_module(stage: Stage):
    """Import <folder>/run.py if it exists; return the module or None."""
    run_py = ROOT / stage.folder / "run.py"
    if not run_py.exists():
        return None
    spec = importlib.util.spec_from_file_location(f"stage_{stage.id}", run_py)
    if spec is None or spec.loader is None:
        return None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)  # type: ignore[union-attr]
    return module


def missing_keys(stage: Stage) -> list[str]:
    """Env vars the stage declares but that are absent/empty. Warn-only."""
    return [k for k in stage.needs if not os.environ.get(k)]


def call_pending(module) -> int | None:
    fn = getattr(module, "pending", None)
    if not callable(fn):
        return None
    try:
        return int(fn())
    except Exception as exc:  # a broken pending() must not break --status
        print(f"      ! pending() raised: {exc}", file=sys.stderr)
        return None


# --------------------------------------------------------------------------- #
# Commands
# --------------------------------------------------------------------------- #
def cmd_status(selected: list[Stage]) -> int:
    print("Queue depth per stage (rows waiting for this stage to process):\n")
    any_work = False
    for s in selected:
        module = load_stage_module(s)
        if module is None:
            print(f"  [{s.id}] {s.title:<48}  (no run.py yet — not built)")
            continue
        depth = call_pending(module)
        miss = missing_keys(s)
        flag = f"   ⚠ missing keys: {', '.join(miss)}" if miss else ""
        if depth is None:
            print(f"  [{s.id}] {s.title:<48}  pending: n/a{flag}")
        else:
            any_work = any_work or depth > 0
            print(f"  [{s.id}] {s.title:<48}  pending: {depth:>7}{flag}")
    print()
    print("Nothing waiting — engine is caught up." if not any_work
          else "Run without --status to drain the queues.")
    return 0


def run_one_stage(s: Stage, max_rows: int | None, dry_run: bool) -> int:
    """Run a single stage. Returns rows processed (0 if nothing to do / skipped)."""
    module = load_stage_module(s)
    if module is None:
        print(f"  [{s.id}] {s.title}: SKIP (no {s.folder}/run.py yet)")
        return 0

    miss = missing_keys(s)
    if miss:
        # Missing keys is a soft stop for THIS stage, not a crash for the pipeline.
        print(f"  [{s.id}] {s.title}: SKIP — missing env keys: {', '.join(miss)}")
        return 0

    run_fn = getattr(module, "run", None)
    if not callable(run_fn):
        print(f"  [{s.id}] {s.title}: SKIP — run.py has no run() callable")
        return 0

    depth = call_pending(module)
    if depth == 0:
        print(f"  [{s.id}] {s.title}: nothing to do (queue empty)")
        return 0

    if dry_run:
        cap = "all" if max_rows is None else max_rows
        d = "?" if depth is None else depth
        print(f"  [{s.id}] {s.title}: DRY-RUN would process up to {cap} of {d} pending row(s)")
        return 0

    started = time.monotonic()
    try:
        processed = int(run_fn(max_rows=max_rows, dry_run=False))
    except KeyboardInterrupt:
        raise
    except Exception as exc:
        # A stage failure stops the chain here; already-written rows are safe and the
        # un-NULL leftovers are picked up on the next invocation. No partial-state cleanup.
        print(f"  [{s.id}] {s.title}: ERROR — {exc}", file=sys.stderr)
        raise
    elapsed = time.monotonic() - started
    print(f"  [{s.id}] {s.title}: processed {processed} row(s) in {elapsed:0.1f}s")
    return processed


def cmd_run(selected: list[Stage], max_rows: int | None, dry_run: bool) -> int:
    mode = "DRY-RUN" if dry_run else "RUN"
    cap = "uncapped" if max_rows is None else f"≤{max_rows} rows/stage"
    print(f"Pipeline {mode} — {len(selected)} stage(s), {cap}\n")
    total = 0
    for s in selected:
        total += run_one_stage(s, max_rows=max_rows, dry_run=dry_run)
    print(f"\nDone. {total} row(s) processed across {len(selected)} stage(s).")
    print("Re-run any time — resumable & idempotent. Leftover rows roll to the next tick.")
    return 0


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #
def parse_stage_filter(arg: str | None) -> list[Stage]:
    if not arg:
        return list(STAGES)
    wanted = {tok.strip().zfill(2) for tok in arg.split(",") if tok.strip()}
    chosen = [s for s in STAGES if s.id in wanted]
    unknown = wanted - {s.id for s in STAGES}
    if unknown:
        valid = ", ".join(s.id for s in STAGES)
        sys.exit(f"Unknown stage id(s): {', '.join(sorted(unknown))}. Valid: {valid}")
    return chosen


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(
        description="Thin resumable orchestrator for the signal-led GTM engine (stages 00–06).")
    p.add_argument("--stages", metavar="IDS",
                   help='comma-separated stage ids to run, e.g. "01,05". Default: all.')
    p.add_argument("--max-rows", type=int, default=None,
                   help="cap rows each stage processes this pass (bounds a tick). Default: uncapped.")
    p.add_argument("--status", action="store_true",
                   help="print queue depth per stage and exit (read-only).")
    p.add_argument("--dry-run", action="store_true",
                   help="print what each stage WOULD do; touch nothing.")
    args = p.parse_args(argv)

    selected = parse_stage_filter(args.stages)

    if args.status:
        return cmd_status(selected)
    return cmd_run(selected, max_rows=args.max_rows, dry_run=args.dry_run)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        print("\nInterrupted — safe to re-run; stages resume from their NULL queues.",
              file=sys.stderr)
        raise SystemExit(130)
