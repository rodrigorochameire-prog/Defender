"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronRight,
  User,
  AlertCircle,
  CheckCircle,
  FileWarning,
  Gavel,
  FileText,
  Shield,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AntecedenteInfo } from "@/lib/services/python-backend";

interface AntecedentesCardProps {
  antecedente: AntecedenteInfo;
  className?: string;
}

const tipoPessoaConfig: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  REU: {
    label: "Réu",
    color: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
    icon: <Shield className="w-5 h-5 text-rose-600" />,
  },
  VITIMA: {
    label: "Vítima",
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    icon: <User className="w-5 h-5 text-amber-600" />,
  },
  TESTEMUNHA: {
    label: "Testemunha",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    icon: <User className="w-5 h-5 text-blue-600" />,
  },
  DESCONHECIDO: {
    label: "Não identificado",
    color: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300",
    icon: <User className="w-5 h-5 text-zinc-600" />,
  },
};

export function AntecedentesCard({
  antecedente,
  className,
}: AntecedentesCardProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    processos: true,
    ros: true,
    observacoes: true,
    relevancia: true,
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const config = tipoPessoaConfig[antecedente.tipo_pessoa] || tipoPessoaConfig.DESCONHECIDO;

  return (
    <Card className={cn("border-2", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center",
                antecedente.tipo_pessoa === "REU"
                  ? "bg-rose-100 dark:bg-rose-900/30"
                  : antecedente.tipo_pessoa === "VITIMA"
                    ? "bg-amber-100 dark:bg-amber-900/30"
                    : "bg-blue-100 dark:bg-blue-900/30"
              )}
            >
              {config.icon}
            </div>
            <div>
              <CardTitle className="text-lg">{antecedente.nome}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={config.color}>
                  {config.label}
                </Badge>
                {antecedente.possui_antecedentes ? (
                  <Badge
                    variant="outline"
                    className="bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300 gap-1"
                  >
                    <AlertCircle className="w-3 h-3" />
                    Com antecedentes
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 gap-1"
                  >
                    <CheckCircle className="w-3 h-3" />
                    Sem antecedentes
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="text-right text-sm text-zinc-500">
            <div>{antecedente.processos_anteriores.length} processo(s)</div>
            <div>{antecedente.ros_anteriores.length} RO(s)</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Processos Anteriores */}
        {antecedente.processos_anteriores.length > 0 && (
          <Collapsible
            open={openSections.processos}
            onOpenChange={() => toggleSection("processos")}
          >
            <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors">
              {openSections.processos ? (
                <ChevronDown className="w-4 h-4 text-rose-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-rose-600" />
              )}
              <Gavel className="w-4 h-4 text-rose-600" />
              <span className="font-medium text-sm text-rose-800 dark:text-rose-200">
                Processos Anteriores ({antecedente.processos_anteriores.length})
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ScrollArea className="mt-2 max-h-[200px]">
                <div className="space-y-2 pr-4">
                  {antecedente.processos_anteriores.map((processo, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-mono text-sm text-zinc-800 dark:text-zinc-200">
                            {processo.numero || "Número não informado"}
                          </p>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            {processo.vara || "Vara não informada"}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            processo.status === "condenado"
                              ? "bg-rose-50 text-rose-700"
                              : processo.status === "absolvido"
                                ? "bg-emerald-50 text-emerald-700"
                                : processo.status === "prescrito"
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-zinc-50 text-zinc-700"
                          )}
                        >
                          {processo.status || "Status desconhecido"}
                        </Badge>
                      </div>
                      <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          <span className="font-medium">Crime:</span>{" "}
                          {processo.tipo_crime || "Não informado"}
                        </p>
                        {processo.pena && (
                          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                            <span className="font-medium">Pena:</span> {processo.pena}
                          </p>
                        )}
                        {processo.data && (
                          <p className="text-xs text-zinc-500 mt-1">
                            Data: {processo.data}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* ROs Anteriores */}
        {antecedente.ros_anteriores.length > 0 && (
          <Collapsible
            open={openSections.ros}
            onOpenChange={() => toggleSection("ros")}
          >
            <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
              {openSections.ros ? (
                <ChevronDown className="w-4 h-4 text-amber-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-amber-600" />
              )}
              <FileWarning className="w-4 h-4 text-amber-600" />
              <span className="font-medium text-sm text-amber-800 dark:text-amber-200">
                Registros de Ocorrência ({antecedente.ros_anteriores.length})
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ScrollArea className="mt-2 max-h-[200px]">
                <div className="space-y-2 pr-4">
                  {antecedente.ros_anteriores.map((ro, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-mono text-sm text-zinc-800 dark:text-zinc-200">
                            {ro.numero || "Número não informado"}
                          </p>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            {ro.data || "Data não informada"}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            ro.papel === "autor"
                              ? "bg-rose-50 text-rose-700"
                              : ro.papel === "vítima"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-zinc-50 text-zinc-700"
                          )}
                        >
                          {ro.papel || "Papel desconhecido"}
                        </Badge>
                      </div>
                      <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          <span className="font-medium">Tipo:</span>{" "}
                          {ro.tipo || "Não informado"}
                        </p>
                        {ro.resumo && (
                          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                            {ro.resumo}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Observações */}
        {antecedente.observacoes.length > 0 && (
          <Collapsible
            open={openSections.observacoes}
            onOpenChange={() => toggleSection("observacoes")}
          >
            <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
              {openSections.observacoes ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              <FileText className="w-4 h-4" />
              <span className="font-medium text-sm">
                Observações ({antecedente.observacoes.length})
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 space-y-2">
                {antecedente.observacoes.map((obs, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-200 dark:border-zinc-800"
                  >
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">
                      {obs}
                    </p>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Relevância para Defesa */}
        {antecedente.relevancia_para_defesa && (
          <Collapsible
            open={openSections.relevancia}
            onOpenChange={() => toggleSection("relevancia")}
          >
            <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors">
              {openSections.relevancia ? (
                <ChevronDown className="w-4 h-4 text-emerald-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-emerald-600" />
              )}
              <AlertTriangle className="w-4 h-4 text-emerald-600" />
              <span className="font-medium text-sm text-emerald-800 dark:text-emerald-200">
                Relevância para Defesa
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 p-3 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-lg border border-emerald-200 dark:border-emerald-900/30">
                <p className="text-sm text-emerald-900 dark:text-emerald-100">
                  {antecedente.relevancia_para_defesa}
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Empty State */}
        {!antecedente.possui_antecedentes &&
          antecedente.processos_anteriores.length === 0 &&
          antecedente.ros_anteriores.length === 0 && (
            <div className="text-center py-6 text-zinc-500">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
              <p className="text-sm">Nenhum registro de antecedentes encontrado</p>
            </div>
          )}
      </CardContent>
    </Card>
  );
}
