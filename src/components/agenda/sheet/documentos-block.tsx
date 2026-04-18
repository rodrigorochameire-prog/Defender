"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DocumentosItem, type DriveFileLite } from "./documentos-item";
import { DropZone } from "./drop-zone";
import { fileToBase64 } from "@/lib/agenda/file-to-base64";
import { DocumentPreviewDialog } from "@/components/agenda/registro-audiencia/shared/document-preview-dialog";

type TabKey = "autos" | "assistido";

interface Props {
  processoId: number | null;
  assistidoId: number | null;
}

export function DocumentosBlock({ processoId, assistidoId }: Props) {
  const [tab, setTab] = useState<TabKey>("autos");
  const [openId, setOpenId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<DriveFileLite | null>(null);

  const utils = trpc.useUtils();

  const autos = trpc.drive.filesByProcesso.useQuery(
    { processoId: processoId ?? 0 },
    { enabled: !!processoId }
  );
  const assistido = trpc.drive.filesByAssistido.useQuery(
    { assistidoId: assistidoId ?? 0 },
    { enabled: !!assistidoId }
  );
  const statusProcesso = trpc.drive.getDriveStatusForProcesso.useQuery(
    { processoId: processoId ?? 0 },
    { enabled: !!processoId, retry: false }
  );
  const statusAssistido = trpc.drive.getDriveStatusForAssistido.useQuery(
    { assistidoId: assistidoId ?? 0 },
    { enabled: !!assistidoId, retry: false }
  );

  const upload = trpc.drive.uploadWithLink.useMutation({
    onSuccess: () => {
      toast.success("Arquivo enviado");
      if (processoId) utils.drive.filesByProcesso.invalidate({ processoId });
      if (assistidoId) utils.drive.filesByAssistido.invalidate({ assistidoId });
    },
    onError: (e) => toast.error(e.message ?? "Erro no upload"),
  });

  const autosList: DriveFileLite[] = (autos.data as any) ?? [];
  const assistidoList: DriveFileLite[] = (assistido.data as any) ?? [];
  const activeList = tab === "autos" ? autosList : assistidoList;

  const folderId =
    tab === "autos"
      ? ((statusProcesso.data as any)?.folderId ?? null)
      : ((statusAssistido.data as any)?.folderId ?? null);

  const driveConnected =
    ((statusProcesso.data as any)?.linked ?? null) !== false ||
    ((statusAssistido.data as any)?.linked ?? null) !== false;

  const handleFiles = async (files: File[]) => {
    if (!folderId) {
      toast.error("Pasta do Drive não configurada para esta tab");
      return;
    }
    for (const file of files) {
      try {
        const fileBase64 = await fileToBase64(file);
        upload.mutate({
          folderId,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          fileBase64,
          processoId: tab === "autos" ? processoId ?? undefined : undefined,
          assistidoId: tab === "assistido" ? assistidoId ?? undefined : undefined,
        });
      } catch (err: any) {
        toast.error(err?.message ?? "Erro ao ler arquivo");
      }
    }
  };

  return (
    <div className="space-y-2">
      <div role="tablist" className="flex gap-0 border-b border-neutral-200 dark:border-neutral-800">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "autos"}
          disabled={!processoId}
          onClick={() => { setTab("autos"); setOpenId(null); }}
          className={cn(
            "px-3 py-1.5 text-[11px] font-medium border-b-2 cursor-pointer transition-colors",
            tab === "autos"
              ? "border-foreground text-foreground"
              : "border-transparent text-neutral-500 hover:text-neutral-700",
            !processoId && "opacity-40 cursor-not-allowed"
          )}
        >
          Autos
          {autosList.length > 0 && (
            <span className="ml-1 text-[9px] text-neutral-400 tabular-nums">{autosList.length}</span>
          )}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "assistido"}
          disabled={!assistidoId}
          onClick={() => { setTab("assistido"); setOpenId(null); }}
          className={cn(
            "px-3 py-1.5 text-[11px] font-medium border-b-2 cursor-pointer transition-colors",
            tab === "assistido"
              ? "border-foreground text-foreground"
              : "border-transparent text-neutral-500 hover:text-neutral-700",
            !assistidoId && "opacity-40 cursor-not-allowed"
          )}
        >
          Assistido
          {assistidoList.length > 0 && (
            <span className="ml-1 text-[9px] text-neutral-400 tabular-nums">{assistidoList.length}</span>
          )}
        </button>
      </div>

      {driveConnected && folderId && (
        <DropZone
          onFiles={handleFiles}
          onReject={(_, reason) => toast.error(reason)}
          disabled={upload.isPending}
          label={upload.isPending ? "Enviando…" : "Arraste ou clique para subir"}
        />
      )}

      {!driveConnected && (
        <p className="text-[11px] text-neutral-500 italic py-4 text-center">
          Google Drive não conectado.{" "}
          <a href="/admin/configuracoes/drive" className="underline hover:text-neutral-700">Configurar</a>
        </p>
      )}
      {driveConnected && activeList.length === 0 && (
        <p className="text-[11px] text-neutral-400 italic py-4 text-center">
          Nenhum arquivo nesta pasta. Arraste um acima.
        </p>
      )}
      {activeList.length > 0 && (
        <div className="space-y-1.5">
          {activeList.map((f) => (
            <DocumentosItem
              key={f.driveFileId}
              file={f}
              isOpen={openId === f.driveFileId}
              onToggle={() => setOpenId(openId === f.driveFileId ? null : f.driveFileId)}
              onExpand={setExpanded}
            />
          ))}
        </div>
      )}

      <DocumentPreviewDialog
        driveFileId={expanded?.driveFileId ?? null}
        title={expanded?.name}
        mimeType={expanded?.mimeType}
        webViewLink={expanded?.webViewLink}
        fileSize={expanded?.fileSize != null ? String(expanded.fileSize) : null}
        onClose={() => setExpanded(null)}
      />
    </div>
  );
}
