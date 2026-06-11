/**
 * Serializador iCalendar (RFC 5545) para os feeds de agenda do OMBUDS.
 * Puro — sem banco, sem rede. Consumido pela rota /api/ics/[slug].
 *
 * Regras que importam para o Outlook/Exchange:
 *  - CRLF obrigatório e line folding em 75 octetos (UTF-8);
 *  - VTIMEZONE embutido (America/Bahia, UTC-3 fixo, sem DST desde 2019);
 *  - cancelamento via STATUS:CANCELLED no próprio feed (o evento some do
 *    calendário assinado na próxima atualização);
 *  - UID estável por linha do banco — é a chave de reconciliação do Exchange.
 */

export interface EventoICS {
  /** ex.: "audiencia-123@ombuds.app" — NUNCA mudar para a mesma linha */
  uid: string;
  titulo: string;
  descricao?: string;
  local?: string;
  /** Date (com hora, fuso local America/Bahia) ou "yyyy-MM-dd" para allDay */
  inicio: Date | string;
  fim?: Date | string;
  allDay?: boolean;
  cancelado?: boolean;
  atualizadoEm?: Date | null;
}

const TZID = "America/Bahia";

function escapar(texto: string): string {
  return texto
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Dobra uma linha lógica em linhas físicas de até 75 octetos (continuação = espaço). */
function dobrar(linha: string): string[] {
  const out: string[] = [];
  let atual = "";
  let bytes = 0;
  const limite = (primeira: boolean) => (primeira ? 75 : 74); // continuação gasta 1 no espaço
  for (const ch of linha) {
    const b = Buffer.byteLength(ch, "utf8");
    if (bytes + b > limite(out.length === 0)) {
      out.push(out.length === 0 ? atual : ` ${atual}`);
      atual = ch;
      bytes = b;
    } else {
      atual += ch;
      bytes += b;
    }
  }
  out.push(out.length === 0 ? atual : ` ${atual}`);
  return out;
}

function dtLocal(d: Date): string {
  // Hora civil de America/Bahia (UTC-3 fixo)
  const local = new Date(d.getTime() - 3 * 3600_000);
  return local.toISOString().slice(0, 19).replace(/[-:]/g, "").replace("T", "T");
}

function dtUtc(d: Date): string {
  return d.toISOString().slice(0, 19).replace(/[-:]/g, "") + "Z";
}

function soData(v: Date | string): string {
  if (typeof v === "string") return v.replace(/-/g, "").slice(0, 8);
  return dtLocal(v).slice(0, 8);
}

function diaSeguinte(yyyymmdd: string): string {
  const d = new Date(
    `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}T00:00:00Z`,
  );
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

export function serializarICS(params: { nome: string; eventos: EventoICS[] }): string {
  const linhas: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//OMBUDS//Agenda DPE-BA//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapar(params.nome)}`,
    `X-WR-TIMEZONE:${TZID}`,
    "BEGIN:VTIMEZONE",
    `TZID:${TZID}`,
    "BEGIN:STANDARD",
    "DTSTART:19700101T000000",
    "TZOFFSETFROM:-0300",
    "TZOFFSETTO:-0300",
    "TZNAME:-03",
    "END:STANDARD",
    "END:VTIMEZONE",
  ];

  for (const ev of params.eventos) {
    linhas.push("BEGIN:VEVENT");
    linhas.push(`UID:${ev.uid}`);
    const stamp = ev.atualizadoEm ?? new Date();
    linhas.push(`DTSTAMP:${dtUtc(stamp)}`);
    if (ev.atualizadoEm) linhas.push(`LAST-MODIFIED:${dtUtc(ev.atualizadoEm)}`);
    if (ev.allDay) {
      const ini = soData(ev.inicio);
      linhas.push(`DTSTART;VALUE=DATE:${ini}`);
      linhas.push(`DTEND;VALUE=DATE:${ev.fim ? soData(ev.fim) : diaSeguinte(ini)}`);
    } else {
      const ini = typeof ev.inicio === "string" ? new Date(ev.inicio) : ev.inicio;
      const fim = ev.fim
        ? typeof ev.fim === "string"
          ? new Date(ev.fim)
          : ev.fim
        : new Date(ini.getTime() + 3600_000);
      linhas.push(`DTSTART;TZID=${TZID}:${dtLocal(ini)}`);
      linhas.push(`DTEND;TZID=${TZID}:${dtLocal(fim)}`);
    }
    linhas.push(`SUMMARY:${escapar(ev.titulo)}`);
    if (ev.descricao) linhas.push(`DESCRIPTION:${escapar(ev.descricao)}`);
    if (ev.local) linhas.push(`LOCATION:${escapar(ev.local)}`);
    linhas.push(`STATUS:${ev.cancelado ? "CANCELLED" : "CONFIRMED"}`);
    if (ev.cancelado) linhas.push("TRANSP:TRANSPARENT");
    linhas.push("END:VEVENT");
  }

  linhas.push("END:VCALENDAR");
  return linhas.flatMap(dobrar).join("\r\n") + "\r\n";
}
