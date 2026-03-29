import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { comarcas } from "@/lib/db/schema/comarcas";
import { eq } from "drizzle-orm";
import OnboardingWizard from "./onboarding-wizard";

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await db.query.users.findFirst({ where: eq(users.id, session.id) });
  if (!user) redirect("/login");
  if (user.onboardingCompleted) redirect("/admin/dashboard");

  // Get comarca name
  let comarcaNome = "Comarca";
  try {
    const comarca = await db.query.comarcas.findFirst({
      where: eq(comarcas.id, user.comarcaId),
      columns: { nome: true },
    });
    comarcaNome = comarca?.nome ?? "Comarca";
  } catch {}

  return (
    <OnboardingWizard
      userName={user.name}
      userComarca={comarcaNome}
      userAreas={user.areasPrincipais ?? []}
      userId={user.id}
    />
  );
}
