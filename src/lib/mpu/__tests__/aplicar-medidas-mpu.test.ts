import { describe, it, expect } from "vitest";
import { resumirParaProcessoVVD } from "../aplicar-medidas-mpu";
import { parseDecisaoMPU } from "../parse-decisao";

const DECISAO = `DEFIRO em favor de MARIA cumpra JOAO: a) afastamento do lar; b) proibição de aproximação, mínimo de 300 metros da ofendida. Pelo prazo de 180 dias.`;

describe("resumirParaProcessoVVD", () => {
  it("deriva os campos da esteira a partir do parse", () => {
    const parsed = parseDecisaoMPU(DECISAO);
    const res = resumirParaProcessoVVD(parsed, "2026-06-01");
    expect(res.mpuAtiva).toBe(true);
    expect(res.faseProcedimento).toBe("decisao_liminar");
    expect(res.motivoUltimaIntimacao).toBe("ciencia_decisao_mpu");
    expect(res.distanciaMinima).toBe(300);
    expect(res.prazoMpuDias).toBe(180);
    expect(res.dataDecisaoMPU).toBe("2026-06-01");
    expect(res.dataVencimentoMPU).toBe("2026-11-28"); // 2026-06-01 + 180 dias
  });
});
