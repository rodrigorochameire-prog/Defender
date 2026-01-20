import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

export default async function LoginPage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/admin");
  }

  // Não está logado, redirecionar para sign-in
  redirect("/sign-in");
}
