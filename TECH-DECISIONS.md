# Tech Decisions

## Stack (existing)

- **Next.js** — App and API routes.
- **tRPC** — API layer.
- **Drizzle + SQLite** — Database and schema.
- **Tailwind CSS** — Styling.

## Storage: SQL only

- **No graph database.** All data in SQLite:
  - **Flats** — id, realt_url, scraped fields (price, price_per_sqm, rooms, location, etc.), scrape status, Elo rating, band (or derived from price_per_sqm + rooms).
  - **Comparisons** — winner_id, loser_id, optional timestamp.
- Reachability / transitive logic is not required for ranking when using Elo; pair selection can be “same band, random or least-compared”. If needed later, recursive CTEs in SQLite are sufficient for small graphs.

## Ranking

- **Elo** (not Glicko-2). One rating per flat per band (or one global rating and filter by band for display).
- **Incremental update:** After each comparison (A beats B), update only the two flats’ Elo ratings. No full recomputation job.
- **Bands (Option A):** Rank within **(price_per_sqm_band, room_count)**. Examples: “1-room 1.7–1.9k”, “2-room 1.5–1.8k”. Separate ranking per band so comparisons are fair and “hidden gems” in the same range surface.

## Scraping and jobs

- **BullMQ** for scrape jobs:
  - One job per flat (on add or on Reload). Job: fetch Realt URL HTML, parse price, price/m², rooms, location (and optionally area, one image); write to DB; set status success/error.
  - Worker runs in a separate process (or same Node process with queue consumer). No scheduled “re-scrape all” job; user triggers reload per flat.
- **Realt:** No public API; scrape HTML. Store only what’s needed for bands, cards, and ranking.

## Real-time updates: SSE

- **Server-Sent Events** to push to the client when:
  - Flat scrape **success** — update card with new data.
  - Flat scrape **error** — show error state and Reload.
- New flat added is reflected immediately in the list (card created with “scraping” state); SSE then drives the transition to success/error.
- Implementation: API route holds SSE connection; BullMQ worker (or job completion handler) notifies the SSE layer (e.g. in-memory pub/sub or Redis if multi-instance) so the route can send an event to the client.

## Data to scrape (minimal)

- **Required:** price, price_per_sqm, rooms, location (text or district).
- **Optional:** area (m²), one image URL for card thumbnail.
- Enough for: band assignment, pair selection, card content, and rank display.

## Remove by Realt URL

- Remove flat by matching **realt_url** (exact or normalized). Single input on Add + List screen; no need to find the card in the list first.
