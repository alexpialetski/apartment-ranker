import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { defineConfig } from "vitest/config";

// Set env before app code loads so env validation passes; ensure .tmp exists for DB
const testDbDir = path.join(process.cwd(), ".tmp");
const testDbPath = path.join(testDbDir, "integration.db");
fs.mkdirSync(testDbDir, { recursive: true });
process.env.DATABASE_URL ??= pathToFileURL(testDbPath).href;
process.env.REDIS_URL ??= "redis://localhost:6379";
(process.env as Record<string, string>).NODE_ENV = "test";

export default defineConfig({
	test: {
		environment: "node",
		globals: false,
		setupFiles: ["./tests/setup.ts"],
		include: ["tests/integration/**/*.test.ts", "tests/unit/**/*.test.ts"],
		fileParallelism: false,
	},
	resolve: {
		alias: {
			"~": path.resolve(__dirname, "./src"),
		},
	},
});
