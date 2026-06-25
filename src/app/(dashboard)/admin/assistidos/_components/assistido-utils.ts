import { differenceInDays, differenceInYears, parseISO } from "date-fns";
import { AssistidoUI } from "./assistido-types";
import { calcularPrazo, prazoTextoCurto, type PrazoCor } from "@/lib/prazo";

/** Classes de cor/fundo por severidade canônica (escala de litígio). */
const PRAZO_CLASSES: Record<PrazoCor, { color: string; bgColor: string }> = {
  red: { color: "text-rose-600", bgColor: "bg-rose-50" },
  amber: { color: "text-amber-600", bgColor: "bg-amber-50" },
  green: { color: "text-sky-600", bgColor: "bg-sky-50/50" },
  gray: { color: "text-muted-foreground", bgColor: "" },
};

/** Compute completude score (0-100) for a single assistido */
export function computeCompletude(a: AssistidoUI): number {
  let score = 0;
  if (a.cpf) score += 20;
  if (a.telefone || a.telefoneContato) score += 15;
  if (a.endereco) score += 15;
  if (a.driveFolderId) score += 20;
  if (a.numeroProcesso || a.processoPrincipal) score += 15;
  if (a.observacoes) score += 15;
  return score;
}

export function getPrazoInfo(prazoStr: string | null) {
  const sev = calcularPrazo(prazoStr);
  if (!sev) return null;
  const { color, bgColor } = PRAZO_CLASSES[sev.cor];
  return {
    text: sev.dias < 0 ? "Vencido" : prazoTextoCurto(sev.dias),
    urgent: sev.nivel !== "tranquilo",
    color,
    bgColor,
  };
}

export function calcularIdade(dataNascimento: string | null | undefined) {
  if (!dataNascimento) return null;
  try {
    const data = parseISO(dataNascimento);
    if (isNaN(data.getTime())) return null;
    return differenceInYears(new Date(), data);
  } catch {
    return null;
  }
}

export function calcularTempoPreso(dataPrisao: string | null) {
  if (!dataPrisao) return null;
  const dias = differenceInDays(new Date(), parseISO(dataPrisao));
  const anos = Math.floor(dias / 365);
  const meses = Math.floor((dias % 365) / 30);
  if (anos > 0) return `${anos}a ${meses}m`;
  if (meses > 0) return `${meses}m`;
  return `${dias}d`;
}
