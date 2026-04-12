"use client";

import Link from "next/link";
import { CollapsiblePageHeader } from "@/components/layouts/collapsible-page-header";
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
    <div className="min-h-screen bg-muted dark:bg-[#0f0f11]">
      <CollapsiblePageHeader title="Medidas Socioeducativas" icon={Shield}>
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/admin">
            <button className="h-8 w-8 rounded-xl bg-white/[0.08] text-white/80 ring-1 ring-white/[0.05] hover:bg-white/[0.14] hover:text-white transition-all duration-150 cursor-pointer flex items-center justify-center shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
          </Link>
          <div className="w-9 h-9 rounded-xl bg-[#525252] flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-white text-[15px] font-semibold tracking-tight leading-tight">
              Medidas Socioeducativas
            </h1>
            <p className="text-[10px] text-white/55 hidden sm:block">
              Medidas Protetivas de Urgência
            </p>
          </div>
        </div>
      </CollapsiblePageHeader>

      <div className="px-5 md:px-8 py-3 md:py-4">
        {/* Estado: Em Desenvolvimento */}
        <Card className="border-amber-200 dark:border-amber-800/50 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
          <CardContent className="py-16 px-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center mx-auto mb-6">
              <Construction className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
            
            <h2 className="text-xl font-bold text-foreground mb-2">
              Em Desenvolvimento
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-8">
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
                  <div key={idx} className="p-4 rounded-xl bg-white/60 dark:bg-card/40 border border-amber-200/50 dark:border-amber-800/30">
                    <Icon className="w-5 h-5 text-amber-600 dark:text-amber-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-foreground/80">{feature.title}</p>
                    <p className="text-[10px] text-neutral-500 mt-1">{feature.desc}</p>
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
