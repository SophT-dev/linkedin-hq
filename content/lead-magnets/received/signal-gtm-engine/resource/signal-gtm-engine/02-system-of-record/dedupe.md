# Dedup & Identity Resolution

> The whole engine works because the same company is only ever worked **once**.
> That guarantee lives here: how a raw company record collapses to a single
> stable key, and how parent/subsidiary relationships are resolved.

The dedup key is the **normalized root domain**. It is the PRIMARY KEY on
`Company` and the FK on `People` (`company_domain`). Get normalization right and
the rest of the loop — qualification, signal capture, scoring, outreach status —
all lands on one row per real-world company.

---

## 1. Why the domain is the key (not the name)

Company **names** are unstable across sources:

| Source A          | Source B            | Source C        |
|-------------------|---------------------|-----------------|
| `Acme, Inc.`      | `Acme Incorporated` | `ACME`          |
| `Acme Corp`       | `acme`              | `Acme (US)`     |

All five are the same company. Deduping on the name would create five rows.
Their **domain** does not drift the same way:

```
acme.com   acme.com   acme.com   acme.com   acme.com   →  ONE row
```

So: never dedup or join on `company_name`. Always resolve to `domain` first,
then carry the best name onto that row.

---

## 2. Domain normalization (the exact rules)

Apply these in order. The output is what goes into `Company.domain`.

1. **Lowercase** the whole string.
   `ACME.COM` → `acme.com`
2. **Strip the scheme.** Remove `http://` / `https://`.
   `https://acme.com` → `acme.com`
3. **Strip `www.`** and other generic host prefixes (`www2.`, `m.`).
   `www.acme.com` → `acme.com`
4. **Strip path, query, fragment, and trailing slash.** Keep only the host.
   `acme.com/products?ref=x` → `acme.com`
5. **Strip a port** if present. `acme.com:443` → `acme.com`
6. **Drop the leading `@`** if a value arrived as an email-style handle.
   `@acme.com` → `acme.com`
7. **Reduce to the registrable root domain** (eTLD+1) so subdomains collapse:
   `careers.acme.com` → `acme.com`, `blog.acme.co.uk` → `acme.co.uk`.
   Use a public-suffix-list-aware step for multi-part TLDs (`.co.uk`, `.com.au`)
   so you don't over-trim to `co.uk`.

### Reference implementation (stdlib, drop-in)

```python
import re
from urllib.parse import urlparse

# TODO: customize — for multi-part TLDs (.co.uk, .com.au, .gov.in) use a
# public-suffix list (e.g. the `tldextract` package) instead of this naive
# 2-label fallback. Stdlib-only version below is correct for plain .com/.io/etc.
def normalize_domain(raw: str) -> str | None:
    if not raw:
        return None
    s = raw.strip().lower()
    s = s.lstrip("@")
    if "://" not in s:
        s = "//" + s                      # let urlparse find the host
    host = urlparse(s).netloc or urlparse(s).path
    host = host.split("/")[0].split(":")[0]   # drop path + port
    host = re.sub(r"^(www\d?|m)\.", "", host)  # strip www / www2 / m
    if not host or "." not in host:
        return None
    labels = host.split(".")
    # naive eTLD+1: keep last 2 labels. Replace with tldextract for .co.uk etc.
    return ".".join(labels[-2:])
```

### Edge cases — handle explicitly

- **No website / domain missing.** Do NOT invent one. Park the record in
  `Company_Parked` with `park_reason = 'missing-firmographics'` (no domain →
  can't be keyed → can't be deduped). Resolve the domain later, then promote.
- **Shared-platform domains.** A company whose only "site" is a Linktree /
  Wix / Shopify-subdomain / `sites.google.com` page is not uniquely keyable on
  that host. Park it and find the real domain.
- **Free-mail domains** as a company domain (`gmail.com`, `outlook.com`,
  `qq.com`) are never a company key. Reject the row or park it for manual fix —
  keep a small denylist and check against it before insert.
- **Country variants of one brand** (`acme.com`, `acme.de`, `acme.fr`).
  These are usually the SAME company. Pick the primary (typically `.com` or the
  HQ-country TLD) as the canonical `domain`; record the others as subsidiaries /
  brands pointing at it via `parent_domain` (see §4). Don't silently merge — you
  may genuinely want to work a regional entity separately.

