"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * SwissCard - Container Padrão "Clean Canvas"
 * 
 * Regra do Minimalismo Institucional:
 * - Fundo SEMPRE branco (bg-white) no light mode
 * - Bordas sutis em stone-200 (nunca pretas)
 * - Sombra muito leve (shadow-sm)
 * - NUNCA use bg-blue-100, bg-red-50 para fundos de cards inteiros
 * - Use cores apenas para status pequenos ou hovers
 */
export function SwissCard({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Card>) {
  return (
    <Card
      className={cn(
        // Fundo sempre branco para criar contraste com bg-stone-50 da página
        "bg-white dark:bg-zinc-900",
        // Borda sutil em stone (nunca preta)
        "border border-stone-200 dark:border-zinc-800",
        // Cantos arredondados e sombra leve
        "rounded-xl shadow-sm",
        // Overflow para garantir que nada vaze
        "overflow-hidden",
        className
      )}
      {...props}
    >
      {children}
    </Card>
  );
}

export function SwissCardHeader({
  className,
  ...props
}: React.ComponentProps<typeof CardHeader>) {
  return (
    <CardHeader
      className={cn("px-5 py-4 border-b border-border/40 space-y-1", className)}
      {...props}
    />
  );
}

export function SwissCardContent({
  className,
  ...props
}: React.ComponentProps<typeof CardContent>) {
  return <CardContent className={cn("p-5", className)} {...props} />;
}

export function SwissCardTitle({
  className,
  ...props
}: React.ComponentProps<typeof CardTitle>) {
  return <CardTitle className={cn("text-base font-semibold tracking-tight text-foreground", className)} {...props} />;
}

export function SwissCardDescription({
  className,
  ...props
}: React.ComponentProps<typeof CardDescription>) {
  return <CardDescription className={cn("text-sm text-muted-foreground leading-relaxed", className)} {...props} />;
}
