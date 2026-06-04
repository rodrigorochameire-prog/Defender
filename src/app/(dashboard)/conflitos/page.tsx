"use client";

import { trpc } from "@/lib/trpc/client";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { ConflictListContent } from "@/components/conflicts/conflict-list-content";

export default function ConflitosPage() {
  const router = useRouter();
  const { data: conflicts } = trpc.sync.conflictList.useQuery();

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <button
        type="button"
        onClick={() =>
          window.history.length > 1 ? router.back() : router.push("/admin")
        }
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar
      </button>

      <div className="flex items-center gap-3">
        <AlertTriangle className="h-6 w-6 text-orange-500" />
        <h1 className="text-2xl font-bold">Conflitos de Sincronização</h1>
        <Badge variant="outline">{conflicts?.length ?? 0} pendentes</Badge>
      </div>

      <ConflictListContent />
    </div>
  );
}
