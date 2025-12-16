/**
 * Email/Password Authentication Module
 * Handles user registration and login with bcrypt password hashing
 */

import bcrypt from "bcrypt";
import crypto from "crypto";
import { getDb } from "./db";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { users, passwordResetTokens, emailVerificationTokens } from "../drizzle/schema";
import { eq, and, gt } from "drizzle-orm";

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

  // Check if email already exists
  const existingUsers = await db.select().from(users).where(eq(users.email, input.email.toLowerCase())).limit(1);
  const existingUser = existingUsers.length > 0 ? existingUsers[0] : null;

  if (existingUser) {
    throw new Error("Email already registered");
  }

  // Hash password
  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  // Create user
  const [newUser] = await db.insert(users).values({
    name: input.name,
    email: input.email.toLowerCase(),
    passwordHash,
    loginMethod: "email",
    role: input.role || "user",
    lastSignedIn: new Date(),
  });

  return {
    id: newUser.insertId,
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

  // Find user by email
  const userResults = await db.select().from(users).where(eq(users.email, input.email.toLowerCase())).limit(1);
  const user = userResults.length > 0 ? userResults[0] : null;

  if (!user) {
    throw new Error("Invalid email or password");
  }

  // Check if user uses email/password auth
  if (user.loginMethod !== "email" || !user.passwordHash) {
    throw new Error("This account uses a different login method");
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);

  if (!isValidPassword) {
    throw new Error("Invalid email or password");
  }

  // Update last signed in
  await db.update(users)
    .set({ lastSignedIn: new Date() })
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

  const userResults = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = userResults.length > 0 ? userResults[0] : null;

  if (!user || !user.passwordHash) {
    throw new Error("User not found or invalid auth method");
  }

  // Verify old password
  const isValidPassword = await bcrypt.compare(oldPassword, user.passwordHash);

  if (!isValidPassword) {
    throw new Error("Current password is incorrect");
  }

  // Hash new password
  const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  // Update password
  await db.update(users)
    .set({ passwordHash: newPasswordHash })
    .where(eq(users.id, userId));

  return { success: true };
}

/**
 * Generate a password reset token
 */
export async function generateResetToken(email: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Find user by email
  const userResults = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  const user = userResults.length > 0 ? userResults[0] : null;

  if (!user) {
    // Don't reveal if email exists or not for security
    return { success: true };
  }

  // Generate random token
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Save token to database
  await db.insert(passwordResetTokens).values({
    userId: user.id,
    token,
    expiresAt,
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
        gt(passwordResetTokens.expiresAt, new Date())
      )
    )
    .limit(1);

  const resetToken = tokenResults.length > 0 ? tokenResults[0] : null;

  if (!resetToken) {
    throw new Error("Invalid or expired reset token");
  }

  // Hash new password
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  // Update user password
  await db.update(users)
    .set({ passwordHash })
    .where(eq(users.id, resetToken.userId));

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
    userId,
    token,
    expiresAt,
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
        gt(emailVerificationTokens.expiresAt, new Date())
      )
    )
    .limit(1);

  const verificationToken = tokenResults.length > 0 ? tokenResults[0] : null;

  if (!verificationToken) {
    throw new Error("Invalid or expired verification token");
  }

  // Update user email verified status
  await db.update(users)
    .set({ emailVerified: true })
    .where(eq(users.id, verificationToken.userId));

  // Mark token as used
  await db.update(emailVerificationTokens)
    .set({ used: true })
    .where(eq(emailVerificationTokens.id, verificationToken.id));

  return { success: true };
}
