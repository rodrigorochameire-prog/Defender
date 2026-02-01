/**
 * Script de Seed - Defensores da Defensoria de Camaçari
 * 
 * Este script cria/atualiza os defensores:
 * 
 * NÚCLEO ESPECIALIZADOS (Júri, VD, EP):
 * - Dr. Rodrigo (Admin, Titular)
 * - Dra. Juliane (Titular)
 * 
 * VARAS CRIMINAIS:
 * - Dr. Danilo (1ª Vara Criminal)
 * - Dra. Cristiane (2ª Vara Criminal)
 * 
 * Uso:
 *   npx tsx scripts/seed-defensores-camacari.ts
 * 
 * IMPORTANTE: Modifique as senhas antes de usar em produção!
 */

import { db } from "../src/lib/db";
import { users } from "../src/lib/db/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

const DEFENSORES = [
  // Núcleo Especializados
  {
    name: "Dr. Rodrigo",
    email: "rodrigo@defender.app",
    role: "defensor",
    funcao: "defensor_titular",
    oab: "BA12345",
    comarca: "Camaçari",
    phone: "(71) 99999-1111",
    nucleo: "ESPECIALIZADOS",
    isAdmin: true, // Administrador geral
    podeVerTodosAssistidos: true,
    podeVerTodosProcessos: true,
  },
  {
    name: "Dra. Juliane",
    email: "juliane@defender.app",
    role: "defensor",
    funcao: "defensor_titular",
    oab: "BA12346",
    comarca: "Camaçari",
    phone: "(71) 99999-2222",
    nucleo: "ESPECIALIZADOS",
    isAdmin: false,
    podeVerTodosAssistidos: true,
    podeVerTodosProcessos: true,
  },
  // 1ª Vara Criminal
  {
    name: "Dra. Cristiane",
    email: "cristiane@defender.app",
    role: "defensor",
    funcao: "defensor_titular",
    oab: "BA23456",
    comarca: "Camaçari",
    phone: "(71) 99999-7777",
    nucleo: "VARA_1",
    isAdmin: false,
    podeVerTodosAssistidos: true, // Pode ver todos assistidos
    podeVerTodosProcessos: true,  // Pode ver todos processos
    // MAS: demandas são privadas por padrão
  },
  // 2ª Vara Criminal
  {
    name: "Dr. Danilo",
    email: "danilo@defender.app",
    role: "defensor",
    funcao: "defensor_titular",
    oab: "BA23457",
    comarca: "Camaçari",
    phone: "(71) 99999-8888",
    nucleo: "VARA_2",
    isAdmin: false,
    podeVerTodosAssistidos: true,
    podeVerTodosProcessos: true,
  },
];

// Senha padrão (MUDAR EM PRODUÇÃO!)
const DEFAULT_PASSWORD = "Defender@2024";

async function seedDefensores() {
  console.log("🏛️ Defensoria de Camaçari - Seed de Defensores\n");
  console.log("================================================\n");

  // Hash da senha padrão
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  for (const defensor of DEFENSORES) {
    try {
      // Verificar se já existe
      const existing = await db.query.users.findFirst({
        where: eq(users.email, defensor.email),
      });

      if (existing) {
        // Atualizar dados existentes
        await db.update(users)
          .set({
            name: defensor.name,
            role: defensor.role,
            funcao: defensor.funcao,
            phone: defensor.phone,
            oab: defensor.oab,
            comarca: defensor.comarca,
            nucleo: defensor.nucleo,
            isAdmin: defensor.isAdmin,
            podeVerTodosAssistidos: defensor.podeVerTodosAssistidos,
            podeVerTodosProcessos: defensor.podeVerTodosProcessos,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existing.id));

        const adminBadge = defensor.isAdmin ? " [ADMIN]" : "";
        console.log(`  ✓ Atualizado: ${defensor.name}${adminBadge}`);
        console.log(`    └─ Núcleo: ${defensor.nucleo}`);
      } else {
        // Criar novo
        await db.insert(users)
          .values({
            name: defensor.name,
            email: defensor.email,
            passwordHash,
            role: defensor.role,
            funcao: defensor.funcao,
            phone: defensor.phone,
            oab: defensor.oab,
            comarca: defensor.comarca,
            nucleo: defensor.nucleo,
            isAdmin: defensor.isAdmin,
            podeVerTodosAssistidos: defensor.podeVerTodosAssistidos,
            podeVerTodosProcessos: defensor.podeVerTodosProcessos,
            emailVerified: true,
            approvalStatus: "approved",
          });

        const adminBadge = defensor.isAdmin ? " [ADMIN]" : "";
        console.log(`  ✓ Criado: ${defensor.name}${adminBadge}`);
        console.log(`    └─ Núcleo: ${defensor.nucleo}`);
      }
    } catch (error) {
      console.error(`  ✗ Erro em ${defensor.name}:`, error);
    }
  }

  console.log("\n================================================");
  console.log("\n📋 Resumo da Estrutura:\n");
  console.log("  NÚCLEO ESPECIALIZADOS (Júri, VD, EP):");
  console.log("    • Dr. Rodrigo (Admin)");
  console.log("    • Dra. Juliane");
  console.log("");
  console.log("  1ª VARA CRIMINAL:");
  console.log("    • Dra. Cristiane");
  console.log("");
  console.log("  2ª VARA CRIMINAL:");
  console.log("    • Dr. Danilo");
  console.log("");
  console.log("================================================");
  console.log("\n📌 Configurações de Acesso:\n");
  console.log("  ✓ COMPARTILHADO: Assistidos, Processos, Casos, Drive");
  console.log("  ✗ PRIVADO: Demandas/Prazos (cada um vê só as suas)");
  console.log("  ✗ PRIVADO: Equipe (cada defensor gerencia a sua)");
  console.log("");
  console.log("  💡 Afastamentos: Ao ativar cobertura, o substituto");
  console.log("     ganha acesso temporário às demandas do afastado.");
  console.log("");
  console.log("================================================");
  console.log(`\n🔐 Credenciais de acesso:`);
  console.log(`   Senha: ${DEFAULT_PASSWORD}`);
  console.log(`   Emails:`);
  DEFENSORES.forEach(d => {
    console.log(`     - ${d.email}`);
  });
  
  process.exit(0);
}

// Executar
seedDefensores().catch((error) => {
  console.error("Erro fatal:", error);
  process.exit(1);
});
