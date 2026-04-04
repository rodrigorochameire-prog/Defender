"use client";

import { toast } from "sonner";
import { FileText, Mic, RefreshCw, Sparkles, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import type { JobType } from "@/contexts/processing-queue";

const ICON_MAP: Record<JobType, React.ElementType> = {
  classification: FileText,
  transcription: Mic,
  sync: RefreshCw,
  extraction: Sparkles,
};

const LABEL_MAP: Record<JobType, string> = {
  classification: "Classificando...",
  transcription: "Transcrevendo...",
  sync: "Sincronizando...",
  extraction: "Extraindo dados...",
};

const COLOR_MAP: Record<JobType, string> = {
  classification: "bg-violet-500",
  transcription: "bg-blue-500",
  sync: "bg-emerald-500",
  extraction: "bg-amber-500",
};

type ProgressToastProps = {
  id: string;
  type: JobType;
  label: string;
  /** 0-100 for determinate, -1 for indeterminate */
  progress: number;
  detail: string;
};

function ProgressToastContent({ type, label, progress, detail }: Omit<ProgressToastProps, "id">) {
  const Icon = ICON_MAP[type];
  const colorClass = COLOR_MAP[type];
  const isIndeterminate = progress < 0;

  return (
    <div className="w-[300px] rounded-lg border border-neutral-200 bg-white p-3 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 shrink-0">
          {isIndeterminate ? (
            <Loader2 className="h-4 w-4 animate-spin text-neutral-500" />
          ) : (
            <Icon className="h-4 w-4 text-neutral-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
            {LABEL_MAP[type]}
          </p>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
            {label}
          </p>
          <div className="mt-2">
            <div className="h-1.5 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
              {isIndeterminate ? (
                <div className={`h-full w-1/3 rounded-full ${colorClass} animate-[indeterminate_1.5s_ease-in-out_infinite]`} />
              ) : (
                <div
                  className={`h-full rounded-full ${colorClass} transition-all duration-300`}
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              )}
            </div>
          </div>
          {detail && (
            <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1">
              {detail}
            </p>
          )}
        </div>
        {!isIndeterminate && progress >= 0 && (
          <span className="text-[10px] font-medium text-neutral-500 shrink-0 mt-0.5">
            {Math.round(progress)}%
          </span>
        )}
      </div>
    </div>
  );
}

export function showProgressToast(props: ProgressToastProps) {
  toast.custom(
    () => <ProgressToastContent {...props} />,
    {
      id: props.id,
      duration: Infinity,
      className: "!p-0 !bg-transparent !border-0 !shadow-none",
    }
  );
}

export function updateProgressToast(id: string, props: Partial<Omit<ProgressToastProps, "id">>) {
  // Re-render by calling toast.custom with same id
  toast.custom(
    () => (
      <ProgressToastContent
        type={props.type ?? "classification"}
        label={props.label ?? ""}
        progress={props.progress ?? -1}
        detail={props.detail ?? ""}
      />
    ),
    {
      id,
      duration: Infinity,
      className: "!p-0 !bg-transparent !border-0 !shadow-none",
    }
  );
}

export function completeProgressToast(id: string, message: string) {
  toast.custom(
    () => (
      <div className="w-[300px] rounded-lg border border-emerald-200 bg-emerald-50 p-3 shadow-lg dark:border-emerald-800 dark:bg-emerald-950">
        <div className="flex items-start gap-2.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
              Concluido
            </p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
              {message}
            </p>
          </div>
        </div>
      </div>
    ),
    {
      id,
      duration: 4000,
      className: "!p-0 !bg-transparent !border-0 !shadow-none",
    }
  );
}

export function failProgressToast(id: string, error: string) {
  toast.custom(
    () => (
      <div className="w-[300px] rounded-lg border border-red-200 bg-red-50 p-3 shadow-lg dark:border-red-800 dark:bg-red-950">
        <div className="flex items-start gap-2.5">
          <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-red-700 dark:text-red-300">
              Falhou
            </p>
            <p className="text-[11px] text-red-600 dark:text-red-400 mt-0.5 line-clamp-2">
              {error}
            </p>
          </div>
        </div>
      </div>
    ),
    {
      id,
      duration: 6000,
      className: "!p-0 !bg-transparent !border-0 !shadow-none",
    }
  );
}
