import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import {
  encaminhamentos,
  encaminhamentoDestinatarios,
} from "@/lib/db/schema/cowork";
import { users } from "@/lib/db/schema/core";
import { eq } from "drizzle-orm";
import { createCallerFactory } from "@/lib/trpc/init";
import { appRouter } from "@/lib/trpc/routers";

const createCaller = createCallerFactory(appRouter);

async function makeUser(name: string) {
  const [u] = await db.insert(users).values({
    name,
    email: `${name.toLowerCase().replace(/\s/g, ".")}-${Date.now()}@test.local`,
    workspaceId: 1,
  } as any).returning();
  return u;
}

function mkCtx(user: any) {
  return {
    user,
    requestId: "test-" + Math.random(),
    selectedDefensorScopeId: null,
  };
}

describe("encaminhamentos.listar", () => {
  it("splits items correctly between remetente and destinatario views", async () => {
    const alice = await makeUser("Alice Listar");
    const bob = await makeUser("Bob Listar");

    const [enc] = await db.insert(encaminhamentos).values({
      workspaceId: 1,
      remetenteId: alice.id,
      tipo: "anotar",
      mensagem: "teste de envio",
    } as any).returning();

    await db.insert(encaminhamentoDestinatarios).values({
      encaminhamentoId: enc.id,
      userId: bob.id,
    } as any);

    const aliceCaller = createCaller(mkCtx(alice));
    const aliceEnviados = await aliceCaller.encaminhamentos.listar({ filtro: "enviados" });
    expect(aliceEnviados.items.map((i) => i.id)).toContain(enc.id);

    const bobCaller = createCaller(mkCtx(bob));
    const bobRecebidos = await bobCaller.encaminhamentos.listar({ filtro: "recebidos" });
    expect(bobRecebidos.items.map((i) => i.id)).toContain(enc.id);

    const bobEnviados = await bobCaller.encaminhamentos.listar({ filtro: "enviados" });
    expect(bobEnviados.items.map((i) => i.id)).not.toContain(enc.id);

    // cleanup
    await db.delete(encaminhamentoDestinatarios).where(eq(encaminhamentoDestinatarios.encaminhamentoId, enc.id));
    await db.delete(encaminhamentos).where(eq(encaminhamentos.id, enc.id));
    await db.delete(users).where(eq(users.id, alice.id));
    await db.delete(users).where(eq(users.id, bob.id));
  });
});
