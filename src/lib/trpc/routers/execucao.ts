import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import {
  execucoesPenais,
  execucaoEventos,
  execucaoBeneficios,
} from "@/lib/db/schema/execucao";
import { processos, assistidos } from "@/lib/db/schema/core";
import { eq, and, desc, inArray } from "drizzle-orm";
import {
  avaliarPrescricaoExecucao,
  type ExecucaoParaPrescricao,
  type EventoParaPrescricao,
} from "@/lib/execucao/reader";

async function assertProcessoInWorkspace(processoId: number, workspaceId: number) {
  const [row] = await db
    .select({ id: processos.id })
    .from(processos)
    .where(and(eq(processos.id, processoId), eq(processos.workspaceId, workspaceId)))
    .limit(1);
  if (!row) throw new Error("Processo não encontrado");
}

async function assertExecucaoInWorkspace(execucaoId: number, workspaceId: number) {
  const [row] = await db
    .select({ id: execucoesPenais.id })
    .from(execucoesPenais)
    .innerJoin(processos, eq(processos.id, execucoesPenais.processoId))
    .where(and(eq(execucoesPenais.id, execucaoId), eq(processos.workspaceId, workspaceId)))
    .limit(1);
  if (!row) throw new Error("Execução não encontrada");
}

/** Converte uma linha do banco no formato que o reader de prescrição consome. */
function toParaPrescricao(e: typeof execucoesPenais.$inferSelect): ExecucaoParaPrescricao {
  return {
    penaAnos: e.penaAnos,
    penaMeses: e.penaMeses,
    penaDias: e.penaDias,
    detracaoDias: e.detracaoDias,
    reincidente: e.reincidente,
    menor21NoFato: e.menor21NoFato,
    maior70NaSentenca: e.maior70NaSentenca,
    inicioCumprimento: e.inicioCumprimento,
    transitoJulgadoData: e.transitoJulgadoData,
    situacao: e.situacao,
  };
}

const upsertInput = z.object({
  id: z.number().optional(),
  processoId: z.number(),
  assistidoId: z.number().optional(),
  numeroExecucao: z.string().optional(),
  juizoExecucao: z.string().optional(),
  sentencaData: z.string().optional(),
  transitoJulgadoData: z.string().optional(),
  tipoTitulo: z.enum([
    "condenatoria",
    "condenatoria-c-substituicao",
    "condenatoria-c-suspensao",
  ]).optional(),
  penaAnos: z.number().int().min(0).default(0),
  penaMeses: z.number().int().min(0).default(0),
  penaDias: z.number().int().min(0).default(0),
  regimeInicial: z.enum(["fechado", "semiaberto", "aberto"]).optional(),
  regimeAtual: z.enum(["fechado", "semiaberto", "aberto"]).optional(),
  reincidente: z.boolean().default(false),
  menor21NoFato: z.boolean().default(false),
  maior70NaSentenca: z.boolean().default(false),
  inicioCumprimento: z.string().optional(),
  detracaoDias: z.number().int().min(0).default(0),
  situacao: z
    .enum(["preso", "domiciliar", "livramento-condicional", "monitoramento", "solto", "foragido"])
    .default("preso"),
  unidadeAtualId: z.number().optional(),
  dataUltimaConfirmacaoCadastral: z.string().optional(),
  observacoes: z.string().optional(),
});

