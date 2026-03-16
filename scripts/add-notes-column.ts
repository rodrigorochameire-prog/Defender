import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function main() {
  await db.execute(sql`ALTER TABLE radar_matches ADD COLUMN IF NOT EXISTS notes text`);
  console.log("notes column added to radar_matches");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
