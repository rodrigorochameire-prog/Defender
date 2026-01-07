// Stripe Products and Prices Configuration

export const PRODUCTS = {
  // Monthly Plans
  PLAN_BASIC: {
    name: "Plano Básico",
    description: "Até 5 visitas por mês",
    priceId: "price_basic_monthly", // Replace with actual Stripe Price ID
    amount: 19900, // R$ 199.00 in cents
    currency: "brl",
    interval: "month",
    features: [
      "Até 5 visitas por mês",
      "Relatórios diários",
      "Fotos ilimitadas",
      "Suporte por email",
    ],
  },
  PLAN_STANDARD: {
    name: "Plano Padrão",
    description: "Até 12 visitas por mês",
    priceId: "price_standard_monthly",
    amount: 39900, // R$ 399.00
    currency: "brl",
    interval: "month",
    features: [
      "Até 12 visitas por mês",
      "Relatórios diários",
      "Fotos ilimitadas",
      "Assistente IA",
      "Suporte prioritário",
    ],
  },
  PLAN_PREMIUM: {
    name: "Plano Premium",
    description: "Visitas ilimitadas",
    priceId: "price_premium_monthly",
    amount: 69900, // R$ 699.00
    currency: "brl",
    interval: "month",
    features: [
      "Visitas ilimitadas",
      "Relatórios diários",
      "Fotos ilimitadas",
      "Assistente IA",
      "Analytics avançado",
      "Suporte 24/7",
    ],
  },

  // Credit Packages
  CREDITS_10: {
    name: "Pacote 10 Créditos",
    description: "10 diárias avulsas",
    priceId: "price_credits_10",
    amount: 25000, // R$ 250.00
    currency: "brl",
    credits: 10,
  },
  CREDITS_20: {
    name: "Pacote 20 Créditos",
    description: "20 diárias avulsas",
    priceId: "price_credits_20",
    amount: 45000, // R$ 450.00 (10% discount)
    currency: "brl",
    credits: 20,
  },
  CREDITS_50: {
    name: "Pacote 50 Créditos",
    description: "50 diárias avulsas",
    priceId: "price_credits_50",
    amount: 100000, // R$ 1000.00 (20% discount)
    currency: "brl",
    credits: 50,
  },
} as const;

export type ProductKey = keyof typeof PRODUCTS;
