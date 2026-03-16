import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/google/auth
 * Redireciona para o Google OAuth2 para obter novo refresh token.
 *
 * Pré-requisito: Registrar http://localhost:3000/api/google/callback
 * como "Authorized redirect URIs" no Google Cloud Console.
 */
export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      { error: "GOOGLE_CLIENT_ID não configurado" },
      { status: 500 }
    );
  }

  const redirectUri = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/google/callback`;

  const scopes = [
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
  ].join(" ");

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent"); // Forçar novo refresh token
  authUrl.searchParams.set("include_granted_scopes", "true");

  return NextResponse.redirect(authUrl.toString());
}
