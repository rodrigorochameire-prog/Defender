import { PAPEIS_ROTATIVOS, INTEL_CONFIG } from "./intel-config";
import type { IntelSignal } from "./compute-dot-level";

function passaThreshold(s: IntelSignal): boolean {
  // Papéis estáveis nunca entram no banner
  if (s.papelPrimario && !PAPEIS_ROTATIVOS.has(s.papelPrimario)) return false;
  const { contradicoesMin, casosMin, sameComarcaMin } = INTEL_CONFIG.banner;
  if (s.contradicoesConhecidas >= contradicoesMin) return true;
  if (s.totalCasos >= casosMin && s.sameComarcaCount >= sameComarcaMin) return true;
  return false;
}

export function shouldShowBanner(signals: IntelSignal[]): boolean {
  return signals.some(passaThreshold);
}

export function filterBannerPessoas(signals: IntelSignal[]): IntelSignal[] {
  return signals.filter(passaThreshold);
}
