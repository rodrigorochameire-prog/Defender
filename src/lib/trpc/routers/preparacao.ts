import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import {
  sessoesJuri,
  processos,
  casos,
  personagensJuri,
  quesitos,
  tesesDefensivas,
  casePersonas,
  caseFacts,
  factEvidence,
  depoimentosAnalise,
  testemunhas,
} from "@/lib/db/schema";
import { eq, desc, sql, and, isNotNull, asc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// ==========================================
// PREPARAÇÃO DO JÚRI — ROUTER AGREGADO
// ==========================================

export const preparacaoRouter = router({
  // ------------------------------------------
  // 1. caseDataSummary
  // Resumo agregado dos dados do caso vinculado à sessão
  // ------------------------------------------
  caseDataSummary: protectedProcedure
    .input(z.object({ sessaoId: z.number() }))
    .query(async ({ ctx, input }) => {

      // Buscar sessão e processo para obter casoId
      const [sessao] = await db
        .select({
          id: sessoesJuri.id,
          processoId: sessoesJuri.processoId,
          dataSessao: sessoesJuri.dataSessao,
          casoId: processos.casoId,
        })
        .from(sessoesJuri)
        .innerJoin(processos, eq(sessoesJuri.processoId, processos.id))
        .where(eq(sessoesJuri.id, input.sessaoId));

      if (!sessao) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Sessão do júri não encontrada",
        });
      }

      const casoId = sessao.casoId;

      if (!casoId) {
        return {
          casoId: null,
          hasPericia: false,
          witnesses: [] as { nome: string; tipo: string }[],
          hasTheses: false,
          thesesCount: 0,
          hasFacts: false,
          factsCount: 0,
          hasEvidence: false,
          hasDepoimentosAnalise: false,
          sessaoDate: sessao.dataSessao,
          reuPreso: false,
        };
      }

      // Queries paralelas para performance
      const [
        personasResult,
        factsResult,
        thesesResult,
        depoimentosResult,
        evidenceResult,
        witnessesResult,
      ] = await Promise.all([
        // CasePersonas count
        db
          .select({ count: sql<number>`count(*)` })
          .from(casePersonas)
          .where(eq(casePersonas.casoId, casoId)),

        // CaseFacts count
        db
          .select({ count: sql<number>`count(*)` })
          .from(caseFacts)
          .where(eq(caseFacts.casoId, casoId)),

        // Teses count
        db
          .select({ count: sql<number>`count(*)` })
          .from(tesesDefensivas)
          .where(eq(tesesDefensivas.casoId, casoId)),

        // Depoimentos com análise
        db
          .select({ count: sql<number>`count(*)` })
          .from(depoimentosAnalise)
          .where(eq(depoimentosAnalise.casoId, casoId)),

        // Evidence (via caseFacts join)
        db
          .select({ count: sql<number>`count(*)` })
          .from(factEvidence)
          .innerJoin(caseFacts, eq(factEvidence.factId, caseFacts.id))
          .where(eq(caseFacts.casoId, casoId)),

        // Testemunhas do processo
        db
          .select({
            nome: testemunhas.nome,
            tipo: testemunhas.tipo,
          })
          .from(testemunhas)
          .where(eq(testemunhas.processoId, sessao.processoId)),
      ]);

      // Verificar se há perícia (persona tipo 'perito' ou fact tipo 'prova' com tag perícia)
      const [periciaResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(casePersonas)
        .where(
          and(
            eq(casePersonas.casoId, casoId),
            eq(casePersonas.tipo, "perito")
          )
        );

      // reuPreso: buscar na demanda vinculada ao processo (se existir)
      const [reuPresoResult] = await db.execute(
        sql`SELECT d.reu_preso FROM demandas d WHERE d.processo_id = ${sessao.processoId} AND d.reu_preso = true LIMIT 1`
      );

      const thesesCount = Number(thesesResult[0]?.count || 0);
      const factsCount = Number(factsResult[0]?.count || 0);

      return {
        casoId,
        hasPericia: Number(periciaResult?.count || 0) > 0,
        witnesses: witnessesResult.map((w) => ({
          nome: w.nome,
          tipo: w.tipo,
        })),
        hasTheses: thesesCount > 0,
        thesesCount,
        hasFacts: factsCount > 0,
        factsCount,
        hasEvidence: Number(evidenceResult[0]?.count || 0) > 0,
        hasDepoimentosAnalise: Number(depoimentosResult[0]?.count || 0) > 0,
        sessaoDate: sessao.dataSessao,
        reuPreso: !!reuPresoResult,
      };
    }),

  // ------------------------------------------
  // 2. personagensBySessao
  // Personagens (juízes/promotores) da comarca da sessão
  // ------------------------------------------
  personagensBySessao: protectedProcedure
    .input(z.object({ sessaoId: z.number() }))
    .query(async ({ ctx, input }) => {

      // Buscar comarca do processo vinculado à sessão
      const [sessao] = await db
        .select({
          comarca: processos.comarca,
        })
        .from(sessoesJuri)
        .innerJoin(processos, eq(sessoesJuri.processoId, processos.id))
        .where(eq(sessoesJuri.id, input.sessaoId));

      if (!sessao) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Sessão do júri não encontrada",
        });
      }

      const conditions = [
        inArray(personagensJuri.tipo, ["juiz", "promotor"]),
        eq(personagensJuri.ativo, true),
      ];

      // Filtrar por comarca se disponível
      if (sessao.comarca) {
        conditions.push(eq(personagensJuri.comarca, sessao.comarca));
      }

      const result = await db
        .select()
        .from(personagensJuri)
        .where(and(...conditions))
        .orderBy(asc(personagensJuri.nome));

      return result;
    }),

  // ------------------------------------------
  // 3. createPersonagem
  // Criar novo personagem do júri
  // ------------------------------------------
  createPersonagem: protectedProcedure
    .input(
      z.object({
        nome: z.string().min(1),
        tipo: z.string().min(1),
        vara: z.string().optional(),
        comarca: z.string().optional(),
        estiloAtuacao: z.string().optional(),
        pontosFortes: z.string().optional(),
        pontosFracos: z.string().optional(),
        tendenciasObservadas: z.string().optional(),
        estrategiasRecomendadas: z.string().optional(),
        historico: z.string().optional(),
        totalSessoes: z.number().optional(),
        totalCondenacoes: z.number().optional(),
        totalAbsolvicoes: z.number().optional(),
        totalDesclassificacoes: z.number().optional(),
        tempoMedioSustentacao: z.number().optional(),
        argumentosPreferidos: z.array(z.string()).optional(),
        tesesVulneraveis: z.array(z.string()).optional(),
        notasEstrategicas: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {

      const [novo] = await db
        .insert(personagensJuri)
        .values({
          ...input,
          createdById: ctx.user.id,
        })
        .returning();

      return novo;
    }),

  // ------------------------------------------
  // 4. updatePersonagem
  // Atualizar personagem existente
  // ------------------------------------------
  updatePersonagem: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        nome: z.string().optional(),
        tipo: z.string().optional(),
        vara: z.string().optional(),
        comarca: z.string().optional(),
        estiloAtuacao: z.string().optional(),
        pontosFortes: z.string().optional(),
        pontosFracos: z.string().optional(),
        tendenciasObservadas: z.string().optional(),
        estrategiasRecomendadas: z.string().optional(),
        historico: z.string().optional(),
        totalSessoes: z.number().optional(),
        totalCondenacoes: z.number().optional(),
        totalAbsolvicoes: z.number().optional(),
        totalDesclassificacoes: z.number().optional(),
        tempoMedioSustentacao: z.number().optional(),
        argumentosPreferidos: z.array(z.string()).optional(),
        tesesVulneraveis: z.array(z.string()).optional(),
        notasEstrategicas: z.string().optional(),
        ativo: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const [atualizado] = await db
        .update(personagensJuri)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(personagensJuri.id, id))
        .returning();

      if (!atualizado) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Personagem não encontrado",
        });
      }

      return atualizado;
    }),

  // ------------------------------------------
  // 5. warRoomData
  // Dados completos do caso para a War Room
  // ------------------------------------------
  warRoomData: protectedProcedure
    .input(z.object({ casoId: z.number() }))
    .query(async ({ ctx, input }) => {

      const [personas, facts, evidence, contradicoes] = await Promise.all([
        // Personas do caso
        db
          .select()
          .from(casePersonas)
          .where(eq(casePersonas.casoId, input.casoId))
          .orderBy(asc(casePersonas.nome)),

        // Fatos do caso ordenados por data ou criação
        db
          .select()
          .from(caseFacts)
          .where(eq(caseFacts.casoId, input.casoId))
          .orderBy(asc(caseFacts.dataFato), asc(caseFacts.createdAt)),

        // Evidências vinculadas aos fatos do caso
        db
          .select({
            id: factEvidence.id,
            factId: factEvidence.factId,
            documentoId: factEvidence.documentoId,
            sourceType: factEvidence.sourceType,
            sourceId: factEvidence.sourceId,
            trecho: factEvidence.trecho,
            contradicao: factEvidence.contradicao,
            confianca: factEvidence.confianca,
            createdAt: factEvidence.createdAt,
            // Dados do fato vinculado
            factTitulo: caseFacts.titulo,
            factTipo: caseFacts.tipo,
          })
          .from(factEvidence)
          .innerJoin(caseFacts, eq(factEvidence.factId, caseFacts.id))
          .where(eq(caseFacts.casoId, input.casoId))
          .orderBy(asc(factEvidence.createdAt)),

        // Depoimentos com contradições identificadas
        db
          .select()
          .from(depoimentosAnalise)
          .where(
            and(
              eq(depoimentosAnalise.casoId, input.casoId),
              isNotNull(depoimentosAnalise.contradicoesIdentificadas)
            )
          )
          .orderBy(asc(depoimentosAnalise.testemunhaNome)),
      ]);

      return {
        personas,
        facts,
        evidence,
        contradicoes,
      };
    }),

  // ------------------------------------------
  // 6. listQuesitos
  // Listar quesitos do caso ordenados por número
  // ------------------------------------------
  listQuesitos: protectedProcedure
    .input(z.object({ casoId: z.number() }))
    .query(async ({ ctx, input }) => {

      const result = await db
        .select()
        .from(quesitos)
        .where(eq(quesitos.casoId, input.casoId))
        .orderBy(asc(quesitos.numero));

      return result;
    }),

  // ------------------------------------------
  // 7. createQuesito
  // Criar novo quesito
  // ------------------------------------------
  createQuesito: protectedProcedure
    .input(
      z.object({
        casoId: z.number(),
        sessaoJuriId: z.number().optional(),
        numero: z.number(),
        texto: z.string().min(1),
        tipo: z.string().optional(),
        origem: z.string().optional(),
        teseId: z.number().optional(),
        argumentacaoSim: z.string().optional(),
        argumentacaoNao: z.string().optional(),
        dependeDe: z.number().optional(),
        condicaoPai: z.string().optional(),
        geradoPorIA: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {

      const [novo] = await db
        .insert(quesitos)
        .values(input)
        .returning();

      return novo;
    }),

  // ------------------------------------------
  // 8. updateQuesito
  // Atualizar quesito existente
  // ------------------------------------------
  updateQuesito: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        numero: z.number().optional(),
        texto: z.string().optional(),
        tipo: z.string().optional(),
        origem: z.string().optional(),
        teseId: z.number().nullable().optional(),
        argumentacaoSim: z.string().nullable().optional(),
        argumentacaoNao: z.string().nullable().optional(),
        dependeDe: z.number().nullable().optional(),
        condicaoPai: z.string().nullable().optional(),
        geradoPorIA: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const [atualizado] = await db
        .update(quesitos)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(quesitos.id, id))
        .returning();

      if (!atualizado) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Quesito não encontrado",
        });
      }

      return atualizado;
    }),

  // ------------------------------------------
  // 9. deleteQuesito
  // Excluir quesito por ID
  // ------------------------------------------
  deleteQuesito: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {

      const [excluido] = await db
        .delete(quesitos)
        .where(eq(quesitos.id, input.id))
        .returning();

      if (!excluido) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Quesito não encontrado",
        });
      }

      return excluido;
    }),

  // ------------------------------------------
  // 10. reorderQuesitos
  // Reordenar quesitos em batch (drag-and-drop)
  // ------------------------------------------
  reorderQuesitos: protectedProcedure
    .input(
      z.object({
        quesitos: z.array(
          z.object({
            id: z.number(),
            numero: z.number(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {

      // Batch update dentro de uma transação
      await db.transaction(async (tx) => {
        for (const item of input.quesitos) {
          await tx
            .update(quesitos)
            .set({
              numero: item.numero,
              updatedAt: new Date(),
            })
            .where(eq(quesitos.id, item.id));
        }
      });

      return { success: true, count: input.quesitos.length };
    }),

  // ------------------------------------------
  // 11. generateQuesitos
  // Gerar quesitos via IA (Gemini)
  // ------------------------------------------
  generateQuesitos: protectedProcedure
    .input(
      z.object({
        casoId: z.number(),
        classificacaoCrime: z.string(),
        teses: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {

      try {
        const { gerarQuesitosIA } = await import("@/lib/services/gemini");
        const resultado = await gerarQuesitosIA(input.classificacaoCrime, input.teses, "");
        return { success: true as const, data: resultado };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Erro ao gerar quesitos via IA";
        console.error("[preparacao.generateQuesitos] Erro:", message);
        return { success: false as const, error: message };
      }
    }),

  // ------------------------------------------
  // 12. simularJulgamento
  // Simular julgamento via IA e salvar resultado
  // ------------------------------------------
  simularJulgamento: protectedProcedure
    .input(
      z.object({
        sessaoId: z.number(),
        casoId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {

      try {
        // Carregar todos os dados do caso em paralelo
        const [
          factsData,
          personasData,
          thesesData,
          evidenceData,
          depoimentosData,
          personagensData,
        ] = await Promise.all([
          db
            .select()
            .from(caseFacts)
            .where(eq(caseFacts.casoId, input.casoId))
            .orderBy(asc(caseFacts.dataFato)),

          db
            .select()
            .from(casePersonas)
            .where(eq(casePersonas.casoId, input.casoId)),

          db
            .select()
            .from(tesesDefensivas)
            .where(eq(tesesDefensivas.casoId, input.casoId)),

          db
            .select({
              id: factEvidence.id,
              factId: factEvidence.factId,
              sourceType: factEvidence.sourceType,
              trecho: factEvidence.trecho,
              contradicao: factEvidence.contradicao,
              confianca: factEvidence.confianca,
            })
            .from(factEvidence)
            .innerJoin(caseFacts, eq(factEvidence.factId, caseFacts.id))
            .where(eq(caseFacts.casoId, input.casoId)),

          db
            .select()
            .from(depoimentosAnalise)
            .where(eq(depoimentosAnalise.casoId, input.casoId)),

          // Personagens da sessão (juiz, promotor)
          db
            .select()
            .from(personagensJuri)
            .innerJoin(
              sessoesJuri,
              sql`true` // Buscar personagens ativos da comarca
            )
            .where(
              and(
                eq(sessoesJuri.id, input.sessaoId),
                eq(personagensJuri.ativo, true),
                inArray(personagensJuri.tipo, ["juiz", "promotor"])
              )
            ),
        ]);

        // Chamar IA para simulação
        const { simularJulgamentoIA } = await import("@/lib/services/gemini");
        const personagensInfo = personagensData.map((p) => p.personagens_juri);
        const juizInfo = personagensInfo.find((p) => p.tipo === "juiz");
        const promotorInfo = personagensInfo.find((p) => p.tipo === "promotor");

        const resultado = await simularJulgamentoIA({
          fatos: factsData.map((f) => `${f.descricao || f.titulo || ""}`).join("\n"),
          teses: thesesData.map((t) => ({
            titulo: t.titulo,
            descricao: t.descricao || "",
            tipo: t.tipo || "principal",
          })),
          testemunhas: personasData
            .filter((p) => p.tipo === "testemunha")
            .map((p) => ({
              nome: p.nome,
              tipo: "acusacao",
              depoimento: p.observacoes || "",
              contradicoes: undefined,
            })),
          provas: evidenceData.map((e) => `${e.sourceType}: ${e.trecho || ""}`).join("\n"),
          juizPerfil: juizInfo ? `${juizInfo.nome} - ${juizInfo.estiloAtuacao || ""}` : undefined,
          promotorPerfil: promotorInfo ? `${promotorInfo.nome} - ${promotorInfo.estiloAtuacao || ""}` : undefined,
          classificacaoCrime: factsData[0]?.titulo || "Homicídio",
        });

        // Salvar resultado na sessão
        await db
          .update(sessoesJuri)
          .set({
            simulacaoResultado: resultado,
            updatedAt: new Date(),
          })
          .where(eq(sessoesJuri.id, input.sessaoId));

        return { success: true as const, data: resultado };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Erro ao simular julgamento via IA";
        console.error("[preparacao.simularJulgamento] Erro:", message);
        return { success: false as const, error: message };
      }
    }),

  // ------------------------------------------
  // 13. getSimulacao
  // Buscar resultado da simulação salva
  // ------------------------------------------
  getSimulacao: protectedProcedure
    .input(z.object({ sessaoId: z.number() }))
    .query(async ({ ctx, input }) => {

      const [sessao] = await db
        .select({
          simulacaoResultado: sessoesJuri.simulacaoResultado,
        })
        .from(sessoesJuri)
        .where(eq(sessoesJuri.id, input.sessaoId));

      if (!sessao) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Sessão do júri não encontrada",
        });
      }

      return sessao.simulacaoResultado ?? null;
    }),
});
