"use client";

import { useState, useMemo, useCallback } from "react";
import { History, Calendar, GitCompare } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { Artigo, VersaoArtigo } from "@/config/legislacao/types";

// ==========================================
// ARTIGO TIMELINE - Historico intertemporal
// ==========================================

interface ArtigoTimelineProps {
  artigo: Artigo;
  leiAbreviado: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ---- Word-level diff ----

type DiffSegment = {
  text: string;
  type: "equal" | "added" | "removed";
};

function computeWordDiff(oldText: string, newText: string): DiffSegment[] {
  const oldWords = oldText.split(/(\s+)/);
  const newWords = newText.split(/(\s+)/);

  // Simple LCS-based diff
  const m = oldWords.length;
  const n = newWords.length;

  // Build LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldWords[i - 1] === newWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to build diff
  const segments: DiffSegment[] = [];
  let i = m;
  let j = n;
  const raw: DiffSegment[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      raw.push({ text: oldWords[i - 1], type: "equal" });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      raw.push({ text: newWords[j - 1], type: "added" });
      j--;
    } else {
      raw.push({ text: oldWords[i - 1], type: "removed" });
      i--;
    }
  }

  raw.reverse();

  // Merge consecutive segments of same type
  for (const seg of raw) {
    const last = segments[segments.length - 1];
    if (last && last.type === seg.type) {
      last.text += seg.text;
    } else {
      segments.push({ ...seg });
    }
  }

  return segments;
}

// ---- Helpers ----

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-");
  if (!day) return dateStr;
  return `${day}/${month}/${year}`;
}

function findVersionAtDate(
  historico: VersaoArtigo[],
  dateStr: string
): VersaoArtigo | null {
  if (!dateStr || historico.length === 0) return null;

  // Sort by vigenteDesde ascending to search
  const sorted = [...historico].sort(
    (a, b) => a.vigenteDesde.localeCompare(b.vigenteDesde)
  );

  let match: VersaoArtigo | null = null;
  for (const v of sorted) {
    if (v.vigenteDesde <= dateStr) {
      if (!v.vigenteAte || v.vigenteAte >= dateStr) {
        match = v;
      }
    }
  }

  return match;
}

// ---- Sub-components ----

function DiffView({ oldText, newText }: { oldText: string; newText: string }) {
  const segments = useMemo(
    () => computeWordDiff(oldText, newText),
    [oldText, newText]
  );

  return (
    <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
      {segments.map((seg, i) => {
        if (seg.type === "added") {
          return (
            <span
              key={i}
              className="rounded-sm bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200"
            >
              {seg.text}
            </span>
          );
        }
        if (seg.type === "removed") {
          return (
            <span
              key={i}
              className="rounded-sm bg-red-100 text-red-800 line-through dark:bg-red-900/40 dark:text-red-300"
            >
              {seg.text}
            </span>
          );
        }
        return <span key={i}>{seg.text}</span>;
      })}
    </p>
  );
}

function TimelineEntry({
  versao,
  previousVersao,
  isFirst,
  isLast,
  showDiff,
  isHighlighted,
}: {
  versao: VersaoArtigo;
  previousVersao: VersaoArtigo | null;
  isFirst: boolean;
  isLast: boolean;
  showDiff: boolean;
  isHighlighted: boolean;
}) {
  return (
    <div className="relative flex gap-4">
      {/* Timeline line + dot */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "z-10 h-3 w-3 shrink-0 rounded-full border-2",
            isHighlighted
              ? "border-emerald-500 bg-emerald-500 ring-2 ring-emerald-500/30"
              : isFirst
                ? "border-emerald-500 bg-emerald-500"
                : "border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-800"
          )}
        />
        {!isLast && (
          <div className="w-0.5 grow bg-zinc-200 dark:bg-zinc-700" />
        )}
      </div>

      {/* Content */}
      <div
        className={cn(
          "mb-6 flex-1 rounded-lg border p-3",
          isHighlighted
            ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30"
            : "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
        )}
      >
        {/* Version badge + law info */}
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge
            variant={isFirst ? "default" : "outline"}
            className={cn(
              "text-xs",
              isFirst &&
                "bg-emerald-600 hover:bg-emerald-600 dark:bg-emerald-700"
            )}
          >
            v{versao.versao}
          </Badge>

          {versao.redacaoDadaPor ? (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Redacao dada pela{" "}
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                {versao.redacaoDadaPor.lei}
              </span>
              {versao.redacaoDadaPor.artigo && (
                <>, art. {versao.redacaoDadaPor.artigo}</>
              )}
            </span>
          ) : (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Redacao original
            </span>
          )}
        </div>

        {/* Date info */}
        {(versao.publicadoEm || versao.vigenteDesde) && (
          <div className="mb-2 flex flex-wrap items-center gap-3 text-xs text-zinc-400 dark:text-zinc-500">
            {versao.publicadoEm && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Publicado: {formatDate(versao.publicadoEm)}
              </span>
            )}
            {versao.vigenteDesde && (
              <span>Vigente desde: {formatDate(versao.vigenteDesde)}</span>
            )}
            {versao.vigenteAte && (
              <span>Ate: {formatDate(versao.vigenteAte)}</span>
            )}
          </div>
        )}

        {/* Text or Diff */}
        {showDiff && previousVersao ? (
          <DiffView oldText={previousVersao.texto} newText={versao.texto} />
        ) : (
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            {versao.texto}
          </p>
        )}
      </div>
    </div>
  );
}

