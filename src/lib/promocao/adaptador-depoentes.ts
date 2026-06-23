import type { Testemunha } from "@/lib/db/schema/agenda";
import type { CandidatoPessoa } from "./tipos";
import { mapearPapel } from "./de-para-papeis";

/**
 * Mapeia o `tipo` da testemunha (enum `tipo_testemunha`: DEFESA/ACUSACAO/COMUM/
 * INFORMANTE/PERITO/VITIMA) para a chave de papel canônica consumida por
 * `mapearPapel`. Apenas ACUSACAO/DEFESA carregam lado; os demais caem no papel
 * genérico `testemunha` (sem lado).
 */
function chaveDePapel(tipo: string): string {
  const t = (tipo ?? "").trim().toUpperCase();
  if (t === "ACUSACAO") return "testemunha_acusacao";
  if (t === "DEFESA") return "testemunha_defesa";
  return "testemunha";
}

/**
 * Extrai candidatos a Pessoa a partir das testemunhas/depoentes de um processo.
 *
 * - Filtra linhas sem nome (nome vazio/só-espaços).
 * - `tipo` → papel via `chaveDePapel` + `mapearPapel` (ACUSACAO/DEFESA carregam
 *   lado; demais viram papel `testemunha` sem lado).
 * - `fonteRef = "depoentes:{processoId}"` (idempotência/auditoria, espelhando os
 *   demais adaptadores).
 * - `confianca = 0.8` (depoente é fonte estruturada de alta confiança).
 * - Carrega `testemunhaId` para o repo ligar a participação à linha de origem.
 *
 * Sem `cpf`/`dataNascimento`: a tabela `testemunhas` não os fornece — o resolver
 * deduplica por nome (+ nascimento quando há), então um depoente que já virou
 * pessoa por outra fonte vincula/ignora em vez de duplicar.
 */
export function candidatosDeDepoentes(
  processoId: number,
  rows: Testemunha[],
): CandidatoPessoa[] {
  return rows
    .filter((r) => typeof r.nome === "string" && r.nome.trim().length > 0)
    .map((r) => {
      const pp = mapearPapel(chaveDePapel(r.tipo));
      // Fallback defensivo: se a chave não estiver no MAPA, `mapearPapel` retorna
      // `outro`; força `testemunha` para preservar a semântica de depoente.
      const papel = pp.papel === "outro" ? "testemunha" : pp.papel;
      return {
        nome: r.nome,
        cpf: null,
        dataNascimento: null,
        papel,
        lado: pp.lado,
        subpapel: pp.subpapel,
        fonteRef: `depoentes:${processoId}`,
        confianca: 0.8,
        testemunhaId: r.id,
      };
    });
}
