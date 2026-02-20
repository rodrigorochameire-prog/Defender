"use client";

import { useState, useRef, useEffect } from "react";
import { Pencil } from "lucide-react";

interface EditableTextInlineProps {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  activateOnDoubleClick?: boolean;
  /** Show a persistent Pencil icon that activates editing on single click */
  showEditIcon?: boolean;
}

export function EditableTextInline({
  value,
  onSave,
  placeholder = "Adicionar...",
  className,
  inputClassName,
  activateOnDoubleClick = false,
  showEditIcon = false,
}: EditableTextInlineProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [temp, setTemp] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && ref.current) {
      ref.current.focus();
      ref.current.select();
    }
  }, [isEditing]);

  const startEditing = () => {
    setTemp(value);
    setIsEditing(true);
  };

  if (isEditing) {
    return (
      <input
        ref={ref}
        type="text"
        value={temp}
        onChange={(e) => setTemp(e.target.value)}
        onBlur={() => { onSave(temp); setIsEditing(false); }}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); onSave(temp); setIsEditing(false); }
          if (e.key === "Escape") { setTemp(value); setIsEditing(false); }
        }}
        className={inputClassName || "w-full text-[11px] px-1.5 py-0.5 rounded border border-emerald-400 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-400/50"}
        placeholder={placeholder}
      />
    );
  }

  return (
    <div
      onClick={activateOnDoubleClick && !showEditIcon ? undefined : startEditing}
      onDoubleClick={activateOnDoubleClick && !showEditIcon ? startEditing : undefined}
      className={className || "cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded px-1.5 py-0.5 -mx-1.5 transition-colors truncate flex items-center gap-1 group/edit"}
    >
      {value ? (
        <span className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">{value}</span>
      ) : (
        <span className="text-[11px] text-zinc-400 dark:text-zinc-500 italic">{placeholder}</span>
      )}
      {showEditIcon && (
        <Pencil className="w-2.5 h-2.5 text-zinc-400 opacity-40 group-hover/edit:opacity-100 transition-opacity flex-shrink-0" />
      )}
    </div>
  );
}
