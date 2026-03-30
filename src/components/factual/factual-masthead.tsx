"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bookmark } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const playfairImport = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap');`;

interface FactualMastheadProps {
  edicaoData?: string;
  favoritosCount?: number;
  onOpenFavoritos?: () => void;
}

export function FactualMasthead({
  edicaoData,
  favoritosCount = 0,
  onOpenFavoritos,
}: FactualMastheadProps) {
  const dataEdicao = edicaoData ? new Date(edicaoData) : new Date();
  const dataFormatada = format(dataEdicao, "EEEE, d 'de' MMMM 'de' yyyy", {
    locale: ptBR,
  });
  const edicaoNumero = format(dataEdicao, "ddMMyy");

  return (
    <>
      <style>{playfairImport}</style>
      <header
        className={cn(
          "relative w-full bg-[#1a1a2e] text-white",
          "dark:bg-zinc-950 dark:border-b dark:border-border"
        )}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-1.5 text-xs text-zinc-400 border-b border-white/10">
          <span className="capitalize">{dataFormatada}</span>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline">
              Edi&ccedil;&atilde;o N&ordm; {edicaoNumero}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenFavoritos}
              className="relative h-7 gap-1.5 text-zinc-300 hover:text-white hover:bg-white/10"
            >
              <Bookmark className="h-3.5 w-3.5" />
              <span className="text-xs">Salvos</span>
              {favoritosCount > 0 && (
                <Badge className="ml-0.5 h-4 min-w-4 items-center justify-center rounded-full border-0 bg-amber-500 px-1 text-[10px] font-bold text-white">
                  {favoritosCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {/* Main masthead */}
        <div className="flex flex-col items-center py-5 px-4">
          <div className="w-full max-w-2xl text-center">
            {/* Decorative rule */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-white/20" />
              <div className="h-1 w-1 rounded-full bg-amber-400" />
              <div className="flex-1 h-px bg-white/20" />
            </div>

            <h1
              className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight leading-none"
              style={{
                fontFamily:
                  "'Playfair Display', Georgia, 'Times New Roman', serif",
              }}
            >
              Di&aacute;rio da Bahia
            </h1>

            <p className="mt-2 text-xs sm:text-sm tracking-[0.25em] uppercase text-zinc-400">
              Camaçari &middot; Salvador &middot; Bahia &middot; Brasil &middot; Mundo
            </p>

            {/* Decorative rule */}
            <div className="flex items-center gap-3 mt-3">
              <div className="flex-1 h-px bg-white/20" />
              <div className="h-1 w-1 rounded-full bg-amber-400" />
              <div className="flex-1 h-px bg-white/20" />
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
