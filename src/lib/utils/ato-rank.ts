/**
 * Ranking de relevância dos tipos de ato — usado para agrupar demandas
 * dentro de cada coluna/status do Kanban e da planilha.
 *
 * Ordem (menor = topo):
 * 10 — Peças de prazo curto (RA, AF, Memoriais, Contestação)
 * 20 — Liberdade/prisão urgente (HC, MS, revogação/relaxamento de prisão)
 * 30 — Recursos (Apelação, RESE, ED, Agravo, Desaforamento)
 * 40 — Diligências/produção probatória
 * 50 — Petições intermediárias (juntada, ofício, atualização endereço)
 * 60 — Ciências
 * 99 — Outros / sem categoria
 */

const ATO_RELEVANCE_RANK: Record<string, number> = {
  // 10 — Peças de prazo curto
  "Resposta à Acusação": 10,
  "Alegações finais": 10,
  "Memoriais": 10,
  "Contestação": 10,

  // 20 — Liberdade/prisão urgente
  "Habeas Corpus": 20,
  "Mandado de Segurança": 20,
  "Revogação da prisão": 20,
  "Revogação da prisão preventiva": 20,
  "Relaxamento da prisão": 20,
  "Relaxamento da prisão preventiva": 20,
  "Relaxamento e revogação de prisão": 20,

  // 30 — Recursos
  "Apelação": 30,
  "Razões de apelação": 30,
  "Contrarrazões de apelação": 30,
  "RESE": 30,
  "Razões de RESE": 30,
  "Contrarrazões de RESE": 30,
  "Embargos de Declaração": 30,
  "Contrarrazões de ED": 30,
  "Agravo em Execução": 30,
  "Desaforamento": 30,

  // 40 — Diligências/produção probatória
  "Diligências do 422": 40,
  "Incidente de insanidade": 40,
  "Quesitos": 40,
  "Requerimento de produção probatória": 40,
  "Requerimento audiência de justificação": 40,
  "Requerimento de progressão": 40,
  "Restituição de coisa": 40,
  "Revogação de MPU": 40,
  "Modulação de MPU": 40,
  "Revogação de medida protetiva": 40,
  "Revogação do monitoramento": 40,
  "Revogação de monitoramento": 40,

  // 50 — Petições intermediárias
  "Petição intermediária": 50,
  "Prosseguimento do feito": 50,
  "Atualização de endereço": 50,
  "Juntada de documentos": 50,
  "Ofício": 50,

  // 99 — sem categoria
  "Outro": 99,
};

/**
 * Retorna o rank de relevância de um tipo de ato.
 * - Ciência* → 60 (catch-all por prefixo)
 * - Mapeamento explícito → valor da tabela
 * - Sem ato ou desconhecido → 99
 */
export function getAtoRelevanceRank(ato: string | null | undefined): number {
  if (!ato) return 99;
  const trimmed = ato.trim();
  if (!trimmed) return 99;

  // Catch-all: qualquer ato que começa com "Ciência" entra na categoria 60
  if (/^ci[êe]ncia\b/i.test(trimmed)) return 60;

  const direct = ATO_RELEVANCE_RANK[trimmed];
  if (direct !== undefined) return direct;

  return 99;
}
