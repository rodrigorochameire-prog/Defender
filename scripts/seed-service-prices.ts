import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../drizzle/schema";

async function main() {
  const client = postgres(process.env.DATABASE_URL!);
  const db = drizzle(client, { schema, mode: "default" });

  console.log("🌱 Seeding service prices...");

  // Check if prices already exist
  const existing = await db.select().from(schema.servicePrices);

  if (existing.length === 0) {
    await db.insert(schema.servicePrices).values([
      {
        serviceType: "creche",
        priceInCents: 6000, // R$ 60
        description: "Creche - Passar o dia (sem pernoite)",
        isActive: true,
      },
      {
        serviceType: "diaria",
        priceInCents: 8000, // R$ 80
        description: "Diária - Com pernoite",
        isActive: true,
      },
    ]);
    console.log("✅ Service prices seeded successfully!");
  } else {
    console.log("ℹ️  Service prices already exist, skipping...");
  }

  await client.end();
}

main().catch(console.error);
