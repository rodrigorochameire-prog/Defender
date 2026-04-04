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
  CheckSquare,
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
  confiabilidade: string;
  informacoesRelevantes: string[];
  conexaoComCaso: string;
}

interface PessoasData {
  perfilReu: PerfilReu;
  perfilVitima: PerfilVitima;
  depoentes: Depoente[];
  informantes: Informante[];
}

interface ElementoInquisitorial {
  tipo: string;
  descricao: string;
  origem: string;
  peso: "alto" | "medio" | "baixo";
  contestavel: boolean;
  argumento: string;
}

interface ElementoProbatorio {
  tipo: string;
  descricao: string;
  origem: string;
  peso: "alto" | "medio" | "baixo";
  favoravel: boolean;
  contestavel: boolean;
}

interface ProvaPericial {
  tipo: string;
  perito: string;
  conclusao: string;
  pontoCritico: string;
  contestacao: string;
}

interface ProvaDocumental {
  documento: string;
  conteudo: string;
  relevancia: string;
  favoravel: boolean;
}

interface InformativoInvestigacao {
  fonte: string;
  dataApuracao: string;
  conteudo: string;
  informacoesRelevantes: string[];
  credibilidade: string;
}

interface PossibilidadeProbatoria {
  diligencia: string;
  objetivo: string;
  fundamento: string;
  urgencia: "alta" | "media" | "baixa";
}

interface ProvasData {
  elementosInquisitoriais: ElementoInquisitorial[];
  elementosProbatorios: ElementoProbatorio[];
  provasPericiais: ProvaPericial[];
  provasDocumentais: ProvaDocumental[];
  informativosInvestigacao: InformativoInvestigacao[];
  possibilidadesProbatorias: PossibilidadeProbatoria[];
}

interface TesePrincipal {
  tese: string;
  fundamentoFatico: string;
  fundamentoJuridico: string;
  elementosQueCorroboram: string[];
}

interface TeseSubsidiaria {
  tese: string;
  fundamento: string;
  quandoUsar: string;
}

interface Nulidade {
  tipo: string;
  descricao: string;
  severidade: "alta" | "media" | "baixa";
  fundamentacao: string;
}

interface Qualificadora {
  tipo: string;
  imputada: boolean;
  contestavel: boolean;
  argumento: string;
}

interface PontoForte {
  ponto: string;
  elementos: string[];
}

interface PontoFracoDefesa {
  ponto: string;
  mitigacao: string;
}

interface PontoFracoAcusacao {
  ponto: string;
  comoExplorar: string;
}

interface MatrizGuerra {
  fato: string;
  versaoAcusacao: string;
  versaoDefesa: string;
  elementosDeProva: string[];
  contradicoes: string[];
}

interface EstrategiaData {
  tesePrincipal: TesePrincipal;
  tesesSubsidiarias: TeseSubsidiaria[];
  nulidades: Nulidade[];
  qualificadoras: Qualificadora[];
  pontosFortes: {
    defesa: PontoForte[];
    acusacao: PontoForte[];
  };
  pontosFracos: {
    defesa: PontoFracoDefesa[];
    acusacao: PontoFracoAcusacao[];
  };
  matrizGuerra: MatrizGuerra[];
}

interface Quesito {
  texto: string;
  estrategia: string;
}

interface InfoAtendimento {
  data: string;
  conteudo: string;
  relevanciaParaCaso: string;
}

interface PontoCritico {
  ponto: string;
  risco: string;
  mitigacao: string;
}

interface PreparacaoData {
  quesitos: Quesito[];
  orientacaoAoAssistido: string;
  informacoesAtendimento: InfoAtendimento[];
  pontosCriticos: PontoCritico[];
}

// ─── v3 rich fields ───────────────────────────────────────────────────────

