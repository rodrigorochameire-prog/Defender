"use client";

import { PecaItem, type PecaItemData } from "./PecaItem";

const GROUP_LABELS: Record<string, string> = {
  acusacao: "Acusação",
  decisoes: "Decisões Judiciais",
  laudos: "Laudos Periciais",
  defesa: "Defesa",
  investigacao: "Investigação",
  outros: "Outros",
};

interface PecaGroupProps {
  groupKey: string;
  sections: PecaItemData[];
  activeId: number | null;
  onSelect: (id: number) => void;
}

export function PecaGroup({ groupKey, sections, activeId, onSelect }: PecaGroupProps) {
  if (sections.length === 0) return null;
  const label = GROUP_LABELS[groupKey] || groupKey;

  return (
    <div className="mb-3">
      <h4 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 px-3 mb-1">
        {label}
      </h4>
      <div className="space-y-0.5">
        {sections.map((s) => (
          <PecaItem
            key={s.id}
            peca={s}
            active={activeId === s.id}
            onClick={() => onSelect(s.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface DepoimentoGroupProps {
  depoimentos: { pessoa: string; sections: PecaItemData[] }[];
  activeId: number | null;
  onSelect: (id: number) => void;
}

const FASE_LABELS: Record<string, string> = {
  inquerito: "Delegacia",
  instrucao: "Juízo",
  plenario: "Plenário",
};

export function DepoimentoGroup({ depoimentos, activeId, onSelect }: DepoimentoGroupProps) {
  if (depoimentos.length === 0) return null;

  return (
    <div className="mb-3">
      <h4 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 px-3 mb-1">
        Depoimentos
      </h4>
      <div className="space-y-2">
        {depoimentos.map((dp) => (
          <div key={dp.pessoa}>
            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 px-3 py-1 uppercase tracking-wide">
              {dp.pessoa}
            </div>
            <div className="space-y-0.5">
              {dp.sections.map((s) => {
                const fase = (s as any).metadata?.fase as string | undefined;
                const displayTitulo = fase
                  ? `${FASE_LABELS[fase] || fase}${s.titulo ? ` — ${s.titulo}` : ""}`
                  : s.titulo;
                return (
                  <PecaItem
                    key={s.id}
                    peca={{ ...s, titulo: displayTitulo }}
                    active={activeId === s.id}
                    onClick={() => onSelect(s.id)}
                    compact
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
