# Parallel.ai

A web API purpose-built for AI agents. It runs a proprietary web-scale index
(billions of pages, recrawled constantly) and exposes it as a small set of REST
endpoints that return answers **with citations, confidence scores, and source
excerpts** instead of raw HTML. In this repo we use it as a *web research*
layer: when we have a company but a weak or low-confidence description, Parallel
fetches grounded facts about that company before we fall back to scraping its
homepage.

- **What it is:** pay-per-request web research / search / extraction API for agents
- **Why we use it here:** fill in company context from the open web with citations, not guesses
- **Pricing model:** pay-per-request, no plan tiers (cheap per call; cost can spike at volume — budget it)
- **Docs:** https://docs.parallel.ai

---

## Base URL

```
https://api.parallel.ai
```

The Chat API is OpenAI-SDK compatible — point an OpenAI client's `base_url` at
Parallel and it works with the same request/response shape.

---

## Auth

Every request is authenticated with an API key sent in a header. Scripts read it
from the environment only — never hardcode it.

```python
import os, requests

API_KEY = os.environ["PARALLEL_API_KEY"]   # set in your .env (see .env.example)

headers = {
    "x-api-key": API_KEY,
    "Content-Type": "application/json",
}
```

> The key name `PARALLEL_API_KEY` matches the placeholder in `.env.example`.
> Get a key at `platform.parallel.ai`. The free tier covers a few thousand
> requests to start.

---

## The key APIs

Parallel ships several endpoints. The three that matter for this repo:

### 1. Task API — deep research / enrichment

Best for: deep research, database enrichment, workflow automation. Async
(5s–30min). This is the workhorse for *"tell me about this company"* — you give
it a question plus any structured data you already have, and it returns a
researched, structured answer with citations.

| Param | Description |
|---|---|
| `input` | The question / objective, plus any existing structured data you want enriched |
| `output_schema` | (optional) JSON schema describing the structured fields you want back |
| `processor` / `mode` | Effort/depth setting — trade latency and cost for thoroughness |

- Latency: 5s – 30min, **async** (submit → poll for result)
- Rate limit: ~2,000 req/min
- Price: ~$0.005 – $2.40 per request (scales with depth)
- Returns: structured answer + reasoning + confidence + citations

### 2. Search API — ranked web results for agents

Best for: web search tool-calls inside an agent loop. Synchronous (<5s). Give it
a natural-language objective (and optional keywords); get back ranked URLs with
**compressed, relevant excerpts** so the agent doesn't have to fetch and read
each page itself.

| Param | Description |
|---|---|
| `objective` | Natural-language description of what you're searching for |
| `search_queries` / `keywords` | (optional) specific query terms to steer the search |
| `max_results` | Number of ranked results to return |

- Latency: <5s, **sync**
- Rate limit: ~600 req/min
- Price: ~$0.005 for 10 results
- Returns: ranked URLs + compressed excerpts + citations

### 3. Extract API — pull contents from a known URL

Best for: turning a specific URL into clean structured content. Synchronous
(<3s) and the cheapest endpoint. Use when you already have the page (a press
release, filing, profile) and just need its content extracted to an objective.

| Param | Description |
|---|---|
| `urls` | The URL(s) to extract from |
| `objective` | (optional) what to focus the extraction on |

- Latency: <3s, **sync**
- Rate limit: ~600 req/min
- Price: ~$0.001 per URL
- Returns: full page contents + compressed excerpts

> Parallel also offers Chat (OpenAI-compatible Q&A), Monitor (continuous web
> change events), and FindAll (web-scale entity discovery). They aren't part of
> the core company-research path here, so they're out of scope for this doc — see
> `docs.parallel.ai` if you need them.

---

## Role in this pipeline

Parallel sits between **firmographic enrichment** and the **homepage scrape**,
as the company-research step when our existing description is thin or
low-confidence.

```
Company + enrichment data
        │
        ▼
  Description confidence check
        │
   ┌────┴─────────────────────┐
   │ high confidence          │ low / missing confidence
   ▼                          ▼
 use existing description   Parallel Task API  ──►  grounded, cited company facts
                              │                         │
                              │ (still not enough?)     ▼
                              ▼                    feed into ICP scoring
                        Firecrawl homepage scrape  ◄────┘  (fallback)
```

**Why Parallel *before* the homepage scrape:**

1. **Cited, web-wide context beats one page.** A homepage often markets rather
   than describes. Parallel reads across the open web (news, profiles, filings)
   and returns facts with sources — better signal for an ICP decision.
2. **Cheaper and faster than scrape-then-LLM-summarize.** A Task call returns a
   structured answer directly, instead of fetching HTML and burning LLM tokens
   to clean and summarize it.
3. **Provenance.** Every field comes back with a citation, so a downstream
   reviewer can verify *why* a company was scored the way it was.

**Concrete generic walk-through:**

1. Enrichment returns a company `example.com` with description *"a software
   company"* — too vague to score against `<your-icp>`.
2. Confidence check flags it as low. The pipeline calls the **Task API**:
   *"What does the company at example.com do? Industry, product category, target
   customer, company size signals."*
3. Parallel returns a structured, cited answer (e.g. product category, who they
   sell to, recent funding) usable for ICP scoring.
4. **Only if** Parallel still can't resolve the company do we fall back to a
   Firecrawl homepage scrape of `example.com`.

This ordering keeps the expensive/noisy homepage scrape as a last resort and
makes most low-confidence companies resolvable with a single cited Task call.

---

## Notes

- All endpoints return citations, reasoning, confidence, and excerpts — design
  downstream steps to keep the citation so scoring decisions stay auditable.
- Pay-per-request means no fixed monthly bill, but high-volume Task runs can add
  up — cap concurrency and set a per-run budget (`# TODO: customize`).
- FindAll is in public beta; its request/response shape may change. Avoid
  depending on it for production paths in this repo.
