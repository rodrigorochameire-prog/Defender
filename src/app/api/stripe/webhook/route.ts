import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import { db, pets, notifications } from "@/lib/db";
import { eq, sql } from "drizzle-orm";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET não configurado");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Erro ao verificar webhook:", err);
    return NextResponse.json(
      { error: `Webhook Error: ${err instanceof Error ? err.message : "Unknown error"}` },
      { status: 400 }
    );
  }

  // Processar eventos
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutCompleted(session);
      break;
    }
    case "payment_intent.succeeded": {
      console.log("Pagamento confirmado:", event.data.object);
      break;
    }
    case "payment_intent.payment_failed": {
      console.log("Pagamento falhou:", event.data.object);
      break;
    }
    default:
      console.log(`Evento não tratado: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { userId, petId, credits } = session.metadata || {};

  if (!userId || !credits) {
    console.error("Metadata inválida no checkout:", session.metadata);
    return;
  }

  const creditsNum = parseInt(credits, 10);
  const userIdNum = parseInt(userId, 10);

  try {
    // Se tem petId, adicionar créditos ao pet específico
    if (petId) {
      const petIdNum = parseInt(petId, 10);
      await db
        .update(pets)
        .set({
          credits: sql`${pets.credits} + ${creditsNum}`,
          updatedAt: new Date(),
        })
        .where(eq(pets.id, petIdNum));

      console.log(`✅ ${creditsNum} créditos adicionados ao pet ${petIdNum}`);
    }

    // Criar notificação para o usuário
    await db.insert(notifications).values({
      userId: userIdNum,
      type: "success",
      title: "Pagamento Confirmado! 🎉",
      message: `Seus ${creditsNum} créditos foram adicionados com sucesso.`,
      isRead: false,
    });

    console.log(`✅ Pagamento processado: ${creditsNum} créditos para usuário ${userIdNum}`);
  } catch (error) {
    console.error("Erro ao processar pagamento:", error);
    throw error;
  }
}
