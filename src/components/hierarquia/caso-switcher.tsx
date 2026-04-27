"use client";

interface Props { assistidoId: number; activeCasoId: number; }

export function CaseSwitcher({ activeCasoId }: Props) {
  return <span className="text-sm">Caso #{activeCasoId}</span>;
}
