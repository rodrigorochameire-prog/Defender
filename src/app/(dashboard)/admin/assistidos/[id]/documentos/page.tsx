"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  FileText, FileImage, File as FileIcon, Search, Scale, FolderOpen, Sparkles, Layers,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { AutosModalViewer } from "@/components/agenda/sheet/autos-modal-viewer";
import { tipoDocumento, type TipoDocumento } from "@/lib/documentos/tipo-documento";

type DocFile = {
  id: number;
  driveFileId: string;
  drivePath: string;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  modifiedTime: string | null;
  processoId: number | null;
  documentType: string | null;
};

type Filtro = "todos" | "pdf" | "imagem" | "outros";

const isPdf = (m: string | null, name: string) =>
  (m ?? "").includes("pdf") || name.toLowerCase().endsWith(".pdf");
const isImg = (m: string | null) => (m ?? "").startsWith("image/");

function categoria(f: DocFile): Filtro {
  if (isPdf(f.mimeType, f.fileName)) return "pdf";
  if (isImg(f.mimeType)) return "imagem";
  return "outros";
}

function fmtTamanho(b: number | null): string {
  if (!b) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function fmtData(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" }).replace(".", "");
}

const driveUrl = (driveFileId: string) => `https://drive.google.com/file/d/${driveFileId}/view`;

function DocRow({ f, tipo, onOpen }: { f: DocFile; tipo: TipoDocumento; onOpen: (f: DocFile) => void }) {
  const cat = categoria(f);
  const Icone = cat === "pdf" ? FileText : cat === "imagem" ? FileImage : FileIcon;
  const pdf = cat === "pdf";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(f)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(f);
        }
      }}
      className="flex items-center gap-2.5 rounded-lg border border-neutral-200/70 dark:border-white/[0.06] bg-neutral-50/60 dark:bg-white/[0.03] px-2.5 py-2 hover:bg-neutral-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
    >
      <Icone className={cn("h-4 w-4 shrink-0", pdf ? "text-rose-500" : cat === "imagem" ? "text-violet-500" : "text-neutral-400")} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11.5px] font-medium text-foreground/90">{f.fileName}</p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] text-muted-foreground">
          {f.modifiedTime && <span className="tabular-nums">{fmtData(f.modifiedTime)}</span>}
          {f.sizeBytes ? <span className="tabular-nums">· {fmtTamanho(f.sizeBytes)}</span> : null}
        </div>
      </div>
      {tipo.key !== "outro" && (
        <span
          className="inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-px text-[9px] font-medium"
          style={{ backgroundColor: `${tipo.cor}1a`, color: tipo.cor }}
          title={tipo.fonte === "ia" ? "Tipo classificado pela IA" : "Tipo inferido do nome"}
        >
          {tipo.fonte === "ia" && <Sparkles className="h-2.5 w-2.5" />}
          {tipo.label}
        </span>
      )}
      <span className="shrink-0 text-[9px] font-medium text-emerald-600 dark:text-emerald-400">
        {pdf ? "Ver autos" : "Abrir"}
      </span>
    </div>
  );
}

function FiltroPill({ ativo, onClick, label, count }: { ativo: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors cursor-pointer",
        ativo ? "bg-emerald-600 text-white" : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200/60 dark:hover:bg-white/5",
      )}
    >
      {label}
      <span className={cn("tabular-nums", ativo ? "opacity-80" : "opacity-60")}>{count}</span>
    </button>
  );
}

