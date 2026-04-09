"use client";

import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Sparkles,
  Users,
  FileText,
  RefreshCcw,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronRight,
  ArrowDownToLine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Depoente } from "../types";

interface TabPreparacaoProps {
  audienciaId: number | null;
  evento: any;
  /** Called with the synthesized depoentes when user clicks "Importar para Depoentes". */
  onImportarParaDepoentes?: (depoentes: Depoente[]) => void;
}

const TIPO_LABEL: Record<string, string> = {
  DEFESA: "Testemunha de Defesa",
  ACUSACAO: "Testemunha de Acusação",
  VITIMA: "Vítima",
  INFORMANTE: "Informante",
  PERITO: "Perito",
  COMUM: "Testemunha",
};

const TIPO_BADGE: Record<string, string> = {
  DEFESA: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
  ACUSACAO: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800",
  VITIMA: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800",
  INFORMANTE: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-800",
  PERITO: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-800",
  COMUM: "bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-900 dark:text-neutral-400 dark:border-neutral-800",
};

const tipoToDepoenteTipo = (
  tipo: string,
): Depoente["tipo"] => {
  switch (tipo) {
    case "DEFESA":
    case "ACUSACAO":
    case "COMUM":
      return "testemunha";
    case "VITIMA":
      return "vitima";
    case "INFORMANTE":
      return "informante";
    case "PERITO":
      return "perito";
    default:
      return "testemunha";
  }
};

