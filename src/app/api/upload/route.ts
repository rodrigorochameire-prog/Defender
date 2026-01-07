import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { uploadPetDocument, uploadPetPhoto, uploadWallMedia } from "@/lib/supabase/storage";

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
    const uploadType = formData.get("type") as string | null; // "wall" | "pet" | "document"
    const category = (formData.get("category") as string | null) || "other";

    if (!file) {
      return NextResponse.json(
        { error: "Nenhum arquivo enviado" },
        { status: 400 }
      );
    }

    // Validar tipo de arquivo (varia conforme o tipo de upload)
    const allowedImageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const allowedDocumentTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ...allowedImageTypes,
    ];
    const allowedTypes = uploadType === "document" ? allowedDocumentTypes : allowedImageTypes;

    if (!allowedTypes.includes(file.type)) {
      const message =
        uploadType === "document"
          ? "Tipo de arquivo não permitido. Use PDF, JPG, PNG, WebP ou DOC/DOCX."
          : "Tipo de arquivo não permitido. Use JPG, PNG, GIF ou WebP.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    // Validar tamanho (máximo 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "Arquivo muito grande. Máximo 10MB." },
        { status: 400 }
      );
    }

    let result;

    // Se for upload do mural OU se petId for 0 ou inválido
    const petId = petIdStr ? parseInt(petIdStr, 10) : 0;
    
    if (uploadType === "wall" || petId === 0 || isNaN(petId)) {
      // Upload para o bucket do mural
      result = await uploadWallMedia(file);
    } else if (uploadType === "document") {
      // Upload para bucket de documentos (com categoria)
      result = await uploadPetDocument(file, petId, category);
    } else {
      // Upload para o bucket de pets
      result = await uploadPetPhoto(file, petId);
    }

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
