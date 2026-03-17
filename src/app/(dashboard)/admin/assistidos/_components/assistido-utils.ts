import { differenceInDays, differenceInYears, parseISO } from "date-fns";

export function getPrazoInfo(prazoStr: string | null) {
  if (!prazoStr) return null;
  const dias = differenceInDays(parseISO(prazoStr), new Date());
  if (dias < 0) return { text: "Vencido", urgent: true, color: "text-rose-600", bgColor: "bg-rose-50" };
  if (dias === 0) return { text: "Hoje", urgent: true, color: "text-rose-600", bgColor: "bg-rose-50" };
  if (dias === 1) return { text: "Amanha", urgent: true, color: "text-amber-600", bgColor: "bg-amber-50" };
  if (dias <= 3) return { text: `${dias}d`, urgent: true, color: "text-amber-500", bgColor: "bg-amber-50/50" };
  if (dias <= 7) return { text: `${dias}d`, urgent: false, color: "text-sky-600", bgColor: "bg-sky-50/50" };
  return { text: `${dias}d`, urgent: false, color: "text-muted-foreground", bgColor: "" };
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
