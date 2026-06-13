import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db, withTransaction, registros, demandas, users, processos, assistidos, audiencias } from "@/lib/db";
import { registroAnexos } from "@/lib/db/schema/agenda";
import { assistidosProcessos } from "@/lib/db/schema/core";
import { medidasMPU, processosVVD } from "@/lib/db/schema/vvd";
import { claudeCodeTasks } from "@/lib/db/schema/casos";
import { mirrorAnexoToDrive } from "@/lib/registros/mirror-anexo-to-drive";
import { detectarDesignacaoAudiencia } from "@/lib/registros/detectar-designacao-audiencia";
import {
  aplicarDesignacaoAudiencia,
  limparCalendarSupersedidas,
  type AudienciaSupersedida,
} from "@/lib/registros/aplicar-designacao-audiencia";
import { ATO_CIENCIA_DESIGNACAO, ATO_CIENCIA_REDESIGNACAO } from "@/lib/audiencia-parser";
import { and, asc, desc, eq, gte, ilike, inArray, lt, lte, or, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { getDefensoresVisiveis } from "../defensor-scope";
import { getParceirosIds } from "@/lib/trpc/comarca-scope";
import { buildDemandaSync, syncDemandaToSheets } from "@/lib/services/demanda-sync";
import { aplicarMedidasMPU, type MedidaCriada } from "@/lib/mpu/aplicar-medidas-mpu";

/**
 * Sync Google Sheets (fire-and-forget) — reconstrói a célula "Providências"
 * da demanda na planilha (master + planilha pessoal do defensor) após
 * criar/editar/excluir um registro vinculado.
 */
function syncProvidenciasToSheet(demandaId: number | null | undefined): void {
  if (!demandaId) return;
  buildDemandaSync(demandaId)
    .then((d) => {
      if (d) syncDemandaToSheets(d).catch(console.error);
    })
    .catch(console.error);
}

// ==========================================
// REGISTROS — router tipado
// ==========================================
//
// Este router substitui o legado `atendimentos` para os 8 tipos canônicos
// do diário de bordo do defensor. Mantemos `atendimentosRouter` ainda
// montado em paralelo até que a Task 3 do plano `registros-tipados`
// finalize a migração dos consumidores.

const TIPO_REGISTRO = z.enum([
  "atendimento",
  "diligencia",
  "anotacao",
  "ciencia",
  "providencia",
  "delegacao",
  "pesquisa",
  "elaboracao",
  "peticao",
  "busca",
  "investigacao",
  "transferencia",
]);

// ─── Campos SOLAR do atendimento (spec 2026-06-11-atendimentos-modulo) ─────
export const SUBTIPO_ATENDIMENTO = z.enum(["inicial", "retorno"]);
export const AREA_ATENDIMENTO = z.enum([
  "CRIMINAL",
  "VIOLENCIA_DOMESTICA",
  "JURI",
  "EXECUCAO_PENAL",
  "CIVEL",
  "FAMILIA",
  "OUTRA",
]);
export const historicoSolarSchema = z.array(
  z.object({
    data: z.string(),
    numero: z.string().optional(),
    texto: z.string(),
  })
);
export const processosCitadosSchema = z.array(
  z.object({
    cnj: z.string(),
    processoId: z.number().int().positive().optional(),
    origem: z.enum(["vinculado_solar", "anotacao"]),
  })
);

export const dossieAtendimentoSchema = z.object({
  gerado_em: z.string().optional(),
  fonte: z.enum(["ombuds", "skill"]).optional(),
  objetivo: z.string().optional(),
  resumo: z.array(z.string()).optional(),
  situacao_processual: z
    .array(
      z.object({
        cnj: z.string(),
        area: z.string().nullish(),
        fase: z.string().nullish(),
        situacao: z.string().nullish(),
        proximo_evento: z.string().nullish(),
        observacao: z.string().nullish(),
      })
    )
    .optional(),
  alertas: z.array(z.string()).optional(),
  medidas_vigentes: z.array(z.string()).optional(),
  orientacoes: z.array(z.string()).optional(),
  perguntas: z.array(z.string()).optional(),
  documentos_solicitar: z.array(z.string()).optional(),
  providencias: z.array(z.string()).optional(),
  historico_relevante: z.array(z.string()).optional(),
});

const camposAtendimentoSolar = {
  numeroSolar: z.string().max(30).optional(),
  subtipo: SUBTIPO_ATENDIMENTO.optional(),
  area: AREA_ATENDIMENTO.optional(),
  pedido: z.string().max(80).optional(),
  anotacoesRecepcao: z.string().optional(),
  historicoSolar: historicoSolarSchema.optional(),
  processosCitados: processosCitadosSchema.optional(),
  dossieAtendimento: dossieAtendimentoSchema.nullish(),
};

// ─── Schema exportado para testes unitários (Task 5) ───────────────────────
export const updateRegistroInput = z.object({
  id: z.number().int().positive(),
  titulo: z.string().max(120).optional(),
  conteudo: z.string().optional(),
  tipo: TIPO_REGISTRO.optional(),
  status: z.enum(["agendado", "realizado", "cancelado"]).optional(),
  // Edição/reagendamento de atendimentos
  assunto: z.string().nullish(),
  local: z.string().nullish(),
  dataRegistro: z.union([z.string(), z.date()]).optional(),
  processoId: z.number().int().positive().nullish(),
  ...camposAtendimentoSolar,
});

// ─── Schema exportado para testes unitários (Task 3) ───────────────────────
export const agendarAtendimentoInput = z.object({
  assistidoId: z.number().int().positive(),
  dataRegistro: z.union([z.string(), z.date()]),
  titulo: z.string().max(120).optional(),
  assunto: z.string().optional(),
  local: z.string().optional(),
  processoId: z.number().int().positive().optional(),
  casoId: z.number().int().positive().optional(),
  demandaId: z.number().int().positive().optional(),
  // Walk-in na sede: registra direto como realizado, com relato
  status: z.enum(["agendado", "realizado"]).default("agendado"),
  conteudo: z.string().optional(),
  ...camposAtendimentoSolar,
});

/**
 * Escopo de visibilidade por defensor: autor + parceiros de comarca.
 * Visão global ("all") não adiciona condição.
 */
async function pushEscopoDefensor(
  conditions: Array<ReturnType<typeof eq>>,
  user: Parameters<typeof getDefensoresVisiveis>[0]
) {
  const visiveis = getDefensoresVisiveis(user);
  if (visiveis === "all") return;
  if (visiveis.length === 1) {
    const userId = visiveis[0];
    const parceiros = await getParceirosIds(userId);
    if (parceiros.length > 0) {
      conditions.push(inArray(registros.autorId, [userId, ...parceiros]));
    } else {
      conditions.push(eq(registros.autorId, userId));
    }
  } else if (visiveis.length > 1) {
    conditions.push(inArray(registros.autorId, visiveis));
  } else {
    conditions.push(eq(registros.autorId, user.id));
  }
}

export const registrosRouter = router({
  // ────────────────────────────────────────────────────────────────────
  // list — filtros por contexto (assistido, processo, demanda, audiência)
  // ────────────────────────────────────────────────────────────────────
  list: protectedProcedure
    .input(
      z.object({
        assistidoId: z.number().int().positive().optional(),
        processoId: z.number().int().positive().optional(),
        demandaId: z.number().int().positive().optional(),
        audienciaId: z.number().int().positive().optional(),
        tipo: TIPO_REGISTRO.optional(),
        limit: z.number().int().min(1).max(100).default(50),
        cursor: z
          .object({
            dataRegistro: z.string(),
            id: z.number().int(),
          })
          .optional(),
      })
    )
    .query(async ({ input }) => {
      const conditions = [] as Array<ReturnType<typeof eq>>;

      if (input.assistidoId) conditions.push(eq(registros.assistidoId, input.assistidoId));
      if (input.processoId) conditions.push(eq(registros.processoId, input.processoId));
      if (input.demandaId) conditions.push(eq(registros.demandaId, input.demandaId));
      if (input.audienciaId) conditions.push(eq(registros.audienciaId, input.audienciaId));
      if (input.tipo) conditions.push(eq(registros.tipo, input.tipo));

      // Cursor-based pagination: ordena por (dataRegistro DESC, id DESC).
      // O próximo "page" começa estritamente antes do par (dataRegistro, id) do cursor.
      if (input.cursor) {
        const cursorDate = new Date(input.cursor.dataRegistro);
        conditions.push(
          or(
            lt(registros.dataRegistro, cursorDate),
            and(eq(registros.dataRegistro, cursorDate), lt(registros.id, input.cursor.id))!
          )!
        );
      }

      const rows = await db
        .select({
          registro: registros,
          autor: {
            id: users.id,
            name: users.name,
            email: users.email,
          },
        })
        .from(registros)
        .leftJoin(users, eq(registros.autorId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(registros.dataRegistro), desc(registros.id))
        .limit(input.limit);

      return rows.map((r) => ({ ...r.registro, autor: r.autor }));
    }),

  // ────────────────────────────────────────────────────────────────────
  // create — insere registro + (se delegacao) atualiza demanda atomicamente
  // ────────────────────────────────────────────────────────────────────
  create: protectedProcedure
    .input(
      z.object({
        assistidoId: z.number().int().positive(),
        tipo: TIPO_REGISTRO,
        conteudo: z.string().min(1, "conteudo é obrigatório"),
        // Contexto opcional
        processoId: z.number().int().positive().optional(),
        demandaId: z.number().int().positive().optional(),
        audienciaId: z.number().int().positive().optional(),
        casoId: z.number().int().positive().optional(),
        titulo: z.string().max(120).optional(),
        dataRegistro: z
          .union([z.string(), z.date()])
          .optional()
          .transform((v) => (v ? new Date(v) : new Date())),
        interlocutor: z
          .enum(["assistido", "familiar", "testemunha", "outro"])
          .default("assistido"),
        // Delegação (só aplicável quando tipo === "delegacao")
        delegadoParaId: z.number().int().positive().optional(),
        motivoDelegacao: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const created = await withTransaction(async (tx) => {
        // 1. Insere o registro
        const [registro] = await tx
          .insert(registros)
          .values({
            assistidoId: input.assistidoId,
            processoId: input.processoId ?? null,
            demandaId: input.demandaId ?? null,
            audienciaId: input.audienciaId ?? null,
            casoId: input.casoId ?? null,
            tipo: input.tipo,
            titulo: input.titulo ?? null,
            conteudo: input.conteudo,
            dataRegistro: input.dataRegistro,
            interlocutor: input.interlocutor,
            status: "realizado",
            autorId: ctx.user.id,
          })
          .returning();

          if (!registro) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Falha ao criar registro",
            });
          }

        // 2. Side-effect de delegação: atualiza a demanda alvo.
        //    Só acontece quando explicitamente é tipo=delegacao + demandaId + delegadoParaId.
        if (
          input.tipo === "delegacao" &&
          input.demandaId &&
          input.delegadoParaId
        ) {
          await tx
            .update(demandas)
            .set({
              delegadoParaId: input.delegadoParaId,
              dataDelegacao: new Date(),
              motivoDelegacao: input.motivoDelegacao ?? input.conteudo,
              statusDelegacao: "delegada",
              updatedAt: new Date(),
            })
            .where(eq(demandas.id, input.demandaId));
        }

        // 3. Side-effect de ciência: despacho designando audiência no texto →
        //    agenda a audiência automaticamente (dedupe por processo+dia).
        let audienciaCriada: {
          id: number;
          data: string;
          horario: string;
          tipo: string;
          atualizada?: boolean;
        } | null = null;
        let atoAtualizado: string | null = null;
        // Audiências futuras canceladas por redesignação — eventos do Google
        // Calendar são removidos best-effort após o commit.
        let audienciasSupersedidas: AudienciaSupersedida[] = [];
        if (input.tipo === "ciencia" && input.processoId) {
          const det = detectarDesignacaoAudiencia(input.conteudo);
          if (det) {
            // Designação detectada → o ato da demanda acompanha a classificação
            // (designação × redesignação), dispensando o ajuste manual no Kanban
            // que reabriria o modal de agendamento.
            if (input.demandaId) {
              const novoAto = det.redesignacao
                ? ATO_CIENCIA_REDESIGNACAO
                : ATO_CIENCIA_DESIGNACAO;
              const [demandaAtual] = await tx
                .select({ ato: demandas.ato })
                .from(demandas)
                .where(eq(demandas.id, input.demandaId))
                .limit(1);
              if (demandaAtual && demandaAtual.ato !== novoAto) {
                await tx
                  .update(demandas)
                  .set({ ato: novoAto, updatedAt: new Date() })
                  .where(eq(demandas.id, input.demandaId));
                atoAtualizado = novoAto;
              }
            }
            const resultado = await aplicarDesignacaoAudiencia(tx, {
              processoId: input.processoId,
              assistidoId: input.assistidoId,
              defensorId: ctx.user.id,
              det,
              origem: "registro de ciência",
            });
            audienciasSupersedidas = resultado.supersedidas;
            if (resultado.audiencia) {
              // Vincula a audiência ao registro de ciência (selo durável na timeline)
              await tx
                .update(registros)
                .set({ audienciaId: resultado.audiencia.id })
                .where(eq(registros.id, registro.id));
              audienciaCriada = resultado.audiencia;
            }
          }
        }

        // 4. Side-effect de ciência: medidas protetivas no texto da decisão →
        //    persiste medidas estruturadas e move a esteira (dedupe por origem=parser).
        let medidasCriadas: MedidaCriada[] = [];
        if (input.tipo === "ciencia" && input.processoId) {
          medidasCriadas = await aplicarMedidasMPU(tx, {
            processoId: input.processoId,
            conteudo: input.conteudo,
            dataDecisaoISO: input.dataRegistro.toISOString().slice(0, 10),
          });
        }

        return {
          registro,
          audienciaCriada,
          medidasCriadas,
          atoAtualizado,
          audienciasSupersedidas,
        };
      });

      // Remove do Google Calendar os eventos das audiências canceladas por
      // redesignação (best-effort, fora da transação)
      if (created.registro.processoId) {
        limparCalendarSupersedidas(
          created.registro.processoId,
          created.audienciasSupersedidas
        );
      }

      // Atualiza a célula "Providências" da planilha (fire-and-forget)
      syncProvidenciasToSheet(created.registro.demandaId);

      return {
        ...created.registro,
        audienciaCriada: created.audienciaCriada,
        medidasCriadas: created.medidasCriadas,
        atoAtualizado: created.atoAtualizado,
      };
    }),

  // ────────────────────────────────────────────────────────────────────
  // agendar — insere atendimento futuro com status "agendado"
  // ────────────────────────────────────────────────────────────────────
  agendar: protectedProcedure
    .input(agendarAtendimentoInput)
    .mutation(async ({ input, ctx }) => {
      const [registro] = await db
        .insert(registros)
        .values({
          assistidoId: input.assistidoId,
          processoId: input.processoId ?? null,
          casoId: input.casoId ?? null,
          demandaId: input.demandaId ?? null,
          tipo: "atendimento",
          status: input.status,
          conteudo: input.conteudo ?? null,
          titulo: input.titulo ?? null,
          assunto: input.assunto ?? null,
          local: input.local ?? null,
          dataRegistro: new Date(input.dataRegistro as string | Date),
          numeroSolar: input.numeroSolar ?? null,
          subtipo: input.subtipo ?? null,
          area: input.area ?? null,
          pedido: input.pedido ?? null,
          anotacoesRecepcao: input.anotacoesRecepcao ?? null,
          historicoSolar: input.historicoSolar ?? null,
          processosCitados: input.processosCitados ?? null,
          dossieAtendimento: input.dossieAtendimento ?? null,
          autorId: ctx.user.id,
        })
        .returning();
      if (!registro) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Falha ao agendar atendimento" });
      }
      return registro;
    }),

  // ────────────────────────────────────────────────────────────────────
  // update — atualiza apenas campos fornecidos
  // ────────────────────────────────────────────────────────────────────
  update: protectedProcedure
    .input(updateRegistroInput)
    .mutation(async ({ input }) => {
      const { id, ...rest } = input;
      const data: Record<string, unknown> = { updatedAt: new Date() };
      if (rest.titulo !== undefined) data.titulo = rest.titulo;
      if (rest.conteudo !== undefined) data.conteudo = rest.conteudo;
      if (rest.tipo !== undefined) data.tipo = rest.tipo;
      if (rest.status !== undefined) data.status = rest.status;
      if (rest.assunto !== undefined) data.assunto = rest.assunto;
      if (rest.local !== undefined) data.local = rest.local;
      if (rest.processoId !== undefined) data.processoId = rest.processoId;
      if (rest.dataRegistro !== undefined)
        data.dataRegistro = new Date(rest.dataRegistro as string | Date);
      if (rest.numeroSolar !== undefined) data.numeroSolar = rest.numeroSolar;
      if (rest.subtipo !== undefined) data.subtipo = rest.subtipo;
      if (rest.area !== undefined) data.area = rest.area;
      if (rest.pedido !== undefined) data.pedido = rest.pedido;
      if (rest.anotacoesRecepcao !== undefined) data.anotacoesRecepcao = rest.anotacoesRecepcao;
      if (rest.historicoSolar !== undefined) data.historicoSolar = rest.historicoSolar;
      if (rest.processosCitados !== undefined) data.processosCitados = rest.processosCitados;
      if (rest.dossieAtendimento !== undefined) data.dossieAtendimento = rest.dossieAtendimento;

      const [updated] = await db
        .update(registros)
        .set(data)
        .where(eq(registros.id, id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Registro não encontrado",
        });
      }

      // Atualiza a célula "Providências" da planilha (fire-and-forget)
      syncProvidenciasToSheet(updated.demandaId);

      return updated;
    }),

  // ────────────────────────────────────────────────────────────────────
  // delete — remoção física
  // ────────────────────────────────────────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const [removido] = await db
        .delete(registros)
        .where(eq(registros.id, input.id))
        .returning({ demandaId: registros.demandaId });
      // Atualiza a célula "Providências" da planilha (fire-and-forget)
      syncProvidenciasToSheet(removido?.demandaId);
      return { ok: true } as const;
    }),

  // ────────────────────────────────────────────────────────────────────
  // listAgendados — lista atendimentos agendados em intervalo de datas,
  //                 escopado por defensor (autor + parceiros de comarca)
  // ────────────────────────────────────────────────────────────────────
  listAgendados: protectedProcedure
    .input(z.object({ start: z.string().datetime(), end: z.string().datetime() }))
    .query(async ({ input, ctx }) => {
      const conditions = [
        eq(registros.tipo, "atendimento"),
        eq(registros.status, "agendado"),
        gte(registros.dataRegistro, new Date(input.start)),
        lte(registros.dataRegistro, new Date(input.end)),
      ];
      await pushEscopoDefensor(conditions, ctx.user);
      const rows = await db
        .select({
          registro: registros,
          processo: {
            id: processos.id,
            numeroAutos: processos.numeroAutos,
            atribuicao: processos.atribuicao,
            area: processos.area,
          },
          assistido: { id: assistidos.id, nome: assistidos.nome },
        })
        .from(registros)
        .leftJoin(processos, eq(registros.processoId, processos.id))
        .leftJoin(assistidos, eq(registros.assistidoId, assistidos.id))
        .where(and(...conditions))
        .orderBy(asc(registros.dataRegistro));
      return rows.map((r) => ({
        ...r.registro,
        processo: r.processo?.id ? r.processo : null,
        assistido: r.assistido?.id ? r.assistido : null,
      }));
    }),

  // ────────────────────────────────────────────────────────────────────
  // listAtendimentos — lista rica para a página /admin/atendimentos
  //                    (tipo='atendimento', joins e filtros de gestão)
  // ────────────────────────────────────────────────────────────────────
  listAtendimentos: protectedProcedure
    .input(
      z.object({
        status: z.array(z.enum(["agendado", "realizado", "cancelado"])).optional(),
        subtipo: SUBTIPO_ATENDIMENTO.optional(),
        area: AREA_ATENDIMENTO.optional(),
        search: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        limit: z.number().int().min(1).max(500).default(300),
      })
    )
    .query(async ({ input, ctx }) => {
      const conditions = [eq(registros.tipo, "atendimento")];
      if (input.status && input.status.length > 0) {
        conditions.push(inArray(registros.status, input.status));
      }
      if (input.subtipo) conditions.push(eq(registros.subtipo, input.subtipo));
      if (input.area) conditions.push(eq(registros.area, input.area));
      if (input.dateFrom) conditions.push(gte(registros.dataRegistro, new Date(input.dateFrom)));
      if (input.dateTo) conditions.push(lte(registros.dataRegistro, new Date(input.dateTo)));
      if (input.search && input.search.trim().length > 0) {
        const termo = `%${input.search.trim()}%`;
        conditions.push(
          or(
            ilike(assistidos.nome, termo),
            ilike(registros.numeroSolar, termo),
            ilike(processos.numeroAutos, termo)
          )!
        );
      }
      await pushEscopoDefensor(conditions, ctx.user);

      const rows = await db
        .select({
          registro: registros,
          assistido: {
            id: assistidos.id,
            nome: assistidos.nome,
            cpf: assistidos.cpf,
            telefone: assistidos.telefone,
            driveFolderId: assistidos.driveFolderId,
          },
          processo: {
            id: processos.id,
            numeroAutos: processos.numeroAutos,
            area: processos.area,
            atribuicao: processos.atribuicao,
          },
          autor: { id: users.id, name: users.name },
        })
        .from(registros)
        .leftJoin(assistidos, eq(registros.assistidoId, assistidos.id))
        .leftJoin(processos, eq(registros.processoId, processos.id))
        .leftJoin(users, eq(registros.autorId, users.id))
        .where(and(...conditions))
        .orderBy(asc(registros.dataRegistro))
        .limit(input.limit);

      return rows.map((r) => ({
        ...r.registro,
        assistido: r.assistido?.id ? r.assistido : null,
        processo: r.processo?.id ? r.processo : null,
        autor: r.autor?.id ? r.autor : null,
      }));
    }),

  // ────────────────────────────────────────────────────────────────────
  // atendimentosKpis — contadores do header da página de atendimentos
  //                    (datas no fuso America/Bahia)
  // ────────────────────────────────────────────────────────────────────
  atendimentosKpis: protectedProcedure.query(async ({ ctx }) => {
    const conditions = [eq(registros.tipo, "atendimento")];
    await pushEscopoDefensor(conditions, ctx.user);

    // data_registro é timestamptz → uma única conversão para o fuso da Bahia.
    // (a forma antiga `AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bahia'` fazia
    //  dupla conversão e empurrava o dia para frente em atendimentos da noite.)
    const dataLocal = sql`(${registros.dataRegistro} AT TIME ZONE 'America/Bahia')::date`;
    const hojeLocal = sql`(now() AT TIME ZONE 'America/Bahia')::date`;

    const [kpis] = await db
      .select({
        // Aconteceram (passaram do horário) e seguem "agendado" — faltam registrar.
        aRegistrar: sql<number>`count(*) filter (where ${registros.status} = 'agendado' and ${registros.dataRegistro} < now())::int`,
        hoje: sql<number>`count(*) filter (where ${dataLocal} = ${hojeLocal} and ${registros.status} <> 'cancelado')::int`,
        semana: sql<number>`count(*) filter (where ${registros.status} = 'agendado' and ${registros.dataRegistro} >= now() and ${dataLocal} < ${hojeLocal} + 7)::int`,
        realizadosMes: sql<number>`count(*) filter (where ${registros.status} = 'realizado' and date_trunc('month', ${registros.dataRegistro} AT TIME ZONE 'America/Bahia') = date_trunc('month', now() AT TIME ZONE 'America/Bahia'))::int`,
      })
      .from(registros)
      .where(and(...conditions));

    return kpis ?? { aRegistrar: 0, hoje: 0, semana: 0, realizadosMes: 0 };
  }),

  // ────────────────────────────────────────────────────────────────────
  // atendimentosPendentes — lista enxuta dos atendimentos que já aconteceram
  //                         e seguem sem registro (para o card do dashboard).
  // ────────────────────────────────────────────────────────────────────
  atendimentosPendentes: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).default(8) }).optional())
    .query(async ({ input, ctx }) => {
      const conditions = [
        eq(registros.tipo, "atendimento"),
        eq(registros.status, "agendado"),
        lt(registros.dataRegistro, new Date()),
      ];
      await pushEscopoDefensor(conditions, ctx.user);

      const rows = await db
        .select({
          id: registros.id,
          dataRegistro: registros.dataRegistro,
          subtipo: registros.subtipo,
          area: registros.area,
          numeroSolar: registros.numeroSolar,
          assistidoNome: assistidos.nome,
          numeroAutos: processos.numeroAutos,
        })
        .from(registros)
        .leftJoin(assistidos, eq(registros.assistidoId, assistidos.id))
        .leftJoin(processos, eq(registros.processoId, processos.id))
        .where(and(...conditions))
        .orderBy(asc(registros.dataRegistro)) // mais antigos (mais atrasados) primeiro
        .limit(input?.limit ?? 8);

      return rows;
    }),

  // ────────────────────────────────────────────────────────────────────
  // prepararAtendimento — monta o dossiê de contexto (fonte "ombuds")
  // a partir do que o OMBUDS já sabe: processos, audiências, demandas,
  // medidas protetivas vigentes e histórico do assistido. A skill
  // /preparar-atendimentos enriquece depois com scraping PJe (fonte "skill").
  // ────────────────────────────────────────────────────────────────────
  prepararAtendimento: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const [reg] = await db
        .select()
        .from(registros)
        .where(eq(registros.id, input.id))
        .limit(1);
      if (!reg || reg.tipo !== "atendimento") {
        throw new TRPCError({ code: "NOT_FOUND", message: "Atendimento não encontrado" });
      }

      const [assistido] = await db
        .select({
          id: assistidos.id,
          nome: assistidos.nome,
          statusPrisional: assistidos.statusPrisional,
        })
        .from(assistidos)
        .where(eq(assistidos.id, reg.assistidoId))
        .limit(1);

      const fmtData = (d: Date | string | null | undefined) =>
        d
          ? new Date(d).toLocaleDateString("pt-BR", { timeZone: "America/Bahia" })
          : null;

      // 1. Processos do assistido (titularidade direta + tabela de junção)
      //    + processos citados nas anotações que existem no OMBUDS
      const diretos = await db
        .select({
          id: processos.id,
          numeroAutos: processos.numeroAutos,
          area: processos.area,
          fase: processos.fase,
          situacao: processos.situacao,
          vara: processos.vara,
        })
        .from(processos)
        .where(eq(processos.assistidoId, reg.assistidoId));
      const viaJuncao = await db
        .select({
          id: processos.id,
          numeroAutos: processos.numeroAutos,
          area: processos.area,
          fase: processos.fase,
          situacao: processos.situacao,
          vara: processos.vara,
        })
        .from(assistidosProcessos)
        .innerJoin(processos, eq(assistidosProcessos.processoId, processos.id))
        .where(eq(assistidosProcessos.assistidoId, reg.assistidoId));

      const citadosIds = (reg.processosCitados ?? [])
        .map((c) => c.processoId)
        .filter((v): v is number => !!v);
      const citadosRows = citadosIds.length
        ? await db
            .select({
              id: processos.id,
              numeroAutos: processos.numeroAutos,
              area: processos.area,
              fase: processos.fase,
              situacao: processos.situacao,
              vara: processos.vara,
            })
            .from(processos)
            .where(inArray(processos.id, citadosIds))
        : [];

      const procMap = new Map<number, (typeof diretos)[number]>();
      for (const p of [...diretos, ...viaJuncao, ...citadosRows]) procMap.set(p.id, p);
      const procs = [...procMap.values()];
      const procIds = procs.map((p) => p.id);
      const cnjs = procs.map((p) => p.numeroAutos).filter((n): n is string => !!n);

      // CNJs citados nas anotações que NÃO existem no OMBUDS (contexto)
      const cnjsForaOmbuds = (reg.processosCitados ?? [])
        .filter((c) => !c.processoId && !cnjs.includes(c.cnj))
        .map((c) => c.cnj);

      // 2. Audiências futuras (120d) e recentes (90d) dos processos/assistido
      const agora = new Date();
      const horizonte = new Date(agora.getTime() + 120 * 24 * 3600 * 1000);
      const retro = new Date(agora.getTime() - 90 * 24 * 3600 * 1000);
      const audRows = procIds.length
        ? await db
            .select({
              processoId: audiencias.processoId,
              dataAudiencia: audiencias.dataAudiencia,
              tipo: audiencias.tipo,
              status: audiencias.status,
              horario: audiencias.horario,
            })
            .from(audiencias)
            .where(
              and(
                or(
                  inArray(audiencias.processoId, procIds),
                  eq(audiencias.assistidoId, reg.assistidoId)
                )!,
                gte(audiencias.dataAudiencia, retro),
                lte(audiencias.dataAudiencia, horizonte)
              )
            )
            .orderBy(asc(audiencias.dataAudiencia))
        : [];

      // 3. Demandas abertas do assistido
      const demandasAbertas = await db
        .select({
          ato: demandas.ato,
          prazo: demandas.prazo,
          status: demandas.status,
          processoId: demandas.processoId,
        })
        .from(demandas)
        .where(
          and(
            eq(demandas.assistidoId, reg.assistidoId),
            sql`${demandas.status} NOT IN ('CONCLUIDO', 'ARQUIVADO')`
          )
        );

      // 4. Medidas protetivas vigentes (espelho VVD casado por CNJ)
      const medidas = cnjs.length
        ? await db
            .select({
              codigo: medidasMPU.codigo,
              artigo: medidasMPU.artigo,
              distanciaMetros: medidasMPU.distanciaMetros,
              literal: medidasMPU.literal,
              dataVencimento: medidasMPU.dataVencimento,
              numeroAutos: processosVVD.numeroAutos,
            })
            .from(medidasMPU)
            .innerJoin(processosVVD, eq(medidasMPU.processoVvdId, processosVVD.id))
            .where(
              and(
                inArray(processosVVD.numeroAutos, cnjs),
                eq(medidasMPU.status, "ativa")
              )
            )
        : [];

      // 5. Histórico: últimos registros do assistido (exceto o próprio)
      const historicoRegistros = await db
        .select({
          id: registros.id,
          dataRegistro: registros.dataRegistro,
          tipo: registros.tipo,
          titulo: registros.titulo,
          conteudo: registros.conteudo,
          status: registros.status,
        })
        .from(registros)
        .where(
          and(
            eq(registros.assistidoId, reg.assistidoId),
            sql`${registros.id} <> ${reg.id}`
          )
        )
        .orderBy(desc(registros.dataRegistro))
        .limit(6);

      // ── Montagem do dossiê ────────────────────────────────────────────
      const proximaAudPorProcesso = new Map<number, string>();
      const alertas: string[] = [];
      for (const a of audRows) {
        const dt = new Date(a.dataAudiencia);
        if (dt >= agora && a.status !== "cancelada") {
          const rotulo = `${a.tipo ?? "Audiência"} em ${fmtData(dt)}${a.horario ? ` às ${a.horario}` : ""}`;
          if (a.processoId && !proximaAudPorProcesso.has(a.processoId)) {
            proximaAudPorProcesso.set(a.processoId, rotulo);
          }
          const dias = Math.ceil((dt.getTime() - agora.getTime()) / (24 * 3600 * 1000));
          if (dias <= 30) {
            const cnj = procs.find((p) => p.id === a.processoId)?.numeroAutos;
            alertas.push(`${rotulo}${cnj ? ` (${cnj})` : ""} — em ${dias} dia${dias === 1 ? "" : "s"}`);
          }
        }
      }

      if (assistido?.statusPrisional && assistido.statusPrisional !== "SOLTO") {
        alertas.unshift(`Status prisional: ${assistido.statusPrisional}`);
      }
      for (const d of demandasAbertas) {
        if (!d.prazo) continue;
        const dias = Math.ceil(
          (new Date(`${d.prazo}T12:00:00`).getTime() - agora.getTime()) / (24 * 3600 * 1000)
        );
        if (dias <= 15) {
          alertas.push(
            `Demanda "${d.ato}" com prazo ${fmtData(d.prazo)}${dias < 0 ? " (VENCIDO)" : ` — em ${dias} dia${dias === 1 ? "" : "s"}`}`
          );
        }
      }

      const medidasVigentes = medidas.map((m) => {
        const dist = m.distanciaMetros ? ` (${m.distanciaMetros}m)` : "";
        const venc = m.dataVencimento ? ` — vence ${fmtData(m.dataVencimento)}` : "";
        return `${m.codigo}${m.artigo ? ` · ${m.artigo}` : ""}${dist}${venc} [${m.numeroAutos}]`;
      });
      if (medidasVigentes.length > 0) {
        alertas.push(`${medidasVigentes.length} medida(s) protetiva(s) vigente(s) — conferir restrições antes de orientar`);
      }

      const situacaoProcessual: Array<{
        cnj: string;
        area: string | null;
        fase: string | null;
        situacao: string | null;
        proximo_evento: string | null;
        observacao: string | null;
      }> = procs.map((p) => ({
        cnj: p.numeroAutos ?? `processo #${p.id}`,
        area: p.area,
        fase: p.fase,
        situacao: p.situacao,
        proximo_evento: proximaAudPorProcesso.get(p.id) ?? null,
        observacao: p.vara ?? null,
      }));
      for (const cnj of cnjsForaOmbuds) {
        situacaoProcessual.push({
          cnj,
          area: null,
          fase: null,
          situacao: "não cadastrado no OMBUDS",
          proximo_evento: null,
          observacao: "citado nas anotações da recepção — conferir no PJe",
        });
      }

      const historicoRelevante = [
        ...historicoRegistros.map((h) => {
          const texto = h.titulo || (h.conteudo ? `${h.conteudo.slice(0, 120)}${h.conteudo.length > 120 ? "…" : ""}` : h.tipo);
          return `${fmtData(h.dataRegistro)} [${h.tipo}${h.status === "cancelado" ? " cancelado" : ""}] ${texto}`;
        }),
        ...(reg.historicoSolar ?? []).map((h) => `${h.data} [SOLAR${h.numero ? ` ${h.numero}` : ""}] ${h.texto}`),
      ];

      const resumo = [
        `${procs.length} processo(s) no OMBUDS${cnjsForaOmbuds.length ? ` + ${cnjsForaOmbuds.length} citado(s) fora do OMBUDS` : ""}`,
        `${demandasAbertas.length} demanda(s) aberta(s)`,
        `${audRows.filter((a) => new Date(a.dataAudiencia) >= agora && a.status !== "cancelada").length} audiência(s) futura(s)`,
        ...(medidasVigentes.length ? [`${medidasVigentes.length} medida(s) protetiva(s) vigente(s)`] : []),
      ];

      const dossie = {
        gerado_em: new Date().toISOString(),
        fonte: "ombuds" as const,
        objetivo: reg.assunto ?? reg.anotacoesRecepcao ?? undefined,
        resumo,
        situacao_processual: situacaoProcessual,
        alertas,
        medidas_vigentes: medidasVigentes,
        historico_relevante: historicoRelevante,
        // orientacoes/perguntas/documentos_solicitar/providencias ficam para a
        // skill preparar-atendimentos (análise dos autos via PJe)
      };

      await db
        .update(registros)
        .set({ dossieAtendimento: dossie, updatedAt: new Date() })
        .where(eq(registros.id, reg.id));

      return dossie;
    }),

  // ────────────────────────────────────────────────────────────────────
  // prepararAtendimentoCompleto — enfileira o dossiê profundo (worker local
  // roda a skill preparar-atendimentos: scraping PJe + leitura dos autos),
  // mesmo mecanismo do "Preparar audiência" (claude_code_tasks + daemon).
  // ────────────────────────────────────────────────────────────────────
  prepararAtendimentoCompleto: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const [reg] = await db
        .select()
        .from(registros)
        .where(eq(registros.id, input.id))
        .limit(1);
      if (!reg || reg.tipo !== "atendimento") {
        throw new TRPCError({ code: "NOT_FOUND", message: "Atendimento não encontrado" });
      }
      const [assistido] = await db
        .select({ id: assistidos.id, nome: assistidos.nome, cpf: assistidos.cpf })
        .from(assistidos)
        .where(eq(assistidos.id, reg.assistidoId))
        .limit(1);
      const [processoVinc] = reg.processoId
        ? await db
            .select({ numeroAutos: processos.numeroAutos, area: processos.area })
            .from(processos)
            .where(eq(processos.id, reg.processoId))
            .limit(1)
        : [];

      // Dedup: uma tarefa pendente por registro (marcador no instrucaoAdicional)
      const marcador = `registroId=${reg.id}`;
      const [existing] = await db
        .select({ id: claudeCodeTasks.id })
        .from(claudeCodeTasks)
        .where(
          and(
            eq(claudeCodeTasks.skill, "preparar-atendimentos"),
            eq(claudeCodeTasks.instrucaoAdicional, marcador),
            inArray(claudeCodeTasks.status, ["pending", "processing"])
          )
        )
        .limit(1);
      if (existing) {
        return {
          taskId: existing.id,
          existing: true,
          message: "Dossiê já em preparação para este atendimento.",
        };
      }

      const dt = new Date(reg.dataRegistro).toLocaleString("pt-BR", {
        timeZone: "America/Bahia",
        dateStyle: "short",
        timeStyle: "short",
      });
      const citados = (reg.processosCitados ?? [])
        .map((c) => `- ${c.cnj}${c.processoId ? " (cadastrado no OMBUDS)" : " (NÃO cadastrado — alvo de scraping)"}`)
        .join("\n");
      const historico = (reg.historicoSolar ?? [])
        .map((h) => `- ${h.data}${h.numero ? ` (${h.numero})` : ""}: ${h.texto}`)
        .join("\n");

      const prompt = [
        `# Preparar atendimento — ${assistido?.nome ?? "Assistido"}`,
        ``,
        `Atendimento agendado para ${dt} (registro OMBUDS id ${reg.id}).`,
        `Tipo: ${reg.subtipo ?? "?"} · Área: ${reg.area ?? "?"} · Pedido: ${reg.pedido ?? "?"}${reg.numeroSolar ? ` · SOLAR ${reg.numeroSolar}` : ""}`,
        assistido?.cpf ? `CPF: ${assistido.cpf}` : "",
        ``,
        `## Objetivo (anotações da recepção)`,
        reg.anotacoesRecepcao ?? reg.assunto ?? "(sem anotações — levantar pelo histórico)",
        ``,
        `## Processos`,
        processoVinc?.numeroAutos
          ? `- ${processoVinc.numeroAutos} (vinculado, ${processoVinc.area ?? "área ?"})`
          : "- nenhum vinculado",
        citados || "",
        ``,
        historico ? `## Histórico SOLAR\n${historico}\n` : "",
        `## Instruções`,
        `Seguir a skill preparar-atendimentos (passos 4 a 7): resolver os processos,`,
        `scraping PJe quando necessário (CDP v2, sigilo VVD via rota Peticionar),`,
        `leitura dirigida pela demanda do assistido e gravar o resultado em`,
        `registros.dossie_atendimento (jsonb, fonte "skill") do registro ${reg.id}.`,
      ]
        .filter((l) => l !== "")
        .join("\n");

      const [task] = await db
        .insert(claudeCodeTasks)
        .values({
          assistidoId: reg.assistidoId,
          processoId: reg.processoId ?? null,
          skill: "preparar-atendimentos",
          prompt,
          instrucaoAdicional: marcador,
          status: "pending",
          createdBy: ctx.user.id,
        })
        .returning({ id: claudeCodeTasks.id });

      return {
        taskId: task!.id,
        existing: false,
        message: "Dossiê enfileirado — o worker local processa e o resultado aparece neste painel.",
      };
    }),

  // ────────────────────────────────────────────────────────────────────
  // anexos — sub-router para gerenciar anexos de um registro
  // ────────────────────────────────────────────────────────────────────
  anexos: router({
    list: protectedProcedure
      .input(z.object({ registroId: z.number().int().positive() }))
      .query(async ({ input }) => {
        const rows = await db.query.registroAnexos.findMany({
          where: eq(registroAnexos.registroId, input.registroId),
          orderBy: (a, { asc }) => [asc(a.createdAt)],
        });
        const supabase = getSupabaseAdmin();
        return Promise.all(rows.map(async (a) => {
          const { data } = await supabase.storage
            .from("documents")
            .createSignedUrl(a.storagePath, 60 * 60);
          return { ...a, url: data?.signedUrl ?? null };
        }));
      }),

    remove: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const anexo = await db.query.registroAnexos.findFirst({ where: eq(registroAnexos.id, input.id) });
        if (!anexo) throw new TRPCError({ code: "NOT_FOUND", message: "anexo não encontrado" });
        await getSupabaseAdmin().storage.from("documents").remove([anexo.storagePath]);
        await db.delete(registroAnexos).where(eq(registroAnexos.id, input.id));
        return { ok: true };
      }),
    retryMirror: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        await db.update(registroAnexos).set({ driveStatus: "pending" }).where(eq(registroAnexos.id, input.id));
        void mirrorAnexoToDrive(input.id);
        return { ok: true };
      }),
  }),
});
