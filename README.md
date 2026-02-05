# Apartment Ranker

Smart comparison and ranking of flats (Realt.by) in Minsk. Add by URL, compare in pairs, get a ranked list within price and room-count bands.

**Project documentation (requirements, UX, tech, flows):**

- [REQUIREMENTS.md](./REQUIREMENTS.md) — Overview and index
- [UX-REQUIREMENTS.md](./UX-REQUIREMENTS.md) — Screens and UX
- [TECH-DECISIONS.md](./TECH-DECISIONS.md) — Stack and algorithms
- [BUSINESS-FLOWS.md](./BUSINESS-FLOWS.md) — Add, remove, compare, rank, scrape
- [ROADMAP.md](./ROADMAP.md) — Implementation roadmap

---

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

**Troubleshooting: flat stuck on “Scraping…”**

- In the terminal where `npm run dev` is running you should see:
  - `[apartment-ranker] Scrape worker started (listening for jobs)` when the server starts.
  - `[scrape-flats] Processing job for flatId: <id>` when a job is picked up.
  - `[scrape-flats] Done for flatId <id> success|error` when the scrape finishes.
- If you never see “Scrape worker started”, the worker did not start (e.g. instrumentation not running or Redis connection failed on startup). Check that `REDIS_URL` in `.env` is correct and Redis is reachable.
- If you see “Processing job” but never “Done”, the scraper may be timing out (e.g. Realt.by slow or blocking). After ~25s the job should fail and the card will show “Couldn’t load” with a Reload button. Check the terminal for `[scrape-flats] Scraper threw...` or `Scrape failed for flat`.
- If the worker never logs “Processing job”, jobs are not being consumed (same Redis? wrong queue?). Restart the dev server and try adding a flat again.

**Other commands**

- `npm run build` — Production build (requires `REDIS_URL` in env).
- `npm run db:studio` — Open Drizzle Studio to inspect the SQLite DB.
- `npm run typecheck` / `npm run check` — Type-check and lint.

---

This is a [T3 Stack](https://create.t3.gg/) project bootstrapped with `create-t3-app`.

## What's next? How do I make an app with this?

We try to keep this project as simple as possible, so you can start with just the scaffolding we set up for you, and add additional things later when they become necessary.

If you are not familiar with the different technologies used in this project, please refer to the respective docs. If you still are in the wind, please join our [Discord](https://t3.gg/discord) and ask for help.

- [Next.js](https://nextjs.org)
- [NextAuth.js](https://next-auth.js.org)
- [Prisma](https://prisma.io)
- [Drizzle](https://orm.drizzle.team)
- [Tailwind CSS](https://tailwindcss.com)
- [tRPC](https://trpc.io)

## Learn More

To learn more about the [T3 Stack](https://create.t3.gg/), take a look at the following resources:

- [Documentation](https://create.t3.gg/)
- [Learn the T3 Stack](https://create.t3.gg/en/faq#what-learning-resources-are-currently-available) — Check out these awesome tutorials

You can check out the [create-t3-app GitHub repository](https://github.com/t3-oss/create-t3-app) — your feedback and contributions are welcome!

## How do I deploy this?

Follow our deployment guides for [Vercel](https://create.t3.gg/en/deployment/vercel), [Netlify](https://create.t3.gg/en/deployment/netlify) and [Docker](https://create.t3.gg/en/deployment/docker) for more information.
