"use client";

import { useState } from "react";
import { SwissCard, SwissCardContent, SwissCardHeader, SwissCardTitle, SwissCardDescription } from "@/components/ui/swiss-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search,
  FileSearch,
  ExternalLink,
  Scale,
  Users,
  FileText,
} from "lucide-react";

export default function BuscaPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = () => {
    if (!searchTerm) return;
    setIsSearching(true);
    setTimeout(() => setIsSearching(false), 1000);
  };

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-6">
      {/* Header - Padrão Swiss */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
          <FileSearch className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Buscar Processos</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Pesquise processos no sistema e nos tribunais
          </p>
        </div>
      </div>

      <SwissCard>
        <SwissCardHeader className="pb-3">
          <SwissCardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" />
            Busca Avançada
          </SwissCardTitle>
          <SwissCardDescription>
            Busque por número do processo, nome do assistido ou CPF
          </SwissCardDescription>
        </SwissCardHeader>
        <SwissCardContent className="p-3 sm:p-4 pt-0 sm:pt-0 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Digite o número do processo, nome ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-9"
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={isSearching} className="h-9">
              {isSearching ? "Buscando..." : "Buscar"}
            </Button>
          </div>

          <div className="grid gap-3 sm:gap-4 sm:grid-cols-3">
            <SwissCard className="cursor-pointer hover:shadow-md transition-shadow border-l-[3px] border-l-blue-500">
              <SwissCardContent className="p-3 sm:p-4 flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Scale className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Processos</p>
                  <p className="text-xs text-muted-foreground">Buscar no sistema</p>
                </div>
              </SwissCardContent>
            </SwissCard>
            <SwissCard className="cursor-pointer hover:shadow-md transition-shadow border-l-[3px] border-l-emerald-500">
              <SwissCardContent className="p-3 sm:p-4 flex items-center gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Assistidos</p>
                  <p className="text-xs text-muted-foreground">Buscar por nome/CPF</p>
                </div>
              </SwissCardContent>
            </SwissCard>
            <SwissCard className="cursor-pointer hover:shadow-md transition-shadow border-l-[3px] border-l-purple-500">
              <SwissCardContent className="p-3 sm:p-4 flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Demandas</p>
                  <p className="text-xs text-muted-foreground">Buscar atos pendentes</p>
                </div>
              </SwissCardContent>
            </SwissCard>
          </div>
        </SwissCardContent>
      </SwissCard>

      <SwissCard>
        <SwissCardHeader className="pb-3">
          <SwissCardTitle className="text-sm sm:text-base">Consultas Externas</SwissCardTitle>
          <SwissCardDescription>
            Acesse os sistemas dos tribunais para consulta
          </SwissCardDescription>
        </SwissCardHeader>
        <SwissCardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
            <a
              href="https://esaj.tjba.jus.br/esaj/portal.do?servico=740000"
              target="_blank"
              rel="noopener noreferrer"
            >
              <SwissCard className="cursor-pointer hover:shadow-md transition-shadow group">
                <SwissCardContent className="p-3 sm:p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <Scale className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">E-SAJ TJBA</p>
                      <p className="text-xs text-muted-foreground">Tribunal de Justiça da Bahia</p>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </SwissCardContent>
              </SwissCard>
            </a>
            <a
              href="https://pje.tjba.jus.br/pje/login.seam"
              target="_blank"
              rel="noopener noreferrer"
            >
              <SwissCard className="cursor-pointer hover:shadow-md transition-shadow group">
                <SwissCardContent className="p-3 sm:p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <Scale className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">PJe TJBA</p>
                      <p className="text-xs text-muted-foreground">Processo Judicial Eletrônico</p>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </SwissCardContent>
              </SwissCard>
            </a>
          </div>
        </SwissCardContent>
      </SwissCard>
    </div>
  );
}
