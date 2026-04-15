import { config } from "dotenv";
import path from "path";

// Load .env.local for integration tests that require DB access
config({ path: path.resolve(process.cwd(), ".env.local") });
