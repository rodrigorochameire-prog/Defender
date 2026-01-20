"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function SwissCard({
  className,
  ...props
}: React.ComponentProps<typeof Card>) {
  return (
    <Card
      className={cn(
        "rounded-sm border border-slate-200 dark:border-slate-800 shadow-none bg-card",
        className
      )}
      {...props}
    />
  );
}

export function SwissCardHeader({
  className,
  ...props
}: React.ComponentProps<typeof CardHeader>) {
  return (
    <CardHeader
      className={cn("border-b border-slate-200/60 dark:border-slate-800/60", className)}
      {...props}
    />
  );
}

export function SwissCardContent({
  className,
  ...props
}: React.ComponentProps<typeof CardContent>) {
  return <CardContent className={cn("p-4", className)} {...props} />;
}

export function SwissCardTitle({
  className,
  ...props
}: React.ComponentProps<typeof CardTitle>) {
  return <CardTitle className={cn("text-sm font-semibold", className)} {...props} />;
}

export function SwissCardDescription({
  className,
  ...props
}: React.ComponentProps<typeof CardDescription>) {
  return <CardDescription className={cn("text-xs", className)} {...props} />;
}
