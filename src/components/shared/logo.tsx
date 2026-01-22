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
 * Logo INTELEX Premium
 * 
 * Componente unificado para exibição da logo em diferentes contextos.
 * Integrado com design system v9.0 MANUS
 * 
 * Variantes:
 * - full: Logo completa com texto e subtítulo
 * - icon: Apenas o ícone do escudo
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
    },
    md: {
      icon: 40,
      full: 48,
      centered: 96,
    },
    lg: {
      icon: 48,
      full: 56,
      centered: 128,
    },
    xl: {
      icon: 64,
      full: 80,
      centered: 160,
    },
  };

  const iconSize = sizes[size][variant === "icon" ? "icon" : variant === "centered" ? "centered" : "full"];

  const renderLogo = () => {
    if (variant === "icon") {
      return (
        <div className={cn("sidebar-logo-icon", className)}>
          <Image
            src="/logo-intelex.png"
            alt="INTELEX"
            width={iconSize}
            height={iconSize}
            priority
            className="object-contain"
          />
        </div>
      );
    }

    if (variant === "centered") {
      return (
        <div className={cn("logo-centered", className)}>
          <div className="logo-centered-icon">
            <Image
              src="/logo-intelex.png"
              alt="INTELEX - Defesa Inteligente"
              width={iconSize}
              height={iconSize}
              priority
              className="object-contain"
            />
          </div>
          <div className="logo-centered-text">
            <h1 className="logo-centered-title">INTELEX</h1>
            {showSubtitle && (
              <p className="logo-centered-subtitle">Defesa Inteligente</p>
            )}
          </div>
        </div>
      );
    }

    // variant === "full"
    return (
      <div className={cn("header-logo", className)}>
        <div className="header-logo-icon">
          <Image
            src="/logo-intelex.png"
            alt="INTELEX"
            width={iconSize}
            height={iconSize}
            priority
            className="object-contain"
          />
        </div>
        <div className="header-logo-text">
          <h2 className="header-logo-title">INTELEX</h2>
          {showSubtitle && (
            <p className="header-logo-subtitle">Defesa Inteligente</p>
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
 * Posicionamento no canto superior esquerdo com design premium
 */
interface SidebarLogoProps {
  collapsed?: boolean;
  className?: string;
}

export function SidebarLogo({ collapsed = false, className }: SidebarLogoProps) {
  return (
    <div className={cn("sidebar-logo", collapsed && "sidebar-collapsed", className)}>
      {collapsed ? (
        <Logo 
          variant="icon" 
          size="sm" 
          href="/admin/dashboard"
          showSubtitle={false}
        />
      ) : (
        <div className="flex items-center gap-3">
          <div className="sidebar-logo-icon">
            <Image
              src="/logo-intelex.png"
              alt="INTELEX"
              width={40}
              height={40}
              priority
              className="object-contain"
            />
          </div>
          <div className="sidebar-logo-text">
            <div className="sidebar-logo-title">INTELEX</div>
            <div className="sidebar-logo-subtitle">Defesa Inteligente</div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Logo para Header/Navbar
 * Versão completa com design premium
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
      href="/admin/dashboard"
      className={className}
      showSubtitle={showSubtitle}
    />
  );
}

/**
 * Logo para páginas de autenticação
 * Versão centralizada e grande
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
 * Versão compacta otimizada para telas pequenas
 */
export function MobileLogo({ className }: { className?: string }) {
  return (
    <Link href="/admin/dashboard" className={cn("mobile-logo", className)}>
      <div className="mobile-logo-icon">
        <Image
          src="/logo-intelex.png"
          alt="INTELEX"
          width={32}
          height={32}
          priority
          className="object-contain"
        />
      </div>
      <span className="mobile-logo-text">INTELEX</span>
    </Link>
  );
}

/**
 * Logo Loading
 * Para estados de carregamento
 */
export function LogoLoading({ className }: { className?: string }) {
  return (
    <div className={cn("logo-loading", className)}>
      <Image
        src="/logo-intelex.png"
        alt="Carregando..."
        width={64}
        height={64}
        priority
        className="object-contain"
      />
    </div>
  );
}
