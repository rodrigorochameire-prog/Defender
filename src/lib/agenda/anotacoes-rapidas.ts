export type NotaRapida = {
  texto: string;
  timestamp: string;
  autorId: number;
};

/** Remove a nota cujo timestamp bate exatamente. Tolerante a null/undefined. */
export function removeNotaByTimestamp(
  notas: NotaRapida[] | null | undefined,
  timestamp: string,
): NotaRapida[] {
  return (notas ?? []).filter((n) => n.timestamp !== timestamp);
}

/** Retorna nova lista ordenada do timestamp mais recente para o mais antigo. */
export function ordenarNotasDesc(
  notas: NotaRapida[] | null | undefined,
): NotaRapida[] {
  return [...(notas ?? [])].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}
