"use client";

import { useState } from "react";
import {
  FileText,
  Users,
  GitCompareArrows,
  MessageCircleQuestion,
  Shield,
  UserCheck,
  Clock,
  MapPin,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Check,
  Square,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";

/* ═══════════════════════════════════════════════════════════════════════════
   TYPOGRAPHY SCALE (harmonic, systematic hierarchy)
   ─────────────────────────────────────────────────
   Block header:  13px  uppercase tracking-widest semibold  (BlockShell title)
   Section label: 10px  uppercase tracking-widest semibold  (SectionLabel)
   Item title:    14px  font-medium                         (text-sm)
   Highlight:     15px  font-medium                         (tese principal)
   Body:          13px  leading-relaxed                     (all paragraphs)
   Caption/meta:  11px  font-mono or font-medium            (dates, sources)
   Badge:         10px  font-medium                         (status pills)
   Micro:          9px  font-medium                         (count badges)
   ═══════════════════════════════════════════════════════════════════════════ */

const T = {
  body: "text-[13px] leading-relaxed",
  title: "text-sm font-medium",
  highlight: "text-[15px] font-medium",
  caption: "text-[11px]",
  badge: "text-[10px] font-medium",
  micro: "text-[9px] font-medium",
} as const;

// ─── Shared Types ──────────────────────────────────────────────────────────

interface CronologiaItem {
  data: string;
  evento: string;
  fonte: string;
  relevancia: string;
}

interface FatoRelacionado {
  descricao: string;
  conexaoComCaso: string;
  fonte: string;
}

interface CasoData {
  resumoFato: string;
  narrativaDenuncia: string;
  narrativaDefensiva: string;
  cronologia: CronologiaItem[];
  fatosRelacionados: FatoRelacionado[];
}

interface Antecedente {
  processo: string;
  crime: string;
  resultado: string;
}

interface PerfilReu {
  historico: string;
  contextoSocial: string;
  antecedentes: Antecedente[];
  condicoesAtenuantes: string[];
  versaoDosFatos: string;
}

interface PerfilVitima {
  relacaoComReu: string;
  historico: string;
  comportamentoRelatado: string;
  credibilidade: string;
}

interface Depoente {
  nome: string;
  tipo: "ACUSACAO" | "DEFESA" | "INFORMANTE" | "VITIMA" | "PERITO";
  statusIntimacao:
    | "INTIMADO"
    | "NAO_INTIMADO"
    | "DESISTIDO"
    | "PENDENTE"
    | "FALECIDO"
    | "NAO_LOCALIZADO";
  perfil: string;
  versaoDelegacia: string;
  versaoJuizo: string;
  contradicoes: string[];
  pontosFortes: string[];
  pontosFracos: string[];
  perguntasSugeridas: string[];
  credibilidade: string;
}

interface Informante {
  fonte: string;
  conteudo: string;
  relevancia: string;
}

interface PessoasData {
  perfilReu: PerfilReu;
  perfilVitima: PerfilVitima;
  depoentes: Depoente[];
  informantes: Informante[];
}

interface ProvaItem {
  tipo: string;
  descricao: string;
  relevancia: string;
  favoravel: boolean;
}

interface ProvasData {
  provasAcusacao: ProvaItem[];
  provasDefesa: ProvaItem[];
  pericias: ProvaItem[];
  lacunas: string[];
}

interface TesePrincipal {
  tese: string;
  fundamentoJuridico: string;
  fundamentoFatico: string;
  elementosQueCorroboram: string[];
  pontosVulneraveis: string[];
}

interface TeseSubsidiaria {
  tese: string;
  fundamento: string;
  quandoUsar: string;
}

interface Nulidade {
  tipo: string;
  descricao: string;
  fundamentacao: string;
  severidade: "alta" | "media" | "baixa";
}

interface MatrizGuerraItem {
  fato: string;
  versaoAcusacao: string;
  versaoDefesa: string;
  elementosDeProva: string[];
  contradicoes: string[];
  estrategia: string;
}

interface EstrategiaData {
  tesePrincipal: TesePrincipal;
  tesesSubsidiarias: TeseSubsidiaria[];
  nulidades: Nulidade[];
  matrizGuerra: MatrizGuerraItem[];
}

interface PontoCritico {
  ponto: string;
  risco: string;
  mitigacao: string;
}

interface PreparacaoData {
  orientacaoAoAssistido: string;
  pontosCriticos: PontoCritico[];
}

interface PainelDepoente {
  nome: string;
  papel: string;
  delegacia: { presente: boolean; data?: string } | null;
  juizo: { presente: boolean; data?: string } | null;
  statusIntimacao:
    | "intimado"
    | "em_curso"
    | "frustrada"
    | "sem_diligencia"
    | "dispensado";
}

interface DepoimentoComparado {
  ponto: string;
  delegacia: string;
  juizo: string;
  convergencia: boolean;
}

interface AlertaOperacional {
  tipo: "risco" | "atencao" | "info" | "positivo";
  texto: string;
}

export interface AnalysisBlocksData {
  caso: CasoData;
  pessoas: PessoasData;
  provas: ProvasData;
  estrategia: EstrategiaData;
  operacional: PreparacaoData;
  painelDepoentes?: PainelDepoente[];
  depoimentosComparados?: DepoimentoComparado[];
  alertasOperacionais?: AlertaOperacional[];
  checklistTatico?: string[];
}

// ─── Shared Primitives ────────────────────────────────────────────────────

function BlockShell({
  value,
  icon: Icon,
  title,
  count,
  children,
}: {
  value: string;
  icon: React.ElementType;
  title: string;
  count?: number | string;
  children: React.ReactNode;
}) {
  return (
    <AccordionItem value={value} className="border-none mb-3">
      <AccordionTrigger className="bg-neutral-100/60 dark:bg-white/[0.04] border border-neutral-200/80 dark:border-white/[0.06] rounded-xl px-4 py-3 hover:no-underline hover:bg-neutral-100 dark:hover:bg-white/[0.07] transition-all duration-200 data-[state=open]:rounded-b-none data-[state=open]:border-b-neutral-200/50 dark:data-[state=open]:border-b-white/[0.04]">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-7 h-7 rounded-lg bg-neutral-800 dark:bg-neutral-700 flex items-center justify-center shrink-0">
            <Icon className="w-3.5 h-3.5 text-white dark:text-neutral-300" />
          </div>
          <span className="text-[13px] font-semibold uppercase tracking-widest text-neutral-800 dark:text-neutral-200">{title}</span>
          {count != null && (
            <span className={cn(T.micro, "text-neutral-500 dark:text-neutral-400 bg-neutral-200/80 dark:bg-white/10 px-2 py-0.5 rounded-full")}>
              {count}
            </span>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent className="bg-white dark:bg-neutral-900/80 border border-t-0 border-neutral-200/80 dark:border-white/[0.06] rounded-b-xl px-5 pb-5 pt-1">
        {children}
      </AccordionContent>
    </AccordionItem>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <p className={cn(T.body, "text-muted-foreground py-6 text-center")}>
      Analise este caso para gerar {label}.
    </p>
  );
}

function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("text-[10px] uppercase tracking-widest font-semibold text-neutral-400 dark:text-neutral-500", className)}>
      {children}
    </span>
  );
}

