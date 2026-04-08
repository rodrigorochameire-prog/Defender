import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import {
  exchangeCode,
  saveMicrosoftTokens,
} from "@/lib/services/providers/onedrive-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const stateParam = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");
  const errorDescription = request.nextUrl.searchParams.get("error_description");

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/admin/settings/drive?ms_error=${encodeURIComponent(errorDescription || error)}`,
        request.url
      )
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/admin/settings/drive?ms_error=no_code", request.url)
    );
  }

  // Validate state cookie
  const cookie = request.cookies.get("ms-auth-state")?.value;
  if (!cookie) {
    return NextResponse.redirect(
      new URL("/admin/settings/drive?ms_error=no_state_cookie", request.url)
    );
  }

  try {
    const secret = new TextEncoder().encode(
      process.env.NEXTAUTH_SECRET || "fallback-secret-change-me"
    );
    const { payload } = await jwtVerify(cookie, secret);

    if (payload.state !== stateParam) {
      return NextResponse.redirect(
        new URL("/admin/settings/drive?ms_error=state_mismatch", request.url)
      );
    }

    const { codeVerifier, userId, returnTo } = payload as {
      codeVerifier: string;
      userId: number | null;
      returnTo: string;
    };

    // Exchange code for tokens
    const authResult = await exchangeCode(code, codeVerifier);

    // Fetch user info from Microsoft Graph
    const userInfoRes = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${authResult.access_token}` },
    });
    const userInfo = await userInfoRes.json();

    // Save tokens
    if (userId) {
      await saveMicrosoftTokens(userId, authResult, userInfo);
    }

    // Clear cookie and redirect to success page
    const redirectUrl = new URL(
      returnTo || "/admin/settings/drive",
      request.url
    );
    redirectUrl.searchParams.set("ms_success", "true");

    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete("ms-auth-state");
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown";
    console.error("Microsoft OAuth callback error:", err);
    return NextResponse.redirect(
      new URL(
        `/admin/settings/drive?ms_error=${encodeURIComponent(message)}`,
        request.url
      )
    );
  }
}
