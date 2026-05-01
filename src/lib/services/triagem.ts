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
import { atendimentosTriagem, assistidos, processos, demandas } from "@/lib/db/schema";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";

export interface CreateAtendimentoInput {
  aba: "Juri" | "VVD" | "EP" | "Crime1" | "Crime2";
  linha: number;
  payload: Record<string, unknown>;
  appsScriptId?: string;
  workspaceId?: number | null;
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
        workspaceId: input.workspaceId ?? null,
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

// ---- listAtendimentos ----

export interface ListAtendimentosFilter {
  defensorId?: number;
  status?: string;
  area?: string;
  desde?: Date;
  ate?: Date;
  limit?: number;
  offset?: number;
  workspaceId?: number | null;
}

export async function listAtendimentos(f: ListAtendimentosFilter = {}) {
  const conds = [];
  if (f.defensorId) conds.push(eq(atendimentosTriagem.defensorAlvoId, f.defensorId));
  if (f.status) conds.push(eq(atendimentosTriagem.status, f.status));
  if (f.area) conds.push(eq(atendimentosTriagem.area, f.area));
  if (f.desde) conds.push(gte(atendimentosTriagem.createdAt, f.desde));
  if (f.ate) conds.push(lte(atendimentosTriagem.createdAt, f.ate));
  if (f.workspaceId != null) conds.push(eq(atendimentosTriagem.workspaceId, f.workspaceId));

  const where = conds.length > 0 ? and(...conds) : undefined;

  return db
    .select()
    .from(atendimentosTriagem)
    .where(where)
    .orderBy(desc(atendimentosTriagem.createdAt))
    .limit(f.limit ?? 50)
    .offset(f.offset ?? 0);
}

export async function countPendentesPorDefensor(defensorId: number, workspaceId: number): Promise<number> {
  const r = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(atendimentosTriagem)
    .where(and(
      eq(atendimentosTriagem.defensorAlvoId, defensorId),
      eq(atendimentosTriagem.status, "pendente_avaliacao"),
      eq(atendimentosTriagem.workspaceId, workspaceId),
    ));
  return r[0]?.count ?? 0;
}

// ---- promoverAtendimento ----

export interface PromoverInput {
  atendimentoId: number;
  defensorId: number;
  delegarPara?: string;
  decididoPorId?: number;
}

export interface PromoverResult {
  demandaId: number;
  ombudsUrl: string;
}

/** Maps triagem area → atribuicao enum value */
const AREA_TO_ATRIBUICAO: Record<string, string> = {
  Juri:   "JURI_CAMACARI",
  VVD:    "VVD_CAMACARI",
  EP:     "EXECUCAO_PENAL",
  Crime1: "SUBSTITUICAO",
  Crime2: "SUBSTITUICAO",
};

/** Maps triagem area → area enum value (for processos table) */
const AREA_TO_AREA_ENUM: Record<string, string> = {
  Juri:   "JURI",
  VVD:    "VIOLENCIA_DOMESTICA",
  EP:     "EXECUCAO_PENAL",
  Crime1: "SUBSTITUICAO",
  Crime2: "SUBSTITUICAO",
};

/** Prefix for sentinel processo numbers — one per assistido */
const SENTINELA_NUMERO_AUTOS = "TRIAGEM-SEM-CNJ";

/**
 * Returns the shared "sentinel" processo for a given assistido.
 * Instead of creating one ghost processo per atendimento, all triagem
 * atendimentos that have no CNJ share ONE processo per assistido.
 * Format: TRIAGEM-SEM-CNJ-<assistidoId>
 */
async function getOrCreateProcessoSentinela(
  assistidoId: number,
  defensorId: number,
  area: string,
): Promise<number> {
  const numero = `${SENTINELA_NUMERO_AUTOS}-${assistidoId}`;

  const [existing] = await db
    .select({ id: processos.id })
    .from(processos)
    .where(eq(processos.numeroAutos, numero))
    .limit(1);

  if (existing) return existing.id;

  const [novo] = await db
    .insert(processos)
    .values({
      assistidoId,
      atribuicao:
        (AREA_TO_ATRIBUICAO[area] ??
          "SUBSTITUICAO") as typeof processos.$inferInsert.atribuicao,
      numeroAutos: numero,
      area:
        (AREA_TO_AREA_ENUM[area] ??
          "SUBSTITUICAO") as typeof processos.$inferInsert.area,
      defensorId,
      situacao: "ativo",
    })
    .returning({ id: processos.id });

  return novo.id;
}

/**
 * Promove um atendimento de triagem para uma demanda no OMBUDS.
 *
 * Fluxo:
 * 1. Valida o atendimento (existe + status correto)
 * 2. Upsert assistido (por CPF se disponível; senão cria novo)
 * 3. Obtém ou cria processo:
 *    - Se CNJ: upsert por numeroAutos
 *    - Se sem CNJ: usa processo sentinela compartilhado (TRIAGEM-SEM-CNJ-<assistidoId>)
 * 4. Cria demanda com status 5_TRIAGEM vinculada ao processo + assistido
 * 5. Atualiza o atendimento para status "promovido"
 */
export async function promoverAtendimento(input: PromoverInput): Promise<PromoverResult> {
  const [atendimento] = await db
    .select()
    .from(atendimentosTriagem)
    .where(eq(atendimentosTriagem.id, input.atendimentoId));

  if (!atendimento) throw new Error("Atendimento não encontrado");

  if (
    atendimento.status !== "pendente_avaliacao" &&
    atendimento.status !== "devolvido"
  ) {
    const err = new Error(
      `Atendimento não pode ser promovido (status atual: ${atendimento.status})`,
    );
    (err as Error & { statusCode?: number }).statusCode = 409;
    throw err;
  }

  const observacoes = [
    `[${atendimento.tccRef}]`,
    atendimento.demandaLivre,
    atendimento.compareceu === "familiar" && atendimento.familiarNome
      ? `Compareceu: ${atendimento.familiarNome} (${atendimento.familiarGrau ?? "familiar"})`
      : null,
  ]
    .filter(Boolean)
    .join(" | ");

  // 1. Upsert assistido
  //    If CPF is available, search by CPF first; otherwise create a new one.
  let assistidoId: number;

  if (atendimento.assistidoCpf) {
    const [existing] = await db
      .select({ id: assistidos.id })
      .from(assistidos)
      .where(eq(assistidos.cpf, atendimento.assistidoCpf))
      .limit(1);

    if (existing) {
      assistidoId = existing.id;
    } else {
      const [novoAssistido] = await db
        .insert(assistidos)
        .values({
          nome: atendimento.assistidoNome,
          cpf: atendimento.assistidoCpf,
          telefone: atendimento.assistidoTelefone ?? undefined,
          defensorId: input.defensorId,
          atribuicaoPrimaria:
            (AREA_TO_ATRIBUICAO[atendimento.area] ??
              "SUBSTITUICAO") as typeof assistidos.$inferInsert.atribuicaoPrimaria,
          origemCadastro: "triagem",
        })
        .returning({ id: assistidos.id });
      assistidoId = novoAssistido.id;
    }
  } else {
    // No CPF — always create a new assistido to avoid false merges
    const [novoAssistido] = await db
      .insert(assistidos)
      .values({
        nome: atendimento.assistidoNome,
        telefone: atendimento.assistidoTelefone ?? undefined,
        defensorId: input.defensorId,
        atribuicaoPrimaria:
          (AREA_TO_ATRIBUICAO[atendimento.area] ??
            "SUBSTITUICAO") as typeof assistidos.$inferInsert.atribuicaoPrimaria,
        origemCadastro: "triagem",
      })
      .returning({ id: assistidos.id });
    assistidoId = novoAssistido.id;
  }

  // 2. Get or create processo
  let processoId: number;

  if (atendimento.processoCnj) {
    // Has CNJ: upsert by numeroAutos (CNJ digits)
    const [existing] = await db
      .select({ id: processos.id })
      .from(processos)
      .where(eq(processos.numeroAutos, atendimento.processoCnj))
      .limit(1);

    if (existing) {
      processoId = existing.id;
    } else {
      const [novoProcesso] = await db
        .insert(processos)
        .values({
          assistidoId,
          atribuicao:
            (AREA_TO_ATRIBUICAO[atendimento.area] ??
              "SUBSTITUICAO") as typeof processos.$inferInsert.atribuicao,
          numeroAutos: atendimento.processoCnj,
          area:
            (AREA_TO_AREA_ENUM[atendimento.area] ??
              "SUBSTITUICAO") as typeof processos.$inferInsert.area,
          vara: atendimento.vara ?? undefined,
          defensorId: input.defensorId,
          observacoes,
          situacao: "ativo",
        })
        .returning({ id: processos.id });
      processoId = novoProcesso.id;
    }
  } else {
    // No CNJ: use shared sentinel processo for this assistido
    processoId = await getOrCreateProcessoSentinela(
      assistidoId,
      input.defensorId,
      atendimento.area,
    );
  }

  const novoProcesso = { id: processoId };

  // 3. Create demanda
  const [novaDemanda] = await db
    .insert(demandas)
    .values({
      processoId: novoProcesso.id,
      assistidoId,
      ato: atendimento.situacao ?? "Atendimento triagem",
      // providencias migrada para tabela "registros"
      status: "5_TRIAGEM",
      defensorId: input.defensorId,
      dataEntrada: atendimento.createdAt
        ? atendimento.createdAt.toISOString().slice(0, 10)
        : undefined,
    })
    .returning({ id: demandas.id });

  // 4. Mark atendimento as promoted
  await db
    .update(atendimentosTriagem)
    .set({
      status: "promovido",
      promovidoParaDemandaId: novaDemanda.id,
      delegadoPara: input.delegarPara,
      decididoEm: new Date(),
      decididoPorId: input.decididoPorId,
    })
    .where(eq(atendimentosTriagem.id, input.atendimentoId));

  return {
    demandaId: novaDemanda.id,
    ombudsUrl: `/demandas-premium/${novaDemanda.id}`,
  };
}

// ---- aplicarAcao ----

export type AcaoAtendimento = "resolver" | "devolver" | "arquivar" | "reatribuir";

export interface AplicarAcaoInput {
  atendimentoId: number;
  acao: AcaoAtendimento;
  motivo?: string;
  novoDefensorId?: number;
  decididoPorId?: number;
}

const ACAO_TO_STATUS: Record<AcaoAtendimento, string> = {
  resolver: "resolvido",
  devolver: "devolvido",
  arquivar: "arquivado",
  reatribuir: "pendente_avaliacao",
};

export async function aplicarAcao(input: AplicarAcaoInput): Promise<{ ok: true; novoStatus: string }> {
  const novoStatus = ACAO_TO_STATUS[input.acao];
  if (!novoStatus) throw new Error(`Ação inválida: ${input.acao}`);

  const updates: Record<string, unknown> = {
    status: novoStatus,
    decididoEm: new Date(),
    decididoPorId: input.decididoPorId,
  };

  if (input.acao === "devolver") {
    if (!input.motivo) throw new Error("motivo é obrigatório ao devolver");
    updates.motivoDevolucao = input.motivo;
  }
  if (input.acao === "reatribuir") {
    if (!input.novoDefensorId) throw new Error("novoDefensorId é obrigatório ao reatribuir");
    updates.defensorAlvoId = input.novoDefensorId;
    updates.motivoOverride = input.motivo;
    updates.decididoEm = null; // volta a ser pendente
  }

  await db.update(atendimentosTriagem)
    .set(updates)
    .where(eq(atendimentosTriagem.id, input.atendimentoId));

  return { ok: true, novoStatus };
}
