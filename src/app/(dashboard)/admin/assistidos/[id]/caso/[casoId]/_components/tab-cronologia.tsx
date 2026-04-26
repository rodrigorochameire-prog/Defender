"use client";

interface Props { casoId: number; }

export function TabCronologia({ casoId }: Props) {
  return (
    <div className="p-4">
      <h3 className="text-base font-semibold mb-3">Cronologia do caso</h3>
      <p className="text-sm italic text-neutral-400">
        Em implementação (X-δ) — vai agregar marcos, prisões e cautelares de todos os processos do caso #{casoId}.
      </p>
    </div>
  );
}
