import { NextRequest, NextResponse } from "next/server";
import { downloadFileContent, getFileInfo } from "@/lib/services/google-drive";
import { getSession } from "@/lib/auth/session";

/**
 * Proxy para servir arquivos do Google Drive sem CORS.
 * Requer autenticacao via sessao do usuario.
 *
 * GET /api/drive/proxy?fileId=DRIVE_FILE_ID
 */
export async function GET(request: NextRequest) {
  const fileId = request.nextUrl.searchParams.get("fileId");

  try {
    // Verificar autenticacao via session JWT
    const user = await getSession();

    if (!user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    if (!fileId) {
      return NextResponse.json({ error: "fileId obrigatorio" }, { status: 400 });
    }

    // Detect mime type first to set correct Content-Type
    let contentType = "application/pdf";
    try {
      const info = await getFileInfo(fileId);
      if (info?.mimeType) {
        // For Google Docs types, we export as PDF
        if (info.mimeType.startsWith("application/vnd.google-apps.")) {
          contentType = "application/pdf";
        } else {
          contentType = info.mimeType;
        }
      }
    } catch {
      // Fall back to PDF content type
    }

    // Baixar conteudo do Drive usando service account
    const buffer = await downloadFileContent(fileId);

    if (!buffer) {
      console.error(`[Drive Proxy] Download returned null for fileId=${fileId}`);
      return NextResponse.json(
        { error: `Arquivo nao encontrado no Drive (${fileId})` },
        { status: 404 }
      );
    }

    if (buffer.byteLength === 0) {
      console.error(`[Drive Proxy] Empty buffer for fileId=${fileId}`);
      return NextResponse.json(
        { error: "Arquivo vazio no Drive" },
        { status: 404 }
      );
    }

    // Retornar como stream binario com headers corretos
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(buffer.byteLength),
        "Cache-Control": "private, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Drive Proxy] Erro fileId=${fileId}:`, errMsg);
    return NextResponse.json(
      { error: `Erro ao servir arquivo: ${errMsg}` },
      { status: 500 }
    );
  }
}
