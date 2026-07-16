#!/usr/bin/env python3
"""
Stage 06 — build_master.py
==========================
Assemble the signal-anchored OUTREACH MASTER.

Input (both produced by earlier stages; kept as local run data, out of git):

  --accounts  JSONL, one row per SCORED account (Stage 05). Expected fields:
              account_id, company, domain, tier ("high"|"mid"|"low"),
              score (number), and the carried top signal:
                top_signal_type, top_signal_summary,
                top_signal_date, top_signal_url
  --contacts  JSONL, one row per enriched CONTACT (Stage 00/01 people-find).
              Expected fields:
                account_id, full_name (or first_name/last_name),
                title, email, linkedin_url, persona

Output:

  --out        JSONL, ONE row per account = the single best-ranked contact for
               that account, joined to the account's tier + top signal. This is
               what export_campaigns.py consumes.
  --secondary  JSONL, every OTHER contact on accounts that made the master, so
               later touches / other channels can reach them. (optional)

The selection rule
------------------
For each account, among its contacts:
  1. rank by PERSONA priority  (configurable; see PERSONA_PRIORITY / --persona-priority)
  2. break ties by DATA COMPLETENESS (has email + linkedin beats one of two)
  3. break remaining ties deterministically (by name) so reruns are stable
Keep the #1 contact as the primary; the rest go to the secondary sidecar.

No signal => excluded from the master
-------------------------------------
Stage 06's hard rule is "no signal, no send". An account whose top_signal_summary
is empty is written to neither file (it is reported and, by default, dropped).
Pass --keep-no-signal to instead route those accounts to the secondary file for a
nurture / hold flow. They still never reach the active master.

This script reads NO secrets and calls NO network. Pure local join.
Python 3, stdlib only.
"""

import argparse
import json
import os
import sys
from collections import defaultdict

# Default persona ladder, most-preferred first. Override with env PERSONA_PRIORITY
# (comma-separated) or --persona-priority. Any persona not in the list ranks last.
# TODO: customize these persona labels to match whatever your Stage 01 people-find
#       wrote into the `persona` field.
DEFAULT_PERSONA_PRIORITY = "economic_buyer,champion,technical_eval,influencer,other"


def load_jsonl(path):
    """Yield dict rows from a JSONL file, skipping blank/comment lines."""
    with open(path, "r", encoding="utf-8") as fh:
        for lineno, line in enumerate(fh, 1):
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError as exc:
                sys.stderr.write(f"[warn] {path}:{lineno} bad JSON, skipped ({exc})\n")


def write_jsonl(path, rows):
    """Write an iterable of dicts as JSONL, creating parent dirs."""
    parent = os.path.dirname(os.path.abspath(path))
    os.makedirs(parent, exist_ok=True)
    n = 0
    with open(path, "w", encoding="utf-8") as fh:
        for row in rows:
            fh.write(json.dumps(row, ensure_ascii=False) + "\n")
            n += 1
    return n


def contact_name(c):
    """Best-effort full name from whatever the contacts file provided."""
    name = (c.get("full_name") or c.get("name") or "").strip()
    if name:
        return name
    first = (c.get("first_name") or "").strip()
    last = (c.get("last_name") or "").strip()
    return (first + " " + last).strip()


def persona_rank(persona, priority):
    """Lower number = higher priority. Unknown personas sort last."""
    p = (persona or "other").strip().lower()
    try:
        return priority.index(p)
    except ValueError:
        return len(priority)  # unknown -> after every named persona


def completeness_score(c):
    """Higher is better: reward having both an email and a linkedin url."""
    has_email = 1 if (c.get("email") or "").strip() else 0
    has_li = 1 if (c.get("linkedin_url") or "").strip() else 0
    return has_email + has_li


def has_signal(account):
    """Stage 06 gate: a usable signal means a non-empty summary to anchor on."""
    return bool((account.get("top_signal_summary") or "").strip())


def pick_primary(contacts, priority):
    """
    Return (primary, others) for one account's contacts.
    Sort by (persona_rank asc, completeness desc, name asc) — fully deterministic.
    """
    ranked = sorted(
        contacts,
        key=lambda c: (
            persona_rank(c.get("persona"), priority),
            -completeness_score(c),
            contact_name(c).lower(),
        ),
    )
    return ranked[0], ranked[1:]


