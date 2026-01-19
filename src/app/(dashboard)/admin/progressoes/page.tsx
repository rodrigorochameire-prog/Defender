"use client";

import { redirect } from "next/navigation";

// Redireciona para a página de benefícios (progressões são um tipo de benefício)
export default function ProgressoesPage() {
  redirect("/admin/beneficios");
}
