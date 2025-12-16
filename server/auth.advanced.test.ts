/**
 * Advanced Authentication Tests
 * Tests for password reset, email verification, and profile management
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { users, passwordResetTokens, emailVerificationTokens } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// Mock request/response for tRPC context
const mockReq = { ip: "127.0.0.1", headers: {} } as any;
const mockRes = {
  cookie: () => {},
  clearCookie: () => {},
} as any;

describe("Advanced Authentication", () => {
  let testUserId: number;
  let testUserEmail: string;
  let resetToken: string;
  let verificationToken: string;

  beforeAll(async () => {
    // Create a test user
    const caller = appRouter.createCaller({ user: null, req: mockReq, res: mockRes });
    const result = await caller.auth.register({
      name: "Test User Advanced",
      email: `test-advanced-${Date.now()}@example.com`,
      password: "password123",
    });
    
    testUserId = result.user.id;
    testUserEmail = result.user.email!;
  });

  afterAll(async () => {
    // Cleanup: delete test user and tokens
    const db = await getDb();
    if (db) {
      await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, testUserId));
      await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, testUserId));
      await db.delete(users).where(eq(users.id, testUserId));
    }
  });

  describe("Password Reset", () => {
    it("should generate password reset token", async () => {
      const caller = appRouter.createCaller({ user: null, req: mockReq, res: mockRes });
      const result = await caller.auth.requestPasswordReset({
        email: testUserEmail,
      });

      expect(result.success).toBe(true);

      // Verify token was created in database
      const db = await getDb();
      const tokens = await db!
        .select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.userId, testUserId))
        .limit(1);

      expect(tokens.length).toBe(1);
      resetToken = tokens[0].token;
    });

    it("should not reveal if email doesn't exist", async () => {
      const caller = appRouter.createCaller({ user: null, req: mockReq, res: mockRes });
      const result = await caller.auth.requestPasswordReset({
        email: "nonexistent@example.com",
      });

      // Should still return success to not reveal if email exists
      expect(result.success).toBe(true);
    });

    it("should reset password with valid token", async () => {
      const caller = appRouter.createCaller({ user: null, req: mockReq, res: mockRes });
      const result = await caller.auth.resetPassword({
        token: resetToken,
        newPassword: "newpassword123",
      });

      expect(result.success).toBe(true);

      // Verify token was marked as used
      const db = await getDb();
      const tokens = await db!
        .select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.token, resetToken))
        .limit(1);

      expect(tokens[0].used).toBe(true);

      // Verify can login with new password
      const loginResult = await caller.auth.login({
        email: testUserEmail,
        password: "newpassword123",
      });

      expect(loginResult.success).toBe(true);
    });

    it("should reject invalid or expired token", async () => {
      const caller = appRouter.createCaller({ user: null, req: mockReq, res: mockRes });
      
      await expect(
        caller.auth.resetPassword({
          token: "invalid-token",
          newPassword: "newpassword123",
        })
      ).rejects.toThrow("Invalid or expired reset token");
    });

    it("should reject reused token", async () => {
      const caller = appRouter.createCaller({ user: null, req: mockReq, res: mockRes });
      
      await expect(
        caller.auth.resetPassword({
          token: resetToken,
          newPassword: "anotherpassword",
        })
      ).rejects.toThrow("Invalid or expired reset token");
    });
  });

  describe("Email Verification", () => {
    it("should generate verification token", async () => {
      const mockUser = { id: testUserId, email: testUserEmail, role: "user" as const };
      const caller = appRouter.createCaller({ user: mockUser, req: mockReq, res: mockRes });
      
      const result = await caller.auth.requestEmailVerification();
      expect(result.success).toBe(true);

      // Verify token was created in database
      const db = await getDb();
      const tokens = await db!
        .select()
        .from(emailVerificationTokens)
        .where(eq(emailVerificationTokens.userId, testUserId))
        .limit(1);

      expect(tokens.length).toBe(1);
      verificationToken = tokens[0].token;
    });

    it("should verify email with valid token", async () => {
      const caller = appRouter.createCaller({ user: null, req: mockReq, res: mockRes });
      const result = await caller.auth.verifyEmail({
        token: verificationToken,
      });

      expect(result.success).toBe(true);

      // Verify user emailVerified flag was set
      const db = await getDb();
      const userResults = await db!
        .select()
        .from(users)
        .where(eq(users.id, testUserId))
        .limit(1);

      expect(userResults[0].emailVerified).toBe(true);
    });

    it("should reject invalid verification token", async () => {
      const caller = appRouter.createCaller({ user: null, req: mockReq, res: mockRes });
      
      await expect(
        caller.auth.verifyEmail({
          token: "invalid-verification-token",
        })
      ).rejects.toThrow("Invalid or expired verification token");
    });
  });

  describe("Profile Management", () => {
    it("should update user profile", async () => {
      const mockUser = { id: testUserId, email: testUserEmail, role: "user" as const };
      const caller = appRouter.createCaller({ user: mockUser, req: mockReq, res: mockRes });
      
      const result = await caller.auth.updateProfile({
        name: "Updated Name",
        phone: "(11) 99999-9999",
      });

      expect(result.success).toBe(true);

      // Verify changes in database
      const db = await getDb();
      const userResults = await db!
        .select()
        .from(users)
        .where(eq(users.id, testUserId))
        .limit(1);

      expect(userResults[0].name).toBe("Updated Name");
      expect(userResults[0].phone).toBe("(11) 99999-9999");
    });

    it("should change password", async () => {
      const mockUser = { id: testUserId, email: testUserEmail, role: "user" as const };
      const caller = appRouter.createCaller({ user: mockUser, req: mockReq, res: mockRes });
      
      const result = await caller.auth.changePassword({
        oldPassword: "newpassword123",
        newPassword: "finalpassword123",
      });

      expect(result.success).toBe(true);

      // Verify can login with new password
      const publicCaller = appRouter.createCaller({ user: null, req: mockReq, res: mockRes });
      const loginResult = await publicCaller.auth.login({
        email: testUserEmail,
        password: "finalpassword123",
      });

      expect(loginResult.success).toBe(true);
    });

    it("should reject wrong old password", async () => {
      const mockUser = { id: testUserId, email: testUserEmail, role: "user" as const };
      const caller = appRouter.createCaller({ user: mockUser, req: mockReq, res: mockRes });
      
      await expect(
        caller.auth.changePassword({
          oldPassword: "wrongpassword",
          newPassword: "newpassword",
        })
      ).rejects.toThrow("Current password is incorrect");
    });
  });
});
