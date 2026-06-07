import { describe, it, expect } from "vitest";
import { detectarDesignacaoAudiencia } from "../detectar-designacao-audiencia";

describe("detectarDesignacaoAudiencia", () => {
  it("detecta o despacho padrão do PJe (caso Ricardo)", () => {
    const r = detectarDesignacaoAudiencia(
      "Em cumprimento ao despacho de ID. 545387706, designo audiência de instrução e julgamento na modalidade híbrida para o dia 14/07/2026, às 09h50min."
    );
    expect(r).not.toBeNull();
    expect(r!.data).toBe("2026-07-14");
    expect(r!.horario).toBe("09:50");
    expect(r!.tipo).toBe("Audiência de Instrução e Julgamento");
    expect(r!.modalidade).toBe("híbrida");
    expect(r!.redesignacao).toBe(false);
  });

  it("detecta forma passiva e hora com dois-pontos", () => {
    const r = detectarDesignacaoAudiencia(
      "Audiência de conciliação designada para o dia 02/09/2026, às 14:30, de forma virtual."
    );
    expect(r!.data).toBe("2026-09-02");
    expect(r!.horario).toBe("14:30");
    expect(r!.tipo).toBe("Audiência de Conciliação");
    expect(r!.modalidade).toBe("virtual");
  });

  it("detecta redesignação e hora cheia sem minutos", () => {
    const r = detectarDesignacaoAudiencia(
      "Redesigno a audiência de instrução para o dia 1/8/2026, às 9h, presencial."
    );
    expect(r!.data).toBe("2026-08-01");
    expect(r!.horario).toBe("09:00");
    expect(r!.redesignacao).toBe(true);
    expect(r!.modalidade).toBe("presencial");
  });

  it("ignora a data de prazos anteriores no texto (busca após o gatilho)", () => {
    const r = detectarDesignacaoAudiencia(
      "Intimada em 01/02/2026 para manifestação. Sem resposta. Designo audiência de justificação para o dia 20/10/2026, às 11h15min."
    );
    expect(r!.data).toBe("2026-10-20");
    expect(r!.horario).toBe("11:15");
    expect(r!.tipo).toBe("Audiência de Justificação");
  });

  it("não dispara sem verbo de designação", () => {
    expect(
      detectarDesignacaoAudiencia(
        "A audiência do dia 14/07/2026 foi cancelada por ausência da vítima."
      )
    ).toBeNull();
  });

  it("não dispara em texto comum de ciência", () => {
    expect(
      detectarDesignacaoAudiencia(
        "Ciência da certidão do oficial de justiça. Não localização da representante da menor."
      )
    ).toBeNull();
  });

  it("não dispara sem data", () => {
    expect(
      detectarDesignacaoAudiencia("Designo audiência de instrução oportunamente.")
    ).toBeNull();
  });
});
