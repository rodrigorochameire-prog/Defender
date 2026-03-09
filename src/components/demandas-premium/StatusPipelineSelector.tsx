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
  variant: "dropdown" | "sheet";
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
  const pillsRef = useRef<HTMLDivElement>(null);

  // Click-outside
  useEffect(() => {
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
  }, [onClose]);

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const stage = PIPELINE_STAGES[activeStage];
  const stageColor = STATUS_GROUPS[stage.key]?.color || "#A1A1AA";

  // Get substatuses for active stage
  const options = Object.entries(DEMANDA_STATUS)
    .filter(([, v]) => v.group === stage.key)
    .map(([key, v]) => ({ key, ...v }));

  const handleSelect = (status: string) => {
    onSelect(status);
    onClose();
  };

  const pillsContent = (
    <div ref={pillsRef} className="flex items-center gap-1 px-3 py-2.5 overflow-x-auto scrollbar-none">
      {PIPELINE_STAGES.map((s, i) => {
        const isActive = i === activeStage;
        const isCurrent = i === currentStageIdx;
        const color = STATUS_GROUPS[s.key]?.color || "#A1A1AA";
        return (
          <button
            key={s.key}
            onClick={(e) => { e.stopPropagation(); setActiveStage(i); }}
            className={`
              relative flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold
              transition-all duration-150 cursor-pointer whitespace-nowrap
              ${isActive
                ? "text-white shadow-sm scale-105"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 bg-zinc-100/80 dark:bg-zinc-800/60 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/60"
              }
            `}
            style={isActive ? { backgroundColor: color } : undefined}
          >
            {s.short}
            {isCurrent && !isActive && (
              <span
                className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                style={{ backgroundColor: color }}
              />
            )}
          </button>
        );
      })}
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
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 p-1 -mr-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Pipeline pills */}
          {pillsContent}

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
  // Calculate position from anchor
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
    // Fallback: render inline (will be positioned by parent)
    return (
      <div
        ref={ref}
        className="absolute top-full right-0 mt-2 w-[260px] bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl shadow-xl z-50 overflow-hidden"
        style={{ animation: "fadeInDown 0.15s ease-out" }}
      >
        {pillsContent}
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
        {pillsContent}
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
