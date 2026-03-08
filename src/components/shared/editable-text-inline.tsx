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
  /** Enable multiline editing with textarea instead of input */
  multiline?: boolean;
}

export function EditableTextInline({
  value,
  onSave,
  placeholder = "Adicionar...",
  className,
  inputClassName,
  activateOnDoubleClick = false,
  showEditIcon = false,
  multiline = false,
}: EditableTextInlineProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [temp, setTemp] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing) {
      const el = multiline ? textareaRef.current : inputRef.current;
      if (el) {
        el.focus();
        // Move cursor to end
        const len = el.value.length;
        el.setSelectionRange(len, len);
      }
    }
  }, [isEditing, multiline]);

  // Auto-resize textarea
  useEffect(() => {
    if (isEditing && multiline && textareaRef.current) {
      const ta = textareaRef.current;
      ta.style.height = "auto";
      ta.style.height = ta.scrollHeight + "px";
    }
  }, [isEditing, multiline, temp]);

  const startEditing = () => {
    setTemp(value);
    setIsEditing(true);
  };

  const save = () => {
    onSave(temp);
    setIsEditing(false);
  };

  if (isEditing) {
    if (multiline) {
      return (
        <textarea
          ref={textareaRef}
          value={temp}
          onChange={(e) => setTemp(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Escape") { setTemp(value); setIsEditing(false); }
            // Enter sem Shift salva (Shift+Enter = nova linha)
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); save(); }
          }}
          className={inputClassName || "w-full text-sm px-2.5 py-2 rounded-lg border border-emerald-400 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-400/50 resize-none"}
          placeholder={placeholder}
          rows={3}
        />
      );
    }

    return (
      <input
        ref={inputRef}
        type="text"
        value={temp}
        onChange={(e) => setTemp(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); save(); }
          if (e.key === "Escape") { setTemp(value); setIsEditing(false); }
        }}
        className={inputClassName || "w-full text-[11px] px-1.5 py-0.5 rounded border border-emerald-400 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-400/50"}
        placeholder={placeholder}
      />
    );
  }

  // Display mode
  const defaultDisplayClass = multiline
    ? "cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded-lg px-2.5 py-2 transition-colors group/edit"
    : "cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded px-1.5 py-0.5 -mx-1.5 transition-colors truncate flex items-center gap-1 group/edit";

  return (
    <div
      data-edit-trigger
      onClick={activateOnDoubleClick && !showEditIcon ? undefined : startEditing}
      onDoubleClick={activateOnDoubleClick && !showEditIcon ? startEditing : undefined}
      className={className || defaultDisplayClass}
    >
      {value ? (
        multiline ? (
          <span className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap break-words">
            {value}
          </span>
        ) : (
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">{value}</span>
        )
      ) : (
        <span className={`${multiline ? "text-sm" : "text-[11px]"} text-zinc-400 dark:text-zinc-500 italic`}>
          {placeholder}
        </span>
      )}
      {showEditIcon && (
        <Pencil className="w-2.5 h-2.5 text-zinc-400 opacity-40 group-hover/edit:opacity-100 transition-opacity flex-shrink-0" />
      )}
    </div>
  );
}
