"use client";

import { trpc } from "@/lib/trpc/client";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

export function ConflictBadge() {
  const { data: count } = trpc.sync.conflictCount.useQuery(undefined, {
    refetchInterval: 30000,
  });

  if (!count || count === 0) return null;

  return (
    <Link href="/conflitos">
      <Badge variant="destructive" className="gap-1 cursor-pointer">
        <AlertTriangle className="h-3 w-3" />
        {count} conflito{count > 1 ? "s" : ""}
      </Badge>
    </Link>
  );
}
