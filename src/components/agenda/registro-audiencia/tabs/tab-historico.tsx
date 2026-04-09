"use client";

import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen, Calendar, CheckCircle2, Clock, MapPin,
  Users, UserCheck, UserX, Mail, Check, XCircle,
  Target, Quote, Eye, AlertTriangle, Gavel,
} from "lucide-react";
import { getDepoenteStyle } from "../constants";

interface TabHistoricoProps {
  registrosAnteriores: any[];
  registroAtual?: any;
  statusAtual?: string;
}

export function TabHistorico({ registrosAnteriores, registroAtual, statusAtual }: TabHistoricoProps) {
  // Monta lista: registro atual (se tiver dados) + anteriores
  const hasCurrentData = registroAtual && (registroAtual.resultado || registroAtual.anotacoesGerais || (registroAtual.depoentes?.length ?? 0) > 0);
  const totalCount = registrosAnteriores.length + (hasCurrentData ? 1 : 0);

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-neutral-50/50 dark:bg-neutral-900/30 rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 p-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-neutral-900 dark:bg-white flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white dark:text-neutral-900" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Histórico de Audiências
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {totalCount} registro{totalCount !== 1 ? "s" : ""} encontrado{totalCount !== 1 ? "s" : ""}
              {hasCurrentData && " (inclui registro atual)"}
            </p>
          </div>
        </div>
      </div>

      {/* Registro Atual (se houver dados) */}
      {hasCurrentData && (
        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Registro Atual</span>
            {statusAtual && (
              <Badge variant="outline" className="text-[10px] ml-auto border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400">
                {statusAtual === "concluida" ? "Concluída" : statusAtual === "redesignada" ? "Redesignada" : statusAtual === "suspensa" ? "Suspensa" : statusAtual}
              </Badge>
            )}
          </div>
          <div className="space-y-2 text-xs text-neutral-700 dark:text-neutral-300">
            {registroAtual.resultado && (
              <p><span className="font-semibold">Resultado:</span> {registroAtual.resultado}</p>
            )}
            {registroAtual.depoentes?.length > 0 && (
              <p><span className="font-semibold">Depoentes:</span> {registroAtual.depoentes.map((d: any) => d.nome).join(", ")}</p>
            )}
            {registroAtual.manifestacaoMP && (
              <p><span className="font-semibold">MP:</span> {registroAtual.manifestacaoMP}</p>
            )}
            {registroAtual.manifestacaoDefesa && (
              <p><span className="font-semibold">Defesa:</span> {registroAtual.manifestacaoDefesa}</p>
            )}
            {registroAtual.decisaoJuiz && (
              <p><span className="font-semibold">Decisão Juiz:</span> {registroAtual.decisaoJuiz}</p>
            )}
            {registroAtual.anotacoesGerais && (
              <p><span className="font-semibold">Anotações:</span> {registroAtual.anotacoesGerais}</p>
            )}
            {registroAtual.encaminhamentos && (
              <p><span className="font-semibold">Encaminhamentos:</span> {registroAtual.encaminhamentos}</p>
            )}
          </div>
        </div>
      )}

      {/* Sem registros */}
      {totalCount === 0 && (
        <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 p-8 text-center">
          <BookOpen className="w-8 h-8 text-neutral-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">Nenhum registro ainda</p>
          <p className="text-xs text-neutral-500 mt-1">Preencha os campos nas abas Depoentes, Anotações e Resultado, depois clique Salvar Registro.</p>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-4 relative">
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-neutral-200 dark:bg-neutral-800" />

        {registrosAnteriores.map((reg, idx) => (
          <div key={reg.historicoId} className="relative pl-16">
            {/* Timeline indicator */}
            <div className="absolute left-3 top-6 w-6 h-6 rounded-full bg-neutral-600 dark:bg-neutral-400 border-4 border-white dark:border-neutral-950 shadow-md flex items-center justify-center">
              <span className="text-[10px] font-bold text-white dark:text-neutral-900">{idx + 1}</span>
            </div>

            {/* Card */}
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 overflow-hidden">
              {/* Card Header */}
              <div className="bg-neutral-50/50 dark:bg-neutral-900/50 p-4 border-b border-neutral-200/80 dark:border-neutral-800/80">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                    <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                      {new Date(reg.dataRealizacao).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                        weekday: "long",
                      })}
                    </span>
                    {reg.horarioInicio && (
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">às {reg.horarioInicio}</span>
                    )}
                  </div>
                  <Badge
                    className={
                      reg.realizada
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    }
                  >
                    {reg.realizada ? (
                      <><CheckCircle2 className="w-3 h-3 mr-1" />Concluída</>
                    ) : (
                      <><Calendar className="w-3 h-3 mr-1" />Redesignada</>
                    )}
                  </Badge>
                </div>
                {reg.local && (
                  <div className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                    <MapPin className="w-3.5 h-3.5" />
                    {reg.local}
                  </div>
                )}
              </div>

              {/* Card Content */}
              <div className="p-4 space-y-4">
                {/* Resultado */}
                {reg.realizada && reg.resultado && (
                  <InfoBlock icon={Gavel} label="Resultado da Audiência" borderColor="border-l-neutral-400 dark:border-l-neutral-600">
                    <Badge variant="outline" className="text-xs capitalize mt-1">{reg.resultado}</Badge>
                  </InfoBlock>
                )}

                {/* Motivo não realização */}
                {!reg.realizada && reg.motivoNaoRealizacao && (
                  <InfoBlock icon={AlertTriangle} label="Motivo da Não Realização" borderColor="border-l-amber-500 dark:border-l-amber-400">
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">{reg.motivoNaoRealizacao}</p>
                  </InfoBlock>
                )}

                {/* Redesignação */}
                {reg.resultado === "redesignada" && (
                  <InfoBlock icon={Calendar} label="Audiência Redesignada" borderColor="border-l-neutral-400 dark:border-l-neutral-600">
                    {reg.motivoRedesignacao && (
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-2">
                        <span className="font-semibold">Motivo:</span> {reg.motivoRedesignacao}
                      </p>
                    )}
                    {reg.dataRedesignacao && (
                      <div className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                        <Calendar className="w-3.5 h-3.5" />
                        <span className="font-semibold">Nova data:</span>
                        {new Date(reg.dataRedesignacao).toLocaleDateString("pt-BR")}
                        {reg.horarioRedesignacao && ` às ${reg.horarioRedesignacao}`}
                      </div>
                    )}
                  </InfoBlock>
                )}

                {/* Presença do Assistido — aceita ambos os nomes de campo por compatibilidade */}
                {(() => {
                  const presente = reg.assistidoCompareceu ?? reg.assistidoPresente;
                  return (
                    <InfoBlock icon={Users} label="Presença do Assistido" borderColor="border-l-neutral-400 dark:border-l-neutral-600">
                      <Badge
                        className={
                          presente
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 mt-1"
                            : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 mt-1"
                        }
                      >
                        {presente ? (
                          <><UserCheck className="w-3 h-3 mr-1" />Presente</>
                        ) : (
                          <><UserX className="w-3 h-3 mr-1" />Ausente</>
                        )}
                      </Badge>
                    </InfoBlock>
                  );
                })()}

                {/* Depoentes */}
                {reg.depoentes && reg.depoentes.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400" />
                      Depoentes ({reg.depoentes.length})
                    </Label>
                    <div className="space-y-2.5">
                      {reg.depoentes.map((dep: any) => {
                        const style = getDepoenteStyle(dep.tipo);
                        const temConteudo = dep.estrategiaInquiricao || dep.perguntasDefesa || dep.depoimentoLiteral || dep.analisePercepcoes;

                        return (
                          <div key={dep.id} className={`rounded-lg border ${style.border} overflow-hidden`}>
                            <div className={`p-2.5 border-b border-neutral-200 dark:border-neutral-800 ${style.bg}`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge className={`${style.bg} ${style.text} text-[10px] px-1.5 py-0.5`}>{style.label}</Badge>
                                  <span className={`text-sm font-semibold ${style.text}`}>{dep.nome}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {dep.intimado !== undefined && (
                                    <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                                      <Mail className="w-2.5 h-2.5 mr-0.5" />
                                      {dep.intimado ? "Intimado" : "Não Intimado"}
                                    </Badge>
                                  )}
                                  {dep.presente !== undefined && (
                                    <Badge
                                      className={
                                        dep.presente
                                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[9px] px-1.5 py-0"
                                          : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 text-[9px] px-1.5 py-0"
                                      }
                                    >
                                      {dep.presente ? (
                                        <><Check className="w-2.5 h-2.5 mr-0.5" />Presente</>
                                      ) : (
                                        <><XCircle className="w-2.5 h-2.5 mr-0.5" />Ausente</>
                                      )}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>

                            {temConteudo && (
                              <div className="p-3 space-y-2.5 bg-white dark:bg-neutral-950">
                                {dep.estrategiaInquiricao && (
                                  <DepoenteField icon={Target} label="Estratégia de Inquirição" text={dep.estrategiaInquiricao} />
                                )}
                                {dep.perguntasDefesa && (
                                  <DepoenteField icon={BookOpen} label="Perguntas da Defesa" text={dep.perguntasDefesa} />
                                )}
                                {dep.depoimentoLiteral && (
                                  <div className="bg-neutral-50/50 dark:bg-neutral-900/30 rounded-lg border border-neutral-200/80 dark:border-neutral-800/80 p-2">
                                    <Label className="text-[10px] font-semibold text-neutral-600 dark:text-neutral-400 flex items-center gap-1 mb-1">
                                      <Quote className="w-2.5 h-2.5" /> Depoimento Literal
                                    </Label>
                                    <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed italic">
                                      &ldquo;{dep.depoimentoLiteral}&rdquo;
                                    </p>
                                  </div>
                                )}
                                {dep.analisePercepcoes && (
                                  <DepoenteField icon={Eye} label="Análise e Percepções" text={dep.analisePercepcoes} />
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Manifestações */}
                {(reg.manifestacaoMP || reg.manifestacaoDefesa || reg.decisaoJuiz) && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Manifestações e Decisões</Label>
                    {reg.manifestacaoMP && (
                      <InfoBlock icon={Gavel} label="Ministério Público" borderColor="border-l-neutral-400 dark:border-l-neutral-600">
                        <p className="text-xs text-neutral-600 dark:text-neutral-400">{reg.manifestacaoMP}</p>
                      </InfoBlock>
                    )}
                    {reg.manifestacaoDefesa && (
                      <InfoBlock icon={Gavel} label="Defesa" borderColor="border-l-emerald-500 dark:border-l-emerald-400">
                        <p className="text-xs text-neutral-600 dark:text-neutral-400">{reg.manifestacaoDefesa}</p>
                      </InfoBlock>
                    )}
                    {reg.decisaoJuiz && (
                      <InfoBlock icon={Gavel} label="Decisão Judicial" borderColor="border-l-neutral-400 dark:border-l-neutral-600">
                        <p className="text-xs text-neutral-600 dark:text-neutral-400">{reg.decisaoJuiz}</p>
                      </InfoBlock>
                    )}
                  </div>
                )}

                {/* Encaminhamentos */}
                {reg.encaminhamentos && (
                  <InfoBlock icon={Gavel} label="Encaminhamentos" borderColor="border-l-neutral-400 dark:border-l-neutral-600">
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">{reg.encaminhamentos}</p>
                  </InfoBlock>
                )}

                {/* Anotações */}
                {reg.anotacoesGerais && (
                  <InfoBlock icon={Gavel} label="Anotações Gerais" borderColor="border-l-neutral-400 dark:border-l-neutral-600">
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">{reg.anotacoesGerais}</p>
                  </InfoBlock>
                )}
              </div>

              {/* Card Footer */}
              <div className="bg-neutral-50/50 dark:bg-neutral-900/50 p-3 border-t border-neutral-200/80 dark:border-neutral-800/80 flex items-center justify-between">
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Registrado em{" "}
                  {new Date(reg.dataRegistro).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="text-[10px] font-mono text-neutral-400 bg-neutral-200 dark:bg-neutral-800 px-2 py-0.5 rounded">
                  #{reg.historicoId.slice(-8).toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* --- Helper components --- */

function InfoBlock({
  icon: Icon,
  label,
  borderColor,
  children,
}: {
  icon: any;
  label: string;
  borderColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-neutral-50/50 dark:bg-neutral-900/30 rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 p-3">
      <div className={`border-l-4 ${borderColor} pl-3 -ml-2`}>
        <Label className="text-xs font-semibold mb-0.5 block text-neutral-700 dark:text-neutral-300">{label}</Label>
        {children}
      </div>
    </div>
  );
}

function DepoenteField({ icon: Icon, label, text }: { icon: any; label: string; text: string }) {
  return (
    <div className="bg-neutral-50/50 dark:bg-neutral-900/30 rounded-lg border border-neutral-200/80 dark:border-neutral-800/80 p-2">
      <Label className="text-[10px] font-semibold text-neutral-600 dark:text-neutral-400 flex items-center gap-1 mb-1">
        <Icon className="w-2.5 h-2.5" /> {label}
      </Label>
      <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">{text}</p>
    </div>
  );
}
