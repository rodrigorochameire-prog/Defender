/**
 * Benefícios processuais e penais — cálculo automático
 *
 * Regras aplicadas:
 * - ANPP (art. 28-A CPP): pena mínima < 48 meses AND sem violência
 * - Sursis processual (art. 89 Lei 9.099): pena mínima <= 12 meses
 * - Transação penal (art. 76 Lei 9.099): pena máxima <= 24 meses
 * - Substituição (art. 44 CP): pena máxima <= 48 meses AND sem violência
 */

export interface DelitoBeneficiosInput {
  tipoDelito: string;
  penaMinimaMeses: number;
  penaMaximaMeses: number;
  envolveuViolencia: boolean;
}

export interface DelitoBeneficiosResult {
  cabeAnpp: boolean;
  cabeSursis: boolean;
  cabeTransacao: boolean;
  cabeSubstituicao: boolean;
}

export function calcularBeneficios(
  input: DelitoBeneficiosInput
): DelitoBeneficiosResult {
  const { penaMinimaMeses, penaMaximaMeses, envolveuViolencia } = input;

  // ANPP (art. 28-A CPP): pena mínima < 48 meses AND sem violência
  const cabeAnpp = penaMinimaMeses < 48 && !envolveuViolencia;

  // Sursis processual (art. 89 Lei 9.099): pena mínima <= 12 meses
  const cabeSursis = penaMinimaMeses <= 12;

  // Transação penal (art. 76 Lei 9.099): pena máxima <= 24 meses
  const cabeTransacao = penaMaximaMeses <= 24;

  // Substituição (art. 44 CP): pena máxima <= 48 meses AND sem violência
  const cabeSubstituicao = penaMaximaMeses <= 48 && !envolveuViolencia;

  return { cabeAnpp, cabeSursis, cabeTransacao, cabeSubstituicao };
}
