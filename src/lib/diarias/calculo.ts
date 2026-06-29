/** Valor total em centavos = quantidade (pode ser meia-diária) × valor unitário. */
export function totalCents(quantidade: number, valorUnitarioCents: number): number {
  return Math.round(quantidade * valorUnitarioCents);
}