// ---- Main Component ----

export function ArtigoTimeline({
  artigo,
  leiAbreviado,
  open,
  onOpenChange,
}: ArtigoTimelineProps) {
  const [showDiff, setShowDiff] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");

  const hasHistorico = artigo.historico && artigo.historico.length > 1;

  // Sort versions descending (most recent first)
  const sortedVersions = useMemo(() => {
    if (!artigo.historico) return [];
    return [...artigo.historico].sort((a, b) => b.versao - a.versao);
  }, [artigo.historico]);

  // Find version active at selected date
  const highlightedVersion = useMemo(() => {
    if (!selectedDate) return null;
    return findVersionAtDate(artigo.historico, selectedDate);
  }, [selectedDate, artigo.historico]);

  // For diff: we need to look up the previous version (by versao number)
  const getPreviousVersion = useCallback(
    (versao: VersaoArtigo): VersaoArtigo | null => {
      if (!artigo.historico) return null;
      return (
        artigo.historico.find((v) => v.versao === versao.versao - 1) ?? null
      );
    },
    [artigo.historico]
  );

  const handleDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSelectedDate(e.target.value);
    },
    []
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader className="space-y-3 pb-4">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <SheetTitle className="text-lg">
              Historico - Art. {artigo.numero}
            </SheetTitle>
            <Badge
              variant="outline"
              className="text-xs text-zinc-500 dark:text-zinc-400"
            >
              {leiAbreviado}
            </Badge>
          </div>
        </SheetHeader>

        {!hasHistorico ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <History className="h-10 w-10 text-zinc-300 dark:text-zinc-600" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Sem alteracoes registradas
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Este artigo possui apenas a redacao original.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Date picker */}
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
              <Label
                htmlFor="timeline-date"
                className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400"
              >
                <Calendar className="h-3.5 w-3.5" />
                Qual era a redacao em:
              </Label>
              <input
                id="timeline-date"
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                className={cn(
                  "w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm",
                  "focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500",
                  "dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                )}
              />
              {selectedDate && highlightedVersion && (
                <p className="mt-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                  Versao v{highlightedVersion.versao} estava vigente nesta data.
                </p>
              )}
              {selectedDate && !highlightedVersion && (
                <p className="mt-1.5 text-xs text-zinc-400">
                  Nenhuma versao vigente encontrada para esta data.
                </p>
              )}
            </div>

            {/* Diff toggle */}
            <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center gap-2">
                <GitCompare className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                <Label
                  htmlFor="diff-toggle"
                  className="text-sm text-zinc-600 dark:text-zinc-400"
                >
                  Comparar versoes
                </Label>
              </div>
              <Switch
                id="diff-toggle"
                checked={showDiff}
                onCheckedChange={setShowDiff}
              />
            </div>

            {/* Timeline */}
            <div className="pt-2">
              {sortedVersions.map((versao, idx) => (
                <TimelineEntry
                  key={versao.versao}
                  versao={versao}
                  previousVersao={getPreviousVersion(versao)}
                  isFirst={idx === 0}
                  isLast={idx === sortedVersions.length - 1}
                  showDiff={showDiff}
                  isHighlighted={
                    highlightedVersion?.versao === versao.versao
                  }
                />
              ))}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
