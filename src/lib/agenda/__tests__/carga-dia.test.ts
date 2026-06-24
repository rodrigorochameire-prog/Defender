import { describe, it, expect } from "vitest";
import { cargaDoDia, CARGA_CONFIG } from "../carga-dia";

const aud = (n: number) => Array.from({ length: n }, () => ({ tipo: "audiencia" }));
const out = (n: number) => Array.from({ length: n }, () => ({ tipo: "compromisso" }));

describe("cargaDoDia", () => {
  it("conta total e audiências separadamente", () => {
    const r = cargaDoDia([...aud(2), ...out(1)]);
    expect(r.total).toBe(3);
    expect(r.audiencias).toBe(2);
  });

  it("reconhece audiência por fonte=audiencias além de tipo", () => {
    const r = cargaDoDia([{ fonte: "audiencias" }, { tipo: "audiencia" }, { tipo: "prazo" }]);
    expect(r.audiencias).toBe(2);
  });

  it("pondera audiências em dobro no nível de carga", () => {
    // 4 audiências → score 8 → alta; 4 outros → score 4 → média
    expect(cargaDoDia(aud(4)).nivel).toBe("alta");
    expect(cargaDoDia(out(4)).nivel).toBe("media");
  });

  it("classifica baixa para dias leves", () => {
    expect(cargaDoDia(out(1)).nivel).toBe("baixa");
    expect(cargaDoDia(aud(1)).nivel).toBe("baixa");
  });

  it("dia vazio = baixa, zero contagens", () => {
    const r = cargaDoDia([]);
    expect(r).toMatchObject({ total: 0, audiencias: 0, nivel: "baixa" });
  });

  it("cor = exceção: só carga alta recebe tom de atenção; média/baixa neutros", () => {
    expect(CARGA_CONFIG.alta.badge).toMatch(/amber|rose|orange/);
    expect(CARGA_CONFIG.media.badge).toMatch(/neutral/);
    expect(CARGA_CONFIG.baixa.badge).toMatch(/neutral/);
  });

  it("expõe rótulo legível por nível", () => {
    expect(cargaDoDia(aud(5)).label).toMatch(/alta/i);
    expect(cargaDoDia(out(4)).label).toMatch(/média|media/i);
    expect(cargaDoDia(out(1)).label).toMatch(/leve|baixa/i);
  });
});
