import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/client";

const BUCKET_NAME = "pet-documents";

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    // Obter o arquivo do FormData
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Nenhum arquivo enviado" },
        { status: 400 }
      );
    }

    // Validar tipo de arquivo (documentos)
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de arquivo não permitido. Use PDF, imagens ou documentos Word." },
        { status: 400 }
      );
    }

    // Validar tamanho (máximo 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "Arquivo muito grande. Máximo 10MB." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Gerar nome único para o arquivo
    const fileExt = file.name.split(".").pop()?.toLowerCase() || "pdf";
    const fileName = `documents/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Converter para Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload do arquivo
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, buffer, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    if (error) {
      console.error("Erro no upload:", error);
      throw new Error(`Falha no upload: ${error.message}`);
    }

    // Obter URL pública
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: data.path,
      fileType: file.type,
      fileSize: file.size,
    });
  } catch (error) {
    console.error("Erro no upload de documento:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro no upload" },
      { status: 500 }
    );
  }
}
