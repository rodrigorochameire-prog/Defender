import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { rateLimiter } from "../middleware/rateLimiter";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;

const rateLimitMiddleware = t.middleware(async opts => {
  const { ctx, path } = opts;
  const identifier = ctx.user?.id?.toString() || (ctx.req as any).ip || "anonymous";

  // Apply rate limiting based on route type
  if (path.includes("auth.login") || path.includes("auth.register")) {
    rateLimiter(identifier, "auth");
  } else if (path.includes("upload")) {
    rateLimiter(identifier, "upload");
  } else if (path.includes("payment") || path.includes("checkout")) {
    rateLimiter(identifier, "payment");
  } else {
    rateLimiter(identifier, "default");
  }

  return opts.next();
});

export const publicProcedure = t.procedure.use(rateLimitMiddleware);

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(rateLimitMiddleware).use(requireUser);

export const adminProcedure = t.procedure.use(rateLimitMiddleware).use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
