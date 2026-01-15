import { redirect } from "next/navigation";

// Forçar renderização dinâmica para evitar problemas de build
export const dynamic = "force-dynamic";

export default function RegisterRedirect() {
  redirect("/sign-up");
}
