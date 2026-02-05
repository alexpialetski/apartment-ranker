# UX Requirements

## Screens

### 1. Add Flat + Flats List (combined)

Single screen that combines adding flats and viewing the full list.

**Top section**

- **Add by URL** — Input for Realt URL. On submit: flat is created, scrape job is enqueued, a new card appears in the list with a loading state. No redirect; list updates in place.
- **Remove by URL** — Input for Realt URL. On submit: flat matching that URL is removed from the system. Quick way to remove (e.g. sold) without searching the list.

**List**

- All flats in the system: scraping, success, and error states.
- **Only on this screen** do we show flats that are not yet successfully scraped (pending/scraping/error). Compare and Rank show only successfully scraped flats.

**Card (in list)**

- **Scraping:** Loading indicator (e.g. spinner or skeleton), optional “Scraping…” text.
- **Success:** Price, price/m², rooms, location, link to Realt page, **Reload** button, (optional) Remove. Card is clickable or has explicit “Open on Realt”.
- **Error:** “Couldn’t load” (or similar), **Reload** button to re-enqueue scrape.

**Real-time updates**

- Use **SSE** so that when a scrape job completes, the client receives an event and updates the card:
  - New flat added → card already in list with loading.
  - Scraping success → update card with scraped data.
  - Scraping error → show error state and Reload.

---

### 2. Compare

- Two cards side by side (or stacked on mobile). User chooses “Left” or “Right” (which is better).
- **Only successfully scraped flats** are eligible for comparison (same band: same room count + same price-per-m² band).
- **On cards:** Price, price/m², rooms, location, **link to Realt page** (open listing in new tab). **No Reload, no Remove** on these cards to keep focus on the choice.
- Optional: “Skip / Can’t decide” to skip the pair without recording a result.

---

### 3. Rank

- Ordered list(s) of flats by **Elo rating within band** (e.g. “1-room, 1.8–2k”, “2-room, 1.5–1.8k”).
- **Only successfully scraped flats** appear here.
- Each row/card: position, key info, link to Realt, **Reload**, **Remove** (or rely on “Remove by URL” from the main screen).
- If a flat is currently being re-scraped (Reload pressed), show scraping indicator on that card.

---

## Summary: Where things appear

| Element | Add + List | Compare | Rank |
|--------|------------|---------|------|
| Realt link on card | Yes | Yes | Yes |
| Scraping indicator | Yes | N/A (only scraped flats) | Yes (when Reload in progress) |
| Reload button | Yes | No | Yes |
| Remove (by URL or on card) | Yes (by URL at top; optional on card) | No | Yes (optional on card) |
| Show unscraped flats | Yes | No | No |

---

## Scraping states (per flat)

- **Scraping** — Job in progress. Show loading on card (List; and Rank if Reload was pressed).
- **Success** — Data loaded. Card shows full info; flat can appear in Compare and Rank.
- **Error** — Last scrape failed. Show message + Reload on card (List only, unless we allow error state in Rank).
