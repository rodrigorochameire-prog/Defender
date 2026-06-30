import { vi, describe, it, expect, beforeEach } from "vitest";

const groupsRef: { rows: any[] } = { rows: [] };

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      driveGroups: {
        findMany: async () => groupsRef.rows,
      },
    },
  },
}));

import { resolveFolderToAtribuicao } from "../drive-folders";

describe("resolveFolderToAtribuicao (async, sem sessão)", () => {
  beforeEach(() => {
    groupsRef.rows = [
      { id: 10, ownerUserId: 1, atribuicaoFolders: { VVD: ["fVvd"], JURI: ["fJuri"] } },
      { id: 20, ownerUserId: 2, atribuicaoFolders: { EP: ["fEp2"] } },
    ];
  });

  it("resolve o grupo e a atribuição dono do folderId", async () => {
    expect(await resolveFolderToAtribuicao("fJuri")).toEqual({
      ownerUserId: 1, driveGroupId: 10, atribuicao: "JURI",
    });
    expect(await resolveFolderToAtribuicao("fEp2")).toEqual({
      ownerUserId: 2, driveGroupId: 20, atribuicao: "EP",
    });
  });

  it("retorna null quando nenhum grupo contém o folder", async () => {
    expect(await resolveFolderToAtribuicao("inexistente")).toBeNull();
  });

  it("retorna null quando não há grupos", async () => {
    groupsRef.rows = [];
    expect(await resolveFolderToAtribuicao("fJuri")).toBeNull();
  });
});
