/// <reference types="node" />
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { storagePut } from "./storage";
import { notifyOwner } from "./_core/notification";
import { logAdminAction } from "./adminLogger";
import { logChange } from "./changeTracker";
import { invokeLLM } from "./_core/llm";
import * as notificationService from "./notificationService";
import { triggerVaccineNotificationsManually } from "./jobs/vaccineNotifications";
import Stripe from "stripe";
import { PRODUCTS } from "./products";
import { searchRouter } from "./searchRouter";
import { getStripe } from "./stripeWebhook";

// Admin-only procedure with audit logging
const adminProcedure = protectedProcedure.use(async ({ ctx, next, path }) => {
  const isAdmin = ctx.user.role === "admin";
  
  // Log access attempt
  try {
    await db.createAuditLog({
      user_id: ctx.user.id,
      action: path,
      success: isAdmin,
      errorCode: isAdmin ? null : "FORBIDDEN",
      ipAddress: (ctx.req as any).ip || (ctx.req as any).headers?.["x-forwarded-for"] as string || null,
      userAgent: (ctx.req as any).headers?.["user-agent"] || null,
    });
  } catch (err) {
    // Don't fail the request if logging fails
    console.error("Failed to log audit event:", err);
  }

  if (!isAdmin) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,


  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      (ctx.res as any).clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    /**
     * Register new user with email/password
     */
    register: publicProcedure
      .input(z.object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(6),
        role: z.enum(["user", "admin"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { registerUser, generateVerificationToken } = await import("./emailAuth");
        const { sdk } = await import("./_core/sdk");
        
        const user = await registerUser(input);
        
        // Generate verification token and send email
        const verificationResult = await generateVerificationToken(user.id);
        await notifyOwner({
          title: "New User Registration - Email Verification",
          content: `User ${user.name} (${input.email}) registered. Verification token: ${verificationResult.token}`,
        });
        
        // Create session token
        const sessionToken = await sdk.createSessionToken(String(user.id), {
          name: user.name,
          expiresInMs: 365 * 24 * 60 * 60 * 1000, // 1 year
        });
        
        // Set cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        (ctx.res as any).cookie(COOKIE_NAME, sessionToken, cookieOptions);
        
        return { success: true, user };
      }),

    /**
     * Login with email/password
     */
    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { loginUser } = await import("./emailAuth");
        const { sdk } = await import("./_core/sdk");
        
        const user = await loginUser(input);
        
        // Create session token
        const sessionToken = await sdk.createSessionToken(String(user.id), {
          name: user.name || user.email || undefined,
          expiresInMs: 365 * 24 * 60 * 60 * 1000, // 1 year
        });
        
        // Set cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        (ctx.res as any).cookie(COOKIE_NAME, sessionToken, cookieOptions);
        
        return { success: true, user };
      }),

    /**
     * Change password (protected)
     */
    changePassword: protectedProcedure
      .input(z.object({
        oldPassword: z.string(),
        newPassword: z.string().min(6),
      }))
      .mutation(async ({ input, ctx }) => {
        const { changePassword } = await import("./emailAuth");
        return await changePassword(ctx.user.id, input.oldPassword, input.newPassword);
      }),

    /**
     * Request password reset (public)
     */
    requestPasswordReset: publicProcedure
      .input(z.object({
        email: z.string().email(),
      }))
      .mutation(async ({ input }) => {
        const { generateResetToken } = await import("./emailAuth");
        const result = await generateResetToken(input.email);
        
        // If token was generated (user exists), send email
        if (result.token && result.email) {
          // TODO: Send email with reset link
          // For now, just notify owner (in production, send email to user)
          await notifyOwner({
            title: "Password Reset Requested",
            content: `User ${result.name} (${result.email}) requested a password reset. Token: ${result.token}`,
          });
        }
        
        return { success: true };
      }),

    /**
     * Reset password with token (public)
     */
    resetPassword: publicProcedure
      .input(z.object({
        token: z.string(),
        newPassword: z.string().min(6),
      }))
      .mutation(async ({ input }) => {
        const { resetPassword } = await import("./emailAuth");
        return await resetPassword(input.token, input.newPassword);
      }),

    /**
     * Request email verification (protected)
     */
    requestEmailVerification: protectedProcedure
      .mutation(async ({ ctx }) => {
        const { generateVerificationToken } = await import("./emailAuth");
        const result = await generateVerificationToken(ctx.user.id);
        
        // TODO: Send email with verification link
        // For now, just notify owner (in production, send email to user)
        await notifyOwner({
          title: "Email Verification Requested",
          content: `User ${ctx.user.name} (${ctx.user.email}) requested email verification. Token: ${result.token}`,
        });
        
        return { success: true };
      }),

    /**
     * Verify email with token (public)
     */
    verifyEmail: publicProcedure
      .input(z.object({
        token: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { verifyEmail } = await import("./emailAuth");
        return await verifyEmail(input.token);
      }),

    /**
     * Update user profile (protected)
     */
    updateProfile: protectedProcedure
      .input(z.object({
        name: z.string().optional(),
        phone: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.updateUser(ctx.user.id, input);
        return { success: true };
      }),
  }),

  // ==================== PET MANAGEMENT ====================
  pets: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role === "admin") {
        return await db.getAllPets();
      }
      return await db.getPetsByTutorId(ctx.user.id);
    }),

    listMine: protectedProcedure.query(async ({ ctx }) => {
      return await db.getPetsByTutorId(ctx.user.id);
    }),

    byId: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getPetById(input.id);
      }),

    byStatus: adminProcedure
      .input(z.object({ status: z.enum(["checked-in", "checked-out"]) }))
      .query(async ({ input }) => {
        return await db.getPetsByStatus(input.status);
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1, "Nome do pet é obrigatório"),
        breed: z.string().optional(),
        age: z.string().optional(),
        weight: z.number().optional(),
        birth_date: z.string().optional(),
        food_brand: z.string().optional(),
        food_amount: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Convert birth_date string to Date if provided
        const birth_date = input.birth_date ? new Date(input.birth_date) : undefined;
        
        const petId = await db.createPet({
          ...input,
          birth_date,
          approval_status: ctx.user.role === "admin" ? "approved" : "pending",
        });
        
        // Link pet to tutor
        await db.linkPetToTutor(petId, ctx.user.id, true);
        
        return { id: petId };
      }),

    updateMine: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        breed: z.string().optional(),
        age: z.string().optional(),
        weight: z.number().optional(),
        birth_date: z.string().optional(),
        food_brand: z.string().optional(),
        food_amount: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        
        // Check if pet belongs to user
        const userPets = await db.getPetsByTutorId(ctx.user.id);
        const pet = userPets.find((p: any) => p.id === id);
        
        if (!pet) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Voc\u00ea n\u00e3o tem permiss\u00e3o para editar este pet" });
        }
        
        // Only allow editing pending or rejected pets
        if (pet.approval_status === "approved") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Pets aprovados n\u00e3o podem ser editados. Entre em contato com a creche." });
        }
        
        // Convert birth_date string to Date if provided
        const birth_date = data.birth_date ? new Date(data.birth_date) : undefined;
        
        await db.updatePet(id, {
          ...data,
          birth_date,
          approval_status: "pending", // Reset to pending after edit
        });
        
        return { success: true };
      }),

    updateAdmin: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        breed: z.string().optional(),
        age: z.string().optional(),
        weight: z.number().optional(),
        birth_date: z.date().optional(),
        photo_url: z.string().optional(),
        photo_key: z.string().optional(),
        food_brand: z.string().optional(),
        food_amount: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        await db.updatePet(id, data);
        
        // Track change for important fields
        if (data.weight || data.food_brand || data.food_amount) {
          const changes = [];
          if (data.weight) changes.push(`Peso: ${data.weight}kg`);
          if (data.food_brand) changes.push(`Ração: ${data.food_brand}`);
          if (data.food_amount) changes.push(`Quantidade: ${data.food_amount}g`);
          
          await logChange({
            resourceType: "pet_data",
            resourceId: id,
            petId: id,
            fieldName: "pet_info_updated",
            oldValue: null,
            newValue: changes.join(", "),
            changedBy: ctx.user.id,
            changedByRole: ctx.user.role as "admin" | "tutor" | "user",
            changeType: "update",
          });
        }
        
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deletePet(input.id);
        return { success: true };
      }),

    checkIn: adminProcedure
      .input(z.object({ petId: z.number() }))
      .mutation(async ({ input }) => {
        const now = new Date();
        await db.updatePet(input.petId, {
          status: "checked-in",
          check_in_time: now,
        });
        
        // Send notification to tutors
        await notificationService.notifyCheckIn(input.petId);
        
        return { success: true };
      }),

    checkOut: adminProcedure
      .input(z.object({ petId: z.number() }))
      .mutation(async ({ input }) => {
        const now = new Date();
        await db.updatePet(input.petId, {
          status: "checked-out",
          check_out_time: now,
        });
        
        // Send notification to tutors
        await notificationService.notifyCheckOut(input.petId);
        
        return { success: true };
      }),

    getWeightHistory: protectedProcedure
      .input(z.object({ petId: z.number() }))
      .query(async ({ input }) => {
        // Get weight from daily logs
        const logs = await db.getPetLogs(input.petId);
        return logs
          .filter((log: any) => log.weight)
          .map((log: any) => ({
            date: log.log_date,
            weight: log.weight,
          }));
      }),

    getMoodHistory: protectedProcedure
      .input(z.object({ petId: z.number() }))
      .query(async ({ input }) => {
        const logs = await db.getPetLogs(input.petId);
        return logs
          .filter((log: any) => log.mood)
          .map((log: any) => ({
            date: log.log_date,
            mood: log.mood,
          }));
      }),

    getFrequencyStats: protectedProcedure
      .input(z.object({ petId: z.number() }))
      .query(async ({ input }) => {
        const logs = await db.getPetLogs(input.petId);
        const daycareLog = logs.filter((log: any) => log.location === "daycare");
        
        // Group by month
        const monthlyFrequency: Record<string, number> = {};
        daycareLog.forEach((log: any) => {
          const date = new Date(log.log_date);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
          monthlyFrequency[monthKey] = (monthlyFrequency[monthKey] || 0) + 1;
        });
        
        return Object.entries(monthlyFrequency)
          .map(([month, count]) => ({
            month: new Date(month + "-01").toLocaleDateString("pt-BR", { month: "short", year: "numeric" }),
            frequency: count,
          }))
          .sort((a, b) => a.month.localeCompare(b.month));
      }),

    uploadPhoto: protectedProcedure
      .input(z.object({
        petId: z.number(),
        fileName: z.string(),
        fileContent: z.string(), // base64
        mimeType: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Check if user has access to this pet
        if (ctx.user.role !== "admin") {
          const userPets = await db.getPetsByTutorId(ctx.user.id);
          const hasAccess = userPets.some((p: any) => p.id === input.petId);
          if (!hasAccess) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
          }
        }

        // Convert base64 to buffer
        const buffer = Buffer.from(input.fileContent, "base64");

        // Generate unique file key
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(7);
        const extension = input.fileName.split(".").pop();
        const fileKey = `pets/${input.petId}/profile-${timestamp}-${randomSuffix}.${extension}`;

        // Upload to S3
        const { url } = await storagePut(fileKey, buffer, input.mimeType);

        // Update pet with new photo URL
        await db.updatePet(input.petId, {
          photo_url: url,
          photo_key: fileKey,
        });

        return { photo_url: url };
      }),

    listPending: adminProcedure.query(async () => {
      const pets = await db.getPetsByApprovalStatus("pending");
      // Enrich with tutor info
      const enrichedPets = await Promise.all(
        pets.map(async (pet: any) => {
          const tutors = await db.getPetTutors(pet.id);
          const primaryTutor = tutors.find((t: any) => t.is_primary) || tutors[0];
          return {
            ...pet,
            tutorName: primaryTutor?.tutor?.name || "Desconhecido",
            tutorId: primaryTutor?.tutor?.id,
          };
        })
      );
      return enrichedPets;
    }),

    approve: adminProcedure
      .input(z.object({ petId: z.number() }))
      .mutation(async ({ input }) => {
        await db.updatePet(input.petId, {
          approval_status: "approved",
        });
        
        // TODO: Send notification to tutor
        // const tutors = await db.getPetTutors(input.petId);
        // await notifyOwner({ title: "Pet Aprovado", content: `Pet ${pet.name} foi aprovado!` });
        
        return { success: true };
      }),

    reject: adminProcedure
      .input(z.object({ petId: z.number() }))
      .mutation(async ({ input }) => {
        await db.updatePet(input.petId, {
          approval_status: "rejected",
        });
        
        // TODO: Send notification to tutor
        // const tutors = await db.getPetTutors(input.petId);
        // await notifyOwner({ title: "Pet Rejeitado", content: `Pet ${pet.name} foi rejeitado. Por favor, revise as informa\u00e7\u00f5es.` });
        
        return { success: true };
      }),
  }),

  // ==================== PET CHECK-IN/OUT ====================
  checkin: router({
    checkIn: adminProcedure
      .input(z.object({ petId: z.number() }))
      .mutation(async ({ input }) => {
        // Check if pet has credits
        const balance = await db.getTotalCredits(input.petId);
        if (balance <= 0) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Pet n\u00e3o possui cr\u00e9ditos suficientes para check-in. Por favor, adicione cr\u00e9ditos antes de fazer o check-in.",
          });
        }

        const now = new Date();
        
        // Consume credit first
        const creditId = await db.consumeCredit(input.petId);
        
        // Record usage
        await db.addDaycareUsage({
          pet_id: input.petId,
          usage_date: now,
          check_in_time: now,
          credit_id: creditId,
        });
        
        // Update pet status
        await db.updatePet(input.petId, {
          status: "checked-in",
          check_in_time: now,
        });
        
        // Send notification to tutors
        await notificationService.notifyCheckIn(input.petId);
        
        const remainingCredits = await db.getTotalCredits(input.petId);
        
        return { 
          success: true, 
          remainingCredits,
          message: `Check-in realizado! Cr\u00e9ditos restantes: ${remainingCredits}`,
        };
      }),

    checkOut: adminProcedure
      .input(z.object({ petId: z.number() }))
      .mutation(async ({ input }) => {
        const now = new Date();
        await db.updatePet(input.petId, {
          status: "checked-out",
          check_out_time: now,
        });
        
        // Send notification to tutors
        await notificationService.notifyCheckOut(input.petId);
        
        return { success: true };
      }),

    // Analytics endpoints
    getWeightHistory: protectedProcedure
      .input(z.object({ petId: z.number() }))
      .query(async ({ input }) => {
        return db.getWeightHistory(input.petId);
      }),

    getMoodHistory: protectedProcedure
      .input(z.object({ petId: z.number() }))
      .query(async ({ input }) => {
        return db.getMoodHistory(input.petId);
      }),

    getFrequencyStats: protectedProcedure
      .input(z.object({ petId: z.number() }))
      .query(async ({ input }) => {
        return db.getFrequencyStats(input.petId);
      }),
  }),

  // ==================== PET-TUTOR RELATIONSHIPS ====================
  petTutors: router({
    getTutors: protectedProcedure
      .input(z.object({ petId: z.number() }))
      .query(async ({ input }) => {
        return await db.getPetTutors(input.petId);
      }),

    getTutorsByPet: protectedProcedure
      .input(z.object({ petId: z.number() }))
      .query(async ({ input }) => {
        return await db.getPetTutorsWithDetails(input.petId);
      }),

    searchUserByEmail: adminProcedure
      .input(z.object({ email: z.string() }))
      .mutation(async ({ input }) => {
        return await db.getUserByEmail(input.email);
      }),

    linkTutor: adminProcedure
      .input(z.object({
        petId: z.number(),
        tutorId: z.number(),
        isPrimary: z.boolean().default(false),
      }))
      .mutation(async ({ input }) => {
        await db.addPetTutor({
          pet_id: input.petId,
          tutor_id: input.tutorId,
          is_primary: input.isPrimary,
        });
        return { success: true };
      }),

    unlinkTutor: adminProcedure
      .input(z.object({
        petId: z.number(),
        tutorId: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.removePetTutor(input.petId, input.tutorId);
        return { success: true };
      }),

    setPrimary: adminProcedure
      .input(z.object({
        petId: z.number(),
        tutorId: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.setPrimaryTutor(input.petId, input.tutorId);
        return { success: true };
      }),

    addTutor: adminProcedure
      .input(z.object({
        petId: z.number(),
        tutorId: z.number(),
        isPrimary: z.boolean().default(false),
      }))
      .mutation(async ({ input }) => {
        await db.addPetTutor({
          pet_id: input.petId,
          tutor_id: input.tutorId,
          is_primary: input.isPrimary,
        });
        return { success: true };
      }),

    removeTutor: adminProcedure
      .input(z.object({
        petId: z.number(),
        tutorId: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.removePetTutor(input.petId, input.tutorId);
        return { success: true };
      }),
  }),

  // ==================== USERS/TUTORS ====================
  users: router({
    list: adminProcedure.query(async () => {
      return await db.getAllUsers();
    }),

    tutors: adminProcedure.query(async () => {
      return await db.getUsersByRole("user");
    }),
  }),

  // ==================== DAYCARE CREDITS ====================
  credits: router({
    // Package management
    getPackages: protectedProcedure.query(async () => {
      return await db.getActivePackages();
    }),

    purchasePackage: protectedProcedure
      .input(z.object({
        petId: z.number(),
        packageId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        const pkg = await db.getPackageById(input.packageId);
        if (!pkg) {
          throw new Error("Pacote não encontrado");
        }

        // Add credits to pet
        const creditId = await db.addDaycareCredit({
          pet_id: input.petId,
          package_days: pkg.credits,
          package_price: pkg.priceInCents,
          remaining_days: pkg.credits,
        });

        // Add transaction record
        await db.addTransaction({
          pet_id: input.petId,
          type: "credit",
          category: "daycare_package",
          description: `${pkg.name} - ${pkg.credits} créditos`,
          amount: pkg.priceInCents,
          transaction_date: new Date(),
          created_by_id: ctx.user.id,
        });

        return { success: true, creditId, credits: pkg.credits };
      }),

    getBalance: protectedProcedure
      .input(z.object({ petId: z.number() }))
      .query(async ({ input }) => {
        return await db.getTotalCredits(input.petId);
      }),

    getHistory: protectedProcedure
      .input(z.object({ petId: z.number() }))
      .query(async ({ input }) => {
        return await db.getPetCredits(input.petId);
      }),

    getUsageHistory: protectedProcedure
      .input(z.object({ petId: z.number() }))
      .query(async ({ input }) => {
        return await db.getPetUsageHistory(input.petId);
      }),

    addPackage: adminProcedure
      .input(z.object({
        petId: z.number(),
        packageDays: z.number(),
        packagePrice: z.number(),
        expiryDate: z.date().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const creditId = await db.addDaycareCredit({
          pet_id: input.petId,
          package_days: input.packageDays,
          package_price: input.packagePrice,
          remaining_days: input.packageDays,
          expiry_date: input.expiryDate,
        });
        
        // Add transaction record
        await db.addTransaction({
          pet_id: input.petId,
          type: "credit",
          category: "daycare_package",
          description: `Pacote de ${input.packageDays} dias`,
          amount: input.packagePrice,
          transaction_date: new Date(),
          created_by_id: ctx.user.id,
        });
        
        return { id: creditId };
      }),

    getTransactions: adminProcedure.query(async () => {
      return await db.getAllTransactions();
    }),

    getStats: adminProcedure.query(async () => {
      const transactions = await db.getAllTransactions();
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const monthlyTransactions = transactions.filter((t: any) => 
        new Date(t.transactionDate) >= firstDayOfMonth
      );
      
      const monthlyRevenue = monthlyTransactions
        .filter((t: any) => t.type === "credit" || t.type === "income")
        .reduce((sum: number, t: any) => sum + t.amount, 0);
      
      const monthlyExpenses = monthlyTransactions
        .filter((t: any) => t.type === "expense")
        .reduce((sum: number, t: any) => sum + t.amount, 0);
      
      const pets = await db.getAllPets();
      const petsWithCredits = pets.filter((p: any) => (p.credits || 0) > 0).length;
      const totalActiveCredits = pets.reduce((sum: number, p: any) => sum + (p.credits || 0), 0);
      
      return {
        monthlyRevenue,
        monthlyExpenses,
        petsWithCredits,
        totalActiveCredits,
      };
    }),

    add: adminProcedure
      .input(z.object({
        petId: z.number(),
        amount: z.number(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Add credits to pet
        await db.updatePetCredits(input.petId, input.amount);
        
        // Add transaction record
        await db.addTransaction({
          pet_id: input.petId,
          type: "credit",
          category: "daycare_credits",
          description: input.description || `Adição de ${input.amount} créditos`,
          amount: input.amount * 50, // Assuming R$50 per credit
          transaction_date: new Date(),
          created_by_id: ctx.user.id,
        });
        
        return { success: true };
      }),

    addTransaction: adminProcedure
      .input(z.object({
        petId: z.number().optional(),
        amount: z.number(),
        type: z.enum(["income", "expense", "credit"]),
        category: z.string(),
        description: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.addTransaction({
          pet_id: input.petId,
          type: input.type,
          category: input.category,
          description: input.description,
          amount: input.amount,
          transaction_date: new Date(),
          created_by_id: ctx.user.id,
        });
        return { id };
      }),
  }),

  // ==================== VACCINES ====================
  vaccines: router({
    library: publicProcedure.query(async () => {
      return await db.getVaccineLibrary();
    }),

    addToLibrary: adminProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        intervalDays: z.number().optional(),
        dosesRequired: z.number().default(1),
      }))
      .mutation(async ({ input }) => {
        const id = await db.addVaccineToLibrary(input);
        return { id };
      }),

    getPetVaccinations: protectedProcedure
      .input(z.object({ petId: z.number() }))
      .query(async ({ input }) => {
        return await db.getPetVaccinations(input.petId);
      }),

    addVaccination: protectedProcedure
      .input(z.object({
        petId: z.number(),
        vaccineId: z.number(),
        applicationDate: z.date(),
        nextDueDate: z.date().optional(),
        doseNumber: z.number().default(1),
        veterinarian: z.string().optional(),
        clinic: z.string().optional(),
        batchNumber: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.addPetVaccination({
          pet_id: input.petId,
          vaccine_id: input.vaccineId,
          application_date: input.applicationDate,
          next_due_date: input.nextDueDate,
          dose_number: input.doseNumber,
          veterinarian: input.veterinarian,
          clinic: input.clinic,
          batch_number: input.batchNumber,
          notes: input.notes,
        });

        // Track change
        const { logChange } = await import("./changeTracker");
        await logChange({
          resourceType: "preventive",
          resourceId: id,
          petId: input.petId,
          fieldName: "vaccine_added",
          oldValue: null,
          newValue: `Dose ${input.doseNumber}${input.veterinarian ? ', Vet: ' + input.veterinarian : ''}`,
          changedBy: ctx.user.id,
          changedByRole: ctx.user.role as any,
          changeType: "create",
        });

        // Get vaccine name from library
        const vaccines = await db.getVaccineLibrary();
        const vaccine = vaccines.find(v => v.id === input.vaccineId);
        const vaccineName = vaccine?.name || "Vacina";

        // Auto-create calendar event for application date
        await db.autoCreateVaccineEvent(
          input.petId,
          id,
          vaccineName,
          input.applicationDate,
          input.doseNumber,
          input.veterinarian,
          input.clinic,
          ctx.user.id
        );

        // If there's a next due date, create event for it too
        if (input.nextDueDate) {
          await db.autoCreateVaccineEvent(
            input.petId,
            id,
            vaccineName,
            input.nextDueDate,
            input.doseNumber + 1,
            input.veterinarian,
            input.clinic,
            ctx.user.id
          );
        }

        return { id };
      }),

    upcoming: adminProcedure
      .input(z.object({ daysAhead: z.number().default(30) }))
      .query(async ({ input }) => {
        return await db.getUpcomingVaccinations(input.daysAhead);
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        petId: z.number(),
        nextDueDate: z.date().optional(),
        veterinarian: z.string().optional(),
        clinic: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, petId, ...data } = input;
        
        // Update vaccination
        await db.updatePetVaccination(id, data);
        
        // Track changes
        const changes = [];
        if (data.nextDueDate) {
          changes.push(`Próxima dose: ${data.nextDueDate.toLocaleDateString('pt-BR')}`);
        }
        if (data.veterinarian) {
          changes.push(`Veterinário: ${data.veterinarian}`);
        }
        if (data.clinic) {
          changes.push(`Clínica: ${data.clinic}`);
        }
        if (data.notes) {
          changes.push(`Observações atualizadas`);
        }
        
        if (changes.length > 0) {
          await logChange({
            resourceType: "preventive",
            resourceId: id,
            petId,
            fieldName: "vaccination_updated",
            oldValue: null,
            newValue: changes.join(", "),
            changedBy: ctx.user.id,
            changedByRole: ctx.user.role as "admin" | "tutor",
            changeType: "update",
          });
        }
        
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ 
        id: z.number(),
        petId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.deletePetVaccination(input.id);
        
        // Track change
        const { logChange } = await import("./changeTracker");
        await logChange({
          resourceType: "preventive",
          resourceId: input.id,
          petId: input.petId,
          fieldName: "vaccination_deleted",
          oldValue: null,
          newValue: "Vacinação removida",
          changedBy: ctx.user.id,
          changedByRole: ctx.user.role as any,
          changeType: "delete",
        });
        
        return { success: true };
      }),
  }),

  // ==================== MEDICATIONS ====================
  medications: router({
    library: publicProcedure.query(async () => {
      return await db.getMedicationLibrary();
    }),

    addToLibrary: adminProcedure
      .input(z.object({
        name: z.string(),
        type: z.string(), // Changed from enum to string to allow custom medication types
        description: z.string().optional(),
        commonDosage: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.addMedicationToLibrary(input);
        return { id };
      }),

    getPetMedications: protectedProcedure
      .input(z.object({ petId: z.number() }))
      .query(async ({ input }) => {
        return await db.getPetMedications(input.petId);
      }),

    getActive: protectedProcedure
      .input(z.object({ petId: z.number().optional() }))
      .query(async ({ input }) => {
        if (input.petId) {
          return await db.getActiveMedications(input.petId);
        }
        // Return all active medications from all pets
        return await db.getAllActiveMedications();
      }),

    add: protectedProcedure
      .input(z.object({
        petId: z.number(),
        medicationId: z.number().optional(),
        // Custom medication fields (when tutor creates new medication)
        customMedName: z.string().optional(),
        customMedType: z.string().optional(),
        customMedDescription: z.string().optional(),
        startDate: z.date(),
        endDate: z.date().optional(),
        dosage: z.string(),
        frequency: z.string().optional(),
        administrationTimes: z.string().optional(), // JSON string of times array
        // Advanced periodicity fields
        periodicity: z.enum(["daily", "weekly", "monthly", "custom"]).optional(),
        customInterval: z.number().optional(),
        weekDays: z.array(z.number().min(0).max(6)).optional(),
        monthDays: z.array(z.number().min(1).max(31)).optional(),
        autoSchedule: z.boolean().optional(),
        // Dosage progression fields
        dosageProgression: z.enum(["stable", "increase", "decrease"]).optional(),
        progressionRate: z.string().optional(),
        progressionInterval: z.number().optional(),
        targetDosage: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        let medicationId = input.medicationId;

        // If tutor is creating a custom medication, add it to the library first
        if (input.customMedName && input.customMedType) {
          medicationId = await db.addMedicationToLibrary({
            name: input.customMedName,
            type: input.customMedType as any,
            description: input.customMedDescription,
          });
        }

        if (!medicationId) {
          throw new Error("Medicamento não especificado");
        }

        // Convert arrays to JSON strings for database storage
        const medicationData = {
          ...input,
          medicationId,
          weekDays: input.weekDays ? JSON.stringify(input.weekDays) : undefined,
          monthDays: input.monthDays ? JSON.stringify(input.monthDays) : undefined,
          isActive: true,
        };
        const id = await db.addPetMedication(medicationData as any);

        // Track change
        const { logChange } = await import("./changeTracker");
        await logChange({
          resourceType: "medication",
          resourceId: id,
          petId: input.petId,
          fieldName: "medication_added",
          oldValue: null,
          newValue: `Dosagem: ${input.dosage}${input.frequency ? ', Frequência: ' + input.frequency : ''}`,
          changedBy: ctx.user.id,
          changedByRole: ctx.user.role as any,
          changeType: "create",
        });

        // Auto-create calendar events for entire treatment period
        const medName = input.customMedName || (await db.getMedicationLibrary()).find(m => m.id === medicationId)?.name || "Medicamento";
        await db.autoCreateMedicationPeriod(
          input.petId,
          id,
          medName,
          input.startDate,
          input.endDate,
          input.dosage,
          input.frequency,
          ctx.user.id
        );

        return { id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        petId: z.number(),
        dosage: z.string().optional(),
        frequency: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        administrationTimes: z.string().optional(),
        isActive: z.boolean().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, petId, ...data } = input;
        
        await db.updatePetMedication(id, data);
        
        // Track changes
        const { logChange, serializeValue } = await import("./changeTracker");
        const changes = [];
        
        if (data.endDate) {
          changes.push(`Data final: ${data.endDate.toLocaleDateString('pt-BR')}`);
        }
        
        if (data.isActive !== undefined) {
          changes.push(`Status: ${data.isActive ? 'Ativo' : 'Finalizado'}`);
        }
        
        if (data.notes) {
          changes.push(`Notas atualizadas`);
        }
        
        if (changes.length > 0) {
          await logChange({
            resourceType: "medication",
            resourceId: id,
            petId: petId,
            fieldName: "medication_updated",
            oldValue: null,
            newValue: changes.join(', '),
            changedBy: ctx.user.id,
            changedByRole: ctx.user.role as any,
            changeType: "update",
          });
          
          // Send notification to pet tutors if changed by admin
          if (ctx.user.role === 'admin') {
            const pet = await db.getPetById(petId);
            const tutors = await db.getPetTutors(petId);
            const { sendChangeAlertNotification } = await import("./notificationService");
            
            for (const tutor of tutors) {
              await sendChangeAlertNotification({
                userId: tutor.tutor.id,
                petName: pet?.name || "Pet",
                resourceType: "medication",
                resourceName: "medicamento",
                changedBy: ctx.user.name || "Administrador",
                changedByRole: "admin",
                resourceId: id,
                petId: petId,
              });
            }
          }
        }
        
        return { success: true };
      }),

    scheduleNext: protectedProcedure
      .input(z.object({
        medicationId: z.number(),
        petId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Get medication details
        const medications = await db.getPetMedications(input.petId);
        const medication = medications.find(m => m.medication.id === input.medicationId);
        
        if (!medication) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Medicamento não encontrado" });
        }
        
        const med = medication.medication;
        
        // Calculate next dose date
        const { calculateNextDose } = await import("./medicationScheduler");
        const nextDate = calculateNextDose(new Date(), {
          periodicity: (med.periodicity || "daily") as "daily" | "weekly" | "monthly" | "custom",
          customInterval: med.custom_interval || undefined,
          weekDays: med.week_days ? JSON.parse(med.week_days) : undefined,
          monthDays: med.month_days ? JSON.parse(med.month_days) : undefined,
        });
        
        if (!nextDate) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Não foi possível calcular próxima dose" });
        }
        
        // Calculate current dosage (with progression if configured)
        const { calculateProgressiveDosage } = await import("./dosageProgression");
        let currentDosage = med.dosage;
        
        if (med.dosage_progression && med.dosage_progression !== "stable") {
          currentDosage = calculateProgressiveDosage(med.dosage, {
            dosageProgression: (med.dosage_progression) as "stable" | "increase" | "decrease",
            progressionRate: med.progression_rate || "0",
            progressionInterval: med.progression_interval || 1,
            targetDosage: med.target_dosage || undefined,
            currentDoseCount: med.current_dose_count || 0,
          });
        }
        
        // Get medication name from library
        const library = await db.getMedicationLibrary();
        const medInfo = library.find(m => m.id === med.medication_id);
        const medName = medInfo?.name || "Medicamento";

        // Create calendar event using auto-integration helper
        const eventId = await db.autoCreateMedicationEvent(
          input.petId,
          med.id,
          medName,
          nextDate,
          currentDosage,
          med.frequency || undefined,
          ctx.user.id
        );

        // Increment dose count
        await db.updatePetMedication(med.id, {
          current_dose_count: (med.current_dose_count || 0) + 1,
        });

        return {
          eventId,
          nextDate,
          dosage: currentDosage,
        };
      }),

    delete: protectedProcedure
      .input(z.object({ 
        id: z.number(),
        petId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.deletePetMedication(input.id);
        
        // Track change
        const { logChange } = await import("./changeTracker");
        await logChange({
          resourceType: "medication",
          resourceId: input.id,
          petId: input.petId,
          fieldName: "medication_deleted",
          oldValue: null,
          newValue: "Medicamento removido",
          changedBy: ctx.user.id,
          changedByRole: ctx.user.role as any,
          changeType: "delete",
        });
        
        return { success: true };
      }),
  }),

  // ==================== DAILY LOGS ====================
  logs: router({
    add: protectedProcedure
      .input(z.object({
        petId: z.number(),
        logDate: z.date(),
        source: z.enum(["home", "daycare"]),
        mood: z.enum(["feliz", "calmo", "ansioso", "triste", "agitado"]).optional(),
        stool: z.enum(["normal", "diarreia", "constipado", "nao_fez"]).optional(),
        appetite: z.enum(["normal", "aumentado", "diminuido", "nao_comeu"]).optional(),
        behavior: z.string().optional(),
        behaviorNotes: z.string().optional(),
        activities: z.string().optional(),
        foodConsumed: z.string().optional(),
        feedingTime: z.string().optional(),
        feedingAmount: z.string().optional(),
        feedingAcceptance: z.enum(["excelente", "boa", "regular", "ruim", "recusou"]).optional(),
        weight: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.addDailyLog({
          pet_id: input.petId,
          log_date: input.logDate,
          source: input.source,
          mood: input.mood,
          stool: input.stool,
          appetite: input.appetite,
          behavior: input.behavior,
          behavior_notes: input.behaviorNotes,
          activities: input.activities,
          food_consumed: input.foodConsumed,
          feeding_time: input.feedingTime,
          feeding_amount: input.feedingAmount,
          feeding_acceptance: input.feedingAcceptance,
          weight: input.weight,
          notes: input.notes,
          created_by_id: ctx.user.id,
        });
        return { id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        petId: z.number(),
        logDate: z.date(),
        source: z.enum(["home", "daycare"]),
        mood: z.enum(["feliz", "calmo", "ansioso", "triste", "agitado"]).optional(),
        stool: z.enum(["normal", "diarreia", "constipado", "nao_fez"]).optional(),
        appetite: z.enum(["normal", "aumentado", "diminuido", "nao_comeu"]).optional(),
        behavior: z.string().optional(),
        behaviorNotes: z.string().optional(),
        activities: z.string().optional(),
        foodConsumed: z.string().optional(),
        feedingTime: z.string().optional(),
        feedingAmount: z.string().optional(),
        feedingAcceptance: z.enum(["excelente", "boa", "regular", "ruim", "recusou"]).optional(),
        weight: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.updateDailyLog(input.id, input);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteDailyLog(input.id);
        return { success: true };
      }),

    getPetLogs: protectedProcedure
      .input(z.object({
        petId: z.number(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }))
      .query(async ({ input }) => {
        return await db.getPetLogs(input.petId, input.startDate, input.endDate);
      }),

    getByDate: adminProcedure
      .input(z.object({ date: z.date() }))
      .query(async ({ input }) => {
        return await db.getLogsByDate(input.date);
      }),

    list: adminProcedure
      .input(z.object({ petId: z.number() }).optional())
      .query(async ({ input }) => {
        if (input?.petId) {
          return await db.getPetLogs(input.petId);
        }
        // Return all logs for admin
        return await db.getAllLogs();
      }),

    listMine: protectedProcedure
      .query(async ({ ctx }) => {
        // Get all pets owned by this tutor
        const myPets = await db.getPetsByTutorId(ctx.user.id);
        const petIds = myPets.map(p => p.id);
        
        // Get logs for all my pets
        const allLogs = [];
        for (const petId of petIds) {
          const logs = await db.getPetLogs(petId);
          allLogs.push(...logs);
        }
        
        // Sort by date descending
        return allLogs.sort((a, b) => 
          new Date(b.log_date).getTime() - new Date(a.log_date).getTime()
        );
      }),
  }),

  // ==================== CALENDAR ====================
  calendar: router({
    getEvents: protectedProcedure
      .input(z.object({
        startDate: z.date(),
        endDate: z.date(),
      }))
      .query(async ({ input }) => {
        return await db.getCalendarEvents(input.startDate, input.endDate);
      }),

    getPetEvents: protectedProcedure
      .input(z.object({ petId: z.number() }))
      .query(async ({ input }) => {
        return await db.getPetEvents(input.petId);
      }),

    add: protectedProcedure
      .input(z.object({
        title: z.string(),
        description: z.string().optional(),
        eventDate: z.date(),
        endDate: z.date().optional(),
        eventType: z.enum(["holiday", "medical", "general", "vaccination", "medication", "closure", "checkin", "checkout", "preventive"]),
        petId: z.number().optional(),
        location: z.string().optional(),
        isAllDay: z.boolean().default(true),
        // Multi-day stay period fields
        checkInDate: z.date().optional(),
        checkOutDate: z.date().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Calculate daily count if period is provided
        let dailyCount: number | undefined;
        if (input.checkInDate && input.checkOutDate) {
          const { calculateDailyCount, validatePeriod } = await import("./dailyPeriodHelper");
          
          // Validate period
          const validation = validatePeriod(input.checkInDate, input.checkOutDate);
          if (!validation.valid) {
            throw new TRPCError({ code: "BAD_REQUEST", message: validation.error });
          }
          
          dailyCount = calculateDailyCount(input.checkInDate, input.checkOutDate);
        }
        
        const id = await db.addCalendarEvent({
          title: input.title,
          description: input.description,
          event_date: input.eventDate,
          end_date: input.endDate,
          event_type: input.eventType,
          pet_id: input.petId,
          location: input.location,
          is_all_day: input.isAllDay,
          check_in_date: input.checkInDate,
          check_out_date: input.checkOutDate,
          daily_count: dailyCount,
          created_by_id: ctx.user.id,
        });
        
        // Track change
        if (input.petId) {
          await logChange({
            resourceType: "calendar",
            resourceId: id,
            petId: input.petId,
            fieldName: "event_added",
            oldValue: null,
            newValue: `${input.title} - ${input.eventType}`,
            changedBy: ctx.user.id,
            changedByRole: ctx.user.role as "admin" | "tutor",
            changeType: "create",
          });
        }
        
        return { id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        petId: z.number().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        eventDate: z.date().optional(),
        endDate: z.date().optional(),
        eventType: z.enum(["holiday", "medical", "general", "vaccination", "medication", "closure", "checkin", "checkout", "preventive"]).optional(),
        location: z.string().optional(),
        isAllDay: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, petId, ...data } = input;
        await db.updateCalendarEvent(id, data);
        
        // Track change
        if (petId && Object.keys(data).length > 0) {
          await logChange({
            resourceType: "calendar",
            resourceId: id,
            petId,
            fieldName: "event_updated",
            oldValue: null,
            newValue: JSON.stringify(data),
            changedBy: ctx.user.id,
            changedByRole: ctx.user.role as "admin" | "tutor",
            changeType: "update",
          });
        }
        
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ 
        id: z.number(),
        petId: z.number().optional(),
        title: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.deleteCalendarEvent(input.id);
        
        // Track change
        if (input.petId) {
          await logChange({
            resourceType: "calendar",
            resourceId: input.id,
            petId: input.petId,
            fieldName: "event_deleted",
            oldValue: input.title || "Event",
            newValue: null,
            changedBy: ctx.user.id,
            changedByRole: ctx.user.role as "admin" | "tutor",
            changeType: "delete",
          });
        }
        
        return { success: true };
      }),

    exportToICal: protectedProcedure
      .input(z.object({
        startDate: z.date(),
        endDate: z.date(),
      }))
      .mutation(async ({ input }) => {
        const { exportEventsToICal } = await import("./icalExport");
        const icalContent = await exportEventsToICal(input.startDate, input.endDate);
        return { icalContent };
      }),
  }),

  // ==================== DOCUMENTS ====================
  documents: router({
    listAll: adminProcedure
      .input(z.object({
        petId: z.number().optional(),
        category: z.enum(["vaccination_card", "veterinary_document", "exam", "certificate", "prescription", "other"]).optional(),
      }))
      .query(async ({ input }) => {
        return await db.getAllDocuments(input.petId, input.category);
      }),

    getPetDocuments: protectedProcedure
      .input(z.object({ petId: z.number() }))
      .query(async ({ input }) => {
        return await db.getPetDocuments(input.petId);
      }),

    getByCategory: protectedProcedure
      .input(z.object({
        petId: z.number(),
        category: z.enum(["vaccination_card", "veterinary_document", "exam", "certificate", "prescription", "other"]),
      }))
      .query(async ({ input }) => {
        return await db.getDocumentsByCategory(input.petId, input.category);
      }),

    upload: protectedProcedure
      .input(z.object({
        petId: z.number(),
        title: z.string(),
        description: z.string().optional(),
        category: z.enum(["vaccination_card", "veterinary_document", "exam", "certificate", "prescription", "other"]),
        fileData: z.string(),
        fileName: z.string(),
        mimeType: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const buffer = Buffer.from(input.fileData.split(",")[1] || input.fileData, "base64");
        const ext = input.fileName.split(".").pop() || "bin";
        const fileKey = `pets/${input.petId}/documents/${Date.now()}-${input.fileName}`;
        
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        
        const id = await db.addDocument({
          pet_id: input.petId,
          title: input.title,
          description: input.description,
          category: input.category,
          file_url: url,
          file_key: fileKey,
          file_name: input.fileName,
          mime_type: input.mimeType,
          file_size: buffer.length,
          uploaded_by_id: ctx.user.id,
        });
        
        return { id, url };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.updateDocument(input.id, {
          title: input.title,
          description: input.description,
        });
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteDocument(input.id);
        return { success: true };
      }),
  }),

  // ==================== NOTIFICATIONS ====================
  notifications: router({
    getUserNotifications: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserNotifications(ctx.user.id);
    }),

    markAsRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.markNotificationAsRead(input.id);
        return { success: true };
      }),
    
    markAllAsRead: protectedProcedure
      .mutation(async ({ ctx }) => {
        await db.markAllNotificationsAsRead(ctx.user.id);
        return { success: true };
      }),
    
    getUnreadCount: protectedProcedure
      .query(async ({ ctx }) => {
        const count = await db.getUnreadNotificationCount(ctx.user.id);
        return { count };
      }),

    triggerVaccineAlerts: adminProcedure
      .mutation(async () => {
        const result = await triggerVaccineNotificationsManually();
        return result;
      }),

    triggerCalendarReminders: adminProcedure
      .mutation(async () => {
        const { sendCalendarReminders } = await import("./jobs/calendarReminders");
        const result = await sendCalendarReminders();
        return result;
      }),

    triggerLowCreditsAlerts: adminProcedure
      .mutation(async () => {
        const { sendLowCreditsAlerts } = await import("./jobs/lowCreditsAlerts");
        const result = await sendLowCreditsAlerts();
        return result;
      }),
  }),

  // ==================== TRANSACTIONS & FINANCES ====================
  finances: router({
    getPetTransactions: protectedProcedure
      .input(z.object({ petId: z.number() }))
      .query(async ({ input }) => {
        return await db.getPetTransactions(input.petId);
      }),

    getByDateRange: adminProcedure
      .input(z.object({
        startDate: z.date(),
        endDate: z.date(),
      }))
      .query(async ({ input }) => {
        return await db.getTransactionsByDateRange(input.startDate, input.endDate);
      }),

    getSummary: adminProcedure
      .input(z.object({
        startDate: z.date(),
        endDate: z.date(),
      }))
      .query(async ({ input }) => {
        return await db.getFinancialSummary(input.startDate, input.endDate);
      }),

    addTransaction: adminProcedure
      .input(z.object({
        petId: z.number().optional(),
        type: z.enum(["credit", "debit"]),
        category: z.enum(["daycare_package", "daycare_usage", "grooming", "veterinary", "other"]),
        description: z.string(),
        amount: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.addTransaction({
          pet_id: input.petId,
          type: input.type,
          category: input.category,
          description: input.description,
          amount: input.amount,
          transaction_date: new Date(),
          created_by_id: ctx.user.id,
        });
        return { id };
      }),
  }),

  // ==================== REPORTS ====================
  reports: router({
    generate: protectedProcedure
      .input(z.object({
        petId: z.number(),
        type: z.enum(["behavior", "health", "financial"]),
        periodDays: z.number(),
      }))
      .mutation(async ({ input }) => {
        // Simulação de geração de relatório
        // Em produção, aqui seria gerado um PDF real
        const reportUrl = `/api/reports/${input.petId}/${input.type}/${input.periodDays}`;
        return { 
          success: true, 
          url: reportUrl,
          message: `Relatório de ${input.type} gerado com sucesso` 
        };
      }),

    occupancy: adminProcedure
      .input(z.object({
        startDate: z.date(),
        endDate: z.date(),
      }))
      .query(async ({ input }) => {
        const { getOccupancyReport } = await import("./occupancyReport");
        return await getOccupancyReport(input.startDate, input.endDate);
      }),
  }),

  // ==================== DASHBOARD STATS ====================
  dashboard: router({
    stats: adminProcedure.query(async () => {
      const allPets = await db.getAllPets();
      const checkedIn = allPets.filter(p => p.status === "checked-in").length;
      const checkedOut = allPets.filter(p => p.status === "checked-out").length;
      
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      const monthlyFinances = await db.getFinancialSummary(startOfMonth, endOfMonth);
      const upcomingVaccines = await db.getUpcomingVaccinations(30);
      
      return {
        totalPets: allPets.length,
        checkedIn,
        checkedOut,
        monthlyRevenue: monthlyFinances.credits,
        monthlyExpenses: monthlyFinances.debits,
        upcomingVaccines: upcomingVaccines.length,
      };
    }),
  }),

  // ==================== PET PHOTOS ====================
  photos: router({
    list: protectedProcedure
      .input(z.object({ petId: z.number() }))
      .query(async ({ input }) => {
        return await db.getPetPhotos(input.petId);
      }),

    upload: protectedProcedure
      .input(z.object({
        petId: z.number(),
        photoData: z.string(), // base64
        caption: z.string().optional(),
        takenAt: z.date(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Decode base64 and upload to S3
        const buffer = Buffer.from(input.photoData.split(',')[1], 'base64');
        const fileKey = `pets/${input.petId}/photos/${Date.now()}.jpg`;
        const { url } = await storagePut(fileKey, buffer, 'image/jpeg');
        
        const photoId = await db.addPetPhoto({
          pet_id: input.petId,
          photo_url: url,
          photo_key: fileKey,
          caption: input.caption || null,
          taken_at: input.takenAt,
          uploaded_by_id: ctx.user.id,
        });
        
        return { id: photoId, url };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // Verify ownership or admin
        const photo = await db.getPhotoById(input.id);
        if (!photo) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Photo not found' });
        }
        
        if (ctx.user.role !== 'admin' && photo.uploaded_by_id !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot delete this photo' });
        }
        
        await db.deletePetPhoto(input.id);
        return { success: true };
      }),

    uploadMultiple: protectedProcedure
      .input(z.object({
        petId: z.number(),
        photos: z.array(z.object({
          photoData: z.string(), // base64
          caption: z.string().optional(),
          takenAt: z.date(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        const results = [];
        for (const photo of input.photos) {
          const buffer = Buffer.from(photo.photoData.split(',')[1], 'base64');
          const fileKey = `pets/${input.petId}/photos/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
          const { url } = await storagePut(fileKey, buffer, 'image/jpeg');
          
          const photoId = await db.addPetPhoto({
            pet_id: input.petId,
            photo_url: url,
            photo_key: fileKey,
            caption: photo.caption || null,
            taken_at: photo.takenAt, // photo.takenAt is from input, schema uses taken_at
            uploaded_by_id: ctx.user.id,
          });
          
          results.push({ id: photoId, url });
        }
        return results;
      }),

    addComment: protectedProcedure
      .input(z.object({
        photoId: z.number(),
        comment: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const comment = await db.addPhotoComment(input.photoId, ctx.user.id, input.comment);
        return comment;
      }),

    getComments: protectedProcedure
      .input(z.object({ photoId: z.number() }))
      .query(async ({ input }) => {
        return await db.getPhotoComments(input.photoId);
      }),

    addReaction: protectedProcedure
      .input(z.object({
        photoId: z.number(),
        reactionType: z.enum(["like", "love", "laugh"]).default("like"),
      }))
      .mutation(async ({ input, ctx }) => {
        const reaction = await db.addPhotoReaction(input.photoId, ctx.user.id, input.reactionType);
        return reaction;
      }),

    removeReaction: protectedProcedure
      .input(z.object({ photoId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.removePhotoReaction(input.photoId, ctx.user.id);
        return { success: true };
      }),

    getReactions: protectedProcedure
      .input(z.object({ photoId: z.number() }))
      .query(async ({ input }) => {
        return await db.getPhotoReactions(input.photoId);
      }),

    getTimeline: protectedProcedure
      .input(z.object({ petId: z.number() }))
      .query(async ({ input }) => {
        const photos = await db.getPetPhotos(input.petId);
        
        // Group by date
        const timeline: Record<string, typeof photos> = {};
        photos.forEach((photo: any) => {
          const dateKey = new Date(photo.taken_at).toISOString().split('T')[0];
          if (!timeline[dateKey]) {
            timeline[dateKey] = [];
          }
          timeline[dateKey].push(photo);
        });
        
        return timeline;
      }),
  }),

  // ==================== AUTOMATED ALERTS ====================
  alerts: router({
    checkLowCredits: adminProcedure
      .input(z.object({ threshold: z.number().default(5) }))
      .mutation(async ({ input }) => {
        const petsWithLowCredits = await db.getPetsWithLowCredits(input.threshold);
        
        if (petsWithLowCredits.length > 0) {
          const petNames = petsWithLowCredits.map(p => `${p.name} (${p.credits} diárias)`).join(", ");
          await notifyOwner({
            title: "⚠️ Alerta: Pets com Saldo Baixo",
            content: `${petsWithLowCredits.length} pet(s) com saldo baixo de diárias: ${petNames}`,
          });
        }
        
        return { count: petsWithLowCredits.length, pets: petsWithLowCredits };
      }),

    checkUpcomingVaccines: adminProcedure
      .input(z.object({ daysAhead: z.number().default(30) }))
      .mutation(async ({ input }) => {
        const vaccinesDue = await db.getVaccinesDueSoon(input.daysAhead);
        
        if (vaccinesDue.length > 0) {
          const vaccineList = vaccinesDue.map(v => 
            `${v.pet.name} - ${v.vaccine.name} (${new Date(v.vaccination.next_due_date!).toLocaleDateString("pt-BR")})`
          ).join(", ");
          
          await notifyOwner({
            title: "💉 Alerta: Vacinas Próximas do Vencimento",
            content: `${vaccinesDue.length} vacina(s) vencendo nos próximos ${input.daysAhead} dias: ${vaccineList}`,
          });
        }
        
        return { count: vaccinesDue.length, vaccines: vaccinesDue };
      }),

    runAllChecks: adminProcedure
      .mutation(async () => {
        const lowCredits = await db.getPetsWithLowCredits(5);
        const vaccinesDue = await db.getVaccinesDueSoon(30);
        
        const alerts = [];
        
        if (lowCredits.length > 0) {
          const petNames = lowCredits.map(p => `${p.name} (${p.credits} diárias)`).join(", ");
          await notifyOwner({
            title: "⚠️ Alerta: Pets com Saldo Baixo",
            content: `${lowCredits.length} pet(s) com saldo baixo de diárias: ${petNames}`,
          });
          alerts.push({ type: "low_credits", count: lowCredits.length });
        }
        
        if (vaccinesDue.length > 0) {
          const vaccineList = vaccinesDue.map(v => 
            `${v.pet.name} - ${v.vaccine.name} (${new Date(v.vaccination.next_due_date!).toLocaleDateString("pt-BR")})`
          ).join(", ");
          
          await notifyOwner({
            title: "💉 Alerta: Vacinas Próximas do Vencimento",
            content: `${vaccinesDue.length} vacina(s) vencendo nos próximos 30 dias: ${vaccineList}`,
          });
          alerts.push({ type: "vaccines_due", count: vaccinesDue.length });
        }
        
        return { alerts, totalAlerts: alerts.length };
      }),
  }),

  // Subscription Plans Management
  plans: router({
    list: adminProcedure
      .input(z.object({ activeOnly: z.boolean().optional() }).optional())
      .query(async ({ input }) => {
        return db.listSubscriptionPlans(input?.activeOnly);
      }),

    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        price: z.number().int().positive(),
        credits: z.number().int().positive(),
        validityDays: z.number().int().positive(),
        benefits: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createSubscriptionPlan(input);
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        price: z.number().int().positive().optional(),
        credits: z.number().int().positive().optional(),
        validityDays: z.number().int().positive().optional(),
        benefits: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateSubscriptionPlan(id, data);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteSubscriptionPlan(input.id);
        return { success: true };
      }),

    getSubscribers: adminProcedure
      .input(z.object({ planId: z.number() }))
      .query(async ({ input }) => {
        return db.getSubscriptionsByPlan(input.planId);
      }),
  }),

  // User Subscriptions
  subscriptions: router({
    getActive: protectedProcedure
      .query(async ({ ctx }) => {
        return db.getUserActiveSubscription(ctx.user.id);
      }),

    getHistory: protectedProcedure
      .query(async ({ ctx }) => {
        return db.getUserSubscriptionHistory(ctx.user.id);
      }),

    subscribe: protectedProcedure
      .input(z.object({
        planId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check if user already has an active subscription
        const existing = await db.getUserActiveSubscription(ctx.user.id);
        if (existing) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Você já possui uma assinatura ativa",
          });
        }

        const plan = await db.getSubscriptionPlanById(input.planId);
        if (!plan || !plan.isActive) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Plano não encontrado ou inativo",
          });
        }

        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + plan.validityDays);

        const subscription = await db.createSubscription({
          userId: ctx.user.id,
          planId: input.planId,
          status: "active",
          startDate,
          endDate,
          autoRenew: true,
        });

        // Add credits to user's pets (assuming first pet for now)
        const userPets = await db.getPetsByTutorId(ctx.user.id);
        if (userPets.length > 0) {
          const firstPet = userPets[0];
          await db.updatePet(firstPet.id, { credits: (firstPet.credits || 0) + plan.credits });
        }

        return subscription;
      }),

    cancel: protectedProcedure
      .input(z.object({ subscriptionId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const subscription = await db.getUserActiveSubscription(ctx.user.id);
        if (!subscription || subscription.id !== input.subscriptionId) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Assinatura não encontrada",
          });
        }

        await db.cancelSubscription(input.subscriptionId);
        return { success: true };
      }),

    // Admin only: Get all subscriptions and metrics
    getMetrics: adminProcedure
      .query(async () => {
        return db.getSubscriptionMetrics();
      }),

    getAllActive: adminProcedure
      .query(async () => {
        return db.getAllActiveSubscriptions();
      }),
  }),

  // Flea Treatments Router
  flea: router({
    create: protectedProcedure
      .input(z.object({
        petId: z.number(),
        productName: z.string(),
        applicationDate: z.date(),
        nextDueDate: z.date(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify pet ownership
        const pets = await db.getPetsByTutorId(ctx.user.id);
        const pet = pets.find(p => p.id === input.petId);
        if (!pet && ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Você não tem permissão para acessar este pet",
          });
        }

        const result = await db.createFleaTreatment({
          petId: input.petId,
          productName: input.productName,
          applicationDate: input.applicationDate,
          nextDueDate: input.nextDueDate,
          notes: input.notes,
          createdById: ctx.user.id,
        });

        const resultId = (result as any).id;

        // Track change
        const { logChange } = await import("./changeTracker");
        await logChange({
          resourceType: "preventive",
          resourceId: resultId,
          petId: input.petId,
          fieldName: "flea_treatment_added",
          oldValue: null,
          newValue: `${input.productName} - Próxima aplicação: ${input.nextDueDate.toLocaleDateString('pt-BR')}`,
          changedBy: ctx.user.id,
          changedByRole: ctx.user.role as any,
          changeType: "create",
        });

        // Auto-create calendar events for flea treatment
        await db.autoCreateFleaEvent(
          input.petId,
          resultId,
          input.productName,
          input.applicationDate,
          input.nextDueDate,
          ctx.user.id
        );

        // Create event for next due date too
        await db.autoCreateFleaEvent(
          input.petId,
          resultId,
          input.productName,
          input.nextDueDate,
          undefined,
          ctx.user.id
        );

        return result;
      }),

    list: protectedProcedure
      .input(z.object({ petId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Verify pet ownership
        const pets = await db.getPetsByTutorId(ctx.user.id);
        const pet = pets.find(p => p.id === input.petId);
        if (!pet && ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Você não tem permissão para acessar este pet",
          });
        }

        return db.getFleaTreatmentsByPetId(input.petId);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteFleaTreatment(input.id);
        return { success: true };
      }),
  }),

  // Deworming Treatments Router
  deworming: router({
    create: protectedProcedure
      .input(z.object({
        petId: z.number(),
        productName: z.string(),
        applicationDate: z.date(),
        nextDueDate: z.date(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify pet ownership
        const pets = await db.getPetsByTutorId(ctx.user.id);
        const pet = pets.find(p => p.id === input.petId);
        if (!pet && ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Você não tem permissão para acessar este pet",
          });
        }

        const result = await db.createDewormingTreatment({
          petId: input.petId,
          productName: input.productName,
          applicationDate: input.applicationDate,
          nextDueDate: input.nextDueDate,
          notes: input.notes,
          createdById: ctx.user.id,
        });

        const resultId = (result as any).id;

        // Track change
        const { logChange } = await import("./changeTracker");
        await logChange({
          resourceType: "preventive",
          resourceId: resultId,
          petId: input.petId,
          fieldName: "deworming_treatment_added",
          oldValue: null,
          newValue: `${input.productName} - Próxima aplicação: ${input.nextDueDate.toLocaleDateString('pt-BR')}`,
          changedBy: ctx.user.id,
          changedByRole: ctx.user.role as any,
          changeType: "create",
        });

        // Auto-create calendar events for deworming treatment
        await db.autoCreateDewormingEvent(
          input.petId,
          resultId,
          input.productName,
          input.applicationDate,
          input.nextDueDate,
          ctx.user.id
        );

        // Create event for next due date too
        await db.autoCreateDewormingEvent(
          input.petId,
          resultId,
          input.productName,
          input.nextDueDate,
          undefined,
          ctx.user.id
        );

        return result;
      }),

    list: protectedProcedure
      .input(z.object({ petId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Verify pet ownership
        const pets = await db.getPetsByTutorId(ctx.user.id);
        const pet = pets.find(p => p.id === input.petId);
        if (!pet && ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Você não tem permissão para acessar este pet",
          });
        }

        return db.getDewormingTreatmentsByPetId(input.petId);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteDewormingTreatment(input.id);
        return { success: true };
      }),
  }),

  behavior: router({
    create: protectedProcedure
      .input(z.object({
        petId: z.number(),
        date: z.date(),
        location: z.enum(["daycare", "home", "walk", "vet", "other"]),
        behaviorType: z.enum(["positive", "negative", "neutral"]),
        description: z.string(),
        tags: z.string().optional(),
        severity: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify pet ownership
        const pets = await db.getPetsByTutorId(ctx.user.id);
        const pet = pets.find(p => p.id === input.petId);
        if (!pet && ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Você não tem permissão para acessar este pet",
          });
        }

        return db.createBehaviorRecord({
          ...input,
          createdById: ctx.user.id,
        });
      }),

    list: protectedProcedure
      .input(z.object({ petId: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        if (input.petId) {
          // Verify pet ownership
          const pets = await db.getPetsByTutorId(ctx.user.id);
          const pet = pets.find(p => p.id === input.petId);
          if (!pet && ctx.user.role !== "admin") {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Você não tem permissão para acessar este pet",
            });
          }
          return db.listBehaviorRecords(input.petId);
        }
        // List all for current user
        return db.listBehaviorRecords();
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteBehaviorRecord(input.id);
        return { success: true };
      }),
  }),

  training: router({
    create: protectedProcedure
      .input(z.object({
        petId: z.number(),
        skill: z.string(),
        startDate: z.date(),
        currentLevel: z.number().min(1).max(10),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify pet ownership
        const pets = await db.getPetsByTutorId(ctx.user.id);
        const pet = pets.find(p => p.id === input.petId);
        if (!pet && ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Você não tem permissão para acessar este pet",
          });
        }

        return db.createTrainingProgress({
          ...input,
          createdById: ctx.user.id,
        });
      }),

    list: protectedProcedure
      .input(z.object({ petId: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        if (input.petId) {
          // Verify pet ownership
          const pets = await db.getPetsByTutorId(ctx.user.id);
          const pet = pets.find(p => p.id === input.petId);
          if (!pet && ctx.user.role !== "admin") {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Você não tem permissão para acessar este pet",
            });
          }
          return db.listTrainingProgress(input.petId);
        }
        return db.listTrainingProgress();
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        currentLevel: z.number().min(1).max(10),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.updateTrainingProgress(input.id, input.currentLevel, input.notes);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteTrainingProgress(input.id);
        return { success: true };
      }),
  }),

  bookings: router({
    create: protectedProcedure
      .input(z.object({
        petId: z.number(),
        bookingDate: z.date(),
        numberOfDays: z.number().min(1).default(1),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const booking = await db.createBooking({
          petId: input.petId,
          tutorId: ctx.user.id,
          bookingDate: input.bookingDate,
          numberOfDays: input.numberOfDays,
          notes: input.notes,
          status: "confirmed", // Auto-confirm for now
        });
        
        // Send notification
        await notificationService.createNotification({
          userId: ctx.user.id,
          petId: input.petId,
          type: "system",
          title: "Agendamento confirmado! 📅",
          message: `Seu agendamento para ${new Date(input.bookingDate).toLocaleDateString("pt-BR")} foi confirmado com sucesso.`,
        });
        
        return booking;
      }),

    list: protectedProcedure
      .input(z.object({
        petId: z.number().optional(),
        status: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        return db.listBookings({
          tutorId: ctx.user.id,
          petId: input.petId,
          status: input.status,
        });
      }),

    cancel: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const booking = await db.getBookingById(input.id);
        if (!booking || booking.tutorId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        await db.updateBookingStatus(input.id, "cancelled");
        return { success: true };
      }),

    getByDateRange: protectedProcedure
      .input(z.object({
        startDate: z.date(),
        endDate: z.date(),
      }))
      .query(async ({ input }) => {
        return db.getBookingsByDateRange(input.startDate, input.endDate);
      }),
  }),

  reviews: router({
    create: protectedProcedure
      .input(z.object({
        petId: z.number(),
        rating: z.number().min(1).max(5),
        comment: z.string().optional(),
        visitDate: z.date(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createReview({
          petId: input.petId,
          tutorId: ctx.user.id,
          rating: input.rating,
          comment: input.comment,
          visitDate: input.visitDate,
        });
      }),

    list: protectedProcedure
      .input(z.object({
        petId: z.number().optional(),
      }))
      .query(async ({ ctx, input }) => {
        return db.listReviews({
          tutorId: ctx.user.id,
          petId: input.petId,
        });
      }),

    getAverageRating: publicProcedure
      .query(async () => {
        return db.getAverageRating();
      }),
  }),

  ai: router({
    chat: protectedProcedure
      .input(z.object({
        message: z.string(),
        context: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          // Build system prompt with context
          const systemPrompt = `Você é um assistente virtual especializado em cuidados com pets, especialmente cães. 
Você trabalha para a TeteCare, uma creche para pets profissional.

Contexto do usuário:
${input.context || "Nenhum pet cadastrado ainda."}

Responda de forma amigável, profissional e informativa. Se a pergunta for sobre saúde específica, sempre recomende consultar um veterinário.
Mantenha as respostas concisas (máximo 3 parágrafos) e práticas.`;

          const response = await invokeLLM({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: input.message },
            ],
          });

          const assistantMessage = response.choices[0]?.message?.content || "Desculpe, não consegui processar sua mensagem.";

          return {
            message: assistantMessage,
          };
        } catch (error) {
          console.error("AI chat error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Erro ao processar mensagem",
          });
        }
      }),
  }),

  // ==================== USER MANAGEMENT ====================
  userManagement: router({
    list: adminProcedure.query(async () => {
      return await db.listAllUsers();
    }),

    byId: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getUserById(input.id);
      }),

    updateRole: adminProcedure
      .input(z.object({ userId: z.number(), role: z.enum(["admin", "user"]) }))
      .mutation(async ({ input, ctx }) => {
        await db.updateUserRole(input.userId, input.role);
        
        // Log the action
        await logAdminAction({
          adminId: ctx.user.id,
          action: input.role === "admin" ? "promote_admin" : "demote_admin",
          targetType: "user",
          targetId: input.userId,
          details: { newRole: input.role },
          req: ctx.req,
        });
        
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // Prevent self-deletion
        if (input.userId === ctx.user.id) {
          throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: "Voc\u00ea n\u00e3o pode deletar sua pr\u00f3pria conta" 
          });
        }
        await db.deleteUser(input.userId);
        return { success: true };
      }),
  }),

  // ==================== ADMIN LOGS ====================
  adminLogs: router({
    list: adminProcedure
      .input(z.object({
        adminId: z.number().optional(),
        action: z.string().optional(),
        limit: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        const { getAdminLogs } = await import("./adminLogger");
        return await getAdminLogs(input);
      }),
  }),

  // ==================== ADMIN INVITES ====================
  adminInvites: router({
    create: adminProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input, ctx }) => {
        // Generate unique token
        const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
        
        // Set expiration to 7 days from now
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        // Create invite
        await db.createAdminInvite({
          email: input.email,
          token,
          invitedBy: ctx.user.id,
          status: "pending",
          expiresAt,
        });

        // Send email with invite link
        const origin = (ctx.req as any).headers?.origin || "http://localhost:3000";
        const inviteUrl = `${origin}/accept-invite?token=${token}`;

        // TODO: Implement email sending service
        // For now, just log the invite URL
        console.log(`[Admin Invite] Invite URL for ${input.email}: ${inviteUrl}`);

        // Notify owner with invite link
        await notifyOwner({
          title: "Novo Convite de Admin Enviado",
          content: `Convite enviado para: ${input.email}\n\nLink do convite:\n${inviteUrl}\n\nV\u00e1lido at\u00e9: ${expiresAt.toLocaleString("pt-BR")}`,
        });

        return { success: true, inviteUrl };
      }),

    list: adminProcedure.query(async () => {
      return await db.listPendingAdminInvites();
    }),

    accept: publicProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const invite = await db.getAdminInviteByToken(input.token);

        if (!invite) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Convite n\u00e3o encontrado" });
        }

        if (invite.status !== "pending") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Convite j\u00e1 foi usado ou expirou" });
        }

        if (new Date() > new Date(invite.expiresAt)) {
          await db.updateAdminInviteStatus(input.token, "expired");
          throw new TRPCError({ code: "BAD_REQUEST", message: "Convite expirado" });
        }

        // Check if user is logged in
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Fa\u00e7a login para aceitar o convite" });
        }

        // Check if email matches
        if (ctx.user.email !== invite.email) {
          throw new TRPCError({ 
            code: "FORBIDDEN", 
            message: "Este convite foi enviado para outro email" 
          });
        }

        // Promote user to admin
        await db.updateUserRole(ctx.user.id, "admin");
        await db.updateAdminInviteStatus(input.token, "accepted");

        return { success: true };
      }),
  }),

  // ==================== PAYMENTS ====================
  payments: router({
    createCheckout: protectedProcedure
      .input(z.object({ 
        productKey: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const stripe = getStripe();

        const product = PRODUCTS[input.productKey as keyof typeof PRODUCTS];
        if (!product) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Produto inv\u00e1lido" });
        }

        const origin = (ctx.req as any).headers?.origin || "http://localhost:3000";

        const session = await stripe.checkout.sessions.create({
          mode: "payment",
          customer_email: ctx.user.email || undefined,
          client_reference_id: ctx.user.id.toString(),
          allow_promotion_codes: true,
          line_items: [
            {
              price_data: {
                currency: product.currency,
                product_data: {
                  name: product.name,
                  description: product.description,
                },
                unit_amount: product.amount,
              },
              quantity: 1,
            },
          ],
          metadata: {
            user_id: ctx.user.id.toString(),
            customer_email: ctx.user.email || "",
            customer_name: ctx.user.name || "",
            product_key: input.productKey,
            product_type: "credits" in product ? "credits" : "plan",
            credits: "credits" in product ? product.credits.toString() : "0",
          },
          success_url: `${origin}/tutor/credits?success=true`,
          cancel_url: `${origin}/tutor/credits?canceled=true`,
        });

        return { url: session.url };
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getPaymentsByUserId(ctx.user.id);
    }),

    listAll: protectedProcedure
      .input(z.object({
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
        status: z.enum(["all", "succeeded", "failed", "pending"]).optional().default("all"),
      }))
      .query(async ({ input, ctx }) => {
        const allPayments = await db.getAllPayments();
        
        // Admin can see all payments, users can only see their own
        const isAdmin = ctx.user.role === "admin";
        let filtered = isAdmin ? allPayments : allPayments.filter((p: any) => p.userId === ctx.user.id);
        
        // Filter by status
        if (input.status !== "all") {
          filtered = filtered.filter((p: any) => p.status === input.status);
        }
        
        // Apply pagination
        const paginated = filtered.slice(input.offset, input.offset + input.limit);
        
        return {
          payments: paginated,
          total: filtered.length,
        };
      }),

    getStats: adminProcedure
      .query(async () => {
        const allPayments = await db.getAllPayments();
        
        const totalRevenue = allPayments
          .filter((p: any) => p.status === "succeeded")
          .reduce((sum: number, p: any) => sum + p.amount, 0);
        
        const successCount = allPayments.filter((p: any) => p.status === "succeeded").length;
        const failedCount = allPayments.filter((p: any) => p.status === "failed").length;
        const pendingCount = allPayments.filter((p: any) => p.status === "pending").length;
        
        return {
          totalRevenue,
          successCount,
          failedCount,
          pendingCount,
          totalCount: allPayments.length,
        };
      }),
  }),

  // ==================== CHANGE HISTORY ====================
  changeHistory: router({
    getRecentChanges: adminProcedure
      .input(z.object({ limit: z.number().default(50) }).optional())
      .query(async ({ input }) => {
        const { getRecentChanges } = await import("./changeTracker");
        return await getRecentChanges(input?.limit || 50);
      }),

    getPetHistory: protectedProcedure
      .input(z.object({ petId: z.number() }))
      .query(async ({ input }) => {
        const { getPetHistory } = await import("./changeTracker");
        return await getPetHistory(input.petId);
      }),

    getResourceHistory: protectedProcedure
      .input(z.object({
        resourceType: z.enum(["medication", "food", "preventive", "pet_data", "calendar"]),
        resourceId: z.number(),
      }))
      .query(async ({ input }) => {
        const { getResourceHistory } = await import("./changeTracker");
        return await getResourceHistory(input.resourceType, input.resourceId);
      }),

    getCollaborationStats: adminProcedure
      .query(async () => {
        const { getCollaborationStats } = await import("./changeTracker");
        return await getCollaborationStats();
      }),

    getChangesByUser: adminProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        const { getChangesByUser } = await import("./changeTracker");
        return await getChangesByUser(input.userId);
      }),
    
    getActivityByDay: adminProcedure
      .input(z.object({ 
        days: z.number().default(30),
      }).optional())
      .query(async ({ input }) => {
        const { getActivityByDay } = await import("./changeTracker");
        return await getActivityByDay(input?.days || 30);
      }),
  }),

  // ==================== WHATSAPP INTEGRATION ====================
  whatsapp: router({
    // Configuration
    getConfig: adminProcedure.query(async () => {
      return await db.getWhatsAppConfig();
    }),

    updateConfig: adminProcedure
      .input(z.object({
        apiKey: z.string(),
        phoneNumberId: z.string(),
        businessAccountId: z.string(),
        webhookSecret: z.string().optional(),
        isActive: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        await db.updateWhatsAppConfig(input);
        return { success: true };
      }),

    // Templates
    listTemplates: adminProcedure.query(async () => {
      return await db.getWhatsAppTemplates();
    }),

    createTemplate: adminProcedure
      .input(z.object({
        name: z.string(),
        category: z.enum([
          "welcome",
          "booking_confirmation",
          "vaccine_reminder",
          "checkin",
          "checkout",
          "daily_report",
          "new_photo",
          "medication_applied",
          "preventive_reminder",
          "custom",
        ]),
        content: z.string(),
        variables: z.array(z.string()).optional(),
        status: z.enum(["active", "inactive"]).default("active"),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createWhatsAppTemplate(input);
        return { success: true, templateId: id };
      }),

    updateTemplate: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        content: z.string().optional(),
        variables: z.array(z.string()).optional(),
        status: z.enum(["active", "inactive"]).optional(),
      }))
      .mutation(async ({ input }) => {
        await db.updateWhatsAppTemplate(input);
        return { success: true };
      }),

    deleteTemplate: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteWhatsAppTemplate(input.id);
        return { success: true };
      }),

    // Messages
    sendMessage: adminProcedure
      .input(z.object({
        phone: z.string(),
        message: z.string(),
        recipientName: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const whatsapp = await import("./whatsappService");
        return await whatsapp.sendTextMessage(input.phone, input.message, input.recipientName);
      }),

    sendMedia: adminProcedure
      .input(z.object({
        phone: z.string(),
        mediaUrl: z.string(),
        caption: z.string().optional(),
        recipientName: z.string().optional(),
        mediaType: z.enum(["image", "document"]).default("image"),
      }))
      .mutation(async ({ input }) => {
        const whatsapp = await import("./whatsappService");
        return await whatsapp.sendMediaMessage(
          input.phone,
          input.mediaUrl,
          input.caption,
          input.recipientName,
          input.mediaType
        );
      }),

    sendTemplate: adminProcedure
      .input(z.object({
        phone: z.string(),
        templateName: z.string(),
        variables: z.array(z.string()),
        recipientName: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const whatsapp = await import("./whatsappService");
        return await whatsapp.sendTemplateMessage(
          input.phone,
          input.templateName,
          input.variables,
          input.recipientName
        );
      }),

    sendBulk: adminProcedure
      .input(z.object({
        recipients: z.array(z.object({
          phone: z.string(),
          name: z.string().optional(),
          message: z.string(),
        })),
        delayMs: z.number().default(1000),
      }))
      .mutation(async ({ input }) => {
        const whatsapp = await import("./whatsappService");
        return await whatsapp.sendBulkMessages(input.recipients, input.delayMs);
      }),

    getMessageHistory: adminProcedure
      .input(z.object({
        limit: z.number().default(50),
        status: z.enum(["queued", "sent", "delivered", "read", "failed"]).optional(),
      }))
      .query(async ({ input }) => {
        return await db.getWhatsAppMessageHistory(input.limit, input.status);
      }),

    // Groups
    listGroups: adminProcedure.query(async () => {
      return await db.getWhatsAppGroups();
    }),

    createPetGroup: adminProcedure
      .input(z.object({
        petId: z.number(),
        groupName: z.string(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createWhatsAppGroup(input);
        return { success: true, groupId: id };
      }),

    addGroupMember: adminProcedure
      .input(z.object({
        groupId: z.number(),
        userId: z.number().optional(),
        phone: z.string(),
        name: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.addWhatsAppGroupMember(input);
        return { success: true };
      }),

    removeGroupMember: adminProcedure
      .input(z.object({
        groupId: z.number(),
        memberId: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.removeWhatsAppGroupMember(input.groupId, input.memberId);
        return { success: true };
      }),

    // Automations
    listAutomations: adminProcedure.query(async () => {
      return await db.getWhatsAppAutomations();
    }),

    createAutomation: adminProcedure
      .input(z.object({
        name: z.string(),
        triggerType: z.enum([
          "photo_added",
          "vaccine_reminder_7d",
          "vaccine_reminder_1d",
          "checkin",
          "checkout",
          "daily_report",
          "medication_applied",
          "preventive_reminder",
        ]),
        templateId: z.number(),
        enabled: z.boolean().default(true),
        config: z.any().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createWhatsAppAutomation(input);
        return { success: true, automationId: id };
      }),

    updateAutomation: adminProcedure
      .input(z.object({
        id: z.number(),
        enabled: z.boolean().optional(),
        config: z.any().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.updateWhatsAppAutomation(input);
        return { success: true };
      }),

    deleteAutomation: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteWhatsAppAutomation(input.id);
        return { success: true };
      }),

    // Statistics
    getStats: adminProcedure.query(async () => {
      return await db.getWhatsAppStats();
    }),

    // Conversations
    listConversations: adminProcedure
      .input(z.object({
        status: z.enum(["all", "active", "resolved", "pending"]).default("all"),
      }))
      .query(async ({ input }) => {
        return await db.getWhatsAppConversations(input.status);
      }),

    getConversation: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getWhatsAppConversation(input.id);
      }),

    updateConversationStatus: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["active", "resolved", "pending"]),
      }))
      .mutation(async ({ input }) => {
        await db.updateWhatsAppConversationStatus(input.id, input.status);
        return { success: true };
      }),

    markAsRead: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.markWhatsAppConversationAsRead(input.id);
        return { success: true };
      }),
  }),

  // ==================== PREVENTIVES LIBRARY ====================
  preventives: router({
    library: publicProcedure.query(async () => {
      return await db.getPreventiveLibrary();
    }),

    addToLibrary: adminProcedure
      .input(z.object({
        name: z.string(),
        type: z.enum(["flea", "deworming"]),
        manufacturer: z.string().optional(),
        intervalDays: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.addPreventiveToLibrary(input);
        return { id };
      }),

    updateFlea: protectedProcedure
      .input(z.object({
        id: z.number(),
        applicationDate: z.string().optional(),
        nextDueDate: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.updateFleaTreatment(input);
        return { success: true };
      }),

    deleteFlea: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteFleaTreatment(input.id);
        return { success: true };
      }),

    updateDeworming: protectedProcedure
      .input(z.object({
        id: z.number(),
        applicationDate: z.string().optional(),
        nextDueDate: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.updateDewormingTreatment(input);
        return { success: true };
      }),

    deleteDeworming: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteDewormingTreatment(input.id);
        return { success: true };
      }),
  }),

  // ==================== HEALTH NOTIFICATIONS ====================
  healthNotifications: router({
    /**
     * Get all upcoming health reminders
     */
    getUpcomingReminders: adminProcedure
      .input(z.object({ daysAhead: z.number().default(7) }))
      .query(async ({ input }) => {
        return await db.getAllUpcomingHealthReminders(input.daysAhead);
      }),

    /**
     * Send notification to owner about upcoming health items
     */
    sendHealthReminders: adminProcedure
      .input(z.object({ daysAhead: z.number().default(7) }))
      .mutation(async ({ input }) => {
        const reminders = await db.getAllUpcomingHealthReminders(input.daysAhead);
        
        if (reminders.total === 0) {
          return { 
            success: true, 
            message: "Nenhum item próximo do vencimento",
            sent: false,
          };
        }

        // Build notification content
        let content = `🐾 **Lembretes de Saúde - Próximos ${input.daysAhead} dias**\n\n`;
        
        if (reminders.vaccinations.length > 0) {
          content += `💉 **Vacinas (${reminders.vaccinations.length})**\n`;
          reminders.vaccinations.forEach((v: any) => {
            const date = new Date(v.nextDueDate).toLocaleDateString('pt-BR');
            content += `- ${v.petName}: ${v.vaccineName} (${date})\n`;
          });
          content += "\n";
        }

        if (reminders.medications.length > 0) {
          content += `💊 **Medicamentos Terminando (${reminders.medications.length})**\n`;
          reminders.medications.forEach((m: any) => {
            const date = new Date(m.endDate).toLocaleDateString('pt-BR');
            content += `- ${m.petName}: ${m.medicationName} (${date})\n`;
          });
          content += "\n";
        }

        if (reminders.fleaTreatments.length > 0) {
          content += `🐜 **Antipulgas (${reminders.fleaTreatments.length})**\n`;
          reminders.fleaTreatments.forEach((f: any) => {
            const date = new Date(f.nextDueDate).toLocaleDateString('pt-BR');
            content += `- ${f.petName}: ${f.productName} (${date})\n`;
          });
          content += "\n";
        }

        if (reminders.dewormingTreatments.length > 0) {
          content += `🐛 **Vermífugos (${reminders.dewormingTreatments.length})**\n`;
          reminders.dewormingTreatments.forEach((d: any) => {
            const date = new Date(d.nextDueDate).toLocaleDateString('pt-BR');
            content += `- ${d.petName}: ${d.productName} (${date})\n`;
          });
        }

        // Send notification to owner
        const { notifyOwner } = await import("./_core/notification");
        const sent = await notifyOwner({
          title: `🔔 ${reminders.total} Lembretes de Saúde`,
          content,
        });

        return {
          success: true,
          message: sent 
            ? `Notificação enviada com ${reminders.total} lembretes`
            : "Falha ao enviar notificação",
          sent,
          reminders,
        };
      }),
  }),

  // ==================== HEALTH STATISTICS ====================
  healthStats: router({
    /**
     * Get all health statistics for dashboard
     */
    getDashboardStats: protectedProcedure
      .query(async () => {
        return await db.getHealthDashboardStats();
      }),

    /**
     * Get vaccination statistics
     */
    getVaccinationStats: protectedProcedure
      .query(async () => {
        return await db.getVaccinationStatistics();
      }),

    /**
     * Get active medications count
     */
    getActiveMedications: protectedProcedure
      .query(async () => {
        return await db.getActiveMedicationsCount();
      }),

    /**
     * Get preventives applied this month
     */
    getPreventivesThisMonth: protectedProcedure
      .query(async () => {
        return await db.getPreventivesThisMonth();
      }),

    /**
     * Get overdue treatments
     */
    getOverdueTreatments: protectedProcedure
      .query(async () => {
        return await db.getOverdueTreatments();
      }),
  }),

  // ==================== HEALTH REPORTS ====================
  healthReports: router({
    /**
     * Get complete health history for a pet
     */
    getPetHealthHistory: protectedProcedure
      .input(z.object({ petId: z.number() }))
      .query(async ({ input }) => {
        return await db.getPetCompleteHealthHistory(input.petId);
      }),
  }),

  // ==================== UNIFIED CALENDAR ====================
  healthCalendar: router({
    /**
     * Get all calendar events (health, bookings, payments)
     */
    getEvents: protectedProcedure
      .input(z.object({
        startDate: z.date(),
        endDate: z.date(),
      }))
      .query(async ({ input }) => {
        return await db.getAllCalendarEvents(input.startDate, input.endDate);
      }),

    /**
     * Get events for a specific day
     */
    getDayEvents: protectedProcedure
      .input(z.object({ date: z.date() }))
      .query(async ({ input }) => {
        return await db.getDayEvents(input.date);
      }),

    /**
     * Get daily occupancy stats
     */
    getOccupancyStats: protectedProcedure
      .input(z.object({
        startDate: z.date(),
        endDate: z.date(),
      }))
      .query(async ({ input }) => {
        return await db.getDailyOccupancy(input.startDate, input.endDate);
      }),

    /**
     * Get credit consumption stats
     */
    getCreditStats: protectedProcedure
      .input(z.object({
        startDate: z.date(),
        endDate: z.date(),
      }))
      .query(async ({ input }) => {
        return await db.getCreditConsumption(input.startDate, input.endDate);
      }),

    /**
     * Create new vaccination
     */
    createVaccination: adminProcedure
      .input(z.object({
        petId: z.number(),
        vaccineId: z.number(),
        applicationDate: z.date(),
        nextDueDate: z.date().optional(),
        veterinarian: z.string().optional(),
        clinic: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await db.addPetVaccination({
          pet_id: input.petId,
          vaccine_id: input.vaccineId,
          application_date: input.applicationDate,
          next_due_date: input.nextDueDate,
          veterinarian: input.veterinarian,
          clinic: input.clinic,
          notes: input.notes,
        });
      }),

    /**
     * Create new medication
     */
    createMedication: adminProcedure
      .input(z.object({
        petId: z.number(),
        medicationId: z.number(),
        startDate: z.date(),
        endDate: z.date().optional(),
        dosage: z.string(),
        frequency: z.string(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await db.addPetMedication({
          pet_id: input.petId,
          medication_id: input.medicationId,
          start_date: input.startDate,
          end_date: input.endDate,
          dosage: input.dosage,
          frequency: input.frequency,
          notes: input.notes,
        });
      }),

    /**
     * Create new booking/check-in
     */
    createBooking: adminProcedure
      .input(z.object({
        petId: z.number(),
        tutorId: z.number(),
        bookingDate: z.date(),
        numberOfDays: z.number().default(1),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { getDb } = await import("./db");
        const { bookings } = await import("../drizzle/schema");
        const dbInstance = await getDb();
        if (!dbInstance) throw new Error("Database not available");
        
        const result = await dbInstance.insert(bookings).values({
          ...input,
          status: "confirmed",
        }) as any;
        
        return Number(result[0]?.insertId || 0);
      }),

    /**
     * Create new transaction
     */
    createTransaction: adminProcedure
      .input(z.object({
        petId: z.number().optional(),
        type: z.enum(["income", "expense"]),
        category: z.string(),
        description: z.string(),
        amount: z.number(),
        transactionDate: z.date(),
      }))
      .mutation(async ({ input, ctx }) => {
        const data = {
          pet_id: input.petId,
          type: input.type,
          category: input.category,
          description: input.description,
          amount: input.amount,
          transaction_date: input.transactionDate,
          created_by_id: ctx.user.id,
        };
        return await db.addTransaction(data);
      }),

    /**
     * Delete vaccination
     */
    deleteVaccination: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deletePetVaccination(input.id);
      }),

    /**
     * Delete medication
     */
    deleteMedication: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deletePetMedication(input.id);
      }),

    /**
     * Delete booking
     */
    deleteBooking: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { getDb } = await import("./db");
        const { bookings } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const dbInstance = await getDb();
        if (!dbInstance) throw new Error("Database not available");
        
        await dbInstance.delete(bookings).where(eq(bookings.id, input.id));
        return true;
      }),

    /**
     * Update booking dates
     */
    updateBooking: adminProcedure
      .input(z.object({
        id: z.number(),
        checkInDate: z.string(),
        checkOutDate: z.string(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { getDb } = await import("./db");
        const { bookings } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const dbInstance = await getDb();
        if (!dbInstance) throw new Error("Database not available");
        
        // Calculate number of days
        const checkIn = new Date(input.checkInDate);
        const checkOut = new Date(input.checkOutDate);
        const numberOfDays = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
        
        await dbInstance.update(bookings)
          .set({
            bookingDate: checkIn,
            numberOfDays,
            notes: input.notes,
          })
          .where(eq(bookings.id, input.id));
        return true;
      }),

    /**
     * Update transaction
     */
    updateTransaction: adminProcedure
      .input(z.object({
        id: z.number(),
        amount: z.number(),
        category: z.string(),
        description: z.string(),
        transactionDate: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { getDb } = await import("./db");
        const { transactions } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const dbInstance = await getDb();
        if (!dbInstance) throw new Error("Database not available");
        
        await dbInstance.update(transactions)
          .set({
            amount: Math.round(input.amount * 100), // Convert to cents
            category: input.category,
            description: input.description,
            transaction_date: new Date(input.transactionDate),
          })
          .where(eq(transactions.id, input.id));
        return true;
      }),
  }),

  // ==================== TUTORS MANAGEMENT ====================
  tutors: router({
    /**
     * List all tutors with pagination and search
     */
    list: adminProcedure
      .input(z.object({
        page: z.number().default(1),
        limit: z.number().default(20),
        search: z.string().optional(),
      }))
      .query(async ({ input }) => {
        return await db.getAllTutors(input.page, input.limit, input.search);
      }),

    /**
     * Get tutor by ID with linked pets
     */
    getById: adminProcedure
      .input(z.object({ tutorId: z.number() }))
      .query(async ({ input }) => {
        return await db.getTutorById(input.tutorId);
      }),

    /**
     * Update tutor information
     */
    update: adminProcedure
      .input(z.object({
        tutorId: z.number(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { tutorId, ...data } = input;
        return await db.updateTutor(tutorId, data);
      }),

    /**
     * Link pet to tutor
     */
    linkPet: adminProcedure
      .input(z.object({
        petId: z.number(),
        tutorId: z.number(),
        isPrimary: z.boolean().default(false),
      }))
      .mutation(async ({ input }) => {
        return await db.linkPetToTutor(input.petId, input.tutorId, input.isPrimary);
      }),

    /**
     * Unlink pet from tutor
     */
    unlinkPet: adminProcedure
      .input(z.object({
        petId: z.number(),
        tutorId: z.number(),
      }))
      .mutation(async ({ input }) => {
        return await db.unlinkPetFromTutor(input.petId, input.tutorId);
      }),

    /**
     * Get reminder history for tutor
     */
    getReminderHistory: adminProcedure
      .input(z.object({ tutorId: z.number() }))
      .query(async ({ input }) => {
        return await db.getTutorReminderHistory(input.tutorId);
      }),

    /**
     * Get all pets with their tutors grouped
     */
    getPetsWithTutors: adminProcedure
      .query(async () => {
        return await db.getPetsWithTutors();
      }),

    /**
     * Notify all tutors of a specific pet
     */
    notifyPetTutors: adminProcedure
      .input(z.object({
        petId: z.number(),
        title: z.string(),
        message: z.string(),
      }))
      .mutation(async ({ input }) => {
        const tutors = await db.getTutorsByPet(input.petId);
        
        // Send notification to each tutor
        for (const tutor of tutors) {
          if (tutor.tutor_id) {
            await db.createNotification({
              user_id: tutor.tutor_id,
              type: "system",
              title: input.title,
              message: input.message,
              is_read: false,
            });
          }
        }
        
        return { success: true, notifiedCount: tutors.length };
      }),
  }),

  // ==================== BOOKING REQUESTS ====================
  bookingRequests: router({
    /**
     * Get availability for specific dates
     */
    getAvailability: publicProcedure
      .input(z.object({ dates: z.array(z.string()) }))
      .query(async ({ input }) => {
        const { getAvailabilityForDates } = await import("./bookingRequests.db");
        return await getAvailabilityForDates(input.dates);
      }),

    /**
     * Create a new booking request (tutors)
     */
    create: protectedProcedure
      .input(z.object({
        petId: z.number(),
        requestedDates: z.array(z.string()),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { createBookingRequest } = await import("./bookingRequests.db");
        const result = await createBookingRequest({
          petId: input.petId,
          tutorId: ctx.user.open_id || ctx.user.email || "",
          requestedDates: input.requestedDates,
          notes: input.notes,
        });

        // Notify admins about new booking request
        const { notifyAdmins } = await import("./_core/websocket");
        notifyAdmins({
          type: "booking_request_created",
          title: "Nova Solicitação de Reserva",
          message: `${ctx.user.name || "Usuário"} solicitou reserva para ${input.requestedDates.length} dia(s)`,
          data: { requestId: result.id, petId: input.petId },
          timestamp: new Date(),
        });

        return result;
      }),

    /**
     * Get tutor's booking requests
     */
    myRequests: protectedProcedure
      .query(async ({ ctx }) => {
        const { getTutorBookingRequests } = await import("./bookingRequests.db");
        return await getTutorBookingRequests(ctx.user.open_id || ctx.user.email || "");
      }),

    /**
     * Cancel a booking request (tutors)
     */
    cancel: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const { cancelBookingRequest } = await import("./bookingRequests.db");
        return await cancelBookingRequest(input.id, ctx.user.open_id || ctx.user.email || "");
      }),

    /**
     * Get all pending requests (admins)
     */
    pending: adminProcedure
      .query(async () => {
        const { getPendingBookingRequests } = await import("./bookingRequests.db");
        return await getPendingBookingRequests();
      }),

    /**
     * Get all requests with filters (admins)
     */
    all: adminProcedure
      .input(z.object({ status: z.string().optional() }))
      .query(async ({ input }) => {
        const { getAllBookingRequests } = await import("./bookingRequests.db");
        return await getAllBookingRequests(input.status);
      }),

    /**
     * Approve a booking request (admins)
     */
    approve: adminProcedure
      .input(z.object({
        id: z.number(),
        adminNotes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { approveBookingRequest } = await import("./bookingRequests.db");
        const { getDb } = await import("./db");
        const { bookingRequests } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");

        // Get request details before approval
        const db = (await getDb())!;
        const [request] = await db
          .select()
          .from(bookingRequests)
          .where(eq(bookingRequests.id, input.id));

        const result = await approveBookingRequest(input.id, ctx.user.open_id || ctx.user.email || "", input.adminNotes);

        // Notify tutor about approval
        if (request) {
          const { notifyUser } = await import("./_core/websocket");
          notifyUser(request.tutorId, {
            type: "booking_request_approved",
            title: "Reserva Aprovada!",
            message: `Sua solicitação de reserva foi aprovada. ${result.creditsUsed} crédito(s) consumido(s).`,
            data: { requestId: input.id },
            timestamp: new Date(),
          });
        }

        return result;
      }),

    /**
     * Reject a booking request (admins)
     */
    reject: adminProcedure
      .input(z.object({
        id: z.number(),
        adminNotes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { rejectBookingRequest } = await import("./bookingRequests.db");
        const { getDb } = await import("./db");
        const { bookingRequests } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");

        // Get request details before rejection
        const db = (await getDb())!;
        const [request] = await db
          .select()
          .from(bookingRequests)
          .where(eq(bookingRequests.id, input.id));

        const result = await rejectBookingRequest(input.id, ctx.user.open_id || ctx.user.email || "", input.adminNotes);

        // Notify tutor about rejection
        if (request) {
          const { notifyUser } = await import("./_core/websocket");
          notifyUser(request.tutorId, {
            type: "booking_request_rejected",
            title: "Reserva Rejeitada",
            message: input.adminNotes || "Sua solicitação de reserva foi rejeitada.",
            data: { requestId: input.id },
            timestamp: new Date(),
          });
        }

        return result;
      }),

    /**
     * Get booking request statistics (admins)
     */
    stats: adminProcedure
      .query(async () => {
        const { getBookingRequestStats } = await import("./bookingRequests.db");
        return await getBookingRequestStats();
      }),
  }),

  // ==================== HEALTH REMINDERS ====================
  healthReminders: router({
    /**
     * Send all pending health reminders to tutors via WhatsApp
     */
    sendAllReminders: adminProcedure
      .input(z.object({ daysAhead: z.number().default(7) }))
      .mutation(async ({ input }) => {
        const { sendAllHealthReminders } = await import("./healthReminders");
        return await sendAllHealthReminders(input.daysAhead);
      }),

    /**
     * Send test reminder to a specific tutor
     */
    sendTestReminder: adminProcedure
      .input(z.object({
        phone: z.string(),
        name: z.string(),
        petName: z.string(),
        reminderType: z.enum(["vaccine", "medication", "flea", "deworming"]),
        itemName: z.string(),
        daysUntilDue: z.number(),
      }))
      .mutation(async ({ input }) => {
        const { sendHealthReminderToOwner } = await import("./healthReminders");
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + input.daysUntilDue);
        
        return await sendHealthReminderToOwner(
          input.phone,
          input.name,
          input.petName,
          input.reminderType,
          input.itemName,
          dueDate,
          input.daysUntilDue
        );
      }),
  }),

  // ==================== PRICING ====================
  pricing: router({
    /**
     * Get standard service prices
     */
    getServicePrices: publicProcedure
      .query(async () => {
        const { getServicePrices } = await import("./pricing.db");
        return await getServicePrices();
      }),

    /**
     * Get price for specific service type
     */
    getServicePrice: publicProcedure
      .input(z.object({ serviceType: z.enum(["creche", "diaria"]) }))
      .query(async ({ input }) => {
        const { getServicePrice } = await import("./pricing.db");
        return await getServicePrice(input.serviceType);
      }),

    /**
     * Get effective price for a tutor (custom or standard)
     */
    getEffectivePrice: protectedProcedure
      .input(z.object({ 
        tutorId: z.number(),
        serviceType: z.enum(["creche", "diaria"]) 
      }))
      .query(async ({ input }) => {
        const { getEffectivePrice } = await import("./pricing.db");
        return await getEffectivePrice(input.tutorId, input.serviceType);
      }),

    /**
     * Get custom pricing plan for a tutor
     */
    getCustomPlan: adminProcedure
      .input(z.object({ tutorId: z.number() }))
      .query(async ({ input }) => {
        const { getCustomPricingPlan } = await import("./pricing.db");
        return await getCustomPricingPlan(input.tutorId);
      }),

    /**
     * Get all custom pricing plans
     */
    getAllCustomPlans: adminProcedure
      .query(async () => {
        const { getAllCustomPricingPlans } = await import("./pricing.db");
        return await getAllCustomPricingPlans();
      }),

    /**
     * Create custom pricing plan
     */
      createCustomPlan: adminProcedure
      .input(z.object({ 
        tutorId: z.number(), 
        planName: z.string(),
        description: z.string().optional(),
        crechePrice: z.number().nullable().optional(), 
        diariaPrice: z.number().nullable().optional(), 
        discountPercent: z.number().default(0),
        validFrom: z.date().optional(),
        validUntil: z.date().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { createCustomPricingPlan } = await import("./pricing.db");
        const id = await createCustomPricingPlan({ 
          ...input, 
          createdBy: ctx.user.id,
          isActive: true, 
          createdAt: new Date() 
        });
        return { id };
      }),

    /**
     * Update custom pricing plan
     */
    updateCustomPlan: adminProcedure
      .input(z.object({
        id: z.number(),
        crechePrice: z.number().nullable().optional(),
        diariaPrice: z.number().nullable().optional(),
        notes: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { updateCustomPricingPlan } = await import("./pricing.db");
        const { id, ...data } = input;
        await updateCustomPricingPlan(id, data);
        return { success: true };
      }),

    /**
     * Deactivate custom pricing plan
     */
    deactivateCustomPlan: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { deactivateCustomPricingPlan } = await import("./pricing.db");
        await deactivateCustomPricingPlan(input.id);
        return { success: true };
      }),
  }),

  // ==================== FOOD ====================
  food: router({
    /**
     * Get food statistics
     */
    getStats: adminProcedure.query(async () => {
      const { getFoodStats } = await import("./food.db");
      return await getFoodStats();
    }),

    /**
     * Add stock
     */
    addStock: adminProcedure
      .input(z.object({ amountKg: z.number(), notes: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const { addStock } = await import("./food.db");
        return await addStock(input.amountKg, input.notes, ctx.user.id);
      }),

    /**
     * Record daily consumption
     */
    recordConsumption: adminProcedure
      .input(z.object({ amountKg: z.number(), notes: z.string().optional() }))
      .mutation(async ({ input }) => {
        const { recordDailyConsumption } = await import("./food.db");
        return await recordDailyConsumption(input.amountKg, input.notes);
      }),

    /**
     * Get food movements history
     */
    getMovements: adminProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ input }) => {
        const { getFoodMovements } = await import("./food.db");
        return await getFoodMovements(input.limit);
      }),
  }),

  // ==================== NOTIFICATION TEMPLATES ====================
  notificationTemplates: router({
    /**
     * Get all notification templates
     */
    getAll: adminProcedure.query(async () => {
      return await db.getAllNotificationTemplates();
    }),

    /**
     * Get template by type
     */
    getByType: publicProcedure
      .input(z.object({ type: z.string() }))
      .query(async ({ input }) => {
        return await db.getNotificationTemplateByType(input.type);
      }),

    /**
     * Create notification template
     */
    create: adminProcedure
      .input(z.object({
        type: z.enum([
          "vaccine_reminder_7d",
          "vaccine_reminder_1d",
          "medication_reminder",
          "checkin_notification",
          "checkout_notification",
          "daily_report",
          "credits_low",
          "event_reminder"
        ]),
        title: z.string().min(1),
        message: z.string().min(1),
        availableVariables: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createNotificationTemplate(input);
        return { id: id || 0, success: true };
      }),

    /**
     * Update notification template
     */
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        message: z.string().optional(),
        availableVariables: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateNotificationTemplate(id, data);
        return { success: true };
      }),

    /**
     * Delete notification template
     */
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteNotificationTemplate(input.id);
        return { success: true };
      }),
  }),

  // ==================== TUTOR NOTIFICATION PREFERENCES ====================
  tutorPreferences: router({
    /**
     * Get all tutor preferences (admin only)
     */
    getAll: adminProcedure.query(async () => {
      return await db.getAllTutorPreferences();
    }),

    /**
     * Get preferences for current tutor
     */
    getMine: protectedProcedure.query(async ({ ctx }) => {
      return await db.getTutorNotificationPreferences(ctx.user.id);
    }),

    /**
     * Get preferences for specific tutor (admin only)
     */
    getByTutor: adminProcedure
      .input(z.object({ tutorId: z.number() }))
      .query(async ({ input }) => {
        return await db.getTutorNotificationPreferences(input.tutorId);
      }),

    /**
     * Create or update tutor preference
     */
    upsert: protectedProcedure
      .input(z.object({
        notificationType: z.enum([
          "vaccine_reminder_7d",
          "vaccine_reminder_1d",
          "medication_reminder",
          "checkin_notification",
          "checkout_notification",
          "daily_report",
          "credits_low",
          "event_reminder"
        ]),
        enabled: z.boolean(),
      }))
      .mutation(async ({ input, ctx }) => {
        const existing = await db.getTutorPreferenceByType(ctx.user.id, input.notificationType);
        
        if (existing) {
          // Don't allow tutor to change if admin has overridden
          if (existing.adminOverride) {
            throw new TRPCError({ 
              code: "FORBIDDEN", 
              message: "Esta preferência foi bloqueada pelo administrador" 
            });
          }
          await db.updateTutorNotificationPreference(existing.id, { enabled: input.enabled });
          return { success: true, id: existing.id };
        } else {
          const id = await db.createTutorNotificationPreference({
            tutorId: ctx.user.id,
            notificationType: input.notificationType,
            enabled: input.enabled,
          });
          return { success: true, id };
        }
      }),

    /**
     * Admin override - force enable/disable for specific tutor
     */
    adminOverride: adminProcedure
      .input(z.object({
        tutorId: z.number(),
        notificationType: z.enum([
          "vaccine_reminder_7d",
          "vaccine_reminder_1d",
          "medication_reminder",
          "checkin_notification",
          "checkout_notification",
          "daily_report",
          "credits_low",
          "event_reminder"
        ]),
        adminOverride: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        const existing = await db.getTutorPreferenceByType(input.tutorId, input.notificationType);
        
        if (existing) {
          await db.updateTutorNotificationPreference(existing.id, { 
            adminOverride: input.adminOverride,
            enabled: !input.adminOverride, // If overriding, disable
          });
          return { success: true, id: existing.id };
        } else {
          const id = await db.createTutorNotificationPreference({
            tutorId: input.tutorId,
            notificationType: input.notificationType,
            enabled: !input.adminOverride,
            adminOverride: input.adminOverride,
          });
          return { success: true, id };
        }
      }),

    /**
     * Delete preference
     */
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // Verify ownership unless admin
        if (ctx.user.role !== "admin") {
          const pref = await db.getTutorNotificationPreferences(ctx.user.id);
          const owned = pref.find(p => p.id === input.id);
          if (!owned) {
            throw new TRPCError({ code: "FORBIDDEN" });
          }
        }
        await db.deleteTutorNotificationPreference(input.id);
        return { success: true };
      }),
  }),

  /**
   * Health & Behavior Logs router
   */
  healthBehaviorLogs: router({
    /**
     * Create new health/behavior log
     */
    create: protectedProcedure
      .input(z.object({
        petId: z.number(),
        mood: z.enum(["feliz", "ansioso", "calmo", "agitado", "letargico", "agressivo"]).optional(),
        stool: z.enum(["normal", "diarreia", "constipacao", "com_sangue", "muco"]).optional(),
        behavior: z.enum(["ativo", "brincalhao", "sociavel", "calmo", "relaxado", "curioso", "timido", "protetor", "destrutivo", "letargico", "agressivo", "assustado"]).optional(),
        appetite: z.enum(["normal", "aumentado", "diminuido", "recusou"]).optional(),
        waterIntake: z.enum(["normal", "aumentado", "diminuido", "recusou"]).optional(),
        notes: z.string().optional(),
        recordedAt: z.date().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Verify pet access
        if (ctx.user.role !== "admin") {
          const tutorPets = await db.getPetsByTutorId(ctx.user.id);
          const hasAccess = tutorPets.some((p: any) => p.id === input.petId);
          if (!hasAccess) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Você não tem acesso a este pet" });
          }
        }
        
        const result = await db.createHealthBehaviorLog({
          petId: input.petId,
          mood: input.mood,
          behavior: input.behavior,
          stool: input.stool,
          appetite: input.appetite,
          waterIntake: input.waterIntake,
          notes: input.notes,
          recordedBy: ctx.user.id,
          recordedAt: input.recordedAt || new Date(),
        });

        const logId = result?.id ?? 0;

        // Auto-create calendar event for health/behavior log
        await db.autoCreateHealthLogEvent(
          input.petId,
          logId,
          input.recordedAt || new Date(),
          input.mood,
          input.behavior,
          input.stool,
          input.appetite,
          input.waterIntake,
          input.notes,
          ctx.user.id
        );

        return result;
      }),

    /**
     * Get logs by pet
     */
    getByPet: protectedProcedure
      .input(z.object({
        petId: z.number(),
        limit: z.number().optional(),
      }))
      .query(async ({ input, ctx }) => {
        // Verify pet access
        if (ctx.user.role !== "admin") {
          const tutorPets = await db.getPetsByTutorId(ctx.user.id);
          const hasAccess = tutorPets.some((p: any) => p.id === input.petId);
          if (!hasAccess) {
            throw new TRPCError({ code: "FORBIDDEN" });
          }
        }
        
        return await db.getHealthBehaviorLogsByPet(input.petId, input.limit);
      }),

    /**
     * Get recent logs (admin only)
     */
    getRecent: adminProcedure
      .input(z.object({
        limit: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return await db.getRecentHealthBehaviorLogs(input.limit);
      }),

    /**
     * Get statistics for a pet
     */
    getStats: protectedProcedure
      .input(z.object({
        petId: z.number(),
        days: z.number().optional(),
      }))
      .query(async ({ input, ctx }) => {
        // Verify pet access
        if (ctx.user.role !== "admin") {
          const tutorPets = await db.getPetsByTutorId(ctx.user.id);
          const hasAccess = tutorPets.some((p: any) => p.id === input.petId);
          if (!hasAccess) {
            throw new TRPCError({ code: "FORBIDDEN" });
          }
        }
        
        return await db.getHealthBehaviorStats(input.petId, input.days);
      }),

    /**
     * Delete log
     */
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // Verify ownership
        const log = await db.getHealthBehaviorLogById(input.id);
        if (!log) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        
        if (ctx.user.role !== "admin" && log.recordedBy !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        await db.deleteHealthBehaviorLog(input.id);
        return { success: true };
      }),
  }),

  /**
   * Credit Packages Router - Manage available credit packages
   */
  creditPackages: router({
    /**
     * List all active packages
     */
    list: publicProcedure.query(async () => {
      return await db.getAllCreditPackages();
    }),

    /**
     * List all packages including inactive (admin only)
     */
    listAll: adminProcedure.query(async () => {
      return await db.getAllCreditPackagesIncludingInactive();
    }),

    /**
     * Get package by ID
     */
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const pkg = await db.getCreditPackageById(input.id);
        if (!pkg) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Pacote não encontrado" });
        }
        return pkg;
      }),

    /**
     * Create new package (admin only)
     */
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        credits: z.number().min(1),
        priceInCents: z.number().min(0),
        discountPercent: z.number().min(0).max(100).optional(),
        displayOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createCreditPackage({
          ...input,
          isActive: true,
        });
      }),

    /**
     * Update package (admin only)
     */
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        credits: z.number().min(1).optional(),
        priceInCents: z.number().min(0).optional(),
        discountPercent: z.number().min(0).max(100).optional(),
        isActive: z.boolean().optional(),
        displayOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateCreditPackage(id, data);
        return { success: true };
      }),

    /**
     * Delete package (soft delete - admin only)
     */
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteCreditPackage(input.id);
        return { success: true };
      }),
  }),

  /**
   * Event Types Router - Manage custom event types for calendar
   */
  eventTypes: router({
    /**
     * List all active event types
     */
    list: publicProcedure
      .query(async () => {
        return await db.getAllEventTypes();
      }),

    /**
     * List all event types including inactive (admin only)
     */
    listAll: adminProcedure
      .query(async () => {
        return await db.getAllEventTypesIncludingInactive();
      }),

    /**
     * Get event type by ID
     */
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getEventTypeById(input.id);
      }),

    /**
     * Create new event type (admin only)
     */
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
        icon: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await db.createEventType({
          ...input,
          createdById: ctx.user.id,
        });
        return result;
      }),

    /**
     * Update event type (admin only)
     */
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        icon: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateEventType(id, data);
        return { success: true };
      }),

    /**
     * Delete event type (soft delete - admin only)
     */
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteEventType(input.id);
        return { success: true };
      }),
  }),

  /**
   * Medication Auto-Schedule Rules Router - Manage automatic scheduling rules
   */
  autoScheduleRules: router({
    /**
     * List all active auto-schedule rules
     */
    list: publicProcedure
      .query(async () => {
        return await db.getAllAutoScheduleRules();
      }),

    /**
     * List all auto-schedule rules including inactive (admin only)
     */
    listAll: adminProcedure
      .query(async () => {
        return await db.getAllAutoScheduleRulesIncludingInactive();
      }),

    /**
     * Get auto-schedule rule by ID
     */
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getAutoScheduleRuleById(input.id);
      }),

    /**
     * Get auto-schedule rule by medication ID
     */
    getByMedicationId: publicProcedure
      .input(z.object({ medicationId: z.number() }))
      .query(async ({ input }) => {
        return await db.getAutoScheduleRuleByMedicationId(input.medicationId);
      }),

    /**
     * Create new auto-schedule rule (admin only)
     */
    create: adminProcedure
      .input(z.object({
        medicationId: z.number(),
        intervalDays: z.number().min(1),
        intervalType: z.enum(["days", "weeks", "months", "years"]),
        intervalValue: z.number().min(1),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const result = await db.createAutoScheduleRule(input);
        return result;
      }),

    /**
     * Update auto-schedule rule (admin only)
     */
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        medicationId: z.number().optional(),
        intervalDays: z.number().min(1).optional(),
        intervalType: z.enum(["days", "weeks", "months", "years"]).optional(),
        intervalValue: z.number().min(1).optional(),
        isActive: z.boolean().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateAutoScheduleRule(id, data);
        return { success: true };
      }),

    /**
     * Delete auto-schedule rule (soft delete - admin only)
     */
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteAutoScheduleRule(input.id);
        return { success: true };
      }),
  }),

  /**
   * Pet Food Stock Router - Manage pet food inventory and consumption
   */
  petFoodStock: router({
    /**
     * Get food stock for a specific pet
     */
    get: publicProcedure
      .input(z.object({ petId: z.number() }))
      .query(async ({ input }) => {
        const stock = await db.getPetFoodStock(input.petId);
        if (!stock) return null;
        
        // Calculate derived fields
        const daysRemaining = db.calculateStockDuration(stock.currentStock, stock.dailyConsumption);
        const restockDate = db.calculateRestockDate(
          stock.currentStock,
          stock.dailyConsumption,
          stock.alertThresholdDays
        );
        const needsRestock = daysRemaining <= stock.alertThresholdDays;
        
        return {
          ...stock,
          daysRemaining,
          restockDate,
          needsRestock,
        };
      }),

    /**
     * Create or update food stock for a pet
     */
    upsert: protectedProcedure
      .input(z.object({
        petId: z.number(),
        brandName: z.string().min(1),
        currentStock: z.number().min(0),
        dailyConsumption: z.number().min(1),
        alertThresholdDays: z.number().min(1).optional(),
        lastPurchaseDate: z.date().optional(),
        lastPurchaseAmount: z.number().min(0).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const existing = await db.getPetFoodStock(input.petId);
        
        if (existing) {
          await db.updatePetFoodStock(input.petId, input);
          return { success: true, id: existing.id };
        } else {
          const result = await db.createPetFoodStock(input);
          return { success: true, id: result.id };
        }
      }),

    /**
     * Register a food purchase (adds to current stock)
     */
    registerPurchase: protectedProcedure
      .input(z.object({
        petId: z.number(),
        amount: z.number().min(1), // amount in grams
        brandName: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const stock = await db.getPetFoodStock(input.petId);
        
        if (!stock) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Food stock not found for this pet. Please create it first.",
          });
        }
        
        const newStock = stock.currentStock + input.amount;
        await db.updatePetFoodStock(input.petId, {
          currentStock: newStock,
          lastPurchaseDate: new Date(),
          lastPurchaseAmount: input.amount,
          brandName: input.brandName || stock.brandName,
          notes: input.notes,
        });
        
        return { success: true, newStock };
      }),

    /**
     * Get all pets with low food stock (admin only)
     */
    getLowStock: adminProcedure
      .input(z.object({
        thresholdDays: z.number().min(1).optional(),
      }).optional())
      .query(async ({ input }) => {
        const lowStockPets = await db.getAllLowStockPets(input?.thresholdDays);
        
        // Enrich with calculated fields
        return lowStockPets.map(stock => ({
          ...stock,
          daysRemaining: db.calculateStockDuration(stock.currentStock, stock.dailyConsumption),
        }));
      }),
  }),

  /**
   * Wall posts router - Interactive feed with photos, comments, and reactions
   */
  wall: router({
    /**
     * Create a new wall post
     */
    createPost: protectedProcedure
      .input(z.object({
        petId: z.number().optional(),
        content: z.string().optional(),
        mediaData: z.array(z.string()).optional(), // base64 encoded images/videos
        postType: z.enum(["photo", "video", "text", "mixed"]).default("text"),
        targetType: z.enum(["general", "tutor", "pet"]).default("general"),
        targetId: z.number().optional(), // tutor or pet ID if targeted
      }))
      .mutation(async ({ ctx, input }) => {
        const mediaUrls: string[] = [];
        const mediaKeys: string[] = [];
        
        // Upload media to S3 if provided
        if (input.mediaData && input.mediaData.length > 0) {
          const { storagePut } = await import("./storage");

          for (const base64Data of input.mediaData) {
            try {
              // Validate base64 format
              if (!base64Data || typeof base64Data !== 'string') {
                throw new Error("Invalid image data format");
              }

              // Extract base64 content - handle both formats: "data:image/png;base64,..." or just base64 string
              const parts = base64Data.split(",");
              const base64Content = parts.length > 1 ? parts[1] : parts[0];

              if (!base64Content) {
                throw new Error("Empty image data");
              }

              const buffer = Buffer.from(base64Content, "base64");

              // Detect content type
              const contentTypeMatch = base64Data.match(/data:([^;]+)/);
              const contentType = contentTypeMatch ? contentTypeMatch[1] : "image/jpeg";

              // Determine file extension
              let ext = "jpg";
              if (contentType.includes("png")) ext = "png";
              else if (contentType.includes("gif")) ext = "gif";
              else if (contentType.includes("webp")) ext = "webp";
              else if (contentType.includes("mp4") || contentType.includes("video")) ext = "mp4";

              const randomSuffix = Math.random().toString(36).substring(7);
              const key = `wall-posts/${ctx.user.id}/${Date.now()}-${randomSuffix}.${ext}`;

              const { url } = await storagePut(key, buffer, contentType);
              mediaUrls.push(url);
              mediaKeys.push(key);
            } catch (error: any) {
              console.error("Error processing wall post image:", error);
              throw new Error(`Failed to process image: ${error.message}`);
            }
          }
        }
        
        const postId = await db.createWallPost({
          petId: input.petId,
          authorId: ctx.user.id,
          content: input.content,
          mediaUrls: mediaUrls as any,
          mediaKeys: mediaKeys as any,
          postType: input.postType,
          targetType: input.targetType,
          targetId: input.targetId,
        });
        
        // Send notifications for targeted posts
        if (input.targetType === "tutor" && input.targetId) {
          // Notify specific tutor
          await db.createNotification({
            user_id: input.targetId,
            type: "system",
            title: "Nova mensagem no mural",
            message: `${ctx.user.name || "Administrador"} publicou uma mensagem direcionada para você no mural da creche`,
            is_read: false,
          });
        } else if (input.targetType === "pet" && input.targetId) {
          // Notify all tutors of the pet
          const tutors = await db.getTutorsByPet(input.targetId);
          for (const tutor of tutors) {
            if (tutor.tutor_id) {
              const pet = await db.getPetById(input.targetId);
              await db.createNotification({
                user_id: tutor.tutor_id,
                type: "system",
                title: "Nova atualização sobre seu pet",
                message: `${ctx.user.name || "Administrador"} publicou uma atualização sobre ${pet?.name || "seu pet"} no mural da creche`,
                is_read: false,
              });
            }
          }
        }
        
        return { success: true, postId };
      }),

    /**
     * Get wall posts with pagination and visibility filtering
     */
    getPosts: protectedProcedure
      .input(z.object({
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
        petId: z.number().optional(),
        targetType: z.enum(["general", "tutor", "pet", "all"]).optional(),
      }))
      .query(async ({ ctx, input }) => {
        const posts = await db.getWallPosts(input.limit, input.offset, input.petId, ctx.user.id, input.targetType);
        
        // Get comments and reactions for each post
        const enrichedPosts = await Promise.all(
          posts.map(async (post: any) => {
            const comments = await db.getWallComments(post.id);
            const reactionCounts = await db.getWallReactionCounts(post.id);
            
            return {
              ...post,
              mediaUrls: post.mediaUrls ? JSON.parse(post.mediaUrls as string) : [],
              comments,
              reactionCounts,
              commentCount: comments.length,
            };
          })
        );
        
        return enrichedPosts;
      }),

    /**
     * Add a comment to a post
     */
    addComment: protectedProcedure
      .input(z.object({
        postId: z.number(),
        comment: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const commentId = await db.addWallComment(input.postId, ctx.user.id, input.comment);
        return { success: true, commentId };
      }),

    /**
     * Add or update a reaction to a post
     */
    addReaction: protectedProcedure
      .input(z.object({
        postId: z.number(),
        reactionType: z.enum(["like", "love", "laugh", "wow", "sad"]),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.addWallReaction(input.postId, ctx.user.id, input.reactionType);
        return { success: true };
      }),

    /**
     * Remove a reaction from a post
     */
    removeReaction: protectedProcedure
      .input(z.object({
        postId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.removeWallReaction(input.postId, ctx.user.id);
        return { success: true };
      }),

    /**
     * Delete a post (admin or author only)
     */
    deletePost: protectedProcedure
      .input(z.object({
        postId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const post = await db.getWallPostById(input.postId);
        
        if (!post) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Post not found",
          });
        }
        
        // Only admin or author can delete
        if (ctx.user.role !== "admin" && post.authorId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only delete your own posts",
          });
        }
        
        await db.deleteWallPost(input.postId);
        return { success: true };
      }),
  }),

  /**
   * Chat router - Messaging with WhatsApp integration
   */
  chat: router({
    /**
     * Get user's conversations
     */
    getConversations: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getConversations(ctx.user.id);
      }),

    /**
     * Get messages from a conversation
     */
    getMessages: protectedProcedure
      .input(z.object({
        conversationId: z.number(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }))
      .query(async ({ input }) => {
        return await db.getChatMessages(input.conversationId, input.limit, input.offset);
      }),

    /**
     * Send a message
     */
    sendMessage: protectedProcedure
      .input(z.object({
        conversationId: z.number(),
        content: z.string().optional(),
        mediaData: z.string().optional(), // base64 encoded media
        messageType: z.enum(["text", "image", "video", "audio", "document"]).default("text"),
      }))
      .mutation(async ({ ctx, input }) => {
        let mediaUrl: string | undefined;
        let mediaKey: string | undefined;
        
        // Upload media to S3 if provided
        if (input.mediaData) {
          const { storagePut } = await import("./storage");
          const buffer = Buffer.from(input.mediaData.split(",")[1], "base64");
          const randomSuffix = Math.random().toString(36).substring(7);
          const ext = input.messageType === "image" ? "jpg" : input.messageType === "video" ? "mp4" : "bin";
          const key = `chat-media/${ctx.user.id}/${Date.now()}-${randomSuffix}.${ext}`;
          
          const { url } = await storagePut(key, buffer, input.mediaData.split(";")[0].split(":")[1]);
          mediaUrl = url;
          mediaKey = key;
        }
        
        const messageId = await db.addChatMessage({
          conversationId: input.conversationId,
          senderId: ctx.user.id,
          content: input.content,
          mediaUrl,
          mediaKey,
          messageType: input.messageType,
        });
        
        // Sincronizar com WhatsApp Business (em background)
        try {
          const { syncMessageToWhatsApp } = await import("./whatsappSync");
          await syncMessageToWhatsApp(messageId);
        } catch (error) {
          console.error("Erro ao sincronizar mensagem com WhatsApp:", error);
          // Não falhar a operação se sincronização falhar
        }
        
        return { success: true, messageId };
      }),

    /**
     * Mark messages as read
     */
    markAsRead: protectedProcedure
      .input(z.object({
        conversationId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.markMessagesAsRead(input.conversationId, ctx.user.id);
        return { success: true };
      }),

    /**
     * Create a new conversation
     */
    createConversation: protectedProcedure
      .input(z.object({
        petId: z.number().optional(),
        participantIds: z.array(z.number()),
      }))
      .mutation(async ({ ctx, input }) => {
        // Add current user to participants if not already included
        const participantSet = new Set([...input.participantIds, ctx.user.id]);
        const participants = Array.from(participantSet);
        
        const conversationId = await db.createConversation({
          petId: input.petId,
          participants: participants as any,
        });
        
        return { success: true, conversationId };
      }),
  }),

  // Search
  search: searchRouter,
});

export type AppRouter = typeof appRouter;