function QuoteBlock({
  label,
  children,
  color = "emerald",
}: {
  label: string;
  children: React.ReactNode;
  color?: "emerald" | "red" | "amber" | "blue";
}) {
  const styles = {
    emerald: { border: "border-emerald-500/40", label: "text-emerald-600 dark:text-emerald-400" },
    red:     { border: "border-red-500/40",     label: "text-red-600 dark:text-red-400" },
    amber:   { border: "border-amber-500/40",   label: "text-amber-600 dark:text-amber-400" },
    blue:    { border: "border-blue-500/40",     label: "text-blue-600 dark:text-blue-400" },
  };

  return (
    <div className={cn("border-l-2 pl-4 py-0.5", styles[color].border)}>
      <span className={cn("text-[10px] uppercase tracking-widest font-semibold", styles[color].label)}>
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function SubRow({
  label,
  count,
  children,
}: {
  label: string;
  count?: number | string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full bg-neutral-50 dark:bg-[#0f0f11] border border-neutral-200/60 dark:border-neutral-800 rounded-lg p-3 mb-1.5 cursor-pointer flex justify-between items-center hover:bg-neutral-100 dark:hover:bg-neutral-800/50 transition-colors">
        <span className={cn(T.title, "text-neutral-700 dark:text-neutral-300")}>{label}</span>
        <div className="flex items-center gap-2">
          {count != null && (
            <span className={cn(T.badge, "text-neutral-400 dark:text-neutral-500 bg-neutral-200/80 dark:bg-neutral-700 px-2 py-0.5 rounded-full")}>
              {count}
            </span>
          )}
          {open ? (
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-1 pb-2">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── Helper: badge classes ────────────────────────────────────────────────

function tipoTextClass(tipo: Depoente["tipo"]): string {
  switch (tipo) {
    case "ACUSACAO":   return "text-red-500 dark:text-red-400";
    case "DEFESA":     return "text-emerald-500 dark:text-emerald-400";
    case "VITIMA":     return "text-amber-500 dark:text-amber-400";
    case "PERITO":     return "text-blue-500 dark:text-blue-400";
    default:           return "text-neutral-500 dark:text-neutral-400";
  }
}

function tipoLabel(tipo: Depoente["tipo"]): string {
  switch (tipo) {
    case "ACUSACAO":   return "Acusação";
    case "DEFESA":     return "Defesa";
    case "VITIMA":     return "Vítima";
    case "PERITO":     return "Perito";
    case "INFORMANTE": return "Informante";
    default:           return tipo;
  }
}

function statusDotColor(status: Depoente["statusIntimacao"]): string {
  switch (status) {
    case "INTIMADO":       return "bg-emerald-500";
    case "PENDENTE":
    case "NAO_INTIMADO":   return "bg-amber-500";
    case "NAO_LOCALIZADO":
    case "FALECIDO":       return "bg-red-500";
    case "DESISTIDO":      return "bg-neutral-400";
    default:               return "bg-neutral-400";
  }
}

function statusLabel(status: Depoente["statusIntimacao"]): string {
  const labels: Record<string, string> = {
    INTIMADO: "Intimado",
    PENDENTE: "Pendente",
    NAO_INTIMADO: "Não intimado",
    NAO_LOCALIZADO: "Não localizado",
    FALECIDO: "Falecido",
    DESISTIDO: "Desistido",
  };
  return labels[status] ?? status.replace(/_/g, " ").toLowerCase();
}

function StatusDot({ status }: { status: Depoente["statusIntimacao"] }) {
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <div className={cn("w-1.5 h-1.5 rounded-full", statusDotColor(status))} />
      <span className={cn(T.caption, "text-neutral-500 dark:text-neutral-400")}>{statusLabel(status)}</span>
    </div>
  );
}

function severidadeBadgeClass(sev: "alta" | "media" | "baixa"): string {
  switch (sev) {
    case "alta":  return "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20";
    case "media": return "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20";
    case "baixa": return "bg-neutral-100 dark:bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-500/20";
  }
}

function v3StatusIcon(status: PainelDepoente["statusIntimacao"]) {
  switch (status) {
    case "intimado":       return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
    case "em_curso":       return <Clock className="w-3.5 h-3.5 text-amber-500" />;
    case "frustrada":      return <XCircle className="w-3.5 h-3.5 text-red-500" />;
    case "sem_diligencia": return <AlertTriangle className="w-3.5 h-3.5 text-neutral-500" />;
    case "dispensado":     return <XCircle className="w-3.5 h-3.5 text-neutral-400" />;
    default:               return <AlertTriangle className="w-3.5 h-3.5 text-neutral-500" />;
  }
}

function alertaColor(tipo: AlertaOperacional["tipo"]): "red" | "amber" | "blue" | "emerald" {
  switch (tipo) {
    case "risco":    return "red";
    case "atencao":  return "amber";
    case "info":     return "blue";
    case "positivo": return "emerald";
  }
}

function alertaLabel(tipo: AlertaOperacional["tipo"]): string {
  switch (tipo) {
    case "risco":    return "Risco";
    case "atencao":  return "Atenção";
    case "info":     return "Informação";
    case "positivo": return "Favorável";
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOCKS
// ═══════════════════════════════════════════════════════════════════════════

// ─── Block 1: Resumo Executivo ────────────────────────────────────────────

export function BlocoResumo({ data }: { data: AnalysisBlocksData }) {
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  const hasContent =
    data.caso?.resumoFato ||
    data.caso?.narrativaDefensiva ||
    data.alertasOperacionais?.length ||
    data.checklistTatico?.length;

  if (!hasContent) return (
    <BlockShell value="resumo" icon={FileText} title="Resumo Executivo">
      <EmptyState label="o resumo executivo" />
    </BlockShell>
  );

  const toggleCheck = (index: number) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <BlockShell
      value="resumo"
      icon={FileText}
      title="Resumo Executivo"
      count={data.alertasOperacionais?.length ? `${data.alertasOperacionais.length} alertas` : undefined}
    >
      {/* Resumo do fato */}
      {data.caso?.resumoFato && (
        <p className={cn(T.body, "text-neutral-600 dark:text-neutral-400 mb-5")}>
          {data.caso.resumoFato}
        </p>
      )}

      {/* Narrativa defensiva */}
      {data.caso?.narrativaDefensiva && (
        <div className="mb-5">
          <QuoteBlock label="Narrativa defensiva" color="emerald">
            <p className={cn(T.body, "text-neutral-600 dark:text-neutral-400 italic")}>
              {data.caso.narrativaDefensiva}
            </p>
          </QuoteBlock>
        </div>
      )}

      {/* Alertas operacionais */}
      {data.alertasOperacionais && data.alertasOperacionais.length > 0 && (
        <div className="space-y-3 mb-5">
          <SectionLabel>Alertas operacionais</SectionLabel>
          {data.alertasOperacionais.map((alerta, i) => (
            <QuoteBlock key={i} label={alertaLabel(alerta.tipo)} color={alertaColor(alerta.tipo)}>
              <p className={cn(T.body, "text-neutral-700 dark:text-neutral-300")}>
                {alerta.texto}
              </p>
            </QuoteBlock>
          ))}
        </div>
      )}

      {/* Checklist tático — interactive */}
      {data.checklistTatico && data.checklistTatico.length > 0 && (
        <div className="space-y-1.5">
          <SectionLabel>Checklist tático</SectionLabel>
          {data.checklistTatico.map((item, i) => {
            const isChecked = checkedItems.has(i);
            return (
              <button
                key={i}
                onClick={() => toggleCheck(i)}
                className={cn(
                  "flex items-start gap-3 py-2 px-3 w-full text-left rounded-lg transition-colors",
                  isChecked
                    ? "bg-emerald-50/50 dark:bg-emerald-500/5"
                    : "hover:bg-neutral-50 dark:hover:bg-white/[0.02]"
                )}
              >
                <div className={cn(
                  "w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                  isChecked
                    ? "bg-emerald-500 border-emerald-500"
                    : "border-neutral-300 dark:border-neutral-600"
                )}>
                  {isChecked && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className={cn(
                  T.body,
                  "transition-colors",
                  isChecked
                    ? "text-neutral-400 dark:text-neutral-500 line-through"
                    : "text-neutral-700 dark:text-neutral-300"
                )}>
                  {item}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </BlockShell>
  );
}

// ─── Block 2: Painel de Depoentes ─────────────────────────────────────────

export function BlocoPainelDepoentes({ data }: { data: AnalysisBlocksData }) {
  const hasV3 = data.painelDepoentes && data.painelDepoentes.length > 0;
  const hasV2 = data.pessoas?.depoentes && data.pessoas.depoentes.length > 0;

  if (!hasV3 && !hasV2) return (
    <BlockShell value="depoentes" icon={Users} title="Painel de Depoentes">
      <EmptyState label="o painel de depoentes" />
    </BlockShell>
  );

  const count = hasV3 ? data.painelDepoentes!.length : data.pessoas.depoentes.length;

  return (
    <BlockShell value="depoentes" icon={Users} title="Painel de Depoentes" count={`${count} depoentes`}>
      {hasV3 ? (
        <div className="space-y-2">
          {data.painelDepoentes!.map((dep, i) => (
            <div key={i} className="bg-neutral-50 dark:bg-[#0f0f11] border border-neutral-200/60 dark:border-neutral-800 rounded-xl p-4">
              <span className={cn(T.title, "text-neutral-800 dark:text-neutral-200 truncate block")}>{dep.nome}</span>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={cn(T.caption, "uppercase tracking-widest font-semibold text-neutral-400 dark:text-neutral-500")}>
                  {dep.papel}
                </span>
                <span className="text-neutral-300 dark:text-neutral-600">·</span>
                <div className="flex items-center gap-1.5">
                  {v3StatusIcon(dep.statusIntimacao)}
                  <span className={cn(T.caption, "text-neutral-500 dark:text-neutral-400 capitalize")}>{dep.statusIntimacao.replace(/_/g, " ")}</span>
                </div>
                {(dep.delegacia?.presente || dep.juizo?.presente) && (
                  <>
                    <span className="text-neutral-300 dark:text-neutral-600">·</span>
                    {dep.delegacia?.presente && (
                      <span className={cn(T.caption, "text-neutral-400")}>
                        Deleg. <span className="text-emerald-500 font-medium">{dep.delegacia.data || "✓"}</span>
                      </span>
                    )}
                    {dep.juizo?.presente && (
                      <span className={cn(T.caption, "text-neutral-400")}>
                        Juízo <span className="text-emerald-500 font-medium">{dep.juizo.data || "✓"}</span>
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {data.pessoas.depoentes.map((dep, i) => (
            <div key={i} className="bg-neutral-50 dark:bg-[#0f0f11] border border-neutral-200/60 dark:border-neutral-800 rounded-xl p-4">
              <span className={cn(T.title, "text-neutral-800 dark:text-neutral-200 truncate block")}>{dep.nome}</span>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={cn(T.caption, "uppercase tracking-widest font-semibold text-neutral-400 dark:text-neutral-500")}>
                  {tipoLabel(dep.tipo)}
                </span>
                <span className="text-neutral-300 dark:text-neutral-600">·</span>
                <StatusDot status={dep.statusIntimacao} />
              </div>
            </div>
          ))}
        </div>
      )}
    </BlockShell>
  );
}

// ─── Block 3: Depoimentos Comparados ──────────────────────────────────────

export function BlocoDepoimentosComparados({ data }: { data: AnalysisBlocksData }) {
  const hasV3 = data.depoimentosComparados && data.depoimentosComparados.length > 0;
  const v2Depoentes = data.pessoas?.depoentes?.filter(
    (d) => d.versaoDelegacia && d.versaoJuizo
  ) ?? [];
  const hasV2 = v2Depoentes.length > 0;

  if (!hasV3 && !hasV2) return (
    <BlockShell value="comparados" icon={GitCompareArrows} title="Depoimentos Comparados">
      <EmptyState label="a comparação de depoimentos" />
    </BlockShell>
  );

  return (
    <BlockShell
      value="comparados"
      icon={GitCompareArrows}
      title="Depoimentos Comparados"
      count={hasV3 ? `${data.depoimentosComparados!.length} pontos` : `${v2Depoentes.length} depoentes`}
    >
      {/* Column header */}
      <div className="grid grid-cols-[1fr_1px_1fr] gap-4 mb-3 px-1">
        <SectionLabel>Delegacia</SectionLabel>
        <div />
        <SectionLabel>Juízo</SectionLabel>
      </div>

      {hasV3 ? (
        <div className="space-y-3">
          {data.depoimentosComparados!.map((comp, i) => (
            <div key={i} className="bg-neutral-50 dark:bg-[#0f0f11] border border-neutral-200/60 dark:border-neutral-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                {comp.convergencia ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                )}
                <span className={cn(T.title, "text-neutral-800 dark:text-neutral-200")}>{comp.ponto}</span>
              </div>
              <div className="grid grid-cols-[1fr_1px_1fr] gap-4">
                <p className={cn(T.body, "text-neutral-600 dark:text-neutral-400")}>{comp.delegacia}</p>
                <div className="bg-neutral-200 dark:bg-neutral-700" />
                <p className={cn(T.body, "text-neutral-600 dark:text-neutral-400")}>{comp.juizo}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {v2Depoentes.map((dep, i) => (
            <SubRow key={i} label={dep.nome}>
              <div className="grid grid-cols-[1fr_1px_1fr] gap-4">
                <p className={cn(T.body, "text-neutral-600 dark:text-neutral-400")}>{dep.versaoDelegacia}</p>
                <div className="bg-neutral-200 dark:bg-neutral-700" />
                <p className={cn(T.body, "text-neutral-600 dark:text-neutral-400")}>{dep.versaoJuizo}</p>
              </div>
              {dep.contradicoes?.length > 0 && (
                <div className="mt-3">
                  <QuoteBlock label="Contradições" color="red">
                    {dep.contradicoes.map((c, j) => (
                      <p key={j} className={cn(T.body, "text-red-600 dark:text-red-400/80")}>{c}</p>
                    ))}
                  </QuoteBlock>
                </div>
              )}
            </SubRow>
          ))}
        </div>
      )}
    </BlockShell>
  );
}

// ─── Block 4: Perguntas Estratégicas ──────────────────────────────────────

export function BlocoPerguntasEstrategicas({ data }: { data: AnalysisBlocksData }) {
  const depoentesComPerguntas = data.pessoas?.depoentes?.filter(
    (d) => d.perguntasSugeridas?.length > 0
  ) ?? [];

  if (depoentesComPerguntas.length === 0) return (
    <BlockShell value="perguntas" icon={MessageCircleQuestion} title="Perguntas Estratégicas">
      <EmptyState label="as perguntas estratégicas" />
    </BlockShell>
  );

  const totalPerguntas = depoentesComPerguntas.reduce(
    (sum, d) => sum + d.perguntasSugeridas.length,
    0
  );

  return (
    <BlockShell
      value="perguntas"
      icon={MessageCircleQuestion}
      title="Perguntas Estratégicas"
      count={`${totalPerguntas} perguntas`}
    >
      <div className="space-y-2">
        {depoentesComPerguntas.map((dep, i) => (
          <SubRow key={i} label={dep.nome} count={dep.perguntasSugeridas.length}>
            <ol className="space-y-2.5 pl-1">
              {dep.perguntasSugeridas.map((p, j) => (
                <li key={j} className="flex items-start gap-3">
                  <span className="text-[10px] font-mono font-bold text-neutral-300 dark:text-neutral-600 mt-0.5 shrink-0 w-4 text-right">
                    {j + 1}.
                  </span>
                  <span className={cn(T.body, "text-neutral-600 dark:text-neutral-400")}>
                    {p}
                  </span>
                </li>
              ))}
            </ol>
          </SubRow>
        ))}
      </div>
    </BlockShell>
  );
}

// ─── Block 5: Teses ───────────────────────────────────────────────────────

export function BlocoTeses({ data }: { data: AnalysisBlocksData }) {
  const est = data.estrategia;
  const hasContent =
    est?.tesePrincipal ||
    est?.tesesSubsidiarias?.length > 0 ||
    est?.nulidades?.length > 0 ||
    est?.matrizGuerra?.length > 0;

  if (!hasContent) return (
    <BlockShell value="teses" icon={Shield} title="Teses">
      <EmptyState label="as teses de defesa" />
    </BlockShell>
  );

  return (
    <BlockShell
      value="teses"
      icon={Shield}
      title="Teses"
      count={[
        est.tesePrincipal ? est.tesePrincipal.tese : null,
        est.nulidades?.length ? `${est.nulidades.length} nulidades` : null,
      ].filter(Boolean).join(" · ") || undefined}
    >
      {/* Tese principal */}
      {est.tesePrincipal && (
        <div className="bg-gradient-to-br from-emerald-500/5 to-emerald-500/[0.02] border border-emerald-500/15 rounded-xl p-5 mb-4">
          <SectionLabel className="text-emerald-600 dark:text-emerald-400">
            Tese principal
          </SectionLabel>
          <p className={cn(T.highlight, "text-neutral-900 dark:text-neutral-100 mt-2 leading-snug")}>
            {est.tesePrincipal.tese}
          </p>
          {est.tesePrincipal.fundamentoFatico && (
            <div className="mt-3">
              <span className={cn(T.caption, "font-semibold text-neutral-800 dark:text-neutral-200")}>Fático</span>
              <p className={cn(T.body, "text-neutral-500 mt-0.5")}>
                {est.tesePrincipal.fundamentoFatico}
              </p>
            </div>
          )}
          {est.tesePrincipal.fundamentoJuridico && (
            <div className="mt-2">
              <span className={cn(T.caption, "font-semibold text-neutral-800 dark:text-neutral-200")}>Jurídico</span>
              <p className={cn(T.body, "text-neutral-500 mt-0.5")}>
                {est.tesePrincipal.fundamentoJuridico}
              </p>
            </div>
          )}
          {est.tesePrincipal.elementosQueCorroboram?.length > 0 && (
            <div className="mt-3">
              <SectionLabel className="text-emerald-600/70 dark:text-emerald-400/70">Corrobora</SectionLabel>
              <ul className="mt-1 space-y-1">
                {est.tesePrincipal.elementosQueCorroboram.map((el, i) => (
                  <li key={i} className={cn(T.body, "text-emerald-600/70 dark:text-emerald-400/60 pl-3 border-l border-emerald-500/20")}>
                    {el}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Teses subsidiárias */}
      {est.tesesSubsidiarias?.length > 0 && (
        <SubRow label="Teses subsidiárias" count={est.tesesSubsidiarias.length}>
          <div className="space-y-2">
            {est.tesesSubsidiarias.map((ts, i) => (
              <div key={i} className="bg-neutral-50 dark:bg-neutral-800/40 rounded-lg p-4">
                <p className={cn(T.title, "text-neutral-700 dark:text-neutral-300")}>{ts.tese}</p>
                <p className={cn(T.body, "text-neutral-500 mt-1.5")}>{ts.fundamento}</p>
                <p className={cn(T.body, "text-neutral-500 mt-1")}>
                  <span className="font-medium text-neutral-600 dark:text-neutral-400">Quando usar:</span> {ts.quandoUsar}
                </p>
              </div>
            ))}
          </div>
        </SubRow>
      )}

      {/* Nulidades */}
      {est.nulidades?.length > 0 && (
        <SubRow label="Nulidades" count={est.nulidades.length}>
          <div className="space-y-2">
            {est.nulidades.map((n, i) => (
              <div key={i} className="bg-neutral-50 dark:bg-neutral-800/40 rounded-lg p-4">
                <div className="flex items-center gap-2.5">
                  <span className={cn(T.title, "text-neutral-700 dark:text-neutral-300")}>{n.tipo}</span>
                  <span className={cn(T.badge, "px-2 py-0.5 rounded-md", severidadeBadgeClass(n.severidade))}>
                    {n.severidade.toUpperCase()}
                  </span>
                </div>
                <p className={cn(T.body, "text-neutral-500 mt-1.5")}>{n.descricao}</p>
                <p className={cn(T.body, "text-neutral-500 mt-1")}>
                  <span className="font-medium text-neutral-600 dark:text-neutral-400">Fundamentação:</span> {n.fundamentacao}
                </p>
              </div>
            ))}
          </div>
        </SubRow>
      )}

      {/* Matriz de guerra */}
      {est.matrizGuerra?.length > 0 && (
        <SubRow label="Matriz de guerra" count={est.matrizGuerra.length}>
          <div className="space-y-3">
            {est.matrizGuerra.map((m, i) => (
              <div key={i} className="bg-neutral-50 dark:bg-[#0f0f11] border border-neutral-200/60 dark:border-neutral-800 rounded-xl p-4">
                <p className={cn(T.title, "text-neutral-800 dark:text-neutral-200 mb-3")}>{m.fato}</p>
                <div className="grid grid-cols-[1fr_1px_1fr] gap-4">
                  <div>
                    <SectionLabel className="text-red-500 dark:text-red-400/60">Acusação</SectionLabel>
                    <p className={cn(T.body, "text-neutral-500 mt-1")}>{m.versaoAcusacao}</p>
                  </div>
                  <div className="bg-neutral-200 dark:bg-neutral-700" />
                  <div>
                    <SectionLabel className="text-emerald-500 dark:text-emerald-400/60">Defesa</SectionLabel>
                    <p className={cn(T.body, "text-neutral-500 mt-1")}>{m.versaoDefesa}</p>
                  </div>
                </div>
                {m.elementosDeProva?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-neutral-200/60 dark:border-neutral-800">
                    <SectionLabel>Provas</SectionLabel>
                    <p className={cn(T.body, "text-neutral-500 mt-0.5")}>{m.elementosDeProva.join(" · ")}</p>
                  </div>
                )}
                {m.contradicoes?.length > 0 && (
                  <div className="mt-2">
                    <QuoteBlock label="Contradições" color="amber">
                      {m.contradicoes.map((c, j) => (
                        <p key={j} className={cn(T.body, "text-amber-600 dark:text-amber-400/70")}>{c}</p>
                      ))}
                    </QuoteBlock>
                  </div>
                )}
              </div>
            ))}
          </div>
        </SubRow>
      )}
    </BlockShell>
  );
}

// ─── Block 6: Orientação ──────────────────────────────────────────────────

export function BlocoOrientacao({ data }: { data: AnalysisBlocksData }) {
  const op = data.operacional;
  const hasContent = op?.orientacaoAoAssistido || op?.pontosCriticos?.length > 0;

  if (!hasContent) return (
    <BlockShell value="orientacao" icon={UserCheck} title="Orientação ao Assistido">
      <EmptyState label="a orientação ao assistido" />
    </BlockShell>
  );

  return (
    <BlockShell
      value="orientacao"
      icon={UserCheck}
      title="Orientação ao Assistido"
      count={op.pontosCriticos?.length ? `${op.pontosCriticos.length} pontos críticos` : undefined}
    >
      {op.orientacaoAoAssistido && (
        <p className={cn(T.body, "text-neutral-600 dark:text-neutral-400 mb-5")}>
          {op.orientacaoAoAssistido}
        </p>
      )}

      {op.pontosCriticos?.length > 0 && (
        <div className="space-y-3">
          <SectionLabel>Pontos críticos</SectionLabel>
          {op.pontosCriticos.map((pc, i) => (
            <div key={i} className="bg-neutral-50 dark:bg-[#0f0f11] border border-neutral-200/60 dark:border-neutral-800 rounded-xl p-4">
              <p className={cn(T.title, "text-neutral-800 dark:text-neutral-200")}>{pc.ponto}</p>
              <div className="mt-2 space-y-2">
                <QuoteBlock label="Risco" color="red">
                  <p className={cn(T.body, "text-neutral-600 dark:text-neutral-400")}>{pc.risco}</p>
                </QuoteBlock>
                <QuoteBlock label="Mitigação" color="emerald">
                  <p className={cn(T.body, "text-neutral-600 dark:text-neutral-400")}>{pc.mitigacao}</p>
                </QuoteBlock>
              </div>
            </div>
          ))}
        </div>
      )}
    </BlockShell>
  );
}

// ─── Block 7: Cronologia ──────────────────────────────────────────────────

export function BlocoCronologia({ data }: { data: AnalysisBlocksData }) {
  const cronologia = data.caso?.cronologia;
  const hasContent = cronologia && cronologia.length > 0;

  if (!hasContent) return (
    <BlockShell value="cronologia" icon={Clock} title="Cronologia">
      <EmptyState label="a cronologia dos fatos" />
    </BlockShell>
  );

  return (
    <BlockShell value="cronologia" icon={Clock} title="Cronologia" count={`${cronologia.length} eventos`}>
      <div className="relative ml-3">
        <div className="absolute left-0 top-2 bottom-2 w-px bg-neutral-200 dark:bg-neutral-700" />
        <div className="space-y-5">
          {cronologia.map((item, i) => (
            <div key={i} className="relative pl-6">
              <div className="absolute left-[-3px] top-1.5 w-[7px] h-[7px] rounded-full bg-neutral-400 dark:bg-neutral-500 ring-2 ring-white dark:ring-neutral-900" />
              <div>
                <span className={cn(T.caption, "uppercase tracking-wider text-neutral-400 font-mono font-bold")}>
                  {item.data}
                </span>
                <p className={cn(T.body, "text-neutral-700 dark:text-neutral-300 mt-1")}>
                  {item.evento}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  {item.fonte && (
                    <span className={cn(T.caption, "text-neutral-400 font-medium")}>via {item.fonte}</span>
                  )}
                  {item.relevancia && (
                    <span className={cn(T.caption, "text-neutral-300 dark:text-neutral-600")}>{item.relevancia}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </BlockShell>
  );
}

// ─── Block 8: Mapa Investigativo ──────────────────────────────────────────

export function BlocoMapa({ data }: { data: AnalysisBlocksData }) {
  return (
    <BlockShell value="mapa" icon={MapPin} title="Mapa Investigativo">
      <p className={cn(T.body, "text-muted-foreground py-6 text-center")}>
        Mapa investigativo será disponibilizado em breve.
      </p>
    </BlockShell>
  );
}
