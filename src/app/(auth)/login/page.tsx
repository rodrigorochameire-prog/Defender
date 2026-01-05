import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

export default async function LoginPage() {
  const { userId, sessionClaims } = await auth();

  if (userId) {
    // Já está logado, redirecionar baseado no role
    const publicMeta = (sessionClaims as { publicMetadata?: { role?: string } })?.publicMetadata || {};
    const role = publicMeta.role || "tutor";
    
    if (role === "admin") {
      redirect("/admin");
    } else {
      redirect("/tutor");
    }
  }

  // Não está logado, redirecionar para sign-in
  redirect("/sign-in");
}
