"use client";

import { useProcessingQueue, type ProcessingJob, type JobType } from "@/contexts/processing-queue";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  FileText,
  Mic,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  XCircle,
  Loader2,
  Activity,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const ICON_MAP: Record<JobType, React.ElementType> = {
  classification: FileText,
  transcription: Mic,
  sync: RefreshCw,
  extraction: Sparkles,
};

const COLOR_MAP: Record<JobType, string> = {
  classification: "text-violet-500",
  transcription: "text-blue-500",
  sync: "text-emerald-500",
  extraction: "text-amber-500",
};

const BAR_COLOR_MAP: Record<JobType, string> = {
  classification: "bg-violet-500",
  transcription: "bg-blue-500",
  sync: "bg-emerald-500",
  extraction: "bg-amber-500",
};

function JobItem({ job }: { job: ProcessingJob }) {
  const Icon = ICON_MAP[job.type];
  const colorClass = COLOR_MAP[job.type];
  const isRunning = job.status === "running";
  const isCompleted = job.status === "completed";
  const isFailed = job.status === "failed";
  const isIndeterminate = job.progress < 0;

  return (
    <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
      <div className="flex items-start gap-2">
        <div className="mt-0.5 shrink-0">
          {isRunning && isIndeterminate ? (
            <Loader2 className={cn("h-3.5 w-3.5 animate-spin", colorClass)} />
          ) : isCompleted ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          ) : isFailed ? (
            <XCircle className="h-3.5 w-3.5 text-red-500" />
          ) : (
            <Icon className={cn("h-3.5 w-3.5", colorClass)} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 truncate">
            {job.label}
          </p>

          {isRunning && !isIndeterminate && (
            <div className="mt-1 flex items-center gap-2">
              <div className="flex-1 h-1 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-300", BAR_COLOR_MAP[job.type])}
                  style={{ width: `${Math.min(job.progress, 100)}%` }}
                />
              </div>
              <span className="text-[9px] font-medium text-zinc-400 shrink-0">
                {Math.round(job.progress)}%
              </span>
            </div>
          )}

          {isRunning && isIndeterminate && (
            <div className="mt-1 h-1 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
              <div className={cn("h-full w-1/3 rounded-full animate-indeterminate", BAR_COLOR_MAP[job.type])} />
            </div>
          )}

          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 truncate">
            {isFailed ? job.error : job.detail}
          </p>
        </div>
        {!isRunning && job.completedAt && (
          <span className="text-[9px] text-zinc-400 shrink-0 mt-0.5">
            {formatDistanceToNow(job.completedAt, { locale: ptBR, addSuffix: false })}
          </span>
        )}
      </div>
    </div>
  );
}

export function ProcessingQueuePanel({ children }: { children: React.ReactNode }) {
  const { activeJobs, recentJobs, activeCount } = useProcessingQueue();

  const hasContent = activeJobs.length > 0 || recentJobs.length > 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[320px] p-0 max-h-[400px] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-200 dark:border-zinc-800">
          <Activity className="h-3.5 w-3.5 text-zinc-500" />
          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Processamento
          </span>
          {activeCount > 0 && (
            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 font-medium">
              {activeCount} ativo{activeCount > 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div className="overflow-y-auto max-h-[350px]">
          {!hasContent && (
            <div className="px-3 py-6 text-center text-[11px] text-zinc-400">
              Nenhum processamento recente
            </div>
          )}

          {/* Active Jobs */}
          {activeJobs.length > 0 && (
            <div>
              <div className="px-3 pt-2 pb-1">
                <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                  Em andamento
                </span>
              </div>
              {activeJobs.map((job) => (
                <JobItem key={job.id} job={job} />
              ))}
            </div>
          )}

          {/* Recent Jobs */}
          {recentJobs.length > 0 && (
            <div>
              <div className="px-3 pt-2 pb-1">
                <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                  Recentes
                </span>
              </div>
              {recentJobs.map((job) => (
                <JobItem key={job.id} job={job} />
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
