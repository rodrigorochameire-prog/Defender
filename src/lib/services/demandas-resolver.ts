/**
 * Resolve uma entrada de demanda contra o estado do banco.
 * Centraliza a regra de identidade de demanda — única porta de criação,
 * usada por: sheets/create-from-row, webhooks/n8n/sheets, enrichment bridge.
 * (pje-import mantém dedup própria, mais sofisticada — filtro por
 * assistidoId p/ corréus + fallback de 30d.)
 *
 * Árvore de decisão:
 *   1. PJe match (mesma intimação no mesmo processo) → UPDATE
 *   2. PJe novo → CREATE (intimações distintas convivem no mesmo processo)
 *   3. Sem PJe + sem demanda ativa → CREATE
 *   4. Sem PJe + todas demandas fechadas → CREATE (intimação nova após resolução)
 *   5. Sem PJe + demanda aberta + ato compatível → UPDATE (refinamento)
 *   6. Sem PJe + demanda aberta + ato incompatível → CREATE com revisaoPendente=true
 *
 * "Aberto" = status em {2_ATENDER, 5_TRIAGEM, 4_MONITORAR, URGENTE}
 */

import { db } from "@/lib/db";
import { demandas } from "@/lib/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";

export type DemandaOrigem =
  | "pje"
  | "planilha_apps_script"
  | "planilha_n8n"
  | "ombuds_ui"
  | "enrichment"
  | "manual";

export interface DemandaInput {
  processoId: number;
  assistidoId: number;
  ato: string;
  origem: DemandaOrigem;
  pjeDocumentoId?: string | null;
  status?: string | null;
  substatus?: string | null;
  prazo?: string | null;
  dataEntrada?: string | null;
  dataExpedicao?: string | null;
  providencias?: string | null;
  reuPreso?: boolean | null;
  prioridade?: string | null;
  defensorId?: number | null;
  workspaceId?: number | null;
  tipoAto?: string | null;
  importBatchId?: string | null;
  ordemOriginal?: number | null;
  enrichmentData?: Record<string, unknown> | null;
}

export interface AtivaSnapshot {
  id: number;
  status: string | null;
  ato: string;
  pjeDocumentoId: string | null;
  providencias: string | null;
  enrichmentData: Record<string, unknown> | null;
}

export type ResolveDecision =
  | { action: "create"; reason: string }
  | { action: "update"; targetId: number; reason: string }
  | { action: "create_flagged"; reason: string };

export type ResolveResult = {
  action: "created" | "updated" | "created_flagged";
  demandaId: number;
  reason: string;
};

const STATUS_ABERTOS = new Set([
  "2_ATENDER",
  "5_TRIAGEM",
  "4_MONITORAR",
  "URGENTE",
]);

