import { NextRequest, NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/services/providers/onedrive-auth";
import { SignJWT } from "jose";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  const returnTo =
    request.nextUrl.searchParams.get("returnTo") || "/admin/settings/drive";

  if (!process.env.MICROSOFT_CLIENT_ID) {
    return NextResponse.json(
      { error: "MICROSOFT_CLIENT_ID não configurado" },
      { status: 500 }
    );
  }

  const { url, state, codeVerifier } = await getAuthUrl(
    userId ? parseInt(userId) : 0,
    returnTo
  );

  // Store state + codeVerifier in a short-lived signed JWT cookie
  const secret = new TextEncoder().encode(
    process.env.NEXTAUTH_SECRET || "fallback-secret-change-me"
  );
  const jwt = await new SignJWT({
    state,
    codeVerifier,
    userId: userId ? parseInt(userId) : null,
    returnTo,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("10m")
    .sign(secret);

  const response = NextResponse.redirect(url);
  response.cookies.set("ms-auth-state", jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return response;
}
