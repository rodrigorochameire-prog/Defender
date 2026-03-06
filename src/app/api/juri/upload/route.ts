import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase/client";

export const maxDuration = 60; // 60 segundos para upload

/**
 * Bucket: "juri-documentos"
 * NOTA: Este bucket deve existir no Supabase Storage.
 * Criar via Dashboard > Storage > New Bucket (private).
 */
const BUCKET = "juri-documentos";

const ALLOWED_TIPOS = ["quesitos", "sentenca", "ata"] as const;
type TipoDocumento = (typeof ALLOWED_TIPOS)[number];

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
];

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

/**
 * POST /api/juri/upload
 *
 * Upload de documento de sessao de juri para Supabase Storage.
 *
 * Form Data:
 * - file: File (PDF, JPG, JPEG, PNG)
 * - sessaoJuriId: string (ID da sessao de juri)
 * - tipo: string ("quesitos" | "sentenca" | "ata")
 *
 * Returns:
 * - url: string (signed URL valida por 1 ano)
 * - fileName: string (nome original do arquivo)
 * - path: string (caminho no bucket)
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticacao via cookie de sessao
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("defesahub_session");
    if (!sessionCookie) {
      return NextResponse.json(
        { error: "Nao autorizado" },
        { status: 401 }
      );
    }

    // Parsear form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const sessaoJuriId = formData.get("sessaoJuriId") as string | null;
    const tipo = formData.get("tipo") as string | null;

    // Validar campos obrigatorios
    if (!file || !sessaoJuriId || !tipo) {
      return NextResponse.json(
        { error: "Campos obrigatorios: file, sessaoJuriId, tipo" },
        { status: 400 }
      );
    }

    // Validar tipo de documento
    if (!ALLOWED_TIPOS.includes(tipo as TipoDocumento)) {
      return NextResponse.json(
        {
          error: `Tipo invalido: "${tipo}". Permitidos: ${ALLOWED_TIPOS.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Validar tipo de arquivo
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de arquivo nao suportado. Use PDF, JPG ou PNG." },
        { status: 400 }
      );
    }

    // Validar tamanho do arquivo (20MB)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Arquivo muito grande. Maximo 20MB." },
        { status: 400 }
      );
    }

    // Converter para Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Gerar path unico: {sessaoJuriId}/{tipo}/{timestamp}-{safeName}
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${sessaoJuriId}/${tipo}/${timestamp}-${safeName}`;

    // Upload para Supabase Storage
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    if (error) {
      console.error("[API Juri Upload] Erro no storage:", error);
      return NextResponse.json(
        { error: "Falha no upload: " + error.message },
        { status: 500 }
      );
    }

    // Gerar URL assinada (1 ano) — bucket privado para documentos juridicos
    const { data: urlData } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(data.path, 60 * 60 * 24 * 365); // 1 ano

    const url = urlData?.signedUrl || "";

    if (!url) {
      console.error("[API Juri Upload] Falha ao gerar URL assinada para:", data.path);
      return NextResponse.json(
        { error: "Upload realizado, mas falha ao gerar URL de acesso" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url,
      fileName: file.name,
      path: data.path,
    });
  } catch (error) {
    console.error("[API Juri Upload] Erro:", error);
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
