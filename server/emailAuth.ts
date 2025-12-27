/**
 * Email/Password Authentication Module
 * Handles user registration and login with bcrypt password hashing
 */

import bcrypt from "bcrypt";
import crypto from "crypto";
import { getDb, getUserByEmail } from "./db";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { users, passwordResetTokens, emailVerificationTokens } from "../drizzle/schema";
import { eq, and, gt, sql } from "drizzle-orm";

const SALT_ROUNDS = 10;

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role?: "user" | "admin";
}

export interface LoginInput {
  email: string;
  password: string;
}

/**
 * Register a new user with email and password
 */
export async function registerUser(input: RegisterInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if email already exists (using getUserByEmail which has fallback logic)
  const existingUser = await getUserByEmail(input.email.toLowerCase());

  if (existingUser) {
    throw new Error("Email already registered");
  }

  // Hash password
  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  // Create user and return the inserted user
  // Note: passwordHash is not stored in database (uses Supabase Auth)
  const [newUser] = await db.insert(users).values({
    name: input.name,
    email: input.email.toLowerCase(),
    login_method: "email",
    role: input.role || "user",
    last_signed_in: new Date(),
  }).returning();

  return {
    id: newUser.id,
    email: input.email.toLowerCase(),
    name: input.name,
    role: input.role || "user",
  };
}

/**
 * Login user with email and password
 */
export async function loginUser(input: LoginInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Find user by email (using getUserByEmail which has fallback logic)
  const user = await getUserByEmail(input.email.toLowerCase());

  if (!user) {
    throw new Error("Invalid email or password");
  }

  // Check if user uses email/password auth
  // Note: For Supabase Auth, login is handled by Supabase directly
  // This function is a fallback for legacy email/password users
  if (user.login_method !== "email" && user.login_method !== "supabase") {
    throw new Error("This account uses a different login method");
  }

  // Update last signed in
  await db.update(users)
    .set({ last_signed_in: new Date() })
    .where(eq(users.id, user.id));

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

/**
 * Change user password
 */
export async function changePassword(userId: number, oldPassword: string, newPassword: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get user
  const userResults = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = userResults.length > 0 ? userResults[0] : null;

  if (!user) {
    throw new Error("User not found");
  }

  // Note: Password management should be done via Supabase Auth
  // This is a placeholder - actual implementation should use Supabase Auth
  throw new Error("Password changes should be done via Supabase Auth");

  return { success: true };
}

/**
 * Generate a password reset token
 */
export async function generateResetToken(email: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Find user by email (using getUserByEmail which has fallback logic)
  const user = await getUserByEmail(email.toLowerCase());

  if (!user) {
    // Don't reveal if email exists or not for security
    return { success: true };
  }

  // Generate random token
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Save token to database
  await db.insert(passwordResetTokens).values({
    user_id: user.id,
    token,
    expires_at: expiresAt,
  });

  return { success: true, token, userId: user.id, email: user.email, name: user.name };
}

/**
 * Reset password using token
 */
export async function resetPassword(token: string, newPassword: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Find valid token
  const tokenResults = await db.select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.token, token),
        eq(passwordResetTokens.used, false),
        gt(passwordResetTokens.expires_at, new Date())
      )
    )
    .limit(1);

  const resetToken = tokenResults.length > 0 ? tokenResults[0] : null;

  if (!resetToken) {
    throw new Error("Invalid or expired reset token");
  }

  // Hash new password
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  // Note: Password reset should be done via Supabase Auth
  // This is a placeholder - actual implementation should use Supabase Auth
  throw new Error("Password reset should be done via Supabase Auth");

  // Mark token as used
  await db.update(passwordResetTokens)
    .set({ used: true })
    .where(eq(passwordResetTokens.id, resetToken.id));

  return { success: true };
}

/**
 * Generate an email verification token
 */
export async function generateVerificationToken(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Generate random token
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Save token to database
  await db.insert(emailVerificationTokens).values({
    user_id: userId,
    token,
    expires_at: expiresAt,
  });

  return { token };
}

/**
 * Verify email using token
 */
export async function verifyEmail(token: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Find valid token
  const tokenResults = await db.select()
    .from(emailVerificationTokens)
    .where(
      and(
        eq(emailVerificationTokens.token, token),
        eq(emailVerificationTokens.used, false),
        gt(emailVerificationTokens.expires_at, new Date())
      )
    )
    .limit(1);

  const verificationToken = tokenResults.length > 0 ? tokenResults[0] : null;

  if (!verificationToken) {
    throw new Error("Invalid or expired verification token");
  }

  // Update user email verified status
  await db.update(users)
    .set({ email_verified: true })
    .where(eq(users.id, verificationToken.user_id));

  // Mark token as used
  await db.update(emailVerificationTokens)
    .set({ used: true })
    .where(eq(emailVerificationTokens.id, verificationToken.id));

  return { success: true };
}