interface PainelDepoente {
  nome: string;
  papel: string;
  delegacia?: { presente: boolean; data?: string };
  juizo?: { presente: boolean; data?: string };
  plenario?: string;
  statusIntimacao: "intimado" | "em_curso" | "frustrada" | "sem_diligencia" | "dispensado";
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

// Export the full analysis shape
export interface AnalysisBlocksData {
  caso: CasoData;
  pessoas: PessoasData;
  provas: ProvasData;
  estrategia: EstrategiaData;
  operacional: PreparacaoData;
  // v3 rich fields (optional)
  painelDepoentes?: PainelDepoente[];
  depoimentosComparados?: DepoimentoComparado[];
  alertasOperacionais?: AlertaOperacional[];
  checklistTatico?: string[];
}

// ─── Shared Block Shell ────────────────────────────────────────────────────

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
          <span className="text-[13px] font-bold uppercase tracking-wide text-neutral-900 dark:text-neutral-100">{title}</span>
          {count != null && (
            <span className="text-[9px] font-medium text-neutral-500 dark:text-neutral-400 bg-neutral-200/80 dark:bg-white/10 px-2 py-0.5 rounded-full">
              {count}
            </span>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent className="bg-white dark:bg-neutral-900/80 border border-t-0 border-neutral-200/80 dark:border-white/[0.06] rounded-b-xl px-4 pb-4">
        {children}
      </AccordionContent>
    </AccordionItem>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <p className="text-xs text-muted-foreground py-4 text-center">
      Analise este caso para gerar {label}.
    </p>
  );
}

// ─── Collapsible Sub-Row ──────────────────────────────────────────────────

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
      <CollapsibleTrigger className="w-full bg-neutral-100 dark:bg-[#0f0f11] rounded-lg p-2.5 mb-1.5 cursor-pointer flex justify-between items-center hover:bg-neutral-200/70 dark:hover:bg-neutral-800/50 transition-colors">
        <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">{label}</span>
        <div className="flex items-center gap-2">
          {count != null && (
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 bg-neutral-200 dark:bg-neutral-700 px-2 py-0.5 rounded-full">
              {count}
            </span>
          )}
          {open ? (
            <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />
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

function tipoBadgeClass(tipo: Depoente["tipo"]): string {
  switch (tipo) {
    case "ACUSACAO":
      return "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400";
    case "DEFESA":
      return "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    case "VITIMA":
      return "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400";
    case "PERITO":
      return "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400";
    case "INFORMANTE":
      return "bg-neutral-100 dark:bg-neutral-500/10 text-neutral-600 dark:text-neutral-400";
    default:
      return "bg-neutral-100 dark:bg-neutral-500/10 text-neutral-600 dark:text-neutral-400";
  }
}

function statusBadgeClass(status: Depoente["statusIntimacao"]): string {
  switch (status) {
    case "INTIMADO":
      return "bg-emerald-50 dark:bg-emerald-500/[0.08] text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20";
    case "PENDENTE":
    case "NAO_INTIMADO":
      return "bg-amber-50 dark:bg-amber-500/[0.08] text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20";
    case "NAO_LOCALIZADO":
    case "FALECIDO":
      return "bg-red-50 dark:bg-red-500/[0.08] text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20";
    case "DESISTIDO":
      return "bg-neutral-100 dark:bg-neutral-500/[0.08] text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-500/20";
    default:
      return "bg-neutral-100 dark:bg-neutral-500/[0.08] text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-500/20";
  }
}

function statusLabel(status: Depoente["statusIntimacao"]): string {
  return status.replace(/_/g, " ");
}

function severidadeBadgeClass(sev: "alta" | "media" | "baixa"): string {
  switch (sev) {
    case "alta":
      return "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20";
    case "media":
      return "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20";
    case "baixa":
      return "bg-neutral-100 dark:bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-500/20";
  }
}

function v3StatusIcon(status: PainelDepoente["statusIntimacao"]) {
  switch (status) {
    case "intimado":
      return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
    case "em_curso":
      return <Clock className="w-3.5 h-3.5 text-amber-500" />;
    case "frustrada":
      return <XCircle className="w-3.5 h-3.5 text-red-500" />;
    case "sem_diligencia":
      return <AlertTriangle className="w-3.5 h-3.5 text-neutral-500" />;
    case "dispensado":
      return <XCircle className="w-3.5 h-3.5 text-neutral-400" />;
    default:
      return <AlertTriangle className="w-3.5 h-3.5 text-neutral-500" />;
  }
}

function alertaColor(tipo: AlertaOperacional["tipo"]) {
  switch (tipo) {
    case "risco":
      return "border-l-red-500 bg-red-50/50 dark:bg-red-500/5";
    case "atencao":
      return "border-l-amber-500 bg-amber-50/50 dark:bg-amber-500/5";
    case "info":
      return "border-l-blue-500 bg-blue-50/50 dark:bg-blue-500/5";
    case "positivo":
      return "border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/5";
  }
}

function alertaIcon(tipo: AlertaOperacional["tipo"]) {
  switch (tipo) {
    case "risco":
      return <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />;
    case "atencao":
      return <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
    case "info":
      return <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
    case "positivo":
      return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
  }
}

// ─── Block 1: Resumo Executivo ────────────────────────────────────────────

export function BlocoResumo({ data }: { data: AnalysisBlocksData }) {
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

  return (
    <BlockShell
      value="resumo"
      icon={FileText}
      title="Resumo Executivo"
      count={data.alertasOperacionais?.length ? `${data.alertasOperacionais.length} alertas` : undefined}
    >
      {/* Resumo do fato */}
      {data.caso?.resumoFato && (
        <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed mb-4">
          {data.caso.resumoFato}
        </p>
      )}

      {/* Narrativa defensiva - highlighted quote */}
      {data.caso?.narrativaDefensiva && (
        <div className="border-l-2 border-emerald-500/40 pl-4 mb-4">
          <span className="text-[10px] uppercase tracking-wider text-emerald-500 font-semibold">
            Narrativa defensiva
          </span>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed mt-1 italic">
            {data.caso.narrativaDefensiva}
          </p>
        </div>
      )}

      {/* Alertas operacionais */}
      {data.alertasOperacionais && data.alertasOperacionais.length > 0 && (
        <div className="space-y-2 mb-4">
          <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">
            Alertas operacionais
          </span>
          {data.alertasOperacionais.map((alerta, i) => (
            <div
              key={i}
              className={cn(
                "border-l-2 rounded-lg p-3 flex items-start gap-2",
                alertaColor(alerta.tipo)
              )}
            >
              {alertaIcon(alerta.tipo)}
              <p className="text-xs text-neutral-700 dark:text-neutral-300">{alerta.texto}</p>
            </div>
          ))}
        </div>
      )}

      {/* Checklist tatico */}
      {data.checklistTatico && data.checklistTatico.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">
            Checklist tatico
          </span>
          {data.checklistTatico.map((item, i) => (
            <div key={i} className="flex items-start gap-2 py-1">
              <Square className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
              <p className="text-xs text-neutral-700 dark:text-neutral-300">{item}</p>
            </div>
          ))}
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
    <BlockShell
      value="depoentes"
      icon={Users}
      title="Painel de Depoentes"
      count={`${count} depoentes`}
    >
      {hasV3 ? (
        /* v3: rich table */
        <div className="space-y-2">
          {data.painelDepoentes!.map((dep, i) => (
            <div
              key={i}
              className="bg-neutral-50 dark:bg-[#0f0f11] border border-neutral-200 dark:border-neutral-800 rounded-xl p-3.5 flex items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate">{dep.nome}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400">
                    {dep.papel}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1.5 text-[10px] text-neutral-500">
                  <span>
                    Delegacia: {dep.delegacia?.presente ? (
                      <span className="text-emerald-500">{dep.delegacia.data || "Sim"}</span>
                    ) : (
                      <span className="text-neutral-400">-</span>
                    )}
                  </span>
                  <span>
                    Juizo: {dep.juizo?.presente ? (
                      <span className="text-emerald-500">{dep.juizo.data || "Sim"}</span>
                    ) : (
                      <span className="text-neutral-400">-</span>
                    )}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {v3StatusIcon(dep.statusIntimacao)}
                <span className="text-[10px] text-neutral-500 capitalize">{dep.statusIntimacao.replace(/_/g, " ")}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* v2 fallback: simpler cards */
        <div className="space-y-2">
          {data.pessoas.depoentes.map((dep, i) => (
            <div
              key={i}
              className="bg-neutral-50 dark:bg-[#0f0f11] border border-neutral-200 dark:border-neutral-800 rounded-xl p-3.5 flex items-center justify-between"
            >
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate">{dep.nome}</span>
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded",
                    tipoBadgeClass(dep.tipo)
                  )}
                >
                  {dep.tipo}
                </span>
              </div>
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded shrink-0",
                  statusBadgeClass(dep.statusIntimacao)
                )}
              >
                {statusLabel(dep.statusIntimacao)}
              </span>
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
      <EmptyState label="a comparacao de depoimentos" />
    </BlockShell>
  );

  return (
    <BlockShell
      value="comparados"
      icon={GitCompareArrows}
      title="Depoimentos Comparados"
      count={hasV3 ? `${data.depoimentosComparados!.length} pontos` : `${v2Depoentes.length} depoentes`}
    >
      {hasV3 ? (
        /* v3: comparison table */
        <div className="space-y-2">
          {data.depoimentosComparados!.map((comp, i) => (
            <div
              key={i}
              className="bg-neutral-50 dark:bg-[#0f0f11] border border-neutral-200 dark:border-neutral-800 rounded-xl p-3.5"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{comp.ponto}</span>
                {comp.convergencia ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-neutral-500">Delegacia</span>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">{comp.delegacia}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-neutral-500">Juizo</span>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">{comp.juizo}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* v2 fallback: side by side per depoente */
        <div className="space-y-2">
          {v2Depoentes.map((dep, i) => (
            <SubRow key={i} label={dep.nome}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-neutral-500">Delegacia</span>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">{dep.versaoDelegacia}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-neutral-500">Juizo</span>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">{dep.versaoJuizo}</p>
                </div>
              </div>
              {dep.contradicoes?.length > 0 && (
                <div className="mt-2 bg-red-50/50 dark:bg-red-500/5 border border-red-200/50 dark:border-red-500/10 rounded-lg p-2.5">
                  <span className="text-[10px] uppercase tracking-wider text-red-500 font-semibold">Contradicoes</span>
                  {dep.contradicoes.map((c, j) => (
                    <p key={j} className="text-xs text-red-600 dark:text-red-400/80 mt-0.5">{c}</p>
                  ))}
                </div>
              )}
            </SubRow>
          ))}
        </div>
      )}
    </BlockShell>
  );
}

// ─── Block 4: Perguntas Estrategicas ──────────────────────────────────────

export function BlocoPerguntasEstrategicas({ data }: { data: AnalysisBlocksData }) {
  const depoentesComPerguntas = data.pessoas?.depoentes?.filter(
    (d) => d.perguntasSugeridas?.length > 0
  ) ?? [];

  if (depoentesComPerguntas.length === 0) return (
    <BlockShell value="perguntas" icon={MessageCircleQuestion} title="Perguntas Estrategicas">
      <EmptyState label="as perguntas estrategicas" />
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
      title="Perguntas Estrategicas"
      count={`${totalPerguntas} perguntas`}
    >
      <div className="space-y-2">
        {depoentesComPerguntas.map((dep, i) => (
          <SubRow key={i} label={dep.nome} count={dep.perguntasSugeridas.length}>
            <ol className="space-y-1.5 pl-4 list-decimal">
              {dep.perguntasSugeridas.map((p, j) => (
                <li key={j} className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  {p}
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
        <div className="bg-gradient-to-br from-emerald-500/5 to-emerald-500/[0.02] border border-emerald-500/15 rounded-xl p-4 mb-4">
          <span className="text-[10px] uppercase tracking-wider text-emerald-500 font-semibold">
            Tese principal
          </span>
          <p className="text-base font-medium text-neutral-900 dark:text-neutral-100 mt-1">
            {est.tesePrincipal.tese}
          </p>
          {est.tesePrincipal.fundamentoFatico && (
            <p className="text-xs text-neutral-500 leading-relaxed mt-2">
              <strong className="text-neutral-800 dark:text-neutral-200">Fatico:</strong>{" "}
              {est.tesePrincipal.fundamentoFatico}
            </p>
          )}
          {est.tesePrincipal.fundamentoJuridico && (
            <p className="text-xs text-neutral-500 leading-relaxed mt-1">
              <strong className="text-neutral-800 dark:text-neutral-200">Juridico:</strong>{" "}
              {est.tesePrincipal.fundamentoJuridico}
            </p>
          )}
          {est.tesePrincipal.elementosQueCorroboram?.length > 0 && (
            <div className="mt-2">
              <span className="text-[10px] text-neutral-600">Corrobora:</span>
              <ul className="mt-0.5 space-y-0.5">
                {est.tesePrincipal.elementosQueCorroboram.map((el, i) => (
                  <li
                    key={i}
                    className="text-xs text-emerald-400/70 pl-2 border-l border-emerald-500/20"
                  >
                    {el}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Teses subsidiarias */}
      {est.tesesSubsidiarias?.length > 0 && (
        <SubRow label="Teses subsidiarias" count={est.tesesSubsidiarias.length}>
          <div className="space-y-2">
            {est.tesesSubsidiarias.map((ts, i) => (
              <div key={i} className="bg-neutral-50 dark:bg-neutral-800/40 rounded-lg p-3">
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{ts.tese}</p>
                <p className="text-xs text-neutral-500 mt-1">{ts.fundamento}</p>
                <p className="text-xs text-neutral-600 mt-0.5">
                  Quando usar: {ts.quandoUsar}
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
              <div key={i} className="bg-neutral-50 dark:bg-neutral-800/40 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">{n.tipo}</span>
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded",
                      severidadeBadgeClass(n.severidade)
                    )}
                  >
                    {n.severidade.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-1">{n.descricao}</p>
                <p className="text-xs text-neutral-600 mt-0.5">
                  Fundamentacao: {n.fundamentacao}
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
              <div
                key={i}
                className="bg-neutral-50 dark:bg-[#0f0f11] border border-neutral-200 dark:border-neutral-800 rounded-xl p-3.5"
              >
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{m.fato}</p>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-red-500 dark:text-red-400/60">
                      Acusacao
                    </span>
                    <p className="text-xs text-neutral-500 mt-0.5">{m.versaoAcusacao}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-emerald-500 dark:text-emerald-400/60">
                      Defesa
                    </span>
                    <p className="text-xs text-neutral-500 mt-0.5">{m.versaoDefesa}</p>
                  </div>
                </div>
                {m.elementosDeProva?.length > 0 && (
                  <div className="mt-2">
                    <span className="text-[10px] text-neutral-600">Provas:</span>
                    <p className="text-xs text-neutral-500">{m.elementosDeProva.join(", ")}</p>
                  </div>
                )}
                {m.contradicoes?.length > 0 && (
                  <div className="mt-1">
                    <span className="text-[10px] text-amber-500 dark:text-amber-400/60">Contradicoes:</span>
                    {m.contradicoes.map((c, j) => (
                      <p key={j} className="text-xs text-amber-600 dark:text-amber-400/70">{c}</p>
                    ))}
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

// ─── Block 6: Orientacao ──────────────────────────────────────────────────

export function BlocoOrientacao({ data }: { data: AnalysisBlocksData }) {
  const op = data.operacional;
  const hasContent = op?.orientacaoAoAssistido || op?.pontosCriticos?.length > 0;

  if (!hasContent) return (
    <BlockShell value="orientacao" icon={UserCheck} title="Orientacao ao Assistido">
      <EmptyState label="a orientacao ao assistido" />
    </BlockShell>
  );

  return (
    <BlockShell
      value="orientacao"
      icon={UserCheck}
      title="Orientacao ao Assistido"
      count={op.pontosCriticos?.length ? `${op.pontosCriticos.length} pontos criticos` : undefined}
    >
      {/* Orientacao text */}
      {op.orientacaoAoAssistido && (
        <div className="mb-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
            {op.orientacaoAoAssistido}
          </p>
        </div>
      )}

      {/* Pontos criticos */}
      {op.pontosCriticos?.length > 0 && (
        <div className="space-y-2">
          <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">
            Pontos criticos
          </span>
          {op.pontosCriticos.map((pc, i) => (
            <div
              key={i}
              className="bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/15 rounded-lg p-3"
            >
              <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{pc.ponto}</p>
              <p className="text-xs text-red-600 dark:text-red-400/80 mt-1">
                Risco: {pc.risco}
              </p>
              <p className="text-xs text-neutral-500 mt-0.5">
                Mitigacao: {pc.mitigacao}
              </p>
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
    <BlockShell
      value="cronologia"
      icon={Clock}
      title="Cronologia"
      count={`${cronologia.length} eventos`}
    >
      <div className="relative ml-3">
        {/* Vertical line */}
        <div className="absolute left-0 top-2 bottom-2 w-px bg-neutral-200 dark:bg-neutral-700" />
        <div className="space-y-4">
          {cronologia.map((item, i) => (
            <div key={i} className="relative pl-5">
              {/* Dot */}
              <div className="absolute left-[-3px] top-1.5 w-1.5 h-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500" />
              <div>
                <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-mono font-bold">
                  {item.data}
                </span>
                <p className="text-sm text-neutral-700 dark:text-neutral-300 mt-0.5">{item.evento}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {item.fonte && (
                    <span className="text-[10px] text-neutral-500">via {item.fonte}</span>
                  )}
                  {item.relevancia && (
                    <span className="text-[10px] text-neutral-400">{item.relevancia}</span>
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
      <p className="text-xs text-muted-foreground py-4 text-center">
        Mapa investigativo sera disponibilizado em breve.
      </p>
    </BlockShell>
  );
}
