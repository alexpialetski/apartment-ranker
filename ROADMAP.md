# Apartment Ranker — Implementation Roadmap

Logical, consecutive steps to implement the product. Each phase builds on the previous. References: [REQUIREMENTS.md](./REQUIREMENTS.md), [UX-REQUIREMENTS.md](./UX-REQUIREMENTS.md), [TECH-DECISIONS.md](./TECH-DECISIONS.md), [BUSINESS-FLOWS.md](./BUSINESS-FLOWS.md).

---

## Phase 1: Data layer and core domain

**Goal:** Persist flats and comparisons; define bands and Elo; remove example schema.

### 1.1 Database schema (Drizzle + SQLite)

- Replace or extend the example `posts` table with:
  - **Flats:** `id`, `realt_url` (unique, normalized), `price`, `price_per_sqm`, `rooms`, `location`, `area` (optional), `image_url` (optional), `scrape_status` (`pending` | `scraping` | `success` | `error`), `elo_rating` (default e.g. 1500), `band` or derived band from `price_per_sqm` + `rooms`, timestamps.
  - **Comparisons:** `id`, `winner_id`, `loser_id`, `created_at` (optional); foreign keys to flats.
- Add indexes for: `realt_url`, `scrape_status`, band-related queries (e.g. `rooms`, `price_per_sqm` or `band`).
- Run migrations; ensure DB is the single source of truth per [TECH-DECISIONS.md](./TECH-DECISIONS.md).

**Deliverable:** Schema and migrations applied; no app UI yet.

### 1.2 Band definition and Elo

- Define **bands** (Option A from TECH-DECISIONS): e.g. price_per_sqm ranges (1.5–1.8k, 1.8–2k, …) and room count. Implement a small util: given a flat, return its band id or label.
- Implement **Elo update** (incremental): function that takes `winner_id`, `loser_id`, current ratings, K-factor; updates only those two flats’ `elo_rating` in DB. No full recomputation.

**Deliverable:** Band util + Elo update function; callable from backend (e.g. from a tRPC procedure or service).

---

## Phase 2: Scraping pipeline

**Goal:** Add a flat by URL → enqueue job → scrape Realt HTML → persist result and status; no UI yet (or minimal).

### 2.1 BullMQ setup

- Add **BullMQ** (and Redis, or in-memory for dev). Configure a queue (e.g. `scrape-flats`).
- **Worker process** (or same Node process consumer): listens for jobs; job data includes `flat_id` and/or `realt_url`.
- Worker stub: for now can simulate success/error or use a placeholder fetch.

**Deliverable:** Queue + worker running; can enqueue a job and see it processed.

### 2.2 Realt scraper

- Implement **fetch + parse** for a Realt listing URL (HTML). Extract: `price`, `price_per_sqm`, `rooms`, `location`; optionally `area`, one `image_url`.
- Handle errors (network, 404, parse failures); return structured result (success + data or error).
- Worker: on job run, call scraper; update flat row: on success set scraped fields + `scrape_status = success`; on failure set `scrape_status = error`. No SSE yet.

**Deliverable:** Adding a flat (via API) creates DB row, enqueues job; worker scrapes and updates DB.

### 2.3 tRPC procedures for flat lifecycle

- **addByUrl:** input Realt URL; normalize URL; create flat with `scrape_status = scraping` (or pending); enqueue BullMQ job; return flat (or id).
- **removeByUrl:** input Realt URL; find flat by `realt_url`, delete (or soft-delete).
- **listFlats:** return all flats (for Add + List screen; filter by status later in UI if needed).
- **getFlat(id)** or **getFlatByUrl:** for single flat (e.g. for SSE payload or Reload).
- **reloadFlat(id):** set status to scraping, enqueue job; return. Used by Reload button.

**Deliverable:** Backend supports add, remove, list, reload; worker completes scrape and updates DB.

---

## Phase 3: Real-time updates (SSE)

**Goal:** Client receives events when a scrape job completes so the Add + List (and later Rank) UI can update without polling.

### 3.1 SSE channel and pub/sub

- **API route** (e.g. `/api/sse` or `/api/events`) that opens an SSE connection and keeps it open.
- **Pub/sub:** When worker finishes a job (success or error), it notifies a channel (in-memory for single instance, or Redis if multi-instance). SSE route subscribes and sends events to the client.
- Event payload: e.g. `{ type: 'flat_scraping_success' | 'flat_scraping_error', flatId, flat?: ... }`. Include minimal flat data on success so client can update the card.

**Deliverable:** Client can subscribe to SSE; worker completion triggers an event that the client receives.

### 3.2 Wire worker to SSE

- In the BullMQ job completion handler (or worker), after updating the DB, publish to the SSE channel with `flatId` and result (success + flat data, or error).

**Deliverable:** End-to-end: add flat → job runs → DB updated → SSE event → client can react.

---

## Phase 4: Add + List screen (full UX)

