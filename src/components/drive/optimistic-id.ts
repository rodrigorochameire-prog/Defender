/**
 * Fábrica de ids otimistas para itens ainda não persistidos (anotações, etc.).
 *
 * Ids negativos, monotônicos e únicos por instância. Substitui `-(Date.now())`,
 * que colidia quando dois itens eram criados no mesmo milissegundo — gerando
 * chaves React duplicadas (ex.: dois traços de caneta no mesmo ms).
 */
export function createOptimisticIdFactory(): () => number {
  let next = -1;
  return () => next--;
}
