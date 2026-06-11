/**
 * Normaliza timestamp + coluna horario para o instante local America/Bahia.
 *
 * Motivo: timestamps de agenda existem no banco em três formatos (hora local
 * crua lida como UTC, UTC verdadeiro, e meia-noite local com a hora apenas na
 * coluna `horario`). A coluna `horario` é a fonte da verdade de exibição em
 * todo o OMBUDS — aqui também. A data local é derivada de ts−3h, que produz o
 * dia certo nos três formatos.
 */

const TRES_HORAS = 3 * 3600_000;

export function combinarDataHorario(
  ts: Date,
  horario: string | null | undefined,
  fallback = "08:30",
): Date {
  const local = new Date(ts.getTime() - TRES_HORAS);
  const dia = local.toISOString().slice(0, 10);

  let hhmm: string;
  if (horario && /^\d{1,2}:\d{2}/.test(horario)) {
    hhmm = horario.slice(0, 5).padStart(5, "0");
  } else {
    const horaDerivada = local.toISOString().slice(11, 16);
    hhmm = horaDerivada !== "00:00" ? horaDerivada : fallback;
  }
  return new Date(`${dia}T${hhmm}:00-03:00`);
}
