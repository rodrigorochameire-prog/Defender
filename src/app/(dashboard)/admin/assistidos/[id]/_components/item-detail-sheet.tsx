"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ExternalLink, Pencil } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

type ItemSheetType = "processo" | "demanda";

interface ProcessoDetalhe {
  id: number;
  numeroAutos?: string | null;
  vara?: string | null;
  assunto?: string | null;
  area?: string | null;
  fase?: string | null;
  parteContraria?: string | null;
}

interface DemandaDetalhe {
  id: number;
  ato?: string | null;
  tipoAto?: string | null;
  prazo?: string | Date | null;
  status?: string | null;
  defensorNome?: string | null;
}

interface ItemDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: ItemSheetType | null;
  processo?: ProcessoDetalhe | null;
  demanda?: DemandaDetalhe | null;
  processoDemandas?: DemandaDetalhe[];
  processoAudiencias?: Array<{
    id: number;
    dataAudiencia?: string | Date | null;
    tipo?: string | null;
    local?: string | null;
  }>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2 items-start py-1 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
      <span className="w-20 text-[10px] text-neutral-400 uppercase tracking-wide shrink-0 pt-0.5">
        {label}
      </span>
      <span className="text-[11px] text-neutral-700 dark:text-neutral-300 break-words min-w-0">
        {children}
      </span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wide mb-1.5">
      {children}
    </p>
  );
}

function isPrazoVencido(prazo: string | Date | null | undefined): boolean {
  if (!prazo) return false;
  return new Date(prazo) < new Date();
}

function formatPrazo(prazo: string | Date | null | undefined): string | null {
  if (!prazo) return null;
  try {
    return format(new Date(prazo), "dd/MMM", { locale: ptBR });
  } catch {
    return null;
  }
}

// ─── Processo view ───────────────────────────────────────────────────────────

function ProcessoView({
  processo,
  processoDemandas = [],
  processoAudiencias = [],
}: {
  processo: ProcessoDetalhe;
  processoDemandas?: DemandaDetalhe[];
  processoAudiencias?: Array<{
    id: number;
    dataAudiencia?: string | Date | null;
    tipo?: string | null;
    local?: string | null;
  }>;
}) {
  return (
    <>
      <SheetHeader className="px-4 pt-4 pb-3 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <SheetTitle className="text-sm font-mono font-semibold text-neutral-800 dark:text-neutral-100 truncate flex-1">
            {processo.numeroAutos ?? "Sem número"}
          </SheetTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-neutral-400 hover:text-emerald-600 shrink-0"
            title="Editar processo"
            asChild
          >
            <Link href={`/admin/processos/${processo.id}/editar`} aria-label="Editar processo">
              <Pencil className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </SheetHeader>

      <div className="px-4 py-3 space-y-4 text-[11px]">
        {/* Campos principais */}
        <div>
          {processo.area && <FieldRow label="Área">{processo.area}</FieldRow>}
          {processo.fase && <FieldRow label="Fase">{processo.fase}</FieldRow>}
          {processo.vara && <FieldRow label="Vara">{processo.vara}</FieldRow>}
          {processo.assunto && (
            <FieldRow label="Assunto">{processo.assunto}</FieldRow>
          )}
          {processo.parteContraria && (
            <FieldRow label="Parte Contr.">{processo.parteContraria}</FieldRow>
          )}
        </div>

        {/* Demandas do processo */}
        {processoDemandas.length > 0 && (
          <div>
            <SectionTitle>Demandas</SectionTitle>
            <div>
              {processoDemandas.map((d) => {
                const vencido = isPrazoVencido(d.prazo);
                const prazoFormatado = formatPrazo(d.prazo);
                return (
                  <div
                    key={d.id}
                    className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 py-1.5 last:border-0"
                  >
                    <span className="text-[11px] text-neutral-700 dark:text-neutral-300 truncate mr-2">
                      {d.ato ?? d.tipoAto ?? "Demanda"}
                    </span>
                    {prazoFormatado && (
                      <span
                        className={cn(
                          "text-[10px] shrink-0 tabular-nums",
                          vencido
                            ? "text-rose-600 dark:text-rose-400 font-semibold"
                            : "text-neutral-400",
                        )}
                      >
                        {prazoFormatado}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Audiências do processo */}
        {processoAudiencias.length > 0 && (
          <div>
            <SectionTitle>Audiências</SectionTitle>
            <div>
              {processoAudiencias.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 py-1.5 last:border-0"
                >
                  <span className="text-[11px] text-neutral-700 dark:text-neutral-300 truncate mr-2">
                    {a.tipo ?? "Audiência"}
                  </span>
                  {a.dataAudiencia && (() => {
                    try {
                      return (
                        <span className="text-[10px] text-neutral-400 shrink-0 tabular-nums">
                          {format(new Date(a.dataAudiencia!), "dd/MMM HH'h'mm", { locale: ptBR })}
                        </span>
                      );
                    } catch {
                      return <span className="text-[10px] text-neutral-400 shrink-0">Data inválida</span>;
                    }
                  })()}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Botão principal */}
        <Button
          variant="outline"
          className="w-full h-8 text-[11px] gap-1.5 border-neutral-200 text-neutral-600 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/10"
          asChild
        >
          <Link href={`/admin/processos/${processo.id}`}>
            Abrir processo completo
            <ExternalLink className="h-3 w-3" />
          </Link>
        </Button>
      </div>
    </>
  );
}

// ─── Demanda view ────────────────────────────────────────────────────────────

function DemandaView({ demanda }: { demanda: DemandaDetalhe }) {
  const vencido = isPrazoVencido(demanda.prazo);
  const prazoFormatado = formatPrazo(demanda.prazo);
  const statusClean = demanda.status?.replace(/^\d+_/, "") ?? null;

  return (
    <>
      <SheetHeader className="px-4 pt-4 pb-3 border-b border-neutral-100 dark:border-neutral-800">
        <SheetTitle className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 truncate">
          {demanda.ato ?? demanda.tipoAto ?? "Demanda"}
        </SheetTitle>
      </SheetHeader>

      <div className="px-4 py-3 space-y-4 text-[11px]">
        <div>
          {statusClean && (
            <FieldRow label="Status">{statusClean}</FieldRow>
          )}
          {prazoFormatado && (
            <FieldRow label="Prazo">
              <span
                className={cn(
                  vencido ? "text-rose-600 dark:text-rose-400 font-semibold" : "",
                )}
              >
                {prazoFormatado}
                {vencido && (
                  <span className="ml-1 text-[10px] font-normal text-rose-500">
                    (vencido)
                  </span>
                )}
              </span>
            </FieldRow>
          )}
          {demanda.defensorNome && (
            <FieldRow label="Defensor">{demanda.defensorNome}</FieldRow>
          )}
        </div>

        <Button
          variant="outline"
          className="w-full h-8 text-[11px] gap-1.5 border-neutral-200 text-neutral-600 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/10"
          asChild
        >
          <Link href={`/admin/demandas/${demanda.id}`}>
            Abrir demanda completa
            <ExternalLink className="h-3 w-3" />
          </Link>
        </Button>
      </div>
    </>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function ItemDetailSheet({
  open,
  onOpenChange,
  type,
  processo,
  demanda,
  processoDemandas = [],
  processoAudiencias = [],
}: ItemDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-80 sm:w-96 p-0 overflow-y-auto">
        {type === "processo" && processo ? (
          <ProcessoView
            processo={processo}
            processoDemandas={processoDemandas}
            processoAudiencias={processoAudiencias}
          />
        ) : type === "demanda" && demanda ? (
          <DemandaView demanda={demanda} />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
