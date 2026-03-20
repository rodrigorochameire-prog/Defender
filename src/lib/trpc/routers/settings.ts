import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { userSettings } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

const settingsSchema = z.object({
  // Configurações Gerais
  nomeDefensoria: z.string().optional(),
  comarca: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().optional(),

  // Notificações
  notificarPrazos: z.boolean().optional(),
  diasAntesPrazo: z.number().optional(),
  notificarAudiencias: z.boolean().optional(),
  diasAntesAudiencia: z.number().optional(),
  notificarJuri: z.boolean().optional(),
  diasAntesJuri: z.number().optional(),

  // Integrações
  googleDriveEnabled: z.boolean().optional(),
  googleCalendarEnabled: z.boolean().optional(),
  whatsappEnabled: z.boolean().optional(),
}).passthrough(); // Allow extra fields for future settings

export const settingsRouter = router({
  /**
   * Get current user settings
   */
  get: protectedProcedure.query(async ({ ctx }) => {
    const existing = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, ctx.user.id),
    });

    if (!existing) {
      return {
        nomeDefensoria: "Defensoria Pública do Estado",
        comarca: "Camaçari",
        telefone: "(71) 3621-0000",
        email: "defensoria@example.com",
        notificarPrazos: true,
        diasAntesPrazo: 3,
        notificarAudiencias: true,
        diasAntesAudiencia: 2,
        notificarJuri: true,
        diasAntesJuri: 7,
        googleDriveEnabled: false,
        googleCalendarEnabled: false,
        whatsappEnabled: false,
      };
    }

    return existing.settings as Record<string, unknown>;
  }),

  /**
   * Get comarca visibility settings (verRMS toggle)
   */
  getComarcaVisibilidade: protectedProcedure.query(async ({ ctx }) => {
    const result = await db
      .select({ settings: userSettings.settings })
      .from(userSettings)
      .where(eq(userSettings.userId, ctx.user.id))
      .limit(1);

    const settings = (result[0]?.settings ?? {}) as Record<string, any>;
    return {
      verRMS: (settings?.comarcaVisibilidade?.verRMS as boolean) ?? false,
    };
  }),

  /**
   * Set comarca visibility settings (verRMS toggle) — upsert via JSONB merge
   */
  setComarcaVisibilidade: protectedProcedure
    .input(z.object({ verRMS: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .insert(userSettings)
        .values({
          userId: ctx.user.id,
          settings: { comarcaVisibilidade: { verRMS: input.verRMS } },
        })
        .onConflictDoUpdate({
          target: userSettings.userId,
          set: {
            settings: sql`user_settings.settings || ${JSON.stringify({ comarcaVisibilidade: { verRMS: input.verRMS } })}::jsonb`,
            updatedAt: new Date(),
          },
        });
      return { ok: true };
    }),

  /**
   * Save user settings (upsert)
   */
  save: protectedProcedure
    .input(settingsSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.userSettings.findFirst({
        where: eq(userSettings.userId, ctx.user.id),
      });

      if (existing) {
        // Merge existing settings with new ones
        const merged = { ...(existing.settings as Record<string, unknown>), ...input };
        await db
          .update(userSettings)
          .set({ settings: merged, updatedAt: new Date() })
          .where(eq(userSettings.userId, ctx.user.id));
        return merged;
      } else {
        const [created] = await db
          .insert(userSettings)
          .values({
            userId: ctx.user.id,
            settings: input,
          })
          .returning();
        return created.settings as Record<string, unknown>;
      }
    }),
});
