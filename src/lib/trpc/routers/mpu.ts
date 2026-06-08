import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { parseDecisaoMPU } from "@/lib/mpu/parse-decisao";

export const mpuRouter = router({
  // Dry-run: extrai as medidas do texto SEM persistir. Usado no preview do editor.
  previewMedidas: protectedProcedure
    .input(z.object({ texto: z.string().min(1).max(20000) }))
    .query(({ input }) => parseDecisaoMPU(input.texto)),
});
