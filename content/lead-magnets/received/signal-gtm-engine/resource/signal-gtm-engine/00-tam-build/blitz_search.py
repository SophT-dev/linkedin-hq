#!/usr/bin/env python3
"""
Stage 00 — TAM build · Blitz company/employee template.

Blitz is a company + employee directory. Its `Find People`
(POST /v2/search/people) searches across MANY companies in one call and returns
the employer `company` object alongside each person — so we can derive an ACCOUNT
universe from a people-first pull. This is the path to reach when your ICP is
defined more by the PEOPLE a company employs (e.g. "has a Head of <x>") than by
pure firmographics.

We loop the same overlapping headcount bands from filters.yaml, mapped onto
Blitz's `employee_range` enum buckets, optionally filtered by department/function
and geo, page each combination to exhaustion, and append normalized COMPANY rows
to data/companies_raw.jsonl (deduped by domain within this run; full cross-source
dedupe happens later — see README).

Resumable: checkpoint at data/.blitz.ckpt.json records the last (band, page).

Auth: reads BLITZ_API_KEY from the environment (never hardcode a key).
Docs: https://api.blitz-api.ai  (header x-api-key, POST JSON)

stdlib + requests only.
"""
import argparse
import json
import os
import sys
import time
from urllib.parse import urlparse

import requests

PEOPLE_URL = "https://api.blitz-api.ai/v2/search/people"
MAX_RESULTS = 50         # Blitz Find People page size cap
SOURCE = "blitz"

# Blitz exposes employee_range as enum buckets, not arbitrary ranges. We map each
# numeric band from filters.yaml onto every Blitz bucket it overlaps. Overlap is
# fine — dedupe collapses it. TODO: confirm the exact bucket strings your Blitz
# plan accepts (check the dashboard / key-info); adjust this ladder if they differ.
BLITZ_BUCKETS = [
    (1, 10, "1-10"), (11, 50, "11-50"), (51, 200, "51-200"),
    (201, 500, "201-500"), (501, 1000, "501-1000"), (1001, 5000, "1001-5000"),
    (5001, 10000, "5001-10000"), (10001, 10_000_000, "10001+"),
]


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
    return {"done_buckets": [], "bucket_cursor": {}}


def save_ckpt(path: str, ckpt: dict) -> None:
    tmp = path + ".tmp"
    with open(tmp, "w") as fh:
        json.dump(ckpt, fh)
    os.replace(tmp, path)


def buckets_for_bands(bands: list) -> list:
    """Collapse the numeric overlapping bands onto the unique Blitz enum buckets
    they touch. We pull each touched bucket once (deduped by domain)."""
    touched = []
    for band in bands:
        lo, hi = int(band["min"]), int(band["max"])
        for b_lo, b_hi, label in BLITZ_BUCKETS:
            if lo <= b_hi and hi >= b_lo and label not in touched:
                touched.append(label)
    return touched


def build_payload(bucket_label, departments, country_codes, keywords, industries):
    """Map neutral config -> Blitz Find People request body. Account filters draw
    the firmographic box; people filters target the buyer department/function."""
    company: dict = {"employee_range": [bucket_label]}
    if country_codes:
        company["hq"] = {"country_code": country_codes}
    if keywords:
        company["keywords"] = [k for k in keywords if isinstance(k, str)]
    if industries:                        # default OFF per stage rule
        company["industry"] = {"include": industries}
    people: dict = {}
    if departments:
        # Blitz uses job_function/job_level enums; pass departments as functions.
        # TODO: confirm exact job_function strings your plan accepts.
        people["job_function"] = departments
    if country_codes:
        people["location"] = {"country_code": country_codes}
    body = {"company": company, "max_results": MAX_RESULTS}
    if people:
        body["people"] = people
    return body


