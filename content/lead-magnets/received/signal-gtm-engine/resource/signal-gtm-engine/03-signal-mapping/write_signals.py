#!/usr/bin/env python3
"""
write_signals.py — Stage 03 · Signal Mapping
Bulk-compute STATIC signal columns over stored account rows.

Reads a JSONL of accounts (one company per line, fields produced by Stages
00–02) and a YAML/JSON list of signal specs (see signals.example.yaml), then
writes a `signal_<name>` field onto each row for every spec whose `method` is
one of: keyword, threshold, geo.

  - keyword   : Method 1 — scan a stored text field for a keyword set
  - threshold : Method 4 — numeric gate over a stored count
  - geo       : Method 3 — allow-set check over a country field

DNS CNAME signals (method: cname) are handled by cname_probe.py.
Social signals (method: social, source: trigify) are captured by the signal
layer and routed in via verify_pattern.py. Two-source `verify:` promotion is
done by verify_pattern.py. This script only computes the proxy values it can
derive from data already on the row.

Each signal value is written as a small dict so evidence + confidence travel
with the boolean:

    "signal_hiring_ai_eng": {
        "value": true,
        "confidence": "proxy",          # proxy until verify_pattern.py confirms
        "method": "keyword",
        "version": "v1",
        "evidence": "...matched snippet...",
        "weight": 0.8
    }

Design:
  - stdlib only (YAML parsed by a tiny built-in loader, or use --specs-json)
  - resumable: writes to a temp file then atomically renames; --resume skips
    rows already carrying every requested signal column
  - defensive: a bad row never kills the run; it's passed through untouched and
    logged to stderr

Usage:
  python3 write_signals.py \
      --in   data/accounts.jsonl \
      --specs 03-signal-mapping/signals.example.yaml \
      --out  data/accounts_signals.jsonl

  # specs as JSON instead of YAML (no third-party YAML dependency):
  python3 write_signals.py --in a.jsonl --specs-json specs.json --out b.jsonl

No API keys required — this stage is pure computation over stored data.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import tempfile


# ── tiny, dependency-free YAML subset loader ─────────────────────────────────
# Supports the subset signals.example.yaml uses: nested maps, "- " list items,
# scalars (str/int/float/bool/null), inline [] empty lists, block lists of
# scalars, and "|"/">" folded blocks. For anything fancier, pass --specs-json.
def load_specs(path: str) -> list[dict]:
    if path.endswith(".json"):
        with open(path, "r", encoding="utf-8") as fh:
            data = json.load(fh)
    else:
        try:
            import yaml  # use PyYAML if the user happens to have it
            with open(path, "r", encoding="utf-8") as fh:
                data = yaml.safe_load(fh)
        except ImportError:
            with open(path, "r", encoding="utf-8") as fh:
                data = _mini_yaml(fh.read())
    if isinstance(data, dict):
        data = data.get("signals", [])
    if not isinstance(data, list):
        raise ValueError("specs file must contain a list of signals (or a top-level 'signals:' list)")
    return data


def _coerce(v: str):
    s = v.strip()
    if s in ("", "~", "null", "None"):
        return None
    if s in ("true", "True"):
        return True
    if s in ("false", "False"):
        return False
    if s == "[]":
        return []
    if (s.startswith('"') and s.endswith('"')) or (s.startswith("'") and s.endswith("'")):
        return s[1:-1]
    try:
        return int(s)
    except ValueError:
        pass
    try:
        return float(s)
    except ValueError:
        pass
    return s


def _mini_yaml(text: str):
    """Minimal YAML→python for the spec template. Best-effort, not a full parser."""
    # strip comments (outside quotes) and blank lines, drop folded-block scalars
    lines = []
    for raw in text.splitlines():
        # remove trailing comments not inside quotes
        out, q = [], None
        for ch in raw:
            if q:
                out.append(ch)
                if ch == q:
                    q = None
            elif ch in "\"'":
                q = ch
                out.append(ch)
            elif ch == "#":
                break
            else:
                out.append(ch)
        line = "".join(out).rstrip()
        if line.strip():
            lines.append(line)

    root: dict = {}
    # stack of (indent, container)
    stack: list[tuple[int, object]] = [(-1, root)]

    def indent_of(s: str) -> int:
        return len(s) - len(s.lstrip(" "))

    i = 0
    while i < len(lines):
        line = lines[i]
        ind = indent_of(line)
        body = line.strip()

        while stack and ind <= stack[-1][0]:
            stack.pop()
        parent = stack[-1][1]

        if body.startswith("- "):
            item_body = body[2:].strip()
            if not isinstance(parent, list):
                # convert: previous key should map to a list
                raise ValueError("list item without a list parent near: " + body)
            if ":" in item_body and not item_body.startswith(("[", '"', "'")):
                d: dict = {}
                parent.append(d)
                k, _, v = item_body.partition(":")
                v = v.strip()
                if v == "":
                    child: list = []
                    d[k.strip()] = child
                    stack.append((ind, d))
                    stack.append((ind + 1, child))  # placeholder; corrected below
                    stack.pop()
                    stack.append((ind, d))
                else:
                    d[k.strip()] = _coerce(v)
                    stack.append((ind, d))
            else:
                parent.append(_coerce(item_body))
            i += 1
            continue

        # "key:" or "key: value"
        k, _, v = body.partition(":")
        k = k.strip()
        v = v.strip()
        if v == "":
            # could be a map or a list; peek next line
            nxt = lines[i + 1] if i + 1 < len(lines) else ""
            child = [] if nxt.strip().startswith("- ") else {}
            if isinstance(parent, dict):
                parent[k] = child
            stack.append((ind, child))
        else:
            if isinstance(parent, dict):
                parent[k] = _coerce(v)
        i += 1

    return root


# ── method implementations ───────────────────────────────────────────────────
def _has_keyword(text: str, kw: str, word_boundary: bool) -> bool:
    if word_boundary:
        return re.search(r"(?<!\w)" + re.escape(kw) + r"(?!\w)", text, re.IGNORECASE) is not None
    return kw.lower() in text.lower()


def eval_keyword(row: dict, params: dict):
    field = params.get("text_field", "")
    text = str(row.get(field, "") or "")
    if not text:
        return False, None
    wb = bool(params.get("word_boundary", True))
    for neg in params.get("keywords_not", []) or []:
        if _has_keyword(text, neg, wb):
            return False, f"negated by '{neg}'"
    for kw in params.get("keywords", []) or []:
        if _has_keyword(text, kw, wb):
            # capture a short evidence snippet around the match
            idx = text.lower().find(kw.lower())
            lo, hi = max(0, idx - 40), idx + len(kw) + 40
            return True, "…" + text[lo:hi].replace("\n", " ").strip() + "…"
    return False, None


def eval_threshold(row: dict, params: dict):
    field = params.get("number_field", "")
    raw = row.get(field)
    try:
        n = float(raw)
    except (TypeError, ValueError):
        return False, None  # missing number → cannot assert; treat as not-fired
    op = params.get("op", ">=")
    if op == "between":
        lo, hi = params.get("min"), params.get("max")
        ok = (lo is None or n >= lo) and (hi is None or n <= hi)
    else:
        val = params.get("value")
        ok = {
            ">=": n >= val, ">": n > val,
            "<=": n <= val, "<": n < val,
            "==": n == val,
        }.get(op, False)
    evidence = raw if params.get("keep_raw") else None
    return bool(ok), evidence


def eval_geo(row: dict, params: dict):
    field = params.get("country_field", "")
    val = str(row.get(field, "") or "").strip()
    allow = {str(a).strip().lower() for a in (params.get("allow") or [])}
    ok = val.lower() in allow if val else False
    return ok, (val or None)


EVALUATORS = {"keyword": eval_keyword, "threshold": eval_threshold, "geo": eval_geo}
HANDLED_METHODS = set(EVALUATORS)  # cname/social/two_source handled by sibling scripts


# ── main ─────────────────────────────────────────────────────────────────────
def signal_col(spec: dict) -> str:
    return "signal_" + spec["name"]


def apply_specs(row: dict, specs: list[dict]) -> dict:
    for spec in specs:
        method = spec.get("method")
        if method not in HANDLED_METHODS:
            continue  # cname → cname_probe.py · social/two_source → verify_pattern.py
        col = signal_col(spec)
        try:
            fired, evidence = EVALUATORS[method](row, spec.get("params", {}) or {})
        except Exception as exc:  # never let one spec kill the row
            sys.stderr.write(f"[warn] spec {col} failed on row "
                             f"{row.get('domain') or row.get('company_name')}: {exc}\n")
            continue
        row[col] = {
            "value": bool(fired),
            # proxy until a second source confirms (verify_pattern.py).
            # A spec with no `verify:` stays 'proxy' by design — weight it lower.
            "confidence": "proxy",
            "method": method,
            "version": spec.get("version", "v1"),
            "evidence": evidence,
            "weight": spec.get("weight", 0.5),
        }
    return row


def row_complete(row: dict, cols: list[str]) -> bool:
    return all(c in row for c in cols)


def main() -> int:
    ap = argparse.ArgumentParser(description="Compute static signal columns over stored accounts.")
    ap.add_argument("--in", dest="infile", required=True, help="input accounts JSONL")
    ap.add_argument("--out", dest="outfile", required=True, help="output accounts JSONL")
    grp = ap.add_mutually_exclusive_group(required=True)
    grp.add_argument("--specs", help="signal specs YAML (or .json)")
    grp.add_argument("--specs-json", help="signal specs JSON")
    ap.add_argument("--resume", action="store_true",
                    help="skip rows already carrying every requested signal column")
    args = ap.parse_args()

    specs = load_specs(args.specs or args.specs_json)
    applied = [s for s in specs if s.get("method") in HANDLED_METHODS]
    cols = [signal_col(s) for s in applied]
    sys.stderr.write(f"[info] {len(applied)} computable specs: {', '.join(cols) or '(none)'}\n")
    skipped_methods = sorted({s.get("method") for s in specs if s.get("method") not in HANDLED_METHODS})
    if skipped_methods:
        sys.stderr.write(f"[info] deferred to sibling scripts: {', '.join(skipped_methods)} "
                         f"(cname→cname_probe.py · social/two_source→verify_pattern.py)\n")

    # write to temp then atomic rename → safe for in-place out == in
    out_dir = os.path.dirname(os.path.abspath(args.outfile)) or "."
    os.makedirs(out_dir, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=out_dir, suffix=".tmp")
    n_in = n_changed = 0
    try:
        with open(args.infile, "r", encoding="utf-8") as fin, os.fdopen(fd, "w", encoding="utf-8") as fout:
            for line in fin:
                line = line.strip()
                if not line:
                    continue
                n_in += 1
                try:
                    row = json.loads(line)
                except json.JSONDecodeError:
                    sys.stderr.write(f"[warn] bad JSON on line {n_in}; passing through\n")
                    fout.write(line + "\n")
                    continue
                if args.resume and row_complete(row, cols):
                    fout.write(json.dumps(row, ensure_ascii=False) + "\n")
                    continue
                apply_specs(row, applied)
                n_changed += 1
                fout.write(json.dumps(row, ensure_ascii=False) + "\n")
        os.replace(tmp, args.outfile)
    except BaseException:
        if os.path.exists(tmp):
            os.remove(tmp)
        raise

    sys.stderr.write(f"[done] {n_in} rows in · {n_changed} computed · → {args.outfile}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
