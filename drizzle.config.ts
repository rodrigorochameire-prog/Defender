import * as dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

// Carregar variáveis de ambiente
dotenv.config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  console.warn("⚠️ DATABASE_URL não está definida. Configure seu arquivo .env.local");
}

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
  verbose: true,
  strict: true,
});
