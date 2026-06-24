"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import {
  Loader2,
  Play,
  Video,
  FileText,
  UserCheck,
  UserX,
  ClipboardPaste,
  ChevronDown,
  Mic,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { GravarAudiencia } from "@/components/agenda/sheet/gravar-audiencia";
import { AudioPlayerInline } from "@/components/agenda/sheet/audio-player-inline";
import { cn } from "@/lib/utils";

const RESULTADO_TONE: Record<string, string> = {
  realizada: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  suspensa: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  redesignada: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  nao_realizada: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
};
const RESULTADO_LABEL: Record<string, string> = {
  realizada: "Realizada",
  suspensa: "Suspensa",
  redesignada: "Redesignada",
  nao_realizada: "Não realizada",
};

const TRANSC_STATUS: Record<string, { label: string; tone: string; spin?: boolean }> = {
  pending: { label: "Transcrição na fila", tone: "text-amber-600", spin: true },
  processing: { label: "Transcrevendo…", tone: "text-amber-600", spin: true },
  completed: { label: "Transcrição pronta", tone: "text-emerald-600" },
  failed: { label: "Falha na transcrição", tone: "text-rose-600" },
};

function FaixaTitulo({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{children}</h4>
  );
}

function iconeMidia(tipo: string) {
  if (tipo === "lifesize" || tipo === "youtube") return Video;
  return Play;
}

