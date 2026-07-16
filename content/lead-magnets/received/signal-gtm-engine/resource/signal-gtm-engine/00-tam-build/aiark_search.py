#!/usr/bin/env python3
"""
Stage 00 — TAM build · AI Ark company-data template.

AI Ark (docs.ai-ark.com) is a 70M+ company / 500M+ people B2B data API refreshed
~monthly. We use it as an INDEPENDENT second/third company source for coverage —
a different database than Prospeo/Blitz, so it catches accounts they miss (and
vice versa). Union + dedupe makes the overlap free.

Strategy: loop the overlapping FINE headcount bands from filters.yaml as
`employeeSize.range` entries, optionally constrained by location + keywords,
page each band to exhaustion (zero-based `page`, `size` up to 100), and append
normalized company rows to data/companies_raw.jsonl.

Resumable: checkpoint at data/.aiark.ckpt.json records the last (band, page).

Auth: reads AI_ARK_API_KEY from the environment (never hardcode a key).
Endpoint: POST https://api.ai-ark.com/api/developer-portal/v1/companies
Header:   X-TOKEN: <key>   ·   Content-Type: application/json
Limits:   5 req/s · 300/min · 18,000/hr.

stdlib + requests only.
"""
import argparse
import json
import os
import sys
import time
from urllib.parse import urlparse

import requests

BASE = "https://api.ai-ark.com/api/developer-portal"
COMPANIES_URL = f"{BASE}/v1/companies"
MAX_SIZE = 100           # AI Ark page size cap
SOURCE = "aiark"


# ── shared filters loader + domain normalizer (identical across the 3 scripts) ─
def load_filters(path: str) -> dict:
    with open(path) as fh:
        text = fh.read()
    try:
        import yaml
        return yaml.safe_load(text)
    except Exception:
        return _mini_yaml(text)


def _coerce(v: str):
    v = v.strip()
    if v == "[]":
        return []
    if v == "":
        return None
    if v.lower() == "true":
        return True
    if v.lower() == "false":
        return False
    if (v[0] in "'\"") and v[-1] == v[0]:
        return v[1:-1]
    try:
        return int(v)
    except ValueError:
        pass
    try:
        return float(v)
    except ValueError:
        return v


def _flow_map(s: str) -> dict:
    out = {}
    for pair in s.strip().strip("{}").split(","):
        if ":" in pair:
            k, val = pair.split(":", 1)
            out[k.strip()] = _coerce(val)
    return out


def _strip_comment(line: str) -> str:
    return line.split(" #", 1)[0] if " #" in line else line


def _mini_yaml(text: str) -> dict:
    root: dict = {}
    stack = [{"indent": -1, "container": root}]
    for raw in text.splitlines():
        line = _strip_comment(raw).rstrip()
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        indent = len(line) - len(line.lstrip())
        body = line.strip()
        while len(stack) > 1 and indent <= stack[-1]["indent"]:
            stack.pop()
        scope = stack[-1]
        container = scope["container"]
        if body.startswith("- "):
            item = body[2:].strip()
            if isinstance(container, dict):
                if not container:
                    parent, pkey = scope["parent_container"], scope["parent_key"]
                    parent[pkey] = []
                    container = parent[pkey]
                    scope["container"] = container
                else:
                    continue
            container.append(_flow_map(item) if item.startswith("{") else _coerce(item))
            continue
        if ":" in body:
            key, val = body.split(":", 1)
            key, val = key.strip(), val.strip()
            if not isinstance(container, dict):
                continue
            if val == "":
                placeholder: dict = {}
                container[key] = placeholder
                stack.append({"indent": indent, "container": placeholder,
                              "parent_container": container, "parent_key": key})
            else:
                container[key] = _coerce(val)
    return _normalize_empty_maps(root)


def _normalize_empty_maps(node):
    if isinstance(node, dict):
        for k, v in list(node.items()):
            if isinstance(v, dict) and not v:
                node[k] = []
            else:
                node[k] = _normalize_empty_maps(v)
    return node


def normalize_domain(raw: str):
    if not raw:
        return None
    raw = raw.strip().lower()
    if "://" not in raw:
        raw = "http://" + raw
    host = urlparse(raw).netloc or urlparse(raw).path
    host = host.split("/")[0].split("@")[-1].split(":")[0]
    if host.startswith("www."):
        host = host[4:]
    return host or None
# ── end shared block ─────────────────────────────────────────────────────────


def load_ckpt(path: str) -> dict:
    if os.path.exists(path):
        with open(path) as fh:
            return json.load(fh)
    return {"done_bands": [], "band_page": {}}


def save_ckpt(path: str, ckpt: dict) -> None:
    tmp = path + ".tmp"
    with open(tmp, "w") as fh:
        json.dump(ckpt, fh)
    os.replace(tmp, path)


def build_account(band, geos, keywords, industries):
    """Map neutral config -> AI Ark `account` filter object. Headcount band as an
    employeeSize range; location + keyword as optional constraints."""
    account: dict = {
        "employeeSize": {
            "type": "RANGE",
            "range": [{"start": int(band["min"]), "end": int(band["max"])}],
        }
    }
    if geos:
        account["location"] = {"any": {"include": geos}}
    if keywords:
        # keyword search over company NAME + SUMMARY sources (SMART matching)
        account["keyword"] = {
            "any": {
                "include": {
                    "sources": [
                        {"mode": "SMART", "source": "NAME"},
                        {"mode": "SMART", "source": "SUMMARY"},
                    ],
                    "content": [k for k in keywords if isinstance(k, str)],
                }
            }
        }
    if industries:                          # default OFF per stage rule
        account["industries"] = {
            "any": {"include": {"mode": "WORD", "content": industries}}
        }
    return account


