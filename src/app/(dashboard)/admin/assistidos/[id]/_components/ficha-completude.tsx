"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

/** Campos que compõem uma ficha "completa" o suficiente para peticionar. */
const CAMPOS: { key: string; label: string }[] = [
  { key: "cpf", label: "CPF" },
  { key: "rg", label: "RG" },
  { key: "dataNascimento", label: "nascimento" },
  { key: "nomeMae", label: "mãe" },
  { key: "endereco", label: "endereço" },
  { key: "telefone", label: "telefone" },
  { key: "naturalidade", label: "naturalidade" },
];

/**
 * Medidor de completude da ficha — conta campos-chave preenchidos e aponta os
 * que faltam (qualidade de dado p/ petições). Linka para a edição.
 */
export function FichaCompletude({
  assistidoId,
  dados,
}: {
  assistidoId: number;
  dados: Record<string, unknown>;
}) {
  const preenchidos = CAMPOS.filter((c) => {
    const v = dados[c.key];
    return v !== null && v !== undefined && String(v).trim() !== "";
  });
  const faltam = CAMPOS.filter((c) => !preenchidos.includes(c));
  const pct = Math.round((preenchidos.length / CAMPOS.length) * 100);
  if (pct === 100) return null; // ficha completa → não polui

  const tone =
    pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-rose-500";

  return (
    <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[10px] uppercase tracking-wider text-neutral-400">Ficha {pct}%</span>
        <Link
          href={`/admin/assistidos/${assistidoId}/editar`}
          className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
        >
          completar
        </Link>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-white/[0.06]">
        <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${pct}%` }} />
      </div>
      {faltam.length > 0 && (
        <p className="mt-1 text-[10px] text-neutral-400">
          falta: {faltam.map((f) => f.label).join(", ")}
        </p>
      )}
    </div>
  );
}
