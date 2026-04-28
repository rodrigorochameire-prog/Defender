import { z } from "zod";
import { DILIGENCIA_SUBTIPOS, DILIGENCIA_STATUS } from "@/lib/db/schema/demanda-eventos";

const baseFields = {
  demandaId: z.number().int().positive(),
  resumo: z.string().min(1).max(140),
  descricao: z.string().max(10_000).optional(),
  responsavelId: z.number().int().positive().optional(),
};

const diligenciaSchema = z
  .object({
    ...baseFields,
    tipo: z.literal("diligencia"),
    subtipo: z.enum(DILIGENCIA_SUBTIPOS),
    status: z.enum(DILIGENCIA_STATUS).default("feita"),
    prazo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })
  .strict()
  .refine((v) => v.status !== "pendente" || !!v.prazo, {
    message: "Diligência pendente requer prazo",
    path: ["prazo"],
  });

const atendimentoSchema = z.object({
  ...baseFields,
  tipo: z.literal("atendimento"),
  atendimentoId: z.number().int().positive(),
}).strict();

const observacaoSchema = z.object({
  ...baseFields,
  tipo: z.literal("observacao"),
}).strict();

// NOTE: usamos z.union em vez de z.discriminatedUnion porque o branch
// "diligencia" é envolvido por .refine() (necessário para validar a regra
// "diligência pendente requer prazo"). z.discriminatedUnion v3 rejeita
// branches do tipo ZodEffects (resultado de .refine()), então perdemos a
// otimização do discriminator mas preservamos a regra de negócio.
export const createEventoSchema = z.union([
  diligenciaSchema,
  atendimentoSchema,
  observacaoSchema,
]);

export const updateEventoSchema = z.object({
  id: z.number().int().positive(),
  resumo: z.string().min(1).max(140).optional(),
  descricao: z.string().max(10_000).optional(),
  status: z.enum(DILIGENCIA_STATUS).optional(),
  prazo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export type CreateEventoInput = z.infer<typeof createEventoSchema>;
export type UpdateEventoInput = z.infer<typeof updateEventoSchema>;
