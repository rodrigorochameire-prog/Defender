import {
  Users,
  MapPin,
  StickyNote,
  CheckSquare,
  Send,
  BookOpen,
  Pen,
  FileSignature,
  Eye,
  Search,
  Microscope,
  ArrowRightLeft,
  type LucideIcon,
} from "lucide-react";

export type TipoRegistro =
  | "atendimento"
  | "diligencia"
  | "anotacao"
  | "ciencia"
  | "providencia"
  | "delegacao"
  | "pesquisa"
  | "elaboracao"
  | "peticao"
  // Busca de dados externos (Google, redes sociais, fontes públicas).
  // Distinta de pesquisa (jurídica) e investigacao (hipóteses defensivas).
  | "busca"
  // Linhas de investigação defensiva, contraprova, hipóteses, contradições.
  | "investigacao"
  // Transferência definitiva do caso para outro defensor (distinta da
  // delegação, que é só atribuir uma tarefa pontual).
  | "transferencia";

export interface TipoConfig {
  label: string;
  shortLabel: string;
  color: string; // hex pra style inline (ring-color etc)
  bg: string; // tw class — background do chip
  text: string; // tw class — texto do chip
  Icon: LucideIcon;
}

export const REGISTRO_TIPOS: Record<TipoRegistro, TipoConfig> = {
  atendimento: {
    label: "Atendimento",
    shortLabel: "Atend.",
    color: "#10b981",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    text: "text-emerald-700 dark:text-emerald-400",
    Icon: Users,
  },
  diligencia: {
    label: "Diligência",
    shortLabel: "Dilig.",
    color: "#f59e0b",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-700 dark:text-amber-400",
    Icon: MapPin,
  },
  anotacao: {
    label: "Anotação",
    shortLabel: "Anot.",
    color: "#64748b",
    bg: "bg-slate-50 dark:bg-slate-900/40",
    text: "text-slate-700 dark:text-slate-400",
    Icon: StickyNote,
  },
  ciencia: {
    // Tomada de ciência de ato processual (intimação, decisão, acórdão).
    // Distinto de Anotação (livre) e Providência (decisão a tomar).
    label: "Ciência",
    shortLabel: "Ciência",
    color: "#0891b2",
    bg: "bg-cyan-50 dark:bg-cyan-950/30",
    text: "text-cyan-700 dark:text-cyan-400",
    Icon: Eye,
  },
  providencia: {
    label: "Providência",
    shortLabel: "Prov.",
    color: "#3b82f6",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    text: "text-blue-700 dark:text-blue-400",
    Icon: CheckSquare,
  },
  delegacao: {
    label: "Delegação",
    shortLabel: "Deleg.",
    color: "#a855f7",
    bg: "bg-purple-50 dark:bg-purple-950/30",
    text: "text-purple-700 dark:text-purple-400",
    Icon: Send,
  },
  pesquisa: {
    label: "Pesquisa",
    shortLabel: "Pesq.",
    color: "#6366f1",
    bg: "bg-indigo-50 dark:bg-indigo-950/30",
    text: "text-indigo-700 dark:text-indigo-400",
    Icon: BookOpen,
  },
  elaboracao: {
    label: "Elaboração",
    shortLabel: "Elab.",
    color: "#8b5cf6",
    bg: "bg-violet-50 dark:bg-violet-950/30",
    text: "text-violet-700 dark:text-violet-400",
    Icon: Pen,
  },
  peticao: {
    // Registra o que foi sustentado/protocolado em uma peça (distinto de
    // Providência = decisão a tomar, e Elaboração = rascunho/escrita).
    label: "Petição",
    shortLabel: "Petição",
    color: "#0ea5e9",
    bg: "bg-sky-50 dark:bg-sky-950/30",
    text: "text-sky-700 dark:text-sky-400",
    Icon: FileSignature,
  },
  busca: {
    label: "Busca",
    shortLabel: "Busca",
    color: "#0d9488",
    bg: "bg-teal-50 dark:bg-teal-950/30",
    text: "text-teal-700 dark:text-teal-400",
    Icon: Search,
  },
  investigacao: {
    label: "Investigação",
    shortLabel: "Invest.",
    color: "#dc2626",
    bg: "bg-red-50 dark:bg-red-950/30",
    text: "text-red-700 dark:text-red-400",
    Icon: Microscope,
  },
  transferencia: {
    label: "Transferência",
    shortLabel: "Transf.",
    color: "#9333ea",
    bg: "bg-fuchsia-50 dark:bg-fuchsia-950/30",
    text: "text-fuchsia-700 dark:text-fuchsia-400",
    Icon: ArrowRightLeft,
  },
};

export const TIPO_KEYS = Object.keys(REGISTRO_TIPOS) as TipoRegistro[];
