/**
 * Router de Sentenças (1º grau)
 *
 * Persistência da análise de sentença produzida pela IA (skill
 * analise-sentenca): upsert idempotente da sentença + registro do
 * magistrado prolator, criação de um registro tipo "analise" no diário
 * de bordo e refino do ato/flag da demanda de origem.
 *
 * A linha de `sentencas` é COMPARTILHADA (institucional). A leitura de
 * detalhe é escopada pelo defensor da demanda de origem (getDetail); a
 * agregação (aggregate) projeta apenas colunas não-identificantes.
 */

import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db, withTransaction } from "@/lib/db";
import { sentencas, magistrados } from "@/lib/db/schema/sentencas";
import type { AnaliseSentenca } from "@/lib/db/schema/sentencas";
import { registros } from "@/lib/db/schema/agenda";
import { demandas, processos } from "@/lib/db/schema/core";
import { and, eq, isNull, sql } from "drizzle-orm";
import { buildMagistradoKey } from "@/lib/sentenca/magistrado-key";
import { resolveSentencaDedupe } from "@/lib/sentenca/dedupe";
import { getSentencaDetailScope } from "../defensor-scope";

// Atos genéricos que valem a pena substituir por um rótulo mais claro
// quando a IA tem confiança alta na classificação da decisão.
const ATOS_GENERICOS = new Set(["Ciência", "Analisar decisão", "Analisar sentença"]);

// Rótulo de ato derivado do tipo de decisão (refino do Kanban).
const ATO_POR_TIPO: Record<string, string> = {
  CONDENATORIA: "Ciência condenação / analisar recurso",
  PARCIAL: "Ciência condenação parcial / analisar recurso",
  ABSOLUTORIA: "Ciência absolvição",
  ABSOLVICAO_SUMARIA: "Ciência absolvição sumária",
  EXTINTIVA_PUNIBILIDADE: "Ciência extinção da punibilidade",
  PRONUNCIA: "Ciência pronúncia / analisar recurso",
  IMPRONUNCIA: "Ciência impronúncia",
  DESCLASSIFICACAO: "Ciência desclassificação",
};

