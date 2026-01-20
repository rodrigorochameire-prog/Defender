"use client";

import { SwissCard, SwissCardContent } from "@/components/shared/swiss-card";
import { Button } from "@/components/ui/button";
import { 
  UserCheck,
  Plus,
  Clock,
  Phone,
  Video,
  Building2,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function AtendimentosPage() {
  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      {/* Header - Design Suíço */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 sm:p-2.5 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex-shrink-0">
            <UserCheck className="w-5 h-5 sm:w-6 sm:h-6 text-purple-700 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Atendimentos
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              Gestão de atendimentos aos assistidos
            </p>
          </div>
        </div>

        <Link href="/admin/atendimentos/novo">
          <Button className="h-8 sm:h-9 text-xs sm:text-sm gap-1.5">
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Novo Atendimento</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        </Link>
      </div>

      {/* Stats Cards - Design Suíço com borda lateral */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <SwissCard className="border-l-2 border-l-rose-500">
          <SwissCardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-white dark:bg-zinc-800 shadow-sm">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-rose-700 dark:text-rose-400">5</p>
                <p className="text-xs sm:text-xs text-rose-600 dark:text-rose-400">Hoje</p>
              </div>
            </div>
          </SwissCardContent>
        </SwissCard>
        
        <SwissCard className="border-l-2 border-l-blue-500">
          <SwissCardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-white dark:bg-zinc-800 shadow-sm">
                <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-400">3</p>
                <p className="text-xs sm:text-xs text-blue-600 dark:text-blue-400">Presenciais</p>
              </div>
            </div>
          </SwissCardContent>
        </SwissCard>
        
        <SwissCard className="border-l-2 border-l-violet-500">
          <SwissCardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-white dark:bg-zinc-800 shadow-sm">
                <Video className="w-4 h-4 sm:w-5 sm:h-5 text-violet-500" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-violet-700 dark:text-violet-400">1</p>
                <p className="text-xs sm:text-xs text-violet-600 dark:text-violet-400">Vídeo</p>
              </div>
            </div>
          </SwissCardContent>
        </SwissCard>
        
        <SwissCard className="border-l-2 border-l-amber-500">
          <SwissCardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-white dark:bg-zinc-800 shadow-sm">
                <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-amber-700 dark:text-amber-400">1</p>
                <p className="text-xs sm:text-xs text-amber-600 dark:text-amber-400">Telefone</p>
              </div>
            </div>
          </SwissCardContent>
        </SwissCard>
      </div>

      {/* Empty State - Design Suíço */}
      <SwissCard className="border-dashed">
        <SwissCardContent className="text-center py-16">
          <div className="mx-auto w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
            <UserCheck className="w-8 h-8 text-purple-500" />
          </div>
          <h3 className="text-lg font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Módulo de Atendimentos
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mb-4">
            Registre e acompanhe atendimentos presenciais, por videoconferência, telefone e visitas carcerárias.
          </p>
          <Link href="/admin/atendimentos/novo">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Agendar Atendimento
            </Button>
          </Link>
        </SwissCardContent>
      </SwissCard>
    </div>
  );
}
