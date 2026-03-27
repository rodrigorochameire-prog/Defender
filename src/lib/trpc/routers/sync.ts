import { z } from "zod";
import { router, protectedProcedure } from "../init";
import {
  listPendingConflicts,
  countPendingConflicts,
  resolveConflict,
} from "@/lib/services/sync-engine";

export const syncRouter = router({
  conflictCount: protectedProcedure
    .query(async () => {
      return countPendingConflicts();
    }),

  conflictList: protectedProcedure
    .query(async () => {
      return listPendingConflicts();
    }),

  resolveConflict: protectedProcedure
    .input(z.object({
      conflictId: z.number(),
      resolution: z.enum(["PLANILHA", "BANCO", "CUSTOM"]),
      customValue: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { conflictId, resolution, customValue } = input;

      const conflicts = await listPendingConflicts();
      const conflict = conflicts.find(c => c.conflictId === conflictId);
      if (!conflict) throw new Error("Conflito não encontrado");

      let finalValue: string;
      let applyTo: "BANCO" | "PLANILHA" | "BOTH";

      switch (resolution) {
        case "PLANILHA":
          finalValue = conflict.valorPlanilha ?? "";
          applyTo = "BANCO";
          break;
        case "BANCO":
          finalValue = conflict.valorBanco ?? "";
          applyTo = "PLANILHA";
          break;
        case "CUSTOM":
          finalValue = customValue ?? "";
          applyTo = "BOTH";
          break;
        default:
          throw new Error("Resolução inválida");
      }

      await resolveConflict(conflictId, finalValue, ctx.user.name ?? "system", applyTo);
      return { success: true, value: finalValue };
    }),
});
