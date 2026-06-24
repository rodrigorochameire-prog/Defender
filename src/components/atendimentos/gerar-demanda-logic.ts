// Lógica pura do fluxo "Gerar demanda a partir do atendimento" (Fase 5).
// Sem React/tRPC — testável e reutilizável pelo popover/painel e pelo futuro
// ProceduralActSelector. O payload de createFromForm permanece no componente
// (depende do tipo de input do tRPC) até a migração popover→painel.

import { htmlParaTexto } from "./html-para-texto";
import { ATRIBUICAO_DEMANDA_OPTIONS } from "./config";
import { getAtoOptionsAgrupados } from "@/config/atos-por-atribuicao";

/** Rascunho de registro inicial a partir do que foi colhido no atendimento (HTML limpo). */
export function montarRegistroDoAtendimento(
  ctx: { assunto?: string | null; pedido?: string | null; conteudo?: string | null } | null | undefined,
): string {
  if (!ctx) return "";
  const assunto = htmlParaTexto(ctx.assunto);
  const pedido = htmlParaTexto(ctx.pedido);
  const conteudo = htmlParaTexto(ctx.conteudo);
  return [assunto && `Assunto: ${assunto}`, pedido && `Pedido: ${pedido}`, conteudo || ""]
    .filter(Boolean)
    .join("\n");
}

/** Enum de atribuição → rótulo do catálogo de atos (fallback "Criminal Geral"). */
export function atribuicaoAtosLabel(atribuicao: string): string {
  return ATRIBUICAO_DEMANDA_OPTIONS.find((o) => o.value === atribuicao)?.atosLabel ?? "Criminal Geral";
}

export type PrazoTone = "danger" | "warn" | "neutral" | "muted";

/** Soma `dias` (calendário) a uma data ISO `YYYY-MM-DD`, retornando ISO `YYYY-MM-DD`. */
export function addDiasISO(baseISO: string, dias: number): string {
  const d = new Date(`${baseISO}T00:00:00`);
  d.setDate(d.getDate() + dias);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Rótulo + tom para o prazo escolhido, relativo a `hojeISO`. Tons espelham o
 * cockpit de prazos: vencido=danger, hoje=warn, ≤7d=neutral, além=muted.
 */
export function prazoPreview(
  prazoISO: string | null | undefined,
  hojeISO: string,
): { label: string; tone: PrazoTone } | null {
  if (!prazoISO) return null;
  const ms = new Date(`${prazoISO}T00:00:00`).getTime() - new Date(`${hojeISO}T00:00:00`).getTime();
  const dias = Math.round(ms / 86_400_000);
  if (dias < 0) return { label: "vencido", tone: "danger" };
  if (dias === 0) return { label: "hoje", tone: "warn" };
  const label = `em ${dias} dia${dias > 1 ? "s" : ""}`;
  return { label, tone: dias <= 7 ? "neutral" : "muted" };
}

export interface BuildCreatePayloadInput {
  assistidoNome: string;
  assistidoId: number;
  /** Id do processo selecionado como string ("" = nenhum → cria provisório). */
  processoId: string;
  /** numeroAutos do processo do atendimento (fallback quando não há processoId). */
  processoNumeroAutos: string | null | undefined;
  atribuicao: string;
  ato: string;
  urgente: boolean;
  prazo: string;
  reuPreso: boolean;
  registro: string;
  atendimentoId?: number;
  vincular: boolean;
}

/** Payload de `demandas.createFromForm` (campos opcionais espelham o schema do tRPC). */
export interface CreateFromFormPayload {
  assistidoNome: string;
  assistidoId: number;
  processoId?: number;
  numeroAutos?: string;
  atribuicao: string;
  ato: string;
  status: string;
  prazo?: string;
  reuPreso: boolean;
  providencias?: string;
  atendimentoId?: number;
}

/**
 * Monta o payload de `demandas.createFromForm` — firewall de regressão do fluxo
 * Gerar demanda. Réplica fiel da regra que estava inline no componente:
 *  - processoId numérico quando há seleção; senão numeroAutos (pode ser undefined);
 *  - status "urgente"/"triagem"; prazo só quando preenchido;
 *  - providencias só com texto (trimado); atendimentoId só quando vincular.
 */
export function buildCreateFromFormPayload(s: BuildCreatePayloadInput): CreateFromFormPayload {
  return {
    assistidoNome: s.assistidoNome,
    assistidoId: s.assistidoId,
    ...(s.processoId
      ? { processoId: Number(s.processoId) }
      : { numeroAutos: s.processoNumeroAutos ?? undefined }),
    atribuicao: s.atribuicao,
    ato: s.ato.trim(),
    status: s.urgente ? "urgente" : "triagem",
    ...(s.prazo ? { prazo: s.prazo } : {}),
    reuPreso: s.reuPreso,
    ...(s.registro.trim() ? { providencias: s.registro.trim() } : {}),
    ...(s.atendimentoId && s.vincular ? { atendimentoId: s.atendimentoId } : {}),
  };
}

export interface AtoGroup {
  group: string;
  options: { value: string; label: string }[];
}

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/**
 * Atos da atribuição agrupados por categoria, com busca acento/caixa-insensível.
 * Query vazia → todos os grupos na ordem do catálogo. Grupos sem match são omitidos.
 */
export function filtrarAtos(atribuicaoEnum: string, query: string): AtoGroup[] {
  const flat = getAtoOptionsAgrupados(atribuicaoAtosLabel(atribuicaoEnum)); // já ordenado por categoria
  const q = normalizar(query);
  const filtrados = q ? flat.filter((a) => normalizar(a.label).includes(q)) : flat;

  const grupos: AtoGroup[] = [];
  const indice = new Map<string, number>();
  for (const a of filtrados) {
    let i = indice.get(a.group);
    if (i === undefined) {
      i = grupos.length;
      indice.set(a.group, i);
      grupos.push({ group: a.group, options: [] });
    }
    grupos[i].options.push({ value: a.value, label: a.label });
  }
  return grupos;
}
