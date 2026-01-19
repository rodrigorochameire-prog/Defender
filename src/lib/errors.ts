import { TRPCError } from "@trpc/server";
import { ZodError } from "zod";

// ==========================================
// GERAÇÃO DE REQUEST ID
// ==========================================

/**
 * Gera um ID único para rastreamento de requisições
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `req_${timestamp}_${random}`;
}

// ==========================================
// CLASSES DE ERRO
// ==========================================

/**
 * Erro base da aplicação
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
  }
}

/**
 * Erro de validação (campos inválidos)
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    public fieldErrors?: Record<string, string[]>
  ) {
    super(message, "VALIDATION_ERROR", 400, { fieldErrors });
    this.name = "ValidationError";
  }
}

/**
 * Erro de banco de dados
 */
export class DatabaseError extends AppError {
  constructor(
    message: string,
    public originalError?: Error
  ) {
    super(message, "DATABASE_ERROR", 500);
    this.name = "DatabaseError";
  }
}

// ==========================================
// CÓDIGOS DE ERRO POSTGRESQL
// ==========================================

const PG_ERROR_CODES: Record<string, { code: TRPCError["code"]; message: string }> = {
  // Violação de unicidade
  "23505": {
    code: "CONFLICT",
    message: "Este registro já existe",
  },
  // Violação de chave estrangeira
  "23503": {
    code: "BAD_REQUEST",
    message: "Referência inválida: o registro relacionado não existe",
  },
  // Violação de not null
  "23502": {
    code: "BAD_REQUEST",
    message: "Campo obrigatório não preenchido",
  },
  // Violação de check constraint
  "23514": {
    code: "BAD_REQUEST",
    message: "Valor inválido para o campo",
  },
  // Deadlock
  "40P01": {
    code: "INTERNAL_SERVER_ERROR",
    message: "Conflito de acesso. Tente novamente.",
  },
  // Timeout de conexão
  "57014": {
    code: "INTERNAL_SERVER_ERROR",
    message: "Operação cancelada por timeout",
  },
  // Conexão perdida
  "08006": {
    code: "INTERNAL_SERVER_ERROR",
    message: "Erro de conexão com o banco de dados",
  },
  // Too many connections
  "53300": {
    code: "INTERNAL_SERVER_ERROR",
    message: "Sistema sobrecarregado. Tente novamente em alguns segundos.",
  },
};

// ==========================================
// CONVERSORES DE ERRO
// ==========================================

/**
 * Converte erro Zod para mensagem amigável
 */
function formatZodError(error: ZodError): { message: string; fieldErrors: Record<string, string[]> } {
  const fieldErrors: Record<string, string[]> = {};
  
  error.errors.forEach((err) => {
    const path = err.path.join(".");
    if (!fieldErrors[path]) {
      fieldErrors[path] = [];
    }
    fieldErrors[path].push(err.message);
  });
  
  const firstError = error.errors[0];
  const fieldName = firstError?.path.join(".") || "campo";
  const message = `Erro de validação: ${fieldName} - ${firstError?.message || "valor inválido"}`;
  
  return { message, fieldErrors };
}

/**
 * Detecta e converte erros do PostgreSQL
 */
function handlePostgresError(error: any, requestId: string): TRPCError | null {
  // Verifica se é um erro do PostgreSQL (tem code numérico)
  const pgCode = error?.code;
  
  if (typeof pgCode === "string" && PG_ERROR_CODES[pgCode]) {
    const pgError = PG_ERROR_CODES[pgCode];
    
    // Log detalhado do erro original
    console.error(`[${requestId}] PostgreSQL Error ${pgCode}:`, {
      message: error.message,
      detail: error.detail,
      constraint: error.constraint,
      table: error.table,
      column: error.column,
    });
    
    // Mensagem mais específica para violação de unicidade
    let message = pgError.message;
    if (pgCode === "23505" && error.constraint) {
      // Tenta extrair o campo do nome da constraint
      if (error.constraint.includes("email")) {
        message = "Este email já está cadastrado";
      } else if (error.constraint.includes("phone")) {
        message = "Este telefone já está cadastrado";
      }
    }
    
    return new TRPCError({
      code: pgError.code,
      message,
    });
  }
  
  // Verifica erros de conexão do postgres.js
  if (error?.name === "PostgresError" || error?.severity) {
    console.error(`[${requestId}] PostgreSQL Connection Error:`, error);
    
    return new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Erro de conexão com o banco de dados. Tente novamente.",
    });
  }
  
  return null;
}

