-- ════════════════════════════════════════════════════════════════════════════
-- STAGE 02 — SYSTEM OF RECORD · schema.sql
-- Generic, tenant-agnostic DDL for the Signal-Led TAM Engine's source of truth.
--
-- WHY a database (not a spreadsheet):
--   Every stage of the loop writes back here — TAM build, qualification, signal
--   capture, scoring, outreach status. Companies arrive from MULTIPLE sources
--   (search APIs, enrichment, signal feeds) and the SAME company shows up again
--   and again under slightly different names. The DB is what lets you DEDUPE and
--   resolve identity on a single stable key (the domain) so the same account is
--   never worked twice and a new signal lands on the row that already exists.
--
-- HOW TO RUN:
--   1. Open the Supabase SQL Editor (or psql against your project).
--   2. Pick the schema you want to load into (one schema per tenant — see below).
--      The default below is `public`; change SET search_path to your tenant schema.
--   3. Run this whole file. It is idempotent: re-running drops nothing and only
--      creates objects that don't already exist.
--
-- SCHEMA-PER-TENANT:
--   Run ONE Supabase project, isolate each client/product in its own Postgres
--   schema. To target a tenant schema instead of public:
--       CREATE SCHEMA IF NOT EXISTS acme;
--       SET search_path TO acme;
--   …then run the rest of this file. The loader (supabase_load.py) routes writes
--   to that schema with the PostgREST "Content-Profile" header — no per-tenant
--   table renames, no cross-tenant collisions.
-- ════════════════════════════════════════════════════════════════════════════

-- TODO: customize — set this to YOUR tenant schema (e.g. `acme`). Leave as
--       `public` for a single-tenant install. The schema must already exist;
--       uncomment the CREATE SCHEMA line if it doesn't.
-- CREATE SCHEMA IF NOT EXISTS acme;
-- SET search_path TO acme;
SET search_path TO public;


-- ────────────────────────────────────────────────────────────────────────────
-- TABLE: Company — the spine of the whole engine.
-- One row per real-world company, keyed for dedup on the normalized domain.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Company" (
    -- ── Identity / dedup key ──
    domain              TEXT PRIMARY KEY,           -- normalized root domain; THE join + dedup key
    company_name        TEXT,
    linkedin_url        TEXT,
    clean_homepage      TEXT,                        -- canonical https homepage after redirect-follow

    -- ── Firmographics ──
    industry            TEXT,
    sub_industry        TEXT,
    employee_count      INTEGER,
    employee_range      TEXT,                        -- e.g. "51-200" when only a band is known
    revenue_range       TEXT,
    founded_year        INTEGER,
    hq_country          TEXT,
    hq_region           TEXT,                        -- state / province
    hq_city             TEXT,
    description         TEXT,                        -- short company blurb used by the qualify agent

    -- ── Identity resolution (parent / subsidiary) — see dedupe.md ──
    parent_domain       TEXT,                        -- if this row rolls up under a parent company
    is_subsidiary       BOOLEAN DEFAULT FALSE,

    -- ── Signal layer (generic slots; fill from your signal feed) ──
    -- Keep these GENERIC. Each engine maps its own signal types onto signal_1..N.
    signal_1            TEXT,                        -- e.g. a captured intent / social / hiring signal
    signal_1_source     TEXT,                        -- where signal_1 came from
    signal_1_date       DATE,
    signal_2            TEXT,
    signal_2_source     TEXT,
    signal_2_date       DATE,
    signal_3            TEXT,
    signal_3_source     TEXT,
    signal_3_date       DATE,
    signal_count        INTEGER DEFAULT 0,           -- how many distinct signals this account has
    last_signal_date    DATE,                        -- most recent signal touch (drives recency decay)

    -- ── Verdicts (written by the qualify + scoring stages) ──
    fit_verdict         TEXT,                        -- 'fit' | 'not-fit' | 'maybe' | NULL (unscored)
    fit_reason          TEXT,                        -- one-line rationale from the qualify agent
    intent_tier         TEXT,                        -- 'hot' | 'warm' | 'cold' — signal-driven priority
    fit_score           NUMERIC,                     -- 0-100 firmographic fit
    signal_score        NUMERIC,                     -- 0-100 signal strength (recency + count + weight)
    total_score         NUMERIC,                     -- combined score that ranks the work queue

    -- ── Provenance + housekeeping ──
    source              TEXT,                        -- which acquisition path first created this row
    enrichment_status   TEXT,                        -- 'pending' | 'enriched' | 'failed'
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT now(),
    updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_fit_verdict   ON "Company" (fit_verdict);
CREATE INDEX IF NOT EXISTS idx_company_intent_tier   ON "Company" (intent_tier);
CREATE INDEX IF NOT EXISTS idx_company_total_score   ON "Company" (total_score);
CREATE INDEX IF NOT EXISTS idx_company_last_signal   ON "Company" (last_signal_date);
CREATE INDEX IF NOT EXISTS idx_company_parent_domain ON "Company" (parent_domain);

