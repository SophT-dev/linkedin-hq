#!/usr/bin/env python3
"""
cname_probe.py — Stage 03 · Signal Mapping · Detection Method 2 (DNS CNAME probe)

Resolve a subdomain on each account's domain and map the CNAME target to a known
vendor. If `careers.acme.com` is a CNAME pointing at a known ATS host, Acme runs
that ATS — a high-confidence tech-stack signal that needs no scraping and no API
cost. DNS doesn't lie about who hosts a subdomain, so false positives are near
zero.

IMPORTANT semantics:
  - A CNAME match  → signal fires, confidence = "confirmed" (DNS is authoritative)
  - NO CNAME / no match → UNKNOWN, never a negative. The company may self-host or
    use a root-domain setup. We write value=false, confidence="unknown" so Stage
    05 can tell "we looked and found nothing" apart from "we never looked".

Pure stdlib: uses the system resolver via `socket`. For a CNAME chain we walk
aliases with a bounded loop. (If you need richer records — MX, TXT, full chains —
swap in `dnspython`; this stays dependency-free on purpose.)

The VENDOR_CNAME_MAP below is a GENERIC EXAMPLE. The keys are CNAME-target
substrings, the values are (vendor_label, signal_column). Replace with the
vendor host suffixes YOU care about for <YOUR_PRODUCT>'s ICP. Keep this map
versioned — it is part of the signal definition.

Usage:
  python3 cname_probe.py --in data/accounts.jsonl --out data/accounts.jsonl
  python3 cname_probe.py --in a.jsonl --out b.jsonl --subdomain careers --resume

Each matched row gains a signal column, e.g.:
  "signal_uses_ats_tool": {
      "value": true, "confidence": "confirmed", "method": "cname",
      "version": "v1", "evidence": "careers.acme.com -> <ats-host>",
      "vendor": "<ats-vendor-label>", "weight": 0.7
  }
"""
from __future__ import annotations

import argparse
import json
import os
import socket
import sys
import tempfile

# ── GENERIC EXAMPLE vendor map — TODO: customize ─────────────────────────────
# Map a substring that appears in a CNAME target → (vendor label, signal column).
# These hosts are illustrative placeholders. Fill in the real vendor host
# suffixes for the categories that matter to <YOUR_PRODUCT>. Match is a simple
# case-insensitive substring test against the resolved CNAME chain.
VENDOR_CNAME_MAP: list[tuple[str, str, str]] = [
    # (cname_substring,            vendor_label,            signal_column)
    ("ats-vendor-a.example",       "ATS Vendor A",          "signal_uses_ats_tool"),
    ("ats-vendor-b.example",       "ATS Vendor B",          "signal_uses_ats_tool"),
    ("cdp-vendor.example",         "CDP Vendor",            "signal_uses_cdp_tool"),
    ("helpdesk-vendor.example",    "Helpdesk Vendor",       "signal_uses_helpdesk_tool"),
    ("ecom-vendor.example",        "Ecommerce Platform",    "signal_uses_ecom_tool"),
    # Add the host suffixes for the <category> tools that signal pain for you.
]

# Which subdomains to probe by default. `careers`/`jobs` → ATS; `shop`/`store`
# → ecommerce; `help`/`support` → helpdesk; `""` (root) catches apex setups.
DEFAULT_SUBDOMAINS = ["careers", "jobs", ""]

CNAME_VERSION = "v1"
SIGNAL_WEIGHT = 0.7
MAX_CHAIN = 8           # guard against pathological CNAME chains
DNS_TIMEOUT = 5.0       # seconds


def _domain_of(row: dict) -> str | None:
    for key in ("domain", "website", "company_domain", "url"):
        v = row.get(key)
        if v:
            d = str(v).strip().lower()
            d = d.replace("https://", "").replace("http://", "").replace("www.", "")
            return d.split("/")[0].strip().strip(".") or None
    return None


