import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/auth-redirect",
  "/login",
  "/register",
  "/api/webhooks(.*)",
  "/api/auth(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // Permitir rotas públicas sem verificação
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // Proteger todas as outras rotas - verificar autenticação
  const { userId } = await auth();

  // Se não estiver autenticado, redirecionar para sign-in
  if (!userId) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect_url", req.url);
    return NextResponse.redirect(signInUrl);
  }

  // Usuário autenticado - permitir acesso
  // A verificação de role é feita nos layouts (admin/tutor)
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
