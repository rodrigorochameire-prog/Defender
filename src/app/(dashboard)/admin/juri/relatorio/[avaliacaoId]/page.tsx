"use client";

import { use } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Printer,
  FileText,
  Users,
  MessageSquare,
  Gavel,
  Scale,
  Target,
  BarChart3,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Mic,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// HELPERS
// ============================================
function ScoreBar({ value, max = 10, label }: { value: number | null; max?: number; label?: string }) {
  if (value === null || value === undefined) return null;
  const pct = (value / max) * 100;
  const color = value <= 3 ? "bg-rose-500" : value <= 6 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="space-y-1">
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs font-bold w-6 text-right">{value}/{max}</span>
      </div>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children, className }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5", className)}>
      <h3 className="text-sm font-semibold flex items-center gap-2 mb-4 text-neutral-800 dark:text-neutral-200">
        <Icon className="w-4 h-4 text-emerald-600" />
        {title}
      </h3>
      {children}
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex flex-col gap-0.5 py-1.5 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</span>
      <span className="text-sm text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap">{value}</span>
    </div>
  );
}

function TendenciaBadge({ tendencia }: { tendencia: string | null | undefined }) {
  if (!tendencia) return <Badge variant="outline" className="text-[10px]">?</Badge>;
  const map: Record<string, { icon: React.ElementType; color: string; label: string }> = {
    CONDENAR: { icon: ThumbsDown, color: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400", label: "Condenar" },
    ABSOLVER: { icon: ThumbsUp, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400", label: "Absolver" },
    INDECISO: { icon: Minus, color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400", label: "Indeciso" },
  };
  const cfg = map[tendencia] || map.INDECISO;
  const Icon = cfg.icon;
  return (
    <Badge className={cn("text-[10px] gap-1", cfg.color)}>
      <Icon className="w-3 h-3" />{cfg.label}
    </Badge>
  );
}

// ============================================
// PÁGINA DO RELATÓRIO
// ============================================
export default function RelatorioPosJuriPage({ params }: { params: Promise<{ avaliacaoId: string }> }) {
  const resolvedParams = use(params);
  const avaliacaoId = parseInt(resolvedParams.avaliacaoId);

  const { data: avaliacao, isLoading } = trpc.avaliacaoJuri.getById.useQuery(
    { id: avaliacaoId },
    { enabled: !isNaN(avaliacaoId) }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-emerald-500 rounded-full border-t-transparent" />
      </div>
    );
  }

  if (!avaliacao) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <AlertTriangle className="w-12 h-12 text-amber-500" />
        <h2 className="text-lg font-semibold">Avaliação não encontrada</h2>
        <Link href="/admin/juri"><Button variant="outline">Voltar</Button></Link>
      </div>
    );
  }

  const juradosAv = avaliacao.avaliacaoJurados || [];
  const testemunhas = avaliacao.avaliacaoTestemunhas || [];
  const argumentos = avaliacao.argumentos || [];
  const argsMp = argumentos.filter(a => a.tipo === "mp").sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
  const argsDefesa = argumentos.filter(a => a.tipo === "defesa").sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

  // Contagem de tendências
  const condenar = juradosAv.filter(j => j.tendenciaVoto === "CONDENAR").length;
  const absolver = juradosAv.filter(j => j.tendenciaVoto === "ABSOLVER").length;
  const indeciso = juradosAv.filter(j => j.tendenciaVoto === "INDECISO").length;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <div className="sticky top-0 z-20 px-4 md:px-6 py-3 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm border-b border-neutral-200/80 dark:border-neutral-800/80">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-2.5">
            <Link href="/admin/juri">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-neutral-400 hover:text-emerald-600">
                <ArrowLeft className="w-3.5 h-3.5" />
              </Button>
            </Link>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Relatório Pós-Júri</span>
              <span className="text-xs text-neutral-400 ml-2">#{avaliacao.id}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={avaliacao.status === "concluida" ? "default" : "secondary"} className="text-xs">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              {avaliacao.status === "concluida" ? "Concluída" : avaliacao.status}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => window.print()} className="hidden sm:flex">
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              Imprimir
            </Button>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6 print:space-y-4">
        {/* Cabeçalho do Relatório */}
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                Relatório de Observação — Tribunal do Júri
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{avaliacao.dataJulgamento}</span>
                <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{avaliacao.observador}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-center px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
                <div className="text-lg font-bold text-rose-600">{condenar}</div>
                <div className="text-[10px] text-rose-500 uppercase">Condenar</div>
              </div>
              <div className="text-center px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <div className="text-lg font-bold text-amber-600">{indeciso}</div>
                <div className="text-[10px] text-amber-500 uppercase">Indecisos</div>
              </div>
              <div className="text-center px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <div className="text-lg font-bold text-emerald-600">{absolver}</div>
                <div className="text-[10px] text-emerald-500 uppercase">Absolver</div>
              </div>
            </div>
          </div>
        </div>

        {/* Contexto e Ambiente */}
        <SectionCard title="Contexto e Ambiente" icon={MapPin}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <FieldRow label="Horário de Início" value={avaliacao.horarioInicio} />
            <FieldRow label="Duração Estimada" value={avaliacao.duracaoEstimada} />
            <FieldRow label="Descrição do Ambiente" value={avaliacao.descricaoAmbiente} />
            <FieldRow label="Disposição Física" value={avaliacao.disposicaoFisica} />
            <FieldRow label="Clima Emocional Inicial" value={avaliacao.climaEmocionalInicial} />
            <FieldRow label="Presença de Público/Mídia" value={avaliacao.presencaPublicoMidia} />
          </div>
        </SectionCard>

        {/* Conselho de Sentença */}
        {juradosAv.length > 0 && (
          <SectionCard title="Conselho de Sentença — 7 Jurados" icon={Users}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {juradosAv.sort((a, b) => a.posicao - b.posicao).map((j) => (
                <div key={j.id} className="rounded-lg border border-neutral-100 dark:border-neutral-800 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-xs font-bold">
                        {j.posicao}
                      </div>
                      <span className="text-sm font-medium truncate">{j.nome || "—"}</span>
                    </div>
                    <TendenciaBadge tendencia={j.tendenciaVoto} />
                  </div>
                  {j.profissao && <span className="text-xs text-muted-foreground block">{j.profissao}{j.idadeAproximada ? `, ~${j.idadeAproximada} anos` : ""}</span>}
                  {j.aparenciaPrimeiraImpressao && <p className="text-xs text-neutral-600 dark:text-neutral-400">{j.aparenciaPrimeiraImpressao}</p>}
                  {j.linguagemCorporalInicial && <p className="text-xs text-neutral-500 italic">{j.linguagemCorporalInicial}</p>}
                  {j.nivelConfianca && (
                    <Badge variant="outline" className="text-[10px]">Confiança: {j.nivelConfianca}</Badge>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Interrogatório */}
        <SectionCard title="Interrogatório do Réu" icon={MessageSquare}>
          <div className="space-y-1">
            <FieldRow label="Reação Geral dos Jurados" value={avaliacao.interrogatorioReacaoGeral} />
            <FieldRow label="Jurados que Pareciam Acreditar" value={avaliacao.interrogatorioJuradosAcreditaram} />
            <FieldRow label="Jurados Céticos" value={avaliacao.interrogatorioJuradosCeticos} />
            <FieldRow label="Momentos de Impacto" value={avaliacao.interrogatorioMomentosImpacto} />
            <FieldRow label="Contradições Percebidas" value={avaliacao.interrogatorioContradicoes} />
            <FieldRow label="Impressão de Credibilidade" value={avaliacao.interrogatorioImpressaoCredibilidade} />
            <ScoreBar value={avaliacao.interrogatorioNivelCredibilidade} label="Nível de Credibilidade" />
          </div>
        </SectionCard>

        {/* Testemunhas */}
        {testemunhas.length > 0 && (
          <SectionCard title={`Testemunhas (${testemunhas.length})`} icon={Mic}>
            <div className="space-y-4">
              {testemunhas.sort((a, b) => (a.ordem || 0) - (b.ordem || 0)).map((t) => (
                <div key={t.id} className="rounded-lg border border-neutral-100 dark:border-neutral-800 p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{t.ordem}. {t.nome}</span>
                    <ScoreBar value={t.credibilidade} label="" />
                  </div>
                  <FieldRow label="Resumo do Depoimento" value={t.resumoDepoimento} />
                  <FieldRow label="Reação dos Jurados" value={t.reacaoJurados} />
                  <FieldRow label="Expressões Faciais/Linguagem" value={t.expressoesFaciaisLinguagem} />
                  <FieldRow label="Observações" value={t.observacoesComplementares} />
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Sustentação: MP vs Defesa lado a lado */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* MP */}
          <SectionCard title="Sustentação do MP (Acusação)" icon={Gavel}>
            <div className="space-y-3">
              <FieldRow label="Estratégia Geral" value={avaliacao.mpEstrategiaGeral} />
              {argsMp.map((a, i) => (
                <div key={a.id} className="rounded-lg bg-neutral-50 dark:bg-neutral-800/50 p-2.5 space-y-1">
                  <span className="text-xs font-medium">Argumento {i + 1}</span>
                  <p className="text-sm">{a.descricaoArgumento}</p>
                  {a.reacaoJurados && <p className="text-xs text-muted-foreground">{a.reacaoJurados}</p>}
                  <ScoreBar value={a.nivelPersuasao} label="Persuasão" />
                </div>
              ))}
              <ScoreBar value={avaliacao.mpImpactoGeral} label="Impacto Geral" />
              <FieldRow label="Inclinação a Condenar" value={avaliacao.mpInclinacaoCondenar} />
            </div>
          </SectionCard>

          {/* Defesa */}
          <SectionCard title="Sustentação da Defesa" icon={Scale}>
            <div className="space-y-3">
              <FieldRow label="Estratégia Geral" value={avaliacao.defesaEstrategiaGeral} />
              {argsDefesa.map((a, i) => (
                <div key={a.id} className="rounded-lg bg-neutral-50 dark:bg-neutral-800/50 p-2.5 space-y-1">
                  <span className="text-xs font-medium">Argumento {i + 1}</span>
                  <p className="text-sm">{a.descricaoArgumento}</p>
                  {a.reacaoJurados && <p className="text-xs text-muted-foreground">{a.reacaoJurados}</p>}
                  <ScoreBar value={a.nivelPersuasao} label="Persuasão" />
                </div>
              ))}
              <ScoreBar value={avaliacao.defesaImpactoGeral} label="Impacto Geral" />
              <FieldRow label="Dúvida Razoável Instalada" value={avaliacao.defesaDuvidaRazoavel} />
            </div>
          </SectionCard>
        </div>

        {/* Réplica e Tréplica */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SectionCard title="Réplica (MP)" icon={AlertTriangle}>
            <div className="space-y-1">
              <FieldRow label="Refutações" value={avaliacao.replicaRefutacoes} />
              <FieldRow label="Argumentos Novos" value={avaliacao.replicaArgumentosNovos} />
              <FieldRow label="Reação Geral" value={avaliacao.replicaReacaoGeral} />
              <ScoreBar value={avaliacao.replicaImpacto} label="Impacto" />
              <FieldRow label="Mudança de Opinião" value={avaliacao.replicaMudancaOpiniao} />
            </div>
          </SectionCard>

          <SectionCard title="Tréplica (Defesa)" icon={Target}>
            <div className="space-y-1">
              <FieldRow label="Refutações" value={avaliacao.treplicaRefutacoes} />
              <FieldRow label="Apelo Final" value={avaliacao.treplicaApeloFinal} />
              <FieldRow label="Reação Geral" value={avaliacao.treplicaReacaoGeral} />
              <FieldRow label="Momento Mais Impactante" value={avaliacao.treplicaMomentoImpactante} />
              <ScoreBar value={avaliacao.treplicaImpacto} label="Impacto" />
              <FieldRow label="Reconquista de Indecisos" value={avaliacao.treplicaReconquistaIndecisos} />
            </div>
          </SectionCard>
        </div>

        {/* Análise Final */}
        <SectionCard title="Análise Final" icon={BarChart3} className="print:break-before-page">
          <div className="space-y-4">
            {/* Comparativo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldRow label="Lado Mais Persuasivo" value={avaliacao.ladoMaisPersuasivo} />
                <ScoreBar value={avaliacao.impactoAcusacao} label="Impacto da Acusação" />
              </div>
              <div>
                <ScoreBar value={avaliacao.impactoDefesa} label="Impacto da Defesa" />
              </div>
            </div>

            {/* Impressões finais */}
            <div className="space-y-1">
              <FieldRow label="Impressão Final (Leiga)" value={avaliacao.impressaoFinalLeiga} />
              <FieldRow label="Argumento Mais Impactante" value={avaliacao.argumentoMaisImpactante} />
              <FieldRow label="Pontos Não Explorados" value={avaliacao.pontosNaoExplorados} />
              <FieldRow label="Clima Geral do Julgamento" value={avaliacao.climaGeralJulgamento} />
              <FieldRow label="Momentos de Virada" value={avaliacao.momentosVirada} />
              <FieldRow label="Surpresas do Julgamento" value={avaliacao.surpresasJulgamento} />
              <FieldRow label="Observações Adicionais" value={avaliacao.observacoesAdicionais} />
            </div>
          </div>
        </SectionCard>

        {/* Footer com print styling */}
        <div className="text-center text-xs text-muted-foreground py-4 print:hidden">
          Relatório gerado automaticamente pelo sistema OMBUDS — {new Date().toLocaleDateString("pt-BR")}
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          .sticky { position: static !important; }
          body { font-size: 12px; }
          .print\\:hidden { display: none !important; }
          .print\\:break-before-page { break-before: page; }
        }
      `}</style>
    </div>
  );
}
