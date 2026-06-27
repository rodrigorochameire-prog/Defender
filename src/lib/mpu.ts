/**
 * Única fonte de verdade da derivação "isto é uma MPU?".
 * Usar SEMPRE este helper — nunca duplicar a lógica.
 */

export interface MpuInput {
  /** Número CNJ do processo. Maps to `processos.numeroAutos` / `processosVVD.numeroAutos`. */
  numeroAutos?: string | null;
  processoVvd?: {
    tipoProcesso?: string | null;
    mpuAtiva?: boolean | null;
  };
  /** Classe da INTIMAÇÃO (não do processo) — ex.: "MPUMPCrim". Vem de
   * `demandas.enrichmentData.tipo_processo`. Uma medida protetiva vive dentro de
   * uma Ação Penal, então o processo fica "AP" mas a intimação é MPU. */
  intimacaoTipoProcesso?: string | null;
  /** Ato da demanda — usado APENAS como fallback de última instância (fuzzy). */
  ato?: string | null;
}

export function isMpu(p: MpuInput): boolean {
  // Sinais estruturais (fortes), em ordem de confiança:
  if (p.processoVvd?.tipoProcesso === "MPU") return true;
  if (p.processoVvd?.mpuAtiva === true) return true;
  if (typeof p.numeroAutos === "string" && p.numeroAutos.startsWith("MPUMP")) return true;
  // Classe da intimação (ex.: "MPUMPCrim") — captura MPU dentro de processo AP.
  if (typeof p.intimacaoTipoProcesso === "string" && /^MPU/i.test(p.intimacaoTipoProcesso)) return true;
  // Fallback fuzzy: só quando nada estrutural existe (último recurso).
  if (typeof p.ato === "string" && /\bmpu\b|medida\s+protetiv|modula(c|ç)/i.test(p.ato)) return true;
  return false;
}