def to_row(company: dict) -> dict:
    """Pull our 7 columns out of a Blitz company object."""
    domain = normalize_domain(company.get("domain") or company.get("website") or "")
    return {
        "company_name": company.get("name"),
        "domain": domain,
        "linkedin_url": company.get("linkedin_url") or company.get("company_linkedin_url"),
        "headcount": (company.get("employees_on_linkedin")
                      or company.get("employee_count")
                      or company.get("size")),
        "industry": company.get("industry"),
        "description": company.get("description") or company.get("about"),
        "source": SOURCE,
    }


def post_with_retry(session, payload, headers, sleep_s, max_retries):
    for attempt in range(max_retries):
        try:
            r = session.post(PEOPLE_URL, json=payload, headers=headers, timeout=60)
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
    ap = argparse.ArgumentParser(description="Blitz TAM company pull (people-first)")
    ap.add_argument("--filters", default="filters.yaml")
    ap.add_argument("--out", default="data/companies_raw.jsonl")
    args = ap.parse_args()

    api_key = os.environ.get("BLITZ_API_KEY")
    if not api_key:
        sys.exit("ERROR: set BLITZ_API_KEY in your environment (see ../.env.example)")

    cfg = load_filters(args.filters)
    bands = cfg.get("headcount_bands") or []
    if not bands:
        sys.exit("ERROR: no headcount_bands in filters file. See filters.example.yaml")
    departments = cfg.get("departments") or []
    country_codes = cfg.get("geo_country_codes") or []
    keywords = cfg.get("keywords") or []
    industries = cfg.get("industries") or []
    run = cfg.get("run") or {}
    sleep_s = float(run.get("request_sleep_seconds", 1.1))
    max_retries = int(run.get("max_retries", 5))
    max_pages = int(run.get("max_pages_per_band", 1000))

    buckets = buckets_for_bands(bands)
    print(f"Blitz buckets to pull: {buckets}")

    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
    ckpt_path = os.path.join(os.path.dirname(args.out) or ".", ".blitz.ckpt.json")
    ckpt = load_ckpt(ckpt_path)

    headers = {"x-api-key": api_key, "Content-Type": "application/json"}
    session = requests.Session()
    seen = set()
    total_written = 0

    with open(args.out, "a") as out:
        for label in buckets:
            if label in ckpt["done_buckets"]:
                print(f"[skip] bucket {label} done")
                continue
            payload = build_payload(label, departments, country_codes, keywords, industries)
            cursor = ckpt["bucket_cursor"].get(label)
            payload["cursor"] = cursor
            print(f"[bucket {label}] starting (cursor={cursor})")
            pages = 0
            while pages < max_pages:
                r = post_with_retry(session, payload, headers, sleep_s, max_retries)
                if r is None:
                    print(f"  ! giving up on bucket {label}", file=sys.stderr)
                    break
                if r.status_code >= 400:
                    print(f"  ! HTTP {r.status_code}: {r.text[:200]}", file=sys.stderr)
                    break
                data = r.json()
                results = data.get("results", [])
                if not results:
                    break
                for item in results:
                    company = item.get("company") or item.get("current_company") or {}
                    if not company:
                        continue
                    row = to_row(company)
                    if not row["domain"] or row["domain"] in seen:
                        continue
                    seen.add(row["domain"])
                    out.write(json.dumps(row, ensure_ascii=False) + "\n")
                    total_written += 1
                out.flush()
                pages += 1
                print(f"  bucket {label}: page {pages} (+{len(results)} people, "
                      f"{total_written} companies total)")
                cursor = data.get("cursor") or data.get("next_cursor")
                ckpt["bucket_cursor"][label] = cursor
                save_ckpt(ckpt_path, ckpt)
                if not cursor:
                    break
                payload["cursor"] = cursor
                time.sleep(sleep_s)
            ckpt["done_buckets"].append(label)
            ckpt["bucket_cursor"].pop(label, None)
            save_ckpt(ckpt_path, ckpt)

    print(f"\nDONE. Wrote {total_written} new Blitz company rows -> {args.out}")
    print("Next: union with other sources + dedupe on normalized domain (see README).")


if __name__ == "__main__":
    main()
