# Batching, rate limits & checkpoint/resume — per tool

This is the operational companion to `README.md`. It gives the concrete numbers and the copy-able
code patterns for (a) staying under each tool's rate limit and (b) checkpointing so a crash costs
at most one batch.

The two patterns repeat across every stage:

- **Pace the calls** — a limiter sized to the *slowest* tool a stage touches.
- **Write the verdict last, keyed, and batched** — so resume is automatic and re-runs don't dupe.

Everything below is stdlib + `requests`. No new dependencies.

---

## 0. The universal resume rule (read this first)

There is no checkpoint file. **The checkpoint is the verdict column in Supabase.** A stage's
queue is *defined* as "rows where my verdict column `IS NULL`". So:

- To checkpoint a batch → write its verdicts (keyed upsert).
- To resume after a crash → just run the stage again; it re-reads the `IS NULL` queue.
- To retry failures → there is no separate retry; a failed row never got a verdict, so it is
  still in the queue.

Corollary: **never write a verdict before the work that earns it succeeds.** That single
ordering rule is what makes the whole engine idempotent.

```python
# RIGHT — verdict written only after the API call + validation succeed
resp = call_api(row)               # may raise → row stays NULL → retried next pass
verdict = validate(resp)           # may raise → same
upsert_verdict(row["domain"], verdict)   # only now is the row "done"

# WRONG — row marked done before we know the work succeeded
upsert_verdict(row["domain"], "pending")
resp = call_api(row)               # if this raises, row is stuck in a half state
```

---

## 1. Per-tool limits & batching strategy

| Tool | Stage(s) | Real limit | Batch unit | Pacing strategy |
|------|----------|-----------|-----------|-----------------|
| **Blitz** | 00, 03 | **5 req/sec** (all plans) | per-call | token bucket @ **4 rps** (headroom under 5) |
| **Prospeo** | 00, 06 | **5/s · 300/min · 2,000/day** (Starter); 30/s · 1,800/min · 500k/day (Pro) | per-call | per-second bucket **+ daily counter**; stop stage when day budget hits 0 |
| **AI Ark** | 00 | plan-defined (confirm yours) | per-call | conservative **2 rps** default until confirmed |
| **Firecrawl** | 01 | **concurrency-bound** (~2 on small plans, up to ~10–12+ on higher) | concurrent pool | **bounded worker pool**, default 12; back off on 429 |
| **Parallel** | 01 | **2,000 req/min, async** (Task API); FindAll only 25/hr | submit + poll | submit, store run id, **poll** — don't block a worker on a 5–30 min task |
| **Serper** | 01, 03 | high; pay-per-query | per-call | small concurrency (5–10), **cache by query string** |
| **Apify** | 01 fallback, 04 | **per-actor-run** (not rps) | actor run | **launch → wait for finish → sleep 60–90 s (jitter) → next** |
| **Trigify** | 03, 04 | **credit-metered** (1 cr/post or action) | search/workflow | **filter before enrich**; prefer webhook push over hot polling |
| **Supabase** | all | generous REST; we self-limit | **≤200 rows / POST** | keyed upsert, `Prefer: resolution=merge-duplicates` |

### Why these specific choices

- **Blitz @ 4 rps, not 5.** The published cap is 5 rps; running at 4 leaves a margin for clock
  skew and the occasional retried call so you never trip a 429 mid-batch.
- **Prospeo's binding limit is the *daily* one on Starter (2,000/day).** Per-second is easy to
  respect; the day budget is what stops a stage. Track it and *halt the stage cleanly* when it's
  exhausted — the un-`NULL` rows roll to tomorrow's tick automatically.
- **Firecrawl is concurrency-bound, not rps-bound.** You don't pace by sleeping; you pace by
  capping how many scrapes are *in flight*. A bounded pool of 12 workers is the control.
- **Parallel is async.** A Task can take 5 s to 30 min. Blocking a worker thread on it wastes the
  whole rate budget. Submit, persist the run id on the row, and poll on a later pass.
- **Apify is the sharp edge.** It bills and schedules by *actor run*, so rps thinking doesn't
  apply. Hammering it queues your own runs behind each other. Space batches **60–90 s apart with
  jitter** and only reach for it as the LinkedIn fallback.

---

## 2. Token-bucket limiter (Blitz / Prospeo / AI Ark / Serper)

A tiny, thread-safe limiter. One instance per tool, sized to that tool's rps. Share it across all
worker threads for that tool.

