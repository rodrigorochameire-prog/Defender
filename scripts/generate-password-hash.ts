/**
 * Script para gerar hash de senha
 * Execute com: npx tsx scripts/generate-password-hash.ts
 */

import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

async function generateHash() {
  const password = "Defesa9dp*";
  const email = "rodrigorochameire@gmail.com";

  console.log("\n🔐 Gerando hash de senha\n");
  console.log(`Email: ${email}`);
  console.log(`Senha: ${password}`);
  console.log("\n⏳ Processando...\n");

  const hash = await bcrypt.hash(password, SALT_ROUNDS);

  console.log("✅ Hash gerado com sucesso!\n");
  console.log(`Hash: ${hash}\n`);

  // Testar o hash
  const isValid = await bcrypt.compare(password, hash);
  console.log(`Verificação: ${isValid ? "✅ Válido" : "❌ Inválido"}\n`);
}

generateHash();
