import { router, adminProcedure } from "../init";
import { z } from "zod";

// Templates de notificação padrão
const defaultTemplates = [
  {
    id: 1,
    type: "prazo_alerta",
    title: "Alerta de Prazo",
    content: "O prazo {{prazo}} do processo {{processo_numero}} vence em {{data}}.",
    isActive: true,
  },
  {
    id: 2,
    type: "audiencia_lembrete",
    title: "Lembrete de Audiência",
    content: "Audiência do processo {{processo_numero}} marcada para {{data}} às {{hora}}.",
    isActive: true,
  },
  {
    id: 3,
    type: "juri_aviso",
    title: "Aviso de Júri",
    content: "Sessão do júri do processo {{processo_numero}} em {{data}}. Defensor: {{defensor_nome}}.",
    isActive: true,
  },
];

export const notificationTemplatesRouter = router({
  /**
   * Lista todos os templates de notificação
   */
  list: adminProcedure.query(async () => {
    // TODO: Buscar do banco quando tabela existir
    return defaultTemplates;
  }),

  /**
   * Criar template
   */
  create: adminProcedure
    .input(
      z.object({
        type: z.string(),
        title: z.string(),
        content: z.string(),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      // TODO: Implementar quando tabela existir
      return { id: Date.now(), ...input };
    }),

  /**
   * Atualizar template
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        content: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // TODO: Implementar quando tabela existir
      return input;
    }),

  /**
   * Deletar template
   */
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async () => {
      return { success: true };
    }),

  /**
   * Tipos de template disponíveis
   */
  types: adminProcedure.query(() => {
    return [
      { value: "prazo_alerta", label: "Alerta de Prazo" },
      { value: "audiencia_lembrete", label: "Lembrete de Audiência" },
      { value: "juri_aviso", label: "Aviso de Júri" },
      { value: "movimentacao", label: "Movimentação Processual" },
      { value: "atendimento_agendado", label: "Atendimento Agendado" },
      { value: "visita_carceraria", label: "Visita Carcerária" },
      { value: "aviso_geral", label: "Aviso Geral" },
      { value: "welcome", label: "Boas-vindas" },
    ];
  }),
});
