import { describe, it, expect } from "vitest";
import { secoesPorTipo } from "../secao-classificada";

// Cada fixture imita uma linha de `drive.sectionsByProcesso`: o `tipo` é uma
// string livre setada na classificação (ex.: "denuncia", "laudo_pericial").
const denuncia = {
  tipo: "denuncia",
  textoExtraido: "DENÚNCIA — o MP imputa ao réu...",
  paginaInicio: 2,
  paginaFim: 4,
  fileWebViewLink: "https://drive/denuncia",
  fileDriveId: "drv-1",
};
const laudoNec = {
  tipo: "Laudo_Necroscópico", // acento + maiúsculas → testa normalização
  textoExtraido: "LAUDO NECROSCÓPICO...",
  paginaInicio: 30,
  paginaFim: 35,
  fileWebViewLink: "https://drive/laudo",
  fileDriveId: "drv-2",
};
const periciaDigital = {
  tipo: "pericia_digital",
  textoExtraido: "PERÍCIA EM DISPOSITIVO...",
  paginaInicio: 50,
  fileWebViewLink: "https://drive/pericia",
  fileDriveId: "drv-3",
};
const sentenca = {
  tipo: "sentenca",
  textoExtraido: "SENTENÇA...",
  paginaInicio: 60,
  fileWebViewLink: "https://drive/sentenca",
  fileDriveId: "drv-4",
};

describe("secoesPorTipo", () => {
  it("casa denúncia ignorando caixa/acento (termo 'denuncia')", () => {
    const r = secoesPorTipo([denuncia, sentenca], ["denuncia", "recebimento_denuncia"]);
    expect(r).toHaveLength(1);
    expect(r[0].tipo).toBe("denuncia");
    expect(r[0].textoExtraido).toContain("DENÚNCIA");
    expect(r[0].fileWebViewLink).toBe("https://drive/denuncia");
    expect(r[0].fileDriveId).toBe("drv-1");
    expect(r[0].paginaInicio).toBe(2);
  });

  it("casa todos os laudos/perícias por includes normalizado", () => {
    const r = secoesPorTipo([denuncia, laudoNec, periciaDigital, sentenca], ["laudo", "pericia"]);
    expect(r.map((s) => s.tipo)).toEqual(["Laudo_Necroscópico", "pericia_digital"]);
  });

  it("normaliza acento no tipo do dado (Laudo_Necroscópico casa 'laudo')", () => {
    const r = secoesPorTipo([laudoNec], ["laudo"]);
    expect(r).toHaveLength(1);
  });

  it("ordena por paginaInicio crescente", () => {
    const r = secoesPorTipo(
      [
        { ...laudoNec, paginaInicio: 99 },
        { ...periciaDigital, paginaInicio: 10 },
      ],
      ["laudo", "pericia"],
    );
    expect(r.map((s) => s.paginaInicio)).toEqual([10, 99]);
  });

  it("trata paginaInicio nula como 0 na ordenação (sem quebrar)", () => {
    const r = secoesPorTipo(
      [
        { ...periciaDigital, paginaInicio: null as unknown as number },
        { ...laudoNec, paginaInicio: 5 },
      ],
      ["laudo", "pericia"],
    );
    expect(r[0].paginaInicio).toBeNull();
    expect(r[1].paginaInicio).toBe(5);
  });

  it("sem correspondência retorna []", () => {
    expect(secoesPorTipo([sentenca], ["denuncia"])).toEqual([]);
    expect(secoesPorTipo([], ["laudo"])).toEqual([]);
  });

  it("ignora linhas sem tipo e termos vazios", () => {
    const semTipo = { ...denuncia, tipo: null as unknown as string };
    expect(secoesPorTipo([semTipo], ["denuncia"])).toEqual([]);
    expect(secoesPorTipo([denuncia], [])).toEqual([]);
  });

  it("aceita entrada com campos faltando (entrada não-tipada)", () => {
    const r = secoesPorTipo(
      [{ tipo: "denuncia", textoExtraido: null }] as unknown[],
      ["denuncia"],
    );
    expect(r).toHaveLength(1);
    expect(r[0].textoExtraido).toBeNull();
    expect(r[0].fileWebViewLink).toBeNull();
  });
});
