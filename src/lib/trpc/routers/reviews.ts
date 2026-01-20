import { router, protectedProcedure, adminProcedure } from "../init";
import { z } from "zod";

// Placeholder para reviews - será implementado quando a tabela existir
export const reviewsRouter = router({
  /**
   * Lista todas as avaliações (admin)
   */
  list: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async () => {
      // TODO: Implementar quando tabela reviews existir
      return [];
    }),

  /**
   * Criar avaliação
   */
  create: protectedProcedure
    .input(
      z.object({
        rating: z.number().min(1).max(5),
        comment: z.string().optional(),
        bookingId: z.number().optional(),
      })
    )
    .mutation(async () => {
      // TODO: Implementar quando tabela reviews existir
      return null;
    }),

  /**
   * Estatísticas de avaliações
   */
  stats: adminProcedure.query(async () => {
    return {
      total: 0,
      averageRating: "0.0",
      distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    };
  }),

  /**
   * Minhas avaliações (tutor)
   */
  myReviews: protectedProcedure.query(async () => {
    return [];
  }),
});
