import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema";

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  const db = drizzle(connection, { schema, mode: "default" });

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

  await connection.end();
}

main().catch(console.error);