COMMENT ON TABLE  "Company"                  IS 'One row per company. Spine of the engine; deduped on normalized domain. Every stage reads/writes here.';
COMMENT ON COLUMN "Company".domain           IS 'Normalized root domain (lowercase, no scheme/www/path). PRIMARY KEY and the universal dedup + join key across every source.';
COMMENT ON COLUMN "Company".company_name     IS 'Display name. NOT a dedup key — the same company appears under many name spellings; always resolve on domain.';
COMMENT ON COLUMN "Company".clean_homepage   IS 'Canonical https homepage after following redirects. Used by the qualify stage as the scrape target.';
COMMENT ON COLUMN "Company".employee_count   IS 'Best-known exact headcount. NULL when only a band is available — see employee_range.';
COMMENT ON COLUMN "Company".employee_range   IS 'Headcount band (e.g. "51-200") when an exact count is unknown.';
COMMENT ON COLUMN "Company".description       IS 'Short company blurb. The qualify agent reads this first before spending a homepage scrape.';
COMMENT ON COLUMN "Company".parent_domain    IS 'Domain of the parent company when this row is a subsidiary/brand. See dedupe.md for the parent/subsidiary rule.';
COMMENT ON COLUMN "Company".is_subsidiary    IS 'TRUE when this company rolls up under parent_domain. Lets you choose whether to work the brand or the parent.';
COMMENT ON COLUMN "Company".signal_1         IS 'Generic signal slot 1. Map your own signal types (intent / hiring / social) onto signal_1..signal_3. Keep the meaning consistent per engine.';
COMMENT ON COLUMN "Company".signal_count     IS 'Count of distinct signals on this account. A core input to signal_score and intent_tier.';
COMMENT ON COLUMN "Company".last_signal_date IS 'Date of the most recent signal. Drives recency decay in scoring — older signals weigh less.';
COMMENT ON COLUMN "Company".fit_verdict      IS 'Firmographic ICP verdict from the qualify stage: fit | not-fit | maybe | NULL (not yet scored).';
COMMENT ON COLUMN "Company".intent_tier      IS 'Signal-driven priority: hot | warm | cold. Hot = fresh, strong signal on a fit account.';
COMMENT ON COLUMN "Company".total_score      IS 'Combined fit_score + signal_score. Ranks the outreach work queue — work the top of this list first.';
COMMENT ON COLUMN "Company".source           IS 'Acquisition path that FIRST created this row (e.g. tam-search, signal-feed, enrichment). Later sources do not overwrite it.';
COMMENT ON COLUMN "Company".updated_at       IS 'Last write timestamp. Bump on every upsert so you can see when an account was last touched.';


-- ────────────────────────────────────────────────────────────────────────────
-- TABLE: People — contacts linked to a Company by company_domain.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "People" (
    id                  BIGSERIAL PRIMARY KEY,
    company_domain      TEXT REFERENCES "Company"(domain) ON DELETE CASCADE,  -- FK to the spine

    full_name           TEXT,
    first_name          TEXT,
    last_name           TEXT,
    title               TEXT,
    seniority           TEXT,                        -- e.g. 'c-suite' | 'vp' | 'director' | 'manager'
    department          TEXT,
    persona             TEXT,                        -- mapped buyer persona (e.g. 'economic-buyer', 'champion')
    grade               TEXT,                        -- persona match grade, e.g. 'A' | 'B' | 'C'

    -- ── Contact channels ──
    email               TEXT,
    email_status        TEXT,                        -- 'valid' | 'risky' | 'invalid' | 'unknown'
    linkedin_url        TEXT,
    phone               TEXT,

    -- ── Provenance + verification ──
    source              TEXT,                        -- which tool produced this contact
    live_verified       BOOLEAN DEFAULT FALSE,       -- TRUE when title/role re-confirmed live (not stale)
    live_verified_date  DATE,

    created_at          TIMESTAMPTZ DEFAULT now(),
    updated_at          TIMESTAMPTZ DEFAULT now(),

    -- one contact per (company, email); dedups re-pulls of the same person
    CONSTRAINT uq_people_company_email UNIQUE (company_domain, email)
);

CREATE INDEX IF NOT EXISTS idx_people_company_domain ON "People" (company_domain);
CREATE INDEX IF NOT EXISTS idx_people_persona        ON "People" (persona);
CREATE INDEX IF NOT EXISTS idx_people_grade          ON "People" (grade);
CREATE INDEX IF NOT EXISTS idx_people_email_status   ON "People" (email_status);

COMMENT ON TABLE  "People"                   IS 'Contacts at companies. Linked to Company on company_domain — the same join key as everywhere else.';
COMMENT ON COLUMN "People".company_domain    IS 'FK to Company.domain. The account this person belongs to. Cascade-deletes with the company.';
COMMENT ON COLUMN "People".persona           IS 'Mapped buyer persona for this title (e.g. economic-buyer, champion, user). Drives which message track they enter.';
COMMENT ON COLUMN "People".grade             IS 'Persona match grade (A/B/C). A = exact target persona; C = adjacent / weak match.';
COMMENT ON COLUMN "People".email_status      IS 'Verification state of the email: valid | risky | invalid | unknown. Only send to valid.';
COMMENT ON COLUMN "People".live_verified     IS 'TRUE when the title/role was re-confirmed live at find-time (guards against stale data).';


