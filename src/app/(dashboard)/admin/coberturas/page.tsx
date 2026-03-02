"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeftRight,
  Plus,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { trpc } from "@/lib/trpc/client";
import { CoberturaModal } from "@/components/cowork/cobertura-modal";

// ============================================
// TIPOS
// ============================================

interface Cobertura {
  id: number;
  afastado: { nome: string; iniciais: string };
  cobrindo: { nome: string; iniciais: string };
  motivo: string;
  dataInicio: Date;
  dataFim: Date;
  status: "ativa" | "futura" | "encerrada";
}

// ============================================
// MOCK DATA
// ============================================

const MOCK_COBERTURAS: Cobertura[] = [
  {
    id: 1,
    afastado: { nome: "Pedro Alves", iniciais: "PA" },
    cobrindo: { nome: "Maria Santos", iniciais: "MS" },
    motivo: "Ferias",
    dataInicio: new Date(2026, 1, 24),
    dataFim: new Date(2026, 2, 3),
    status: "ativa",
  },
  {
    id: 2,
    afastado: { nome: "Maria Santos", iniciais: "MS" },
    cobrindo: { nome: "Rodrigo Meire", iniciais: "RM" },
    motivo: "Licenca medica",
    dataInicio: new Date(2026, 2, 10),
    dataFim: new Date(2026, 2, 14),
    status: "futura",
  },
];

// ============================================
// COMPONENTES
// ============================================

function CoberturaCard({ cobertura }: { cobertura: Cobertura }) {
  const statusConfig: Record<string, { label: string; color: string }> = {
    ativa: { label: "Ativa", color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" },
    futura: { label: "Futura", color: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400" },
    encerrada: { label: "Encerrada", color: "bg-zinc-100 dark:bg-zinc-800 text-zinc-500" },
  };

  const st = statusConfig[cobertura.status];

  return (
    <Card className="bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800/80 rounded-xl overflow-hidden hover:border-emerald-200/50 dark:hover:border-emerald-800/30 transition-all duration-200">
      <div className="p-4">
        {/* Status + Motivo */}
        <div className="flex items-center justify-between mb-3">
          <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", st.color)}>
            {st.label}
          </span>
          <span className="text-[10px] text-zinc-400">{cobertura.motivo}</span>
        </div>

        {/* Afastado → Cobrindo */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-2 flex-1">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-medium">
                {cobertura.afastado.iniciais}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Afastado</p>
              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{cobertura.afastado.nome}</p>
            </div>
          </div>

          <ArrowRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600 flex-shrink-0" />

          <div className="flex items-center gap-2 flex-1">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium">
                {cobertura.cobrindo.iniciais}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Cobrindo</p>
              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{cobertura.cobrindo.nome}</p>
            </div>
          </div>
        </div>

        {/* Período */}
        <div className="flex items-center gap-2 text-[10px] text-zinc-400 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <Calendar className="w-3 h-3" />
          <span>
            {format(cobertura.dataInicio, "dd/MM/yyyy", { locale: ptBR })} — {format(cobertura.dataFim, "dd/MM/yyyy", { locale: ptBR })}
          </span>
        </div>
      </div>
    </Card>
  );
}

// ============================================
// PAGE
// ============================================

export default function CoberturasPage() {
  const [coberturaModalOpen, setCoberturaModalOpen] = useState(false);

  const ativas = MOCK_COBERTURAS.filter(c => c.status === "ativa");
  const futuras = MOCK_COBERTURAS.filter(c => c.status === "futura");

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
      {/* Header */}
      <div className="px-4 md:px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center shadow-lg">
              <ArrowLeftRight className="w-5 h-5 text-white dark:text-zinc-900" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight font-serif">Coberturas</h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Afastamentos e substituicoes</p>
            </div>
          </div>

          <Button
            size="sm"
            className="h-8 px-3 bg-zinc-900 hover:bg-emerald-600 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-emerald-500 text-white text-xs"
            onClick={() => setCoberturaModalOpen(true)}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Nova Cobertura
          </Button>
        </div>
      </div>

      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
        {/* Ativas */}
        {ativas.length > 0 && (
          <div>
            <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-2">
              Ativas agora
            </p>
            <div className="space-y-3">
              {ativas.map(c => <CoberturaCard key={c.id} cobertura={c} />)}
            </div>
          </div>
        )}

        {/* Futuras */}
        {futuras.length > 0 && (
          <div>
            <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-2">
              Programadas
            </p>
            <div className="space-y-3">
              {futuras.map(c => <CoberturaCard key={c.id} cobertura={c} />)}
            </div>
          </div>
        )}

        {/* Vazio */}
        {ativas.length === 0 && futuras.length === 0 && (
          <Card className="bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-8 text-center">
            <ArrowLeftRight className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-3" />
            <p className="text-sm font-medium text-zinc-500">Nenhuma cobertura ativa</p>
            <p className="text-xs text-zinc-400 mt-1">Registre afastamentos para gerenciar coberturas</p>
            <Button
              size="sm"
              className="mt-4 h-8 text-xs bg-zinc-900 hover:bg-emerald-600 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-emerald-500 text-white"
              onClick={() => setCoberturaModalOpen(true)}
            >
              <Plus className="w-3 h-3 mr-1" />
              Criar cobertura
            </Button>
          </Card>
        )}
      </div>

      {/* Modal */}
      <CoberturaModal
        open={coberturaModalOpen}
        onOpenChange={setCoberturaModalOpen}
      />
    </div>
  );
}
