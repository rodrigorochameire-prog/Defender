import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { uploadImageBuffer } from "@/lib/supabase/storage";

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
    const petIdStr = formData.get("petId") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "Nenhum arquivo enviado" },
        { status: 400 }
      );
    }

    if (!petIdStr) {
      return NextResponse.json(
        { error: "ID do pet é obrigatório" },
        { status: 400 }
      );
    }

    const petId = parseInt(petIdStr, 10);
    if (isNaN(petId)) {
      return NextResponse.json(
        { error: "ID do pet inválido" },
        { status: 400 }
      );
    }

    // Validar tipo de arquivo
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de arquivo não permitido. Use JPG, PNG, GIF ou WebP." },
        { status: 400 }
      );
    }

    // Validar tamanho (máximo 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "Arquivo muito grande. Máximo 5MB." },
        { status: 400 }
      );
    }

    // Converter para Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload para Supabase com o petId para RLS funcionar
    const result = await uploadImageBuffer(
      buffer,
      file.name,
      file.type,
      petId
    );

    return NextResponse.json({
      success: true,
      url: result.url,
      path: result.path,
    });
  } catch (error) {
    console.error("Erro no upload:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro no upload" },
      { status: 500 }
    );
  }
}
