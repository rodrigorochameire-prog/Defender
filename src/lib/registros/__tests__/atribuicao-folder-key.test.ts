import { describe, it, expect } from "vitest";
import { atribuicaoToFolderKey } from "../atribuicao-folder-key";

describe("atribuicaoToFolderKey", () => {
  it("mapeia as 4 atribuições com pasta", () => {
    expect(atribuicaoToFolderKey("JURI")).toBe("JURI");
    expect(atribuicaoToFolderKey("VIOLENCIA_DOMESTICA")).toBe("VVD");
    expect(atribuicaoToFolderKey("EXECUCAO_PENAL")).toBe("EP");
    expect(atribuicaoToFolderKey("SUBSTITUICAO")).toBe("SUBSTITUICAO");
  });
  it("retorna null para atribuições sem pasta dedicada", () => {
    expect(atribuicaoToFolderKey("CRIMINAL")).toBeNull();
    expect(atribuicaoToFolderKey("FAMILIA")).toBeNull();
    expect(atribuicaoToFolderKey(null)).toBeNull();
  });
});
