/**
 * Script de Seed - Todos os Usuários da Defensoria de Camaçari
 * 
 * Este script cria/atualiza TODOS os usuários do sistema OMBUDS:
 * 
 * NÚCLEO ESPECIALIZADOS (Júri, VVD, EP):
 * - Dr. Rodrigo (Admin, Defensor Titular) - Supervisor de Emilly
 * - Dra. Juliane (Defensora Titular) - Supervisora de Taíssa
 * 
 * VARAS CRIMINAIS:
 * - Dra. Cristiane (1ª Vara Criminal)
 * - Dr. Danilo (2ª Vara Criminal)
 * 
 * ESTAGIÁRIOS:
 * - Emilly (Estagiária - vinculada a Dr. Rodrigo)
 * - Taíssa (Estagiária - vinculada a Dra. Juliane)
 * 
 * SERVIDORES:
 * - Servidor (Administrativo)
 * 
 * TRIAGEM:
 * - Triagem (Atendimento inicial)
 * 
 * Uso:
 *   npx tsx scripts/seed-usuarios-camacari.ts
 * 
 * IMPORTANTE: Modifique as senhas antes de usar em produção!
 */

import { db } from "../src/lib/db";
import { users } from "../src/lib/db/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

// Senha padrão (MUDAR EM PRODUÇÃO!)
const DEFAULT_PASSWORD = "Defender@2024";

// ==========================================
// DEFENSORES
// ==========================================

const DEFENSORES = [
  // Núcleo Especializados - Rodrigo (Admin)
  {
    name: "Dr. Rodrigo",
    email: "rodrigo@defender.app",
    role: "defensor",
    funcao: "defensor_titular",
    oab: "BA12345",
    comarca: "Camaçari",
    phone: "(71) 99999-1111",
    nucleo: "ESPECIALIZADOS",
    isAdmin: true,
    podeVerTodosAssistidos: true,
    podeVerTodosProcessos: true,
  },
  // Núcleo Especializados - Juliane
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
  // 1ª Vara Criminal - Cristiane
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
    podeVerTodosAssistidos: true,
    podeVerTodosProcessos: true,
  },
  // 2ª Vara Criminal - Danilo
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

// ==========================================
// ESTAGIÁRIOS (com supervisor)
// ==========================================

const ESTAGIARIOS = [
  {
    name: "Emilly",
    email: "emilly@defender.app",
    role: "estagiario",
    funcao: "estagiario_direito",
    oab: null,
    comarca: "Camaçari",
    phone: "(71) 99999-4444",
    supervisorEmail: "rodrigo@defender.app", // Vinculada a Dr. Rodrigo
    nucleo: "ESPECIALIZADOS",
    isAdmin: false,
    podeVerTodosAssistidos: true,
    podeVerTodosProcessos: true,
  },
  {
    name: "Taíssa",
    email: "taissa@defender.app",
    role: "estagiario",
    funcao: "estagiario_direito",
    oab: null,
    comarca: "Camaçari",
    phone: "(71) 99999-5555",
    supervisorEmail: "juliane@defender.app", // Vinculada a Dra. Juliane
    nucleo: "ESPECIALIZADOS",
    isAdmin: false,
    podeVerTodosAssistidos: true,
    podeVerTodosProcessos: true,
  },
];

// ==========================================
// SERVIDORES E TRIAGEM
// ==========================================

const OUTROS_USUARIOS = [
  {
    name: "Servidor",
    email: "servidor@defender.app",
    role: "servidor",
    funcao: "servidor_administrativo",
    oab: null,
    comarca: "Camaçari",
    phone: "(71) 99999-3333",
    nucleo: null,
    isAdmin: false,
    podeVerTodosAssistidos: true,
    podeVerTodosProcessos: true,
  },
  {
    name: "Triagem",
    email: "triagem@defender.app",
    role: "triagem",
    funcao: "triagem",
    oab: null,
    comarca: "Camaçari",
    phone: "(71) 99999-6666",
    nucleo: null,
    isAdmin: false,
    podeVerTodosAssistidos: true,
    podeVerTodosProcessos: false, // Triagem não vê processos
  },
];

// ==========================================
// FUNÇÃO PRINCIPAL
// ==========================================

