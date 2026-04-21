export function generateTccRef(year: number, seq: number): string {
  if (year < 2020 || year > 2099) {
    throw new Error(`Ano inválido: ${year}`);
  }
  return `TCC-${year}-${String(seq).padStart(4, "0")}`;
}

const URGENCIA_NAO = new Set(["Não", "Nao", "", "false", "0"]);

export interface NormalizedPayload {
  assistidoNome: string;
  assistidoTelefone?: string;
  assistidoCpf?: string;
  compareceu: "proprio" | "familiar" | "outro";
  familiarNome?: string;
  familiarTelefone?: string;
  familiarGrau?: string;
  processoCnj?: string;
  situacao?: string;
  vara?: string;
  urgencia: boolean;
  urgenciaMotivo?: string;
  documentoEntregue: string;
  demandaLivre?: string;
}

const COMPARECEU_VALID = new Set(["proprio", "familiar", "outro"]);

export function normalizePayload(raw: Record<string, unknown>): NormalizedPayload {
  const nome = String(raw.assistido_nome ?? "").trim();
  if (!nome) throw new Error("assistido_nome é obrigatório");

  const compareceuRaw = String(raw.compareceu ?? "proprio").toLowerCase();
  const compareceu = COMPARECEU_VALID.has(compareceuRaw)
    ? (compareceuRaw as "proprio" | "familiar" | "outro")
    : "proprio";

  const urgenciaRaw = String(raw.urgencia ?? "Não");
  const urgencia = !URGENCIA_NAO.has(urgenciaRaw);

  let processoCnj: string | undefined;
  if (raw.processo_cnj) {
    const digits = String(raw.processo_cnj).replace(/\D/g, "");
    if (digits.length !== 20) {
      throw new Error(`CNJ inválido: precisa ter 20 dígitos, recebido ${digits.length}`);
    }
    processoCnj = digits;
  }

  return {
    assistidoNome: nome,
    assistidoTelefone: raw.telefone ? String(raw.telefone) : undefined,
    assistidoCpf: raw.cpf ? String(raw.cpf) : undefined,
    compareceu,
    familiarNome: raw.familiar_nome ? String(raw.familiar_nome) : undefined,
    familiarTelefone: raw.familiar_telefone ? String(raw.familiar_telefone) : undefined,
    familiarGrau: raw.familiar_grau ? String(raw.familiar_grau) : undefined,
    processoCnj,
    situacao: raw.situacao ? String(raw.situacao) : undefined,
    vara: raw.vara ? String(raw.vara) : undefined,
    urgencia,
    urgenciaMotivo: urgencia ? urgenciaRaw : undefined,
    documentoEntregue: String(raw.documento_entregue ?? "Nenhum"),
    demandaLivre: raw.demanda ? String(raw.demanda) : undefined,
  };
}

export interface AutoResolveInput {
  documentoEntregue: string;
  demandaLivre: string | null | undefined;
}

export function shouldAutoResolve({ documentoEntregue, demandaLivre }: AutoResolveInput): boolean {
  if (documentoEntregue === "Nenhum" || !documentoEntregue) return false;
  const len = (demandaLivre ?? "").trim().length;
  return len < 30;
}

// ---- createAtendimento ----
import { db } from "@/lib/db";
import { atendimentosTriagem } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

export interface CreateAtendimentoInput {
  aba: "Juri" | "VVD" | "EP" | "Crime1" | "Crime2";
  linha: number;
  payload: Record<string, unknown>;
  appsScriptId?: string;
}

export interface CreateAtendimentoResult {
  atendimentoId: number;
  tccRef: string;
  status: string;
  triagemUrl: string;
}

const AREA_MAP: Record<string, string> = {
  Juri: "Juri",
  VVD: "VVD",
  EP: "EP",
  Crime1: "Crime1",
  Crime2: "Crime2",
};

export async function createAtendimento(input: CreateAtendimentoInput): Promise<CreateAtendimentoResult> {
  const area = AREA_MAP[input.aba];
  if (!area) throw new Error(`Aba inválida: ${input.aba}`);

  const normalized = normalizePayload(input.payload);

  const initialStatus = shouldAutoResolve({
    documentoEntregue: normalized.documentoEntregue,
    demandaLivre: normalized.demandaLivre ?? null,
  })
    ? "resolvido"
    : "pendente_avaliacao";

  const year = new Date().getFullYear();
  const maxAttempts = 3;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const seqResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(atendimentosTriagem)
      .where(sql`extract(year from ${atendimentosTriagem.createdAt}) = ${year}`);
    const seq = (seqResult[0]?.count ?? 0) + 1 + attempt; // incrementa em cada retry
    const tccRef = generateTccRef(year, seq);

    try {
      const [row] = await db.insert(atendimentosTriagem).values({
        tccRef,
        area,
        assistidoNome: normalized.assistidoNome,
        assistidoTelefone: normalized.assistidoTelefone,
        assistidoCpf: normalized.assistidoCpf,
        compareceu: normalized.compareceu,
        familiarNome: normalized.familiarNome,
        familiarTelefone: normalized.familiarTelefone,
        familiarGrau: normalized.familiarGrau,
        processoCnj: normalized.processoCnj,
        situacao: normalized.situacao,
        vara: normalized.vara,
        urgencia: normalized.urgencia,
        urgenciaMotivo: normalized.urgenciaMotivo,
        documentoEntregue: normalized.documentoEntregue,
        demandaLivre: normalized.demandaLivre,
        status: initialStatus,
        abaPlanilha: input.aba,
        linhaPlanilha: input.linha,
        criadoPorAppsScript: input.appsScriptId,
        decididoEm: initialStatus === "resolvido" ? new Date() : null,
      }).returning();

      return {
        atendimentoId: row.id,
        tccRef: row.tccRef,
        status: row.status,
        triagemUrl: `/triagem?id=${row.id}`,
      };
    } catch (e: unknown) {
      lastError = e;
      const pgCode = (e as { code?: string })?.code;
      const message = e instanceof Error ? e.message : String(e);
      // Retry only on unique violation of tccRef
      if (pgCode === "23505" || message.includes("atendimentos_triagem_tcc_ref_unique")) {
        continue;
      }
      throw e;
    }
  }

  throw new Error(`createAtendimento falhou após ${maxAttempts} tentativas: ${String(lastError)}`);
}
