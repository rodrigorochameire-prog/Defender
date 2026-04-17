"use client";

interface Props {
  driveFileId: string;
  height?: number;
  title?: string;
}

export function DrivePreviewIframe({ driveFileId, height = 480, title = "Preview do arquivo" }: Props) {
  return (
    <iframe
      title={title}
      src={`https://drive.google.com/file/d/${driveFileId}/preview`}
      loading="lazy"
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      className="w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white"
      style={{ height: `${height}px` }}
    />
  );
}
