import type { Request, Response } from "express";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";
import { uploadRouter } from "../server/uploadRouter";
import { handleStripeWebhook } from "../server/stripeWebhook";

// Create Express app
const app = express();

// Trust proxy for Vercel
app.set("trust proxy", 1);

// Stripe webhook MUST be registered BEFORE express.json() for signature verification
app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), handleStripeWebhook);

// Configure body parser with larger size limit for file uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Upload routes
app.use("/api", uploadRouter);

// tRPC API
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// Export the handler for Vercel
// Vercel serverless functions accept Express apps directly
export default app;
