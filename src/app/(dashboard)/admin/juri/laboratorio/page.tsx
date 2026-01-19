"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Mic, 
  ArrowLeft,
  Video,
  FileText,
  Play,
  BookOpen,
  Sparkles,
  Clock,
  Star,
} from "lucide-react";
import Link from "next/link";

export default function LaboratorioOratoriaPage() {
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
          <div className="p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-rose-100 to-pink-100 dark:from-rose-900/30 dark:to-pink-900/30 flex-shrink-0">
            <Mic className="w-5 h-5 sm:w-6 sm:h-6 text-rose-700 dark:text-rose-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                Laboratório de Oratória
              </h1>
              <Badge className="bg-amber-500 text-white text-[10px]">
                <Sparkles className="w-3 h-3 mr-0.5" />
                Premium
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 hidden sm:block">
              Vídeos, roteiros e técnicas para o plenário
            </p>
          </div>
        </div>
      </div>

      {/* Coming Soon */}
      <Card className="border-rose-200 dark:border-rose-800 bg-gradient-to-br from-rose-50/50 to-pink-50/50 dark:from-rose-950/20 dark:to-pink-950/20">
        <CardContent className="flex flex-col items-center justify-center py-16 sm:py-24 text-center px-4">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-rose-100 to-pink-100 dark:from-rose-900/30 dark:to-pink-900/30 flex items-center justify-center mb-6">
            <Mic className="w-10 h-10 sm:w-12 sm:h-12 text-rose-600 dark:text-rose-400" />
          </div>
          
          <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            Laboratório em Desenvolvimento
          </h2>
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-lg mb-6">
            Um espaço dedicado ao aprimoramento da oratória forense, com vídeos de sustentações, 
            roteiros de sucesso e técnicas de persuasão.
          </p>

          {/* Preview Features */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 w-full max-w-2xl mb-8">
            <div className="p-3 sm:p-4 rounded-xl bg-white/60 dark:bg-zinc-800/40 border border-rose-100 dark:border-rose-800/50">
              <Video className="w-6 h-6 text-rose-600 mb-2 mx-auto" />
              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Vídeos</p>
            </div>
            <div className="p-3 sm:p-4 rounded-xl bg-white/60 dark:bg-zinc-800/40 border border-rose-100 dark:border-rose-800/50">
              <FileText className="w-6 h-6 text-rose-600 mb-2 mx-auto" />
              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Roteiros</p>
            </div>
            <div className="p-3 sm:p-4 rounded-xl bg-white/60 dark:bg-zinc-800/40 border border-rose-100 dark:border-rose-800/50">
              <BookOpen className="w-6 h-6 text-rose-600 mb-2 mx-auto" />
              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Técnicas</p>
            </div>
            <div className="p-3 sm:p-4 rounded-xl bg-white/60 dark:bg-zinc-800/40 border border-rose-100 dark:border-rose-800/50">
              <Star className="w-6 h-6 text-rose-600 mb-2 mx-auto" />
              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Casos de Sucesso</p>
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
