"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  RefreshCw,
  Check,
  X,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Plus,
  Minus,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { LEGISLACOES } from "@/config/legislacao";
import { trpc } from "@/lib/trpc/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Step = "select" | "scraping" | "review";

type ScrapeStatus = "pending" | "downloading" | "analyzing" | "done" | "error";

interface LawProgress {
  id: string;
  status: ScrapeStatus;
  hasChanges: boolean;
}

interface DiffLine {
  artigo: string;
  oldText: string;
  newText: string;
}

interface LawDiff {
  lawId: string;
  diffs: DiffLine[];
}

// ---------------------------------------------------------------------------
// Mock data for step 3
// ---------------------------------------------------------------------------

const MOCK_DIFFS: LawDiff[] = [
  {
    lawId: "codigo-penal",
    diffs: [
      {
        artigo: "Art. 121, \u00a7 2\u00ba, IX",
        oldText:
          "contra a mulher por raz\u00f5es da condi\u00e7\u00e3o de sexo feminino",
        newText:
          "contra a mulher por raz\u00f5es da condi\u00e7\u00e3o do sexo feminino ou em contexto de violencia domestica e familiar",
      },
      {
        artigo: "Art. 171, \u00a7 5\u00ba",
        oldText: "",
        newText:
          "Somente se procede mediante representa\u00e7\u00e3o, salvo se a vitima for a Administra\u00e7\u00e3o Publica, direta ou indireta, crian\u00e7a ou adolescente, pessoa com deficiencia mental, maior de 70 anos ou incapaz.",
      },
    ],
  },
  {
    lawId: "cpp",
    diffs: [
      {
        artigo: "Art. 311",
        oldText:
          "Em qualquer fase da investiga\u00e7\u00e3o policial ou do processo penal, caber\u00e1 a pris\u00e3o preventiva decretada pelo juiz, de oficio, se no curso da a\u00e7\u00e3o penal",
        newText:
          "Em qualquer fase da investiga\u00e7\u00e3o policial ou do processo penal, caber\u00e1 a pris\u00e3o preventiva decretada pelo juiz, a requerimento do Ministerio Publico, do querelante ou do assistente, ou por representa\u00e7\u00e3o da autoridade policial",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface UpdateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UpdateModal({ open, onOpenChange }: UpdateModalProps) {
  const [step, setStep] = useState<Step>("select");
  const [selectedLaws, setSelectedLaws] = useState<Set<string>>(new Set());
  const [lawProgress, setLawProgress] = useState<LawProgress[]>([]);
  const [expandedDiffs, setExpandedDiffs] = useState<Set<string>>(new Set());
  const abortRef = useRef(false);

  const registrarAlteracao = trpc.legislacao.registrarAlteracao.useMutation();

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep("select");
      setSelectedLaws(new Set());
      setLawProgress([]);
      setExpandedDiffs(new Set());
      abortRef.current = false;
    }
  }, [open]);

  // ------ Step 1 handlers ------

  const toggleLaw = useCallback((id: string) => {
    setSelectedLaws((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedLaws((prev) => {
      if (prev.size === LEGISLACOES.length) return new Set();
      return new Set(LEGISLACOES.map((l) => l.id));
    });
  }, []);

  // ------ Step 2: simulate scraping ------

  const startScraping = useCallback(async () => {
    const ids = Array.from(selectedLaws);
    const initial: LawProgress[] = ids.map((id) => ({
      id,
      status: "pending",
      hasChanges: false,
    }));
    setLawProgress(initial);
    setStep("scraping");
    abortRef.current = false;

    for (let i = 0; i < ids.length; i++) {
      if (abortRef.current) return;

      // downloading
      setLawProgress((prev) =>
        prev.map((lp, idx) =>
          idx === i ? { ...lp, status: "downloading" } : lp
        )
      );
      await delay(600 + Math.random() * 800);

      if (abortRef.current) return;

      // analyzing
      setLawProgress((prev) =>
        prev.map((lp, idx) =>
          idx === i ? { ...lp, status: "analyzing" } : lp
        )
      );
      await delay(400 + Math.random() * 600);

      if (abortRef.current) return;

      // Simulate occasional errors (every ~7th law)
      const isError = i > 0 && i % 7 === 0;
      const hasChanges = MOCK_DIFFS.some((d) => d.lawId === ids[i]);

      setLawProgress((prev) =>
        prev.map((lp, idx) =>
          idx === i
            ? { ...lp, status: isError ? "error" : "done", hasChanges }
            : lp
        )
      );
    }
  }, [selectedLaws]);

  // ------ Derived ------

  const completedCount = lawProgress.filter(
    (lp) => lp.status === "done" || lp.status === "error"
  ).length;
  const scrapingDone = lawProgress.length > 0 && completedCount === lawProgress.length;
  const changedCount = lawProgress.filter((lp) => lp.hasChanges).length;
  const errorCount = lawProgress.filter((lp) => lp.status === "error").length;
  const progressPercent =
    lawProgress.length > 0 ? (completedCount / lawProgress.length) * 100 : 0;

  const relevantDiffs = MOCK_DIFFS.filter((d) => selectedLaws.has(d.lawId));

  // ------ Step 3: apply — persist diffs to leis_versoes ------

  const applyChanges = useCallback(async () => {
    const promises = relevantDiffs.flatMap((ld) =>
      ld.diffs.map((diff) =>
        registrarAlteracao.mutateAsync({
          leiId: ld.lawId,
          artigoId: diff.artigo,
          textoAnterior: diff.oldText || undefined,
          textoNovo: diff.newText,
        })
      )
    );
    await Promise.allSettled(promises);
    onOpenChange(false);
  }, [onOpenChange, relevantDiffs, registrarAlteracao]);

  // ------ Render helpers ------

  const getLawMeta = (id: string) => LEGISLACOES.find((l) => l.id === id);

  const toggleDiffExpand = (lawId: string) => {
    setExpandedDiffs((prev) => {
      const next = new Set(prev);
      if (next.has(lawId)) next.delete(lawId);
      else next.add(lawId);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-emerald-500" />
            Atualizar Legisla\u00e7\u00e3o
          </DialogTitle>
          <DialogDescription>
            {step === "select" &&
              "Selecione as leis que deseja verificar por atualiza\u00e7\u00f5es."}
            {step === "scraping" && "Baixando e analisando as leis selecionadas..."}
            {step === "review" && "Revise as altera\u00e7\u00f5es encontradas."}
          </DialogDescription>
        </DialogHeader>

        {/* ============================================================ */}
        {/* STEP 1 — Select laws                                         */}
        {/* ============================================================ */}
        {step === "select" && (
          <>
            <div className="flex items-center gap-2 px-1 pb-2 border-b border-neutral-200 dark:border-border">
              <Checkbox
                id="select-all"
                checked={selectedLaws.size === LEGISLACOES.length}
                onCheckedChange={toggleAll}
              />
              <label
                htmlFor="select-all"
                className="text-sm font-medium cursor-pointer select-none"
              >
                Selecionar Todas
              </label>
              <Badge variant="secondary" className="ml-auto">
                {selectedLaws.size}/{LEGISLACOES.length}
              </Badge>
            </div>

            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-1 py-2">
                {LEGISLACOES.map((law) => (
                  <label
                    key={law.id}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 cursor-pointer transition-colors",
                      "hover:bg-neutral-100 dark:hover:bg-muted/50",
                      selectedLaws.has(law.id) &&
                        "bg-neutral-100 dark:bg-muted/50"
                    )}
                  >
                    <Checkbox
                      checked={selectedLaws.has(law.id)}
                      onCheckedChange={() => toggleLaw(law.id)}
                    />
                    <div
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: law.cor }}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium truncate block">
                        {law.nome}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {law.nomeAbreviado} &middot; {law.referencia}
                      </span>
                    </div>
                    {law.dataUltimaAtualizacao && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {law.dataUltimaAtualizacao}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </ScrollArea>

            <div className="flex justify-end gap-2 pt-4 border-t border-neutral-200 dark:border-border">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                disabled={selectedLaws.size === 0}
                onClick={startScraping}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Iniciar Atualiza\u00e7\u00e3o
              </Button>
            </div>
          </>
        )}

        {/* ============================================================ */}
        {/* STEP 2 — Scraping progress                                   */}
        {/* ============================================================ */}
        {step === "scraping" && (
          <>
            <div className="space-y-2 pb-3">
              <Progress value={progressPercent} className="h-2" />
              <p className="text-xs text-muted-foreground text-right">
                {completedCount}/{lawProgress.length} conclu\u00eddas
              </p>
            </div>

            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-1 py-1">
                {lawProgress.map((lp) => {
                  const law = getLawMeta(lp.id);
                  if (!law) return null;

                  return (
                    <div
                      key={lp.id}
                      className="flex items-center gap-3 rounded-md px-3 py-2"
                    >
                      {/* Status icon */}
                      <div className="h-5 w-5 shrink-0 flex items-center justify-center">
                        {lp.status === "pending" && (
                          <div className="h-2 w-2 rounded-full bg-neutral-300 dark:bg-muted-foreground" />
                        )}
                        {(lp.status === "downloading" ||
                          lp.status === "analyzing") && (
                          <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                        )}
                        {lp.status === "done" && (
                          <Check className="h-4 w-4 text-emerald-500" />
                        )}
                        {lp.status === "error" && (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>

                      {/* Law info */}
                      <div
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: law.cor }}
                      />
                      <span className="text-sm font-medium flex-1 truncate">
                        {law.nome}
                      </span>

                      {/* Status label */}
                      <span
                        className={cn(
                          "text-xs shrink-0",
                          lp.status === "pending" && "text-muted-foreground",
                          lp.status === "downloading" && "text-emerald-600",
                          lp.status === "analyzing" && "text-blue-600",
                          lp.status === "done" && "text-muted-foreground",
                          lp.status === "error" && "text-red-500"
                        )}
                      >
                        {lp.status === "pending" && "Aguardando..."}
                        {lp.status === "downloading" && "Baixando..."}
                        {lp.status === "analyzing" && "Analisando diferen\u00e7as..."}
                        {lp.status === "done" &&
                          (lp.hasChanges ? "Altera\u00e7\u00f5es encontradas" : "Sem altera\u00e7\u00f5es")}
                        {lp.status === "error" && "Erro"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {scrapingDone && (
              <div className="space-y-3 pt-4 border-t border-neutral-200 dark:border-border">
                <p className="text-sm text-muted-foreground">
                  {lawProgress.length} leis analisadas
                  {changedCount > 0 && (
                    <>, <strong className="text-emerald-600">{changedCount} com altera\u00e7\u00f5es</strong></>
                  )}
                  {errorCount > 0 && (
                    <>, <span className="text-red-500">{errorCount} com erro</span></>
                  )}
                  {changedCount === 0 && errorCount === 0 && (
                    <> &mdash; tudo atualizado</>
                  )}
                </p>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    Fechar
                  </Button>
                  {changedCount > 0 && (
                    <Button
                      onClick={() => {
                        setExpandedDiffs(
                          new Set(relevantDiffs.map((d) => d.lawId))
                        );
                        setStep("review");
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      Revisar Altera\u00e7\u00f5es
                    </Button>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* ============================================================ */}
        {/* STEP 3 — Review diffs                                        */}
        {/* ============================================================ */}
        {step === "review" && (
          <>
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-3 py-2">
                {relevantDiffs.map((ld) => {
                  const law = getLawMeta(ld.lawId);
                  if (!law) return null;
                  const isExpanded = expandedDiffs.has(ld.lawId);

                  return (
                    <div
                      key={ld.lawId}
                      className="border border-neutral-200 dark:border-border rounded-lg overflow-hidden"
                    >
                      {/* Collapsible header */}
                      <button
                        type="button"
                        onClick={() => toggleDiffExpand(ld.lawId)}
                        className="flex items-center gap-2 w-full px-4 py-3 text-left hover:bg-neutral-50 dark:hover:bg-muted/50 transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: law.cor }}
                        />
                        <span className="text-sm font-medium">
                          {law.nome}
                        </span>
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {ld.diffs.length}{" "}
                          {ld.diffs.length === 1
                            ? "altera\u00e7\u00e3o"
                            : "altera\u00e7\u00f5es"}
                        </Badge>
                      </button>

                      {/* Diff content */}
                      {isExpanded && (
                        <div className="border-t border-neutral-200 dark:border-border divide-y divide-neutral-100 dark:divide-border ">
                          {ld.diffs.map((diff, idx) => (
                            <div key={idx} className="px-4 py-3 space-y-2">
                              <span className="text-xs font-mono font-semibold text-neutral-600 dark:text-muted-foreground">
                                {diff.artigo}
                              </span>

                              {diff.oldText && (
                                <div className="flex items-start gap-2">
                                  <Minus className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                                  <p className="text-sm bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300 rounded px-2 py-1 flex-1">
                                    {diff.oldText}
                                  </p>
                                </div>
                              )}

                              {diff.newText && (
                                <div className="flex items-start gap-2">
                                  <Plus className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                                  <p className="text-sm bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 rounded px-2 py-1 flex-1">
                                    {diff.newText}
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="flex justify-end gap-2 pt-4 border-t border-neutral-200 dark:border-border">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={applyChanges}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Check className="h-4 w-4 mr-2" />
                Aplicar Altera\u00e7\u00f5es
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
