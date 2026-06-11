"use client";

import type * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { rotuloMedida, STATUS_MEDIDA_LABEL, type StatusMedida } from "@/lib/mpu/medidas-taxonomia";
import type { MedidaMPURow } from "@/lib/db/schema/vvd";

const PROTEGIDO_LABEL: Record<string, string> = {
  ofendida: "Ofendida",
  familiares: "Familiares",
  testemunhas: "Testemunhas",
};
const MEIO_LABEL: Record<string, string> = {
  telefone: "Telefone",
  email: "E-mail",
  redes_sociais: "Redes sociais",
  mensagens: "Mensagens",
  interposta_pessoa: "Interposta pessoa",
};
const LUGAR_LABEL: Record<string, string> = {
  residencia_vitima: "Residência da vítima",
  trabalho_vitima: "Trabalho da vítima",
  outro: "Outro",
};

type Parametros = MedidaMPURow["parametros"];

function formatarDataBR(iso: string): string {
  const [a, m, d] = iso.split("-");
  return a && m && d ? `${d}/${m}/${a}` : iso;
}

/** Helper puro: traduz os parâmetros estruturados em chips legíveis. */
export function chipsDaMedida(parametros: Parametros): string[] {
  if (!parametros) return [];
  const chips: string[] = [];
  for (const p of parametros.protegidos ?? []) chips.push(PROTEGIDO_LABEL[p] ?? p);
  for (const m of parametros.meios ?? []) chips.push(MEIO_LABEL[m] ?? m);
  for (const l of parametros.lugares ?? []) chips.push(LUGAR_LABEL[l] ?? l);
  if (parametros.valor) chips.push(parametros.valor);
  return chips;
}

const STATUS_CLASS: Record<StatusMedida, string> = {
  ativa: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  suspensa: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
  cumprida: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  descumprida: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  revogada: "bg-neutral-100 text-neutral-500 line-through dark:bg-neutral-800",
};

export function MedidaMpuCard({
  medida,
  actions,
}: {
  medida: MedidaMPURow;
  actions?: React.ReactNode;
}) {
  const status = (medida.status ?? "ativa") as StatusMedida;
  const chips = chipsDaMedida(medida.parametros);
  return (
    <div className="rounded-lg border border-amber-200/60 bg-amber-50/30 p-3 dark:border-amber-900/40 dark:bg-amber-950/10">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
            {rotuloMedida(medida.codigo)}
          </p>
          {medida.artigo && (
            <p className="text-[11px] text-neutral-500">art. {medida.artigo}</p>
          )}
        </div>
        <Badge className={cn("shrink-0", STATUS_CLASS[status])}>
          {STATUS_MEDIDA_LABEL[status]}
        </Badge>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {typeof medida.distanciaMetros === "number" && (
          <span className="rounded bg-amber-200/50 px-1.5 py-0.5 text-[11px] text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
            {medida.distanciaMetros} m
          </span>
        )}
        {chips.map((c, i) => (
          <span
            key={`${i}-${c}`}
            className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
          >
            {c}
          </span>
        ))}
      </div>
      {medida.dataVencimento && (
        <p className="mt-1 text-[11px] text-neutral-500">Vence em {medida.dataVencimento}</p>
      )}
      {(medida.parametros?.alteracoes ?? []).map((alt, i) => (
        <p
          key={i}
          className="mt-1.5 rounded border-l-2 border-amber-400 bg-amber-100/40 px-2 py-1 text-[11px] text-amber-900 dark:bg-amber-900/20 dark:text-amber-200"
        >
          Modulada{alt.em ? ` em ${formatarDataBR(alt.em)}` : ""}: {alt.descricao}
        </p>
      ))}
      {actions && <div className="mt-2">{actions}</div>}
    </div>
  );
}
