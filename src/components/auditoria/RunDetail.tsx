"use client";

import { ArrowLeft, History } from "lucide-react";
import type { RunRow } from "./RunsList";

export interface AuditChangeRow {
  id?: number;
  entity_type: string;
  entity_id: number;
  action: string;
  changes?: Record<string, { old?: unknown; new?: unknown }> | null;
  user_name?: string | null;
  created_at?: string | null;
  metadata?: Record<string, unknown> | null;
}

export function RunDetail({
  run,
  changes,
  onBack,
}: {
  run: RunRow | null;
  changes: AuditChangeRow[];
  onBack: () => void;
}) {
  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-emerald-600 transition-colors mb-3 cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Voltar
      </button>

      {run && (
        <div className="mb-4 p-3 rounded-lg border border-zinc-200 bg-zinc-50">
          <p className="text-sm font-medium text-zinc-800">{run.skill}</p>
          <p className="text-xs text-zinc-500">
            Execução #{run.id} · {run.status}
            {run.quem ? ` · por ${run.quem}` : ""}
          </p>
        </div>
      )}

      <div className="flex items-center gap-1.5 mb-2">
        <History className="w-3.5 h-3.5 text-zinc-500" />
        <h3 className="text-xs font-medium text-zinc-600 uppercase tracking-wide">
          Alterações ({changes.length})
        </h3>
      </div>

      {changes.length === 0 ? (
        <p className="text-sm text-zinc-500 py-6 text-center">
          Nenhuma alteração registrada para esta execução
        </p>
      ) : (
        <ul className="divide-y divide-zinc-200">
          {changes.map((c, idx) => (
            <li key={c.id ?? idx} className="py-2 px-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-800">
                  {c.entity_type} #{c.entity_id}
                </span>
                <span className="text-xs text-zinc-500">
                  {c.action}
                  {c.user_name ? ` · ${c.user_name}` : ""}
                  {c.created_at ? ` · ${c.created_at.slice(0, 16).replace("T", " ")}` : ""}
                </span>
              </div>
              {c.changes && Object.keys(c.changes).length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {Object.entries(c.changes).map(([field, diff]) => (
                    <li key={field} className="text-xs text-zinc-500">
                      <span className="font-mono">{field}</span>:{" "}
                      <span className="line-through text-zinc-400">
                        {JSON.stringify(diff?.old)}
                      </span>{" "}
                      → <span className="text-emerald-600">{JSON.stringify(diff?.new)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
