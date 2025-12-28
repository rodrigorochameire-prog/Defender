/**
 * Script para criar um usuário admin
 * Execute com: npx tsx scripts/create-admin.ts
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as bcrypt from "bcryptjs";
import * as readline from "readline";
import * as schema from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL não definida");
  process.exit(1);
}

const conn = postgres(DATABASE_URL);
const db = drizzle(conn, { schema });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function createAdmin() {
  console.log("\n👤 Criar Usuário Administrador\n");

  try {
    const name = await question("Nome: ");
    const email = await question("Email: ");
    const password = await question("Senha (mín. 6 caracteres): ");

    if (!name || !email || !password) {
      console.error("❌ Todos os campos são obrigatórios");
      return;
    }

    if (password.length < 6) {
      console.error("❌ Senha deve ter no mínimo 6 caracteres");
      return;
    }

    // Verificar se email já existe
    const existing = await db.query.users.findFirst({
      where: eq(schema.users.email, email.toLowerCase()),
    });

    if (existing) {
      console.error("❌ Este email já está cadastrado");
      return;
    }

    // Criar admin
    const passwordHash = await bcrypt.hash(password, 10);

    const [admin] = await db
      .insert(schema.users)
      .values({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        role: "admin",
        emailVerified: true,
      })
      .returning();

    console.log("\n✅ Admin criado com sucesso!");
    console.log(`   ID: ${admin.id}`);
    console.log(`   Nome: ${admin.name}`);
    console.log(`   Email: ${admin.email}`);
  } catch (error) {
    console.error("❌ Erro ao criar admin:", error);
  } finally {
    rl.close();
    await conn.end();
  }
}

createAdmin();
