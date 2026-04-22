/**
 * POST /api/sheets/create-from-row
 *
 * Cria uma nova demanda a partir de uma linha adicionada manualmente na planilha.
 * Chamado pelo Apps Script quando detecta uma linha sem __ombuds_id__.
 *
 * Autenticação: Bearer token (SHEETS_WEBHOOK_SECRET)
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { demandas, processos, assistidos, users } from "@/lib/db/schema";
import { eq, and, isNull, ilike, inArray, asc } from "drizzle-orm";
import { triggerReorder } from "@/lib/services/reorder-trigger";

// Mapeamento: nome da aba → atribuição do banco
const SHEET_TO_ATRIBUICAO: Record<string, string> = {
  "Júri": "JURI_CAMACARI",
  "Violência Doméstica": "VVD_CAMACARI",
  "Violência Doméstic": "VVD_CAMACARI",
  "EP": "EXECUCAO_PENAL",
  "Substituição criminal": "SUBSTITUICAO",
  "Plenários": "GRUPO_JURI",
  "Curadoria": "SUBSTITUICAO_CIVEL",
  "Protocolo integrado": "SUBSTITUICAO",
  "Liberdade": "EXECUCAO_PENAL",
  "Candeias": "SUBSTITUICAO",
};

const ATRIBUICAO_TO_AREA: Record<string, string> = {
  JURI_CAMACARI: "JURI",
  GRUPO_JURI: "JURI",
  VVD_CAMACARI: "VIOLENCIA_DOMESTICA",
  EXECUCAO_PENAL: "EXECUCAO_PENAL",
  SUBSTITUICAO: "SUBSTITUICAO",
  SUBSTITUICAO_CIVEL: "CIVEL",
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Auth
  const auth = req.headers.get("authorization") ?? "";
  const secret = process.env.SHEETS_WEBHOOK_SECRET ?? "";

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  // 2. Parse body
  let body: {
    assistidoNome?: string;
    numeroAutos?: string;
    ato?: string;
    status?: string;
    prazo?: string;
    dataEntrada?: string;
    reuPreso?: string | boolean;
    providencias?: string;
    sheetName?: string;
    defensorEmail?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { assistidoNome, numeroAutos, ato, sheetName, defensorEmail } = body;

  // Converter para string caso Apps Script envie um objeto Date
  const nomeStr = String(assistidoNome ?? "").trim();

  // Detectar se o "nome" é na verdade uma data serializada (ex: "Mon Mar 23 2026 00:00:00 GMT-0300")
  const pareceData = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s/.test(nomeStr) ||
    /^\d{4}-\d{2}-\d{2}/.test(nomeStr) ||
    /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(nomeStr);

  if (!nomeStr || pareceData || !numeroAutos?.trim() || !ato?.trim()) {
    return NextResponse.json(
      { error: pareceData
          ? "assistidoNome contém uma data em vez de nome — verifique o mapeamento de colunas no Apps Script"
          : "Campos obrigatórios: assistidoNome, numeroAutos, ato" },
      { status: 400 }
    );
  }

  const atribuicao = (sheetName && SHEET_TO_ATRIBUICAO[sheetName]) || "SUBSTITUICAO";
  const area = ATRIBUICAO_TO_AREA[atribuicao] || "SUBSTITUICAO";

  try {
    // 3. Resolve defensor
    let defensorId: number | null = null;

    if (defensorEmail) {
      const [defensor] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, defensorEmail))
        .limit(1);
      defensorId = defensor?.id ?? null;
    }

    if (!defensorId) {
      // Fallback determinístico: menor id entre admin/defensor.
      // Aceita 'admin' porque o dono do OMBUDS pode ter role=admin (não defensor).
      const [firstDefensor] = await db
        .select({ id: users.id })
        .from(users)
        .where(inArray(users.role as never, ["admin", "defensor"] as never[]))
        .orderBy(asc(users.id))
        .limit(1);
      defensorId = firstDefensor?.id ?? null;
    }

    // 4. Find or create assistido
    let assistidoId: number;

    const [existingAssistido] = await db
      .select({ id: assistidos.id })
      .from(assistidos)
      .where(
        and(
          ilike(assistidos.nome, nomeStr),
          isNull(assistidos.deletedAt)
        )
      )
      .limit(1);

    if (existingAssistido) {
      assistidoId = existingAssistido.id;
    } else {
      const [newAssistido] = await db
        .insert(assistidos)
        .values({ nome: nomeStr, defensorId })
        .returning({ id: assistidos.id });
      assistidoId = newAssistido.id;
    }

    // 5. Find or create processo
    let processoId: number;

    const [existingProcesso] = await db
      .select({ id: processos.id })
      .from(processos)
      .where(
        and(
          eq(processos.numeroAutos, numeroAutos.trim()),
          isNull(processos.deletedAt)
        )
      )
      .limit(1);

    if (existingProcesso) {
      processoId = existingProcesso.id;
    } else {
      const [newProcesso] = await db
        .insert(processos)
        .values({
          assistidoId,
          numeroAutos: numeroAutos.trim(),
          area: area as never,
          atribuicao: atribuicao as never,
          defensorId,
        })
        .returning({ id: processos.id });
      processoId = newProcesso.id;
    }

    // 6. Create demanda
    const { status, substatus } = normalizarStatus(body.status ?? "");
    const reuPreso =
      typeof body.reuPreso === "boolean"
        ? body.reuPreso
        : body.reuPreso === "true" || body.reuPreso === "Preso";

    const [newDemanda] = await db
      .insert(demandas)
      .values({
        processoId,
        assistidoId,
        ato: ato.trim(),
        status: status as never,
        substatus: substatus ?? undefined,
        prazo: parseDateValue(body.prazo ?? "") ?? undefined,
        dataEntrada: parseDateValue(body.dataEntrada ?? "") ?? undefined,
        reuPreso,
        providencias: body.providencias?.trim() || undefined,
        defensorId,
      })
      .returning({ id: demandas.id });

    triggerReorder(atribuicao, "sheets-create-from-row", newDemanda.id);

    console.log(
      `[Sheets Create] Nova demanda ${newDemanda.id} criada — ${nomeStr} / ${numeroAutos}`
    );

    return NextResponse.json({ ok: true, demandaId: newDemanda.id });
  } catch (err) {
    console.error("[Sheets Create] Erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// ==========================================
// HELPERS
// ==========================================

function normalizarStatus(valor: string): { status: string; substatus: string | null } {
  const upper = valor.toUpperCase().trim();

  const mapa: Record<string, { status: string; substatus: string | null }> = {
    "1 - URGENTE":            { status: "URGENTE",       substatus: null },
    "2 - RELATÓRIO":          { status: "2_ATENDER",     substatus: "2 - Relatório" },
    "2 - ANALISAR":           { status: "2_ATENDER",     substatus: "2 - Analisar" },
    "2 - ATENDER":            { status: "2_ATENDER",     substatus: "2 - Atender" },
    "2 - BUSCAR":             { status: "2_ATENDER",     substatus: "2 - Buscar" },
    "2 - DILIGENCIAR":        { status: "2_ATENDER",     substatus: "2 - Diligenciar" },
    "2 - INVESTIGAR":         { status: "2_ATENDER",     substatus: "2 - Investigar" },
    "2 - ELABORAR":           { status: "2_ATENDER",     substatus: "2 - Elaborar" },
    "2 - ELABORANDO":         { status: "2_ATENDER",     substatus: "2 - Elaborando" },
    "2 - REVISAR":            { status: "2_ATENDER",     substatus: "2 - Revisar" },
    "2 - REVISANDO":          { status: "2_ATENDER",     substatus: "2 - Revisando" },
    "3 - PROTOCOLAR":         { status: "2_ATENDER",     substatus: "3 - Protocolar" },
    "4 - AMANDA":             { status: "4_MONITORAR",   substatus: "4 - Amanda" },
    "4 - ESTÁGIO - TAISSA":   { status: "4_MONITORAR",   substatus: "4 - Estágio - Taissa" },
    "4 - EMILLY":             { status: "4_MONITORAR",   substatus: "4 - Emilly" },
    "4 - MONITORAR":          { status: "4_MONITORAR",   substatus: "4 - Monitorar" },
    "5 - FILA":               { status: "5_TRIAGEM",     substatus: null },
    "5 - TRIAGEM":            { status: "5_TRIAGEM",     substatus: null },
    "6 - DOCUMENTOS":         { status: "2_ATENDER",     substatus: "6 - Documentos" },
    "6 - TESTEMUNHAS":        { status: "2_ATENDER",     substatus: "6 - Testemunhas" },
    "7 - PROTOCOLADO":        { status: "7_PROTOCOLADO", substatus: null },
    "7 - SIGAD":              { status: "7_PROTOCOLADO", substatus: "7 - Sigad" },
    "7 - PETICIONAMENTO INTERMEDIÁRIO": { status: "7_PROTOCOLADO", substatus: "7 - Peticionamento intermediário" },
    "7 - CIÊNCIA":            { status: "7_CIENCIA",     substatus: null },
    "7 - CIENCIA":            { status: "7_CIENCIA",     substatus: null },
    "7 - RESOLVIDO":          { status: "CONCLUIDO",     substatus: "7 - Resolvido" },
    "7 - CONSTITUIU ADVOGADO":{ status: "CONCLUIDO",     substatus: "7 - Constituiu advogado" },
    "7 - EXCLUÍDO":           { status: "CONCLUIDO",     substatus: "7 - Excluído" },
    "7 - SEM ATUAÇÃO":        { status: "7_SEM_ATUACAO", substatus: null },
    "7 - SEM ATUACAO":        { status: "7_SEM_ATUACAO", substatus: null },
    // Formas "diretas" (enum DB sendo passado como label)
    "2_ATENDER":              { status: "2_ATENDER",     substatus: null },
    "4_MONITORAR":            { status: "4_MONITORAR",   substatus: null },
    "5_TRIAGEM":              { status: "5_TRIAGEM",     substatus: null },
    "7_PROTOCOLADO":          { status: "7_PROTOCOLADO", substatus: null },
    "7_CIENCIA":              { status: "7_CIENCIA",     substatus: null },
    "7_SEM_ATUACAO":          { status: "7_SEM_ATUACAO", substatus: null },
    URGENTE:                  { status: "URGENTE",       substatus: null },
    CONCLUIDO:                { status: "CONCLUIDO",     substatus: null },
    ARQUIVADO:                { status: "ARQUIVADO",     substatus: null },
  };

  return mapa[upper] ?? { status: "5_TRIAGEM", substatus: null };
}

function parseDateValue(valor: string): string | null {
  if (!valor) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor;

  // DD/MM/YY ou DD/MM/YYYY
  const m1 = valor.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m1) {
    const [, d, m, y] = m1;
    const year = y.length === 2 ? `20${y}` : y;
    return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // DD.MM.YY ou DD.MM.YYYY
  const m2 = valor.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (m2) {
    const [, d, m, y] = m2;
    const year = y.length === 2 ? `20${y}` : y;
    return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  return null;
}
