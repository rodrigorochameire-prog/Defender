import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getStripe, isStripeConfigured } from "@/lib/stripe/client";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Verificar se Stripe está configurado
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: "Stripe não está configurado. Configure as variáveis de ambiente." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { packageId, packageName, credits, priceInCents, petId } = body;

    if (!packageId || !credits || !priceInCents) {
      return NextResponse.json(
        { error: "Dados do pacote inválidos" },
        { status: 400 }
      );
    }

    const stripe = getStripe();

    // Buscar usuário para email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.id))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    // Criar sessão de checkout
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: {
              name: packageName || `${credits} Créditos de Creche`,
              description: `Pacote com ${credits} créditos para uso na creche`,
            },
            unit_amount: priceInCents, // Stripe usa centavos
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: session.id.toString(),
        petId: petId?.toString() || "",
        packageId: packageId.toString(),
        credits: credits.toString(),
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/tutor/credits?success=true&credits=${credits}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/tutor/credits?canceled=true`,
    });

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });
  } catch (error) {
    console.error("Erro no checkout:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro no checkout" },
      { status: 500 }
    );
  }
}