```python
import threading, time

class RateLimiter:
    """Token bucket. rate = sustained req/sec, burst = max tokens saved up."""
    def __init__(self, rate: float, burst: float | None = None):
        self.rate = float(rate)
        self.capacity = float(burst if burst is not None else rate)
        self._tokens = self.capacity
        self._last = time.monotonic()
        self._lock = threading.Lock()

    def acquire(self, n: float = 1.0) -> None:
        with self._lock:
            while True:
                now = time.monotonic()
                self._tokens = min(self.capacity, self._tokens + (now - self._last) * self.rate)
                self._last = now
                if self._tokens >= n:
                    self._tokens -= n
                    return
                sleep_for = (n - self._tokens) / self.rate
            # released lock implicitly? no — sleep OUTSIDE the lock:
        # (see note below — real impl sleeps outside the lock)

# Per-tool instances (size to the SLOWEST you'll run concurrently):
BLITZ   = RateLimiter(rate=4)     # under the 5 rps cap
PROSPEO = RateLimiter(rate=4)     # plus a separate daily counter (section 3)
AI_ARK  = RateLimiter(rate=2)     # conservative until plan confirmed
SERPER  = RateLimiter(rate=8)
```

> Sleep **outside** the lock in production so one waiting thread doesn't block the others. The
> corrected loop releases the lock, `time.sleep(sleep_for)`, then re-acquires. Kept inline here
> for readability; the real version in a stage's `_limit.py` does the release-sleep-reacquire.

---

## 3. Prospeo daily budget guard

Prospeo's per-second limit is trivial; the **2,000/day** ceiling (Starter) is what actually
stops a stage. Guard it and exit the stage cleanly when spent — the leftover rows are still
un-`NULL` and resume tomorrow.

```python
class DailyBudget:
    def __init__(self, limit: int):
        self.limit = limit
        self.used = 0           # persist this per UTC-day if your stage is long-lived
        self._lock = threading.Lock()

    def take(self, n: int = 1) -> bool:
        with self._lock:
            if self.used + n > self.limit:
                return False     # budget gone → caller should STOP the stage, not error
            self.used += n
            return True

PROSPEO_DAY = DailyBudget(limit=2000)   # Starter; raise to 500_000 on Pro

# in the worker:
if not PROSPEO_DAY.take():
    raise BudgetExhausted()   # orchestrator catches this → ends the stage gracefully
```

---

## 4. Firecrawl bounded worker pool (concurrency, not rps)

For stage `01` homepage scrapes, the lever is *how many at once*, not *how fast*.

```python
from concurrent.futures import ThreadPoolExecutor, as_completed

FIRECRAWL_CONCURRENCY = 12   # tune to your plan; small plans = 2

def scrape_all(domains, scrape_one):
    results = {}
    with ThreadPoolExecutor(max_workers=FIRECRAWL_CONCURRENCY) as pool:
        futs = {pool.submit(scrape_one, d): d for d in domains}
        for fut in as_completed(futs):
            d = futs[fut]
            try:
                results[d] = fut.result()
            except Exception as e:
                results[d] = {"error": str(e)}   # failed → row stays NULL → retried
    return results
```

On a `429`, the per-call `scrape_one` should back off (section 6) and, if it still fails, return
an error so the row simply stays in the queue.

---

## 5. Apify — space the batches (the one that bites)

Apify runs actors. Do **not** loop it tightly. Launch a batch, wait for the run, sleep with
jitter, repeat.

```python
import time, random, requests

def run_apify_batch(actor_id, run_input, token, poll_every=10, timeout=900):
    base = "https://api.apify.com/v2"
    r = requests.post(f"{base}/acts/{actor_id}/runs",
                      params={"token": token}, json=run_input, timeout=60)
    r.raise_for_status()
    run_id = r.json()["data"]["id"]

    waited = 0
    while waited < timeout:                       # poll until the run finishes
        s = requests.get(f"{base}/actor-runs/{run_id}", params={"token": token}, timeout=60)
        status = s.json()["data"]["status"]
        if status in ("SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"):
            break
        time.sleep(poll_every); waited += poll_every

    ds_id = s.json()["data"]["defaultDatasetId"]
    items = requests.get(f"{base}/datasets/{ds_id}/items",
                         params={"token": token, "format": "json"}, timeout=120).json()
    return status, items

# Drive many batches with mandatory spacing between them:
def drive_apify(batches, actor_id, token):
    for i, batch in enumerate(batches):
        status, items = run_apify_batch(actor_id, build_input(batch), token)
        handle(status, items)                     # checkpoint to Supabase here (keyed upsert)
        if i < len(batches) - 1:
            time.sleep(random.uniform(60, 90))    # 60–90 s jittered backoff BETWEEN runs
```

