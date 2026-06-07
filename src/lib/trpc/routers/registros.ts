import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db, withTransaction, registros, demandas, users, processos, assistidos, audiencias } from "@/lib/db";
import { registroAnexos } from "@/lib/db/schema/agenda";
import { mirrorAnexoToDrive } from "@/lib/registros/mirror-anexo-to-drive";
import { detectarDesignacaoAudiencia } from "@/lib/registros/detectar-designacao-audiencia";
import { and, asc, desc, eq, gte, inArray, lt, lte, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { getDefensoresVisiveis } from "../defensor-scope";
import { getParceirosIds } from "@/lib/trpc/comarca-scope";
import { buildDemandaSync, syncDemandaToSheets } from "@/lib/services/demanda-sync";

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

// ─── Schema exportado para testes unitários (Task 5) ───────────────────────
export const updateRegistroInput = z.object({
  id: z.number().int().positive(),
  titulo: z.string().max(120).optional(),
  conteudo: z.string().optional(),
  tipo: TIPO_REGISTRO.optional(),
  status: z.enum(["agendado", "realizado", "cancelado"]).optional(),
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
});

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
        } | null = null;
        if (input.tipo === "ciencia" && input.processoId) {
          const det = detectarDesignacaoAudiencia(input.conteudo);
          if (det) {
            const inicioDia = new Date(`${det.data}T00:00:00-03:00`);
            const fimDia = new Date(`${det.data}T23:59:59-03:00`);
            const jaExiste = await tx
              .select({ id: audiencias.id })
              .from(audiencias)
              .where(
                and(
                  eq(audiencias.processoId, input.processoId),
                  gte(audiencias.dataAudiencia, inicioDia),
                  lte(audiencias.dataAudiencia, fimDia)
                )
              )
              .limit(1);
            if (jaExiste.length === 0) {
              const [proc] = await tx
                .select({ numero: processos.numeroAutos })
                .from(processos)
                .where(eq(processos.id, input.processoId))
                .limit(1);
              const [assistido] = await tx
                .select({ nome: assistidos.nome })
                .from(assistidos)
                .where(eq(assistidos.id, input.assistidoId))
                .limit(1);
              const [aud] = await tx
                .insert(audiencias)
                .values({
                  processoId: input.processoId,
                  assistidoId: input.assistidoId,
                  // hora local de Camaçari (UTC-3) gravada como UTC verdadeiro;
                  // `horario` é a fonte da verdade de exibição
                  dataAudiencia: new Date(`${det.data}T${det.horario}:00-03:00`),
                  horario: det.horario,
                  tipo: det.tipo.slice(0, 50),
                  titulo: `${det.tipo} - ${assistido?.nome ?? ""} - ${proc?.numero ?? ""}`.trim(),
                  descricao:
                    `Agendada automaticamente a partir de registro de ciência (designação detectada).` +
                    (det.modalidade ? `\nModalidade: ${det.modalidade}` : "") +
                    `\nTrecho: "${det.trecho}"`,
                  status: "agendada",
                  defensorId: ctx.user.id,
                })
                .returning({ id: audiencias.id });
              if (aud) {
                audienciaCriada = {
                  id: aud.id,
                  data: det.data,
                  horario: det.horario,
                  tipo: det.tipo,
                };
              }
            }
          }
        }

        return { registro, audienciaCriada };
      });

      // Atualiza a célula "Providências" da planilha (fire-and-forget)
      syncProvidenciasToSheet(created.registro.demandaId);

      return { ...created.registro, audienciaCriada: created.audienciaCriada };
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
          status: "agendado",
          titulo: input.titulo ?? null,
          assunto: input.assunto ?? null,
          local: input.local ?? null,
          dataRegistro: new Date(input.dataRegistro as string | Date),
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
      const visiveis = getDefensoresVisiveis(ctx.user);
      if (visiveis !== "all") {
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
          conditions.push(eq(registros.autorId, ctx.user.id));
        }
      }
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
