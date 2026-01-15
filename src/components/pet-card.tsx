"use client";

import Link from "next/link";
import { BreedIcon } from "./breed-icons";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { 
  CreditCard, 
  ArrowRight, 
  FileText, 
  UtensilsCrossed,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Check,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface PetCardProps {
  pet: {
    id: number;
    name: string;
    breed?: string | null;
    photoUrl?: string | null;
    weight?: number | null;
    birthDate?: Date | string | null;
    credits: number;
    approvalStatus?: string;
    foodStockGrams?: number | null;
    foodAmount?: number | null;
  };
  variant?: "default" | "compact" | "minimal";
  showActions?: boolean;
  showCreditsBar?: boolean;
  maxCredits?: number;
  href?: string;
  onViewDetails?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onApprove?: () => void;
  onAddCredits?: (amount: number) => void;
  className?: string;
}

// Calcula idade a partir da data de nascimento
function calculateAge(birthDate: Date | string | null | undefined): string {
  if (!birthDate) return "";
  const birth = new Date(birthDate);
  const now = new Date();
  const years = now.getFullYear() - birth.getFullYear();
  const months = now.getMonth() - birth.getMonth();
  
  if (years > 0) {
    return `${years}a`;
  } else if (months > 0) {
    return `${months}m`;
  }
  return "";
}

// Formata peso
function formatWeight(weight: number | null | undefined): string {
  if (!weight) return "0.0kg";
  // Peso pode estar em gramas ou kg dependendo do schema
  const kg = weight > 100 ? weight / 1000 : weight;
  return `${kg.toFixed(1)}kg`;
}

export function PetCard({
  pet,
  variant = "default",
  showActions = true,
  showCreditsBar = true,
  maxCredits = 30,
  href,
  onViewDetails,
  onEdit,
  onDelete,
  onApprove,
  onAddCredits,
  className,
}: PetCardProps) {
  const age = calculateAge(pet.birthDate);
  const weight = formatWeight(pet.weight);
  const creditsPercent = Math.min((pet.credits / maxCredits) * 100, 100);
  const hasLowCredits = pet.credits <= 0;
  const hasLowStock = pet.foodStockGrams !== null && 
                      pet.foodAmount !== null && 
                      pet.foodStockGrams < (pet.foodAmount * 3);

  const cardContent = (
    <div className={cn(
      "p-4 rounded-xl bg-card border transition-all duration-200",
      "hover:shadow-md hover:-translate-y-0.5",
      hasLowCredits && "border-red-200 dark:border-red-900",
      className
    )}>
      {/* Header: Avatar + Info */}
      <div className="flex items-start gap-3">
        {/* Avatar Container - Limpo, sem ícones sobrepostos */}
        <div className="flex-shrink-0">
          <BreedIcon 
            breed={pet.breed} 
            size={variant === "compact" ? 48 : 56} 
            className="rounded-xl"
          />
        </div>

        {/* Pet Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{pet.name}</h3>
          <p className="text-sm text-muted-foreground truncate">
            {pet.breed || "Sem raça definida"}
          </p>
          {variant !== "minimal" && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {weight} {age && `• ${age}`}
            </p>
          )}
        </div>

        {/* Actions Dropdown (apenas para admin) */}
        {showActions && (onViewDetails || onEdit || onDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onViewDetails && (
                <DropdownMenuItem onClick={onViewDetails}>
                  <Eye className="h-4 w-4 mr-2" /> Ver Detalhes
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-2" /> Editar
                </DropdownMenuItem>
              )}
              {onAddCredits && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onAddCredits(5)}>
                    <CreditCard className="h-4 w-4 mr-2" /> +5 Créditos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAddCredits(10)}>
                    <CreditCard className="h-4 w-4 mr-2" /> +10 Créditos
                  </DropdownMenuItem>
                </>
              )}
              {onApprove && pet.approvalStatus !== "approved" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onApprove}>
                    <Check className="h-4 w-4 mr-2 text-green-500" /> Aprovar
                  </DropdownMenuItem>
                </>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onDelete} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" /> Excluir
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Credits Section */}
      {showCreditsBar && variant !== "minimal" && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground">Créditos</span>
            {hasLowCredits ? (
              <span className="text-xs font-medium text-red-500">Sem créditos!</span>
            ) : (
              <span className="text-xs font-medium text-foreground">{pet.credits}</span>
            )}
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all",
                hasLowCredits ? "bg-red-500" : 
                pet.credits <= 3 ? "bg-amber-500" : "bg-green-500"
              )}
              style={{ width: `${creditsPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Quick Actions Footer */}
      {variant === "default" && (
        <div className="mt-4 pt-3 border-t flex items-center justify-between">
          <div className="flex items-center gap-1">
            {/* Status indicators - ícones ao lado, não sobrepostos */}
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Check-in/Check-out">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Documentos">
              <FileText className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Alimentação">
              <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
          
          {href ? (
            <Link 
              href={href}
              className="text-sm font-medium text-primary flex items-center gap-1 hover:underline"
            >
              Detalhes
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : onViewDetails ? (
            <button 
              onClick={onViewDetails}
              className="text-sm font-medium text-primary flex items-center gap-1 hover:underline"
            >
              Detalhes
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      )}

      {/* Compact variant - just status badge */}
      {variant === "compact" && pet.approvalStatus && (
        <div className="mt-3 flex items-center justify-between">
          <Badge className={cn(
            pet.approvalStatus === "approved" ? "badge-success" :
            pet.approvalStatus === "pending" ? "badge-warning" : "badge-error"
          )}>
            {pet.approvalStatus === "approved" ? "Aprovado" :
             pet.approvalStatus === "pending" ? "Pendente" : "Rejeitado"}
          </Badge>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <CreditCard className="h-3.5 w-3.5" />
            <span className="font-medium">{pet.credits}</span>
          </div>
        </div>
      )}
    </div>
  );

  // Se tiver href e não for variante com dropdown actions, wrapa em Link
  if (href && !showActions) {
    return (
      <Link href={href} className="block group">
        {cardContent}
      </Link>
    );
  }

  return <div className="group">{cardContent}</div>;
}

// Componente auxiliar para Avatar de Pet padronizado (sem card, apenas o avatar)
interface PetAvatarProps {
  photoUrl?: string | null;
  breed?: string | null;
  name?: string;
  size?: number;
  className?: string;
}

export function PetAvatarStandard({ photoUrl, breed, name, size = 48, className }: PetAvatarProps) {
  if (photoUrl) {
    return (
      <div 
        className={cn("relative rounded-xl overflow-hidden flex-shrink-0 bg-muted", className)} 
        style={{ width: size, height: size }}
      >
        <img
          src={photoUrl}
          alt={name || 'Pet'}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return <BreedIcon breed={breed} size={size} className={className} />;
}
