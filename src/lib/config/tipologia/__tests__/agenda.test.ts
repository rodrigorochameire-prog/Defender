import { describe, it, expect } from "vitest";
import {
  AUDIENCIA_STATUS_CONFIG,
  PREPARO_STATUS_CONFIG,
  statusAudienciaTipo,
  statusPreparoInfo,
  eventoAgendaTipo,
} from "../agenda";

describe("statusAudienciaTipo", () => {
  it("mapeia conclusão/realização para Realizada (emerald)", () => {
    expect(statusAudienciaTipo("realizada").label).toBe("Realizada");
    expect(statusAudienciaTipo("concluida").label).toBe("Realizada");
    expect(statusAudienciaTipo("realizada").badge).toMatch(/emerald/);
    expect(statusAudienciaTipo("realizada").dot).toMatch(/emerald/);
  });

  it("mapeia cancelamento para Cancelada (rose)", () => {
    expect(statusAudienciaTipo("cancelada").label).toBe("Cancelada");
    expect(statusAudienciaTipo("cancelada").badge).toMatch(/rose/);
  });

  it("agrupa redesignação/remarcação/adiamento em Redesignada (amber)", () => {
    for (const s of ["redesignada", "remarcada", "reagendada", "adiada"]) {
      expect(statusAudienciaTipo(s).label).toBe("Redesignada");
      expect(statusAudienciaTipo(s).badge).toMatch(/amber/);
    }
  });

  it("reconhece aguardando ata", () => {
    expect(statusAudienciaTipo("aguardando ata").label).toBe("Aguard. ata");
  });

  it("usa Designada como padrão (neutro) para vazio/desconhecido", () => {
    expect(statusAudienciaTipo(null).label).toBe("Designada");
    expect(statusAudienciaTipo("").label).toBe("Designada");
    expect(statusAudienciaTipo("qualquer-coisa").label).toBe("Designada");
    expect(statusAudienciaTipo(null).badge).toMatch(/neutral/);
  });

  it("é case-insensitive", () => {
    expect(statusAudienciaTipo("REALIZADA").label).toBe("Realizada");
  });

  it("expõe um registry com a chave canônica designada", () => {
    expect(AUDIENCIA_STATUS_CONFIG.designada).toBeDefined();
    expect(AUDIENCIA_STATUS_CONFIG.designada.label).toBe("Designada");
  });
});

describe("statusPreparoInfo", () => {
  it("mapeia completo (emerald), parcial (amber) e pendente (neutro)", () => {
    expect(statusPreparoInfo("completo").label).toMatch(/Completo/i);
    expect(statusPreparoInfo("completo").badge).toMatch(/emerald/);
    expect(statusPreparoInfo("parcial").badge).toMatch(/amber/);
    expect(statusPreparoInfo("pendente").label).toMatch(/Pendente/i);
  });

  it("cai em fallback neutro para valor desconhecido", () => {
    expect(statusPreparoInfo("xpto").badge).toMatch(/neutral/);
  });

  it("expõe o registry", () => {
    expect(Object.keys(PREPARO_STATUS_CONFIG)).toEqual(
      expect.arrayContaining(["completo", "parcial", "pendente"])
    );
  });
});

describe("eventoAgendaTipo (domínio amplo do AgendaItem)", () => {
  it("normaliza variantes de grafia/gênero para o mesmo estado", () => {
    // cancelada/cancelado → Cancelada
    expect(eventoAgendaTipo("cancelada").label).toBe("Cancelada");
    expect(eventoAgendaTipo("cancelado").label).toBe("Cancelada");
    // realizada/realizado/concluída → Realizada
    expect(eventoAgendaTipo("realizado").label).toBe("Realizada");
    expect(eventoAgendaTipo("concluida").label).toBe("Realizada");
    // redesignado/remarcado/reagendado/adiado → Redesignada
    for (const s of ["redesignado", "remarcado", "reagendada", "adiado"]) {
      expect(eventoAgendaTipo(s).label).toBe("Redesignada");
    }
  });

  it("cor = exceção: estados normais são neutros, exceções coloridas", () => {
    // normais → neutro
    expect(eventoAgendaTipo("confirmada").badge).toMatch(/neutral/);
    expect(eventoAgendaTipo("confirmado").badge).toMatch(/neutral/);
    expect(eventoAgendaTipo("agendado").badge).toMatch(/neutral/);
    expect(eventoAgendaTipo("designada").badge).toMatch(/neutral/);
    // terminal positivo → emerald
    expect(eventoAgendaTipo("realizada").badge).toMatch(/emerald/);
    // exceções → rose/amber
    expect(eventoAgendaTipo("cancelada").badge).toMatch(/rose/);
    expect(eventoAgendaTipo("redesignada").badge).toMatch(/amber/);
    expect(eventoAgendaTipo("pendente").badge).toMatch(/amber/);
  });

  it("rotula confirmada e agendado de forma legível (não vira só 'Designada')", () => {
    expect(eventoAgendaTipo("confirmada").label).toBe("Confirmada");
    expect(eventoAgendaTipo("agendado").label).toBe("Agendado");
  });

  it("é case-insensitive e cai em Designada (neutro) para vazio/desconhecido", () => {
    expect(eventoAgendaTipo("CANCELADA").label).toBe("Cancelada");
    expect(eventoAgendaTipo(null).label).toBe("Designada");
    expect(eventoAgendaTipo("").label).toBe("Designada");
    expect(eventoAgendaTipo("xyz").label).toBe("Designada");
    expect(eventoAgendaTipo(null).badge).toMatch(/neutral/);
  });
});
