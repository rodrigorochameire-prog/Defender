/**
 * Orders processes within a case by contextual relevance.
 * Used in both Assistido and Processo headers.
 */

const TIPO_RANK: Record<string, Record<string, number>> = {
  JURI_CAMACARI: { AP: 1, IP: 2, APF: 3, PPP: 4, CAUTELAR: 5, HC: 6 },
  VVD_CAMACARI: { AP: 1, MPU: 2, IP: 3, APF: 4, PAP: 5, CAUTELAR: 6 },
  EXECUCAO_PENAL: { EP: 1, EANPP: 2, AP: 3, AGRAVO: 4, HC: 5 },
  SUBSTITUICAO: { AP: 1, MPU: 2, IP: 3, APF: 4, CAUTELAR: 5, PAP: 6, HC: 7 },
};

const DEFAULT_RANK: Record<string, number> = { AP: 1, IP: 2, MPU: 3, EP: 4 };

interface ProcessoParaFoco {
  id: number;
  tipoProcesso: string | null;
  isReferencia: boolean | null;
  /** Is the current assistido active in this process? null = not a party */
  ativo?: boolean | null;
  /** Next hearing date, if any */
  proximaAudiencia?: string | null;
}

export function getProcessosFocados(
  processos: ProcessoParaFoco[],
  atribuicao: string,
): ProcessoParaFoco[] {
  const rankMap = TIPO_RANK[atribuicao] ?? DEFAULT_RANK;

  return [...processos].sort((a, b) => {
    // 1. Process with nearest future hearing wins
    const audA = a.proximaAudiencia ? new Date(a.proximaAudiencia).getTime() : Infinity;
    const audB = b.proximaAudiencia ? new Date(b.proximaAudiencia).getTime() : Infinity;
    if (audA !== audB) return audA - audB;

    // 2. Active > inactive for this assistido
    const ativoA = a.ativo !== false ? 0 : 1;
    const ativoB = b.ativo !== false ? 0 : 1;
    if (ativoA !== ativoB) return ativoA - ativoB;

    // 3. Reference > non-reference
    const refA = a.isReferencia ? 0 : 1;
    const refB = b.isReferencia ? 0 : 1;
    if (refA !== refB) return refA - refB;

    // 4. Tipo hierarchy for the area
    const tipoA = rankMap[a.tipoProcesso ?? "AP"] ?? 99;
    const tipoB = rankMap[b.tipoProcesso ?? "AP"] ?? 99;
    return tipoA - tipoB;
  });
}
