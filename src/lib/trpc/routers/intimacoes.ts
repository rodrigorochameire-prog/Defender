/**
 * Router de Intimacoes
 *
 * Gerencia o enfileiramento de jobs de importacao de intimacoes PJe
 * via lane browser (skill pje-intimacoes-import).
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { claudeCodeTasks } from "@/lib/db/schema/casos";
import {
  pjeImportStaging,
  pjeIntimacoesLedger,
  demandas,
  assistidos,
} from "@/lib/db/schema";
import { and, desc, eq, inArray, isNull, isNotNull, sql } from "drizzle-orm";
import {
  enrichStagingWithLiveDedup,
  stagingRowToImportRow,
  buildLedgerUpserts,
  parseStagingRow,
} from "@/lib/services/pje-intimacoes-import";
import {
  calcularPrazoDefensoria,
  normalizarNome,
  ASSISTIDO_A_IDENTIFICAR,
} from "@/lib/pje-parser";
import type { PjeImportStaging } from "@/lib/db/schema/pje-import";

/**
 * Índice em memória: nome-de-assistido normalizado → ids[] dos assistidos vivos.
 * Construído UMA vez por `listStaging` (1 query) e reusado no match por linha,
 * evitando N queries. >1 id no mesmo nome ⇒ homônimos ("multiplo").
 */
type AssistidoIndex = Map<string, number[]>;

/**
 * Classifica o nome de um assistido contra o índice:
 *   0 ids → "novo"; 1 → "vinculado" (+id); >1 → "multiplo".
 * Nome vazio, marker "a identificar" ou réu não-identificado ⇒ sempre "novo".
 */
function classificarAssistidoMatch(
  nome: string | null | undefined,
  naoIdentificado: boolean,
  index: AssistidoIndex,
): {
  assistidoMatch: "novo" | "vinculado" | "multiplo";
  matchedAssistidoId: number | null;
} {
  if (
    !nome ||
    naoIdentificado ||
    nome === ASSISTIDO_A_IDENTIFICAR
  ) {
    return { assistidoMatch: "novo", matchedAssistidoId: null };
  }
  const norm = normalizarNome(nome);
  if (!norm) return { assistidoMatch: "novo", matchedAssistidoId: null };
  const ids = index.get(norm);
  if (!ids || ids.length === 0) {
    return { assistidoMatch: "novo", matchedAssistidoId: null };
  }
  if (ids.length === 1) {
    return { assistidoMatch: "vinculado", matchedAssistidoId: ids[0] };
  }
  return { assistidoMatch: "multiplo", matchedAssistidoId: null };
}

/**
 * Prazo da Defensoria (10 dias corridos de leitura + prazo EM DOBRO em dias úteis)
 * via `calcularPrazoDefensoria`, que espera "DD/MM/YYYY" (sem hora) + dias. Retorna
 * ISO "YYYY-MM-DD" ou null se faltar dado / o cálculo falhar. NUNCA lança.
 */
function calcularPrazoDefensoriaISO(
  dataExpedicao: string | null | undefined,
  prazoDias: number | null | undefined,
): string | null {
  try {
    if (
      !dataExpedicao ||
      typeof prazoDias !== "number" ||
      !Number.isFinite(prazoDias)
    ) {
      return null;
    }
    // O parser entrega "DD/MM/YYYY HH:MM"; a função só quer a data → tira a hora.
    const dataSemHora = dataExpedicao.split(" ")[0];
    const ddmmyy = calcularPrazoDefensoria(dataSemHora, prazoDias); // "DD/MM/YY"
    const m = ddmmyy.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
    if (!m) return null;
    return `20${m[3]}-${m[2]}-${m[1]}`;
  } catch {
    return null;
  }
}

/**
 * Enriquece linhas de staging com os campos SEMÂNTICOS do parser canônico
 * (crime, tipoProcesso, vara, MPU, assistido title-case) — os mesmos que serão
 * gravados na importação — para a tela de revisão ficar tão rica quanto o import
 * manual. Parser é puro/regex; barato mesmo em dezenas de linhas.
 */
