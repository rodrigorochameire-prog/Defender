import { describe, it, expect } from "vitest";
import { readMarcos, readPrisoes, readCautelares, parseDateTolerant } from "@/lib/cronologia/readers";

describe("parseDateTolerant", () => {
  it("aceita ISO", () => {
    expect(parseDateTolerant("2025-03-15")).toBe("2025-03-15");
  });
  it("aceita BR DD/MM/YYYY", () => {
    expect(parseDateTolerant("15/03/2025")).toBe("2025-03-15");
  });
  it("aceita BR DD-MM-YYYY", () => {
    expect(parseDateTolerant("15-03-2025")).toBe("2025-03-15");
  });
  it("retorna null pra data inválida", () => {
    expect(parseDateTolerant("abc")).toBeNull();
    expect(parseDateTolerant("")).toBeNull();
    expect(parseDateTolerant(null as any)).toBeNull();
  });
});

describe("readMarcos", () => {
  it("lê array enrichment_data.cronologia[]", () => {
    const ed = {
      cronologia: [
        { tipo: "fato", data: "2025-01-15" },
        { tipo: "denuncia", data: "15/05/2025" },
      ],
    };
    const out = readMarcos(ed);
    expect(out).toHaveLength(2);
    expect(out[0].tipo).toBe("fato");
    expect(out[0].data).toBe("2025-01-15");
    expect(out[1].tipo).toBe("denuncia");
    expect(out[1].data).toBe("2025-05-15");
  });

  it("lê campos esparsos", () => {
    const ed = { data_fato: "2025-01-15", data_denuncia: "2025-05-15" };
    const out = readMarcos(ed);
    const tipos = out.map((m) => m.tipo);
    expect(tipos).toContain("fato");
    expect(tipos).toContain("denuncia");
  });

  it("skip data inválida", () => {
    const ed = { cronologia: [{ tipo: "fato", data: "bogus" }] };
    const out = readMarcos(ed);
    expect(out).toHaveLength(0);
  });

  it("skip enum inválido", () => {
    const ed = { cronologia: [{ tipo: "pancake", data: "2025-01-01" }] };
    const out = readMarcos(ed);
    expect(out).toHaveLength(0);
  });

  it("retorna vazio quando enrichment_data vazio", () => {
    expect(readMarcos({})).toEqual([]);
    expect(readMarcos(null as any)).toEqual([]);
  });
});

describe("readPrisoes", () => {
  it("lê array prisoes[]", () => {
    const ed = { prisoes: [{ tipo: "preventiva", data_inicio: "2025-03-20", situacao: "ativa" }] };
    const out = readPrisoes(ed);
    expect(out).toHaveLength(1);
    expect(out[0].tipo).toBe("preventiva");
  });

  it("lê campos esparsos: esta_preso + data_prisao → preventiva", () => {
    const ed = { esta_preso: true, data_prisao: "2025-03-20" };
    const out = readPrisoes(ed);
    expect(out).toHaveLength(1);
    expect(out[0].tipo).toBe("preventiva");
    expect(out[0].situacao).toBe("ativa");
  });

  it("esta_preso=false não gera prisão", () => {
    const ed = { esta_preso: false, data_prisao: "2025-03-20" };
    expect(readPrisoes(ed)).toEqual([]);
  });
});

describe("readCautelares", () => {
  it("lê array cautelares[]", () => {
    const ed = { cautelares: [{ tipo: "monitoramento-eletronico", data_inicio: "2025-04-01", status: "ativa" }] };
    const out = readCautelares(ed);
    expect(out).toHaveLength(1);
    expect(out[0].tipo).toBe("monitoramento-eletronico");
  });

  it("tem_tornozeleira → monitoramento-eletronico ativa", () => {
    const ed = { tem_tornozeleira: true, data_tornozeleira: "2025-04-01" };
    const out = readCautelares(ed);
    expect(out).toHaveLength(1);
    expect(out[0].tipo).toBe("monitoramento-eletronico");
  });

  it("mpu_ativa → proibicao-contato", () => {
    const ed = { mpu_ativa: true, data_mpu: "2025-02-10" };
    const out = readCautelares(ed);
    expect(out).toHaveLength(1);
    expect(out[0].tipo).toBe("proibicao-contato");
  });
});