function normalize(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Heurística de compatibilidade entre dois atos.
 *   "Ciência" vs "Ciência de decisão" → true (substring)
 *   "Ciência decisão" vs "Ciência acórdão" → true (mesma palavra-base)
 *   "Ciência" vs "Resposta à Acusação" → false
 *   Acentos e maiúsculas são ignorados.
 */
export function atosCompativeis(
  existente: string | null | undefined,
  novo: string | null | undefined,
): boolean {
  const a = normalize(existente);
  const b = normalize(novo);
  if (!a || !b) return true;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  const palavraA = a.split(" ")[0];
  const palavraB = b.split(" ")[0];
  if (palavraA && palavraA === palavraB) return true;
  return false;
}

/**
 * Decisão pura — sem efeitos. Recebe input + snapshot e retorna a ação.
 * Toda lógica de identidade vive aqui; o resto do helper só persiste.
 */
export function decideAction(
  input: DemandaInput,
  ativas: AtivaSnapshot[],
): ResolveDecision {
  if (input.pjeDocumentoId) {
    const match = ativas.find((d) => d.pjeDocumentoId === input.pjeDocumentoId);
    if (match) {
      return {
        action: "update",
        targetId: match.id,
        reason: "pje_documento_id_match",
      };
    }
    return { action: "create", reason: "pje_novo" };
  }

  if (ativas.length === 0) {
    return { action: "create", reason: "sem_demanda_ativa" };
  }

  const abertas = ativas.filter(
    (d) => d.status !== null && STATUS_ABERTOS.has(d.status),
  );

  if (abertas.length === 0) {
    return { action: "create", reason: "todas_demandas_fechadas" };
  }

  abertas.sort((a, b) => b.id - a.id);
  const aberta = abertas[0];

  if (atosCompativeis(aberta.ato, input.ato)) {
    return {
      action: "update",
      targetId: aberta.id,
      reason: "ato_compativel_refinamento",
    };
  }

  return {
    action: "create_flagged",
    reason: "ato_distinto_em_processo_aberto",
  };
}

/**
 * Resolve uma entrada e persiste — UPDATE de campos não-vazios ou INSERT.
 * Em caso de UPDATE, preserva providências ricas (não sobrescreve com vazio).
 * Em caso de INSERT com revisão, marca `revisao_pendente=true` para a UI de triagem.
 */
export async function resolveDemanda(input: DemandaInput): Promise<ResolveResult> {
  const ativas = (await db
    .select({
      id: demandas.id,
      status: demandas.status,
      ato: demandas.ato,
      pjeDocumentoId: demandas.pjeDocumentoId,
      providencias: demandas.providencias,
      enrichmentData: demandas.enrichmentData,
    })
    .from(demandas)
    .where(
      and(eq(demandas.processoId, input.processoId), isNull(demandas.deletedAt)),
    )
    .orderBy(desc(demandas.createdAt))) as AtivaSnapshot[];

  const decision = decideAction(input, ativas);

  if (decision.action === "update") {
    const target = ativas.find((d) => d.id === decision.targetId)!;
    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
      syncedAt: new Date(),
    };

    const novoAto = input.ato?.trim();
    if (novoAto) {
      const a = normalize(target.ato);
      const b = normalize(novoAto);
      if (!a) updates.ato = novoAto;
      else if (b.length > a.length && b.includes(a)) updates.ato = novoAto;
    }

    if (input.status?.trim()) updates.status = input.status as never;
    if (input.substatus !== undefined) updates.substatus = input.substatus;
    if (input.prazo) updates.prazo = input.prazo;
    if (input.dataEntrada) updates.dataEntrada = input.dataEntrada;
    if (input.dataExpedicao) updates.dataExpedicao = input.dataExpedicao;
    if (input.providencias?.trim()) updates.providencias = input.providencias.trim();
    if (typeof input.reuPreso === "boolean") updates.reuPreso = input.reuPreso;
    if (input.prioridade?.trim()) updates.prioridade = input.prioridade as never;
    if (input.pjeDocumentoId && !target.pjeDocumentoId) {
      updates.pjeDocumentoId = input.pjeDocumentoId;
    }

    await db.update(demandas).set(updates).where(eq(demandas.id, decision.targetId));

    return {
      action: "updated",
      demandaId: decision.targetId,
      reason: decision.reason,
    };
  }

  const flagged = decision.action === "create_flagged";
  const [created] = await db
    .insert(demandas)
    .values({
      processoId: input.processoId,
      assistidoId: input.assistidoId,
      ato: input.ato.trim(),
      tipoAto: input.tipoAto ?? null,
      pjeDocumentoId: input.pjeDocumentoId ?? null,
      status: (input.status ?? "5_TRIAGEM") as never,
      substatus: input.substatus ?? null,
      prazo: input.prazo ?? null,
      dataEntrada: input.dataEntrada ?? null,
      dataExpedicao: input.dataExpedicao ?? null,
      providencias: input.providencias?.trim() || null,
      reuPreso: input.reuPreso ?? false,
      prioridade: (input.prioridade ?? "NORMAL") as never,
      defensorId: input.defensorId ?? null,
      workspaceId: input.workspaceId ?? null,
      importBatchId: input.importBatchId ?? null,
      ordemOriginal: input.ordemOriginal ?? null,
      enrichmentData: (input.enrichmentData as never) ?? undefined,
      origem: input.origem as never,
      revisaoPendente: flagged,
      syncedAt: new Date(),
    } as never)
    .returning({ id: demandas.id });

  return {
    action: flagged ? "created_flagged" : "created",
    demandaId: created.id,
    reason: decision.reason,
  };
}
