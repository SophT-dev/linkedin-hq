#!/usr/bin/env python3
"""
Stage 06 — export_campaigns.py
==============================
Read the outreach master (from build_master.py) and write per-SENDER import
files, applying the tier -> channel routing.

Senders (execution layer — complementary to the Trigify signal layer):
  - Smartlead  (email)   -> smartlead_email.csv
  - Instantly  (email)   -> instantly_email.csv
  - HeyReach   (LinkedIn) -> heyreach_linkedin.csv

Routing (data, not code — edit ROUTING below, don't fork the script):
  high  -> email + LinkedIn   (+ a call task; call is a human action, not a file)
  mid   -> email + LinkedIn
  low   -> NEITHER on entry. Held in low_tier_hold.csv until a fresh signal
           promotes it. (Stage 06 trigger-gating.)

Every export carries the signal fields as custom variables so the sequence's
first line can merge them in (e.g. "Saw {{signal_summary}} —"). That merge is
what makes the touch feel hand-written instead of mailmerge.

Hard gate repeated here as defense-in-depth: a row with an empty
top_signal_summary is NEVER written to an active sender file, even if it somehow
reached the master. No signal, no send.

This script reads NO secrets and calls NO network. It only reshapes the master
into the column names each sender expects. Loading the files into the senders
(via their UI import or their API with YOUR OWN key) is a separate step you run.

Python 3, stdlib only.
"""

import argparse
import csv
import json
import os
import sys


# ─────────────────────────────────────────────────────────────────────────────
# Routing table — TIER -> which channels that tier is allowed onto.
# This is the one knob most teams tune. Keep it declarative.
# "call" is a human action (a task for a rep), so it produces no file of its own;
# high-tier rows simply also appear in the call-task list note in the manifest.
# TODO: customize tiers / channels to match your Stage 05 tier labels.
# ─────────────────────────────────────────────────────────────────────────────
ROUTING = {
    "high": {"email": True,  "linkedin": True,  "call": True,  "hold": False},
    "mid":  {"email": True,  "linkedin": True,  "call": False, "hold": False},
    "low":  {"email": False, "linkedin": False, "call": False, "hold": True},
}

# Column orders per sender. The custom signal vars are appended so they survive
# import as personalization fields. Edit names if your sender account uses
# different custom-field labels.
SMARTLEAD_COLUMNS = [
    "email", "first_name", "last_name", "company_name", "title",
    "linkedin_url", "website",
    # custom variables -> reference as {{signal_summary}} etc. in the sequence:
    "signal_type", "signal_summary", "signal_date", "signal_url",
    "tier", "score",
]

INSTANTLY_COLUMNS = [
    "email", "first_name", "last_name", "company_name", "title",
    "website", "linkedin_url",
    # Instantly custom variables:
    "signal_type", "signal_summary", "signal_date", "signal_url",
    "tier", "score",
]

# HeyReach keys on the LinkedIn profile URL (it drives LinkedIn actions, not
# email). Email is optional context only.
HEYREACH_COLUMNS = [
    "linkedin_url", "first_name", "last_name", "company_name", "title",
    "email",
    "signal_type", "signal_summary", "signal_date", "signal_url",
    "tier", "score",
]

# Hold list keeps everything so a later run can promote it on a fresh signal.
HOLD_COLUMNS = [
    "account_id", "company", "domain", "tier", "score",
    "full_name", "title", "email", "linkedin_url", "persona",
    "signal_type", "signal_summary", "signal_date", "signal_url",
]


def load_jsonl(path):
    with open(path, "r", encoding="utf-8") as fh:
        for lineno, line in enumerate(fh, 1):
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError as exc:
                sys.stderr.write(f"[warn] {path}:{lineno} bad JSON, skipped ({exc})\n")


def split_name(row):
    """Derive first/last from full_name if explicit fields are missing."""
    first = (row.get("first_name") or "").strip()
    last = (row.get("last_name") or "").strip()
    if first and last:
        return first, last
    full = (row.get("full_name") or "").strip()
    if full:
        parts = full.split()
        first = first or parts[0]
        last = last or (" ".join(parts[1:]) if len(parts) > 1 else "")
    return first, last


def base_fields(row):
    """Common, sender-agnostic projection of a master row."""
    first, last = split_name(row)
    return {
        "account_id": row.get("account_id"),
        "first_name": first,
        "last_name": last,
        "full_name": row.get("full_name"),
        "company_name": row.get("company"),
        "company": row.get("company"),
        "domain": row.get("domain"),
        "website": row.get("domain"),
        "title": row.get("title"),
        "email": (row.get("email") or "").strip(),
        "linkedin_url": (row.get("linkedin_url") or "").strip(),
        "persona": row.get("persona"),
        "tier": (row.get("tier") or "").strip().lower(),
        "score": row.get("score"),
        # signal -> custom variables (the load-bearing personalization)
        "signal_type": row.get("top_signal_type"),
        "signal_summary": (row.get("top_signal_summary") or "").strip(),
        "signal_date": row.get("top_signal_date"),
        "signal_url": row.get("top_signal_url"),
    }


