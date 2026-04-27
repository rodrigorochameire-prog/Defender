import { ArrowRightLeft, Forward, Eye, StickyNote, HelpCircle, type LucideIcon } from "lucide-react";

export type EncaminhamentoTipo = "transferir" | "encaminhar" | "acompanhar" | "anotar" | "parecer";

export interface TipoMeta {
  label: string;
  Icon: LucideIcon;
  colorBar: string;
  chipBg: string;
  chipText: string;
  hint: string;
}

export const TIPO_META: Record<EncaminhamentoTipo, TipoMeta> = {
  transferir: {
    label: "Transferir",
    Icon: ArrowRightLeft,
    colorBar: "bg-indigo-600",
    chipBg: "bg-indigo-50 dark:bg-indigo-950/40",
    chipText: "text-indigo-700 dark:text-indigo-300",
    hint: "Passa a titularidade",
  },
  encaminhar: {
    label: "Encaminhar",
    Icon: Forward,
    colorBar: "bg-sky-600",
    chipBg: "bg-sky-50 dark:bg-sky-950/40",
    chipText: "text-sky-700 dark:text-sky-300",
    hint: "Só pra ciência",
  },
  acompanhar: {
    label: "Acompanhar",
    Icon: Eye,
    colorBar: "bg-violet-600",
    chipBg: "bg-violet-50 dark:bg-violet-950/40",
    chipText: "text-violet-700 dark:text-violet-300",
    hint: "Me inclui como observador",
  },
  anotar: {
    label: "Anotar",
    Icon: StickyNote,
    colorBar: "bg-stone-500",
    chipBg: "bg-stone-50 dark:bg-stone-900/40",
    chipText: "text-stone-700 dark:text-stone-300",
    hint: "Post-it na demanda",
  },
  parecer: {
    label: "Parecer",
    Icon: HelpCircle,
    colorBar: "bg-rose-600",
    chipBg: "bg-rose-50 dark:bg-rose-950/40",
    chipText: "text-rose-700 dark:text-rose-300",
    hint: "Pergunta ao colega",
  },
};
