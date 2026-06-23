import { describe, it, expect } from "vitest";
import { eventoProcessoInfo, EVENTO_PROCESSO_DEFAULT } from "@/lib/config/tipologia";

describe("tipologia · evento de processo", () => {
  it("mapeia tipos conhecidos com rótulos acentuados", () => {
    expect(eventoProcessoInfo("denuncia").label).toBe("Denúncia");
    expect(eventoProcessoInfo("sentenca").label).toBe("Sentença");
    expect(eventoProcessoInfo("pericia").label).toBe("Perícia");
    expect(eventoProcessoInfo("audiencia").label).toBe("Audiência");
    expect(eventoProcessoInfo("investigacao").label).toBe("Investigação");
    expect(eventoProcessoInfo("midia").label).toBe("Mídia");
  });
  it("é case-insensitive", () => {
    expect(eventoProcessoInfo("DENUNCIA").icone).toBe("BookMarked");
    expect(eventoProcessoInfo("Sentenca").dot).toBe("bg-amber-500");
  });
  it("tipo desconhecido/null → default 'Outro'", () => {
    expect(eventoProcessoInfo("xpto")).toEqual(EVENTO_PROCESSO_DEFAULT);
    expect(eventoProcessoInfo(null).label).toBe("Outro");
    expect(eventoProcessoInfo(undefined).icone).toBe("HelpCircle");
  });
});
