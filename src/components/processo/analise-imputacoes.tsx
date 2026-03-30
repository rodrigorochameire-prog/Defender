// src/components/processo/analise-imputacoes.tsx
"use client";

import { useState } from "react";
import {
  Scale, Gavel, Shield, ChevronDown, ChevronUp, AlertTriangle,
  Clock, FileText, Link2, Users, Heart,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TYPO, CARD_STYLE, COLORS } from "@/lib/config/design-tokens";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Imputacao {
  crime: string;
  artigo?: string;
  pena_abstrata?: string;
  qualificadoras?: string[];
  agravantes?: string[];
  atenuantes?: string[];
  favoravel_defesa?: boolean | null;
  observacao?: string;
}

interface AcusacaoRadiografia {
  resumo?: string;
  pontos_fortes?: string[];
  pontos_fracos?: string[];
  estrategia_acusacao?: string;
}

interface RitoBifasico {
  fase_atual?: string;
  quesitos_propostos?: string[];
  observacoes?: string;
}

interface PreparacaoPlenario {
  resumo?: string;
  jurados_perfil?: string;
  riscos?: string[];
  recomendacoes?: string[];
}

interface CadeiaCustodia {
  status?: string;
  irregularidades?: string[];
  provas_afetadas?: string[];
}

interface LicitudeProva {
  provas_ilicitas?: string[];
  fundamentacao?: string;
  impacto?: string;
}

interface CalculoPena {
  pena_base?: string;
  circunstancias?: string[];
  regime_inicial?: string;
  detalhes?: string;
}

interface CronogramaBeneficios {
  beneficios?: { nome: string; data_previsao?: string; status?: string }[];
  observacao?: string;
}

interface Mpu {
  medida_solicitada?: string;
  fundamentacao?: string;
  status?: string;
  urgencia?: string;
}

interface ContextoRelacional {
  resumo?: string;
  historico?: string[];
  fatores_risco?: string[];
  fatores_protecao?: string[];
}

interface AnaliseImputacoesProps {
  imputacoes: Imputacao[];
  acusacaoRadiografia?: AcusacaoRadiografia | null;
  // Attribution-specific
  ritoBifasico?: RitoBifasico | null;
  preparacaoPlenario?: PreparacaoPlenario | null;
  cadeiaCustodia?: CadeiaCustodia | null;
  licitudeProva?: LicitudeProva | null;
  calculoPena?: CalculoPena | null;
  cronogramaBeneficios?: CronogramaBeneficios | null;
  mpu?: Mpu | null;
  contextoRelacional?: ContextoRelacional | null;
}

// ─── Main ───────────────────────────────────────────────────────────────────

