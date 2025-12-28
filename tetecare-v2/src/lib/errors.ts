import { TRPCError } from "@trpc/server";

/**
 * Erros padronizados da aplicação
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = "AppError";
  }
}

/**
 * Converte erros da aplicação para erros do tRPC
 */
export function toTRPCError(error: unknown): TRPCError {
  // Já é um TRPCError
  if (error instanceof TRPCError) {
    return error;
  }

  // É um AppError
  if (error instanceof AppError) {
    const codeMap: Record<number, TRPCError["code"]> = {
      400: "BAD_REQUEST",
      401: "UNAUTHORIZED",
      403: "FORBIDDEN",
      404: "NOT_FOUND",
      409: "CONFLICT",
      500: "INTERNAL_SERVER_ERROR",
    };

    return new TRPCError({
      code: codeMap[error.statusCode] || "INTERNAL_SERVER_ERROR",
      message: error.message,
    });
  }

  // Erro genérico
  if (error instanceof Error) {
    // Log do erro original em desenvolvimento
    if (process.env.NODE_ENV === "development") {
      console.error("❌ Erro não tratado:", error);
    }

    return new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Ocorreu um erro interno. Tente novamente.",
    });
  }

  // Fallback
  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Erro desconhecido",
  });
}

/**
 * Erros comuns pré-definidos
 */
export const Errors = {
  unauthorized: () =>
    new TRPCError({
      code: "UNAUTHORIZED",
      message: "Você precisa estar logado para acessar este recurso",
    }),

  forbidden: () =>
    new TRPCError({
      code: "FORBIDDEN",
      message: "Você não tem permissão para acessar este recurso",
    }),

  notFound: (resource = "Recurso") =>
    new TRPCError({
      code: "NOT_FOUND",
      message: `${resource} não encontrado`,
    }),

  badRequest: (message: string) =>
    new TRPCError({
      code: "BAD_REQUEST",
      message,
    }),

  conflict: (message: string) =>
    new TRPCError({
      code: "CONFLICT",
      message,
    }),

  internal: (message = "Erro interno. Tente novamente.") =>
    new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message,
    }),
};

/**
 * Wrapper para tratamento seguro de erros em mutations/queries
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  errorMessage = "Ocorreu um erro"
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error;
    }

    console.error(`❌ ${errorMessage}:`, error);
    throw Errors.internal(errorMessage);
  }
}
