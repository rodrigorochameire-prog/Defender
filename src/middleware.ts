import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/auth-redirect",
  "/api/webhooks(.*)",
]);

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isTutorRoute = createRouteMatcher(["/tutor(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();

  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  if (!userId) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect_url", req.url);
    return NextResponse.redirect(signInUrl);
  }

  // O Clerk armazena em publicMetadata ou public_metadata
  const publicMeta = (sessionClaims as any)?.publicMetadata || (sessionClaims as any)?.public_metadata || {};
  const userRole = publicMeta?.role || "tutor";
  
  // Debug: log para verificar
  console.log("[Middleware] userId:", userId, "role:", userRole, "claims:", JSON.stringify(sessionClaims));

  if (isAdminRoute(req) && userRole !== "admin") {
    return NextResponse.redirect(new URL("/tutor", req.url));
  }

  if (isTutorRoute(req) && userRole === "admin") {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
