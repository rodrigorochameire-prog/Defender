import type { LugarTipoParticipacao } from "./tipos-lugar";

/**
 * De-para PURO de `analysisData.locais[].tipo` → enum `lugar_tipo_participacao`.
 *
 * O enum de destino (ver schema/lugares.ts) tem 6 valores. Os `locais[].tipo`
 * extraídos pela IA são mais granulares; mapeamos para o slot mais próximo e
 * usamos `radar-noticia` como fallback genérico (catch-all que EXISTE no enum).
 */
const MAPA: Record<string, LugarTipoParticipacao> = {
  fato: "local-do-fato",
  residencia_defendido: "endereco-assistido",
  residencia_vitima: "residencia-agressor",
  residencia_testemunha: "residencia-agressor",
  local_trabalho: "trabalho-agressor",
  delegacia: "local-atendimento",
  forum: "local-atendimento",
};

export function mapearTipoLugar(tipoIa: string | null | undefined): LugarTipoParticipacao {
  const k = (tipoIa ?? "").trim().toLowerCase();
  return MAPA[k] ?? "radar-noticia";
}
