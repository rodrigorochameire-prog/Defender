import { describe, it, expect } from "vitest";
import { normalizar, tipoDocumento } from "@/lib/documentos/tipo-documento";

describe("documentos/tipo-documento", () => {
  it("normalizar tira acento e baixa caixa", () => {
    expect(normalizar("DENÚNCIA")).toBe("denuncia");
    expect(normalizar("Sentença de Pronúncia")).toBe("sentenca de pronuncia");
    expect(normalizar("Perícia")).toBe("pericia");
  });

  it("prioriza o tipo da IA (fonte=ia)", () => {
    const t = tipoDocumento("DENUNCIA", "arquivo_qualquer.pdf");
    expect(t.key).toBe("denuncia");
    expect(t.label).toBe("Denúncia");
    expect(t.fonte).toBe("ia");
  });

  it("cai na heurística do nome quando não há tipo da IA (fonte=heuristica)", () => {
    expect(tipoDocumento(null, "sentenca_condenatoria.pdf").key).toBe("sentenca");
    expect(tipoDocumento(null, "Ata de Audiência de Instrução.pdf").key).toBe("ata");
    expect(tipoDocumento(undefined, "laudo_pericial.pdf").fonte).toBe("heuristica");
  });

  it("desconhecido → outro (cobertura 100%)", () => {
    const t = tipoDocumento(null, "documento_xyz_123.pdf");
    expect(t.key).toBe("outro");
    expect(t.fonte).toBe("desconhecido");
  });

  it("tipo da IA desconhecido cai na heurística do nome", () => {
    // documentType não casa, mas o nome sim
    const t = tipoDocumento("FORMATO_ESTRANHO", "recurso_apelacao.pdf");
    expect(t.key).toBe("recurso");
    expect(t.fonte).toBe("heuristica");
  });
});
