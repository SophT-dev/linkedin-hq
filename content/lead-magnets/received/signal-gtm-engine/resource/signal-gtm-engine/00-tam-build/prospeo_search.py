#!/usr/bin/env python3
"""
Stage 00 — TAM build · Prospeo company-search template.

Builds an account universe by looping OVERLAPPING FINE headcount bands (and,
optionally, geos) from filters.yaml, paging each band to exhaustion, and
appending normalized company rows to data/companies_raw.jsonl.

Why bands: a single broad filter set is capped at 25,000 rows by Prospeo
(1000 pages x 25). Narrow bands each fit under the cap, so you actually page the
whole band. UNION + DEDUPE (see README dedupe.py) collapses the overlap for free.

Resumable: a checkpoint file (data/.prospeo.ckpt.json) records the last completed
(band, page). Re-run the same command after a crash/rate-limit to continue.

Auth: reads PROSPEO_API_KEY from the environment (never hardcode a key).
Docs: https://prospeo.io/api-docs/search-company  (header X-KEY, POST JSON)

stdlib + requests only.
"""
import argparse
import json
import os
import sys
import time
from urllib.parse import urlparse

import requests

API_URL = "https://api.prospeo.io/search-company"
PER_PAGE = 25            # Prospeo fixed page size
HARD_PAGE_CAP = 1000     # Prospeo hard cap (1000 * 25 = 25,000 rows / filter set)
SOURCE = "prospeo"


# ── tiny dependency-free filters loader ──────────────────────────────────────
# Uses PyYAML if installed; otherwise a small indentation-based parser that
# covers exactly the shapes in filters.example.yaml: top-level scalars, lists of
# scalars (`- foo`), lists of inline flow maps (`- { min: 1, max: 2 }`), and
# one level of nested mappings (`run:` block of `key: value`). Keep filters.yaml
# within these shapes, or `pip install pyyaml` for full YAML.
def load_filters(path: str) -> dict:
    with open(path) as fh:
        text = fh.read()
    try:
        import yaml  # optional, preferred
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
    # drop trailing ` # ...` comments but not `#` inside quotes (config has none)
    if " #" in line:
        return line.split(" #", 1)[0]
    return line


def _mini_yaml(text: str) -> dict:
    root: dict = {}
    # Each scope is (indent_of_children, key_in_parent_or_None, container_ref).
    # container_ref is the dict OR list that lines at indent > its level fill.
    # We resolve a `key:` with empty value lazily: its container becomes a list
    # the moment a `- ` child appears, else stays a dict for `key: value` children.
    stack = [{"indent": -1, "container": root}]

    for raw in text.splitlines():
        line = _strip_comment(raw).rstrip()
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        indent = len(line) - len(line.lstrip())
        body = line.strip()

        # pop scopes whose children are more-indented than this line
        while len(stack) > 1 and indent <= stack[-1]["indent"]:
            stack.pop()
        scope = stack[-1]
        container = scope["container"]

        if body.startswith("- "):
            item = body[2:].strip()
            # this scope's container must be a list — convert if it was opened
            # as an empty dict placeholder for an unknown block type
            if isinstance(container, dict):
                if not container:               # empty placeholder -> make a list
                    parent = scope["parent_container"]
                    pkey = scope["parent_key"]
                    parent[pkey] = []
                    container = parent[pkey]
                    scope["container"] = container
                else:
                    continue                    # malformed; skip
            container.append(_flow_map(item) if item.startswith("{")
                             else _coerce(item))
            continue

        if ":" in body:
            key, val = body.split(":", 1)
            key, val = key.strip(), val.strip()
            if not isinstance(container, dict):
                continue
            if val == "":
                placeholder: dict = {}          # block of unknown type (list/map)
                container[key] = placeholder
                stack.append({"indent": indent, "container": placeholder,
                              "parent_container": container, "parent_key": key})
            else:
                container[key] = _coerce(val)
    return _normalize_empty_maps(root)


def _normalize_empty_maps(node):
    """Block placeholders that never received children stay empty dicts; treat
    them as empty lists (matches blank `key:`-style optional list fields)."""
    if isinstance(node, dict):
        for k, v in list(node.items()):
            if isinstance(v, dict) and not v:
                node[k] = []
            else:
                node[k] = _normalize_empty_maps(v)
    return node


# ── domain normalization (the engine's join key) ─────────────────────────────
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


# ── checkpoint (resume) ──────────────────────────────────────────────────────
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


# ── build a Prospeo filter payload for one band ──────────────────────────────
def build_filters(band: dict, geos: list, keywords: list, kw_all: bool,
                  industries: list) -> dict:
    """Map neutral config -> Prospeo `filters` object. Headcount + geo (+kw)."""
    filters: dict = {
        # custom range lets us use arbitrary overlapping band edges
        "company_headcount_custom": {"min": int(band["min"]), "max": int(band["max"])},
    }
    if geos:
        filters["company_location_search"] = {"include": geos}
    if keywords:
        # NOTE: a search may NOT be exclude-only; include must be non-empty.
        filters["company_keywords"] = {
            "include": [k for k in keywords if isinstance(k, str)][:20],
            "include_all": bool(kw_all),
            "search_everywhere": True,
        }
    if industries:  # default OFF per stage rule; honored only if user sets it
        filters["company_industry"] = {"include": industries}
    return filters


