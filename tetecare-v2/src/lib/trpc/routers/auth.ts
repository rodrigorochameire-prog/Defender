import { router, publicProcedure, protectedProcedure } from "../init";

export const authRouter = router({
  /**
   * Retorna o usuário atual
   */
  me: publicProcedure.query(({ ctx }) => {
    return ctx.user;
  }),

  /**
   * Verifica se está autenticado
   */
  isAuthenticated: publicProcedure.query(({ ctx }) => {
    return !!ctx.user;
  }),

  /**
   * Retorna o perfil do usuário
   */
  profile: protectedProcedure.query(({ ctx }) => {
    return {
      id: ctx.user.id,
      name: ctx.user.name,
      email: ctx.user.email,
      role: ctx.user.role,
      phone: ctx.user.phone,
      emailVerified: ctx.user.emailVerified,
      createdAt: ctx.user.createdAt,
    };
  }),
});