async function seedUsuarios() {
  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║       🏛️  OMBUDS - Seed de Usuários da Defensoria             ║");
  console.log("║                   Comarca de Camaçari/BA                        ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");
  console.log("\n");

  // Hash da senha padrão
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // Mapa para resolver supervisorEmail -> supervisorId
  const emailToId: Record<string, number> = {};

  // ==========================================
  // ETAPA 1: Criar Defensores
  // ==========================================
  console.log("📋 ETAPA 1: Criando Defensores...\n");

  for (const defensor of DEFENSORES) {
    try {
      const existing = await db.query.users.findFirst({
        where: eq(users.email, defensor.email),
      });

      if (existing) {
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

        emailToId[defensor.email] = existing.id;
        const adminBadge = defensor.isAdmin ? " [ADMIN]" : "";
        const nucleoBadge = defensor.nucleo === "ESPECIALIZADOS" ? "Júri/EP/VVD" : defensor.nucleo?.replace("VARA_", "Vara ");
        console.log(`  ✓ Atualizado: ${defensor.name}${adminBadge}`);
        console.log(`    └─ Núcleo: ${nucleoBadge} | Email: ${defensor.email}`);
      } else {
        const [created] = await db.insert(users)
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
          })
          .returning();

        emailToId[defensor.email] = created.id;
        const adminBadge = defensor.isAdmin ? " [ADMIN]" : "";
        const nucleoBadge = defensor.nucleo === "ESPECIALIZADOS" ? "Júri/EP/VVD" : defensor.nucleo?.replace("VARA_", "Vara ");
        console.log(`  ✓ Criado: ${defensor.name}${adminBadge}`);
        console.log(`    └─ Núcleo: ${nucleoBadge} | Email: ${defensor.email}`);
      }
    } catch (error) {
      console.error(`  ✗ Erro em ${defensor.name}:`, error);
    }
  }

  // ==========================================
  // ETAPA 2: Criar Estagiários (com supervisor)
  // ==========================================
  console.log("\n📋 ETAPA 2: Criando Estagiários...\n");

  for (const estagiario of ESTAGIARIOS) {
    const supervisorId = emailToId[estagiario.supervisorEmail];
    
    if (!supervisorId) {
      console.error(`  ✗ Supervisor não encontrado para ${estagiario.name}`);
      continue;
    }

    try {
      const existing = await db.query.users.findFirst({
        where: eq(users.email, estagiario.email),
      });

      if (existing) {
        await db.update(users)
          .set({
            name: estagiario.name,
            role: estagiario.role,
            funcao: estagiario.funcao,
            phone: estagiario.phone,
            oab: estagiario.oab,
            comarca: estagiario.comarca,
            nucleo: estagiario.nucleo,
            supervisorId,
            isAdmin: estagiario.isAdmin,
            podeVerTodosAssistidos: estagiario.podeVerTodosAssistidos,
            podeVerTodosProcessos: estagiario.podeVerTodosProcessos,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existing.id));

        emailToId[estagiario.email] = existing.id;
        const supervisorName = DEFENSORES.find(d => d.email === estagiario.supervisorEmail)?.name;
        console.log(`  ✓ Atualizado: ${estagiario.name}`);
        console.log(`    └─ Supervisor: ${supervisorName} | Email: ${estagiario.email}`);
      } else {
        const [created] = await db.insert(users)
          .values({
            name: estagiario.name,
            email: estagiario.email,
            passwordHash,
            role: estagiario.role,
            funcao: estagiario.funcao,
            phone: estagiario.phone,
            oab: estagiario.oab,
            comarca: estagiario.comarca,
            nucleo: estagiario.nucleo,
            supervisorId,
            isAdmin: estagiario.isAdmin,
            podeVerTodosAssistidos: estagiario.podeVerTodosAssistidos,
            podeVerTodosProcessos: estagiario.podeVerTodosProcessos,
            emailVerified: true,
            approvalStatus: "approved",
          })
          .returning();

        emailToId[estagiario.email] = created.id;
        const supervisorName = DEFENSORES.find(d => d.email === estagiario.supervisorEmail)?.name;
        console.log(`  ✓ Criado: ${estagiario.name}`);
        console.log(`    └─ Supervisor: ${supervisorName} | Email: ${estagiario.email}`);
      }
    } catch (error) {
      console.error(`  ✗ Erro em ${estagiario.name}:`, error);
    }
  }

  // ==========================================
  // ETAPA 3: Criar Servidores e Triagem
  // ==========================================
  console.log("\n📋 ETAPA 3: Criando Servidores e Triagem...\n");

  for (const usuario of OUTROS_USUARIOS) {
    try {
      const existing = await db.query.users.findFirst({
        where: eq(users.email, usuario.email),
      });

      if (existing) {
        await db.update(users)
          .set({
            name: usuario.name,
            role: usuario.role,
            funcao: usuario.funcao,
            phone: usuario.phone,
            oab: usuario.oab,
            comarca: usuario.comarca,
            nucleo: usuario.nucleo,
            isAdmin: usuario.isAdmin,
            podeVerTodosAssistidos: usuario.podeVerTodosAssistidos,
            podeVerTodosProcessos: usuario.podeVerTodosProcessos,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existing.id));

        emailToId[usuario.email] = existing.id;
        console.log(`  ✓ Atualizado: ${usuario.name} (${usuario.role})`);
        console.log(`    └─ Email: ${usuario.email}`);
      } else {
        const [created] = await db.insert(users)
          .values({
            name: usuario.name,
            email: usuario.email,
            passwordHash,
            role: usuario.role,
            funcao: usuario.funcao,
            phone: usuario.phone,
            oab: usuario.oab,
            comarca: usuario.comarca,
            nucleo: usuario.nucleo,
            isAdmin: usuario.isAdmin,
            podeVerTodosAssistidos: usuario.podeVerTodosAssistidos,
            podeVerTodosProcessos: usuario.podeVerTodosProcessos,
            emailVerified: true,
            approvalStatus: "approved",
          })
          .returning();

        emailToId[usuario.email] = created.id;
        console.log(`  ✓ Criado: ${usuario.name} (${usuario.role})`);
        console.log(`    └─ Email: ${usuario.email}`);
      }
    } catch (error) {
      console.error(`  ✗ Erro em ${usuario.name}:`, error);
    }
  }

  // ==========================================
  // RESUMO FINAL
  // ==========================================
  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║                    📊 RESUMO DA ESTRUTURA                       ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");
  console.log("\n");
  
  console.log("  🎯 NÚCLEO ESPECIALIZADOS (Júri, VVD, EP):");
  console.log("    ├─ Dr. Rodrigo [ADMIN] ──────────────┐");
  console.log("    │     └─ Emilly (Estagiária)         │ Trabalham");
  console.log("    └─ Dra. Juliane ─────────────────────┤ INTEGRADOS");
  console.log("          └─ Taíssa (Estagiária)         │");
  console.log("");
  console.log("  ⚖️  VARAS CRIMINAIS:");
  console.log("    ├─ Dra. Cristiane (1ª Vara Criminal)");
  console.log("    └─ Dr. Danilo (2ª Vara Criminal)");
  console.log("");
  console.log("  👥 EQUIPE DE APOIO:");
  console.log("    ├─ Servidor (Administrativo)");
  console.log("    └─ Triagem (Atendimento inicial)");
  console.log("");
  
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║                  🔐 CREDENCIAIS DE ACESSO                       ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");
  console.log("");
  console.log(`  Senha padrão: ${DEFAULT_PASSWORD}`);
  console.log("");
  console.log("  Emails:");
  [...DEFENSORES, ...ESTAGIARIOS, ...OUTROS_USUARIOS].forEach(u => {
    const roleLabel = u.role === "defensor" ? "Defensor" : 
                      u.role === "estagiario" ? "Estagiário" :
                      u.role === "servidor" ? "Servidor" : "Triagem";
    console.log(`    - ${u.email.padEnd(25)} (${roleLabel})`);
  });
  console.log("");
  
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║                  📌 REGRAS DE ACESSO                            ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");
  console.log("");
  console.log("  ✓ COMPARTILHADO: Assistidos, Processos, Casos, Drive");
  console.log("  ✗ PRIVADO: Demandas/Prazos (cada defensor vê apenas as suas)");
  console.log("  ✗ PRIVADO: Equipe (cada defensor gerencia a sua)");
  console.log("");
  console.log("  💡 Estagiários veem demandas e agenda do supervisor");
  console.log("  💡 Rodrigo e Juliane compartilham tudo (núcleo integrado)");
  console.log("  💡 Danilo e Cristiane têm interface simplificada");
  console.log("");
  
  process.exit(0);
}

// Executar
seedUsuarios().catch((error) => {
  console.error("Erro fatal:", error);
  process.exit(1);
});
