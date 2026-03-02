import { NextRequest, NextResponse } from "next/server";
import { downloadFileContent, getFileInfo, streamFileContent } from "@/lib/services/google-drive";
import { getSession } from "@/lib/auth/session";

/**
 * Proxy para servir arquivos do Google Drive sem CORS.
 * Requer autenticacao via sessao do usuario.
 *
 * GET /api/drive/proxy?fileId=DRIVE_FILE_ID
 *
 * Suporta Range headers para streaming de audio/video (seeking).
 * Para arquivos de midia, usa streaming; para outros, buffered download.
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

    // Verificar se é um pedido de streaming (Range header ou mime de midia)
    const rangeHeader = request.headers.get("range");
    const streamParam = request.nextUrl.searchParams.get("stream");

    if (rangeHeader || streamParam === "1") {
      // Streaming mode: passa Range header diretamente para Google Drive API
      const streamResult = await streamFileContent(fileId, rangeHeader);

      if (!streamResult || !streamResult.body) {
        return NextResponse.json(
          { error: `Streaming nao disponivel para ${fileId}` },
          { status: 404 },
        );
      }

      return new NextResponse(streamResult.body as unknown as ReadableStream, {
        status: streamResult.status,
        headers: streamResult.headers,
      });
    }

    // Buffered mode: baixar arquivo inteiro (PDFs, docs, imagens)
    let contentType = "application/pdf";
    try {
      const info = await getFileInfo(fileId);
      if (info?.mimeType) {
        if (info.mimeType.startsWith("application/vnd.google-apps.")) {
          contentType = "application/pdf";
        } else {
          contentType = info.mimeType;
        }
      }
    } catch {
      // Fall back to PDF content type
    }

    const buffer = await downloadFileContent(fileId);

    if (!buffer) {
      console.error(`[Drive Proxy] Download returned null for fileId=${fileId}`);
      return NextResponse.json(
        { error: `Arquivo nao encontrado no Drive (${fileId})` },
        { status: 404 },
      );
    }

    if (buffer.byteLength === 0) {
      console.error(`[Drive Proxy] Empty buffer for fileId=${fileId}`);
      return NextResponse.json(
        { error: "Arquivo vazio no Drive" },
        { status: 404 },
      );
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(buffer.byteLength),
        "Cache-Control": "private, max-age=3600",
        "Accept-Ranges": "bytes",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Drive Proxy] Erro fileId=${fileId}:`, errMsg);
    return NextResponse.json(
      { error: `Erro ao servir arquivo: ${errMsg}` },
      { status: 500 },
    );
  }
}
