import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { users, userGoogleTokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isGoogleLinked, getUserGoogleEmail, createUserDriveStructure } from "@/lib/services/google-drive-peruser";
import { createUserSpreadsheet } from "@/lib/services/google-sheets-peruser";
import { TRPCError } from "@trpc/server";

export const googleIntegrationRouter = router({
  myStatus: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.query.users.findFirst({ where: eq(users.id, ctx.user.id) });
    const linked = await isGoogleLinked(ctx.user.id);
    const email = linked ? await getUserGoogleEmail(ctx.user.id) : null;
    return {
      googleLinked: linked,
      googleEmail: email,
      driveFolderId: user?.driveFolderId ?? null,
      driveUrl: user?.driveFolderId ? `https://drive.google.com/drive/folders/${user.driveFolderId}` : null,
      sheetsSpreadsheetId: user?.sheetsSpreadsheetId ?? null,
      sheetsSpreadsheetUrl: user?.sheetsSpreadsheetUrl ?? null,
      sheetsSyncEnabled: user?.sheetsSyncEnabled ?? false,
      onboardingCompleted: user?.onboardingCompleted ?? false,
    };
  }),

  getAuthUrl: protectedProcedure
    .input(z.object({ returnTo: z.string().optional() }))
    .query(({ ctx, input }) => {
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const returnTo = input.returnTo || "/admin/settings/planilha";
      return { url: `${baseUrl}/api/google/auth?userId=${ctx.user.id}&returnTo=${encodeURIComponent(returnTo)}` };
    }),

  createDrive: protectedProcedure.mutation(async ({ ctx }) => {
    const linked = await isGoogleLinked(ctx.user.id);
    if (!linked) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Google não vinculado" });
    return createUserDriveStructure(ctx.user.id);
  }),

  createSheets: protectedProcedure.mutation(async ({ ctx }) => {
    const linked = await isGoogleLinked(ctx.user.id);
    if (!linked) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Google não vinculado" });
    return createUserSpreadsheet(ctx.user.id);
  }),

  completeOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
    await db.update(users).set({ onboardingCompleted: true }).where(eq(users.id, ctx.user.id));
    return { success: true };
  }),

  unlink: protectedProcedure.mutation(async ({ ctx }) => {
    await db.delete(userGoogleTokens).where(eq(userGoogleTokens.userId, ctx.user.id));
    await db.update(users).set({
      googleLinked: false, driveFolderId: null,
      sheetsSpreadsheetId: null, sheetsSpreadsheetUrl: null, sheetsSyncEnabled: false,
    }).where(eq(users.id, ctx.user.id));
    return { success: true };
  }),
});
