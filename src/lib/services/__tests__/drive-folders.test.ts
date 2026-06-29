import { describe, expect, it } from "vitest";
import { pickAtribuicaoFolders, pickAtribuicaoFolderPrimary, ATRIBUICOES, findAtribuicaoForFolder } from "../drive-folders";

describe("pickAtribuicaoFolders (multi-pasta)", () => {
  const folders = { JURI: ["fJuri"], VVD: ["fVvdCrim", "fVvdMpu"], EP: ["fEp"] };

  it("retorna todas as pastas da atribuição (inclui extras)", () => {
    expect(pickAtribuicaoFolders(folders, "VVD")).toEqual(["fVvdCrim", "fVvdMpu"]);
  });

  it("retorna [] quando a atribuição não está mapeada", () => {
    expect(pickAtribuicaoFolders(folders, "CRIMINAL")).toEqual([]);
  });

  it("retorna [] para mapa vazio", () => {
    expect(pickAtribuicaoFolders({}, "JURI")).toEqual([]);
  });

  it("tolera valor string legado tratando como array de 1", () => {
    expect(pickAtribuicaoFolders({ EP: "fEpLegado" } as any, "EP")).toEqual(["fEpLegado"]);
  });

  it("primary retorna a primeira pasta, ou null se vazio", () => {
    expect(pickAtribuicaoFolderPrimary(folders, "VVD")).toBe("fVvdCrim");
    expect(pickAtribuicaoFolderPrimary({}, "VVD")).toBeNull();
  });

  it("ATRIBUICOES cobre as 6 atribuições do domínio", () => {
    expect([...ATRIBUICOES].sort()).toEqual(
      ["CRIMINAL", "EP", "GRUPO_JURI", "JURI", "SUBSTITUICAO", "VVD"].sort(),
    );
  });
});

describe("findAtribuicaoForFolder (lookup reverso puro)", () => {
  const folders = { JURI: ["fJuri"], VVD: ["fVvdCrim", "fVvdMpu"], EP: ["fEp"] };

  it("acha a atribuição cuja lista contém o folderId", () => {
    expect(findAtribuicaoForFolder(folders, "fVvdMpu")).toBe("VVD");
    expect(findAtribuicaoForFolder(folders, "fJuri")).toBe("JURI");
  });

  it("retorna null quando nenhum grupo contém o folderId", () => {
    expect(findAtribuicaoForFolder(folders, "desconhecido")).toBeNull();
  });

  it("tolera valor string legado no mapa", () => {
    expect(findAtribuicaoForFolder({ EP: "fEpLegado" } as any, "fEpLegado")).toBe("EP");
  });

  it("retorna null para mapa vazio", () => {
    expect(findAtribuicaoForFolder({}, "qualquer")).toBeNull();
  });
});
