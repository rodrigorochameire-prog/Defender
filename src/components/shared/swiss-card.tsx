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
        "rounded-lg border border-border shadow-sm bg-card transition-shadow duration-200 hover:shadow-md",
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
