import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { creditPackages } from "../drizzle/schema.js";
import dotenv from "dotenv";

dotenv.config();

const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client);

const packages = [
  {
    name: "Diária Avulsa",
    description: "1 crédito para 1 dia de creche",
    credits: 1,
    priceInCents: 8000, // R$ 80,00
    discountPercent: 0,
    isActive: true,
    displayOrder: 1,
  },
  {
    name: "Pacote Semanal",
    description: "5 créditos para 5 dias de creche (10% de desconto)",
    credits: 5,
    priceInCents: 36000, // R$ 360,00 (R$ 72/dia)
    discountPercent: 10,
    isActive: true,
    displayOrder: 2,
  },
  {
    name: "Pacote Quinzenal",
    description: "10 créditos para 10 dias de creche (15% de desconto)",
    credits: 10,
    priceInCents: 68000, // R$ 680,00 (R$ 68/dia)
    discountPercent: 15,
    isActive: true,
    displayOrder: 3,
  },
  {
    name: "Pacote Mensal",
    description: "20 créditos para 20 dias de creche (20% de desconto)",
    credits: 20,
    priceInCents: 128000, // R$ 1.280,00 (R$ 64/dia)
    discountPercent: 20,
    isActive: true,
    displayOrder: 4,
  },
  {
    name: "Pacote Premium",
    description: "30 créditos para 30 dias de creche (25% de desconto)",
    credits: 30,
    priceInCents: 180000, // R$ 1.800,00 (R$ 60/dia)
    discountPercent: 25,
    isActive: true,
    displayOrder: 5,
  },
];

async function seed() {
  console.log("🌱 Seeding credit packages...");

  try {
    for (const pkg of packages) {
      await db.insert(creditPackages).values(pkg);
      console.log(`✅ Created package: ${pkg.name}`);
    }

    console.log("✅ All packages created successfully!");
  } catch (error) {
    console.error("❌ Error seeding packages:", error);
    await client.end();
    process.exit(1);
  }

  await client.end();
  process.exit(0);
}

seed();
