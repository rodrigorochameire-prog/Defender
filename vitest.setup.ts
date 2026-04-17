import { config } from "dotenv";
import path from "path";

// Load .env.local for integration tests that require DB access
config({ path: path.resolve(process.cwd(), ".env.local") });

// Extend expect with jest-dom matchers when running in a DOM env
if (typeof window !== "undefined") {
  await import("@testing-library/jest-dom/vitest");

  // Node 25+ injects its own partial localStorage that lacks clear/removeItem.
  // Patch it with a fully-spec-compliant in-memory implementation so that
  // happy-dom component tests can use localStorage normally.
  if (typeof localStorage.clear !== "function") {
    const store: Record<string, string> = {};
    const patchedLS: Storage = {
      getItem: (key: string) => Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null,
      setItem: (key: string, value: string) => { store[key] = String(value); },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
      key: (index: number) => Object.keys(store)[index] ?? null,
      get length() { return Object.keys(store).length; },
    };
    Object.defineProperty(globalThis, "localStorage", { value: patchedLS, configurable: true, writable: true });
  }
}
