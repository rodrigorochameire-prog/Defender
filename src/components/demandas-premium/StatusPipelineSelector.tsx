"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Check, X } from "lucide-react";
import {
  PIPELINE_STAGES,
  STATUS_GROUPS,
  DEMANDA_STATUS,
  getStageIndex,
  type StatusGroup,
} from "@/config/demanda-status";

interface StatusPipelineSelectorProps {
  currentStatus: string;
  onSelect: (status: string) => void;
  onClose: () => void;
  variant: "dropdown" | "sheet" | "inline";
  /** For dropdown: anchor element to position relative to */
  anchorRef?: React.RefObject<HTMLElement | null>;
}

export function StatusPipelineSelector({
  currentStatus,
  onSelect,
  onClose,
  variant,
  anchorRef,
}: StatusPipelineSelectorProps) {
  const normalizedCurrent = currentStatus.toLowerCase().replace(/\s+/g, "_");
  const currentConfig = DEMANDA_STATUS[normalizedCurrent];
  const currentGroup = currentConfig?.group || "triagem";
  const currentStageIdx = getStageIndex(currentGroup);

  const [activeStage, setActiveStage] = useState(currentStageIdx >= 0 ? currentStageIdx : 0);
  const ref = useRef<HTMLDivElement>(null);

  // Click-outside (not needed for inline)
  useEffect(() => {
    if (variant === "inline") return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handler);
      document.addEventListener("touchstart", handler, { passive: true });
    }, 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [onClose, variant]);

  // Escape key (not needed for inline)
  useEffect(() => {
    if (variant === "inline") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, variant]);

  const stage = PIPELINE_STAGES[activeStage];
  const stageColor = STATUS_GROUPS[stage.key]?.color || "#A1A1AA";

  // Get substatuses for active stage
  const options = Object.entries(DEMANDA_STATUS)
    .filter(([, v]) => v.group === stage.key)
    .map(([key, v]) => ({ key, ...v }));

  const handleSelect = (status: string) => {
    onSelect(status);
    if (variant !== "inline") onClose();
  };

  // ---- Mini stepper with circles (matches QuickPreview visual) ----
  const stepperContent = (
    <div className="px-4 py-3">
      <div className="relative flex items-center">
        {/* Background track */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-zinc-200 dark:bg-zinc-700/60 rounded-full" />
        {/* Filled track (neutral gray) */}
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] rounded-full transition-all duration-300 bg-zinc-300 dark:bg-zinc-600"
          style={{
            width: currentStageIdx >= 0 ? `${(currentStageIdx / (PIPELINE_STAGES.length - 1)) * 100}%` : "0%",
          }}
        />
        {/* Stage nodes */}
        {PIPELINE_STAGES.map((s, i) => {
          const isViewing = i === activeStage;
          const isCurrent = i === currentStageIdx;
          const isCompleted = i < currentStageIdx;
          const color = STATUS_GROUPS[s.key]?.color || "#A1A1AA";
          return (
            <button
              key={s.key}
              onClick={(e) => { e.stopPropagation(); setActiveStage(i); }}
              className={`relative z-10 flex flex-col items-center cursor-pointer group/node transition-all ${
                i === 0 ? "" : "flex-1"
              }`}
              title={s.label}
            >
              {/* Circle */}
              <div
                className={`flex items-center justify-center rounded-full transition-all duration-200 ${
                  isCurrent
                    ? "w-5 h-5 ring-2 ring-offset-1 dark:ring-offset-zinc-900"
                    : isCompleted
                      ? "w-4 h-4"
                      : isViewing
                        ? "w-4 h-4 ring-2 ring-offset-1 dark:ring-offset-zinc-900"
                        : "w-3.5 h-3.5 group-hover/node:w-4 group-hover/node:h-4"
                }`}
                style={{
                  backgroundColor: isCurrent ? color : isCompleted ? "#a1a1aa" : isViewing ? `${color}80` : "#e4e4e7",
                  ['--tw-ring-color' as any]: (isCurrent || isViewing) ? `${color}40` : undefined,
                }}
              >
                {isCompleted && <Check className="w-2.5 h-2.5 text-white/80" />}
                {isCurrent && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              {/* Label */}
              <span
                className={`mt-1 text-[9px] font-medium whitespace-nowrap transition-colors ${
                  isCurrent || isViewing ? "font-bold" : "text-zinc-400 dark:text-zinc-500"
                }`}
                style={{ color: isCurrent || isViewing ? color : undefined }}
              >
                {s.short}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const optionsContent = (
    <div className="py-1">
      {options.map((opt) => {
        const isActive = opt.key === normalizedCurrent;
        const Icon = opt.icon;
        return (
          <button
            key={opt.key}
            onClick={(e) => { e.stopPropagation(); handleSelect(opt.key); }}
            className={`
              w-full px-3 py-2 flex items-center gap-2.5 text-left
              transition-colors duration-100 cursor-pointer
              ${isActive
                ? "bg-emerald-50/80 dark:bg-emerald-950/20"
                : "hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
              }
            `}
          >
            <span className="shrink-0" style={{ color: isActive ? stageColor : `${stageColor}80` }}>
              <Icon className="w-3.5 h-3.5" />
            </span>
            <span
              className={`text-xs flex-1 ${
                isActive
                  ? "font-bold text-zinc-900 dark:text-zinc-100"
                  : "font-medium text-zinc-600 dark:text-zinc-400"
              }`}
            >
              {opt.label}
            </span>
            {isActive && (
              <Check className="w-3.5 h-3.5 shrink-0" style={{ color: stageColor }} />
            )}
          </button>
        );
      })}
    </div>
  );

  // ====== INLINE variant (embedded, no portal) ======
  if (variant === "inline") {
    return (
      <div className="rounded-xl bg-zinc-50/80 dark:bg-zinc-800/30 border border-zinc-200/60 dark:border-zinc-700/40 overflow-hidden">
        {stepperContent}
        <div className="mx-3 h-px" style={{ backgroundColor: `${stageColor}30` }} />
        {optionsContent}
      </div>
    );
  }

  // ====== SHEET variant (mobile bottom sheet) ======
  if (variant === "sheet") {
    return createPortal(
      <div className="fixed inset-0 z-[999]">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/20 dark:bg-black/40" onClick={onClose} />
        {/* Sheet */}
        <div
          ref={ref}
          className="absolute inset-x-3 bottom-3 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
          style={{ animation: "fadeInUp 0.15s ease-out", maxHeight: "70vh" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
            <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wide">
              Alterar Status
            </h4>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 p-1 -mr-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Pipeline stepper */}
          {stepperContent}

          {/* Divider with stage color accent */}
          <div className="mx-3 h-px" style={{ backgroundColor: `${stageColor}30` }} />

          {/* Status options */}
          <div className="max-h-[40vh] overflow-y-auto">
            {optionsContent}
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // ====== DROPDOWN variant (desktop) ======
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    if (variant === "dropdown" && anchorRef?.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [variant, anchorRef]);

  if (variant === "dropdown" && !pos) {
    return (
      <div
        ref={ref}
        className="absolute top-full right-0 mt-2 w-[260px] bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl shadow-xl z-50 overflow-hidden"
        style={{ animation: "fadeInDown 0.15s ease-out" }}
      >
        {stepperContent}
        <div className="mx-3 h-px" style={{ backgroundColor: `${stageColor}30` }} />
        <div className="max-h-64 overflow-y-auto">
          {optionsContent}
        </div>
      </div>
    );
  }

  if (variant === "dropdown" && pos) {
    return createPortal(
      <div
        ref={ref}
        className="fixed w-[260px] bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl shadow-xl z-[9999] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
        style={{ top: pos.top, right: pos.right }}
      >
        {stepperContent}
        <div className="mx-3 h-px" style={{ backgroundColor: `${stageColor}30` }} />
        <div className="max-h-64 overflow-y-auto">
          {optionsContent}
        </div>
      </div>,
      document.body
    );
  }

  return null;
}
