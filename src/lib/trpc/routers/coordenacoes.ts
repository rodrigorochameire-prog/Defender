import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { coordenacoesDestino } from "@/lib/db/schema/cowork";
import { eq, and, desc } from "drizzle-orm";

// Catálogo de Coordenações (Regional/Especializada) destinatárias dos
// encaminhamentos da IN 01/2026-CGD. Os e-mails vêm do Anexo Único da Instrução.

const REGIME = z.enum(["interno", "integrado"]);
const NIVEL = z.enum(["regional", "especializada"]);

const baseFields = {
  regime: REGIME,
  nivel: NIVEL.default("regional"),
  nome: z.string().min(2).max(200),
  comarca: z.string().max(120).optional().nullable(),
  uf: z.string().length(2).default("BA"),
  email: z.string().email().max(120),
  telefone: z.string().max(30).optional().nullable(),
  observacao: z.string().optional().nullable(),
};

export const coordenacoesRouter = router({
  listar: protectedProcedure
    .input(z.object({
      regime: REGIME.optional(),
      apenasAtivos: z.boolean().default(true),
    }).optional())
    .query(async ({ input }) => {
      const conds = [];
      if (input?.apenasAtivos !== false) conds.push(eq(coordenacoesDestino.ativo, true));
      if (input?.regime) conds.push(eq(coordenacoesDestino.regime, input.regime));
      const rows = await db
        .select()
        .from(coordenacoesDestino)
        .where(conds.length ? and(...conds) : undefined)
        .orderBy(desc(coordenacoesDestino.ativo), coordenacoesDestino.nome);
      return { items: rows };
    }),

  criar: protectedProcedure
    .input(z.object(baseFields))
    .mutation(async ({ ctx, input }) => {
      const [row] = await db.insert(coordenacoesDestino).values({
        workspaceId: ctx.user.workspaceId ?? 1,
        regime: input.regime,
        nivel: input.nivel,
        nome: input.nome,
        comarca: input.comarca ?? null,
        uf: input.uf.toUpperCase(),
        email: input.email,
        telefone: input.telefone ?? null,
        observacao: input.observacao ?? null,
      }).returning();
      return { id: row.id };
    }),

  atualizar: protectedProcedure
    .input(z.object({ id: z.number() }).extend({
      regime: REGIME.optional(),
      nivel: NIVEL.optional(),
      nome: z.string().min(2).max(200).optional(),
      comarca: z.string().max(120).optional().nullable(),
      uf: z.string().length(2).optional(),
      email: z.string().email().max(120).optional(),
      telefone: z.string().max(30).optional().nullable(),
      observacao: z.string().optional().nullable(),
      ativo: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...rest } = input;
      const patch: Record<string, unknown> = { updatedAt: new Date() };
      for (const [k, v] of Object.entries(rest)) {
        if (v === undefined) continue;
        patch[k] = k === "uf" && typeof v === "string" ? v.toUpperCase() : v;
      }
      await db.update(coordenacoesDestino).set(patch).where(eq(coordenacoesDestino.id, id));
      return { ok: true };
    }),

  desativar: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.update(coordenacoesDestino)
        .set({ ativo: false, updatedAt: new Date() })
        .where(eq(coordenacoesDestino.id, input.id));
      return { ok: true };
    }),
});
