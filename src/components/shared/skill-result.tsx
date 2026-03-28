"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import Link from "next/link";

interface SkillResultProps {
  skillName: string;
  type: string;
  route?: string;
  delegateUrl?: string;
}

export function SkillResult({ skillName, type, route, delegateUrl }: SkillResultProps) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-2.5 space-y-1.5 mt-1">
      <div className="flex items-center gap-2">
        <Badge variant="default" className="text-xs">{skillName}</Badge>
      </div>
      {route && (
        <Link href={route}>
          <Button size="sm" variant="outline" className="gap-1 h-7 text-xs">
            <ExternalLink className="h-3 w-3" /> Abrir
          </Button>
        </Link>
      )}
      {delegateUrl && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400">Enviado para Cowork</p>
      )}
    </div>
  );
}