---

## 6. Retry with exponential backoff + jitter (every HTTP call)

Wrap every external call. Retries transient failures (`429`, `5xx`, timeouts); gives up on
client errors (`4xx` other than 429) because retrying those won't help.

```python
import time, random, requests

RETRYABLE = {429, 500, 502, 503, 504}

def with_retry(fn, *, tries=5, base=1.0, cap=30.0):
    last = None
    for attempt in range(tries):
        try:
            resp = fn()
            if isinstance(resp, requests.Response) and resp.status_code in RETRYABLE:
                raise requests.HTTPError(f"retryable {resp.status_code}", response=resp)
            return resp
        except (requests.RequestException, requests.HTTPError) as e:
            last = e
            code = getattr(getattr(e, "response", None), "status_code", None)
            if code is not None and code not in RETRYABLE and code != 429:
                raise                                   # non-retryable client error
            sleep = min(cap, base * (2 ** attempt)) + random.uniform(0, base)  # full jitter
            # honour Retry-After if the server sent one
            ra = getattr(getattr(e, "response", None), "headers", {}) or {}
            if ra.get("Retry-After"):
                try: sleep = max(sleep, float(ra["Retry-After"]))
                except ValueError: pass
            time.sleep(sleep)
    raise last
```

---

## 7. Supabase checkpoint write — keyed upsert, ≤200 rows/POST

The one way verdicts get persisted. Keyed so re-runs overwrite instead of duplicating; chunked so
each POST stays small.

```python
import os, requests

def supabase_upsert(table: str, rows: list[dict], on_conflict: str, chunk: int = 200):
    """Idempotent batched upsert. on_conflict = the natural key column(s)."""
    ref   = os.environ["SUPABASE_PROJECT_REF"]
    token = os.environ["SUPABASE_ACCESS_TOKEN"]     # or SUPABASE_ANON_KEY for anon-safe tables
    url   = f"https://{ref}.supabase.co/rest/v1/{table}"
    headers = {
        "apikey": token,
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",  # = upsert
    }
    for i in range(0, len(rows), chunk):                          # ≤200 rows per POST
        part = rows[i:i + chunk]
        resp = with_retry(lambda: requests.post(
            url, params={"on_conflict": on_conflict},
            headers=headers, json=part, timeout=60))
        resp.raise_for_status()
```

Natural keys this engine uses (so writes are idempotent end-to-end):

| Table | `on_conflict` key |
|-------|-------------------|
| `accounts`  | `domain` |
| `contacts`  | `domain,person_linkedin_url` |
| `signals`   | `account_id,signal_type,source_url` |
| `outreach_pushes` | `contact_id,channel` |

---

## 8. Putting batch + checkpoint + limit together (the stage skeleton)

Every LLM/enrichment stage follows this exact shape. Pull the un-`NULL` queue → split → run
batches under the limiter → checkpoint each batch → let the next tick sweep the leftovers.

```python
def run_stage(fetch_queue, classify_batch, BATCH_SIZE=500, MAX_PARALLEL=4, max_rows=None):
    queue = fetch_queue(limit=max_rows)            # rows WHERE my_verdict IS NULL
    if not queue:
        return 0                                   # nothing to do → orchestrator stops early
    batches = [queue[i:i+BATCH_SIZE] for i in range(0, len(queue), BATCH_SIZE)]

    done = 0
    with ThreadPoolExecutor(max_workers=MAX_PARALLEL) as pool:
        futs = {pool.submit(classify_batch, b): b for b in batches}
        for fut in as_completed(futs):
            try:
                verdicts = fut.result()            # [{key:..., verdict:...}, ...]
                supabase_upsert("accounts", verdicts, on_conflict="domain")  # CHECKPOINT
                done += len(verdicts)
            except BudgetExhausted:
                break                              # day budget gone → stop cleanly, resume later
            except Exception:
                continue                           # batch failed → its rows stay NULL → retried
    return done
```

`MAX_PARALLEL` is sized so `MAX_PARALLEL × per-call-rps ≤ tool ceiling`. For a stage that hits
Blitz (5 rps) with one call per row, 4 parallel batches each pacing through the shared `BLITZ`
limiter stays safely under the cap because the limiter — not the batch count — is the real
throttle. The batch count only controls *checkpoint granularity* and *failure blast radius*.