export function AtaAudienciaBlock({
  audienciaId,
  processoId,
}: {
  audienciaId: number;
  processoId: number | null;
}) {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.audiencias.getAta.useQuery(
    { audienciaId },
    {
      // Enquanto o daemon transcreve, faz polling leve até concluir/falhar.
      refetchInterval: (q) => {
        const s = q.state.data?.gravacao?.transcricaoStatus;
        return s === "pending" || s === "processing" ? 15_000 : false;
      },
    },
  );
  const [open, setOpen] = useState(false);
  const [texto, setTexto] = useState("");
  const [transcOpen, setTranscOpen] = useState(false);

  const aplicar = trpc.audiencias.aplicarAta.useMutation({
    onSuccess: (r) => {
      utils.audiencias.getAta.invalidate({ audienciaId });
      toast.success(
        `Ata aplicada: ${r.midias} link(s), ${r.ouvidos} ouvido(s), ${r.ausencias} ausência(s).`,
      );
      setOpen(false);
      setTexto("");
    },
    onError: (e) => toast.error(e.message),
  });

  const midias = data?.midias ?? [];
  const ata = data?.ata ?? null;
  const gravacao = data?.gravacao ?? null;
  const status = gravacao?.transcricaoStatus
    ? TRANSC_STATUS[gravacao.transcricaoStatus]
    : null;

  return (
    <div className="space-y-4">
      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-neutral-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando…
        </div>
      )}

      {/* ── Resultado da ata ─────────────────────────────────────────── */}
      {ata && (
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <FaixaTitulo>Resultado da ata</FaixaTitulo>
            {ata.resultado && (
              <span
                className={cn(
                  "text-[9px] px-1.5 py-0.5 rounded font-medium uppercase",
                  RESULTADO_TONE[ata.resultado] ?? "bg-neutral-100 text-neutral-600",
                )}
              >
                {RESULTADO_LABEL[ata.resultado] ?? ata.resultado}
              </span>
            )}
            {ata.data_realizada && (
              <span className="text-[10px] text-neutral-400">
                realizada em {ata.data_realizada.split("-").reverse().join("/")}
              </span>
            )}
            {ata.origem === "gravacao" && (
              <span className="flex items-center gap-1 text-[9px] font-medium text-neutral-400">
                <Sparkles className="h-2.5 w-2.5 text-emerald-500" /> via gravação
              </span>
            )}
          </div>
          {(ata.ouvidos ?? []).map((o, i) => (
            <p key={`o${i}`} className="flex items-center gap-1.5 text-[11px] text-neutral-600 dark:text-neutral-400">
              <UserCheck className="h-3 w-3 text-emerald-500 flex-shrink-0" /> Ouvido(a): {o.nome}
              {o.papel ? ` (${o.papel})` : ""}
            </p>
          ))}
          {(ata.ausencias ?? []).map((a, i) => (
            <p key={`a${i}`} className="flex items-start gap-1.5 text-[11px] text-neutral-600 dark:text-neutral-400">
              <UserX className="h-3 w-3 mt-0.5 text-rose-500 flex-shrink-0" /> Ausente: {a.nome}
              {a.motivo ? ` — ${a.motivo}` : ""}
            </p>
          ))}
        </div>
      )}

      {/* ── Gravação + transcrição ───────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Mic className="h-3.5 w-3.5 text-neutral-400" />
          <FaixaTitulo>Gravação da audiência</FaixaTitulo>
          {status && (
            <span className={cn("flex items-center gap-1 text-[10px] font-medium", status.tone)}>
              {status.spin && <Loader2 className="h-3 w-3 animate-spin" />}
              {status.label}
            </span>
          )}
        </div>

        {gravacao?.audioDriveFileId && (
          <AudioPlayerInline
            driveFileId={gravacao.audioDriveFileId}
            title={`Gravação${gravacao.audioFonte ? ` · ${gravacao.audioFonte === "sistema" ? "videoconferência" : "microfone"}` : ""}`}
          />
        )}

        {gravacao?.transcricaoResumo && (
          <div className="rounded-lg bg-emerald-50/60 dark:bg-emerald-900/15 ring-1 ring-emerald-100 dark:ring-emerald-900/30 p-2.5 space-y-1">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-emerald-600" />
              <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                Resumo da audiência
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
              {gravacao.transcricaoResumo}
            </p>
          </div>
        )}

        {gravacao?.transcricao && (
          <div>
            <button
              type="button"
              onClick={() => setTranscOpen((v) => !v)}
              className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-600 dark:text-neutral-300 hover:text-emerald-600 cursor-pointer"
            >
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", transcOpen && "rotate-180")} />
              {transcOpen ? "Ocultar transcrição" : "Ver transcrição completa"}
            </button>
            {transcOpen && (
              <p className="mt-1.5 max-h-64 overflow-y-auto rounded-lg ring-1 ring-neutral-200 dark:ring-neutral-800 p-2.5 text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap">
                {gravacao.transcricao}
              </p>
            )}
          </div>
        )}

        <GravarAudiencia
          audienciaId={audienciaId}
          onUploaded={() => utils.audiencias.getAta.invalidate({ audienciaId })}
        />
      </div>

      {/* ── Links oficiais (PJe/Lifesize) ────────────────────────────── */}
      {midias.length > 0 && (
        <div className="space-y-1.5">
          <FaixaTitulo>Links PJe / Lifesize</FaixaTitulo>
          <div className="flex flex-col gap-1.5">
            {midias.map((m, i) => {
              const Icon = iconeMidia(m.tipo);
              return (
                <a
                  key={i}
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2 rounded-lg ring-1 ring-neutral-200 dark:ring-neutral-800 px-2.5 py-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                >
                  <Icon className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                  <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200 flex-1 truncate">
                    {m.rotulo ?? "Gravação"}
                  </span>
                  <span className="text-[9px] uppercase text-neutral-400">{m.tipo}</span>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Ação manual: parsear ata colada ──────────────────────────── */}
      <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setOpen(true)}>
        <ClipboardPaste className="h-3.5 w-3.5" /> Parsear ata colada
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-neutral-500" />
            <h3 className="text-sm font-semibold">Parsear ata de audiência</h3>
          </div>
          <p className="text-xs text-neutral-500">
            Cole o texto da ata. Extraímos os links de gravação, o resultado e marcamos os
            depoentes ouvidos/ausentes nesta audiência.
          </p>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={10}
            placeholder="ATA DE AUDIÊNCIA…"
            className="w-full rounded-lg ring-1 ring-neutral-200 dark:ring-neutral-800 bg-transparent p-2 text-xs font-mono resize-y focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
          <Button
            size="sm"
            disabled={!texto.trim() || aplicar.isPending || processoId == null}
            onClick={() =>
              processoId != null &&
              aplicar.mutate({ audienciaId, processoId, texto })
            }
            className="w-full"
          >
            {aplicar.isPending ? "Aplicando…" : "Parsear e aplicar"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
