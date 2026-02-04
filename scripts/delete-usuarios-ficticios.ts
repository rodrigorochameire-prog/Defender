/**
 * Script para APAGAR os usuários fictícios criados erroneamente
 * 
 * Execução: DATABASE_URL="..." npx tsx scripts/delete-usuarios-ficticios.ts
 */

import { db } from "@/lib/db";
import { profissionais, users } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";

// Emails dos usuários fictícios a serem removidos
const EMAILS_FICTICIOS = [
  "rodrigo@defender.app",
  "juliane@defender.app",
  "cristiane@defender.app",
  "danilo@defender.app",
  "emilly@defender.app",
  "taissa@defender.app",
  "servidor@defender.app",
  "triagem@defender.app",
];

async function deleteUsuariosFicticios() {
  console.log("\n╔════════════════════════════════════════════════════════════════╗");
  console.log("║       🗑️  OMBUDS - Remoção de Usuários Fictícios              ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  try {
    // 1. Buscar IDs dos profissionais a serem removidos
    console.log("📋 Buscando profissionais fictícios...\n");
    
    const profissionaisParaRemover = await db
      .select({ id: profissionais.id, nome: profissionais.nome, email: profissionais.email })
      .from(profissionais)
      .where(inArray(profissionais.email, EMAILS_FICTICIOS));

    if (profissionaisParaRemover.length === 0) {
      console.log("  ℹ️  Nenhum profissional fictício encontrado.\n");
    } else {
      console.log(`  Encontrados ${profissionaisParaRemover.length} profissionais fictícios:\n`);
      for (const p of profissionaisParaRemover) {
        console.log(`    - ${p.nome} (${p.email})`);
      }

      // 2. Remover profissionais
      console.log("\n📋 Removendo profissionais...\n");
      
      const deletedProfissionais = await db
        .delete(profissionais)
        .where(inArray(profissionais.email, EMAILS_FICTICIOS))
        .returning({ id: profissionais.id, nome: profissionais.nome });

      for (const p of deletedProfissionais) {
        console.log(`  ✓ Removido: ${p.nome}`);
      }
    }

    // 3. Buscar e remover usuários (tabela users)
    console.log("\n📋 Buscando usuários fictícios na tabela users...\n");
    
    const usersParaRemover = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(inArray(users.email, EMAILS_FICTICIOS));

    if (usersParaRemover.length === 0) {
      console.log("  ℹ️  Nenhum usuário fictício encontrado na tabela users.\n");
    } else {
      console.log(`  Encontrados ${usersParaRemover.length} usuários fictícios:\n`);
      for (const u of usersParaRemover) {
        console.log(`    - ${u.name} (${u.email})`);
      }

      // 4. Remover usuários
      console.log("\n📋 Removendo usuários...\n");
      
      const deletedUsers = await db
        .delete(users)
        .where(inArray(users.email, EMAILS_FICTICIOS))
        .returning({ id: users.id, name: users.name });

      for (const u of deletedUsers) {
        console.log(`  ✓ Removido: ${u.name}`);
      }
    }

    console.log("\n╔════════════════════════════════════════════════════════════════╗");
    console.log("║              ✅ REMOÇÃO CONCLUÍDA COM SUCESSO                  ║");
    console.log("╚════════════════════════════════════════════════════════════════╝\n");

  } catch (error) {
    console.error("\n❌ Erro durante a remoção:", error);
    throw error;
  }
}

// Executar
deleteUsuariosFicticios()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
