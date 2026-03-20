import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db, users, type User } from "@/lib/db";
import { eq } from "drizzle-orm";

// Cache de usuários para evitar query ao banco em toda requisição tRPC
const userCache = new Map<number, { user: User; expiresAt: number }>();
const USER_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutos

async function getCachedUser(userId: number): Promise<User | null> {
  const cached = userCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.user;
  }

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });

  if (user) {
    userCache.set(userId, { user, expiresAt: Date.now() + USER_CACHE_TTL_MS });
    // Limpeza de entradas expiradas quando o cache cresce
    if (userCache.size > 200) {
      for (const [key, value] of userCache.entries()) {
        if (value.expiresAt <= Date.now()) userCache.delete(key);
      }
    }
  }

  return user ?? null;
}

const SESSION_COOKIE_NAME = "defesahub_session";
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 dias

// Chave secreta para JWT
function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET não está definida");
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  userId: number;
  role: string;
  expiresAt: Date;
}

/**
 * Cria um token JWT para a sessão
 */
export async function createSessionToken(
  userId: number,
  role: string
): Promise<string> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION);

  const token = await new SignJWT({ userId, role })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresAt)
    .setIssuedAt()
    .sign(getSecretKey());

  return token;
}

/**
 * Verifica e decodifica um token JWT
 */
export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());

    return {
      userId: payload.userId as number,
      role: payload.role as string,
      expiresAt: new Date((payload.exp as number) * 1000),
    };
  } catch {
    return null;
  }
}

/**
 * Cria uma sessão para o usuário e define o cookie
 */
export async function createSession(userId: number, role: string) {
  const token = await createSessionToken(userId, role);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION / 1000, // em segundos
  });

  return token;
}

/**
 * Obtém a sessão atual do usuário via JWT
 */
export async function getSession(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      return null;
    }

    const payload = await verifySessionToken(token);

    if (!payload) {
      return null;
    }

    // Busca usuário (com cache para evitar round-trip em toda requisição)
    try {
      const user = await getCachedUser(payload.userId);
      if (user) return user;
    } catch (dbError) {
      console.log("[getSession] Erro ao buscar usuário no banco:", dbError);
      return null;
    }

    // JWT válido mas usuário não encontrado no banco — sessão inválida
    return null;
  } catch (error) {
    console.log("[getSession] JWT auth failed:", error);
    return null;
  }
}

/**
 * Invalida o cache de usuário (chamar após atualizar dados do usuário)
 */
export function invalidateUserCache(userId: number) {
  userCache.delete(userId);
}

/**
 * Encerra a sessão do usuário
 */
export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Verifica se o usuário está autenticado (para uso em Server Components)
 */
export async function requireAuth(): Promise<User> {
  const user = await getSession();

  if (!user) {
    throw new Error("Não autenticado");
  }

  return user;
}

/**
 * Verifica se o usuário é admin
 */
export async function requireAdmin(): Promise<User> {
  const user = await requireAuth();

  if (user.role !== "admin") {
    throw new Error("Acesso negado: requer permissão de administrador");
  }

  return user;
}
