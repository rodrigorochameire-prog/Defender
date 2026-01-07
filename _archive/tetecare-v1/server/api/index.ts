import dotenv from "dotenv";
// Load .env.local first (development), then .env (production)
dotenv.config({ path: ".env.local" });
dotenv.config(); // This will load .env and won't override .env.local values

import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "../_core/context";
import { uploadRouter } from "../uploadRouter";
import { handleStripeWebhook } from "../stripeWebhook";

const app = express();

// Configure Express to trust proxy (for Vercel)
app.set("trust proxy", 1);

// Stripe webhook MUST be registered BEFORE express.json() for signature verification
app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), handleStripeWebhook);

// Configure body parser with larger size limit for file uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Upload routes
app.use("/api", uploadRouter);

// Health check endpoint
app.get("/api/health", (req: any, res: any) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    env: {
      hasDbUrl: !!(process.env.DATABASE_URL || process.env.POSTGRES_URL),
      hasSupabaseUrl: !!(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
      hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    }
  });
});

// tRPC API
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// Error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error("API Error:", err);
  res.status(500).json({ 
    error: "Internal Server Error", 
    message: err.message || "Unknown error"
  });
});

// Export the Express app as a serverless function handler
export default app;
