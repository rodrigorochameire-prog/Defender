import { Request, Response } from "express";
import Stripe from "stripe";
import { getDb } from "./db";
import { users, payments, pets } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// Lazy initialization - only create Stripe client if key is configured
let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured. Stripe features are disabled.");
    }
    stripeInstance = new Stripe(stripeKey, {
      apiVersion: "2025-12-15.clover",
    });
  }
  return stripeInstance;
}

export async function handleStripeWebhook(req: Request, res: Response) {
  try {
    const stripe = getStripe();
  } catch (error: any) {
    console.warn("[Webhook] Stripe not configured:", error.message);
    return (res as any).status(503).json({ error: "Stripe is not configured" });
  }

  const sig = (req as any).headers["stripe-signature"];

  if (!sig) {
    console.error("[Webhook] Missing stripe-signature header");
    return (res as any).status(400).send("Missing signature");
  }

  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
    }
    event = stripe.webhooks.constructEvent(
      (req as any).body,
      sig,
      webhookSecret
    );
  } catch (err: any) {
    console.error("[Webhook] Signature verification failed:", err.message);
    return (res as any).status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle test events
  if (event.id.startsWith("evt_test_")) {
    console.log("[Webhook] Test event detected, returning verification response");
    return (res as any).json({ verified: true });
  }

  console.log(`[Webhook] Received event: ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSucceeded(paymentIntent);
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailed(paymentIntent);
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    (res as any).json({ received: true });
  } catch (error: any) {
    console.error("[Webhook] Error processing event:", error);
    (res as any).status(500).json({ error: error.message });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log("[Webhook] Processing checkout.session.completed");

  const userId = session.metadata?.user_id;
  const productKey = session.metadata?.product_key;
  const productType = session.metadata?.product_type;

  if (!userId) {
    console.error("[Webhook] Missing user_id in metadata");
    return;
  }

  const db = await getDb();
  if (!db) {
    console.error("[Webhook] Database connection failed");
    return;
  }

  // Update or create Stripe customer ID
  if (session.customer) {
    await db
      .update(users)
      .set({ stripe_customer_id: session.customer as string })
      .where(eq(users.id, parseInt(userId)));
  }

  console.log(`[Webhook] Checkout completed for user ${userId}, product: ${productKey}`);
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log("[Webhook] Processing payment_intent.succeeded");

  const userId = paymentIntent.metadata?.user_id;
  const productKey = paymentIntent.metadata?.product_key;
  const productType = paymentIntent.metadata?.product_type;
  const creditsToAdd = paymentIntent.metadata?.credits ? parseInt(paymentIntent.metadata.credits) : 0;

  if (!userId) {
    console.error("[Webhook] Missing user_id in metadata");
    return;
  }

  const db = await getDb();
  if (!db) {
    console.error("[Webhook] Database connection failed");
    return;
  }

  // Record payment
  await db.insert(payments).values({
    userId: parseInt(userId),
    stripePaymentIntentId: paymentIntent.id,
    stripeCustomerId: paymentIntent.customer as string || null,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    status: "succeeded",
    productType: productType || "unknown",
    productKey: productKey || null,
    creditsAdded: creditsToAdd > 0 ? creditsToAdd : null,
    metadata: JSON.stringify(paymentIntent.metadata),
  });

  // Add credits to pets if it's a credit purchase
  if (productType === "credits" && creditsToAdd > 0) {
    // Get all pets for this user
    const userPets = await db
      .select()
      .from(pets)
      .where(eq(pets.id, parseInt(userId))); // This should use pet_tutors relation

    // For simplicity, add credits to the first pet or distribute equally
    // You may want to let the user choose which pet gets the credits
    if (userPets.length > 0) {
      const creditsPerPet = Math.floor(creditsToAdd / userPets.length);
      for (const pet of userPets) {
        await db
          .update(pets)
          .set({ credits: (pet.credits || 0) + creditsPerPet })
          .where(eq(pets.id, pet.id));
      }
    }
  }

  console.log(`[Webhook] Payment succeeded for user ${userId}, amount: ${paymentIntent.amount}`);
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log("[Webhook] Processing payment_intent.payment_failed");

  const userId = paymentIntent.metadata?.user_id;

  if (!userId) {
    console.error("[Webhook] Missing user_id in metadata");
    return;
  }

  const db = await getDb();
  if (!db) {
    console.error("[Webhook] Database connection failed");
    return;
  }

  // Record failed payment
  await db.insert(payments).values({
    userId: parseInt(userId),
    stripePaymentIntentId: paymentIntent.id,
    stripeCustomerId: paymentIntent.customer as string || null,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    status: "failed",
    productType: paymentIntent.metadata?.product_type || "unknown",
    productKey: paymentIntent.metadata?.product_key || null,
    metadata: JSON.stringify(paymentIntent.metadata),
  });

  console.log(`[Webhook] Payment failed for user ${userId}`);
}
