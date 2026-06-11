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
    expect(r!.tipo).toBe("Justificação");
  });

  it("detecta o movimento automatizado do PJe (caixa alta, hora colada à data)", () => {
    const r = detectarDesignacaoAudiencia(
      "AUDIÊNCIA JUSTIFICAÇÃO DESIGNADA CONDUZIDA POR 28/07/2026 08:20 EM/PARA VARA DE VIOLÊNCIA DOMÉSTICA FAM CONTRA A MULHER DE CAMAÇARI, #NÃO PREENCHIDO#."
    );
    expect(r).not.toBeNull();
    expect(r!.data).toBe("2026-07-28");
    expect(r!.horario).toBe("08:20");
    expect(r!.tipo).toBe("Justificação");
    expect(r!.local).toBe(
      "VARA DE VIOLÊNCIA DOMÉSTICA FAM CONTRA A MULHER DE CAMAÇARI"
    );
    expect(r!.redesignacao).toBe(false);
  });

  it("detecta a variante minúscula do movimento com 'às' antes da hora", () => {
    const r = detectarDesignacaoAudiencia(
      "Audiência JUSTIFICAÇÃO designada conduzida por 28/07/2026 às 08:20 em/para VARA DE VIOLÊNCIA DOMÉSTICA FAM CONTRA A MULHER DE CAMAÇARI."
    );
    expect(r!.data).toBe("2026-07-28");
    expect(r!.horario).toBe("08:20");
    expect(r!.tipo).toBe("Justificação");
  });

  it("detecta verbo no infinitivo ('hei por bem designar')", () => {
    const r = detectarDesignacaoAudiencia(
      "Da análise que faço dos autos, hei por bem designar audiência de justificação para o dia 20/10/2026, às 11h30min."
    );
    expect(r!.data).toBe("2026-10-20");
    expect(r!.horario).toBe("11:30");
    expect(r!.tipo).toBe("Justificação");
  });

  it("detecta redesignação por readequação de pauta (caso Erivelton)", () => {
    const r = detectarDesignacaoAudiencia(
      "Tendo em vista a readequação de pauta, redesigno audiência de instrução e julgamento para o dia 28/07/2026, às 10:40, na modalidade presencial."
    );
    expect(r!.data).toBe("2026-07-28");
    expect(r!.horario).toBe("10:40");
    expect(r!.redesignacao).toBe(true);
    expect(r!.tipo).toBe("Audiência de Instrução e Julgamento");
  });

  it("detecta oitiva especializada sem a palavra 'audiência' (caso ID.521881185)", () => {
    const r = detectarDesignacaoAudiencia(
      "Em cumprimento a decisão de ID.521881185, designo oitiva especializada na modalidade presencial para o dia 15/07/2026, às 09h15min."
    );
    expect(r).not.toBeNull();
    expect(r!.data).toBe("2026-07-15");
    expect(r!.horario).toBe("09:15");
    expect(r!.tipo).toBe("Depoimento Especial");
    expect(r!.modalidade).toBe("presencial");
    expect(r!.redesignacao).toBe(false);
  });

  it("normaliza depoimento especial para o rótulo canônico do catálogo", () => {
    const r = detectarDesignacaoAudiencia(
      "Designo depoimento especial da vítima para o dia 22/09/2026, às 10h00min, na modalidade presencial."
    );
    expect(r!.data).toBe("2026-09-22");
    expect(r!.horario).toBe("10:00");
    expect(r!.tipo).toBe("Depoimento Especial");
  });

  it("detecta oitiva especializada com espaço duplo após ID (caso Leinho, registro 461)", () => {
    const r = detectarDesignacaoAudiencia(
      "Em cumprimento ao despacho de ID.  557513733, designo oitiva especializada na modalidade presencial para o dia 14/07/2026, às 08h30min."
    );
    expect(r).not.toBeNull();
    expect(r!.data).toBe("2026-07-14");
    expect(r!.horario).toBe("08:30");
    expect(r!.tipo).toBe("Depoimento Especial");
    expect(r!.modalidade).toBe("presencial");
  });

  it("detecta instrução sumariante (1ª fase do júri) sem cair em AIJ", () => {
    const r = detectarDesignacaoAudiencia(
      "Designo audiência de instrução sumariante para o dia 03/08/2026, às 13h30min."
    );
    expect(r!.data).toBe("2026-08-03");
    expect(r!.tipo).toBe("Audiência de Instrução Sumariante");
  });

  it("detecta audiência preliminar com tipo canônico do catálogo", () => {
    const r = detectarDesignacaoAudiencia(
      "Fica designada audiência preliminar para o dia 05/08/2026, às 08h45min."
    );
    expect(r!.data).toBe("2026-08-05");
    expect(r!.tipo).toBe("Audiência Preliminar");
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
