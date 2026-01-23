"use client";

import { useState } from "react";
import { 
  AlertCircle, CheckCircle2, Clock, Send, Archive, 
  Lock, MoreHorizontal, FileText, Calendar, Search 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SwissCard } from "@/components/ui/swiss-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

// --- CONFIGURAÇÃO DE STATUS (A Lógica Gamificada) ---
const STATUS_MAP: Record<string, any> = {
  "1 - Urgente": { label: "URGENTE", color: "bg-red-50 text-red-700 border-red-200", icon: AlertCircle },
  "2 - Elaborar": { label: "A FAZER", color: "bg-amber-50 text-amber-700 border-amber-200", icon: FileText },
  "3 - Revisar": { label: "REVISAR", color: "bg-yellow-50 text-yellow-700 border-yellow-200", icon: Search },
  "4 - Assinar": { label: "ASSINAR", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: Send },
  "5 - Protocolar": { label: "PROTOCOLAR", color: "bg-orange-50 text-orange-700 border-orange-200", icon: Send },
  "6 - Monitorar": { label: "MONITORAR", color: "bg-blue-50 text-blue-700 border-blue-200", icon: Clock },
  "7 - Concluido": { label: "CONCLUÍDO", color: "bg-stone-100 text-stone-500 border-stone-200 decoration-stone-400 line-through", icon: CheckCircle2 },
};

// Dados de Exemplo (Para você ver funcionando já)
const MOCK_DATA = [
  { id: 1, status: "1 - Urgente", preso: true, data: "12/01", assistido: "Carlos Alberto Silva", autos: "0004567-89.2024.8.05.0000", ato: "Habeas Corpus", providencia: "Liminar indeferida. Preparar recurso ordinário." },
  { id: 2, status: "5 - Protocolar", preso: false, data: "10/01", assistido: "Maria de Lourdes", autos: "8001234-56.2023.8.05.0000", ato: "Alegações Finais", providencia: "Peça pronta no drive. Falta apenas juntar." },
  { id: 3, status: "2 - Elaborar", preso: true, data: "14/01", assistido: "José Santos", autos: "0009999-11.2024.8.05.0000", ato: "Resposta à Acusação", providencia: "Verificar vídeos da audiência de custódia." },
  { id: 4, status: "7 - Concluido", preso: false, data: "05/01", assistido: "Ana Paula Souza", autos: "1234567-00.2022.8.05.0000", ato: "Relaxamento", providencia: "Alvará expedido." },
];

export function DemandasTable() {
  const [filter, setFilter] = useState("");

  // Ordenar: Status (Crescente) -> Data (Recente)
  const sortedData = [...MOCK_DATA].sort((a, b) => a.status.localeCompare(b.status));

  return (
    <div className="space-y-4">
      {/* Barra de Ferramentas (Filtro Rápido) */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-400" />
          <Input 
            placeholder="Filtrar por nome, autos ou ato..." 
            className="pl-9 bg-white border-stone-200"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
           <Button variant="outline" size="sm" className="text-stone-600 border-stone-200">
             <Clock className="w-4 h-4 mr-2" /> Prazos Fatais
           </Button>
           <Button variant="default" size="sm" className="bg-primary hover:bg-emerald-800 text-white shadow-sm">
             + Nova Demanda
           </Button>
        </div>
      </div>

      {/* A Tabela "Swiss Style" */}
      <SwissCard className="divide-y divide-stone-100">
        {/* Cabeçalho */}
        <div className="grid grid-cols-12 gap-4 p-3 bg-stone-50/80 text-[11px] font-semibold text-stone-500 uppercase tracking-wider border-b border-stone-100">
          <div className="col-span-2">Status</div>
          <div className="col-span-4">Assistido / Autos</div>
          <div className="col-span-2">Ato / Prazo</div>
          <div className="col-span-3">Providências</div>
          <div className="col-span-1 text-right">Ações</div>
        </div>

        {/* Linhas */}
        {sortedData.map((item) => {
          const config = STATUS_MAP[item.status] || STATUS_MAP["2 - Elaborar"];
          const StatusIcon = config.icon;

          return (
            <div 
              key={item.id} 
              className="group grid grid-cols-12 gap-4 p-3 items-center hover:bg-stone-50 transition-colors duration-200 text-sm"
            >
              {/* 1. Status + Data */}
              <div className="col-span-2 flex flex-col gap-1.5 items-start">
                <Badge variant="outline" className={cn("px-2 py-0.5 text-[10px] font-bold shadow-none rounded-md", config.color)}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {config.label}
                </Badge>
                <span className="text-[10px] text-stone-400 font-mono flex items-center gap-1 pl-1">
                  <Calendar className="w-3 h-3" /> {item.data}
                </span>
              </div>

              {/* 2. Assistido + Cadeado + Autos */}
              <div className="col-span-4 flex flex-col justify-center">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-stone-800 truncate">{item.assistido}</span>
                  {/* O Cadeado Minimalista */}
                  {item.preso && (
                    <div className="flex items-center justify-center w-5 h-5 rounded bg-red-50 text-red-600 border border-red-100 shrink-0" title="Réu Preso">
                      <Lock className="w-3 h-3" />
                    </div>
                  )}
                </div>
                <span className="text-xs text-stone-500 font-mono mt-0.5 select-all hover:text-stone-900 transition-colors cursor-pointer">
                  {item.autos}
                </span>
              </div>

              {/* 3. Ato (O que é) */}
              <div className="col-span-2 text-stone-700 font-medium leading-snug">
                {item.ato}
              </div>

              {/* 4. Providências (Editável mentalmente) */}
              <div className="col-span-3 text-stone-500 text-xs leading-relaxed line-clamp-2">
                {item.providencia}
              </div>

              {/* 5. Ações (Menu) */}
              <div className="col-span-1 flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-400 hover:text-stone-900">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem>Editar Detalhes</DropdownMenuItem>
                    <DropdownMenuItem>Ver Autos (Integração)</DropdownMenuItem>
                    <DropdownMenuItem className="text-emerald-600">Marcar Concluído</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}
      </SwissCard>
    </div>
  );
}
