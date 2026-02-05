# Business Flows

## Add flat

1. User pastes Realt URL in “Add by URL” and submits.
2. System creates a flat row with `realt_url`, status **scraping** (or pending). No price/rooms yet.
3. System enqueues a BullMQ job to scrape that URL.
4. UI: new card appears in the list with loading indicator (no full page reload).
5. When job completes:
   - **Success:** Worker updates flat (price, price_per_sqm, rooms, location, etc.), sets status **success**. SSE sends “flat_scraping_success”; client updates card (or refetches that flat).
   - **Error:** Worker sets status **error**. SSE sends “flat_scraping_error”; client shows error state and Reload on card.
6. Only after **success** does the flat appear in Compare and Rank.

---

## Remove flat

1. User pastes Realt URL in “Remove by URL” and submits (on Add + List screen).
2. System finds flat by `realt_url` and deletes it (or soft-deletes).
3. Flat disappears from list (and from Rank if it was there). Comparisons that referenced it can remain in DB for history; ranking only considers existing flats.

---

## Compare (record choice)

1. User is on Compare screen. System selects two flats from the **same band** (same room count + same price_per_sqm_band), e.g. random or least-compared in that band.
2. User sees two cards (Realt link, price, rooms, etc.) and chooses “Left” or “Right”.
3. System records one comparison row: winner_id, loser_id.
4. System updates **Elo** for the two flats only (incremental update).
5. Next pair is chosen (same band). No full recomputation.

---

## Rank view

1. User opens Rank screen.
2. System loads only **successfully scraped** flats, grouped by band (rooms + price_per_sqm_band).
3. Within each band, flats are ordered by **Elo rating** (already stored; no recompute).
4. User can open Realt from row, or use Reload/Remove on card if exposed there.

---

## Reload (re-scrape one flat)

1. User clicks **Reload** on a card (List or Rank).
2. System enqueues one BullMQ scrape job for that flat.
3. Card shows **scraping** state (same indicator as on add).
4. On job completion: SSE sends success or error; card updates as in “Add flat” step 5.
5. If success, updated data (e.g. price) is reflected in list and rank.

---

## Rank only existing flats

- **Compare** and **Rank** use only flats that exist in the DB and have **scrape status = success**.
- Unscraped (pending/scraping/error) flats are visible only on the **Add + List** screen.
