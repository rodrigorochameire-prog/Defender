/**
 * Router de Importação de Pauta de Audiências
 *
 * Gerencia o enfileiramento de jobs de importação de pauta PJe
 * via lane browser (skill importar-pauta) e a confirmação (promote)
 * das linhas staged para a tabela canônica de audiências.
 *
 * Espelha o padrão de intimacoes.ts: enqueue com dedup, listStaging
 * enriquecido via parser puro, confirmarImport via importarAudiencias.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { claudeCodeTasks } from "@/lib/db/schema/casos";
import { pautaImportStaging } from "@/lib/db/schema/pauta-import";
import { audiencias, processos } from "@/lib/db/schema";
import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { linhaParaEvento, formatDataHora } from "@/lib/agenda/parse-pauta";
import { importarAudiencias } from "@/lib/agenda/importar-audiencias";

// ---------------------------------------------------------------------------
// Constantes compartilhadas com o worker (mesmas atribuições do browser-broker)
// ---------------------------------------------------------------------------

const ATRIBUICOES_PERMITIDAS = ["VVD_CAMACARI", "JURI_CAMACARI"] as const;

// ---------------------------------------------------------------------------
// PAUTA ROUTER
// ---------------------------------------------------------------------------

export const pautaRouter = router({
  /**
   * criarImportJob — Enfileira importação da pauta de audiências PJe (lane browser).
   * Dedup: retorna job existente se já houver um pending/processing com a mesma skill.
   */
  criarImportJob: protectedProcedure
    .input(
      z.object({
        atribuicoes: z.array(z.enum(ATRIBUICOES_PERMITIDAS)).min(1),
        since: z.string().optional(), // YYYY-MM-DD
        until: z.string().optional(), // YYYY-MM-DD
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Dedup: não enfileira se já houver um import ativo — evita imports concorrentes.
      const emAndamento = await db
        .select({ id: claudeCodeTasks.id })
        .from(claudeCodeTasks)
        .where(
          and(
            eq(claudeCodeTasks.skill, "importar-pauta"),
            inArray(claudeCodeTasks.status, ["pending", "processing"]),
          ),
        )
        .limit(1);

      if (emAndamento.length > 0) {
        return { success: true, existing: true, taskId: emAndamento[0].id };
      }

      // Defaults: since = hoje (ISO), until = hoje + 60 dias
      const hoje = new Date();
      const toISODate = (d: Date) => d.toISOString().slice(0, 10);
      const since = input.since ?? toISODate(hoje);
      const until = (() => {
        if (input.until) return input.until;
        const d = new Date(hoje);
        d.setDate(d.getDate() + 60);
        return toISODate(d);
      })();

      const meta = { atribuicoes: input.atribuicoes, since, until };

      const [task] = await db
        .insert(claudeCodeTasks)
        .values({
          skill: "importar-pauta",
          lane: "browser",
          prompt: `Importar pauta de audiências PJe — ${meta.atribuicoes.join(", ")} (lane browser)`,
          instrucaoAdicional: JSON.stringify(meta),
          status: "pending",
          createdBy: ctx.user.id,
        })
        .returning({ id: claudeCodeTasks.id });

      return { success: true, existing: false, taskId: task.id };
    }),

  /**
   * listStaging — Retorna status do job + linhas staged, cada uma enriquecida
   * com preview via linhaParaEvento (assistido, tipo, atribuição, status, título).
   *
   * Inclui reconciliarPrevisto: estimativa do número de audiências agendadas
   * que serão superadas (redesignadas) pelo confirmarImport. O valor autoritativo
   * vem de confirmarImport.reconciliadas; este é best-effort para a UI callout.
   */
  listStaging: protectedProcedure
    .input(z.object({ jobId: z.number().int() }))
    .query(async ({ input }) => {
      const [task] = await db
        .select({ status: claudeCodeTasks.status, etapa: claudeCodeTasks.etapa })
        .from(claudeCodeTasks)
        .where(eq(claudeCodeTasks.id, input.jobId))
        .limit(1);

      if (!task) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Job de importação de pauta não encontrado",
        });
      }

      // Linhas staged ordenadas por id de inserção (ordem da raspagem = ordem do PJe)
      const stagingRows = await db
        .select()
        .from(pautaImportStaging)
        .where(eq(pautaImportStaging.jobId, input.jobId))
        .orderBy(pautaImportStaging.id);

      // Enriquecer cada linha com preview derivado via linhaParaEvento (puro/regex, barato)
      const rows = stagingRows.map((r) => {
        const dataHora = formatDataHora(r.dataAudiencia);
        let preview: ReturnType<typeof linhaParaEvento> | null = null;
        try {
          preview = linhaParaEvento({
            dataHora,
            processo: r.processoNumero ?? "",
            orgao: r.orgaoJulgador ?? "",
            partes: r.partesRaw ?? "",
            classe: r.classeRaw ?? "",
            tipo: r.tipoRaw ?? "",
            sala: r.sala ?? "",
            situacao: r.situacao ?? "",
          });
        } catch {
          // linhaParaEvento é puro; falha aqui é improvável mas nunca deixamos subir
        }
        return {
          id: r.id,
          selected: r.selected,
          situacao: r.situacao,
          dataAudiencia: r.dataAudiencia,
          processoNumero: r.processoNumero,
          // campos derivados do parser
          assistido: preview?.assistido ?? null,
          tipo: preview?.tipo ?? null,
          atribuicao: preview?.atribuicao ?? null,
          status: preview?.status ?? null,
          titulo: preview?.titulo ?? null,
        };
      });

      // -----------------------------------------------------------------------
      // reconciliarPrevisto — estimativa
      //
      // Conta audiências agendadas dos processos desta pauta, dentro da janela
      // de datas, que NÃO correspondem a nenhuma linha staged (processo+data).
      // Esses slots serão marcados "redesignada" pelo confirmarImport.
      //
      // Notas de timezone:
      //   staging data_audiencia  → naive BRT armazenada como "UTC" (getUTCHours = BRT)
      //   audiencias.dataAudiencia → UTC real (importarAudiencias usa -03:00 ao inserir)
      //   → BRT_OFFSET_MS (3h) converte staging para o espaço UTC de audiencias
      //
      // Valor conservador: 0 em caso de qualquer falha — não bloqueia a resposta.
      // -----------------------------------------------------------------------
      let reconciliarPrevisto = 0;

      try {
        const processoNums = [
          ...new Set(
            stagingRows
              .map((r) => r.processoNumero)
              .filter((p): p is string => !!p),
          ),
        ];

        if (processoNums.length > 0) {
          const stagingTimes = stagingRows
            .map((r) => r.dataAudiencia)
            .filter((d): d is Date => !!d)
            .map((d) => d.getTime());

          if (stagingTimes.length > 0) {
            // Converter janela para o espaço UTC de audiencias (+3h = BRT→UTC).
            // reduce (não spread) evita stack blowup em arrays grandes.
            const BRT_OFFSET_MS = 3 * 60 * 60 * 1000;
            const minTime = stagingTimes.reduce((a, b) => (b < a ? b : a));
            const maxTime = stagingTimes.reduce((a, b) => (b > a ? b : a));
            const windowStart = new Date(minTime + BRT_OFFSET_MS);
            windowStart.setUTCHours(0, 0, 0, 0);
            const windowEnd = new Date(maxTime + BRT_OFFSET_MS);
            windowEnd.setUTCHours(23, 59, 59, 999);

            // Processos correspondentes no banco pelo número de autos
            const processosNaPauta = await db
              .select({ id: processos.id, numeroAutos: processos.numeroAutos })
              .from(processos)
              .where(inArray(processos.numeroAutos, processoNums));

            if (processosNaPauta.length > 0) {
              const processoIds = processosNaPauta.map((p) => p.id);
              const numeroToId = new Map(
                processosNaPauta.map((p) => [p.numeroAutos, p.id]),
              );

              // Audiências agendadas dentro da janela (candidatas a serem superadas)
              const audienciasNaJanela = await db
                .select({
                  id: audiencias.id,
                  processoId: audiencias.processoId,
                  dataAudiencia: audiencias.dataAudiencia,
                })
                .from(audiencias)
                .where(
                  and(
                    inArray(audiencias.processoId, processoIds),
                    eq(audiencias.status, "agendada"),
                    gte(audiencias.dataAudiencia, windowStart),
                    lte(audiencias.dataAudiencia, windowEnd),
                  ),
                );

              // Set de chaves (processoId|audienciasUTC) das linhas staged
              // staging.getTime() + BRT_OFFSET_MS = timestamp UTC equivalente em audiencias
              const stagingKeys = new Set<string>();
              for (const r of stagingRows) {
                if (r.processoNumero && r.dataAudiencia) {
                  const pid = numeroToId.get(r.processoNumero);
                  if (pid) {
                    stagingKeys.add(
                      `${pid}|${r.dataAudiencia.getTime() + BRT_OFFSET_MS}`,
                    );
                  }
                }
              }

              // Audiências agendadas que NÃO estão cobertas pela pauta = candidatas a superar
              reconciliarPrevisto = audienciasNaJanela.filter(
                (a) =>
                  a.dataAudiencia &&
                  !stagingKeys.has(`${a.processoId}|${a.dataAudiencia.getTime()}`),
              ).length;
            }
          }
        }
      } catch {
        // estimativa — falha silenciosa; UI usa 0 como valor conservador
      }

      return {
        status: task.status,
        etapa: task.etapa ?? null,
        rows,
        reconciliarPrevisto,
      };
    }),

  /**
   * confirmarImport — Aplica edições do usuário nas linhas selecionadas e
   * importa para a agenda via importarAudiencias (serviço extraído).
   *
   * edits: mapa de id-da-linha (string) → objeto com overrides. Por segurança
   * só fazemos merge dos campos que linhaParaEvento de fato lê (whitelist em
   * EDITABLE_FIELDS) — qualquer outra chave (id/jobId/contentHash/etc.) é
   * ignorada, removendo o caminho de sobrescrita arbitrária.
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
      // Guard: job precisa existir (espelha o NOT_FOUND de listStaging).
      const [task] = await db
        .select({ id: claudeCodeTasks.id })
        .from(claudeCodeTasks)
        .where(eq(claudeCodeTasks.id, input.jobId))
        .limit(1);

      if (!task) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Job de importação de pauta não encontrado",
        });
      }

      // Early exit: nenhuma linha selecionada
      if (input.selectedIds.length === 0) {
        return { importadas: 0, atualizadas: 0, reconciliadas: 0, ignoradas: 0 };
      }

      // Carregar apenas as linhas selecionadas do job
      const stagingRows = await db
        .select()
        .from(pautaImportStaging)
        .where(
          and(
            eq(pautaImportStaging.jobId, input.jobId),
            inArray(pautaImportStaging.id, input.selectedIds),
          ),
        );

      // Campos editáveis = exatamente os que linhaParaEvento lê. Qualquer outra
      // chave no objeto de edição é ignorada (defesa contra corrupção).
      const EDITABLE_FIELDS = [
        "dataAudiencia",
        "processoNumero",
        "orgaoJulgador",
        "partesRaw",
        "classeRaw",
        "tipoRaw",
        "sala",
        "situacao",
      ] as const;

      // Aplicar edições da UI (shallow-merge restrito à whitelist por id de linha)
      const withEdits = stagingRows.map((r) => {
        const e = input.edits?.[String(r.id)];
        if (!e) return r;
        const safe: Record<string, unknown> = {};
        for (const k of EDITABLE_FIELDS) {
          if (k in e) safe[k] = e[k];
        }
        return { ...r, ...safe };
      });

      // PULAR linhas sem data — uma data-lixo nunca pode virar audiência (M-2).
      const linhasComData = withEdits.filter((r) => {
        const d = r.dataAudiencia as Date | null | undefined;
        return d != null && !Number.isNaN(d.getTime());
      });

      // Construir eventos via linhaParaEvento e chamar importarAudiencias
      const eventos = linhasComData.map((r) =>
        linhaParaEvento({
          dataHora: formatDataHora(r.dataAudiencia as Date),
          processo: (r.processoNumero as string | null | undefined) ?? "",
          orgao: (r.orgaoJulgador as string | null | undefined) ?? "",
          partes: (r.partesRaw as string | null | undefined) ?? "",
          classe: (r.classeRaw as string | null | undefined) ?? "",
          tipo: (r.tipoRaw as string | null | undefined) ?? "",
          sala: (r.sala as string | null | undefined) ?? "",
          situacao: (r.situacao as string | null | undefined) ?? "",
        }),
      );

      const r = await importarAudiencias(eventos, { userId: ctx.user.id });

      return {
        importadas: r.importados,
        atualizadas: r.atualizados,
        reconciliadas: r.superados,
        ignoradas: r.duplicados,
      };
    }),
});
