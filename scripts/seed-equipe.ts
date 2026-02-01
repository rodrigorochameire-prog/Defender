/**
 * Script de Seed - Membros da Equipe Defender
 * 
 * Este script cria os membros iniciais da equipe:
 * - Dr. Rodrigo (Defensor Titular)
 * - Dra. Juliane (Defensora Titular)
 * - Amanda (Servidora Administrativa)
 * - Emilly (Estagiária - vinculada a Dr. Rodrigo)
 * - Taíssa (Estagiária - vinculada a Dra. Juliane)
 * - Gustavo (Triagem)
 * 
 * Uso:
 *   npx tsx scripts/seed-equipe.ts
 * 
 * IMPORTANTE: Modifique as senhas antes de usar em produção!
 */

import { db } from "../src/lib/db";
import { users } from "../src/lib/db/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

const TEAM_MEMBERS = [
  {
    name: "Dr. Rodrigo",
    email: "rodrigo@defender.app",
    role: "defensor",
    funcao: "defensor_titular",
    oab: "BA12345",
    comarca: "Camaçari",
    phone: "(71) 99999-1111",
    supervisorId: null,
  },
  {
    name: "Dra. Juliane",
    email: "juliane@defender.app",
    role: "defensor",
    funcao: "defensor_titular",
    oab: "BA12346",
    comarca: "Camaçari",
    phone: "(71) 99999-2222",
    supervisorId: null,
  },
  {
    name: "Amanda",
    email: "amanda@defender.app",
    role: "servidor",
    funcao: "servidor_administrativo",
    oab: null,
    comarca: "Camaçari",
    phone: "(71) 99999-3333",
    supervisorId: null,
  },
  {
    name: "Emilly",
    email: "emilly@defender.app",
    role: "estagiario",
    funcao: "estagiario_direito",
    oab: null,
    comarca: "Camaçari",
    phone: "(71) 99999-4444",
    supervisorEmail: "rodrigo@defender.app", // Será resolvido para ID
  },
  {
    name: "Taíssa",
    email: "taissa@defender.app",
    role: "estagiario",
    funcao: "estagiario_direito",
    oab: null,
    comarca: "Camaçari",
    phone: "(71) 99999-5555",
    supervisorEmail: "juliane@defender.app", // Será resolvido para ID
  },
  {
    name: "Gustavo",
    email: "gustavo@defender.app",
    role: "triagem",
    funcao: "triagem",
    oab: null,
    comarca: "Camaçari",
    phone: "(71) 99999-6666",
    supervisorId: null,
  },
];

// Senha padrão para todos os usuários (MUDAR EM PRODUÇÃO!)
const DEFAULT_PASSWORD = "Defender@2024";

async function seedEquipe() {
  console.log("🚀 Iniciando seed da equipe Defender...\n");

  // Hash da senha padrão
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // Mapa para resolver supervisorEmail -> supervisorId
  const emailToId: Record<string, number> = {};

  // Primeiro, criar usuários sem supervisor (defensores, servidor, triagem)
  for (const member of TEAM_MEMBERS) {
    if (!("supervisorEmail" in member)) {
      try {
        // Verificar se já existe
        const existing = await db.query.users.findFirst({
          where: eq(users.email, member.email),
        });

        if (existing) {
          console.log(`  ℹ️ ${member.name} já existe (${member.email})`);
          emailToId[member.email] = existing.id;
          
          // Atualizar dados se necessário
          await db.update(users)
            .set({
              role: member.role,
              funcao: member.funcao,
              phone: member.phone,
              oab: member.oab,
              comarca: member.comarca,
              updatedAt: new Date(),
            })
            .where(eq(users.id, existing.id));
        } else {
          const [created] = await db.insert(users)
            .values({
              name: member.name,
              email: member.email,
              passwordHash,
              role: member.role,
              funcao: member.funcao,
              phone: member.phone,
              oab: member.oab,
              comarca: member.comarca,
              emailVerified: true,
              approvalStatus: "approved",
              supervisorId: null,
            })
            .returning();

          emailToId[member.email] = created.id;
          console.log(`  ✅ Criado: ${member.name} (${member.role})`);
        }
      } catch (error) {
        console.error(`  ❌ Erro ao criar ${member.name}:`, error);
      }
    }
  }

  // Depois, criar estagiários com supervisor
  for (const member of TEAM_MEMBERS) {
    if ("supervisorEmail" in member) {
      const supervisorId = emailToId[member.supervisorEmail as string];
      
      if (!supervisorId) {
        console.error(`  ❌ Supervisor não encontrado para ${member.name}`);
        continue;
      }

      try {
        // Verificar se já existe
        const existing = await db.query.users.findFirst({
          where: eq(users.email, member.email),
        });

        if (existing) {
          console.log(`  ℹ️ ${member.name} já existe (${member.email})`);
          
          // Atualizar supervisor e outros dados
          await db.update(users)
            .set({
              role: member.role,
              funcao: member.funcao,
              phone: member.phone,
              supervisorId,
              updatedAt: new Date(),
            })
            .where(eq(users.id, existing.id));
        } else {
          await db.insert(users)
            .values({
              name: member.name,
              email: member.email,
              passwordHash,
              role: member.role,
              funcao: member.funcao,
              phone: member.phone,
              oab: member.oab,
              comarca: member.comarca,
              emailVerified: true,
              approvalStatus: "approved",
              supervisorId,
            });

          const supervisorName = TEAM_MEMBERS.find(m => m.email === member.supervisorEmail)?.name;
          console.log(`  ✅ Criado: ${member.name} (${member.role}) - Vinculado a ${supervisorName}`);
        }
      } catch (error) {
        console.error(`  ❌ Erro ao criar ${member.name}:`, error);
      }
    }
  }

  console.log("\n✨ Seed da equipe concluído!");
  console.log(`\n📋 Credenciais de acesso:`);
  console.log(`   Senha padrão: ${DEFAULT_PASSWORD}`);
  console.log(`   Emails: ${TEAM_MEMBERS.map(m => m.email).join(", ")}`);
  
  process.exit(0);
}

// Executar
seedEquipe().catch((error) => {
  console.error("Erro fatal:", error);
  process.exit(1);
});
