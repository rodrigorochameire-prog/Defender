"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  FileText, FileImage, File as FileIcon, Search, ExternalLink, Scale, FolderOpen,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { AutosModalViewer } from "@/components/agenda/sheet/autos-modal-viewer";

type DocFile = {
  id: number;
  driveFileId: string;
  drivePath: string;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  modifiedTime: string | null;
  processoId: number | null;
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

function DocRow({ f, onOpen }: { f: DocFile; onOpen: (f: DocFile) => void }) {
  const cat = categoria(f);
  const Icone = cat === "pdf" ? FileText : cat === "imagem" ? FileImage : FileIcon;
  const cor = cat === "pdf" ? "text-rose-500" : cat === "imagem" ? "text-violet-500" : "text-neutral-400";
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
      <Icone className={cn("h-4 w-4 shrink-0", cor)} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11.5px] font-medium text-foreground/90">{f.fileName}</p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] text-muted-foreground">
          {f.modifiedTime && <span className="tabular-nums">{fmtData(f.modifiedTime)}</span>}
          {f.sizeBytes ? <span className="tabular-nums">· {fmtTamanho(f.sizeBytes)}</span> : null}
          {f.drivePath && <span className="truncate max-w-[260px]">· {f.drivePath}</span>}
        </div>
      </div>
      {f.processoId && (
        <Link
          href={`/admin/processos/${f.processoId}`}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-px text-[9px] font-medium text-neutral-500 dark:text-neutral-400 bg-neutral-200/50 dark:bg-white/[0.06] hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          title="Abrir processo"
        >
          <Scale className="h-2.5 w-2.5" /> Processo
        </Link>
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
        ativo
          ? "bg-emerald-600 text-white"
          : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200/60 dark:hover:bg-white/5",
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

  const arquivos = useMemo(() => {
    const list = (data ?? []) as DocFile[];
    return [...list].sort((a, b) => (b.modifiedTime ?? "").localeCompare(a.modifiedTime ?? ""));
  }, [data]);

  const contagem = useMemo(() => {
    const c = { todos: arquivos.length, pdf: 0, imagem: 0, outros: 0 };
    for (const f of arquivos) c[categoria(f)]++;
    return c;
  }, [arquivos]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return arquivos.filter((f) => {
      if (filtro !== "todos" && categoria(f) !== filtro) return false;
      if (termo && !f.fileName.toLowerCase().includes(termo) && !f.drivePath.toLowerCase().includes(termo)) return false;
      return true;
    });
  }, [arquivos, filtro, busca]);

  const abrir = (f: DocFile) => {
    if (isPdf(f.mimeType, f.fileName)) {
      setViewer({ driveFileId: f.driveFileId, processoId: f.processoId });
    } else {
      window.open(driveUrl(f.driveFileId), "_blank", "noopener,noreferrer");
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-11 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
          <FileText className="h-4 w-4 text-neutral-500" />
          Documentos
          <span className="text-[11px] font-normal text-neutral-400">{arquivos.length}</span>
        </h2>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-neutral-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar arquivo…"
            className="h-7 w-56 rounded-lg border border-neutral-200 dark:border-white/10 bg-transparent pl-7 pr-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-emerald-400"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <FiltroPill ativo={filtro === "todos"} onClick={() => setFiltro("todos")} label="Todos" count={contagem.todos} />
        <FiltroPill ativo={filtro === "pdf"} onClick={() => setFiltro("pdf")} label="PDFs" count={contagem.pdf} />
        <FiltroPill ativo={filtro === "imagem"} onClick={() => setFiltro("imagem")} label="Imagens" count={contagem.imagem} />
        <FiltroPill ativo={filtro === "outros"} onClick={() => setFiltro("outros")} label="Outros" count={contagem.outros} />
      </div>

      {filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-200 dark:border-white/10 py-12 text-center">
          <FolderOpen className="h-5 w-5 text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground">
            {arquivos.length === 0 ? "Nenhum documento indexado deste assistido." : "Nenhum arquivo no filtro."}
          </p>
        </div>
      ) : (
        <ul className="space-y-1">
          {filtrados.map((f) => (
            <li key={f.id}>
              <DocRow f={f} onOpen={abrir} />
            </li>
          ))}
        </ul>
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
