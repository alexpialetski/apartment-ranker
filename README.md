# Apartment Ranker

Smart comparison and ranking of flats (Realt.by) in Minsk. Add apartments by URL, compare them in pairs, and get a ranked list within price-per-m² and room-count bands.

## What it does

- **Add & list flats** — Paste a Realt.by listing URL; the app scrapes price, price/m², rooms, and location. Flats appear in a list with live updates when scraping finishes (SSE).
- **Compare** — View two flats from the same band (same room count and price band); choose the better one. Elo ratings are updated incrementally.
- **Rank** — See all successfully scraped flats ordered by Elo within each band (e.g. “1-room, 1.8–2k”, “2-room, 1.5–1.8k”).
- **Manage** — Remove by URL; reload (re-scrape) a single flat from its card.

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — Server layout, request/job flows, directory structure.
- **[CLEAN-ARCHITECTURE.md](./CLEAN-ARCHITECTURE.md)** — Clean Architecture concepts, terms (domain, port, use case, adapter), and how we use them in this project.

## How to run locally

1. **Clone and install**

   ```bash
   npm install
   ```

2. **Environment**
   - Copy `.env.example` to `.env`.
   - Set `DATABASE_URL` (default `file:./db.sqlite` is fine).
   - Set `REDIS_URL` (e.g. `redis://localhost:6379`). The app needs Redis for the scrape queue (BullMQ).

3. **Redis**
   - Start Redis on the host/port you used in `REDIS_URL`. For example:
     ```bash
     docker run -d -p 6379:6379 redis
     ```
   - Or install and run Redis locally (e.g. `redis-server`).

4. **Database**

   ```bash
   npm run db:migrate
   ```

   (Or `npm run db:push` to sync schema without migration files.)

5. **Dev server**
   ```bash
   npm run dev
   ```

   - App: [http://localhost:3000](http://localhost:3000).
   - The BullMQ worker runs in the same process (started via `instrumentation.ts`). Add a Realt.by listing URL on the Add & List screen to enqueue a scrape job and see cards update when the worker finishes.

### Other commands

- `npm run build` — Production build (requires `REDIS_URL` in env).
- `npm run db:studio` — Open Drizzle Studio to inspect the SQLite DB.
- `npm run typecheck` / `npm run check` — Type-check and lint.

---

This is a [T3 Stack](https://create.t3.gg/) project (Next.js, tRPC, Drizzle, Tailwind). See [create.t3.gg](https://create.t3.gg/) for docs and deployment guides.