export const execucaoRouter = router({
  /** Lista execuções do workspace com o flag de prescrição computado. */
  listComAlertas: protectedProcedure
    .input(z.object({ apenasComAlerta: z.boolean().default(false) }).optional())
    .query(async ({ ctx, input }) => {
      const apenasComAlerta = input?.apenasComAlerta ?? false;
      const workspaceId = ctx.user.workspaceId ?? 1;

      const rows = await db
        .select({
          execucao: execucoesPenais,
          assistidoNome: assistidos.nome,
          processoNumero: processos.numeroAutos,
        })
        .from(execucoesPenais)
        .innerJoin(processos, eq(processos.id, execucoesPenais.processoId))
        .leftJoin(assistidos, eq(assistidos.id, execucoesPenais.assistidoId))
        .where(eq(processos.workspaceId, workspaceId))
        .orderBy(desc(execucoesPenais.updatedAt));

      const ids = rows.map((r) => r.execucao.id);
      const eventos = ids.length
        ? await db
            .select()
            .from(execucaoEventos)
            .where(inArray(execucaoEventos.execucaoId, ids))
        : [];

      const eventosPorExec = new Map<number, EventoParaPrescricao[]>();
      for (const ev of eventos) {
        const arr = eventosPorExec.get(ev.execucaoId) ?? [];
        arr.push({ tipo: ev.tipo, dados: ev.dados });
        eventosPorExec.set(ev.execucaoId, arr);
      }

      const result = rows.map((r) => ({
        id: r.execucao.id,
        processoId: r.execucao.processoId,
        processoNumero: r.processoNumero,
        assistidoNome: r.assistidoNome,
        situacao: r.execucao.situacao,
        regimeAtual: r.execucao.regimeAtual,
        prescricao: avaliarPrescricaoExecucao(
          toParaPrescricao(r.execucao),
          eventosPorExec.get(r.execucao.id) ?? [],
        ),
      }));

      return apenasComAlerta ? result.filter((r) => r.prescricao) : result;
    }),

  /** Detalhe de uma execução com eventos, benefícios e flag de prescrição. */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      await assertExecucaoInWorkspace(input.id, ctx.user.workspaceId ?? 1);

      const [execucao] = await db
        .select()
        .from(execucoesPenais)
        .where(eq(execucoesPenais.id, input.id))
        .limit(1);
      if (!execucao) throw new Error("Execução não encontrada");

      const [eventos, beneficios] = await Promise.all([
        db
          .select()
          .from(execucaoEventos)
          .where(eq(execucaoEventos.execucaoId, input.id))
          .orderBy(desc(execucaoEventos.data)),
        db
          .select()
          .from(execucaoBeneficios)
          .where(eq(execucaoBeneficios.execucaoId, input.id))
          .orderBy(desc(execucaoBeneficios.dataPleito)),
      ]);

      const prescricao = avaliarPrescricaoExecucao(
        toParaPrescricao(execucao),
        eventos.map((e) => ({ tipo: e.tipo, dados: e.dados })),
      );

      return { execucao, eventos, beneficios, prescricao };
    }),

  /** Cria ou atualiza o título executivo. */
  upsert: protectedProcedure
    .input(upsertInput)
    .mutation(async ({ ctx, input }) => {
      const workspaceId = ctx.user.workspaceId ?? 1;
      await assertProcessoInWorkspace(input.processoId, workspaceId);

      const valores = {
        processoId: input.processoId,
        assistidoId: input.assistidoId ?? null,
        numeroExecucao: input.numeroExecucao ?? null,
        juizoExecucao: input.juizoExecucao ?? null,
        sentencaData: input.sentencaData ?? null,
        transitoJulgadoData: input.transitoJulgadoData ?? null,
        tipoTitulo: input.tipoTitulo ?? null,
        penaAnos: input.penaAnos,
        penaMeses: input.penaMeses,
        penaDias: input.penaDias,
        regimeInicial: input.regimeInicial ?? null,
        regimeAtual: input.regimeAtual ?? null,
        reincidente: input.reincidente,
        menor21NoFato: input.menor21NoFato,
        maior70NaSentenca: input.maior70NaSentenca,
        inicioCumprimento: input.inicioCumprimento ?? null,
        detracaoDias: input.detracaoDias,
        situacao: input.situacao,
        unidadeAtualId: input.unidadeAtualId ?? null,
        dataUltimaConfirmacaoCadastral: input.dataUltimaConfirmacaoCadastral ?? null,
        observacoes: input.observacoes ?? null,
        updatedAt: new Date(),
      };

      if (input.id) {
        await assertExecucaoInWorkspace(input.id, workspaceId);
        const [row] = await db
          .update(execucoesPenais)
          .set(valores)
          .where(eq(execucoesPenais.id, input.id))
          .returning();
        return row;
      }

      const [row] = await db.insert(execucoesPenais).values(valores).returning();
      return row;
    }),

  /** Registra um evento na cronologia executiva. */
  addEvento: protectedProcedure
    .input(
      z.object({
        execucaoId: z.number(),
        tipo: z.enum([
          "progressao",
          "regressao",
          "reconversao",
          "remissao",
          "detracao",
          "unificacao",
          "saida-temporaria",
          "falta",
          "beneficio-negado",
          "outro",
        ]),
        data: z.string(),
        dados: z
          .object({
            regimeDe: z.string().optional(),
            regimePara: z.string().optional(),
            dias: z.number().optional(),
            modalidadeRemissao: z.enum(["trabalho", "estudo", "leitura"]).optional(),
            grauFalta: z.enum(["leve", "media", "grave"]).optional(),
            motivo: z.string().optional(),
          })
          .optional(),
        observacoes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertExecucaoInWorkspace(input.execucaoId, ctx.user.workspaceId ?? 1);
      const [row] = await db
        .insert(execucaoEventos)
        .values({
          execucaoId: input.execucaoId,
          tipo: input.tipo,
          data: input.data,
          dados: input.dados ?? null,
          observacoes: input.observacoes ?? null,
        })
        .returning();
      return row;
    }),
});
