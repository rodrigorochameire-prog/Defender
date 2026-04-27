"use client";

import { forwardRef } from "react";

interface Props {
  driveFileId: string;
  title: string;
  autoPlay?: boolean;
  className?: string;
}

export const AudioPlayerInline = forwardRef<HTMLAudioElement, Props>(
  ({ driveFileId, title, autoPlay = false, className }, ref) => {
    const src = `https://drive.google.com/uc?export=download&id=${driveFileId}`;
    return (
      <div className={className}>
        <div className="text-[10px] font-medium text-neutral-700 dark:text-neutral-300 mb-1.5 truncate">
          {title}
        </div>
        <audio
          ref={ref}
          controls
          preload="metadata"
          autoPlay={autoPlay}
          src={src}
          className="w-full h-8"
        >
          Seu navegador não suporta áudio HTML5.
        </audio>
      </div>
    );
  }
);

AudioPlayerInline.displayName = "AudioPlayerInline";
