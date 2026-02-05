# Apartment Ranker — Requirements Overview

Personal app for **smart comparison and ranking of flats** (Realt.by listings) in Minsk. Add apartments by URL, compare them in pairs, and get a ranked list within price-per-m² and room-count bands.

## Goal

- Add flats by Realt URL; scrape minimal data (price, price/m², rooms, location).
- Compare two flats at a time and choose the better one; use **Elo** to build a ranking.
- Rank **only scraped flats**, within **bands** (price per m² + number of rooms) so comparisons are fair (e.g. 1-room vs 1-room, similar price range).
- Manage list: add, remove by URL, reload (re-scrape) a single flat. No scheduled full re-scrape.

## Documentation Index

| Document | Contents |
|----------|----------|
| [UX-REQUIREMENTS.md](./UX-REQUIREMENTS.md) | Screens, components, where actions appear, scraping states |
| [TECH-DECISIONS.md](./TECH-DECISIONS.md) | Stack, storage, ranking algorithm, jobs, SSE |
| [BUSINESS-FLOWS.md](./BUSINESS-FLOWS.md) | Add, remove, compare, rank, scrape lifecycle |

## Out of Scope (for now)

- Full recomputation of Elo from scratch (incremental update only).
- Scheduled re-scrape of all flats (user triggers reload per flat).
- Public API or multi-user; single user (owner) only.
