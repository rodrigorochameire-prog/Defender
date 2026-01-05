import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db, users, type User } from "@/lib/db";
import { eq } from "drizzle-orm";

const SESSION_COOKIE_NAME = "tetecare_session";
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
 * Obtém a sessão atual do usuário
 * Tenta usar Clerk primeiro, depois fallback para JWT local
 */
export async function getSession(): Promise<User | null> {
  try {
    // Tentar usar Clerk primeiro (importação dinâmica para evitar problemas)
    const { auth, currentUser } = await import("@clerk/nextjs/server");
    const { userId } = await auth();
    
    if (userId) {
      const clerkUser = await currentUser();
      if (clerkUser) {
        const email = clerkUser.emailAddresses[0]?.emailAddress;
        if (email) {
          const user = await db.query.users.findFirst({
            where: eq(users.email, email),
          });
          if (user) {
            return user;
          }
        }
      }
    }
  } catch (error) {
    // Se Clerk falhar, tentar JWT local
    console.log("[getSession] Clerk auth failed, trying JWT:", error);
  }

  // Fallback para JWT local
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const payload = await verifySessionToken(token);

  if (!payload) {
    return null;
  }

  // Buscar usuário no banco
  const user = await db.query.users.findFirst({
    where: eq(users.id, payload.userId),
  });

  return user ?? null;
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
