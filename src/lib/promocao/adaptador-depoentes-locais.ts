import type { CandidatoLugar } from "./tipos-lugar";

/** Linha mínima de `testemunhas` necessária para extrair a residência. */
export interface TestemunhaEnderecoRow {
  id: number;
  nome: string;
  endereco: string | null;
}

/**
 * Adaptador PURO: extrai a residência de cada depoente (`testemunhas.endereco`)
 * como `CandidatoLugar` para entrar no pipeline de promoção de lugares.
 *
 * Espelha `candidatosDeLocais` (analysisData) mas vem da tabela `testemunhas`:
 *   - ignora linhas sem `endereco` (null/vazio/não-string — defensivo no boundary);
 *   - `tipo` = `residencia-testemunha` (slot semântico de testemunha, NUNCA agressor);
 *   - `fonteRef` = `depoentes_endereco:<processoId>` (idempotência do log de promoção);
 *   - `pessoaId` = null aqui; o vínculo pessoa↔lugar é resolvido após a promoção
 *     de pessoas (o endereço é texto livre, sem bairro/cidade/uf/cep estruturados).
 *
 * O dedup por endereço normalizado e a idempotência de participação são
 * responsabilidade do planner (`planejarLocais`), igual aos locais da IA.
 */
export function candidatosDeDepoentesLocais(
  processoId: number,
  rows: TestemunhaEnderecoRow[],
): CandidatoLugar[] {
  return rows
    .filter(
      (r) => typeof r.endereco === "string" && r.endereco.trim().length > 0,
    )
    .map((r) => ({
      enderecoCompleto: String(r.endereco).trim(),
      bairro: null,
      cidade: null,
      uf: null,
      cep: null,
      latitude: null,
      longitude: null,
      tipo: "residencia-testemunha" as const,
      pessoaId: null,
      fonteRef: `depoentes_endereco:${processoId}`,
      confianca: 0.75,
    }));
}
