/**
 * Runs before each test file. Ensures test env is set so env.js validation passes
 * when app code is imported.
 */
import path from "node:path";
import { pathToFileURL } from "node:url";

const testDbPath = path.join(process.cwd(), ".tmp", "integration.db");
if (!process.env.DATABASE_URL) {
	process.env.DATABASE_URL = pathToFileURL(testDbPath).href;
}
if (!process.env.REDIS_URL) {
	process.env.REDIS_URL = "redis://localhost:6379";
}
(process.env as Record<string, string>).NODE_ENV = "test";