export const sentencasRouter = router({
  // ────────────────────────────────────────────────────────────────────
  // upsertFromAnalysis — persiste a análise de sentença (idempotente).
  // Chamado pelo daemon após a skill analise-sentenca produzir o JSON.
  // ────────────────────────────────────────────────────────────────────
  upsertFromAnalysis: protectedProcedure
    .input(
      z.object({
        demandaOrigemId: z.number().int().positive(),
        numeroProcesso: z.string().optional(),
        pjeDocumentoId: z.string().nullish(),
        assistidoId: z.number().int().positive().nullish(),
        atribuicao: z.string().nullish(),
        driveFileId: z.number().int().positive().nullish(),
        analiseIa: z.custom<AnaliseSentenca>(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const analise = input.analiseIa as AnaliseSentenca;

      // 1. Resolver processoId + comarcaId + vara a partir da demanda.
      const [demanda] = await db
        .select({
          id: demandas.id,
          processoId: demandas.processoId,
          assistidoId: demandas.assistidoId,
          defensorId: demandas.defensorId,
          ato: demandas.ato,
        })
        .from(demandas)
        .where(eq(demandas.id, input.demandaOrigemId))
        .limit(1);
      if (!demanda) {
        throw new Error("Demanda de origem não encontrada");
      }

      const processoId: number | null = demanda.processoId ?? null;
      let comarcaId: number | null = null;
      let vara: string | null = null;
      let numeroProcesso: string | null = input.numeroProcesso ?? null;
      if (processoId != null) {
        const [proc] = await db
          .select({
            comarcaId: processos.comarcaId,
            vara: processos.vara,
            numeroAutos: processos.numeroAutos,
          })
          .from(processos)
          .where(eq(processos.id, processoId))
          .limit(1);
        if (proc) {
          comarcaId = proc.comarcaId ?? null;
          vara = proc.vara ?? null;
          numeroProcesso = numeroProcesso ?? proc.numeroAutos ?? null;
        }
      }

      // assistidoId: NOT NULL no registro → resolve do input ou da demanda.
      const assistidoId = input.assistidoId ?? demanda.assistidoId;

      // 2. Sigilo derivado da atribuição (VVD/MPU ⇒ sigiloso).
      const sigiloso = /VVD|MPU/i.test(input.atribuicao ?? "") ? 1 : 0;

      // Pré-cálculos puros (sem I/O) usados dentro da transação.
      const pjeDocumentoId = input.pjeDocumentoId ?? null;
      const tipoDecisao = analise.tipoDecisao ?? null;
      // dataSentenca é opcional e pode não existir no payload da IA.
      const dataSentenca =
        (analise as { dataSentenca?: string | null }).dataSentenca ?? null;
      const criadoPorId = ctx.user.defensorBaId ?? null;
      const { nomeNormalizado, comarcaId: comarcaKey } = buildMagistradoKey(
        analise.juizProlator ?? "",
        comarcaId
      );

      const dedupe = resolveSentencaDedupe({
        processoId,
        pjeDocumentoId,
        tipoDecisao,
        dataSentenca,
        demandaOrigemId: input.demandaOrigemId,
      });

      // Os passos de ESCRITA (magistrado, sentença, registro, refino da
      // demanda) correm numa única transação — integridade do dado jurídico:
      // ou tudo é gravado, ou nada (sem sentença órfã de registro).
      const resultado = await withTransaction(async (tx) => {
        // 3. Upsert do magistrado prolator (registro compartilhado).
        let magistradoId: number | null = null;
        if (nomeNormalizado) {
          const comarcaCond =
            comarcaKey == null
              ? isNull(magistrados.comarcaId)
              : eq(magistrados.comarcaId, comarcaKey);
          const [existente] = await tx
            .select({ id: magistrados.id, varasConhecidas: magistrados.varasConhecidas })
            .from(magistrados)
            .where(and(eq(magistrados.nomeNormalizado, nomeNormalizado), comarcaCond))
            .limit(1);
          if (existente) {
            magistradoId = existente.id;
            // Acrescenta a vara conhecida quando nova (best-effort).
            if (vara) {
              const atuais = existente.varasConhecidas ?? [];
              if (!atuais.includes(vara)) {
                await tx
                  .update(magistrados)
                  .set({ varasConhecidas: [...atuais, vara], updatedAt: new Date() })
                  .where(eq(magistrados.id, existente.id));
              }
            }
          } else {
            const [novo] = await tx
              .insert(magistrados)
              .values({
                nome: analise.juizProlator,
                nomeNormalizado,
                comarcaId: comarcaKey,
                status: "NAO_CONFIRMADO",
                varasConhecidas: vara ? [vara] : [],
              })
              .returning({ id: magistrados.id });
            magistradoId = novo?.id ?? null;
          }
        }

        // 4. Dedupe + upsert da sentença.
        let dedupeCond;
        if (dedupe.by === "doc") {
          dedupeCond = and(
            eq(sentencas.processoId, dedupe.processoId),
            eq(sentencas.pjeDocumentoId, dedupe.pjeDocumentoId)
          );
        } else if (dedupe.by === "tipo_data") {
          dedupeCond = and(
            eq(sentencas.processoId, dedupe.processoId),
            eq(sentencas.tipoDecisao, dedupe.tipoDecisao),
            eq(sentencas.dataSentenca, dedupe.dataSentenca)
          );
        } else {
          dedupeCond = eq(sentencas.demandaOrigemId, dedupe.demandaOrigemId);
        }

        const [existenteSentenca] = await tx
          .select({ id: sentencas.id })
          .from(sentencas)
          .where(dedupeCond)
          .limit(1);

        const valores = {
          processoId,
          assistidoId,
          demandaOrigemId: input.demandaOrigemId,
          magistradoId,
          comarcaId,
          vara,
          numeroProcesso,
          pjeDocumentoId,
          sigiloso,
          tipoDecisao,
          dataSentenca,
          driveFileId: input.driveFileId ?? null,
          analiseIa: analise,
          analiseStatus: "CONCLUIDO",
          analyzedAt: new Date(),
        };

        let sentencaId: number;
        if (existenteSentenca) {
          const [upd] = await tx
            .update(sentencas)
            .set({ ...valores, updatedAt: new Date() })
            .where(eq(sentencas.id, existenteSentenca.id))
            .returning({ id: sentencas.id });
          sentencaId = upd!.id;
        } else {
          const [ins] = await tx
            .insert(sentencas)
            .values({ ...valores, criadoPorId })
            .returning({ id: sentencas.id });
          sentencaId = ins!.id;
        }

        // 5. Registro tipo "analise" no diário de bordo da demanda.
        const conteudo = [
          analise.impactoParaDefesa?.trim(),
          analise.recomendacaoProxPasso?.trim(),
        ]
          .filter(Boolean)
          .join("\n\n");
        await tx.insert(registros).values({
          assistidoId,
          processoId,
          demandaId: input.demandaOrigemId,
          tipo: "analise",
          titulo: "Resumo e providências",
          assunto: analise.resultado ?? null,
          conteudo: conteudo || analise.dispositivoResumo || analise.resultado || "Análise da sentença",
          dataRegistro: new Date(),
          status: "realizado",
          autorId: ctx.user.id,
        });

        // 6. Refino da demanda (nunca altera status).
        if (analise.confidence === "alta" && ATOS_GENERICOS.has(demanda.ato)) {
          const novoAto = tipoDecisao ? ATO_POR_TIPO[tipoDecisao] : undefined;
          if (novoAto && novoAto !== demanda.ato) {
            await tx
              .update(demandas)
              .set({ ato: novoAto, updatedAt: new Date() })
              .where(eq(demandas.id, input.demandaOrigemId));
          }
        } else if (analise.confidence === "baixa") {
          await tx
            .update(demandas)
            .set({ revisaoPendente: true, updatedAt: new Date() })
            .where(eq(demandas.id, input.demandaOrigemId));
        }

        return { id: sentencaId, magistradoId };
      });

      return resultado;
    }),

  // ────────────────────────────────────────────────────────────────────
  // getDetail — detalhe escopado pelo defensor da demanda de origem.
  // ────────────────────────────────────────────────────────────────────
  getDetail: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const scope = getSentencaDetailScope(ctx.user);

      const [row] = await db
        .select({
          sentenca: sentencas,
          demandaDefensorId: demandas.defensorId,
        })
        .from(sentencas)
        .leftJoin(demandas, eq(sentencas.demandaOrigemId, demandas.id))
        .where(eq(sentencas.id, input.id))
        .limit(1);

      if (!row) return null;

      // Fora de escopo: demanda sem defensor visível.
      if (scope !== "all") {
        const defId = row.demandaDefensorId;
        if (defId == null || !scope.includes(defId)) return null;
      }

      // Magistrado vinculado (quando houver).
      let magistrado = null;
      if (row.sentenca.magistradoId != null) {
        const [mag] = await db
          .select()
          .from(magistrados)
          .where(eq(magistrados.id, row.sentenca.magistradoId))
          .limit(1);
        magistrado = mag ?? null;
      }

      return { ...row.sentenca, magistrado };
    }),

  // ────────────────────────────────────────────────────────────────────
  // aggregate — agregação institucional (TODAS as linhas), projetando
  // apenas colunas NÃO-identificantes. Forward-contract para dashboards.
  // ────────────────────────────────────────────────────────────────────
  aggregate: protectedProcedure
    .input(
      z.object({
        magistradoId: z.number().int().positive().optional(),
        comarcaId: z.number().int().positive().optional(),
      })
    )
    .query(async ({ input }) => {
      const conditions = [] as Array<ReturnType<typeof eq>>;
      if (input.magistradoId) conditions.push(eq(sentencas.magistradoId, input.magistradoId));
      if (input.comarcaId) conditions.push(eq(sentencas.comarcaId, input.comarcaId));

      const rows = await db
        .select({
          magistradoId: sentencas.magistradoId,
          vara: sentencas.vara,
          comarcaId: sentencas.comarcaId,
          tipoDecisao: sentencas.tipoDecisao,
          pena: sql`${sentencas.analiseIa}->'pena'`,
          dosimetria: sql`${sentencas.analiseIa}->'dosimetria'`,
          tesesDefensivas: sql`${sentencas.analiseIa}->'tesesDefensivas'`,
          flagsAlerta: sql`${sentencas.analiseIa}->'flagsAlerta'`,
        })
        .from(sentencas)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return rows;
    }),
});
