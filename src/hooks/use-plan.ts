"use client";

import { trpc } from "@/lib/trpc/client";
import { usePermissions } from "./use-permissions";

type Plan = "essencial" | "criminal" | "completo" | null;

export function usePlan() {
  const { user } = usePermissions();
  const { data: subscription } = trpc.subscriptions.getMySubscription.useQuery(undefined, {
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const plan: Plan = (subscription?.plano as Plan) ?? null;
  const isExempt = user?.role === "admin" || user?.role === "estagiario" || user?.role === "servidor";

  // Plan hierarchy: completo > criminal > essencial
  const hasPlan = (required: Plan): boolean => {
    if (!user) return false;
    if (isExempt) return true; // admin, estagiario, servidor always have access
    if (!plan) return true; // no subscription yet = full access (grace period)

    const hierarchy: Record<string, number> = {
      essencial: 1,
      criminal: 2,
      completo: 3,
    };

    return (hierarchy[plan] ?? 0) >= (hierarchy[required ?? "essencial"] ?? 0);
  };

  return {
    plan,
    subscription,
    isExempt,
    hasPlan,
    isEssencial: plan === "essencial",
    isCriminal: hasPlan("criminal"),
    isCompleto: hasPlan("completo"),
  };
}
