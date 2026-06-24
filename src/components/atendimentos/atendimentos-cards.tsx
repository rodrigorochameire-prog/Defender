"use client";

// Visualização em Cards da pauta — grade responsiva de cartões verticais,
// agrupada por dia (mesma ordenação centrada em hoje da lista). Cada card abre
// o sheet de detalhe. Complementa a Lista (linhas densas) e a Agenda (mês).

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronRight,
  Clock,
  Copy,
  FileText,
  Link2,
  Scale,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  STATUS_CONFIG,
  SUBTIPO_CONFIG,
  type AtendimentoListItem,
} from "./config";
import { getAtribuicaoColors } from "@/lib/config/atribuicoes";
import { isPendente, rotuloDia, type GrupoDia } from "./agenda-helpers";

export function AtendimentosCards({
  porDia,
  onOpen,
}: {
  porDia: GrupoDia[];
  onOpen: (a: AtendimentoListItem) => void;
}) {
  return (
    <div className="space-y-5">
      {porDia.map(({ dia, itens }) => {
        const rotulo = rotuloDia(dia);
        return (
          <section key={dia}>
            <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              {rotulo ?? format(new Date(`${dia}T12:00:00`), "EEEE, d 'de' MMMM", { locale: ptBR })}
              <span className="ml-2 font-normal normal-case">· {itens.length}</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
              {itens.map((a) => (
                <CardAtendimento key={a.id} a={a} onClick={() => onOpen(a)} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function CardAtendimento({ a, onClick }: { a: AtendimentoListItem; onClick: () => void }) {
  const dt = new Date(a.dataRegistro);
  const status = STATUS_CONFIG[a.status ?? "agendado"] ?? STATUS_CONFIG.agendado;
  const subtipo = a.subtipo ? SUBTIPO_CONFIG[a.subtipo] : null;
  // Cor/badge da área derivam da atribuição do PROCESSO vinculado (mais fiel que
  // a.area, que costuma vir genérica "CRIMINAL"). Fallback: area do atendimento.
  const areaKey = a.processo?.atribuicao || a.processo?.area || a.area || null;
  const areaColors = areaKey ? getAtribuicaoColors(areaKey) : null;
  const areaHexColor = areaColors?.color ?? getAtribuicaoColors(null).color;
  const cancelado = a.status === "cancelado";
  const pendente = isPendente(a);
  const citados = (a.processosCitados ?? []).length;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "group/card relative flex flex-col rounded-xl border bg-white dark:bg-neutral-900 border-neutral-200/70 dark:border-neutral-800 p-3 pl-3.5 cursor-pointer outline-none",
        "transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 hover:border-neutral-300 dark:hover:border-neutral-700 focus-visible:ring-2 focus-visible:ring-emerald-400/50",
        cancelado && "opacity-55",
      )}
    >
      {/* Barra de acento à esquerda — cor da área (ou âmbar quando pendente) */}
      <span
        className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-full"
        style={{ backgroundColor: pendente ? "#f59e0b" : areaHexColor }}
      />

      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="font-mono text-sm font-semibold text-foreground/90 inline-flex items-center gap-1.5">
          {format(dt, "HH:mm")}
          <span className="text-[10px] font-normal text-muted-foreground normal-case">
            {format(dt, "dd/MM")}
          </span>
        </span>
        {pendente ? (
          <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-px text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            <Clock className="w-2.5 h-2.5" /> registrar
          </span>
        ) : (
          <span className={cn("rounded px-1.5 py-px text-[10px] font-medium", status.badge)}>
            {status.label}
          </span>
        )}
      </div>

      <p className={cn("text-sm font-semibold text-foreground/90 leading-snug line-clamp-2", cancelado && "line-through")}>
        {a.assistido?.nome ?? "Assistido não identificado"}
      </p>

      <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
        {areaColors && (
          <span className={cn("rounded px-1.5 py-px text-[10px] font-medium", areaColors.bgSolid, areaColors.text)}>
            {areaColors.shortLabel}
          </span>
        )}
        {subtipo && (
          <span className={cn("rounded px-1.5 py-px text-[10px] font-medium", subtipo.badge)}>{subtipo.label}</span>
        )}
      </div>

      <div className="flex items-center gap-3 mt-2.5 pt-2 border-t border-neutral-100 dark:border-neutral-800/70 text-[10px] text-muted-foreground flex-wrap">
        {/* Processo primeiro — copiável, com tooltip */}
        {a.processo?.numeroAutos ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard?.writeText(a.processo!.numeroAutos!);
              toast.success("Nº do processo copiado");
            }}
            className="font-mono inline-flex items-center gap-1 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
            title="Processo vinculado — clique para copiar o nº"
            aria-label={`Copiar processo ${a.processo.numeroAutos}`}
          >
            <Scale className="w-3 h-3" /> {a.processo.numeroAutos}
            <Copy className="w-2.5 h-2.5 opacity-40" />
          </button>
        ) : citados > 0 ? (
          <span className="inline-flex items-center gap-1" title="Processos citados nas anotações da recepção">
            <Link2 className="w-3 h-3" /> {citados} citado{citados > 1 ? "s" : ""}
          </span>
        ) : null}
        {/* SOLAR depois do processo */}
        {a.numeroSolar && (
          <span className="font-mono inline-flex items-center gap-1" title="Número SOLAR">
            <FileText className="w-3 h-3" /> {a.numeroSolar}
          </span>
        )}
        {a.dossieAtendimento && (
          <span
            className="inline-flex items-center text-violet-500 dark:text-violet-400"
            title={a.dossieAtendimento.fonte === "skill" ? "Dossiê preparado" : "Contexto preparado"}
            aria-label={a.dossieAtendimento.fonte === "skill" ? "Dossiê preparado" : "Contexto preparado"}
          >
            <Sparkles className="w-3 h-3" />
          </span>
        )}
        <ChevronRight className="w-3.5 h-3.5 text-neutral-300 dark:text-neutral-600 ml-auto opacity-0 group-hover/card:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}
