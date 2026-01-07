import { Badge } from "./ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Clock, User } from "lucide-react";

interface RecentChangeIndicatorProps {
  changes: Array<{
    fieldName: string;
    oldValue: string | null;
    newValue: string | null;
    changedByRole: "admin" | "tutor";
    createdAt: Date | string;
  }>;
  resourceType: "medication" | "vaccine" | "food" | "preventive";
}

export function RecentChangeIndicator({ changes, resourceType }: RecentChangeIndicatorProps) {
  if (!changes || changes.length === 0) return null;

  // Get most recent change
  const recentChange = changes[0];
  const changeDate = new Date(recentChange.createdAt);
  const now = new Date();
  const diffMs = now.getTime() - changeDate.getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  // Only show if changed by admin in last 7 days
  if (recentChange.changedByRole !== "admin" || diffDays > 7) return null;

  const timeAgo = diffHours < 24 
    ? `há ${diffHours} hora${diffHours !== 1 ? 's' : ''}`
    : `há ${diffDays} dia${diffDays !== 1 ? 's' : ''}`;

  const getResourceLabel = () => {
    const labels = {
      medication: "medicamento",
      vaccine: "vacina",
      food: "alimentação",
      preventive: "preventivo",
    };
    return labels[resourceType] || resourceType;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 cursor-help">
            <User className="h-3 w-3 mr-1" />
            Atualizado pelo admin {timeAgo}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2">
            <p className="font-medium text-sm">
              Alteração recente no {getResourceLabel()}
            </p>
            <div className="text-xs space-y-1">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                {changeDate.toLocaleString('pt-BR')}
              </div>
              {recentChange.oldValue && recentChange.newValue && (
                <div className="mt-2 p-2 bg-muted rounded text-xs">
                  <div className="flex items-center gap-2">
                    <span className="line-through text-muted-foreground">{recentChange.oldValue}</span>
                    <span>→</span>
                    <span className="text-green-600 font-medium">{recentChange.newValue}</span>
                  </div>
                </div>
              )}
              {!recentChange.oldValue && recentChange.newValue && (
                <div className="mt-2 p-2 bg-muted rounded text-xs">
                  <span className="text-green-600 font-medium">{recentChange.newValue}</span>
                </div>
              )}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
