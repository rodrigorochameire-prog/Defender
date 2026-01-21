"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "full" | "icon";
  size?: "sm" | "md" | "lg";
  href?: string;
  className?: string;
}

/**
 * Logo INTELEX
 * 
 * Componente unificado para exibição da logo em diferentes contextos.
 * 
 * Variantes:
 * - full: Logo completa com texto "INTELEX"
 * - icon: Apenas o ícone do escudo com X
 * 
 * Tamanhos:
 * - sm: Pequeno (sidebar collapsed, mobile)
 * - md: Médio (sidebar expandida)
 * - lg: Grande (landing page, auth pages)
 */
export function Logo({ 
  variant = "full", 
  size = "md", 
  href = "/admin", 
  className 
}: LogoProps) {
  const sizes = {
    sm: {
      full: { width: 120, height: 28 },
      icon: { width: 32, height: 32 },
    },
    md: {
      full: { width: 160, height: 37 },
      icon: { width: 40, height: 40 },
    },
    lg: {
      full: { width: 200, height: 46 },
      icon: { width: 56, height: 56 },
    },
  };

  const dimensions = sizes[size][variant];
  const logoSrc = variant === "full" ? "/logo.svg" : "/logo-icon.svg";

  const logoElement = (
    <div className={cn("flex items-center justify-center", className)}>
      <Image
        src={logoSrc}
        alt="INTELEX - Defensoria Inteligente"
        width={dimensions.width}
        height={dimensions.height}
        priority
        className="object-contain"
      />
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block">
        {logoElement}
      </Link>
    );
  }

  return logoElement;
}

/**
 * Logo para Sidebar
 * Adapta automaticamente entre icon e full baseado no estado da sidebar
 */
interface SidebarLogoProps {
  collapsed?: boolean;
  className?: string;
}

export function SidebarLogo({ collapsed = false, className }: SidebarLogoProps) {
  return (
    <div className={cn(
      "flex items-center justify-center py-6 border-b border-border/60",
      className
    )}>
      <Logo 
        variant={collapsed ? "icon" : "full"} 
        size="md" 
        href="/admin/dashboard"
      />
    </div>
  );
}

/**
 * Logo para páginas de autenticação
 */
export function AuthLogo({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <Logo variant="full" size="lg" href="/" />
      <p className="text-sm text-muted-foreground uppercase tracking-wider font-medium">
        Defensoria Inteligente
      </p>
    </div>
  );
}
