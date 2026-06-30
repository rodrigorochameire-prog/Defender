"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, getInitials } from "@/lib/utils";
import {
  AVATAR_SIZE_CLASSES,
  AVATAR_TEXT_CLASSES,
  AVATAR_RADIUS_CLASSES,
  type AvatarSize,
} from "./assistido-avatar";

/**
 * Avatar unificado para PESSOAS do processo (testemunha, vítima, perito, etc.).
 *
 * Mesma estrutura visual do AssistidoAvatar (squircle, fundo neutro, anel + iniciais
 * na cor semântica), mas a cor vem do PAPEL — não da atribuição. Naturalmente menor
 * por padrão, pois aparece em locais densos (listas de partes, sheets).
 */
export interface PessoaAvatarProps {
  nome: string;
  /** Recorte "rosto" capturado do PDF — data URL base64 (pessoas.avatarDataUrl). */
  photoUrl?: string | null;
  /** Papel processual — define a cor semântica. */
  papel?: string | null;
  size?: AvatarSize;
  shape?: "squircle" | "circle";
  className?: string;
  onClick?: () => void;
}

type PapelTone = { from: string; to: string; text: string; ring: string; darkText: string };

// Fundo SEMPRE neutro; a identidade mora no anel + nas iniciais (mesma doutrina do
// AVATAR_GRADIENT_MAP). Cor por papel — vítima rose, testemunha blue, réu neutro.
const NEUTRAL_BG = { from: "from-neutral-50", to: "to-neutral-100", darkFrom: "dark:from-neutral-800/50", darkTo: "dark:to-neutral-800/40" } as const;

const PAPEL_AVATAR_MAP: Record<string, PapelTone> = {
  REU:        { ...NEUTRAL_BG, text: "text-neutral-500", ring: "ring-neutral-200/70 dark:ring-neutral-700/50", darkText: "dark:text-neutral-300" },
  CORREU:     { ...NEUTRAL_BG, text: "text-neutral-500", ring: "ring-neutral-200/70 dark:ring-neutral-700/50", darkText: "dark:text-neutral-300" },
  VITIMA:     { ...NEUTRAL_BG, text: "text-rose-700",    ring: "ring-rose-300/60 dark:ring-rose-700/40",       darkText: "dark:text-rose-300" },
  OFENDIDO:   { ...NEUTRAL_BG, text: "text-rose-700",    ring: "ring-rose-300/60 dark:ring-rose-700/40",       darkText: "dark:text-rose-300" },
  TESTEMUNHA: { ...NEUTRAL_BG, text: "text-blue-700",    ring: "ring-blue-300/60 dark:ring-blue-700/40",       darkText: "dark:text-blue-300" },
  ACUSACAO:     { ...NEUTRAL_BG, text: "text-rose-700",    ring: "ring-rose-300/60 dark:ring-rose-700/40",       darkText: "dark:text-rose-300" },
  DEFESA:       { ...NEUTRAL_BG, text: "text-emerald-700", ring: "ring-emerald-300/60 dark:ring-emerald-700/40", darkText: "dark:text-emerald-300" },
  INTERROGANDO: { ...NEUTRAL_BG, text: "text-emerald-700", ring: "ring-emerald-300/60 dark:ring-emerald-700/40", darkText: "dark:text-emerald-300" },
  INFORMANTE:   { ...NEUTRAL_BG, text: "text-neutral-500", ring: "ring-neutral-200/70 dark:ring-neutral-700/50", darkText: "dark:text-neutral-300" },
  PERITO:       { ...NEUTRAL_BG, text: "text-indigo-700",  ring: "ring-indigo-300/60 dark:ring-indigo-700/40",   darkText: "dark:text-indigo-300" },
};

const DEFAULT_TONE: PapelTone = { ...NEUTRAL_BG, text: "text-neutral-500", ring: "ring-neutral-200/70 dark:ring-neutral-700/50", darkText: "dark:text-neutral-300" };

function getPapelTone(papel?: string | null): PapelTone {
  if (!papel) return DEFAULT_TONE;
  return PAPEL_AVATAR_MAP[papel.toUpperCase()] ?? DEFAULT_TONE;
}

export function PessoaAvatar({
  nome,
  photoUrl,
  papel,
  size = "sm",
  shape = "squircle",
  className,
  onClick,
}: PessoaAvatarProps) {
  const initials = nome ? getInitials(nome) : "?";
  const tone = getPapelTone(papel);
  const radius = shape === "circle" ? "rounded-full" : AVATAR_RADIUS_CLASSES[size];

  return (
    <Avatar
      className={cn(
        "flex-shrink-0",
        AVATAR_SIZE_CLASSES[size],
        radius,
        "shadow-sm transition-all duration-200 ring-[1.5px] ring-inset",
        tone.ring,
        onClick && "cursor-pointer hover:scale-105 hover:shadow-md",
        className,
      )}
      onClick={onClick}
    >
      {photoUrl && <AvatarImage src={photoUrl} alt={nome} className="object-cover" />}
      <AvatarFallback
        className={cn(
          radius,
          "bg-gradient-to-br font-semibold",
          tone.from,
          tone.to,
          tone.text,
          NEUTRAL_BG.darkFrom,
          NEUTRAL_BG.darkTo,
          tone.darkText,
          AVATAR_TEXT_CLASSES[size],
        )}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
