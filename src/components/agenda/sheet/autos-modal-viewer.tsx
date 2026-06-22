"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { PdfViewerModal } from "@/components/drive/PdfViewerModal";

interface Props {
  driveFileId: string;
  processoId: number | null;
  onClose: () => void;
  /** Termo a buscar ao abrir (deep-link a um ponto do documento). */
  initialSearch?: string | null;
}

type ArquivoLite = { id: number; name: string; driveFileId: string };

/**
 * Visualizador de autos do painel encaixado à esquerda do sheet de evento.
 *
 * Hospeda o visualizador rico (PdfViewerModal) em modo `embedded` — assim o
 * expandir já abre o leitor completo: grifos/anotações persistidos por defensor,
 * índice de atos (seções), texto extraído e navegação entre os PDFs do processo.
 * Tudo é carregado pelo próprio viewer a partir do `fileId` (metadados, seções e
 * anotações), bastando resolver o id interno do arquivo e montar a lista de irmãos.
 */
export function AutosModalViewer({ driveFileId, processoId, onClose, initialSearch }: Props) {
  // Resolve o id interno + nome do arquivo expandido (necessário p/ grifos/seções).
  const fileRef = trpc.drive.resolveByDriveId.useQuery(
    { driveFileId },
    { enabled: !!driveFileId },
  );
  const fileInterno = fileRef.data as { id: number; name: string } | null | undefined;

  // Demais PDFs do processo (e correlatos do caso) p/ a aba "Arquivos" e navegação.
  const autosQ = trpc.drive.autosDoProcesso.useQuery(
    { processoId: processoId ?? 0 },
    { enabled: !!processoId },
  );

  const irmaos: ArquivoLite[] = useMemo(() => {
    const data = autosQ.data as
      | { desteProcesso?: any[]; correlacionados?: any[] }
      | undefined;
    const grupos = data ? [...(data.desteProcesso ?? []), ...(data.correlacionados ?? [])] : [];
    const map = new Map<number, ArquivoLite>();
    for (const f of grupos) {
      if (f?.id && f?.driveFileId) {
        map.set(f.id, { id: f.id, name: f.name, driveFileId: f.driveFileId });
      }
    }
    // Garante que o arquivo expandido esteja na lista (pode vir de outra aba).
    if (fileInterno?.id && !map.has(fileInterno.id)) {
      map.set(fileInterno.id, { id: fileInterno.id, name: fileInterno.name, driveFileId });
    }
    return [...map.values()];
  }, [autosQ.data, fileInterno, driveFileId]);

  // Arquivo em foco (troca ao navegar pela aba "Arquivos" / setas do viewer).
  const [currentFileId, setCurrentFileId] = useState<number | null>(null);
  const effectiveId = currentFileId ?? fileInterno?.id ?? null;

  const atual: ArquivoLite | null = useMemo(() => {
    const found = irmaos.find((f) => f.id === effectiveId);
    if (found) return found;
    if (fileInterno?.id) return { id: fileInterno.id, name: fileInterno.name, driveFileId };
    return null;
  }, [irmaos, effectiveId, fileInterno, driveFileId]);

  const siblingFiles = useMemo(
    () =>
      irmaos.map((f) => ({
        id: f.id,
        name: f.name,
        pdfUrl: `/api/drive/proxy?fileId=${f.driveFileId}`,
      })),
    [irmaos],
  );

  if (!atual) {
    return (
      <div className="flex items-center justify-center h-full text-neutral-400">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  return (
    <PdfViewerModal
      embedded
      isOpen
      onClose={onClose}
      fileId={atual.id}
      fileName={atual.name}
      pdfUrl={`/api/drive/proxy?fileId=${atual.driveFileId}`}
      siblingFiles={siblingFiles}
      onFileChange={setCurrentFileId}
      initialSearch={initialSearch}
    />
  );
}
