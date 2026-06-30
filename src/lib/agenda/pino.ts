import { z } from "zod";

export const PinoSchema = z.object({
  id: z.string(),
  timestampS: z.number(),
  nota: z.string().optional(),
  fonte: z.enum(["IA", "DEFENSOR"]),
  categoria: z.string().optional(),
});

export type Pino = z.infer<typeof PinoSchema>;
