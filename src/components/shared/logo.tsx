"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "full" | "icon" | "centered";
  size?: "sm" | "md" | "lg" | "xl";
  href?: string;
  className?: string;
  showSubtitle?: boolean;
}

/**
 * Logo OMBUDS Premium
 * 
 * Componente unificado para exibição da logo em diferentes contextos.
 * Suporta modo claro e escuro automaticamente.
 * 
 * Variantes:
 * - full: Logo completa com texto e subtítulo
 * - icon: Apenas o ícone
 * - centered: Logo centralizada para landing pages
 * 
 * Tamanhos:
 * - sm: Pequeno (mobile, sidebar collapsed)
 * - md: Médio (sidebar expandida)
 * - lg: Grande (header, auth pages)
 * - xl: Extra grande (landing page hero)
 */
export function Logo({ 
  variant = "full", 
  size = "md", 
  href,
  className,
  showSubtitle = true
}: LogoProps) {
  const sizes = {
    sm: {
      icon: 32,
      full: 40,
      centered: 64,
      text: "text-lg",
      subtitle: "text-[10px]",
    },
    md: {
      icon: 40,
      full: 48,
      centered: 96,
      text: "text-xl",
      subtitle: "text-xs",
    },
    lg: {
      icon: 48,
      full: 56,
      centered: 128,
      text: "text-2xl",
      subtitle: "text-sm",
    },
    xl: {
      icon: 64,
      full: 80,
      centered: 160,
      text: "text-4xl",
      subtitle: "text-base",
    },
  };

  const sizeConfig = sizes[size];
  const iconSize = sizeConfig[variant === "icon" ? "icon" : variant === "centered" ? "centered" : "full"];

  // Componente de imagem com suporte a tema
  const LogoImage = ({ width, height }: { width: number; height: number }) => (
    <div className="relative" style={{ width, height }}>
      {/* Logo modo claro */}
      <Image
        src="/logo-light.png"
        alt="OMBUDS"
        width={width}
        height={height}
        priority
        className="absolute inset-0 object-contain dark:hidden"
      />
      {/* Logo modo escuro */}
      <Image
        src="/logo-dark.png"
        alt="OMBUDS"
        width={width}
        height={height}
        priority
        className="absolute inset-0 object-contain hidden dark:block"
      />
    </div>
  );

  const renderLogo = () => {
    if (variant === "icon") {
      return (
        <div className={cn("flex items-center justify-center", className)}>
          <LogoImage width={iconSize} height={iconSize} />
        </div>
      );
    }

    if (variant === "centered") {
      return (
        <div className={cn("flex flex-col items-center gap-4", className)}>
          <LogoImage width={iconSize} height={iconSize} />
          <div className="text-center">
            <h1 className={cn("font-bold tracking-tight text-zinc-900 dark:text-zinc-100", sizeConfig.text)}>
              OMBUDS
            </h1>
            {showSubtitle && (
              <p className="text-[10px] font-light tracking-[0.2em] uppercase text-zinc-400 dark:text-zinc-500 mt-1">
                GESTÃO PARA DEFESA CRIMINAL
              </p>
            )}
          </div>
        </div>
      );
    }

    // variant === "full"
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <LogoImage width={iconSize} height={iconSize} />
        <div>
          <h2 className={cn("font-bold tracking-tight text-zinc-900 dark:text-zinc-100", sizeConfig.text)}>
            OMBUDS
          </h2>
          {showSubtitle && (
            <p className="text-[9px] font-light tracking-[0.15em] uppercase text-zinc-400 dark:text-zinc-500">
              GESTÃO PARA DEFESA CRIMINAL
            </p>
          )}
        </div>
      </div>
    );
  };

  const logoElement = renderLogo();

  if (href) {
    return (
      <Link href={href} className="inline-block transition-opacity hover:opacity-90">
        {logoElement}
      </Link>
    );
  }

  return logoElement;
}

/**
 * Logo para Sidebar
 * Adapta automaticamente entre icon e full baseado no estado da sidebar
 * Agora usa tema escuro fixo para harmonizar com sidebar escura
 */
interface SidebarLogoProps {
  collapsed?: boolean;
  className?: string;
}

export function SidebarLogo({ collapsed = false, className }: SidebarLogoProps) {
  return (
    <div className={cn("sidebar-logo", collapsed && "sidebar-collapsed", className)}>
      {/* Forçar tema escuro na sidebar - usar logo-dark sempre */}
      <Link href="/admin" className="inline-block transition-opacity hover:opacity-90">
        <div className="flex items-center gap-3">
          <div className="relative" style={{ width: collapsed ? 32 : 48, height: collapsed ? 32 : 48 }}>
            <Image
              src="/logo-dark.png"
              alt="OMBUDS"
              width={collapsed ? 32 : 48}
              height={collapsed ? 32 : 48}
              priority
              className="object-contain"
            />
          </div>
          {!collapsed && (
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">
                OMBUDS
              </h2>
              <p className="text-[9px] font-light tracking-[0.15em] uppercase text-zinc-400">
                GESTÃO PARA DEFESA CRIMINAL
              </p>
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}

/**
 * Logo para Header/Navbar
 */
interface HeaderLogoProps {
  className?: string;
  showSubtitle?: boolean;
}

export function HeaderLogo({ className, showSubtitle = true }: HeaderLogoProps) {
  return (
    <Logo 
      variant="full" 
      size="lg" 
      href="/admin"
      className={className}
      showSubtitle={showSubtitle}
    />
  );
}

/**
 * Logo para páginas de autenticação
 */
export function AuthLogo({ className }: { className?: string }) {
  return (
    <Logo 
      variant="centered" 
      size="xl" 
      href="/"
      className={className}
      showSubtitle={true}
    />
  );
}

/**
 * Logo para Mobile
 */
export function MobileLogo({ className }: { className?: string }) {
  return (
    <Logo 
      variant="full" 
      size="sm" 
      href="/admin"
      className={className}
      showSubtitle={false}
    />
  );
}

/**
 * Logo Loading
 */
export function LogoLoading({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center animate-pulse", className)}>
      <Logo variant="icon" size="lg" />
    </div>
  );
}
