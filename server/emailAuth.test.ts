/**
 * Tests for email/password authentication
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { registerUser, loginUser, changePassword } from "./emailAuth";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const TEST_USER = {
  name: "Test User",
  email: "test@example.com",
  password: "test123456",
};

describe("Email/Password Authentication", () => {
  let testUserId: number;

  // Cleanup test user before and after tests
  beforeAll(async () => {
    const db = await getDb();
    if (db) {
      await db.delete(users).where(eq(users.email, TEST_USER.email));
    }
  });

  afterAll(async () => {
    const db = await getDb();
    if (db) {
      await db.delete(users).where(eq(users.email, TEST_USER.email));
    }
  });

  it("should register a new user with email and password", async () => {
    const result = await registerUser({
      name: TEST_USER.name,
      email: TEST_USER.email,
      password: TEST_USER.password,
    });

    expect(result).toBeDefined();
    expect(result.email).toBe(TEST_USER.email.toLowerCase());
    expect(result.name).toBe(TEST_USER.name);
    expect(result.role).toBe("user");
    testUserId = result.id;
  });

  it("should not allow duplicate email registration", async () => {
    await expect(
      registerUser({
        name: "Another User",
        email: TEST_USER.email,
        password: "different123",
      })
    ).rejects.toThrow("Email already registered");
  });

  it("should login with correct email and password", async () => {
    const result = await loginUser({
      email: TEST_USER.email,
      password: TEST_USER.password,
    });

    expect(result).toBeDefined();
    expect(result.email).toBe(TEST_USER.email.toLowerCase());
    expect(result.name).toBe(TEST_USER.name);
  });

  it("should reject login with incorrect password", async () => {
    await expect(
      loginUser({
        email: TEST_USER.email,
        password: "wrongpassword",
      })
    ).rejects.toThrow("Invalid email or password");
  });

  it("should reject login with non-existent email", async () => {
    await expect(
      loginUser({
        email: "nonexistent@example.com",
        password: "anypassword",
      })
    ).rejects.toThrow("Invalid email or password");
  });

  it("should change password with correct old password", async () => {
    const newPassword = "newpassword123";
    
    const result = await changePassword(testUserId, TEST_USER.password, newPassword);
    expect(result.success).toBe(true);

    // Verify can login with new password
    const loginResult = await loginUser({
      email: TEST_USER.email,
      password: newPassword,
    });
    expect(loginResult).toBeDefined();

    // Change back to original password for cleanup
    await changePassword(testUserId, newPassword, TEST_USER.password);
  });

  it("should reject password change with incorrect old password", async () => {
    await expect(
      changePassword(testUserId, "wrongoldpassword", "newpassword123")
    ).rejects.toThrow("Current password is incorrect");
  });

  it("should store passwords as hashed values", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const userResults = await db.select().from(users).where(eq(users.id, testUserId)).limit(1);
    const user = userResults[0];

    expect(user.passwordHash).toBeDefined();
    expect(user.passwordHash).not.toBe(TEST_USER.password);
    expect(user.passwordHash?.length).toBeGreaterThan(50); // bcrypt hashes are long
  });
});