def _dig(d, *path, default=None):
    cur = d
    for p in path:
        if not isinstance(cur, dict):
            return default
        cur = cur.get(p)
        if cur is None:
            return default
    return cur


def to_row(c: dict) -> dict:
    """Pull our 7 columns out of an AI Ark company result object."""
    domain = normalize_domain(_dig(c, "link", "domain")
                              or _dig(c, "link", "website") or "")
    staff_total = _dig(c, "summary", "staff", "total")
    if staff_total is None:
        rng = _dig(c, "summary", "staff", "range") or {}
        if rng.get("start") is not None:
            staff_total = f'{rng.get("start")}-{rng.get("end")}'
    return {
        "company_name": _dig(c, "summary", "name") or _dig(c, "summary", "legal_name"),
        "domain": domain,
        "linkedin_url": _dig(c, "link", "linkedin"),
        "headcount": staff_total,
        "industry": _dig(c, "summary", "industry"),
        "description": (_dig(c, "summary", "description")
                        or _dig(c, "summary", "about")
                        or c.get("description")),
        "source": SOURCE,
    }


def post_with_retry(session, payload, headers, sleep_s, max_retries):
    for attempt in range(max_retries):
        try:
            r = session.post(COMPANIES_URL, json=payload, headers=headers, timeout=60)
        except requests.RequestException as e:
            wait = sleep_s * (2 ** attempt)
            print(f"  ! network error ({e}); retry in {wait:.0f}s", file=sys.stderr)
            time.sleep(wait)
            continue
        if r.status_code == 429 or r.status_code >= 500:
            wait = sleep_s * (2 ** attempt) + 1
            print(f"  ! {r.status_code}; backing off {wait:.0f}s", file=sys.stderr)
            time.sleep(wait)
            continue
        return r
    return None


def main():
    ap = argparse.ArgumentParser(description="AI Ark TAM company-data pull")
    ap.add_argument("--filters", default="filters.yaml")
    ap.add_argument("--out", default="data/companies_raw.jsonl")
    args = ap.parse_args()

    api_key = os.environ.get("AI_ARK_API_KEY")
    if not api_key:
        sys.exit("ERROR: set AI_ARK_API_KEY in your environment (see ../.env.example)")

    cfg = load_filters(args.filters)
    bands = cfg.get("headcount_bands") or []
    if not bands:
        sys.exit("ERROR: no headcount_bands in filters file. See filters.example.yaml")
    geos = cfg.get("geos") or []
    keywords = cfg.get("keywords") or []
    industries = cfg.get("industries") or []
    run = cfg.get("run") or {}
    size = min(int(run.get("page_size", MAX_SIZE)), MAX_SIZE)
    sleep_s = float(run.get("request_sleep_seconds", 1.1))
    max_retries = int(run.get("max_retries", 5))
    max_pages = int(run.get("max_pages_per_band", 1000))

    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
    ckpt_path = os.path.join(os.path.dirname(args.out) or ".", ".aiark.ckpt.json")
    ckpt = load_ckpt(ckpt_path)

    headers = {"X-TOKEN": api_key, "Content-Type": "application/json"}
    session = requests.Session()
    seen = set()
    total_written = 0

    with open(args.out, "a") as out:
        for band in bands:
            band_id = f"{band['min']}-{band['max']}"
            if band_id in ckpt["done_bands"]:
                print(f"[skip] band {band_id} done")
                continue
            account = build_account(band, geos, keywords, industries)
            page = int(ckpt["band_page"].get(band_id, 0))   # AI Ark is zero-based
            print(f"[band {band_id}] starting at page {page}")
            pages_done = 0
            while pages_done < max_pages:
                payload = {"page": page, "size": size, "account": account}
                r = post_with_retry(session, payload, headers, sleep_s, max_retries)
                if r is None:
                    print(f"  ! giving up on band {band_id}", file=sys.stderr)
                    break
                if r.status_code >= 400:
                    print(f"  ! HTTP {r.status_code}: {r.text[:200]}", file=sys.stderr)
                    break
                data = r.json()
                results = data.get("content", [])
                if not results:
                    break
                for c in results:
                    row = to_row(c)
                    if not row["domain"] or row["domain"] in seen:
                        continue
                    seen.add(row["domain"])
                    out.write(json.dumps(row, ensure_ascii=False) + "\n")
                    total_written += 1
                out.flush()
                total_pages = data.get("totalPages", page + 1)
                print(f"  band {band_id}: page {page}/{max(total_pages-1,0)} "
                      f"(+{len(results)} rows, {total_written} total)")
                page += 1
                pages_done += 1
                ckpt["band_page"][band_id] = page
                save_ckpt(ckpt_path, ckpt)
                if page >= total_pages:
                    break
                time.sleep(sleep_s)
            ckpt["done_bands"].append(band_id)
            ckpt["band_page"].pop(band_id, None)
            save_ckpt(ckpt_path, ckpt)

    print(f"\nDONE. Wrote {total_written} new AI Ark rows -> {args.out}")
    print("Next: union with other sources + dedupe on normalized domain (see README).")


if __name__ == "__main__":
    main()
