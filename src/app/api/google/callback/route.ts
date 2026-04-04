import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { setRuntimeRefreshToken } from "@/lib/services/google-drive";

/**
 * GET /api/google/callback
 * Recebe o authorization code do Google OAuth2,
 * troca por access_token + refresh_token.
 *
 * Salva o refresh_token no banco (tabela google_tokens) para uso
 * automático sem depender de env vars. Também exibe na tela para
 * backup manual.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  // Parse state for per-user flow
  let stateData: { userId?: number; returnTo?: string } = {};
  try {
    const stateParam = request.nextUrl.searchParams.get("state");
    if (stateParam) stateData = JSON.parse(stateParam);
  } catch {}

  if (error) {
    return new NextResponse(
      htmlPage("Erro na Autorização", `<p class="error">Erro: ${error}</p>`),
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  if (!code) {
    return new NextResponse(
      htmlPage("Erro", `<p class="error">Nenhum código de autorização recebido.</p>`),
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return new NextResponse(
      htmlPage("Erro", `<p class="error">GOOGLE_CLIENT_ID ou GOOGLE_CLIENT_SECRET não configurado.</p>`),
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const redirectUri = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/google/callback`;

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      return new NextResponse(
        htmlPage("Erro ao Trocar Código", `
          <p class="error">Erro: ${tokenData.error}</p>
          <p>${tokenData.error_description || ""}</p>
          <pre>${JSON.stringify(tokenData, null, 2)}</pre>
        `),
        { headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    const refreshToken = tokenData.refresh_token;
    const accessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in;

    // Obter info do usuário
    let userEmail = "Desconhecido";
    try {
      const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const userData = await userResponse.json();
      userEmail = userData.email || "Desconhecido";
    } catch {
      // Ignorar erro
    }

    // Salvar refresh token no banco para uso automático
    let savedToDb = false;
    if (refreshToken) {
      try {
        // Upsert na tabela google_tokens (cria se não existir)
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS google_tokens (
            id SERIAL PRIMARY KEY,
            email TEXT NOT NULL,
            refresh_token TEXT NOT NULL,
            access_token TEXT,
            expires_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          )
        `);
        // Remove tokens antigos e insere o novo
        await db.execute(sql`DELETE FROM google_tokens WHERE email = ${userEmail}`);
        await db.execute(sql`
          INSERT INTO google_tokens (email, refresh_token, access_token, expires_at)
          VALUES (${userEmail}, ${refreshToken}, ${accessToken}, ${new Date(Date.now() + expiresIn * 1000).toISOString()}::timestamptz)
        `);
        savedToDb = true;
        // Atualiza o token em runtime para uso imediato
        setRuntimeRefreshToken(refreshToken);
        console.log("[Google Auth] Refresh token salvo no banco para", userEmail);
      } catch (err) {
        console.error("[Google Auth] Erro ao salvar token no banco:", err);
      }
    }

      // Save per-user token if userId provided
      if (stateData.userId && refreshToken) {
        try {
          await db.execute(sql`
            INSERT INTO user_google_tokens (user_id, email, refresh_token, access_token, expires_at)
            VALUES (${stateData.userId}, ${userEmail}, ${refreshToken}, ${accessToken},
                    ${new Date(Date.now() + expiresIn * 1000).toISOString()}::timestamptz)
            ON CONFLICT (user_id) DO UPDATE SET
              email = EXCLUDED.email,
              refresh_token = EXCLUDED.refresh_token,
              access_token = EXCLUDED.access_token,
              expires_at = EXCLUDED.expires_at,
              updated_at = NOW()
          `);
          await db.execute(sql`UPDATE users SET google_linked = true WHERE id = ${stateData.userId}`);
          console.log("[Google Auth] Per-user token saved for userId:", stateData.userId);
        } catch (err) {
          console.error("[Google Auth] Error saving per-user token:", err);
        }
      }

      // Per-user flow: redirect back to app instead of showing HTML
      if (stateData.returnTo && stateData.userId) {
        const redirectUrl = new URL(stateData.returnTo, process.env.NEXTAUTH_URL || "http://localhost:3000");
        return NextResponse.redirect(redirectUrl.toString());
      }

    const html = htmlPage("Google Drive Conectado!", `
      <div class="success-badge">Autorizado com sucesso</div>
      <p><strong>Conta:</strong> ${userEmail}</p>
      <p><strong>Access Token:</strong> Válido por ${Math.floor(expiresIn / 60)} minutos</p>

      ${refreshToken ? `
        <div class="token-section">
          <h2>Novo Refresh Token</h2>
          ${savedToDb ? `<div class="success-badge" style="background:#059669;margin-bottom:8px">✅ Token salvo no banco automaticamente</div>` : ''}
          <p class="instruction">Copie e atualize no <code>.env.local</code> e no Vercel:</p>
          <div class="token-box">
            <code id="token">${refreshToken}</code>
            <button onclick="navigator.clipboard.writeText(document.getElementById('token').textContent).then(() => { this.textContent = 'Copiado!'; setTimeout(() => this.textContent = 'Copiar', 2000); })">Copiar</button>
          </div>
          <pre class="env-example">GOOGLE_REFRESH_TOKEN=${refreshToken}</pre>
        </div>
      ` : `
        <div class="warning">
          <p><strong>Atenção:</strong> Nenhum refresh_token retornado.</p>
          <p>Isso acontece quando a conta já foi autorizada antes. Tente:</p>
          <ol>
            <li>Vá em <a href="https://myaccount.google.com/permissions" target="_blank">Permissões da conta Google</a></li>
            <li>Remova o acesso do app "OMBUDS"</li>
            <li>Tente novamente em <a href="/api/google/auth">/api/google/auth</a></li>
          </ol>
        </div>
      `}

      <div class="actions">
        <a href="/admin/settings/drive" class="btn">Ir para Integrações</a>
        <a href="/api/google/auth" class="btn secondary">Autorizar Novamente</a>
      </div>
    `);

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    return new NextResponse(
      htmlPage("Erro", `<p class="error">Erro inesperado: ${String(err)}</p>`),
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}

function htmlPage(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OMBUDS - ${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #0f0f11; color: #e5e5e5; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .container { max-width: 600px; margin: 2rem; padding: 2rem; background: #171717; border: 1px solid #262626; border-radius: 16px; }
    h1 { font-size: 1.5rem; margin-bottom: 1rem; color: #fafafa; }
    h2 { font-size: 1.1rem; margin: 1rem 0 0.5rem; color: #a3a3a3; }
    p { margin: 0.5rem 0; color: #a3a3a3; line-height: 1.5; }
    strong { color: #e5e5e5; }
    code { background: #262626; padding: 2px 6px; border-radius: 4px; font-size: 0.85em; }
    pre { background: #09090b; border: 1px solid #262626; border-radius: 8px; padding: 1rem; margin: 0.5rem 0; overflow-x: auto; font-size: 0.8rem; color: #10b981; }
    .success-badge { display: inline-block; background: #10b981; color: #000; font-weight: 600; padding: 4px 12px; border-radius: 999px; font-size: 0.85rem; margin-bottom: 1rem; }
    .error { color: #f43f5e; font-weight: 600; }
    .warning { background: #78350f20; border: 1px solid #92400e40; border-radius: 8px; padding: 1rem; margin: 1rem 0; }
    .warning p { color: #fbbf24; }
    .token-section { background: #09090b; border: 1px solid #10b98130; border-radius: 12px; padding: 1rem; margin: 1rem 0; }
    .token-box { display: flex; gap: 8px; align-items: center; background: #171717; border: 1px solid #262626; border-radius: 8px; padding: 8px 12px; margin: 0.5rem 0; }
    .token-box code { flex: 1; word-break: break-all; background: none; padding: 0; color: #10b981; }
    .token-box button { background: #10b981; color: #000; border: none; padding: 6px 16px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.85rem; white-space: nowrap; }
    .token-box button:hover { background: #059669; }
    .env-example { color: #a78bfa; }
    .instruction { font-size: 0.9rem; }
    .actions { display: flex; gap: 8px; margin-top: 1.5rem; }
    .btn { display: inline-block; background: #10b981; color: #000; font-weight: 600; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 0.9rem; }
    .btn:hover { background: #059669; }
    .btn.secondary { background: #262626; color: #a3a3a3; }
    .btn.secondary:hover { background: #404040; }
    a { color: #10b981; }
    ol { padding-left: 1.5rem; margin: 0.5rem 0; }
    li { margin: 0.25rem 0; color: #a3a3a3; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${title}</h1>
    ${body}
  </div>
</body>
</html>`;
}
