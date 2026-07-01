"use client";

import { ClipboardList } from "lucide-react";

const SKILL_LABEL: Record<string, string> = {
  "varredura-triagem": "Varredura de triagem",
  "pje-intimacoes-import": "Importação de intimações",
};

const STATUS_LABEL: Record<string, string> = {
  completed: "concluído",
  failed: "falhou",
  pending: "pendente",
  running: "em execução",
};

export interface RunRow {
  id: number;
  skill: string;
  status: string;
  quem?: string | null;
  completedAt?: string | Date | null;
  startedAt?: string | Date | null;
  createdAt?: string | Date | null;
  createdBy?: number | null;
  resultado?: Record<string, unknown> | null;
}

function fmtDate(v?: string | Date | null): string {
  if (!v) return "";
  const iso = typeof v === "string" ? v : v.toISOString();
  return iso.slice(0, 16).replace("T", " ");
}

export function RunsList({
  runs,
  onOpen,
}: {
  runs: RunRow[];
  onOpen: (id: number) => void;
}) {
  if (runs.length === 0) {
    return (
      <div className="text-center py-12">
        <ClipboardList className="w-10 h-10 mx-auto text-zinc-400 mb-3" />
        <p className="text-sm text-zinc-500">Nenhuma execução registrada</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-zinc-200">
      {runs.map((r) => {
        const p = (r.resultado?.parsed ?? {}) as Record<string, number>;
        return (
          <li
            key={r.id}
            className="flex items-center justify-between py-2 px-1 hover:bg-zinc-50 cursor-pointer transition-colors"
            onClick={() => onOpen(r.id)}
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-800">
                {SKILL_LABEL[r.skill] ?? r.skill}
              </p>
              <p className="text-xs text-zinc-500">
                <span>{r.quem ?? "—"}</span> ·{" "}
                <span>{fmtDate(r.completedAt ?? r.startedAt ?? r.createdAt)}</span>{" "}
                · <span>{STATUS_LABEL[r.status] ?? r.status}</span>
              </p>
            </div>
            {typeof p.total === "number" && (
              <span className="text-xs text-zinc-500 shrink-0">
                {p.total} itens
                {typeof p.ok === "number" ? ` · ${p.ok} ok` : ""}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
