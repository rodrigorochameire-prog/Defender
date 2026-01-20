"use client";

import { useMemo, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { EntityLink } from "@/components/shared/entity-link";

export type MentionType = "pessoa" | "documento" | "fato";

export interface MentionSuggestion {
  id: string;
  label: string;
  type: MentionType;
}

const triggerToType: Record<string, MentionType> = {
  "@": "pessoa",
  "#": "documento",
  "$": "fato",
};

function getTriggerMatch(value: string, cursor: number) {
  const before = value.slice(0, cursor);
  const match = /([@#$])([^@#$\n]*)$/.exec(before);
  if (!match) return null;
  return {
    trigger: match[1],
    query: match[2].trim(),
    index: match.index,
  };
}

export function renderMentions(text: string) {
  const parts: React.ReactNode[] = [];
  const regex = /([@#$])\{([^}]+)\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={`${lastIndex}-text`}>{text.slice(lastIndex, match.index)}</span>);
    }
    const type = triggerToType[match[1]] || "pessoa";
    parts.push(<EntityLink key={`${match.index}-mention`} type={type} name={match[2]} />);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(<span key={`${lastIndex}-tail`}>{text.slice(lastIndex)}</span>);
  }

  return parts;
}

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: MentionSuggestion[];
  placeholder?: string;
  className?: string;
}

export function MentionTextarea({
  value,
  onChange,
  suggestions,
  placeholder,
  className,
}: MentionTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [activeMatch, setActiveMatch] = useState<ReturnType<typeof getTriggerMatch> | null>(null);

  const filteredSuggestions = useMemo(() => {
    if (!activeMatch) return [];
    const type = triggerToType[activeMatch.trigger];
    const query = activeMatch.query.toLowerCase();
    return suggestions.filter((item) => {
      if (item.type !== type) return false;
      if (!query) return true;
      return item.label.toLowerCase().includes(query);
    });
  }, [activeMatch, suggestions]);

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextValue = event.target.value;
    onChange(nextValue);

    const cursor = event.target.selectionStart || 0;
    const match = getTriggerMatch(nextValue, cursor);
    if (!match) {
      setActiveMatch(null);
      return;
    }
    setActiveMatch(match);
  };

  const handleSelect = (item: MentionSuggestion) => {
    if (!activeMatch || !textareaRef.current) return;
    const cursor = textareaRef.current.selectionStart || 0;
    const before = value.slice(0, activeMatch.index);
    const after = value.slice(cursor);
    const token = `${activeMatch.trigger}{${item.label}}`;
    const nextValue = `${before}${token}${after}`;
    onChange(nextValue);
    setActiveMatch(null);
    requestAnimationFrame(() => {
      const position = before.length + token.length;
      textareaRef.current?.setSelectionRange(position, position);
      textareaRef.current?.focus();
    });
  };

  return (
    <div className="space-y-2">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={cn("min-h-[140px]", className)}
      />
      {activeMatch && filteredSuggestions.length > 0 && (
        <div className="rounded-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-950 p-2">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-2">
            Sugestões
          </p>
          <div className="space-y-1">
            {filteredSuggestions.map((item) => (
              <button
                key={item.id}
                type="button"
                className="w-full text-left text-sm px-2 py-1 rounded-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => handleSelect(item)}
              >
                <span className="text-xs uppercase tracking-[0.2em] text-slate-400 mr-2">
                  {item.type}
                </span>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Use @ para pessoas, # para documentos e $ para fatos.
      </p>
    </div>
  );
}
