"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FileText, Hash, User, Users } from "lucide-react";

type EntityType = "pessoa" | "caso" | "documento" | "fato";

const iconMap: Record<EntityType, React.ElementType> = {
  pessoa: User,
  caso: Users,
  documento: FileText,
  fato: Hash,
};

interface EntityLinkProps {
  type: EntityType;
  name: string;
  href?: string;
  className?: string;
}

export function EntityLink({ type, name, href, className }: EntityLinkProps) {
  const Icon = iconMap[type];
  const content = (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 pr-3 pl-2 py-1 text-[11px] font-medium border-slate-300",
        "hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors rounded-sm",
        className
      )}
    >
      <Icon className="w-3 h-3 text-slate-500" />
      {name}
    </Badge>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex">
        {content}
      </Link>
    );
  }

  return <span className="inline-flex">{content}</span>;
}