def build_master_row(account, contact):
    """Flatten the account + chosen contact into one outreach-master row."""
    return {
        # account identity + routing inputs
        "account_id": account.get("account_id"),
        "company": account.get("company"),
        "domain": account.get("domain"),
        "tier": (account.get("tier") or "").strip().lower(),
        "score": account.get("score"),
        # the single primary contact
        "full_name": contact_name(contact),
        "first_name": (contact.get("first_name")
                       or contact_name(contact).split(" ")[0] if contact_name(contact) else ""),
        "title": contact.get("title"),
        "email": (contact.get("email") or "").strip(),
        "linkedin_url": (contact.get("linkedin_url") or "").strip(),
        "persona": (contact.get("persona") or "other").strip().lower(),
        # the signal we will anchor the first line on (carried from Stage 05)
        "top_signal_type": account.get("top_signal_type"),
        "top_signal_summary": (account.get("top_signal_summary") or "").strip(),
        "top_signal_date": account.get("top_signal_date"),
        "top_signal_url": account.get("top_signal_url"),
    }


def main():
    ap = argparse.ArgumentParser(description="Build the Stage 06 outreach master.")
    ap.add_argument("--accounts", required=True, help="Stage 05 scored accounts JSONL")
    ap.add_argument("--contacts", required=True, help="enriched contacts JSONL")
    ap.add_argument("--out", required=True, help="output: outreach master JSONL")
    ap.add_argument("--secondary", default=None,
                    help="output: secondary contacts sidecar JSONL (optional)")
    ap.add_argument("--persona-priority", default=None,
                    help="comma-separated persona ladder (overrides env PERSONA_PRIORITY)")
    ap.add_argument("--keep-no-signal", action="store_true",
                    help="route no-signal accounts to the secondary file instead of dropping")
    args = ap.parse_args()

    priority_raw = (args.persona_priority
                    or os.environ.get("PERSONA_PRIORITY")
                    or DEFAULT_PERSONA_PRIORITY)
    priority = [p.strip().lower() for p in priority_raw.split(",") if p.strip()]

    # index contacts by account
    contacts_by_account = defaultdict(list)
    n_contacts = 0
    for c in load_jsonl(args.contacts):
        acc_id = c.get("account_id")
        if acc_id is None:
            continue
        contacts_by_account[acc_id].append(c)
        n_contacts += 1

    master_rows = []
    secondary_rows = []
    n_accounts = 0
    n_no_signal = 0
    n_no_contact = 0

    for account in load_jsonl(args.accounts):
        n_accounts += 1
        acc_id = account.get("account_id")
        account_contacts = contacts_by_account.get(acc_id, [])

        if not has_signal(account):
            # Stage 06 gate. Either drop or divert to secondary as a held nurture.
            n_no_signal += 1
            if args.keep_no_signal:
                for c in account_contacts:
                    secondary_rows.append({**c, "_reason": "no_signal_hold"})
            continue

        if not account_contacts:
            n_no_contact += 1
            sys.stderr.write(
                f"[warn] account {acc_id} ({account.get('company')}) has a signal "
                f"but no contacts — find a contact before it can ship.\n"
            )
            continue

        primary, others = pick_primary(account_contacts, priority)
        master_rows.append(build_master_row(account, primary))
        for o in others:
            secondary_rows.append({**o, "_primary_taken_by": contact_name(primary)})

    n_master = write_jsonl(args.out, master_rows)
    n_secondary = 0
    if args.secondary:
        n_secondary = write_jsonl(args.secondary, secondary_rows)

    # summary to stderr so stdout stays clean if piped
    sys.stderr.write(
        "\n=== build_master summary ===\n"
        f"  accounts read ............ {n_accounts}\n"
        f"  contacts read ............ {n_contacts}\n"
        f"  master rows (1/account) .. {n_master}\n"
        f"  secondary rows ........... {n_secondary}\n"
        f"  skipped: no signal ....... {n_no_signal}"
        f"{'  (diverted to secondary)' if args.keep_no_signal else '  (dropped)'}\n"
        f"  skipped: signal but no contact .. {n_no_contact}\n"
        f"  persona priority ......... {priority}\n"
        f"  -> master:    {args.out}\n"
        f"  -> secondary: {args.secondary or '(not written)'}\n"
    )


if __name__ == "__main__":
    main()