def project(fields, columns):
    """Pick only the requested columns, in order; missing -> empty string."""
    return {c: (fields.get(c) if fields.get(c) is not None else "") for c in columns}


def write_csv(path, columns, rows):
    if not rows:
        return 0
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=columns, extrasaction="ignore")
        writer.writeheader()
        for r in rows:
            writer.writerow(r)
    return len(rows)


def main():
    ap = argparse.ArgumentParser(description="Export the outreach master to senders.")
    ap.add_argument("--master", required=True, help="outreach master JSONL (build_master.py output)")
    ap.add_argument("--outdir", required=True, help="directory for the campaign CSVs + manifest")
    args = ap.parse_args()

    smartlead, instantly, heyreach, hold = [], [], [], []
    call_tasks = []  # high-tier rows that also warrant a manual call task

    n = 0
    n_no_signal = 0
    n_no_email = 0
    n_no_li = 0

    for row in load_jsonl(args.master):
        n += 1
        f = base_fields(row)
        tier = f["tier"]
        route = ROUTING.get(tier)

        if route is None:
            sys.stderr.write(
                f"[warn] row {f.get('account_id')} has unknown tier {tier!r} — "
                f"add it to ROUTING. Skipped.\n"
            )
            continue

        # Defense-in-depth gate: no signal => never goes to an active sender.
        if not f["signal_summary"]:
            n_no_signal += 1
            hold.append(project({**f, "tier": tier or "low"}, HOLD_COLUMNS))
            continue

        # Low tier (or any tier flagged hold) is trigger-gated: park it.
        if route["hold"]:
            hold.append(project(f, HOLD_COLUMNS))
            continue

        if route["email"]:
            if f["email"]:
                smartlead.append(project(f, SMARTLEAD_COLUMNS))
                instantly.append(project(f, INSTANTLY_COLUMNS))
            else:
                n_no_email += 1

        if route["linkedin"]:
            if f["linkedin_url"]:
                heyreach.append(project(f, HEYREACH_COLUMNS))
            else:
                n_no_li += 1

        if route["call"]:
            call_tasks.append({
                "account_id": f["account_id"],
                "company": f["company"],
                "full_name": f["full_name"],
                "title": f["title"],
                "signal_summary": f["signal_summary"],
            })

    outdir = args.outdir
    paths = {
        "smartlead_email":   os.path.join(outdir, "smartlead_email.csv"),
        "instantly_email":   os.path.join(outdir, "instantly_email.csv"),
        "heyreach_linkedin": os.path.join(outdir, "heyreach_linkedin.csv"),
        "low_tier_hold":     os.path.join(outdir, "low_tier_hold.csv"),
        "call_tasks":        os.path.join(outdir, "call_tasks.csv"),
    }

    counts = {
        "smartlead_email":   write_csv(paths["smartlead_email"],   SMARTLEAD_COLUMNS, smartlead),
        "instantly_email":   write_csv(paths["instantly_email"],   INSTANTLY_COLUMNS, instantly),
        "heyreach_linkedin": write_csv(paths["heyreach_linkedin"], HEYREACH_COLUMNS, heyreach),
        "low_tier_hold":     write_csv(paths["low_tier_hold"],     HOLD_COLUMNS,     hold),
        "call_tasks":        write_csv(
            paths["call_tasks"],
            ["account_id", "company", "full_name", "title", "signal_summary"],
            call_tasks,
        ),
    }

    manifest = {
        "master_rows": n,
        "routing": ROUTING,
        "files": {k: {"path": paths[k], "rows": counts[k]} for k in counts},
        "gates": {
            "held_no_signal": n_no_signal,
            "email_route_but_no_email": n_no_email,
            "linkedin_route_but_no_linkedin": n_no_li,
        },
        "note": (
            "Email rows are written to BOTH smartlead_email.csv and "
            "instantly_email.csv (same leads, sender-specific column names) — "
            "load whichever sender you use, not both, to avoid double-sending."
        ),
    }
    os.makedirs(os.path.abspath(outdir), exist_ok=True)
    with open(os.path.join(outdir, "MANIFEST.json"), "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, indent=2, ensure_ascii=False)

    sys.stderr.write(
        "\n=== export_campaigns summary ===\n"
        f"  master rows .............. {n}\n"
        f"  smartlead_email.csv ...... {counts['smartlead_email']}\n"
        f"  instantly_email.csv ...... {counts['instantly_email']}\n"
        f"  heyreach_linkedin.csv .... {counts['heyreach_linkedin']}\n"
        f"  low_tier_hold.csv ........ {counts['low_tier_hold']}\n"
        f"  call_tasks.csv ........... {counts['call_tasks']}\n"
        f"  held (no signal) ......... {n_no_signal}\n"
        f"  email route, no email .... {n_no_email}\n"
        f"  LI route, no linkedin .... {n_no_li}\n"
        f"  -> {outdir}/MANIFEST.json\n"
        "  Reminder: email rows are in BOTH smartlead + instantly files "
        "(load ONE email sender, not both).\n"
    )


if __name__ == "__main__":
    main()
