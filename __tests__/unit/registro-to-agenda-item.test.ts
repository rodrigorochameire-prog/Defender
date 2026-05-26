// __tests__/unit/registro-to-agenda-item.test.ts
//
// Timezone note: test uses local datetime string "2026-05-28T14:30:00" (no Z suffix)
// so that date-fns format() returns predictable values regardless of runner timezone.
// Runner is America/Bahia (UTC-3); using UTC "Z" strings would shift the local time.

import { describe, it, expect } from "vitest";
import { registroAgendadoToAgendaItem, type RegistroAgendado } from "@/lib/agenda/registro-to-agenda-item";

const base: RegistroAgendado = {
  id: 42,
  titulo: "Orientação sobre recurso",
  assunto: "recurso",
  conteudo: null,
  local: "presencial",
  status: "agendado",
  dataRegistro: "2026-05-28T14:30:00",
  assistido: { id: 7, nome: "Maria Souza" },
  processo: { id: 3, numeroAutos: "0001234-56.2026.8.05.0039", atribuicao: "JURI_CAMACARI", area: "JURI" },
};

describe("registroAgendadoToAgendaItem", () => {
  it("monta id composto e fonte registros", () => {
    const item = registroAgendadoToAgendaItem(base);
    expect(item.id).toBe("registro-42");
    expect(item.rawId).toBe(42);
    expect(item.fonte).toBe("registros");
    expect(item.tipo).toBe("atendimento");
  });
  it("usa o titulo quando presente e cai em 'Atendimento' quando ausente", () => {
    expect(registroAgendadoToAgendaItem(base).titulo).toBe("Orientação sobre recurso");
    expect(registroAgendadoToAgendaItem({ ...base, titulo: null }).titulo).toBe("Atendimento");
  });
  it("extrai data e horário de dataRegistro", () => {
    const item = registroAgendadoToAgendaItem(base);
    expect(item.data).toBe("2026-05-28");
    expect(item.horarioInicio).toBe("14:30");
  });
  it("deriva atribuicaoKey do processo vinculado", () => {
    const item = registroAgendadoToAgendaItem(base);
    expect(item.atribuicaoKey).toBe("JURI");
  });
  it("usa atribuicaoKey neutro quando não há processo", () => {
    const item = registroAgendadoToAgendaItem({ ...base, processo: null });
    expect(item.atribuicaoKey).toBe("NEUTRO");
    expect(item.processoId).toBeUndefined();
  });
});