export function AnaliseImputacoes({
  imputacoes, acusacaoRadiografia,
  ritoBifasico, preparacaoPlenario,
  cadeiaCustodia, licitudeProva,
  calculoPena, cronogramaBeneficios,
  mpu, contextoRelacional,
}: AnaliseImputacoesProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const isEmpty = imputacoes.length === 0
    && !acusacaoRadiografia
    && !ritoBifasico && !preparacaoPlenario
    && !cadeiaCustodia && !licitudeProva
    && !calculoPena && !cronogramaBeneficios
    && !mpu && !contextoRelacional;

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Gavel className="h-10 w-10 text-zinc-300 dark:text-zinc-600 mb-4" />
        <p className={`${TYPO.body} text-muted-foreground`}>
          Nenhuma imputação identificada. Execute uma análise para detalhar as acusações.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── Imputações ── */}
      {imputacoes.length > 0 && (
        <div>
          <h3 className={`${TYPO.h2} flex items-center gap-2.5 mb-4`}>
            <Gavel className="h-5 w-5 text-red-500 shrink-0" />
            Imputações
            <span className="text-xs text-zinc-400 font-normal ml-1">({imputacoes.length})</span>
          </h3>

          <div className="space-y-3">
            {imputacoes.map((imp, i) => (
              <div key={i} className={`${CARD_STYLE.base} rounded-xl border-l-4 border-l-red-400`}>
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={TYPO.h3}>{imp.crime}</span>
                      {imp.artigo && (
                        <span className="text-xs text-zinc-400 font-mono">{imp.artigo}</span>
                      )}
                      {imp.favoravel_defesa === true && (
                        <Badge variant="default" className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                          Tese forte
                        </Badge>
                      )}
                    </div>
                    {imp.pena_abstrata && (
                      <p className={`${TYPO.caption} mt-0.5`}>Pena abstrata: {imp.pena_abstrata}</p>
                    )}
                  </div>
                  {expandedIdx === i ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
                </div>

                {expandedIdx === i && (
                  <div className="mt-3 space-y-3 border-t border-zinc-100 dark:border-zinc-800 pt-3">
                    {imp.qualificadoras && imp.qualificadoras.length > 0 && (
                      <div>
                        <p className={`${TYPO.label} text-red-600 dark:text-red-400 mb-1.5`}>Qualificadoras</p>
                        <ul className="space-y-1">
                          {imp.qualificadoras.map((q, qi) => (
                            <li key={qi} className={`${TYPO.body} flex items-start gap-2`}>
                              <span className="text-red-400">•</span> {q}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {imp.agravantes && imp.agravantes.length > 0 && (
                      <div>
                        <p className={`${TYPO.label} text-amber-600 dark:text-amber-400 mb-1.5`}>Agravantes</p>
                        <ul className="space-y-1">
                          {imp.agravantes.map((a, ai) => (
                            <li key={ai} className={`${TYPO.body} flex items-start gap-2`}>
                              <span className="text-amber-400">•</span> {a}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {imp.atenuantes && imp.atenuantes.length > 0 && (
                      <div>
                        <p className={`${TYPO.label} text-emerald-600 dark:text-emerald-400 mb-1.5`}>Atenuantes</p>
                        <ul className="space-y-1">
                          {imp.atenuantes.map((a, ai) => (
                            <li key={ai} className={`${TYPO.body} flex items-start gap-2`}>
                              <span className="text-emerald-400">•</span> {a}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {imp.observacao && (
                      <p className={`${TYPO.caption} italic`}>{imp.observacao}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Radiografia da Acusação ── */}
      {acusacaoRadiografia && (
        <div>
          <h3 className={`${TYPO.h2} flex items-center gap-2.5 mb-4`}>
            <Scale className="h-5 w-5 text-rose-500 shrink-0" />
            Radiografia da Acusação
          </h3>

          <div className={`${CARD_STYLE.base} rounded-xl`}>
            {acusacaoRadiografia.resumo && (
              <p className={`${TYPO.body} mb-4`}>{acusacaoRadiografia.resumo}</p>
            )}
            {acusacaoRadiografia.estrategia_acusacao && (
              <div className={`rounded-lg p-3 mb-4 ${COLORS.danger.bg}`}>
                <p className={`${TYPO.label} text-red-600 dark:text-red-400 mb-1`}>Estratégia da Acusação</p>
                <p className={TYPO.body}>{acusacaoRadiografia.estrategia_acusacao}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              {acusacaoRadiografia.pontos_fortes && acusacaoRadiografia.pontos_fortes.length > 0 && (
                <div>
                  <p className={`${TYPO.label} text-red-600 dark:text-red-400 mb-2`}>Pontos Fortes da Acusação</p>
                  <ul className="space-y-1.5">
                    {acusacaoRadiografia.pontos_fortes.map((p, i) => (
                      <li key={i} className={`${TYPO.body} flex items-start gap-2`}>
                        <span className="text-red-400 shrink-0">✗</span> {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {acusacaoRadiografia.pontos_fracos && acusacaoRadiografia.pontos_fracos.length > 0 && (
                <div>
                  <p className={`${TYPO.label} text-emerald-600 dark:text-emerald-400 mb-2`}>Pontos Fracos (explorar)</p>
                  <ul className="space-y-1.5">
                    {acusacaoRadiografia.pontos_fracos.map((p, i) => (
                      <li key={i} className={`${TYPO.body} flex items-start gap-2`}>
                        <span className="text-emerald-400 shrink-0">✓</span> {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Cadeia de Custódia (Criminal) ── */}
      {cadeiaCustodia && (
        <div>
          <h3 className={`${TYPO.h2} flex items-center gap-2.5 mb-4`}>
            <Link2 className="h-5 w-5 text-amber-500 shrink-0" />
            Cadeia de Custódia
          </h3>
          <div className={`${CARD_STYLE.base} rounded-xl`}>
            {cadeiaCustodia.status && (
              <div className="flex items-center gap-2 mb-3">
                <span className={TYPO.label}>Status:</span>
                <Badge variant={cadeiaCustodia.status === "regular" ? "default" : "danger"} className="text-xs capitalize">
                  {cadeiaCustodia.status}
                </Badge>
              </div>
            )}
            {cadeiaCustodia.irregularidades && cadeiaCustodia.irregularidades.length > 0 && (
              <div className={`rounded-lg p-3 ${COLORS.warning.bg} mb-3`}>
                <p className={`${TYPO.label} text-amber-600 dark:text-amber-400 mb-2`}>Irregularidades</p>
                <ul className="space-y-1.5">
                  {cadeiaCustodia.irregularidades.map((ir, i) => (
                    <li key={i} className={`${TYPO.body} flex items-start gap-2`}>
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" /> {ir}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {cadeiaCustodia.provas_afetadas && cadeiaCustodia.provas_afetadas.length > 0 && (
              <div>
                <p className={`${TYPO.label} mb-2`}>Provas Afetadas</p>
                <div className="flex flex-wrap gap-2">
                  {cadeiaCustodia.provas_afetadas.map((p, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{p}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Licitude da Prova (Criminal) ── */}
      {licitudeProva && (
        <div>
          <h3 className={`${TYPO.h2} flex items-center gap-2.5 mb-4`}>
            <Shield className="h-5 w-5 text-red-500 shrink-0" />
            Licitude da Prova
          </h3>
          <div className={`${CARD_STYLE.base} rounded-xl`}>
            {licitudeProva.fundamentacao && (
              <p className={`${TYPO.body} mb-3`}>{licitudeProva.fundamentacao}</p>
            )}
            {licitudeProva.provas_ilicitas && licitudeProva.provas_ilicitas.length > 0 && (
              <div className={`rounded-lg p-3 ${COLORS.danger.bg} mb-3`}>
                <p className={`${TYPO.label} text-red-600 dark:text-red-400 mb-2`}>Provas Potencialmente Ilícitas</p>
                <ul className="space-y-1.5">
                  {licitudeProva.provas_ilicitas.map((p, i) => (
                    <li key={i} className={`${TYPO.body} flex items-start gap-2`}>
                      <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" /> {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {licitudeProva.impacto && (
              <p className={`${TYPO.caption} italic`}>Impacto: {licitudeProva.impacto}</p>
            )}
          </div>
        </div>
      )}

      {/* ── Rito Bifásico (Júri) ── */}
      {ritoBifasico && (
        <div>
          <h3 className={`${TYPO.h2} flex items-center gap-2.5 mb-4`}>
            <Scale className="h-5 w-5 text-emerald-600 shrink-0" />
            Rito Bifásico
          </h3>
          <div className={`${CARD_STYLE.base} rounded-xl`}>
            {ritoBifasico.fase_atual && (
              <div className="flex items-center gap-2 mb-3">
                <span className={TYPO.label}>Fase:</span>
                <Badge variant="default" className="text-xs">{ritoBifasico.fase_atual}</Badge>
              </div>
            )}
            {ritoBifasico.quesitos_propostos && ritoBifasico.quesitos_propostos.length > 0 && (
              <div>
                <p className={`${TYPO.label} mb-2`}>Quesitos Propostos</p>
                <ol className="space-y-1.5">
                  {ritoBifasico.quesitos_propostos.map((q, i) => (
                    <li key={i} className={`${TYPO.body} flex items-start gap-2`}>
                      <span className="text-zinc-400 font-semibold text-xs shrink-0 tabular-nums">{i + 1}.</span> {q}
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {ritoBifasico.observacoes && (
              <p className={`${TYPO.caption} mt-3 italic`}>{ritoBifasico.observacoes}</p>
            )}
          </div>
        </div>
      )}

      {/* ── Preparação para o Plenário (Júri) ── */}
      {preparacaoPlenario && (
        <div>
          <h3 className={`${TYPO.h2} flex items-center gap-2.5 mb-4`}>
            <Users className="h-5 w-5 text-violet-500 shrink-0" />
            Preparação para o Plenário
          </h3>
          <div className={`${CARD_STYLE.highlight} border-l-violet-500 ${COLORS.violet.bg} rounded-xl`}>
            {preparacaoPlenario.resumo && (
              <p className={`${TYPO.body} mb-3`}>{preparacaoPlenario.resumo}</p>
            )}
            {preparacaoPlenario.jurados_perfil && (
              <p className={`${TYPO.body} mb-3`}>
                <span className="font-medium">Perfil dos jurados:</span> {preparacaoPlenario.jurados_perfil}
              </p>
            )}
            {preparacaoPlenario.riscos && preparacaoPlenario.riscos.length > 0 && (
              <div className="mb-3">
                <p className={`${TYPO.label} text-red-600 dark:text-red-400 mb-1.5`}>Riscos</p>
                <ul className="space-y-1">
                  {preparacaoPlenario.riscos.map((r, i) => (
                    <li key={i} className={`${TYPO.body} flex items-start gap-2`}>
                      <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" /> {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {preparacaoPlenario.recomendacoes && preparacaoPlenario.recomendacoes.length > 0 && (
              <div>
                <p className={`${TYPO.label} text-emerald-600 dark:text-emerald-400 mb-1.5`}>Recomendações</p>
                <ul className="space-y-1">
                  {preparacaoPlenario.recomendacoes.map((r, i) => (
                    <li key={i} className={`${TYPO.body} flex items-start gap-2`}>
                      <span className="text-emerald-400 shrink-0">✓</span> {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Cálculo de Pena (EP) ── */}
      {calculoPena && (
        <div>
          <h3 className={`${TYPO.h2} flex items-center gap-2.5 mb-4`}>
            <Clock className="h-5 w-5 text-blue-500 shrink-0" />
            Cálculo de Pena
          </h3>
          <div className={`${CARD_STYLE.base} rounded-xl`}>
            <div className="grid grid-cols-2 gap-4 mb-3">
              {calculoPena.pena_base && (
                <div>
                  <p className={TYPO.label}>Pena Base</p>
                  <p className={`${TYPO.h3} text-zinc-800 dark:text-zinc-100`}>{calculoPena.pena_base}</p>
                </div>
              )}
              {calculoPena.regime_inicial && (
                <div>
                  <p className={TYPO.label}>Regime Inicial</p>
                  <p className={`${TYPO.h3} text-zinc-800 dark:text-zinc-100`}>{calculoPena.regime_inicial}</p>
                </div>
              )}
            </div>
            {calculoPena.circunstancias && calculoPena.circunstancias.length > 0 && (
              <div className="mb-3">
                <p className={`${TYPO.label} mb-1.5`}>Circunstâncias</p>
                <div className="flex flex-wrap gap-2">
                  {calculoPena.circunstancias.map((c, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{c}</Badge>
                  ))}
                </div>
              </div>
            )}
            {calculoPena.detalhes && (
              <p className={TYPO.body}>{calculoPena.detalhes}</p>
            )}
          </div>
        </div>
      )}

      {/* ── Cronograma de Benefícios (EP) ── */}
      {cronogramaBeneficios && cronogramaBeneficios.beneficios && cronogramaBeneficios.beneficios.length > 0 && (
        <div>
          <h3 className={`${TYPO.h2} flex items-center gap-2.5 mb-4`}>
            <Clock className="h-5 w-5 text-emerald-500 shrink-0" />
            Cronograma de Benefícios
          </h3>
          <div className="space-y-2">
            {cronogramaBeneficios.beneficios.map((b, i) => (
              <div key={i} className={`${CARD_STYLE.base} rounded-xl flex items-center justify-between`}>
                <div>
                  <span className={TYPO.h3}>{b.nome}</span>
                  {b.data_previsao && (
                    <p className={`${TYPO.caption} mt-0.5`}>Previsão: {b.data_previsao}</p>
                  )}
                </div>
                {b.status && (
                  <Badge
                    variant={b.status === "concedido" ? "default" : b.status === "indeferido" ? "danger" : "outline"}
                    className="text-xs capitalize"
                  >
                    {b.status}
                  </Badge>
                )}
              </div>
            ))}
          </div>
          {cronogramaBeneficios.observacao && (
            <p className={`${TYPO.caption} mt-2 italic`}>{cronogramaBeneficios.observacao}</p>
          )}
        </div>
      )}

      {/* ── MPU (VVD) ── */}
      {mpu && (
        <div>
          <h3 className={`${TYPO.h2} flex items-center gap-2.5 mb-4`}>
            <Shield className="h-5 w-5 text-orange-500 shrink-0" />
            Medida Protetiva de Urgência
          </h3>
          <div className={`${CARD_STYLE.highlight} border-l-orange-500 bg-orange-50/20 dark:bg-orange-950/5 rounded-xl`}>
            {mpu.medida_solicitada && (
              <p className={`${TYPO.body} font-medium mb-2`}>{mpu.medida_solicitada}</p>
            )}
            {mpu.urgencia && (
              <Badge variant={mpu.urgencia === "alta" ? "danger" : "warning"} className="text-xs mb-2 capitalize">
                Urgência: {mpu.urgencia}
              </Badge>
            )}
            {mpu.fundamentacao && (
              <p className={`${TYPO.body} mb-2`}>{mpu.fundamentacao}</p>
            )}
            {mpu.status && (
              <p className={`${TYPO.caption}`}>Status: {mpu.status}</p>
            )}
          </div>
        </div>
      )}

      {/* ── Contexto Relacional (VVD) ── */}
      {contextoRelacional && (
        <div>
          <h3 className={`${TYPO.h2} flex items-center gap-2.5 mb-4`}>
            <Heart className="h-5 w-5 text-rose-500 shrink-0" />
            Contexto Relacional
          </h3>
          <div className={`${CARD_STYLE.base} rounded-xl`}>
            {contextoRelacional.resumo && (
              <p className={`${TYPO.body} mb-4`}>{contextoRelacional.resumo}</p>
            )}
            {contextoRelacional.historico && contextoRelacional.historico.length > 0 && (
              <div className="mb-3">
                <p className={`${TYPO.label} mb-1.5`}>Histórico</p>
                <ul className="space-y-1.5">
                  {contextoRelacional.historico.map((h, i) => (
                    <li key={i} className={`${TYPO.body} flex items-start gap-2`}>
                      <span className="text-zinc-400">—</span> {h}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              {contextoRelacional.fatores_risco && contextoRelacional.fatores_risco.length > 0 && (
                <div className={`rounded-lg p-3 ${COLORS.danger.bg}`}>
                  <p className={`${TYPO.label} text-red-600 dark:text-red-400 mb-2`}>Fatores de Risco</p>
                  <ul className="space-y-1">
                    {contextoRelacional.fatores_risco.map((f, i) => (
                      <li key={i} className={`${TYPO.body} flex items-start gap-2`}>
                        <AlertTriangle className="h-3 w-3 text-red-400 shrink-0 mt-1" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {contextoRelacional.fatores_protecao && contextoRelacional.fatores_protecao.length > 0 && (
                <div className={`rounded-lg p-3 ${COLORS.primary.bg}`}>
                  <p className={`${TYPO.label} text-emerald-600 dark:text-emerald-400 mb-2`}>Fatores de Proteção</p>
                  <ul className="space-y-1">
                    {contextoRelacional.fatores_protecao.map((f, i) => (
                      <li key={i} className={`${TYPO.body} flex items-start gap-2`}>
                        <Shield className="h-3 w-3 text-emerald-400 shrink-0 mt-1" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