// Extrai a "Data limite prevista para ciência/manifestação: [Dia-da-semana,] DD/MM/YYYY"
// do texto cru do expediente → ISO date (YYYY-MM-DD), ou null. É o prazo que o PJe
// mostra ao defensor; a urgência (dias restantes) é calculada no cliente.
function extrairDataLimite(conteudo: string | null): string | null {
  if (!conteudo) return null;
  const m = conteudo.match(
    /Data limite prevista[^:]*:\s*(?:[A-Za-zÀ-ÿ-]+,?\s*)?(\d{2})\/(\d{2})\/(\d{4})/i,
  );
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

function comCamposParseados(
  rows: PjeImportStaging[],
  assistidoIndex: AssistidoIndex,
) {
  return rows.map((r) => {
    const int = parseStagingRow(r)?.int;
    const assistidoParsed = int?.assistido ?? null;
    const { assistidoMatch, matchedAssistidoId } = classificarAssistidoMatch(
      assistidoParsed ?? r.assistidoNome,
      Boolean(int?.assistidoNaoIdentificado),
      assistidoIndex,
    );
    return {
      ...r,
      crime: int?.crime ?? null,
      tipoProcesso: int?.tipoProcesso ?? null,
      vara: int?.vara ?? null,
      isMPU: Boolean(int?.isMPU),
      assistidoParsed,
      dataLimite: extrairDataLimite(r.conteudo),
      assistidoMatch,
      matchedAssistidoId,
      prazoDefensoria: calcularPrazoDefensoriaISO(
        int?.dataExpedicao,
        int?.prazo,
      ),
    };
  });
}
import { importarDemandas } from "@/lib/services/pje-import";

// ==========================================
// INTIMACOES ROUTER
// ==========================================

const ATRIBUICOES_PERMITIDAS = ["VVD_CAMACARI", "JURI_CAMACARI"] as const;

export const criarVarreduraJobInput = z
  .object({
    atribuicoes: z.array(z.enum(ATRIBUICOES_PERMITIDAS)).min(1).optional(),
    demandaIds: z.array(z.number().int()).min(1).max(50).optional(),
    since: z.string().optional(),
    limit: z.number().int().min(1).max(500).optional(),
  })
  .refine(
    (v) => Boolean(v.atribuicoes?.length) !== Boolean(v.demandaIds?.length),
    { message: "Informe atribuicoes OU demandaIds (exatamente um)." },
  );

const criarImportJobInput = z.object({
  atribuicoes: z.array(z.enum(ATRIBUICOES_PERMITIDAS)).min(1),
  since: z.string().optional(), // YYYY-MM-DD
  until: z.string().optional(), // YYYY-MM-DD
  limit: z.number().int().min(1).max(500).optional(),
  // Distribui as intimações da caixa geral para as caixas das varas (ícone
  // "varinha" no PJe) antes de importar — deixa tudo na caixa certa.
  distribuir: z.boolean().optional(),
});

export type CriarImportJobInput = z.infer<typeof criarImportJobInput>;

export function buildJobMeta(input: CriarImportJobInput) {
  return {
    atribuicoes: input.atribuicoes,
    since: input.since,
    until: input.until,
    limit: input.limit ?? 80,
    distribuir: input.distribuir ?? false,
  };
}

/**
 * maxExpedicaoImportadaISO — maior data de EXPEDIÇÃO já importada (o "de onde
 * partir" na próxima importação). Considera apenas demandas vivas (deletedAt null)
 * que tenham pjeDocumentoId não-nulo — i.e., demandas de fato originadas de
 * intimações PJe. Retorna ISO "YYYY-MM-DD" ou null se não houver dado.
 * NUNCA lança: 1 query agregada com max(); qualquer falha vira null.
 */
async function maxExpedicaoImportadaISO(): Promise<string | null> {
  try {
    const [row] = await db
      // ::text garante string "YYYY-MM-DD HH:MM:SS" (evita Date e fuso); pegamos a data.
      .select({ max: sql<string | null>`max(${demandas.dataExpedicao})::text` })
      .from(demandas)
      .where(
        and(isNull(demandas.deletedAt), isNotNull(demandas.pjeDocumentoId)),
      );
    const v = row?.max ?? null;
    if (!v) return null;
    const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
  } catch {
    return null;
  }
}

export const intimacoesRouter = router({
  /**
   * criarImportJob — Enfileira importacao de intimacoes PJe (lane browser).
   * Dedup: retorna job existente se ja houver um pending/processing.
   */
  criarImportJob: protectedProcedure
    .input(criarImportJobInput)
    .mutation(async ({ ctx, input }) => {
      // Dedup: nao enfileira se ja houver um import ativo — evita imports concorrentes.
      const emAndamento = await db
        .select({ id: claudeCodeTasks.id })
        .from(claudeCodeTasks)
        .where(
          and(
            eq(claudeCodeTasks.skill, "pje-intimacoes-import"),
            inArray(claudeCodeTasks.status, ["pending", "processing"]),
          ),
        )
        .limit(1);

      if (emAndamento.length > 0) {
        return { success: true, existing: true, taskId: emAndamento[0].id };
      }

      const meta = buildJobMeta(input);
      const [task] = await db
        .insert(claudeCodeTasks)
        .values({
          skill: "pje-intimacoes-import",
          lane: "browser",
          prompt: `Importar intimacoes PJe — ${meta.atribuicoes.join(", ")} (lane browser)`,
          instrucaoAdicional: JSON.stringify(meta),
          status: "pending",
          createdBy: ctx.user.id,
        })
        .returning({ id: claudeCodeTasks.id });

      return { success: true, existing: false, taskId: task.id };
    }),

  /**
   * listStaging — Retorna status do job + linhas staged, enriquecidas com Layer-B.
   * Layer-B rebaixa 'nova' → 'incerta' para linhas que batem com demandas vivas.
   */
  listStaging: protectedProcedure
    .input(z.object({ jobId: z.number().int() }))
    .query(async ({ input }) => {
      const [task] = await db
        .select({ status: claudeCodeTasks.status, etapa: claudeCodeTasks.etapa })
        .from(claudeCodeTasks)
        .where(eq(claudeCodeTasks.id, input.jobId))
        .limit(1);

      if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "Job de importação não encontrado" });

      // orderBy(id) = ordem de raspagem = ordem do painel do PJe (o worker insere
      // os expedientes na sequência em que aparecem). É a ordenação padrão da UI.
      const stagingRows = await db
        .select()
        .from(pjeImportStaging)
        .where(eq(pjeImportStaging.jobId, input.jobId))
        .orderBy(pjeImportStaging.id);

      // Feature 1: índice nome→ids dos assistidos vivos, construído UMA vez (1 query)
      // e reusado no match em memória de cada linha (evita N queries no map).
      const assistidosVivos = await db
        .select({ id: assistidos.id, nome: assistidos.nome })
        .from(assistidos)
        .where(isNull(assistidos.deletedAt));
      const assistidoIndex: AssistidoIndex = new Map();
      for (const a of assistidosVivos) {
        const norm = normalizarNome(a.nome ?? "");
        if (!norm) continue;
        const arr = assistidoIndex.get(norm);
        if (arr) arr.push(a.id);
        else assistidoIndex.set(norm, [a.id]);
      }

      // Layer-B: dedup fuzzy contra demandas vivas — só quando o job está concluído.
      // Durante pending/processing as linhas ainda estão sendo escritas; rodar Layer-B
      // seria parcial e desperdiçaria um full-scan de demandas a cada heartbeat.
      // Nota: demandas não tem coluna processoNumero (usa processoId FK → processos),
      // portanto o scope por número de processo exigiria um join adicional.
      // O gate completed-only cobre o caso principal e já elimina o hot-path.
      if (task.status === "completed") {
        const demandasVivas = await db
          .select()
          .from(demandas)
          .where(isNull(demandas.deletedAt));
        // Layer-A forte: se o pjeDocumentoId já é uma demanda viva, marca
        // "ja_importada" ANTES de o defensor confirmar — é a MESMA chave que a
        // importação usa pra deduplicar, então a tela passa a refletir o que de
        // fato vai acontecer (sem a surpresa de tudo aparecer como "nova").
        const docidsExistentes = new Set(
          demandasVivas
            .map((d) => d.pjeDocumentoId)
            .filter((x): x is string => !!x),
        );
        const stagingDedup: PjeImportStaging[] = stagingRows.map((r) =>
          r.decisao === "nova" &&
          r.pjeDocumentoId &&
          docidsExistentes.has(r.pjeDocumentoId)
            ? { ...r, decisao: "ja_importada" }
            : r,
        );
        const rows = comCamposParseados(
          enrichStagingWithLiveDedup(stagingDedup, demandasVivas),
          assistidoIndex,
        );
        return { status: task.status, etapa: task.etapa ?? null, rows };
      }
      return {
        status: task.status,
        etapa: task.etapa ?? null,
        rows: comCamposParseados(stagingRows, assistidoIndex),
      };
    }),

  /**
   * ultimaImportacao — Retorna a última importação concluída (para a UI saber de
   * onde continuar na próxima). Lê o último job completed da skill, com a data de
   * conclusão, total raspado e atribuições cobertas.
   */
  ultimaImportacao: protectedProcedure.query(async () => {
    const [job] = await db
      .select({
        id: claudeCodeTasks.id,
        completedAt: claudeCodeTasks.completedAt,
        createdAt: claudeCodeTasks.createdAt,
        resultado: claudeCodeTasks.resultado,
      })
      .from(claudeCodeTasks)
      .where(
        and(
          eq(claudeCodeTasks.skill, "pje-intimacoes-import"),
          eq(claudeCodeTasks.status, "completed"),
        ),
      )
      .orderBy(desc(claudeCodeTasks.id))
      .limit(1);

    if (!job) return null;
    const r = (job.resultado ?? {}) as {
      raspadas?: number;
      atribuicoes?: string[];
    };
    // Watermark de período: "de onde partir" na próxima importação = maior data
    // de expedição já importada. Mesma data serve para exibição ("importado até").
    const proximoSince = await maxExpedicaoImportadaISO();
    return {
      jobId: job.id,
      finishedAt: (job.completedAt ?? job.createdAt)?.toISOString() ?? null,
      totalRaspadas: typeof r.raspadas === "number" ? r.raspadas : null,
      atribuicoes: Array.isArray(r.atribuicoes) ? r.atribuicoes : [],
      proximoSince,
      maxExpedicaoImportada: proximoSince,
    };
  }),

  /**
   * confirmarImport — Aplica edições do usuário, importa as linhas selecionadas
   * via importarDemandas, e grava o ledger permanente para TODAS as linhas staged.
   *
   * Ledger upsert: usa SELECT-then-UPDATE/INSERT para contornar a limitação do
   * Drizzle com onConflictDoUpdate em partial unique indexes.
   *
   * Nota: importarDemandas retorna apenas contadores agregados (imported/updated/
   * skipped/errors), sem IDs por linha. Por isso demandaId fica null no ledger —
   * não temos como vincular per-row sem refatorar importarDemandas.
   */
  confirmarImport: protectedProcedure
    .input(
      z.object({
        jobId: z.number().int(),
        selectedIds: z.array(z.number().int()),
        edits: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const stagingRows = await db
        .select()
        .from(pjeImportStaging)
        .where(eq(pjeImportStaging.jobId, input.jobId));

      const selectedSet = new Set(input.selectedIds);

      // Aplica edições da página (revisao) antes de mapear.
      const withEdits = stagingRows.map((r) => {
        const e = input.edits?.[String(r.id)];
        return e ? { ...r, revisao: { ...(r.revisao ?? {}), ...e } } : r;
      });

      const rowsToImport = withEdits.filter((r) => selectedSet.has(r.id));
      const importRows = rowsToImport.map(stagingRowToImportRow);

      const result = await importarDemandas(importRows, ctx.user.id, false);

      // Ledger: grava TODOS os itens staged (imported/skipped/duplicate).
      // Usa SELECT-then-UPDATE/INSERT para contornar partial-index onConflict.
      // Wrapped em transaction para garantir atomicidade: ou grava tudo ou nada.
      const upserts = buildLedgerUpserts(withEdits, selectedSet, input.jobId);
      let ledgerWritten = 0;

      await db.transaction(async (tx) => {
        for (const u of upserts) {
          let existing: { id: number } | undefined;

          if (u.pjeDocumentoId) {
            // Busca pela chave forte: pje_documento_id
            [existing] = await tx
              .select({ id: pjeIntimacoesLedger.id })
              .from(pjeIntimacoesLedger)
              .where(eq(pjeIntimacoesLedger.pjeDocumentoId, u.pjeDocumentoId))
              .limit(1);
          } else {
            // Fallback: content_hash único onde pje_documento_id IS NULL
            [existing] = await tx
              .select({ id: pjeIntimacoesLedger.id })
              .from(pjeIntimacoesLedger)
              .where(
                and(
                  eq(pjeIntimacoesLedger.contentHash, u.contentHash),
                  isNull(pjeIntimacoesLedger.pjeDocumentoId),
                ),
              )
              .limit(1);
          }

          if (existing) {
            await tx
              .update(pjeIntimacoesLedger)
              .set({ decisao: u.decisao, lastSeenAt: new Date(), jobId: u.jobId })
              .where(eq(pjeIntimacoesLedger.id, existing.id));
          } else {
            await tx.insert(pjeIntimacoesLedger).values({
              pjeDocumentoId: u.pjeDocumentoId,
              contentHash: u.contentHash,
              processoNumero: u.processoNumero,
              atribuicao: u.atribuicao as never,
              decisao: u.decisao,
              jobId: u.jobId,
              // demandaId: null — importarDemandas não retorna IDs por linha.
            });
          }

          ledgerWritten++;
        }
      });

      return { ...result, ledgerWritten };
    }),

  /**
   * criarVarreduraJob — Enfileira varredura de triagem (lane browser, skill
   * varredura-triagem). Uma atribuição por job: o worker recebe `--atribuicao`
   * singular, então `atribuicao` vai no meta no SINGULAR. Se vierem várias,
   * enfileira uma task por atribuição.
   *
   * Dedup: se já houver QUALQUER task da skill varredura-triagem ativa
   * (pending/processing), retorna os taskIds existentes sem enfileirar de novo
   * — espelha o dedup de criarImportJob.
   */
  criarVarreduraJob: protectedProcedure
    .input(criarVarreduraJobInput)
    .mutation(async ({ ctx, input }) => {
      // Dedup: não enfileira se já houver varredura ativa — evita concorrência.
      const emAndamento = await db
        .select({ id: claudeCodeTasks.id })
        .from(claudeCodeTasks)
        .where(
          and(
            eq(claudeCodeTasks.skill, "varredura-triagem"),
            inArray(claudeCodeTasks.status, ["pending", "processing"]),
          ),
        );

      if (emAndamento.length > 0) {
        return {
          success: true,
          existing: true,
          taskIds: emAndamento.map((t) => t.id),
        };
      }

      // Branch por demanda: 1 task com os IDs, sem atribuição/since.
      if (input.demandaIds?.length) {
        const [task] = await db
          .insert(claudeCodeTasks)
          .values({
            skill: "varredura-triagem",
            lane: "browser",
            prompt: `Leitura profunda — ${input.demandaIds.length} demanda(s) selecionada(s) (lane browser)`,
            instrucaoAdicional: JSON.stringify({
              demandaIds: input.demandaIds,
              modo: "cdp",
              defensorId: ctx.user.id,
            }),
            status: "pending",
            createdBy: ctx.user.id,
          })
          .returning({ id: claudeCodeTasks.id });
        return { success: true, existing: false, taskIds: [task.id] };
      }

      const limit = input.limit ?? 80;
      const taskIds: number[] = [];

      // Uma task por atribuição (worker recebe --atribuicao singular).
      // Garantido presente pelo XOR do schema (demandaIds já retornou acima).
      for (const atribuicao of input.atribuicoes ?? []) {
        const [task] = await db
          .insert(claudeCodeTasks)
          .values({
            skill: "varredura-triagem",
            lane: "browser",
            prompt: `Varredura de triagem — ${atribuicao} (lane browser)`,
            instrucaoAdicional: JSON.stringify({
              atribuicao,
              since: input.since,
              limit,
              modo: "cdp",
              defensorId: ctx.user.id, // filtra as demandas do defensor logado
            }),
            status: "pending",
            createdBy: ctx.user.id,
          })
          .returning({ id: claudeCodeTasks.id });
        taskIds.push(task.id);
      }

      return { success: true, existing: false, taskIds };
    }),

  /**
   * statusVarredura — Status/etapa/resultado de um job de varredura para a UI
   * acompanhar via poll.
   */
  statusVarredura: protectedProcedure
    .input(z.object({ jobId: z.number().int() }))
    .query(async ({ input }) => {
      const [task] = await db
        .select({
          status: claudeCodeTasks.status,
          etapa: claudeCodeTasks.etapa,
          resultado: claudeCodeTasks.resultado,
        })
        .from(claudeCodeTasks)
        .where(eq(claudeCodeTasks.id, input.jobId))
        .limit(1);

      if (!task)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Job de varredura não encontrado",
        });

      return {
        status: task.status,
        etapa: task.etapa ?? null,
        resultado: task.resultado ?? null,
      };
    }),
});
