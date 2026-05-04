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
}

export function isMpu(p: MpuInput): boolean {
  if (p.processoVvd?.tipoProcesso === "MPU") return true;
  if (p.processoVvd?.mpuAtiva === true) return true;
  if (typeof p.numeroAutos === "string" && p.numeroAutos.startsWith("MPUMP")) return true;
  return false;
}
