# Clean Architecture in This Project

This document explains **Clean Architecture** (concepts, terms, and rules) and how we apply them in Apartment Ranker. It is aimed at newcomers who want to understand both the ideas and the concrete code.

For how the server is laid out (slices, request flow, directory tree), see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## What is Clean Architecture?

Clean Architecture (Uncle Bob) structures the code so that:

1. **Business logic does not depend on frameworks or infrastructure.** You can swap the database, queue, or UI without rewriting the core rules.
2. **Dependencies point inward.** The centre (domain and use cases) knows nothing about HTTP, SQL, or Redis; the outer layers depend on the centre and implement its interfaces.
3. **Testing is straightforward.** Use cases depend only on interfaces (ports); in tests you pass fakes or mocks instead of real DBs and queues.

We combine it with a **feature-sliced** layout: code is grouped by feature (flat, comparison, ranking, scraping) instead of by technical layer (all “repositories” in one place). Each slice has its own domain, ports, use cases, and adapters.

---

## Core Terms and Definitions

### 1. Domain

**Definition:** The heart of the application. Domain is the set of **entities**, **value types**, and **business rules** that describe the problem, with no reference to databases, HTTP, or frameworks.

**In this project:**

- Domain lives in `domain/` inside each feature slice (and in `shared/lib` for cross-cutting types).
- Domain files contain only TypeScript types, constants, and pure functions. No `import` from Drizzle, Redis, `fetch`, or Next.js.

**Example — Flat entity** (`src/server/flat/domain/flat.ts`):

```ts
export type ScrapeStatus = "pending" | "scraping" | "success" | "error";

export interface Flat {
	id: number;
	realtUrl: string;
	price: number | null;
	pricePerSqm: number | null;
	rooms: number | null;
	location: string | null;
	// ...
	scrapeStatus: ScrapeStatus;
	eloRating: number;
	band: string | null;
	createdAt: Date;
	updatedAt: Date | null;
	deletedAt: Date | null;
}
```

**Example — Comparison entity** (`src/server/comparison/domain/comparison.ts`): defines what a “comparison” (winner/loser) is. No DB or API there.

**Rule of thumb:** If you can’t run it without a database or network, it doesn’t belong in domain.

---

### 2. Port

**Definition:** A **port** is an interface that describes *what* the application needs from the outside world (e.g. “save a flat”, “enqueue a scrape job”) without saying *how* it is done. The centre depends on ports; something on the outside implements them.

**In this project:**

- Ports are TypeScript **interfaces** in `port/` folders.
- They are named with an `I` prefix when they represent a “repository” or “service” (e.g. `IFlatRepository`, `IScrapeJobQueue`).
- Use cases and domain types may import ports; ports never import adapters or infrastructure.

**Example — Flat repository port** (`src/server/flat/port/flat.repository.ts`):

```ts
import type { Flat, ScrapeStatus } from "~/server/flat/domain/flat";

export interface IFlatRepository {
	findByRealtUrl(url: string): Promise<Flat | null>;
	findById(id: number): Promise<Flat | null>;
	create(data: { realtUrl: string; scrapeStatus: ScrapeStatus }): Promise<Flat>;
	update(id: number, data: Partial<FlatUpdate>): Promise<Flat>;
	deleteByRealtUrl(url: string): Promise<boolean>;
	listAll(): Promise<Flat[]>;
	listSuccessByBand(band: string): Promise<Flat[]>;
	// ...
}
```

**Example — Scrape job queue port** (`src/server/shared/port/scrape-job.queue.ts`):

```ts
export interface IScrapeJobQueue {
	add(flatId: number): Promise<void>;
}
```

**Example — Scraper port** (`src/server/scraping/port/scraper.port.ts`):

```ts
import type { ScrapeResult } from "~/server/shared/lib/scrape-result";

export interface IRealtScraper {
	scrape(url: string): Promise<ScrapeResult>;
}
```

Use cases depend on these interfaces; they don’t care whether the implementation uses Drizzle, BullMQ, or a fake for tests.

---

### 3. Use Case

**Definition:** A **use case** is a single application action (e.g. “add flat by URL”, “submit comparison”). It orchestrates the flow: it calls ports to read/write data and to trigger side effects, and it contains the business rules for that action. It does not import frameworks or infrastructure—only domain types and ports.

**In this project:**

- Use cases are **plain async functions** in `use-cases/` folders.
- Signature: `(deps, input) => Promise<output>`. Dependencies (repos, queues, etc.) are passed in via `deps`; the function does not import adapters.
- They throw domain-level errors (e.g. `AlreadyExistsError`) that the API layer can map to HTTP or tRPC codes.

**Example — Add flat by URL** (`src/server/flat/use-cases/add-flat-by-url.ts`):

```ts
import type { Flat } from "~/server/flat/domain/flat";
import type { IFlatRepository } from "~/server/flat/port/flat.repository";
import type { IScrapeJobQueue } from "~/server/shared/port/scrape-job.queue";

export interface AddFlatByUrlDeps {
	flatRepo: IFlatRepository;
	scrapeQueue: IScrapeJobQueue;
	normalizeUrl: (url: string) => string;
}

export async function addFlatByUrl(
	deps: AddFlatByUrlDeps,
	input: { realtUrl: string },
): Promise<Flat> {
	const normalized = deps.normalizeUrl(input.realtUrl);
	const existingActive = await deps.flatRepo.findByRealtUrl(normalized);
	if (existingActive) throw new AlreadyExistsError("A flat with this URL already exists");
	// ... restore soft-deleted or create new flat ...
	await deps.scrapeQueue.add(flat.id);
	return flat;
}
```

**Example — Get ranked flats** (`src/server/ranking/use-cases/get-ranked-flats.ts`): depends only on `IFlatRepository` and `getAllBandLabels`; no DB or queue imports.

