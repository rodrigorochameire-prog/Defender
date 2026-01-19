"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Zap, 
  Users, 
  Clock, 
  Play, 
  Pause, 
  SkipForward,
  MessageCircle,
  FileText,
  Mic,
  Video,
  AlertTriangle,
  CheckCircle2,
  Timer,
  BarChart3,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

export default function PlenarioCockpitPage() {
  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link href="/admin/juri">
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9">
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </Link>
          <div className="p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 flex-shrink-0">
            <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-amber-700 dark:text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                Plenário Live
              </h1>
              <Badge className="bg-amber-500 text-white text-[10px]">
                <Sparkles className="w-3 h-3 mr-0.5" />
                Premium
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 hidden sm:block">
              Cockpit para o dia do julgamento
            </p>
          </div>
        </div>
      </div>

      {/* Coming Soon */}
      <Card className="border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50/50 to-yellow-50/50 dark:from-amber-950/20 dark:to-yellow-950/20">
        <CardContent className="flex flex-col items-center justify-center py-16 sm:py-24 text-center px-4">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 flex items-center justify-center mb-6">
            <Zap className="w-10 h-10 sm:w-12 sm:h-12 text-amber-600 dark:text-amber-400" />
          </div>
          
          <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            Cockpit do Plenário em Desenvolvimento
          </h2>
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-lg mb-6">
            Uma ferramenta completa para gerenciar o julgamento em tempo real, com timer de fases, 
            seleção de jurados, anotações ao vivo e muito mais.
          </p>

          {/* Preview Features */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 w-full max-w-2xl mb-8">
            <div className="p-3 sm:p-4 rounded-xl bg-white/60 dark:bg-zinc-800/40 border border-amber-100 dark:border-amber-800/50">
              <Timer className="w-6 h-6 text-amber-600 mb-2 mx-auto" />
              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Timer de Fases</p>
            </div>
            <div className="p-3 sm:p-4 rounded-xl bg-white/60 dark:bg-zinc-800/40 border border-amber-100 dark:border-amber-800/50">
              <Users className="w-6 h-6 text-amber-600 mb-2 mx-auto" />
              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Seleção Jurados</p>
            </div>
            <div className="p-3 sm:p-4 rounded-xl bg-white/60 dark:bg-zinc-800/40 border border-amber-100 dark:border-amber-800/50">
              <MessageCircle className="w-6 h-6 text-amber-600 mb-2 mx-auto" />
              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Notas em Tempo Real</p>
            </div>
            <div className="p-3 sm:p-4 rounded-xl bg-white/60 dark:bg-zinc-800/40 border border-amber-100 dark:border-amber-800/50">
              <BarChart3 className="w-6 h-6 text-amber-600 mb-2 mx-auto" />
              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Análise de Perfis</p>
            </div>
          </div>

          <Button variant="outline" asChild>
            <Link href="/admin/juri">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para Sessões
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
