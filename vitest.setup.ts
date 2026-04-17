import { config } from "dotenv";
import path from "path";

// Load .env.local for integration tests that require DB access
config({ path: path.resolve(process.cwd(), ".env.local") });

// Extend expect with jest-dom matchers when running in a DOM env
if (typeof window !== "undefined") {
  await import("@testing-library/jest-dom/vitest");
}