export function TabPreparacao({
  audienciaId,
  evento,
  onImportarParaDepoentes,
}: TabPreparacaoProps) {
  const enabled = typeof audienciaId === "number";

  const { data, isLoading, refetch } = trpc.audiencias.previewPreparacao.useQuery(
    { audienciaId: audienciaId ?? 0 },
    { enabled, refetchOnWindowFocus: false, retry: false },
  );

  const novosCount = data?.depoentes.filter((d) => d.status === "NOVO").length ?? 0;
  const existentesCount = data?.depoentes.filter((d) => d.status === "JA_EXISTENTE").length ?? 0;

  const prepararMutation = trpc.audiencias.prepararAudiencia.useMutation({
    onSuccess: (res) => {
      const inserted = res.testemunhas.filter((t) => t.status === "ARROLADA").length;
      const existing = res.testemunhas.length - inserted;
      toast.success(
        `Preparação concluída — ${inserted} novo(s), ${existing} já existente(s)${
          res.pdfPath ? " · PDF gerado" : ""
        }`,
      );
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Falha ao preparar audiência");
    },
  });

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (key: string) =>
    setExpanded((s) => ({ ...s, [key]: !s[key] }));

  const grouped = useMemo(() => {
    const groups: Record<string, NonNullable<typeof data>["depoentes"]> = {};
    if (!data) return groups;
    for (const t of data.depoentes) {
      const key = t.tipo ?? "COMUM";
      (groups[key] ??= []).push(t);
    }
    return groups;
  }, [data]);

  if (!enabled) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center">
        <Users className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          Preparação indisponível
        </p>
        <p className="text-xs text-neutral-500">
          Esta audiência precisa estar salva no banco para usar o pipeline de preparação.
        </p>
      </div>
    );
  }

  const handleImportar = () => {
    if (!data || data.total === 0) return;
    const depoentes: Depoente[] = data.depoentes.map((t, i) => ({
      id: `prep-${i}-${t.nome}`,
      nome: t.nome,
      tipo: tipoToDepoenteTipo(t.tipo ?? "COMUM"),
      lado: (t.tipo === "ACUSACAO" ? "acusacao" : t.tipo === "DEFESA" ? "defesa" : undefined) as Depoente["lado"],
      intimado: false,
      presente: false,
      statusIntimacao: "pendente" as const,
      jaOuvido: (t.resumo ? "delegacia" : "nenhum") as Depoente["jaOuvido"],
      depoimentoDelegacia: t.resumo ?? "",
      depoimentoAnterior: "",
      pontosFortes: t.pontosFavoraveis ?? "",
      pontosFracos: t.pontosDesfavoraveis ?? "",
      estrategiaInquiricao: t.perguntasSugeridas ?? "",
      perguntasDefesa: "",
      depoimentoLiteral: "",
      analisePercepcoes: t.observacoes ?? "",
    }));
    onImportarParaDepoentes?.(depoentes);
    toast.success(`${depoentes.length} depoente(s) importado(s) com relatos e pontos fortes/fracos`);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Header card */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-neutral-900 dark:bg-white flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-white dark:text-neutral-900" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Preparação da Audiência <span className="text-[10px] font-normal text-neutral-500">(preview · dry-run)</span>
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                {data
                  ? `${data.total} pessoa(s) · ${novosCount} novo(s) · ${existentesCount} já no banco`
                  : "Calculando preview..."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs cursor-pointer"
              disabled={!data || data.total === 0}
              onClick={handleImportar}
            >
              <ArrowDownToLine className="w-3.5 h-3.5 mr-1.5" />
              Importar p/ Depoentes
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 cursor-pointer"
              disabled={prepararMutation.isPending || !data || data.total === 0}
              onClick={() =>
                prepararMutation.mutate({ audienciaId: audienciaId! })
              }
            >
              {prepararMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Persistindo...
                </>
              ) : existentesCount > 0 && novosCount === 0 ? (
                <>
                  <RefreshCcw className="w-3.5 h-3.5 mr-1.5" />
                  Re-persistir
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Persistir{novosCount > 0 ? ` (${novosCount} novo${novosCount > 1 ? "s" : ""})` : ""}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* PDF link if available */}
        {prepararMutation.data?.pdfPath && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/20 px-3 py-2">
            <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-500 shrink-0" />
            <p className="text-xs text-emerald-800 dark:text-emerald-300 truncate flex-1">
              PDF salvo na pasta do assistido:{" "}
              <span className="font-mono text-[11px]">
                {prepararMutation.data.pdfPath.split("/").pop()}
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-12 text-center">
          <Loader2 className="w-6 h-6 text-neutral-400 mx-auto mb-2 animate-spin" />
          <p className="text-xs text-neutral-500">Carregando preparação...</p>
        </div>
      )}

      {/* Empty state — no analysis at all */}
      {!isLoading && data && data.total === 0 && (
        <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 p-8 text-center">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
            Nenhum depoente disponível para preparar
          </p>
          <p className="text-xs text-neutral-500 max-w-md mx-auto">
            A análise do processo ainda não tem depoentes extraíveis. Rode a skill
            <code className="px-1 mx-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-[10px]">preparar-audiencia</code>
            no Cowork antes de tentar persistir.
          </p>
        </div>
      )}

      {/* Grouped list */}
      {!isLoading && data && data.total > 0 && (
        <div className="space-y-4">
          {Object.entries(grouped).map(([tipo, lista]) => (
            <div key={tipo} className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <span
                  className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                    TIPO_BADGE[tipo] ?? TIPO_BADGE.COMUM,
                  )}
                >
                  {TIPO_LABEL[tipo] ?? tipo}
                </span>
                <span className="text-[10px] text-neutral-500">{lista.length}</span>
              </div>

              <div className="space-y-1.5">
                {lista.map((t, idx) => {
                  const rowKey = `${tipo}-${idx}-${t.nome}`;
                  const isOpen = !!expanded[rowKey];
                  const hasRich =
                    !!(t.endereco || t.resumo || t.pontosFavoraveis ||
                       t.pontosDesfavoraveis || t.perguntasSugeridas || t.observacoes);
                  const isNovo = t.status === "NOVO";

                  return (
                    <div
                      key={rowKey}
                      className={cn(
                        "rounded-lg border bg-white dark:bg-neutral-950 overflow-hidden",
                        isNovo
                          ? "border-emerald-300 dark:border-emerald-800"
                          : "border-neutral-200 dark:border-neutral-800",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => hasRich && toggle(rowKey)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 text-left",
                          hasRich && "hover:bg-neutral-50 dark:hover:bg-neutral-900 cursor-pointer",
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                            {t.nome}
                          </p>
                          {t.endereco && (
                            <p className="text-[10px] text-neutral-500 truncate mt-0.5">
                              {t.endereco}
                            </p>
                          )}
                        </div>

                        {/* Status badge */}
                        {isNovo ? (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1.5 py-0 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30"
                          >
                            novo
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1.5 py-0 text-neutral-500 border-neutral-200 dark:border-neutral-800"
                          >
                            já no banco
                          </Badge>
                        )}

                        {hasRich ? (
                          isOpen ? (
                            <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0" />
                          )
                        ) : null}
                      </button>

                      {isOpen && hasRich && (
                        <div className="border-t border-neutral-200 dark:border-neutral-800 px-3 py-3 space-y-2.5 bg-neutral-50/50 dark:bg-neutral-900/30">
                          {t.resumo && (
                            <Field label="Resumo" value={t.resumo} />
                          )}
                          {t.pontosFavoraveis && (
                            <Field
                              label="Pontos favoráveis"
                              value={t.pontosFavoraveis}
                              tone="positive"
                            />
                          )}
                          {t.pontosDesfavoraveis && (
                            <Field
                              label="Pontos desfavoráveis"
                              value={t.pontosDesfavoraveis}
                              tone="negative"
                            />
                          )}
                          {t.perguntasSugeridas && (
                            <Field label="Perguntas sugeridas" value={t.perguntasSugeridas} />
                          )}
                          {t.observacoes && (
                            <Field label="Observações" value={t.observacoes} />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
}) {
  return (
    <div>
      <p
        className={cn(
          "text-[9px] font-semibold uppercase tracking-wide mb-1",
          tone === "positive"
            ? "text-emerald-600 dark:text-emerald-500"
            : tone === "negative"
              ? "text-rose-600 dark:text-rose-500"
              : "text-neutral-500",
        )}
      >
        {label}
      </p>
      <p className="text-xs text-neutral-700 dark:text-neutral-300 whitespace-pre-line leading-relaxed">
        {value}
      </p>
    </div>
  );
}