---

## 3. The insert decision (where does a new record go?)

Before inserting any company, normalize its domain, then check, in this order:

```
normalize → domain
  │
  ├─ domain is NULL/garbage ───────────────► Company_Parked (missing-firmographics)
  │
  ├─ domain in Company_Not_ICP ────────────► SKIP (already ruled out — do not re-qualify)
  │
  ├─ domain already in Company ────────────► UPSERT (merge new fields onto the
  │                                            existing row; bump updated_at;
  │                                            increment signal_count if a NEW
  │                                            signal arrived)
  │
  └─ brand-new domain ─────────────────────► INSERT into Company (source = this path)
```

This is exactly what the loader's upsert (`Prefer: resolution=merge-duplicates`
on the `domain` conflict key) gives you for the in-`Company` case. The
`Not_ICP` / `Parked` checks happen **before** you hand rows to the loader — run
them as a pre-filter so you never POST a known reject.

> **Idempotency contract:** running the same input through the loader twice must
> leave the DB identical to running it once. Upsert-on-domain guarantees this.

---

## 4. Parent / subsidiary resolution

Big targets own brands and regional entities. You must decide whether the
**parent** or the **subsidiary** is the unit of work — and record the link
either way so a signal on one is visible against the other.

### Columns
- `Company.parent_domain` — the parent's normalized domain (NULL if it is the top).
- `Company.is_subsidiary` — `TRUE` for the child/brand row.

### Rule of thumb
- **Sell to the operating entity that has the budget and the signal.**
  If your buyer persona and the buying signal live inside the subsidiary, keep
  the subsidiary as its own `Company` row and set `parent_domain` to the parent.
- If you sell at the group level (one master agreement covers all brands), keep
  the **parent** as the worked row and park the children, or fold their signals
  up onto the parent via `parent_domain`.

### Mechanics
1. When enrichment reveals `acme-eu.com` is owned by `acme.com`:
   - Set `acme-eu.com`.`parent_domain = 'acme.com'`, `is_subsidiary = TRUE`.
   - Ensure `acme.com` exists as a row (insert a thin parent row if needed).
2. **Roll signals up** when you work at the group level: a `signal_*` captured
   on `acme-eu.com` should also count toward `acme.com`.`signal_count`. Do this
   in the scoring stage, not at load time, so the raw capture stays truthful.
3. **Never double-count in the work queue.** If you work the parent, exclude
   `is_subsidiary = TRUE` rows from outreach selection (and vice-versa). One
   real company → one outreach motion.

### Acquisitions / rebrands
- When `oldco.com` becomes `newco.com`, keep BOTH keys but point the old at the
  new with `parent_domain` and a `notes` breadcrumb (`'acquired by newco 2026'`).
  Don't hard-delete history — a stale list elsewhere may still surface `oldco.com`
  and you want it to resolve, not create a duplicate.

---

## 5. People dedup

`People` dedups on `(company_domain, email)` (unique constraint in schema.sql).

- The same person re-pulled from another source **upserts** onto the existing
  row instead of duplicating — use `--on-conflict company_domain,email` in the
  loader.
- A person with **no email** can't use that key. Either resolve the email first,
  or dedup secondarily on `(company_domain, linkedin_url)` before loading.
- Keep `live_verified` truthful: only set it when you actually re-confirmed the
  title at find-time. A stale title on a duplicate should not overwrite a
  freshly verified one — prefer the `live_verified = TRUE` row on conflict.

---

## 6. Quick checklist before any bulk load

- [ ] Domains normalized with the §2 rules (lowercased, scheme/www/path stripped, eTLD+1).
- [ ] Free-mail and shared-platform "domains" filtered out or parked.
- [ ] Rows checked against `Company_Not_ICP` and dropped if present.
- [ ] Missing-domain rows routed to `Company_Parked`, not force-inserted.
- [ ] Loader run with the correct `--on-conflict` key (`domain` for Company,
      `company_domain,email` for People).
- [ ] Parent/subsidiary links set where enrichment revealed them.
