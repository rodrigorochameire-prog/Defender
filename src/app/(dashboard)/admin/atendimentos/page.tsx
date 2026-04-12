"use client";

import { Card, CardContent } from "@/components/ui/card";
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
import { CollapsiblePageHeader } from "@/components/layouts/collapsible-page-header";

export default function AtendimentosPage() {
  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-[#0f0f11]">
      <CollapsiblePageHeader title="Atendimentos" icon={UserCheck}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#525252] flex items-center justify-center shrink-0">
              <UserCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-white text-[15px] font-semibold tracking-tight leading-tight">
                Atendimentos
              </h1>
              <p className="text-[10px] text-white/55">
                Gestão de atendimentos aos assistidos
              </p>
            </div>
          </div>
          <Link href="/admin/atendimentos/novo">
            <button className="h-8 px-3 rounded-xl bg-emerald-500 text-white shadow-sm hover:bg-emerald-600 transition-all duration-150 cursor-pointer flex items-center gap-1.5 text-[11px] font-semibold shrink-0">
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Novo Atendimento</span>
              <span className="sm:hidden">Novo</span>
            </button>
          </Link>
        </div>
      </CollapsiblePageHeader>

      <div className="px-5 md:px-8 py-3 md:py-4 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {[
            { label: "Hoje", value: 5, color: "rose", icon: Clock },
            { label: "Presenciais", value: 3, color: "blue", icon: Building2 },
            { label: "Vídeo", value: 1, color: "violet", icon: Video },
            { label: "Telefone", value: 1, color: "amber", icon: Phone },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.label} className={`border-l-2 border-l-${s.color}-500`}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-white dark:bg-muted shadow-sm">
                      <Icon className={`w-4 h-4 sm:w-5 sm:h-5 text-${s.color}-500`} />
                    </div>
                    <div>
                      <p className={`text-xl sm:text-2xl font-bold text-${s.color}-700 dark:text-${s.color}-400`}>{s.value}</p>
                      <p className={`text-xs text-${s.color}-600 dark:text-${s.color}-400`}>{s.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Empty State */}
        <Card className="border-dashed">
          <CardContent className="text-center py-16">
            <div className="mx-auto w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
              <UserCheck className="w-8 h-8 text-purple-500" />
            </div>
            <h3 className="text-lg font-medium text-foreground/80 mb-2">
              Módulo de Atendimentos
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
              Registre e acompanhe atendimentos presenciais, por videoconferência, telefone e visitas carcerárias.
            </p>
            <Link href="/admin/atendimentos/novo">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Agendar Atendimento
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
