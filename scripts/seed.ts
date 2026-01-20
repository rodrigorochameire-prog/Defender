/**
 * Script de seed para popular o banco com dados iniciais
 * Execute com: npx tsx scripts/seed.ts
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as bcrypt from "bcryptjs";
import * as schema from "../src/lib/db/schema";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL não definida");
  process.exit(1);
}

const conn = postgres(DATABASE_URL);
const db = drizzle(conn, { schema });

async function seed() {
  console.log("🌱 Iniciando seed do banco de dados...\n");

  try {
    // 1. Criar usuário admin
    console.log("👤 Criando usuário admin...");
    const adminPasswordHash = await bcrypt.hash("admin123", 10);

    const [admin] = await db
      .insert(schema.users)
      .values({
        name: "Administrador",
        email: "admin@tetecare.com",
        passwordHash: adminPasswordHash,
        role: "admin",
        emailVerified: true,
      })
      .onConflictDoNothing({ target: schema.users.email })
      .returning();

    if (admin) {
      console.log(`   ✓ Admin criado: ${admin.email}`);
    } else {
      console.log("   ⚠ Admin já existe");
    }

    // 2. Criar usuário tutor de exemplo
    console.log("\n👤 Criando usuário tutor...");
    const tutorPasswordHash = await bcrypt.hash("tutor123", 10);

    const [tutor] = await db
      .insert(schema.users)
      .values({
        name: "Maria Silva",
        email: "maria@email.com",
        passwordHash: tutorPasswordHash,
        role: "user",
        phone: "(11) 99999-1234",
        emailVerified: true,
      })
      .onConflictDoNothing({ target: schema.users.email })
      .returning();

    if (tutor) {
      console.log(`   ✓ Tutor criado: ${tutor.email}`);

      // 3. Criar pets de exemplo
      console.log("\n🐕 Criando pets de exemplo...");

      const petsData = [
        {
          name: "Thor",
          breed: "Golden Retriever",
          species: "dog" as const,
          birthDate: new Date("2022-03-15"),
          weight: 32000, // 32kg
          approvalStatus: "approved" as const,
          notes: "Muito amigável e brincalhão",
          credits: 10,
        },
        {
          name: "Luna",
          breed: "Labrador",
          species: "dog" as const,
          birthDate: new Date("2021-08-20"),
          weight: 28000, // 28kg
          approvalStatus: "approved" as const,
          notes: "Adora água e brincar de buscar",
          credits: 5,
        },
        {
          name: "Mia",
          breed: "Persa",
          species: "cat" as const,
          birthDate: new Date("2023-01-10"),
          weight: 4500, // 4.5kg
          approvalStatus: "pending" as const,
          notes: "Gata tranquila, gosta de lugares altos",
          credits: 0,
        },
      ];

      for (const petData of petsData) {
        const [pet] = await db.insert(schema.pets).values(petData).returning();

        // Associar ao tutor
        await db.insert(schema.petTutors).values({
          petId: pet.id,
          tutorId: tutor.id,
          isPrimary: true,
        });

        console.log(`   ✓ Pet criado: ${pet.name} (${pet.species})`);
      }
    } else {
      console.log("   ⚠ Tutor já existe");
    }

    // 4. Criar biblioteca de vacinas
    console.log("\n💉 Criando biblioteca de vacinas...");

    const vaccinesData = [
      { name: "V8/V10 (Polivalente)", description: "Cinomose, Hepatite, Parvovirose, etc.", intervalDays: 21, dosesRequired: 3 },
      { name: "Antirrábica", description: "Vacina contra raiva", intervalDays: 365, dosesRequired: 1 },
      { name: "Giárdia", description: "Vacina contra giardíase", intervalDays: 21, dosesRequired: 2 },
      { name: "Gripe Canina", description: "Tosse dos canis", intervalDays: 365, dosesRequired: 1 },
      { name: "Leishmaniose", description: "Vacina contra leishmaniose", intervalDays: 365, dosesRequired: 1 },
      { name: "V4/V5 (Felina)", description: "Panleucopenia, Rinotraqueíte, Calicivirose", intervalDays: 21, dosesRequired: 3 },
    ];

    for (const vaccine of vaccinesData) {
      await db
        .insert(schema.vaccineLibrary)
        .values(vaccine)
        .onConflictDoNothing();
    }
    console.log(`   ✓ ${vaccinesData.length} vacinas cadastradas`);

    // 5. Criar pacotes de créditos
    console.log("\n💳 Criando pacotes de créditos...");

    const packagesData = [
      { name: "Pacote Básico", credits: 5, priceInCents: 25000, discountPercent: 0, displayOrder: 1 },
      { name: "Pacote Mensal", credits: 10, priceInCents: 45000, discountPercent: 10, displayOrder: 2 },
      { name: "Pacote Trimestral", credits: 30, priceInCents: 120000, discountPercent: 20, displayOrder: 3 },
      { name: "Pacote Semestral", credits: 60, priceInCents: 210000, discountPercent: 30, displayOrder: 4 },
    ];

    for (const pkg of packagesData) {
      await db
        .insert(schema.creditPackages)
        .values(pkg)
        .onConflictDoNothing();
    }
    console.log(`   ✓ ${packagesData.length} pacotes cadastrados`);

    console.log("\n✅ Seed concluído com sucesso!\n");
    console.log("📋 Credenciais de acesso:");
    console.log("   Admin: admin@tetecare.com / admin123");
    console.log("   Tutor: maria@email.com / tutor123");
  } catch (error) {
    console.error("❌ Erro no seed:", error);
    throw error;
  } finally {
    await conn.end();
  }
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
