#!/usr/bin/env python3
"""
Stage 01 (d) — Deterministic homepage clean.

Pure regex. NO LLM, NO network. Takes the raw Firecrawl markdown from step (c)
and produces compact, signal-dense text for the final KEEP/DROP read (step e).

Why deterministic: cleaning must be cheap, reproducible, and auditable. The same
homepage always yields the same cleaned text, and you can eyeball the rules below
for free instead of paying a model to strip boilerplate.

What it does:
  * strip image markdown                         ![alt](url) -> (gone)
  * keep link TEXT, drop the URL                 [text](url) -> text
  * strip bare URLs and markdown heading/format marks
  * drop nav / footer / cookie / social / legal boilerplate lines
  * drop lines too short to carry meaning (menus, single words)
  * collapse runs of blank lines
  * truncate to ~MAX_CHARS so the final LLM read stays cheap and in-context

Input rows carry homepage_markdown (from step c). Output rows add homepage_clean.

  python clean_homepage.py --in data/01c_scraped.jsonl --out data/01d_clean.jsonl

Python 3, stdlib only.
"""

import argparse
import json
import re
import sys

MAX_CHARS = 9000          # cap so the final LLM verdict stays cheap & in-context
MIN_LINE_LEN = 25         # drop lines shorter than this (menus, single words, etc.)

# --- regex toolbox (compiled once) ---------------------------------------------
RE_IMAGE = re.compile(r"!\[[^\]]*\]\([^)]*\)")              # ![alt](url)
RE_LINK = re.compile(r"\[([^\]]+)\]\([^)]*\)")              # [text](url) -> text
RE_BARE_URL = re.compile(r"https?://\S+")                  # leftover raw URLs
RE_HTML_TAG = re.compile(r"<[^>]+>")                       # stray html tags
RE_MD_MARKS = re.compile(r"[#*_`>~]+")                     # heading / emphasis / quote marks
RE_TABLE_PIPE = re.compile(r"^\s*\|?[\s:\-|]+\|?\s*$")     # markdown table rule lines
RE_MULTISPACE = re.compile(r"[ \t]{2,}")
RE_MULTIBLANK = re.compile(r"\n{3,}")

# Boilerplate lines to drop entirely (case-insensitive substring match).
# TODO: customize/extend for your locale and the sites you typically scrape.
BOILERPLATE = (
    "cookie", "cookies", "we use cookies", "accept all", "privacy policy",
    "terms of service", "terms & conditions", "terms and conditions",
    "all rights reserved", "©", "(c)", "copyright",
    "sign in", "log in", "login", "sign up", "subscribe", "newsletter",
    "follow us", "share this", "back to top", "skip to content",
    "menu", "navigation", "search", "toggle",
    "facebook", "twitter", "linkedin", "instagram", "youtube", "tiktok",
    "download on the app store", "get it on google play",
    "powered by", "made with", "request a demo",  # keep CTAs? these are usually chrome
)


def clean_markdown(md):
    if not md:
        return ""

    text = md
    text = RE_IMAGE.sub("", text)
    text = RE_LINK.sub(r"\1", text)
    text = RE_HTML_TAG.sub("", text)
    text = RE_BARE_URL.sub("", text)

    kept_lines = []
    seen = set()  # dedupe identical lines (repeated nav/cta blocks)
    for raw in text.splitlines():
        line = RE_MD_MARKS.sub("", raw)
        line = RE_MULTISPACE.sub(" ", line).strip()

        if not line:
            kept_lines.append("")          # preserve paragraph breaks (collapsed later)
            continue
        if RE_TABLE_PIPE.match(line):
            continue
        low = line.lower()
        if any(b in low for b in BOILERPLATE):
            continue
        if len(line) < MIN_LINE_LEN:
            # too short to be a real sentence — almost always a menu/label
            continue
        if low in seen:
            continue
        seen.add(low)
        kept_lines.append(line)

    cleaned = "\n".join(kept_lines)
    cleaned = RE_MULTIBLANK.sub("\n\n", cleaned).strip()

    if len(cleaned) > MAX_CHARS:
        cleaned = cleaned[:MAX_CHARS].rsplit(" ", 1)[0] + " …"
    return cleaned


def main():
    ap = argparse.ArgumentParser(description="Stage 01(d) deterministic homepage clean (no LLM).")
    ap.add_argument("--in", dest="infile", required=True)
    ap.add_argument("--out", dest="outfile", required=True)
    args = ap.parse_args()

    total = cleaned_count = 0
    with open(args.infile, "r", encoding="utf-8") as fin, \
         open(args.outfile, "w", encoding="utf-8") as fout:
        for line in fin:
            line = line.strip()
            if not line:
                continue
            row = json.loads(line)
            total += 1
            row["homepage_clean"] = clean_markdown(row.get("homepage_markdown", ""))
            if row["homepage_clean"]:
                cleaned_count += 1
            fout.write(json.dumps(row, ensure_ascii=False) + "\n")

    print(f"done. rows={total} with_clean_text={cleaned_count}", file=sys.stderr)


if __name__ == "__main__":
    main()