# ── extract our 7 output columns from a Prospeo company object ────────────────
def to_row(company: dict) -> dict:
    domain = normalize_domain(company.get("domain") or company.get("website") or "")
    return {
        "company_name": company.get("name"),
        "domain": domain,
        "linkedin_url": company.get("linkedin_url"),
        "headcount": company.get("employee_count") or company.get("employee_range"),
        "industry": company.get("industry"),
        "description": (company.get("description")
                        or company.get("description_ai")
                        or company.get("description_seo")),
        "source": SOURCE,
    }


def post_with_retry(session, payload, headers, sleep_s, max_retries):
    for attempt in range(max_retries):
        try:
            r = session.post(API_URL, json=payload, headers=headers, timeout=60)
        except requests.RequestException as e:
            wait = sleep_s * (2 ** attempt)
            print(f"  ! network error ({e}); retrying in {wait:.0f}s", file=sys.stderr)
            time.sleep(wait)
            continue
        if r.status_code == 429:
            wait = sleep_s * (2 ** attempt) + 1
            print(f"  ! 429 rate limit; backing off {wait:.0f}s", file=sys.stderr)
            time.sleep(wait)
            continue
        if r.status_code >= 500:
            wait = sleep_s * (2 ** attempt)
            print(f"  ! {r.status_code}; retrying in {wait:.0f}s", file=sys.stderr)
            time.sleep(wait)
            continue
        return r
    return None


def main():
    ap = argparse.ArgumentParser(description="Prospeo TAM company-search pull")
    ap.add_argument("--filters", default="filters.yaml")
    ap.add_argument("--out", default="data/companies_raw.jsonl")
    args = ap.parse_args()

    api_key = os.environ.get("PROSPEO_API_KEY")
    if not api_key:
        sys.exit("ERROR: set PROSPEO_API_KEY in your environment (see ../.env.example)")

    cfg = load_filters(args.filters)
    bands = cfg.get("headcount_bands") or []
    geos = cfg.get("geos") or []
    keywords = cfg.get("keywords") or []
    kw_all = bool(cfg.get("keywords_match_all", False))
    industries = cfg.get("industries") or []      # default [] -> off
    run = cfg.get("run") or {}
    max_pages = min(int(run.get("max_pages_per_band", HARD_PAGE_CAP)), HARD_PAGE_CAP)
    sleep_s = float(run.get("request_sleep_seconds", 1.1))
    max_retries = int(run.get("max_retries", 5))

    if not bands:
        sys.exit("ERROR: no headcount_bands in filters file. See filters.example.yaml")

    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
    ckpt_path = os.path.join(os.path.dirname(args.out) or ".", ".prospeo.ckpt.json")
    ckpt = load_ckpt(ckpt_path)

    headers = {"X-KEY": api_key, "Content-Type": "application/json"}
    session = requests.Session()
    seen_this_run = set()
    total_written = 0

    with open(args.out, "a") as out:
        for band in bands:
            band_id = f"{band['min']}-{band['max']}"
            if band_id in ckpt["done_bands"]:
                print(f"[skip] band {band_id} already complete")
                continue
            filters = build_filters(band, geos, keywords, kw_all, industries)
            start_page = int(ckpt["band_page"].get(band_id, 1))
            print(f"[band {band_id}] starting at page {start_page}")
            page = start_page
            while page <= max_pages:
                payload = {"page": page, "filters": filters}
                r = post_with_retry(session, payload, headers, sleep_s, max_retries)
                if r is None:
                    print(f"  ! giving up on band {band_id} page {page}", file=sys.stderr)
                    break
                data = r.json()
                if data.get("error"):
                    code = data.get("error_code")
                    if code == "NO_RESULTS":
                        print(f"  band {band_id}: no (more) results at page {page}")
                    else:
                        print(f"  ! API error {code}: {data.get('filter_error')}",
                              file=sys.stderr)
                    break
                results = data.get("results", [])
                if not results:
                    break
                for item in results:
                    company = item.get("company", item)
                    row = to_row(company)
                    if not row["domain"] or row["domain"] in seen_this_run:
                        continue
                    seen_this_run.add(row["domain"])
                    out.write(json.dumps(row, ensure_ascii=False) + "\n")
                    total_written += 1
                out.flush()
                pg = data.get("pagination", {})
                total_page = pg.get("total_page", page)
                print(f"  band {band_id}: page {page}/{total_page} "
                      f"(+{len(results)} rows, {total_written} total)")
                ckpt["band_page"][band_id] = page + 1
                save_ckpt(ckpt_path, ckpt)
                if page >= total_page:
                    break
                page += 1
                time.sleep(sleep_s)
            ckpt["done_bands"].append(band_id)
            ckpt["band_page"].pop(band_id, None)
            save_ckpt(ckpt_path, ckpt)

    print(f"\nDONE. Wrote {total_written} new Prospeo rows -> {args.out}")
    print("Next: union with other sources + dedupe on normalized domain (see README).")


if __name__ == "__main__":
    main()