-- ────────────────────────────────────────────────────────────────────────────
-- TABLE: Company_Not_ICP — companies explicitly rejected as out-of-ICP.
-- A graveyard, NOT a delete. Keeping rejects here means a re-pull of the same
-- domain from another source is instantly recognized and skipped — you never
-- re-qualify a company you already ruled out.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Company_Not_ICP" (
    domain              TEXT PRIMARY KEY,            -- same key shape as Company; check here before re-adding
    company_name        TEXT,
    reject_reason       TEXT,                        -- WHY it's out (e.g. 'wrong-industry', 'too-small', 'competitor')
    rejected_by         TEXT,                        -- which stage/agent rejected it
    source              TEXT,
    description         TEXT,
    created_at          TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE  "Company_Not_ICP"                 IS 'Rejected (out-of-ICP) companies. A graveyard keyed on domain so a re-pull from another source is recognized and skipped — never re-qualified.';
COMMENT ON COLUMN "Company_Not_ICP".domain          IS 'Normalized domain, same shape as Company.domain. Check here before inserting into Company to avoid re-working a known reject.';
COMMENT ON COLUMN "Company_Not_ICP".reject_reason   IS 'Why this company is out of ICP (wrong-industry | too-small | too-large | competitor | non-buyer | etc.).';


-- ────────────────────────────────────────────────────────────────────────────
-- TABLE: Company_Parked — companies held back, not yet qualified or worked.
-- Distinct from Not_ICP: these MIGHT be ICP later. Parked = "not now" (missing
-- data, no signal yet, out of capacity). Revisit when a signal lands or data fills in.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Company_Parked" (
    domain              TEXT PRIMARY KEY,
    company_name        TEXT,
    park_reason         TEXT,                        -- WHY parked (e.g. 'no-signal-yet', 'missing-firmographics', 'over-capacity')
    parked_by           TEXT,
    source              TEXT,
    description         TEXT,
    revisit_after       DATE,                        -- optional: when to reconsider this account
    created_at          TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE  "Company_Parked"               IS 'Companies held back but still potentially ICP. "Not now" (missing data / no signal / over capacity) — revisit when conditions change. Distinct from Company_Not_ICP.';
COMMENT ON COLUMN "Company_Parked".park_reason   IS 'Why this company is parked (no-signal-yet | missing-firmographics | over-capacity | needs-manual-review).';
COMMENT ON COLUMN "Company_Parked".revisit_after IS 'Optional date to reconsider this account. Lets a scheduled job re-surface parked rows automatically.';


-- ════════════════════════════════════════════════════════════════════════════
-- AUTO-UPDATE updated_at on every write (Company, People).
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_company_updated_at ON "Company";
CREATE TRIGGER trg_company_updated_at
    BEFORE UPDATE ON "Company"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_people_updated_at ON "People";
CREATE TRIGGER trg_people_updated_at
    BEFORE UPDATE ON "People"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ════════════════════════════════════════════════════════════════════════════
-- RLS + GRANTS — bulk-load convenience vs. production safety.
--
-- For the bulk-load pattern in this repo (a trusted loader script writing with
-- the anon key), RLS is left OFF and the anon role is granted table access so
-- supabase_load.py can POST rows directly through PostgREST.
--
--   ⚠️  SECURITY CAVEAT: This is fine for a PRIVATE project you control during a
--       build. For ANYTHING production / multi-user / internet-exposed, ENABLE
--       RLS and write explicit policies. With RLS off + anon grants, anyone with
--       the anon key can read/write every row. Do not ship this open.
-- ════════════════════════════════════════════════════════════════════════════

-- Grants so the anon role can bulk-load through the data API.
-- TODO: customize — for production, REMOVE these anon grants and use a service
--       role / RLS policies instead.
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON "Company"          TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON "People"           TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON "Company_Not_ICP"  TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON "Company_Parked"   TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- ── PRODUCTION HARDENING (uncomment to enable RLS) ──
-- ALTER TABLE "Company"         ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE "People"          ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE "Company_Not_ICP" ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE "Company_Parked"  ENABLE ROW LEVEL SECURITY;
-- -- Then write explicit policies, e.g. service-role-only writes:
-- CREATE POLICY "service_all" ON "Company"
--     FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── REMINDER FOR PostgREST SCHEMA EXPOSURE ──
-- PostgREST only serves schemas listed in the project's "Exposed schemas"
-- setting (Supabase Dashboard → Settings → API → Exposed schemas, or the
-- `db-schemas` config). To bulk-load into a tenant schema named `acme`, add
-- `acme` to that list AND grant the anon role usage on it, otherwise the
-- Content-Profile header in supabase_load.py will 404.
