"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Shield,
  ArrowLeft,
  Construction,
  Clock,
  AlertTriangle,
  MapPin,
  Bell,
} from "lucide-react";

export default function MedidasProtetivasPage() {
  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
      {/* SUB-HEADER */}
      <div className="px-4 md:px-6 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link href="/admin">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center border border-purple-200 dark:border-purple-800">
              <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Monitor de MPUs</h1>
              <p className="text-[10px] text-zinc-500">Medidas Protetivas de Urgência</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6">
        {/* Estado: Em Desenvolvimento */}
        <Card className="border-amber-200 dark:border-amber-800/50 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
          <CardContent className="py-16 px-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center mx-auto mb-6">
              <Construction className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
            
            <h2 className="text-xl font-bold text-zinc-800 dark:text-zinc-200 mb-2">
              Em Desenvolvimento
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-md mx-auto mb-8">
              O módulo de Monitoramento de Medidas Protetivas de Urgência está sendo desenvolvido.
              Em breve você poderá acompanhar todas as MPUs aqui.
            </p>

            {/* Funcionalidades Planejadas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
              {[
                { icon: Clock, title: "Controle de Prazos", desc: "Alertas de vencimento e renovação" },
                { icon: AlertTriangle, title: "Mapa de Risco", desc: "Avaliação de vulnerabilidade da vítima" },
                { icon: Bell, title: "Notificações", desc: "Lembretes automáticos para audiências" },
              ].map((feature, idx) => {
                const Icon = feature.icon;
                return (
                  <div key={idx} className="p-4 rounded-xl bg-white/60 dark:bg-zinc-900/40 border border-amber-200/50 dark:border-amber-800/30">
                    <Icon className="w-5 h-5 text-amber-600 dark:text-amber-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{feature.title}</p>
                    <p className="text-[10px] text-zinc-500 mt-1">{feature.desc}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
