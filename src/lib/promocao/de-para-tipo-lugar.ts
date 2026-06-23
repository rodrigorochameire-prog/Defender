import type { LugarTipoParticipacao } from "./tipos-lugar";

/**
 * De-para PURO de `analysisData.locais[].tipo` → enum `lugar_tipo_participacao`.
 *
 * Cada papel da IA mapeia para o slot SEMÂNTICO correto — sem conflar vítima/
 * testemunha com agressor (erro grave em VVD). Desconhecido → `outro`.
 */
const MAPA: Record<string, LugarTipoParticipacao> = {
  fato: "local-do-fato",
  residencia_defendido: "endereco-assistido",
  residencia_vitima: "residencia-vitima",
  residencia_testemunha: "residencia-testemunha",
  local_trabalho: "trabalho-agressor",
  delegacia: "local-atendimento",
  forum: "local-atendimento",
};

export function mapearTipoLugar(tipoIa: string | null | undefined): LugarTipoParticipacao {
  const k = (tipoIa ?? "").trim().toLowerCase();
  return MAPA[k] ?? "outro";
}
