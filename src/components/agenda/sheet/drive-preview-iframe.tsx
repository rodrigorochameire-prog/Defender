"use client";

interface Props {
  driveFileId: string;
  mimeType?: string | null;
  height?: number;
  title?: string;
}

export function DrivePreviewIframe({ driveFileId, mimeType, height = 480, title = "Preview do arquivo" }: Props) {
  // PDF: servir pelo proxy (visualizador nativo ajusta à largura — não corta — e não
  // exige login no Google). Sem sandbox, para o viewer nativo de PDF funcionar.
  // Demais tipos (Docs/Sheets/imagens) seguem no Drive /preview, que os renderiza melhor.
  const isPdf = mimeType === "application/pdf";
  return (
    <iframe
      title={title}
      src={
        isPdf
          ? `/api/drive/proxy?fileId=${driveFileId}#view=FitH`
          : `https://drive.google.com/file/d/${driveFileId}/preview`
      }
      loading="lazy"
      {...(isPdf ? {} : { sandbox: "allow-scripts allow-same-origin allow-popups allow-forms" })}
      className="w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white"
      style={{ height: `${height}px` }}
    />
  );
}
