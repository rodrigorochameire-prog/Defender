import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      // FIX: Adicionado valores padrão para evitar erro "Column cannot be null"
      // Se a API não retornar loginMethod, assumimos "email" ou "oauth" para não quebrar o banco
      const loginMethod = userInfo.loginMethod ?? userInfo.platform ?? "email";
      const userName = userInfo.name || "Usuário sem nome";

      await db.upsertUser({
        open_id: userInfo.openId,
        name: userName,
        email: userInfo.email ?? null, // O banco permite email null, então isso não trava
        login_method: loginMethod,      // O banco NÃO permite null, agora tem fallback
        last_signed_in: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userName,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      // Redireciona para login com erro em vez de mostrar JSON puro
      res.redirect(302, "/login?error=oauth_failed");
    }
  });
}
