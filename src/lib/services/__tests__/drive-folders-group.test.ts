import { vi, describe, it, expect } from "vitest";

const state: { user: any; group: any } = { user: null, group: null };

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      users: { findFirst: async () => state.user },
      driveGroups: { findFirst: async () => state.group },
    },
  },
}));

import { loadUserGroupFolders } from "../drive-folders";

describe("loadUserGroupFolders (discriminador sem-grupo vs grupo-sem-chave)", () => {
  it("retorna null quando o usuário não tem driveGroupId", async () => {
    state.user = { driveGroupId: null };
    state.group = null;
    expect(await loadUserGroupFolders(1)).toBeNull();
  });

  it("retorna o mapa do grupo quando o usuário tem grupo", async () => {
    state.user = { driveGroupId: 10 };
    state.group = { atribuicaoFolders: { JURI: ["fJuri"], VVD: ["fVvd"] } };
    expect(await loadUserGroupFolders(1)).toEqual({ JURI: ["fJuri"], VVD: ["fVvd"] });
  });

  it("retorna {} (não null) quando o grupo existe mas tem mapa vazio — fail-safe, não cai no legado", async () => {
    state.user = { driveGroupId: 10 };
    state.group = { atribuicaoFolders: {} };
    expect(await loadUserGroupFolders(1)).toEqual({});
  });
});
