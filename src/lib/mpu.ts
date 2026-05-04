/**
 * Única fonte de verdade da derivação "isto é uma MPU?".
 * Usar SEMPRE este helper — nunca duplicar a lógica.
 */

export interface MpuInput {
  numero?: string | null;
  processoVvd?: {
    tipoProcesso?: string | null;
    mpuAtiva?: boolean | null;
  };
}

export function isMpu(p: MpuInput): boolean {
  if (p.processoVvd?.tipoProcesso === "MPU") return true;
  if (p.processoVvd?.mpuAtiva === true) return true;
  if (typeof p.numero === "string" && p.numero.startsWith("MPUMP")) return true;
  return false;
}
