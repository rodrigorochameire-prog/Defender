interface RegistroCompletude {
  resultado?: string;
  assistidoCompareceu?: boolean;
  anotacoesGerais?: string;
  depoentes?: Array<unknown>;
}

export const COMPLETUDE_TOTAL = 5;

export function countCompletude(
  registro: RegistroCompletude,
  statusAudiencia?: string
): number {
  let count = 0;
  if (statusAudiencia) count++;
  if (registro.resultado) count++;
  if (registro.assistidoCompareceu !== undefined) count++;
  if (registro.anotacoesGerais) count++;
  if ((registro.depoentes?.length ?? 0) > 0) count++;
  return count;
}
