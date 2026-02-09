import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { uploadFileBuffer } from "@/lib/services/google-drive";
import { SPECIAL_FOLDER_IDS } from "@/lib/utils/text-extraction";

export const maxDuration = 60; // 60 segundos para upload

/**
 * POST /api/drive/upload
 *
 * Upload de arquivo para a pasta de distribuição do Google Drive.
 * Aceita apenas PDFs para processamento pela IA.
 *
 * Form Data:
 * - file: File (PDF)
 * - folderId?: string (pasta de destino, default: DISTRIBUICAO)
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação via cookie de sessão
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("defesahub_session");
    if (!sessionCookie) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    // Parsear form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folderId = formData.get("folderId") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "Nenhum arquivo enviado" },
        { status: 400 }
      );
    }

    // Verificar tipo de arquivo
    const allowedTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/jpg",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de arquivo não suportado. Use PDF, PNG ou JPG." },
        { status: 400 }
      );
    }

    // Verificar tamanho (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "Arquivo muito grande. Máximo 50MB." },
        { status: 400 }
      );
    }

    // Converter para Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determinar pasta de destino
    const targetFolderId = folderId || SPECIAL_FOLDER_IDS.DISTRIBUICAO;

    // Fazer upload para o Google Drive
    const result = await uploadFileBuffer(
      buffer,
      file.name,
      file.type,
      targetFolderId,
      `Uploaded via OMBUDS - ${new Date().toISOString()}`
    );

    if (!result) {
      return NextResponse.json(
        { error: "Erro ao fazer upload para o Google Drive" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      file: {
        id: result.id,
        name: result.name,
        mimeType: result.mimeType,
        size: result.size,
        webViewLink: result.webViewLink,
      },
    });
  } catch (error) {
    console.error("[API Upload] Erro:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS para CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "POST",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