def resolve_cname_chain(host: str) -> list[str]:
    """Return the CNAME alias chain for `host` (best-effort, stdlib only)."""
    chain: list[str] = []
    socket.setdefaulttimeout(DNS_TIMEOUT)
    cur = host
    seen = set()
    for _ in range(MAX_CHAIN):
        if cur in seen:
            break
        seen.add(cur)
        try:
            # getaddrinfo follows CNAMEs but hides them; gethostbyname_ex exposes
            # the alias list in its second return value.
            _name, aliases, _addrs = socket.gethostbyname_ex(cur)
        except (socket.gaierror, socket.herror, socket.timeout, OSError):
            break
        new = [a for a in aliases if a and a not in chain and a != cur]
        if not new:
            # gethostbyname_ex's canonical name can also differ from input
            if _name and _name != cur and _name not in chain:
                chain.append(_name)
            break
        chain.extend(new)
        cur = new[-1]
    return chain


def match_vendor(chain: list[str]) -> tuple[str, str, str] | None:
    blob = " ".join(chain).lower()
    for substr, label, col in VENDOR_CNAME_MAP:
        if substr.lower() in blob:
            return substr, label, col
    return None


def probe_row(row: dict, subdomains: list[str]) -> dict:
    domain = _domain_of(row)
    if not domain:
        return row
    matched_cols: dict[str, dict] = {}
    probed_any = False
    for sub in subdomains:
        host = f"{sub}.{domain}" if sub else domain
        chain = resolve_cname_chain(host)
        probed_any = probed_any or True
        if not chain:
            continue
        hit = match_vendor(chain)
        if hit:
            _substr, label, col = hit
            matched_cols.setdefault(col, {
                "value": True,
                "confidence": "confirmed",   # DNS is authoritative
                "method": "cname",
                "version": CNAME_VERSION,
                "evidence": f"{host} -> {chain[-1]}",
                "vendor": label,
                "weight": SIGNAL_WEIGHT,
            })

    # Write matched columns. For every column that exists in the map but did NOT
    # match, set UNKNOWN (we looked, found nothing) — never a hard negative.
    all_cols = {col for _, _, col in VENDOR_CNAME_MAP}
    for col in all_cols:
        if col in matched_cols:
            row[col] = matched_cols[col]
        elif col not in row:  # don't clobber a prior confirmed hit
            row[col] = {
                "value": False,
                "confidence": "unknown" if probed_any else "not_checked",
                "method": "cname",
                "version": CNAME_VERSION,
                "evidence": None,
                "vendor": None,
                "weight": SIGNAL_WEIGHT,
            }
    return row


def main() -> int:
    ap = argparse.ArgumentParser(description="DNS CNAME vendor probe → tech-stack signal columns.")
    ap.add_argument("--in", dest="infile", required=True, help="input accounts JSONL")
    ap.add_argument("--out", dest="outfile", required=True, help="output accounts JSONL")
    ap.add_argument("--subdomain", action="append", dest="subdomains",
                    help="subdomain to probe (repeatable). Default: careers, jobs, root")
    ap.add_argument("--resume", action="store_true",
                    help="skip rows already carrying a confirmed CNAME signal")
    args = ap.parse_args()

    subs = args.subdomains if args.subdomains else DEFAULT_SUBDOMAINS
    all_cols = {col for _, _, col in VENDOR_CNAME_MAP}
    sys.stderr.write(f"[info] probing subdomains {subs} for {len(all_cols)} signal column(s)\n")

    out_dir = os.path.dirname(os.path.abspath(args.outfile)) or "."
    os.makedirs(out_dir, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=out_dir, suffix=".tmp")
    n = n_hit = 0
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
                already = any(
                    isinstance(row.get(c), dict) and row[c].get("confidence") == "confirmed"
                    for c in all_cols
                )
                if args.resume and already:
                    fout.write(json.dumps(row, ensure_ascii=False) + "\n")
                    continue
                probe_row(row, subs)
                if any(isinstance(row.get(c), dict) and row[c].get("value") for c in all_cols):
                    n_hit += 1
                fout.write(json.dumps(row, ensure_ascii=False) + "\n")
        os.replace(tmp, args.outfile)
    except BaseException:
        if os.path.exists(tmp):
            os.remove(tmp)
        raise

    sys.stderr.write(f"[done] {n} rows · {n_hit} with a vendor match · → {args.outfile}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
