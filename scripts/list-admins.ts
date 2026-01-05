/**
 * Script para listar usuários admin
 * Execute com: npx tsx scripts/list-admins.ts
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL não definida");
  process.exit(1);
}

const conn = postgres(DATABASE_URL);
const db = drizzle(conn, { schema });

async function listAdmins() {
  console.log("\n📋 Listando Administradores\n");

  try {
    // Buscar todos os admins
    const admins = await db.query.users.findMany({
      where: eq(schema.users.role, "admin"),
    });

    if (admins.length === 0) {
      console.log("❌ Nenhum administrador cadastrado");
    } else {
      console.log(`✅ ${admins.length} administrador(es) encontrado(s):\n`);
      admins.forEach((admin, i) => {
        console.log(`${i + 1}. ${admin.name}`);
        console.log(`   Email: ${admin.email}`);
        console.log(`   ID: ${admin.id}`);
        console.log(`   Status: ${admin.approvalStatus}`);
        console.log(`   Verificado: ${admin.emailVerified ? "Sim" : "Não"}`);
        console.log(`   Criado em: ${admin.createdAt}`);
        console.log("");
      });
    }

    // Verificar emails específicos
    console.log("\n🔍 Verificando emails específicos:\n");

    const emailsToCheck = [
      "jeronimo.fabio@gmail.com",
      "rodrigorochameire@gmail.com",
    ];

    for (const email of emailsToCheck) {
      const user = await db.query.users.findFirst({
        where: eq(schema.users.email, email.toLowerCase()),
      });

      if (user) {
        console.log(`✅ ${email}`);
        console.log(`   Nome: ${user.name}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   É admin: ${user.role === "admin" ? "SIM ✓" : "NÃO"}`);
        console.log("");
      } else {
        console.log(`❌ ${email} - Não encontrado no sistema\n`);
      }
    }
  } catch (error) {
    console.error("❌ Erro ao listar admins:", error);
  } finally {
    await conn.end();
  }
}

listAdmins();
