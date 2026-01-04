import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db, petTutors } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { uploadDocumentBuffer } from "@/lib/supabase/storage";

// Tipos de arquivo permitidos
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// Tamanho máximo (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

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

    // Parse do form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const petId = formData.get("petId") as string;
    const category = formData.get("category") as string;

    // Validações
    if (!file) {
      return NextResponse.json(
        { error: "Arquivo não fornecido" },
        { status: 400 }
      );
    }

    if (!petId || !category) {
      return NextResponse.json(
        { error: "petId e category são obrigatórios" },
        { status: 400 }
      );
    }

    // Validar tipo de arquivo
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de arquivo não permitido. Use PDF, JPG, PNG ou DOC." },
        { status: 400 }
      );
    }

    // Validar tamanho
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Arquivo muito grande. Tamanho máximo: 10MB." },
        { status: 400 }
      );
    }

    // Verificar acesso ao pet (tutores só podem acessar seus próprios pets)
    if (session.role !== "admin") {
      const relation = await db.query.petTutors.findFirst({
        where: and(
          eq(petTutors.petId, parseInt(petId)),
          eq(petTutors.tutorId, session.id)
        ),
      });

      if (!relation) {
        return NextResponse.json(
          { error: "Você não tem acesso a este pet" },
          { status: 403 }
        );
      }
    }

    // Converter File para Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Fazer upload
    const result = await uploadDocumentBuffer(
      buffer,
      file.name,
      file.type,
      parseInt(petId),
      category
    );

    return NextResponse.json({
      success: true,
      url: result.url,
      path: result.path,
      fileType: result.fileType,
      fileSize: result.fileSize,
    });
  } catch (error) {
    console.error("Erro no upload:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao fazer upload" },
      { status: 500 }
    );
  }
}

