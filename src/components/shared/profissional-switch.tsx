"use client";

import { useProfissional, PROFISSIONAIS_CONFIG, type ProfissionalId } from "@/contexts/profissional-context";
import { cn } from "@/lib/utils";
import { Settings } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// ============================================
// SWITCH DE PROFISSIONAL - Versão Simplificada
// ============================================

interface ProfissionalSwitchProps {
  variant?: "full" | "compact" | "minimal";
  showEscalaLink?: boolean;
  className?: string;
}

export function ProfissionalSwitch({
  variant = "full",
  showEscalaLink = true,
  className,
}: ProfissionalSwitchProps) {
  const {
    profissionalAtivo,
    setProfissionalAtivo,
    atribuicaoAtual,
  } = useProfissional();

  const profissionalAtivoId = profissionalAtivo.id as ProfissionalId;

  // Profissionais do grupo Júri/EP/VVD
  const grupoJuri = [1, 2, 0] as ProfissionalId[];

  // Labels de atribuição
  const atribuicaoLabel = atribuicaoAtual === "JURI_EP" 
    ? "Júri + Execução Penal" 
    : atribuicaoAtual === "VVD"
      ? "Violência Doméstica"
      : "Todas as atribuições";

  if (variant === "minimal") {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        {/* Rodrigo - sempre preto */}
        <button
          onClick={() => setProfissionalAtivo(1)}
          className={cn(
            "w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold transition-all bg-zinc-800 dark:bg-zinc-700 text-white",
            profissionalAtivoId === 1 && "ring-2 ring-emerald-500"
          )}
          title="Dr. Rodrigo"
        >
          R
        </button>
        {/* Juliane - sempre branco */}
        <button
          onClick={() => setProfissionalAtivo(2)}
          className={cn(
            "w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold transition-all bg-white text-zinc-800 border border-zinc-700",
            profissionalAtivoId === 2 && "ring-2 ring-emerald-500"
          )}
          title="Dra. Juliane"
        >
          J
        </button>
        {/* Geral - cinza */}
        <button
          onClick={() => setProfissionalAtivo(0)}
          className={cn(
            "w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold transition-all bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400",
            profissionalAtivoId === 0 && "ring-2 ring-emerald-500"
          )}
          title="Geral"
        >
          G
        </button>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        {/* Rodrigo - sempre preto */}
        <button
          onClick={() => setProfissionalAtivo(1)}
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-all bg-zinc-800 dark:bg-zinc-700 text-white",
            profissionalAtivoId === 1 && "ring-2 ring-emerald-500 ring-offset-1"
          )}
          title="Dr. Rodrigo"
        >
          R
        </button>
        {/* Juliane - sempre branco */}
        <button
          onClick={() => setProfissionalAtivo(2)}
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-all bg-white text-zinc-800 border-2 border-zinc-700",
            profissionalAtivoId === 2 && "ring-2 ring-emerald-500 ring-offset-1"
          )}
          title="Dra. Juliane"
        >
          J
        </button>
        {/* Geral - cinza */}
        <button
          onClick={() => setProfissionalAtivo(0)}
          className={cn(
            "px-2.5 h-8 rounded-lg flex items-center justify-center text-xs font-medium transition-all bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400",
            profissionalAtivoId === 0 && "ring-2 ring-emerald-500 ring-offset-1"
          )}
          title="Geral"
        >
          Geral
        </button>
      </div>
    );
  }

  // Variant = "full"
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      {/* Info do profissional */}
      <div className="flex items-center gap-3">
        {/* Badge estilo R/J */}
        {profissionalAtivoId === 1 ? (
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-base bg-zinc-800 dark:bg-zinc-600 shadow-md">
            R
          </div>
        ) : profissionalAtivoId === 2 ? (
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-zinc-900 font-bold text-base bg-white border-2 border-zinc-700 dark:border-zinc-400 shadow-md">
            J
          </div>
        ) : (
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-zinc-600 dark:text-zinc-400 font-bold text-[10px] bg-zinc-200 dark:bg-zinc-700 shadow-md">
            Geral
          </div>
        )}
        <div>
          <p className="font-semibold text-zinc-900 dark:text-zinc-100">
            {profissionalAtivo.nome}
          </p>
          <p className="text-xs text-zinc-500">
            {profissionalAtivoId === 0 ? "Visão geral de todos" : atribuicaoLabel}
          </p>
        </div>
      </div>

      {/* Switch + Config */}
      <div className="flex items-center gap-3">
        {/* Botões de switch - Cores fixas + seleção verde */}
        <div className="flex items-center gap-2">
          {/* Rodrigo - sempre preto */}
          <button
            onClick={() => setProfissionalAtivo(1)}
            className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm transition-all bg-zinc-800 dark:bg-zinc-700 text-white",
              profissionalAtivoId === 1 && "ring-2 ring-emerald-500 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900"
            )}
            title="Dr. Rodrigo"
          >
            R
          </button>
          
          {/* Juliane - sempre branco com borda */}
          <button
            onClick={() => setProfissionalAtivo(2)}
            className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm transition-all bg-white text-zinc-800 border-2 border-zinc-700 dark:border-zinc-500",
              profissionalAtivoId === 2 && "ring-2 ring-emerald-500 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900"
            )}
            title="Dra. Juliane"
          >
            J
          </button>
          
          {/* Geral - cinza */}
          <button
            onClick={() => setProfissionalAtivo(0)}
            className={cn(
              "px-3 h-9 rounded-lg flex items-center justify-center font-medium text-sm transition-all bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400",
              profissionalAtivoId === 0 && "ring-2 ring-emerald-500 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900"
            )}
            title="Visão Geral"
          >
            Geral
          </button>
        </div>

        {/* Link para configurações de escala */}
        {showEscalaLink && (
          <Link href="/admin/configuracoes/escala">
            <Button variant="outline" size="sm" className="gap-2 text-zinc-500 hover:text-zinc-700">
              <Settings className="w-4 h-4" />
              Escala
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

// ============================================
// COMPONENTE DE LOGO COM TEMA
// ============================================

export function OmbudsLogo({ 
  size = "md", 
  showText = true,
  className 
}: { 
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}) {
  const sizes = {
    sm: { logo: "w-8 h-8", text: "text-lg" },
    md: { logo: "w-10 h-10", text: "text-xl" },
    lg: { logo: "w-14 h-14", text: "text-2xl" },
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className={cn("relative", sizes[size].logo)}>
        <img 
          src="/logo-light.png" 
          alt="OMBUDS" 
          className="absolute inset-0 w-full h-full object-contain dark:hidden"
        />
        <img 
          src="/logo-dark.png" 
          alt="OMBUDS" 
          className="absolute inset-0 w-full h-full object-contain hidden dark:block"
        />
      </div>
      
      {showText && (
        <span className={cn(
          "font-bold tracking-tight text-zinc-900 dark:text-zinc-100",
          sizes[size].text
        )}>
          OMBUDS
        </span>
      )}
    </div>
  );
}
