"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { copyToClipboard } from "@/lib/clipboard";

interface CopyProcessButtonProps {
  processo: string;
}

export function CopyProcessButton({ processo }: CopyProcessButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const success = await copyToClipboard(processo);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="ml-2 p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors group/copy"
      title="Copiar número do processo"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 group-hover/copy:text-zinc-600 dark:group-hover/copy:text-zinc-300" />
      )}
    </button>
  );
}