**Goal:** Single screen: Add by URL, Remove by URL, list of all flats with real-time card updates. [UX-REQUIREMENTS.md §1](./UX-REQUIREMENTS.md#1-add-flat--flats-list-combined), [BUSINESS-FLOWS.md](./BUSINESS-FLOWS.md).

### 4.1 Page structure and layout

- One page (e.g. “Flats” or “Add & List”): top section (Add by URL, Remove by URL inputs), then list of flat cards.
- Use tRPC for: `addByUrl`, `removeByUrl`, `listFlats`; use React Query (via tRPC) for list; optimistic or immediate refetch on add/remove.

### 4.2 Add by URL and Remove by URL

- **Add:** Form with Realt URL input; on submit call `addByUrl`; new card appears in list with **scraping** state (loading indicator). No redirect.
- **Remove:** Form with Realt URL; on submit call `removeByUrl`; remove corresponding card from list (or refetch list).

### 4.3 Flat cards and states

- **Card component** used only on this screen for unscraped + scraped flats:
  - **Scraping:** Loading indicator (spinner/skeleton), optional “Scraping…” text.
  - **Success:** Price, price/m², rooms, location, link to Realt, **Reload** button, optional **Remove**.
  - **Error:** “Couldn’t load” (or similar), **Reload** button.
- **Reload:** Calls `reloadFlat(id)`; card switches to scraping state; SSE will push success/error.

### 4.4 SSE integration on client

- On this screen, open SSE connection (or use a hook). On `flat_scraping_success` / `flat_scraping_error`, update the corresponding card (invalidate that flat’s query or update cache with event payload).
- New flat added → card already in list with loading; SSE drives transition to success/error.

**Deliverable:** Add/Remove by URL working; list shows all states; cards update in real time when scrape completes; Reload works.

---

## Phase 5: Compare flow

**Goal:** Two cards per band; user chooses Left/Right; record comparison and update Elo. [UX-REQUIREMENTS.md §2](./UX-REQUIREMENTS.md#2-compare), [BUSINESS-FLOWS.md](./BUSINESS-FLOWS.md).

### 5.1 Compare API

- **getComparisonPair(band):** Return two flats from the same band (same room count + same price_per_sqm band), only `scrape_status = success`. Strategy: random or least-compared in that band.
- **submitComparison:** Input `winnerId`, `loserId`. Insert comparison row; run **Elo update** for those two flats only.

### 5.2 Compare screen

- **Compare** page: fetch pair by band. If no band in context, either choose a band from bands that have ≥ 2 flats, or derive from user selection.
- Two cards side by side (or stacked on mobile). Show: price, price/m², rooms, location, link to Realt. No Reload, no Remove on these cards.
- Buttons: “Left” / “Right” (which is better). Optional: “Skip / Can’t decide” (no DB write, just next pair).
- On choice: call `submitComparison`; then fetch next pair (same band).

**Deliverable:** User can compare two flats from the same band, submit choice, see next pair; Elo updated incrementally.

---

## Phase 6: Rank view

**Goal:** Ordered list of flats by Elo within each band; only successfully scraped flats. [UX-REQUIREMENTS.md §3](./UX-REQUIREMENTS.md#3-rank), [BUSINESS-FLOWS.md](./BUSINESS-FLOWS.md).

### 6.1 Rank API

- **getRankedFlats:** Return flats with `scrape_status = success`, grouped by band (rooms + price_per_sqm_band), ordered by `elo_rating` desc within each band. No recomputation; read from DB.

### 6.2 Rank screen

- **Rank** page: display bands (e.g. “1-room, 1.8–2k”, “2-room, 1.5–1.8k”); under each, ordered list of flats (position, key info, link to Realt, **Reload**, **Remove** or rely on Remove by URL from main screen).
- If a flat is re-scraping (Reload pressed), show scraping indicator on that card; use SSE to update when done.

**Deliverable:** Rank view with per-band Elo ordering; Reload (and optional Remove) on card; real-time update when Reload completes.

---

## Phase 7: Navigation and polish

**Goal:** App has clear navigation; band selection for Compare; small UX/edge-case fixes.

### 7.1 Navigation

- **Nav / layout:** Links or tabs to: **Add + List**, **Compare**, **Rank**. Default or home can be Add + List.

### 7.2 Compare: band selection

- If multiple bands have ≥ 2 flats, let user **choose band** (e.g. dropdown or list) before showing pairs; or show current band and allow switching.
- Handle edge cases: no flats in band, exactly one flat in band (show message, don’t break).

### 7.3 Edge cases and copy

- Empty states: no flats yet (prompt to add); no pair in band (prompt to add more or switch band).
- Normalize Realt URL (e.g. trailing slash, query params) so add/remove by URL is robust.
- Copy and accessibility: “Couldn’t load”, “Scraping…”, button labels per UX-REQUIREMENTS.

**Deliverable:** Cohesive app with navigation; Compare band selection; clear empty states and stable URL handling.

---

## Phase 8: Optional enhancements (later)

- **Optional fields:** Scrape and show `area` (m²), one image URL for card thumbnail. [TECH-DECISIONS.md](./TECH-DECISIONS.md) data to scrape.
- **Redis for BullMQ + SSE:** If deploying multi-instance, use Redis for queue and for SSE pub/sub.
- **Soft-delete for flats:** Keep comparisons history; filter deleted flats from all reads.

---

## Summary: dependency order

| Phase | Depends on | Key output |
|-------|------------|------------|
| 1. Data layer | — | Schema, bands, Elo |
| 2. Scraping | 1 | BullMQ, scraper, flat CRUD + reload |
| 3. SSE | 2 | Real-time scrape completion events |
| 4. Add + List | 2, 3 | Full first screen with live cards |
| 5. Compare | 1, 2 | Pair selection + Elo recording |
| 6. Rank | 1, 2, 3 | Rank view + Reload with SSE |
| 7. Navigation & polish | 4, 5, 6 | Complete app flow |
| 8. Optional | 1–7 | Thumbnails, Redis, soft-delete |

Implement in order: **1 → 2 → 3 → 4** for the core “add and list with live scrape” experience; then **5** and **6** in either order (both depend on 1 and 2); then **7** to tie the product together.
