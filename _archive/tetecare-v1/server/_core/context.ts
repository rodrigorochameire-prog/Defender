import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { createClient } from "@supabase/supabase-js";
import { getUserByAuthId, upsertUserFromSupabase } from "../db";

// Lazy initialization to allow dotenv to load first
let supabaseAdmin: ReturnType<typeof createClient> | null = null;

function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    // Load environment variables lazily (after dotenv has loaded)
    // Support multiple variable names (Vercel Supabase integration uses different names)
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn(
        `[Supabase] Missing environment variables. URL: ${supabaseUrl ? "OK" : "MISSING"}, SERVICE_ROLE_KEY: ${supabaseServiceKey ? "OK" : "MISSING"}`
      );
      return null;
    }
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return supabaseAdmin;
}

// Supabase admin client will be created lazily via getSupabaseAdmin()

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // Get authorization header
    const authHeader = (opts.req as any).headers?.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return {
        req: opts.req,
        res: opts.res,
        user: null,
      };
    }

    const token = authHeader.substring(7);

    // Verify token with Supabase
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.warn("[Auth] Supabase not configured, skipping auth");
      return {
        req: opts.req,
        res: opts.res,
        user: null,
      };
    }

    const {
      data: { user: supabaseUser },
      error,
    } = await (supabase.auth as any).getUser(token);

    if (error || !supabaseUser) {
      return {
        req: opts.req,
        res: opts.res,
        user: null,
      };
    }

    // Sync user to our database
    await upsertUserFromSupabase(supabaseUser);

    // Get user from our database
    const foundUser = await getUserByAuthId(supabaseUser.id);

    if (!foundUser) {
      return {
        req: opts.req,
        res: opts.res,
        user: null,
      };
    }

    user = foundUser;
  } catch (error) {
    // Authentication is optional for public procedures.
    console.warn("[Auth] Error authenticating request:", error);
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
