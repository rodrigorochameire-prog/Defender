import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { getSession } from "@/lib/auth/session";
import { toTRPCError, generateRequestId } from "@/lib/errors";
import type { User } from "@/lib/db/schema";

// ==========================================
// TIPOS DE ROLES
// ==========================================

/**
 * Roles disponíveis no sistema
 */
export type UserRole = "admin" | "user";

/**
 * Status de aprovação
 */
export type ApprovalStatus = "pending" | "approved" | "rejected";

// ==========================================
// CONTEXTO DO TRPC
// ==========================================

/**
 * Contexto do tRPC com informações do usuário e request
 */
export interface TRPCContext {
  user: User | null;
  requestId: string; // ID único para rastreamento de erros
}

/**
 * Contexto autenticado (após passar pelo middleware de auth)
 */
export interface AuthenticatedContext extends TRPCContext {
  user: User;
}

/**
 * Contexto de admin (após passar pelo middleware de admin)
 */
export interface AdminContext extends AuthenticatedContext {
  user: User & { role: "admin" };
}

/**
 * Contexto de tutor aprovado
 */
export interface TutorContext extends AuthenticatedContext {
  user: User & { approvalStatus: "approved" };
}

/**
 * Cria o contexto para cada requisição
 */
export async function createTRPCContext(): Promise<TRPCContext> {
  const requestId = generateRequestId();
  
  try {
    const user = await getSession();
    return { user, requestId };
  } catch (error) {
    console.error(`[${requestId}] Erro ao criar contexto tRPC:`, error);
    return { user: null, requestId };
  }
}

// ==========================================
// INICIALIZAÇÃO DO TRPC
// ==========================================

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error, ctx }) {
    // Incluir requestId no erro para rastreamento
    return {
      ...shape,
      data: {
        ...shape.data,
        requestId: ctx?.requestId,
        // Em produção, não expor stack trace
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
    };
  },
});

// ==========================================
// MIDDLEWARES
// ==========================================

/**
 * Middleware de tratamento de erros global
 * Captura e converte todos os erros para TRPCError padronizado
 */
const errorHandler = t.middleware(async ({ next, ctx }) => {
  try {
    return await next();
  } catch (error) {
    throw toTRPCError(error, ctx.requestId);
  }
});

/**
 * Middleware de logging (apenas em desenvolvimento)
 * Registra todas as chamadas com duração
 */
const logger = t.middleware(async ({ path, type, next, ctx }) => {
  const start = Date.now();
  const result = await next();
  const durationMs = Date.now() - start;

  if (process.env.NODE_ENV === "development") {
    const status = result.ok ? "✅" : "❌";
    console.log(`[tRPC][${ctx.requestId}] ${status} ${type} ${path} - ${durationMs}ms`);
  }

  return result;
});

/**
 * Middleware de autenticação
 * Verifica se o usuário está logado
 */
const requireAuth = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Você precisa estar logado para acessar este recurso",
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    } as AuthenticatedContext,
  });
});

/**
 * Middleware de autorização admin
 * Verifica se o usuário tem role admin
 */
const requireAdmin = t.middleware(async ({ ctx, next }) => {
  const user = (ctx as AuthenticatedContext).user;
  
  if (user.role !== "admin") {
    // Log de tentativa de acesso não autorizado
    console.warn(
      `[${ctx.requestId}] Acesso admin negado para usuário ${user.id} (${user.email})`
    );
    
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Acesso negado: requer permissão de administrador",
    });
  }

  return next({
    ctx: ctx as AdminContext,
  });
});

/**
 * Middleware de tutor aprovado
 * Verifica se o usuário é um tutor aprovado
 */
const requireApprovedTutor = t.middleware(async ({ ctx, next }) => {
  const user = (ctx as AuthenticatedContext).user;
  
  if (user.approvalStatus !== "approved") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Sua conta ainda não foi aprovada. Aguarde a aprovação do administrador.",
    });
  }

  return next({
    ctx: ctx as TutorContext,
  });
});

/**
 * Middleware de rate limiting simples (opcional)
 * Pode ser expandido com Redis para produção
 */
const rateLimiter = t.middleware(async ({ ctx, next, path }) => {
  // Por enquanto, apenas log. Em produção, implementar com Redis
  if (process.env.NODE_ENV === "development") {
    // Pode adicionar lógica de rate limiting aqui
  }
  
  return next();
});

// ==========================================
// PROCEDURES
// ==========================================

export const router = t.router;

/**
 * Procedure pública
 * Acessível por qualquer pessoa (logada ou não)
 */
export const publicProcedure = t.procedure
  .use(logger)
  .use(errorHandler);

/**
 * Procedure protegida
 * Requer usuário logado (qualquer role)
 */
export const protectedProcedure = publicProcedure
  .use(requireAuth);

/**
 * Procedure de tutor
 * Requer usuário logado E aprovado
 */
export const tutorProcedure = protectedProcedure
  .use(requireApprovedTutor);

/**
 * Procedure de admin
 * Requer usuário logado E role admin
 */
export const adminProcedure = protectedProcedure
  .use(requireAdmin);

// ==========================================
// HELPERS DE AUTORIZAÇÃO
// ==========================================

/**
 * Verifica se o usuário é admin
 */
export function isAdmin(user: User | null): user is User & { role: "admin" } {
  return user?.role === "admin";
}

/**
 * Verifica se o usuário é tutor aprovado
 */
export function isApprovedTutor(user: User | null): user is User & { approvalStatus: "approved" } {
  return user?.approvalStatus === "approved";
}

/**
 * Verifica se o usuário pode acessar dados de um pet específico
 * Admin pode acessar todos, tutores só seus próprios pets
 */
export async function canAccessPet(
  user: User,
  petId: number,
  db: any
): Promise<boolean> {
  if (user.role === "admin") return true;
  
  const { petTutors } = await import("@/lib/db/schema");
  const { eq, and } = await import("drizzle-orm");
  
  const relation = await db.query.petTutors.findFirst({
    where: and(
      eq(petTutors.petId, petId),
      eq(petTutors.tutorId, user.id)
    ),
  });
  
  return !!relation;
}
