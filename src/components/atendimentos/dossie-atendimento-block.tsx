"use client";

// Bloco do dossiê de atendimento — espelha o padrão visual do DossieV2Block
// da agenda (listas com marcador, blocos com ring, badges discretos).
// Fonte "ombuds" = contexto automático; "skill" = enriquecido pelos autos (PJe).

import { format } from "date-fns";
import { AlertTriangle, FileQuestion, ListChecks, MessageCircleQuestion, ShieldAlert } from "lucide-react";
import type { DossieAtendimento } from "./config";

function Lista({
  titulo,
  itens,
  icone: Icone,
  tom = "neutro",
}: {
  titulo: string;
  itens?: string[];
  icone?: React.ElementType;
  tom?: "neutro" | "alerta";
}) {
  if (!itens || itens.length === 0) return null;
  return (
    <div
      className={
        tom === "alerta"
          ? "rounded-lg border border-amber-200/70 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-900/10 px-3 py-2"
          : ""
      }
    >
      <h5 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1">
        {Icone && <Icone className="w-3 h-3" />} {titulo}
      </h5>
      <ul className="space-y-1">
        {itens.map((item, i) => (
          <li key={i} className="text-sm text-foreground/85 flex gap-1.5">
            <span className="text-neutral-400 shrink-0">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DossieAtendimentoBlock({ dossie }: { dossie: DossieAtendimento }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span
          className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${
            dossie.fonte === "skill"
              ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
              : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
          }`}
        >
          {dossie.fonte === "skill" ? "Dossiê dos autos (PJe)" : "Contexto OMBUDS"}
        </span>
        {dossie.gerado_em && (
          <span className="text-[10px] text-muted-foreground">
            gerado em {format(new Date(dossie.gerado_em), "dd/MM/yyyy HH:mm")}
          </span>
        )}
      </div>

      {dossie.objetivo && (
        <blockquote className="border-l-2 border-neutral-300 dark:border-neutral-700 pl-3 text-sm italic text-foreground/80">
          {dossie.objetivo}
        </blockquote>
      )}

      {dossie.resumo && dossie.resumo.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {dossie.resumo.map((r, i) => (
            <span
              key={i}
              className="rounded-md bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-[11px] text-neutral-600 dark:text-neutral-300"
            >
              {r}
            </span>
          ))}
        </div>
      )}

      <Lista titulo="Alertas" itens={dossie.alertas} icone={AlertTriangle} tom="alerta" />
      <Lista titulo="Medidas vigentes" itens={dossie.medidas_vigentes} icone={ShieldAlert} tom="alerta" />

      {dossie.situacao_processual && dossie.situacao_processual.length > 0 && (
        <div>
          <h5 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
            Situação processual
          </h5>
          <div className="space-y-1.5">
            {dossie.situacao_processual.map((p) => (
              <div
                key={p.cnj}
                className="rounded-lg ring-1 ring-neutral-200/70 dark:ring-neutral-800 px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-mono text-xs text-foreground/90">{p.cnj}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {[p.area, p.fase, p.situacao].filter(Boolean).join(" · ")}
                  </span>
                </div>
                {(p.proximo_evento || p.observacao) && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {p.proximo_evento && (
                      <span className="text-sky-600 dark:text-sky-400 font-medium">
                        {p.proximo_evento}
                      </span>
                    )}
                    {p.proximo_evento && p.observacao && " — "}
                    {p.observacao}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <Lista titulo="Orientações ao assistido" itens={dossie.orientacoes} icone={ListChecks} />
      <Lista titulo="Perguntas a fazer" itens={dossie.perguntas} icone={MessageCircleQuestion} />
      <Lista titulo="Documentos a solicitar" itens={dossie.documentos_solicitar} icone={FileQuestion} />
      <Lista titulo="Providências pós-atendimento" itens={dossie.providencias} icone={ListChecks} />
      <Lista titulo="Histórico relevante" itens={dossie.historico_relevante} />
    </div>
  );
}