export default function DocumentosPage() {
  const params = useParams();
  const assistidoId = Number(params?.id);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busca, setBusca] = useState("");
  const [viewer, setViewer] = useState<{ driveFileId: string; processoId: number | null } | null>(null);

  const { data, isLoading } = trpc.drive.filesByAssistido.useQuery(
    { assistidoId },
    { enabled: !isNaN(assistidoId), staleTime: 60_000 },
  );
  // Mapa processoId → nº dos autos (rótulo dos grupos). getById é cacheado.
  const { data: assistido } = trpc.assistidos.getById.useQuery(
    { id: assistidoId },
    { enabled: !isNaN(assistidoId) },
  );
  const procMap = useMemo(() => {
    const m = new Map<number, { numeroAutos: string | null; tipoProcesso: string | null }>();
    for (const p of assistido?.processos ?? []) m.set(p.id, { numeroAutos: p.numeroAutos, tipoProcesso: p.tipoProcesso ?? null });
    return m;
  }, [assistido?.processos]);

  const arquivos = useMemo(() => (data ?? []) as DocFile[], [data]);

  const contagem = useMemo(() => {
    const c = { todos: arquivos.length, pdf: 0, imagem: 0, outros: 0 };
    for (const f of arquivos) c[categoria(f)]++;
    return c;
  }, [arquivos]);

  // Filtra, resolve tipo, e agrupa por processo.
  const grupos = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const filtrados = arquivos.filter((f) => {
      if (filtro !== "todos" && categoria(f) !== filtro) return false;
      if (termo && !f.fileName.toLowerCase().includes(termo) && !f.drivePath.toLowerCase().includes(termo)) return false;
      return true;
    });

    const porProc = new Map<number | "gerais", DocFile[]>();
    for (const f of filtrados) {
      const k = f.processoId ?? "gerais";
      const arr = porProc.get(k) ?? [];
      arr.push(f);
      porProc.set(k, arr);
    }
    for (const arr of porProc.values()) {
      arr.sort((a, b) => (b.modifiedTime ?? "").localeCompare(a.modifiedTime ?? ""));
    }

    const ordem = [...porProc.keys()].sort((a, b) => {
      if (a === "gerais") return 1;
      if (b === "gerais") return -1;
      return (a as number) - (b as number);
    });
    return ordem.map((k) => ({ key: k, arquivos: porProc.get(k)! }));
  }, [arquivos, filtro, busca]);

  const abrir = (f: DocFile) => {
    if (isPdf(f.mimeType, f.fileName)) setViewer({ driveFileId: f.driveFileId, processoId: f.processoId });
    else window.open(driveUrl(f.driveFileId), "_blank", "noopener,noreferrer");
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-11 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900" />
        ))}
      </div>
    );
  }

  const totalFiltrado = grupos.reduce((n, g) => n + g.arquivos.length, 0);

  return (
    <div className="p-4 sm:p-6 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
          <FileText className="h-4 w-4 text-neutral-500" />
          Documentos
          <span className="text-[11px] font-normal text-neutral-400">{arquivos.length}</span>
        </h2>
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-neutral-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar arquivo…"
            className="h-7 w-full sm:w-56 rounded-lg border border-neutral-200 dark:border-white/10 bg-transparent pl-7 pr-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-emerald-400"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <FiltroPill ativo={filtro === "todos"} onClick={() => setFiltro("todos")} label="Todos" count={contagem.todos} />
        <FiltroPill ativo={filtro === "pdf"} onClick={() => setFiltro("pdf")} label="PDFs" count={contagem.pdf} />
        <FiltroPill ativo={filtro === "imagem"} onClick={() => setFiltro("imagem")} label="Imagens" count={contagem.imagem} />
        <FiltroPill ativo={filtro === "outros"} onClick={() => setFiltro("outros")} label="Outros" count={contagem.outros} />
      </div>

      {totalFiltrado === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-200 dark:border-white/10 py-12 text-center">
          <FolderOpen className="h-5 w-5 text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground">
            {arquivos.length === 0 ? "Nenhum documento indexado deste assistido." : "Nenhum arquivo no filtro."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {grupos.map((g) => {
            const proc = g.key === "gerais" ? null : procMap.get(g.key as number);
            return (
              <section key={String(g.key)}>
                <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                  {g.key === "gerais" ? (
                    <>
                      <Layers className="h-3 w-3" /> Gerais / sem processo
                    </>
                  ) : (
                    <>
                      <Scale className="h-3 w-3" />
                      {proc?.numeroAutos ? (
                        <Link
                          href={`/admin/processos/${g.key}`}
                          className="font-mono normal-case tracking-normal text-neutral-500 dark:text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                        >
                          {proc.numeroAutos}
                        </Link>
                      ) : (
                        <span className="normal-case">Processo #{g.key}</span>
                      )}
                      {proc?.tipoProcesso && <span className="normal-case tracking-normal text-neutral-400">· {proc.tipoProcesso}</span>}
                    </>
                  )}
                  <span className="font-normal text-neutral-400">· {g.arquivos.length}</span>
                </div>
                <div className="space-y-1">
                  {g.arquivos.map((f) => (
                    <DocRow key={f.id} f={f} tipo={tipoDocumento(f.documentType, f.fileName)} onOpen={abrir} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {viewer && (
        <AutosModalViewer
          driveFileId={viewer.driveFileId}
          processoId={viewer.processoId}
          onClose={() => setViewer(null)}
        />
      )}
    </div>
  );
}
