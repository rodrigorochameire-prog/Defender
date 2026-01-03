import { router, adminProcedure } from "../init";
import { z } from "zod";

// Templates de notificação padrão
const defaultTemplates = [
  {
    id: 1,
    type: "vaccine_reminder",
    title: "Lembrete de Vacina",
    content: "A vacina {{vaccine_name}} do seu pet {{pet_name}} está próxima!",
    isActive: true,
  },
  {
    id: 2,
    type: "checkin_confirmation",
    title: "Check-in Confirmado",
    content: "O check-in de {{pet_name}} foi confirmado para {{date}}.",
    isActive: true,
  },
  {
    id: 3,
    type: "low_credits",
    title: "Créditos Baixos",
    content: "Você tem apenas {{credits}} créditos restantes. Recarregue agora!",
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
      { value: "vaccine_reminder", label: "Lembrete de Vacina" },
      { value: "medication_reminder", label: "Lembrete de Medicamento" },
      { value: "checkin_confirmation", label: "Confirmação de Check-in" },
      { value: "checkout_confirmation", label: "Confirmação de Check-out" },
      { value: "low_credits", label: "Créditos Baixos" },
      { value: "booking_approved", label: "Reserva Aprovada" },
      { value: "booking_rejected", label: "Reserva Rejeitada" },
      { value: "daily_report", label: "Relatório Diário" },
      { value: "welcome", label: "Boas-vindas" },
    ];
  }),
});
