"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search,
  FileSearch,
  ExternalLink,
  Scale,
  Users,
  FileText,
} from "lucide-react";
import Link from "next/link";

export default function BuscaPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = () => {
    if (!searchTerm) return;
    setIsSearching(true);
    // Simular busca
    setTimeout(() => setIsSearching(false), 1000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Buscar Processos</h1>
        <p className="text-muted-foreground mt-1">
          Pesquise processos no sistema e nos tribunais
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSearch className="h-5 w-5" />
            Busca Avançada
          </CardTitle>
          <CardDescription>
            Busque por número do processo, nome do assistido ou CPF
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Digite o número do processo, nome ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={isSearching}>
              {isSearching ? "Buscando..." : "Buscar"}
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Scale className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Processos</p>
                  <p className="text-sm text-muted-foreground">Buscar no sistema</p>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Assistidos</p>
                  <p className="text-sm text-muted-foreground">Buscar por nome/CPF</p>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <FileText className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium">Demandas</p>
                  <p className="text-sm text-muted-foreground">Buscar atos pendentes</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Consultas Externas</CardTitle>
          <CardDescription>
            Acesse os sistemas dos tribunais para consulta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <a
              href="https://esaj.tjba.jus.br/esaj/portal.do?servico=740000"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <Scale className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">E-SAJ TJBA</p>
                      <p className="text-sm text-muted-foreground">Tribunal de Justiça da Bahia</p>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </a>
            <a
              href="https://pje.tjba.jus.br/pje/login.seam"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <Scale className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">PJe TJBA</p>
                      <p className="text-sm text-muted-foreground">Processo Judicial Eletrônico</p>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
