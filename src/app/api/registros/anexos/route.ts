// src/app/api/registros/anexos/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { registros, registroAnexos } from "@/lib/db/schema/agenda";
import { verifySessionToken } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import {
  ACCEPTED_MIME, MAX_BYTES, mimeToTipo, buildStoragePath,
} from "@/lib/registros/anexo-utils";
import { mirrorAnexoToDrive } from "@/lib/registros/mirror-anexo-to-drive";

const BUCKET = "documents";

async function getUserId(): Promise<number | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("defesahub_session")?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  return session?.userId ?? null;
}

export async function POST(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const form = await request.formData();
  const registroId = Number(form.get("registroId"));
  const file = form.get("file");

  if (!Number.isInteger(registroId) || registroId <= 0) {
    return NextResponse.json({ error: "registroId inválido" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "arquivo ausente" }, { status: 400 });
  }
  if (!(ACCEPTED_MIME as readonly string[]).includes(file.type)) {
    return NextResponse.json({ error: `tipo não suportado: ${file.type}` }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "arquivo acima de 10MB" }, { status: 413 });
  }

  const registro = await db.query.registros.findFirst({ where: eq(registros.id, registroId) });
  if (!registro) return NextResponse.json({ error: "registro não encontrado" }, { status: 404 });

  const path = buildStoragePath(registroId, file.name, randomUUID, file.type);
  const supabase = getSupabaseAdmin();
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600", upsert: false, contentType: file.type,
  });
  if (upErr) return NextResponse.json({ error: `falha no upload: ${upErr.message}` }, { status: 500 });

  const [anexo] = await db.insert(registroAnexos).values({
    registroId,
    storagePath: path,
    nomeOriginal: file.name,
    mimeType: file.type,
    tamanho: file.size,
    tipo: mimeToTipo(file.type),
    autorId: userId,
  }).returning();

  // espelho no Drive — fire-and-forget, não bloqueia a resposta
  if (anexo) void mirrorAnexoToDrive(anexo.id);

  return NextResponse.json({ anexo }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }
  const anexo = await db.query.registroAnexos.findFirst({ where: eq(registroAnexos.id, id) });
  if (!anexo) return NextResponse.json({ error: "anexo não encontrado" }, { status: 404 });

  const supabase = getSupabaseAdmin();
  await supabase.storage.from(BUCKET).remove([anexo.storagePath]);
  await db.delete(registroAnexos).where(eq(registroAnexos.id, id));

  return NextResponse.json({ ok: true });
}