/**
 * Converte erros da aplicação para erros do tRPC
 */
export function toTRPCError(error: unknown, requestId?: string): TRPCError {
  const reqId = requestId || generateRequestId();
  
  // Já é um TRPCError
  if (error instanceof TRPCError) {
    return error;
  }
  
  // Erro de validação Zod
  if (error instanceof ZodError) {
    const { message, fieldErrors } = formatZodError(error);
    
    if (process.env.NODE_ENV === "development") {
      console.error(`[${reqId}] Zod Validation Error:`, fieldErrors);
    }
    
    return new TRPCError({
      code: "BAD_REQUEST",
      message,
      cause: { fieldErrors },
    });
  }
  
  // Erro customizado da aplicação
  if (error instanceof AppError) {
    const codeMap: Record<number, TRPCError["code"]> = {
      400: "BAD_REQUEST",
      401: "UNAUTHORIZED",
      403: "FORBIDDEN",
      404: "NOT_FOUND",
      409: "CONFLICT",
      422: "UNPROCESSABLE_CONTENT",
      429: "TOO_MANY_REQUESTS",
      500: "INTERNAL_SERVER_ERROR",
    };

    return new TRPCError({
      code: codeMap[error.statusCode] || "INTERNAL_SERVER_ERROR",
      message: error.message,
      cause: error.details,
    });
  }
  
  // Erro genérico (pode ser do PostgreSQL ou outro)
  if (error instanceof Error) {
    // Tenta detectar erro do PostgreSQL
    const pgError = handlePostgresError(error, reqId);
    if (pgError) {
      return pgError;
    }
    
    // Log do erro original em desenvolvimento
    if (process.env.NODE_ENV === "development") {
      console.error(`[${reqId}] Erro não tratado:`, error);
    } else {
      // Em produção, log mínimo
      console.error(`[${reqId}] Error: ${error.name} - ${error.message}`);
    }

    return new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Ocorreu um erro interno. Tente novamente.",
    });
  }

  // Fallback
  console.error(`[${reqId}] Erro desconhecido:`, error);
  
  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Erro desconhecido",
  });
}

// ==========================================
// ERROS PRÉ-DEFINIDOS
// ==========================================

export const Errors = {
  unauthorized: (message = "Você precisa estar logado para acessar este recurso") =>
    new TRPCError({
      code: "UNAUTHORIZED",
      message,
    }),

  forbidden: (message = "Você não tem permissão para acessar este recurso") =>
    new TRPCError({
      code: "FORBIDDEN",
      message,
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

  validation: (message: string, fieldErrors?: Record<string, string[]>) =>
    new TRPCError({
      code: "BAD_REQUEST",
      message,
      cause: { fieldErrors },
    }),

  internal: (message = "Erro interno. Tente novamente.") =>
    new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message,
    }),

  tooManyRequests: (message = "Muitas requisições. Aguarde um momento.") =>
    new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message,
    }),

  // Erros específicos de domínio
  petNotApproved: () =>
    new TRPCError({
      code: "FORBIDDEN",
      message: "Este pet ainda não foi aprovado para usar a creche",
    }),

  noCredits: () =>
    new TRPCError({
      code: "FORBIDDEN",
      message: "Sem créditos suficientes. Adquira um pacote de créditos.",
    }),

  bookingConflict: () =>
    new TRPCError({
      code: "CONFLICT",
      message: "Já existe uma reserva para este período",
    }),
};

// ==========================================
// WRAPPER SEGURO PARA ASYNC
// ==========================================

/**
 * Wrapper para tratamento seguro de erros em mutations/queries
 * Captura erros e os converte para TRPCError apropriado
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  errorMessage = "Ocorreu um erro",
  requestId?: string
): Promise<T> {
  const reqId = requestId || generateRequestId();
  
  try {
    return await fn();
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error;
    }

    console.error(`[${reqId}] ${errorMessage}:`, error);
    
    // Tenta converter para erro mais específico
    throw toTRPCError(error, reqId);
  }
}

/**
 * Wrapper que garante que erros de banco sejam tratados corretamente
 */
export async function safeDbOperation<T>(
  operation: () => Promise<T>,
  context: { requestId: string; operation: string }
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error(`[${context.requestId}] DB Operation "${context.operation}" failed:`, error);
    throw toTRPCError(error, context.requestId);
  }
}
