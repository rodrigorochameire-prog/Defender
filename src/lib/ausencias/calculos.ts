export function diasInclusive(inicio: string, fim: string): number {
  if (fim < inicio) return 0;
  const a = new Date(`${inicio}T00:00:00Z`).getTime();
  const b = new Date(`${fim}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000) + 1;
}
