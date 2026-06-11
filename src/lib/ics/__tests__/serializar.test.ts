import { describe, it, expect } from "vitest";
import { serializarICS, type EventoICS } from "../serializar";

const BASE: EventoICS = {
  uid: "audiencia-123@ombuds.app",
  titulo: "Depoimento Especial – Maria da Silva – 8001234-56.2026.8.05.0039",
  inicio: new Date("2026-07-15T09:15:00-03:00"),
};

describe("serializarICS", () => {
  it("gera VCALENDAR com nome, timezone e CRLF", () => {
    const ics = serializarICS({ nome: "Vara do Júri (audiências)", eventos: [BASE] });
    expect(ics).toContain("BEGIN:VCALENDAR\r\n");
    expect(ics).toContain("X-WR-CALNAME:Vara do Júri (audiências)\r\n");
    expect(ics).toContain("BEGIN:VTIMEZONE");
    expect(ics).toContain("TZID:America/Bahia");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).not.toMatch(/(?<!\r)\n/); // toda quebra é CRLF
  });

  it("evento com hora usa TZID local e fim default de 1h", () => {
    const ics = serializarICS({ nome: "x", eventos: [BASE] });
    expect(ics).toContain("UID:audiencia-123@ombuds.app");
    expect(ics).toContain("DTSTART;TZID=America/Bahia:20260715T091500");
    expect(ics).toContain("DTEND;TZID=America/Bahia:20260715T101500");
  });

  it("escapa vírgula, ponto-e-vírgula e quebra de linha em texto", () => {
    const ics = serializarICS({
      nome: "x",
      eventos: [{ ...BASE, descricao: "Vara: VVD; Camaçari, BA\nlink" }],
    });
    expect(ics).toContain("Vara: VVD\\; Camaçari\\, BA\\nlink");
  });

  it("evento de dia inteiro usa VALUE=DATE", () => {
    const ics = serializarICS({
      nome: "Prazos",
      eventos: [
        {
          uid: "demanda-prazo-9@ombuds.app",
          titulo: "Prazo: RA – João",
          inicio: "2026-08-01",
          allDay: true,
        },
      ],
    });
    expect(ics).toContain("DTSTART;VALUE=DATE:20260801");
    expect(ics).toContain("DTEND;VALUE=DATE:20260802");
  });

  it("evento cancelado sai STATUS:CANCELLED", () => {
    const ics = serializarICS({ nome: "x", eventos: [{ ...BASE, cancelado: true }] });
    expect(ics).toContain("STATUS:CANCELLED");
  });

  it("dobra linhas acima de 75 octetos com continuação por espaço", () => {
    const longo = "A".repeat(200);
    const ics = serializarICS({ nome: "x", eventos: [{ ...BASE, titulo: longo }] });
    const linhas = ics.split("\r\n");
    expect(linhas.every((l) => Buffer.byteLength(l, "utf8") <= 75)).toBe(true);
    expect(ics).toContain("\r\n A"); // continuação
  });
});
