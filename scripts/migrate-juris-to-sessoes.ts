/**
 * Script para migrar júris da tabela audiencias para sessoesJuri
 * 
 * Execução: DATABASE_URL="..." npx tsx scripts/migrate-juris-to-sessoes.ts
 */

import { db } from "@/lib/db";
import { audiencias, sessoesJuri, processos, assistidos } from "@/lib/db/schema";
import { eq, ilike, or, and, gte } from "drizzle-orm";

async function migrateJurisToSessoes() {
  console.log("\n╔════════════════════════════════════════════════════════════════╗");
  console.log("║       🔄 OMBUDS - Migração de Júris para Tabela Correta        ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  try {
    // 1. Buscar audiências que são júris (título ou tipo contém "júri" ou "juri")
    console.log("📋 Buscando audiências do tipo Júri...\n");
    
    const audienciasJuri = await db
      .select({
        id: audiencias.id,
        processoId: audiencias.processoId,
        workspaceId: audiencias.workspaceId,
        dataAudiencia: audiencias.dataAudiencia,
        tipo: audiencias.tipo,
        titulo: audiencias.titulo,
        descricao: audiencias.descricao,
        sala: audiencias.sala,
        horario: audiencias.horario,
        defensorId: audiencias.defensorId,
        status: audiencias.status,
        assistidoId: audiencias.assistidoId,
      })
      .from(audiencias)
      .where(
        or(
          ilike(audiencias.titulo, '%júri%'),
          ilike(audiencias.titulo, '%juri%'),
          ilike(audiencias.tipo, '%júri%'),
          ilike(audiencias.tipo, '%juri%')
        )
      );

    console.log(`  Encontradas ${audienciasJuri.length} audiências do tipo Júri\n`);

    if (audienciasJuri.length === 0) {
      console.log("  ℹ️  Nenhuma audiência de júri para migrar.\n");
      return;
    }

    // 2. Para cada audiência de júri, criar uma sessão na tabela sessoesJuri
    console.log("📋 Migrando para tabela sessoesJuri...\n");
    
    let migrados = 0;
    let erros = 0;

    for (const aud of audienciasJuri) {
      try {
        // Buscar nome do assistido se houver
        let assistidoNome = "Réu não identificado";
        if (aud.assistidoId) {
          const [assistido] = await db
            .select({ nome: assistidos.nome })
            .from(assistidos)
            .where(eq(assistidos.id, aud.assistidoId))
            .limit(1);
          if (assistido) {
            assistidoNome = assistido.nome;
          }
        } else if (aud.titulo) {
          // Tentar extrair nome do título (ex: "Júri - Nome do Réu - Processo")
          const match = aud.titulo.match(/[Jj][úu]ri\s*[-–]\s*([^-–]+)/);
          if (match && match[1]) {
            assistidoNome = match[1].trim();
          }
        }

        // Verificar se já existe uma sessão para este processo na mesma data
        const hoje = new Date();
        const [existente] = await db
          .select({ id: sessoesJuri.id })
          .from(sessoesJuri)
          .where(
            and(
              eq(sessoesJuri.processoId, aud.processoId),
              eq(sessoesJuri.dataSessao, aud.dataAudiencia)
            )
          )
          .limit(1);

        if (existente) {
          console.log(`  ⏭️  Sessão já existe para processo ${aud.processoId} em ${aud.dataAudiencia.toLocaleDateString('pt-BR')}`);
          continue;
        }

        // Criar sessão do júri
        const [novaSessao] = await db
          .insert(sessoesJuri)
          .values({
            processoId: aud.processoId,
            workspaceId: aud.workspaceId || 1,
            dataSessao: aud.dataAudiencia,
            horario: aud.horario,
            sala: aud.sala,
            defensorId: aud.defensorId,
            defensorNome: null, // Será preenchido depois se necessário
            assistidoNome: assistidoNome,
            status: aud.status === "realizada" ? "REALIZADA" : "AGENDADA",
            observacoes: aud.descricao,
          })
          .returning();

        console.log(`  ✓ Migrado: ${assistidoNome} - ${aud.dataAudiencia.toLocaleDateString('pt-BR')}`);
        migrados++;

      } catch (err: any) {
        console.log(`  ✗ Erro ao migrar audiência ${aud.id}: ${err.message}`);
        erros++;
      }
    }

    // 3. Resumo
    console.log("\n╔════════════════════════════════════════════════════════════════╗");
    console.log("║                    📊 RESUMO DA MIGRAÇÃO                        ║");
    console.log("╚════════════════════════════════════════════════════════════════╝\n");
    console.log(`  Total de audiências de júri encontradas: ${audienciasJuri.length}`);
    console.log(`  ✓ Migradas com sucesso: ${migrados}`);
    console.log(`  ✗ Erros: ${erros}`);
    console.log(`  ⏭️  Já existentes (ignoradas): ${audienciasJuri.length - migrados - erros}`);

    // 4. Verificar sessões criadas
    console.log("\n📋 Verificando sessões de júri no banco...\n");
    
    const sessoesAtuais = await db
      .select({
        id: sessoesJuri.id,
        dataSessao: sessoesJuri.dataSessao,
        assistidoNome: sessoesJuri.assistidoNome,
        status: sessoesJuri.status,
      })
      .from(sessoesJuri)
      .where(gte(sessoesJuri.dataSessao, new Date()))
      .orderBy(sessoesJuri.dataSessao)
      .limit(10);

    console.log(`  Próximas sessões de júri (${sessoesAtuais.length}):\n`);
    for (const s of sessoesAtuais) {
      console.log(`    - ${s.dataSessao.toLocaleDateString('pt-BR')} | ${s.assistidoNome} | ${s.status}`);
    }

    console.log("\n✅ Migração concluída!\n");

  } catch (error) {
    console.error("\n❌ Erro durante a migração:", error);
    throw error;
  }
}

// Executar
migrateJurisToSessoes()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
