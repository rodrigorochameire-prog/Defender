import { Suspense } from "react";
import AtendimentosView from "@/components/atendimentos/atendimentos-view";

export default function AtendimentosPage() {
  return (
    <Suspense>
      <AtendimentosView />
    </Suspense>
  );
}
