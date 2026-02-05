"use client";

import { PainelReuPreso } from "@/components/reu-preso/painel-reu-preso";

export default function ReuPresoPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Painel de Reu Preso</h1>
        <p className="text-muted-foreground">
          Acompanhamento de assistidos privados de liberdade e alertas de excesso de prazo
        </p>
      </div>
      <PainelReuPreso />
    </div>
  );
}