**Rule of thumb:** A use case talks to the world only through `deps` (ports). No `db.query`, no `redis.publish`, no `fetch` inside the use case.

---

### 4. Adapter

**Definition:** An **adapter** implements a port. It translates between the application’s domain (types, method names) and a specific technology (e.g. Drizzle, BullMQ, HTTP). All “dirty” details (SQL, Redis, parsing HTML) live in adapters.

**In this project:**

- Adapters live in `adapter/` folders (e.g. `flat/adapter/`, `scraping/adapter/`).
- They implement the port interfaces and import infrastructure (DB schema, queue client, `fetch`). They map DB rows or API responses to domain types (e.g. `Flat`).
- Only the **composition root** (and tests) instantiates adapters; use cases never do.

**Example — Drizzle flat repository** (`src/server/flat/adapter/drizzle-flat.repository.ts`):

- Implements `IFlatRepository`.
- Uses Drizzle and the shared DB schema to run queries.
- Has a `rowToFlat()` that maps DB row → `Flat` (domain type).
- Exported as a factory: `createFlatRepository(db)` so composition can inject the DB.

**Example — BullMQ scrape queue** (`src/server/scraping/adapter/bullmq-scrape-job.queue.ts`): implements `IScrapeJobQueue` by calling BullMQ. **Example — Realt scraper** (`src/server/scraping/adapter/realt-scraper.adapter.ts`): implements `IRealtScraper` by fetching Realt.by and parsing with Cheerio.

So: **port = contract**, **adapter = implementation**. Swap the adapter (e.g. different DB or queue) without changing use cases.

---

### 5. Composition Root

**Definition:** The **composition root** is the single place where the application is “wired”: where adapters are created and injected into use cases. All dependencies are assembled there, so the rest of the code stays free of “who creates what”.

**In this project:**

- The composition root is `src/server/app/composition.ts`.
- `buildUseCases(deps?)` creates all adapters (flat repo, comparison repo, scrape queue, scraper, event publisher, band config) and returns an object of use-case functions, each already bound to the right dependencies.
- `getUseCases()` returns a singleton container so that tRPC context and the BullMQ worker both use the same use cases.

**Example — Wiring** (excerpt from `composition.ts`):

```ts
const flatRepo = createFlatRepository(database);
const scrapeQueue = deps?.scrapeQueue ?? createScrapeJobQueue();
const scraper = createRealtScraperAdapter();
// ...

return {
	addFlatByUrl: (input) =>
		addFlatByUrlUC.addFlatByUrl(
			{ flatRepo, scrapeQueue, normalizeUrl: normalizeRealtUrl },
			input,
		),
	// ...
};
```

tRPC routers and the worker never instantiate repos or queues; they call `getUseCases().addFlatByUrl(input)` and the composition root ensures the right adapters are behind the ports.

---

### 6. Dependency Rule

**Definition:** Source code dependencies may only point **inward**. The centre (domain, use cases, ports) must not depend on the outer layers (adapters, HTTP, DB, queue). So:

- Domain and use cases **do not** import from adapters or infrastructure.
- Adapters **do** import from domain/ports (to implement the interface) and from infrastructure (to do the actual work).

**In this project:**

- **shared** does not depend on any feature slice.
- **flat** depends only on **shared**.
- **comparison** and **ranking** depend on **flat** (via its port) and **shared**.
- **scraping** depends on **flat** (port) and **shared**.
- **app** (composition, worker) and **api** (tRPC) depend on all slices and shared; they are the “outer” layers that wire and expose use cases.

Convention: use cases and domain never contain `import ... from "~/server/.../adapter/..."` or `".../infrastructure/..."` (except shared types like `ScrapeResult` in `shared/lib`). If a use case needs “something that can do X”, we define a port in the same slice or in shared and implement it in an adapter.

---

## How It Fits Together (One Request)

1. **Client** calls a tRPC procedure (e.g. `flat.addByUrl`).
2. **API** (router) gets `getUseCases()` from context and calls `getUseCases().addFlatByUrl(input)`.
3. **Composition** has already built the container: `addFlatByUrl` is `addFlatByUrlUC.addFlatByUrl({ flatRepo, scrapeQueue, normalizeUrl }, input)`.
4. **Use case** runs: it uses `deps.flatRepo` and `deps.scrapeQueue` (ports). It doesn’t know they are Drizzle and BullMQ.
5. **Adapters** (behind the ports) do the real work: flat repo writes to SQLite, scrape queue enqueues a job in Redis.
6. **Use case** returns a `Flat` (domain type); the API returns it to the client.

The same use cases are used by the **BullMQ worker** (e.g. `processScrapeJob`): the worker gets `getUseCases()` and calls `processScrapeJob({ flatId })`. No duplicate business logic.

---

## Summary Table

| Term            | What it is                          | In this project                                      |
|-----------------|-------------------------------------|------------------------------------------------------|
| **Domain**      | Entities and rules, no infra        | `domain/*.ts`, `shared/lib` types and pure functions |
| **Port**        | Interface for “what we need”        | `port/*.ts` (e.g. `IFlatRepository`, `IScrapeJobQueue`) |
| **Use case**    | One app action; uses only ports    | `use-cases/*.ts` — `(deps, input) => Promise<output>` |
| **Adapter**     | Implements a port with real tech   | `adapter/*.ts` (Drizzle, BullMQ, Realt HTTP)         |
| **Composition root** | Wires adapters → use cases   | `server/app/composition.ts` — `buildUseCases()`      |
| **Dependency rule**  | Dependencies point inward    | Domain/use cases never import adapters or infra     |

For diagrams and the full directory layout, see [ARCHITECTURE.md](./ARCHITECTURE.md).
