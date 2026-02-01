/**
 * 🎉 SCRIPT DE INAUGURAÇÃO - Defender
 * 
 * Este script prepara o banco de dados para a grande inauguração:
 * 
 * 1. LIMPA todas as tabelas (reset completo)
 * 2. CRIA os defensores da Defensoria de Camaçari
 * 3. CRIA a equipe do Núcleo Especializados
 * 
 * Uso:
 *   npx tsx scripts/inauguracao.ts
 * 
 * ⚠️ ATENÇÃO: Este script APAGA todos os dados existentes!
 * 
 * 🔐 IMPORTANTE: Altere as senhas antes de usar em produção!
 */

import { db } from "../src/lib/db";
import { 
  users, 
  demandas, 
  assistidos, 
  processos, 
  casos, 
  eventos,
  delegacoesHistorico,
  afastamentos,
  jurados,
  sessoesPlenarias,
  conselhoSentenca,
  avaliacoesJuri,
  observacoesJurado,
  masterPromptJuri,
} from "../src/lib/db/schema";
import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";

// ============================================
// CONFIGURAÇÃO DA EQUIPE
// ============================================

// Senha padrão (ALTERE EM PRODUÇÃO!)
const DEFAULT_PASSWORD = "Defender@2026";

// DEFENSORES
const DEFENSORES = [
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

// EQUIPE (Servidores, Estagiários, Triagem)
const EQUIPE = [
  {
    name: "Amanda",
    email: "amanda@defender.app",
    role: "servidor",
    funcao: "servidor_administrativo",
    oab: null,
    comarca: "Camaçari",
    phone: "(71) 99999-3333",
    nucleo: "ESPECIALIZADOS",
    supervisorEmail: null,
  },
  {
    name: "Emilly",
    email: "emilly@defender.app",
    role: "estagiario",
    funcao: "estagiario_direito",
    oab: null,
    comarca: "Camaçari",
    phone: "(71) 99999-4444",
    nucleo: "ESPECIALIZADOS",
    supervisorEmail: "rodrigo@defender.app",
  },
  {
    name: "Taíssa",
    email: "taissa@defender.app",
    role: "estagiario",
    funcao: "estagiario_direito",
    oab: null,
    comarca: "Camaçari",
    phone: "(71) 99999-5555",
    nucleo: "ESPECIALIZADOS",
    supervisorEmail: "juliane@defender.app",
  },
  {
    name: "Gustavo",
    email: "gustavo@defender.app",
    role: "triagem",
    funcao: "triagem",
    oab: null,
    comarca: "Camaçari",
    phone: "(71) 99999-6666",
    nucleo: "ESPECIALIZADOS",
    supervisorEmail: null,
  },
];

// ============================================
// FUNÇÕES
// ============================================

async function limparBancoDeDados() {
  console.log("\n🗑️  LIMPANDO BANCO DE DADOS...\n");
  
  try {
    // Ordem de deleção respeitando foreign keys
    const tabelas = [
      { nome: "observacoes_jurado", tabela: observacoesJurado },
      { nome: "avaliacoes_juri", tabela: avaliacoesJuri },
      { nome: "conselho_sentenca", tabela: conselhoSentenca },
      { nome: "sessoes_plenarias", tabela: sessoesPlenarias },
      { nome: "jurados", tabela: jurados },
      { nome: "master_prompt_juri", tabela: masterPromptJuri },
      { nome: "delegacoes_historico", tabela: delegacoesHistorico },
      { nome: "afastamentos", tabela: afastamentos },
      { nome: "eventos", tabela: eventos },
      { nome: "demandas", tabela: demandas },
      { nome: "processos", tabela: processos },
      { nome: "casos", tabela: casos },
      { nome: "assistidos", tabela: assistidos },
      { nome: "users", tabela: users },
    ];

    for (const { nome, tabela } of tabelas) {
      try {
        await db.delete(tabela);
        console.log(`   ✓ Limpa: ${nome}`);
      } catch (error: any) {
        // Ignorar erro se tabela não existir
        if (!error.message?.includes("does not exist")) {
          console.log(`   ⚠ Aviso em ${nome}: ${error.message}`);
        }
      }
    }

    console.log("\n   ✅ Banco de dados limpo com sucesso!\n");
  } catch (error) {
    console.error("   ❌ Erro ao limpar banco:", error);
    throw error;
  }
}

async function criarDefensores(passwordHash: string) {
  console.log("👨‍⚖️  CRIANDO DEFENSORES...\n");
  
  const emailToId: Record<string, number> = {};

  for (const defensor of DEFENSORES) {
    try {
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
      
      const badges = [];
      if (defensor.isAdmin) badges.push("ADMIN");
      badges.push(defensor.nucleo);
      
      console.log(`   ✅ ${defensor.name} [${badges.join(", ")}]`);
    } catch (error: any) {
      console.error(`   ❌ Erro em ${defensor.name}:`, error.message);
    }
  }

  return emailToId;
}

async function criarEquipe(passwordHash: string, emailToId: Record<string, number>) {
  console.log("\n👥  CRIANDO EQUIPE...\n");

  // Primeiro: criar membros sem supervisor
  for (const membro of EQUIPE.filter(m => !m.supervisorEmail)) {
    try {
      const [created] = await db.insert(users)
        .values({
          name: membro.name,
          email: membro.email,
          passwordHash,
          role: membro.role,
          funcao: membro.funcao,
          phone: membro.phone,
          oab: membro.oab,
          comarca: membro.comarca,
          nucleo: membro.nucleo,
          emailVerified: true,
          approvalStatus: "approved",
        })
        .returning();

      emailToId[membro.email] = created.id;
      console.log(`   ✅ ${membro.name} (${membro.role})`);
    } catch (error: any) {
      console.error(`   ❌ Erro em ${membro.name}:`, error.message);
    }
  }

  // Depois: criar membros com supervisor
  for (const membro of EQUIPE.filter(m => m.supervisorEmail)) {
    try {
      const supervisorId = emailToId[membro.supervisorEmail!];
      const supervisorNome = DEFENSORES.find(d => d.email === membro.supervisorEmail)?.name || membro.supervisorEmail;

      const [created] = await db.insert(users)
        .values({
          name: membro.name,
          email: membro.email,
          passwordHash,
          role: membro.role,
          funcao: membro.funcao,
          phone: membro.phone,
          oab: membro.oab,
          comarca: membro.comarca,
          nucleo: membro.nucleo,
          supervisorId,
          emailVerified: true,
          approvalStatus: "approved",
        })
        .returning();

      emailToId[membro.email] = created.id;
      console.log(`   ✅ ${membro.name} (${membro.role}) → vinculado a ${supervisorNome}`);
    } catch (error: any) {
      console.error(`   ❌ Erro em ${membro.name}:`, error.message);
    }
  }

  return emailToId;
}

function exibirResumo() {
  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║                                                                ║");
  console.log("║   🎉  DEFENDER - PRONTO PARA INAUGURAÇÃO!  🎉                  ║");
  console.log("║                                                                ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");
  console.log("");
  console.log("  📍 DEFENSORIA PÚBLICA DE CAMAÇARI");
  console.log("");
  console.log("  ┌─────────────────────────────────────────────────────────────┐");
  console.log("  │  NÚCLEO ESPECIALIZADOS (Júri, VD, EP)                       │");
  console.log("  │  ─────────────────────────────────────────────────────────  │");
  console.log("  │  👨‍⚖️ Dr. Rodrigo (Admin)       rodrigo@defender.app         │");
  console.log("  │  👩‍⚖️ Dra. Juliane              juliane@defender.app         │");
  console.log("  │                                                             │");
  console.log("  │  Equipe:                                                    │");
  console.log("  │  📋 Amanda (Servidora)        amanda@defender.app           │");
  console.log("  │  📚 Emilly (Estagiária)       emilly@defender.app           │");
  console.log("  │  📚 Taíssa (Estagiária)       taissa@defender.app           │");
  console.log("  │  🚪 Gustavo (Triagem)         gustavo@defender.app          │");
  console.log("  └─────────────────────────────────────────────────────────────┘");
  console.log("");
  console.log("  ┌─────────────────────────────────────────────────────────────┐");
  console.log("  │  1ª VARA CRIMINAL                                           │");
  console.log("  │  ─────────────────────────────────────────────────────────  │");
  console.log("  │  👩‍⚖️ Dra. Cristiane            cristiane@defender.app       │");
  console.log("  └─────────────────────────────────────────────────────────────┘");
  console.log("");
  console.log("  ┌─────────────────────────────────────────────────────────────┐");
  console.log("  │  2ª VARA CRIMINAL                                           │");
  console.log("  │  ─────────────────────────────────────────────────────────  │");
  console.log("  │  👨‍⚖️ Dr. Danilo                danilo@defender.app          │");
  console.log("  └─────────────────────────────────────────────────────────────┘");
  console.log("");
  console.log("  ┌─────────────────────────────────────────────────────────────┐");
  console.log("  │  🔐 CREDENCIAIS DE ACESSO                                   │");
  console.log("  │  ─────────────────────────────────────────────────────────  │");
  console.log(`  │  Senha: ${DEFAULT_PASSWORD}                                 │`);
  console.log("  │                                                             │");
  console.log("  │  ⚠️  ALTERE AS SENHAS APÓS O PRIMEIRO ACESSO!               │");
  console.log("  └─────────────────────────────────────────────────────────────┘");
  console.log("");
  console.log("  ┌─────────────────────────────────────────────────────────────┐");
  console.log("  │  ✅ FUNCIONALIDADES DISPONÍVEIS                             │");
  console.log("  │  ─────────────────────────────────────────────────────────  │");
  console.log("  │  • Dashboard com métricas e registro rápido                 │");
  console.log("  │  • Gestão de Demandas e Delegações                          │");
  console.log("  │  • Agenda integrada                                         │");
  console.log("  │  • Gestão de Assistidos                                     │");
  console.log("  │  • Gestão de Processos                                      │");
  console.log("  │  • Drive de documentos                                      │");
  console.log("  │  • Módulo de Júri (Banco, Cockpit, Avaliações)              │");
  console.log("  │  • Módulo de Violência Doméstica                            │");
  console.log("  │  • Módulo de Execução Penal                                 │");
  console.log("  │  • Gestão de Equipe e Delegações                            │");
  console.log("  │  • Gestão de Dados (Admin)                                  │");
  console.log("  └─────────────────────────────────────────────────────────────┘");
  console.log("");
  console.log("══════════════════════════════════════════════════════════════════");
  console.log("                    🚀 BOA INAUGURAÇÃO! 🚀                        ");
  console.log("══════════════════════════════════════════════════════════════════");
  console.log("");
}

// ============================================
// EXECUÇÃO PRINCIPAL
// ============================================

async function main() {
  console.log("");
  console.log("══════════════════════════════════════════════════════════════════");
  console.log("           🏛️ DEFENDER - SCRIPT DE INAUGURAÇÃO 🏛️                ");
  console.log("══════════════════════════════════════════════════════════════════");
  
  try {
    // 1. Limpar banco de dados
    await limparBancoDeDados();

    // 2. Hash da senha padrão
    console.log("🔐 Gerando hash de senha...\n");
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    console.log("   ✅ Hash gerado com sucesso!\n");

    // 3. Criar defensores
    const emailToId = await criarDefensores(passwordHash);

    // 4. Criar equipe
    await criarEquipe(passwordHash, emailToId);

    // 5. Exibir resumo
    exibirResumo();

    process.exit(0);
  } catch (error) {
    console.error("\n❌ ERRO FATAL:", error);
    process.exit(1);
  }
}

// Executar
main();
