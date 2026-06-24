/**
 * Single source of truth for WhatsApp tag semantics (label + discrete colour).
 *
 * The redesign rebaixa tags from loud coloured pills to a discrete micro-dot,
 * so the *only* colour token a row needs is `dotClass`. The full surface colours
 * (bg/text) remain available for the filter popover / active-filter badge, where
 * a readable label is appropriate.
 */

export interface TagSurface {
  bg: string;
  text: string;
  dot: string;
}

const TAG_SURFACES: Record<string, TagSurface> = {
  urgente: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", dot: "bg-red-500" },
  juri: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-400", dot: "bg-purple-500" },
  execucao: { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-400", dot: "bg-orange-500" },
  aguardando_documento: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500" },
  informativo: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400", dot: "bg-blue-500" },
  diligencia: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500" },
};

const TAG_LABELS: Record<string, string> = {
  urgente: "Urgente",
  aguardando_documento: "Aguardando Doc",
  informativo: "Informativo",
  juri: "Júri",
  execucao: "Execução",
  diligencia: "Diligência",
};

const NEUTRAL_SURFACE: TagSurface = {
  bg: "bg-neutral-100 dark:bg-muted",
  text: "text-neutral-600 dark:text-muted-foreground",
  dot: "bg-neutral-400",
};

/** Predefined tags, in display order, for the filter popover. */
export const PREDEFINED_TAGS = [
  "urgente",
  "aguardando_documento",
  "informativo",
  "juri",
  "execucao",
  "diligencia",
] as const;

export function tagSurface(tag: string): TagSurface {
  return TAG_SURFACES[tag] ?? NEUTRAL_SURFACE;
}

export function tagLabel(tag: string): string {
  return (
    TAG_LABELS[tag] ??
    tag.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export interface TagVisual {
  label: string;
  dotClass: string;
}

/** Discrete representation for an in-row tag: just a readable label + dot colour. */
export function tagVisual(tag: string): TagVisual {
  return { label: tagLabel(tag), dotClass: tagSurface(tag).dot };
}
