import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { substituicoes } from "@/lib/db/schema";
import { eq, desc, and, gte, lte, inArray } from "drizzle-orm";
import { audiencias, processos, demandas, registros, assistidos } from "@/lib/db/schema";
import { pendenciasDaSubstituicao } from "@/lib/substituicoes/vinculo";
import { dadosDoPeriodo, resumirParaPrompt } from "@/lib/substituicoes/dados";
import { claudeCodeTasks } from "@/lib/db/schema/casos";
import { sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const substituicaoInput = z.object({
  unidadeSubstituida: z.string().min(1),
  tipo: z.enum(["automatica", "cumulativa", "extraordinaria"]).default("automatica"),
  escopoAtribuicoes: z.array(z.string()).default([]),
  dataInicio: z.string(), // YYYY-MM-DD
  dataFim: z.string().nullable().optional(),
  motivo: z.string().nullable().optional(),
  status: z.enum(["em_andamento", "concluida", "oficiada", "paga"]).default("em_andamento"),
  oficioNumero: z.string().nullable().optional(),
  oficioPath: z.string().nullable().optional(),
  relatorioPath: z.string().nullable().optional(),
  seiProtocolo: z.string().nullable().optional(),
  observacoes: z.string().nullable().optional(),
});

export const substituicoesRouter = router({
  listar: protectedProcedure.query(async () => {
    const rows = await db.select().from(substituicoes).orderBy(desc(substituicoes.dataInicio));
    return rows.map((s) => ({
      ...s,
      pendencias: pendenciasDaSubstituicao({
        status: s.status ?? "em_andamento",
        oficioNumero: s.oficioNumero,
        relatorioPath: s.relatorioPath,
        seiProtocolo: s.seiProtocolo,
      }),
    }));
  }),

  criar: protectedProcedure
    .input(substituicaoInput)
    .mutation(async ({ input, ctx }) => {
      const [row] = await db
        .insert(substituicoes)
        .values({
          ...input,
          dataFim: input.dataFim ?? null,
          defensorId: (ctx as any)?.user?.id ?? null,
        })
        .returning();
      return row;
    }),

  atualizar: protectedProcedure
    .input(z.object({ id: z.number() }).merge(substituicaoInput.partial()))
    .mutation(async ({ input }) => {
      const { id, ...rest } = input;
      const [row] = await db
        .update(substituicoes)
        .set({ ...rest, updatedAt: new Date() })
        .where(eq(substituicoes.id, id))
        .returning();
      return row;
    }),

  remover: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(substituicoes).where(eq(substituicoes.id, input.id));
      return { ok: true };
    }),

  /**
   * Prévia dos dados do período agrupados por atribuição — alimenta o relatório.
   * Filtra audiências do período; o orquestrador da skill complementa com
   * demandas/atendimentos e petições do Drive.
   */
  /**
   * Dados do período de uma substituição, já com a regra de vínculo aprovada:
   * item criado no período + processo no escopo + processo que TAMBÉM chegou
   * no período (titularidade prévia fica de fora). Fonte única do relatório
   * de gratificação — o número exibido aqui é o que vai ao ofício.
   */
  /**
   * Dados do período de uma substituição (regra de vínculo aprovada) — fonte
   * única do relatório de gratificação; o número daqui é o que vai ao ofício.
   */
  previewDados: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const [sub] = await db
        .select()
        .from(substituicoes)
        .where(eq(substituicoes.id, input.id))
        .limit(1);
      if (!sub) throw new TRPCError({ code: "NOT_FOUND", message: "Substituição não encontrada" });
      return dadosDoPeriodo(sub);
    }),

  /**
   * Gera a gratificação (ofício + relatório) ENFILEIRANDO uma tarefa para o
   * daemon do Claude Code (`claude -p`, conta Max — SEM custo de API paga).
   * O OMBUDS é só o ativador: insere em claude_code_tasks e o daemon, rodando
   * na máquina dedicada com o Drive montado, executa a skill oficio-gratificacao.
   */
  gerarGratificacao: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const [s] = await db.select().from(substituicoes).where(eq(substituicoes.id, input.id)).limit(1);
      if (!s) throw new TRPCError({ code: "NOT_FOUND", message: "Substituição não encontrada" });

      // Evitar duplicar task pendente/processando para esta substituição
      const abertas = await db
        .select({ id: claudeCodeTasks.id, status: claudeCodeTasks.status })
        .from(claudeCodeTasks)
        .where(and(eq(claudeCodeTasks.skill, "oficio-gratificacao"), inArray(claudeCodeTasks.status, ["pending", "processing"])));
      if (abertas.length > 0) {
        return { jaEnfileirada: true, taskId: abertas[0].id };
      }

      const escopo = Array.isArray(s.escopoAtribuicoes) ? s.escopoAtribuicoes.join(", ") : "";
      // Números do OMBUDS pela regra de vínculo (mesma consulta do
      // previewDados) — vão no prompt para o relatório bater com a UI.
      const resumoOmbuds = await dadosDoPeriodo(s)
        .then(resumirParaPrompt)
        .catch(() => "DADOS DO OMBUDS: indisponíveis (usar Drive + agenda como fonte)");
      const prompt = [
        `Gere a gratificação por substituição seguindo a skill oficio-gratificacao (autônomo, sem perguntar).`,
        `Unidade substituída: ${s.unidadeSubstituida}`,
        `Tipo: ${s.tipo}`,
        `Período: ${s.dataInicio} a ${s.dataFim ?? s.dataInicio}`,
        `ESCOPO DE VARA (já decidido — não perguntar): ${escopo || "(confirmar nos autos)"}`,
        `Motivo: ${s.motivo ?? "-"}`,
        resumoOmbuds,
        ``,
        `Passos: (1) ache o próximo número de ofício livre (scripts/proximo_numero.py); (2) levante as petições do Drive por DATA DE ASSINATURA no período, filtrando pela(s) vara(s) do escopo, + audiências do OMBUDS no período/atribuição; (3) gere ofício (modelo recente) + relatório (modelo da natureza), preenchidos; (4) salve os canônicos (ofício em Ofícios/ano e 1-Protocolar; relatório em Substituições e gratificações/Relatórios) e monte o par em PDF no _Enviar ao SEI; (5) retorne JSON: {oficio_numero, oficio_pdf, relatorio_pdf, manifestacoes, audiencias, observacoes}.`,
      ].join("\n");

      const [task] = await db
        .insert(claudeCodeTasks)
        .values({
          skill: "oficio-gratificacao",
          prompt,
          status: "pending",
          createdBy: (ctx as any)?.user?.id ?? 1,
          assistidoId: null,
        })
        .returning({ id: claudeCodeTasks.id });

      // marca a substituição como concluída (trabalho encerrado, gerando docs)
      if (s.status === "em_andamento") {
        await db.update(substituicoes).set({ status: "concluida", updatedAt: new Date() }).where(eq(substituicoes.id, s.id));
      }
      return { taskId: task.id, prompt };
    }),

  /** Status da última task de gratificação (p/ a UI acompanhar o daemon). */
  statusGeracao: protectedProcedure.query(async () => {
    const [t] = await db
      .select({ id: claudeCodeTasks.id, status: claudeCodeTasks.status, etapa: claudeCodeTasks.etapa, resultado: claudeCodeTasks.resultado, erro: claudeCodeTasks.erro, createdAt: claudeCodeTasks.createdAt })
      .from(claudeCodeTasks)
      .where(eq(claudeCodeTasks.skill, "oficio-gratificacao"))
      .orderBy(desc(claudeCodeTasks.createdAt))
      .limit(1);
    return t ?? null;
  }),
});
