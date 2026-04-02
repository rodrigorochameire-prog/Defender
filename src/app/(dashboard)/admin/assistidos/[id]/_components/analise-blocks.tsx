"use client";

import { useState } from "react";
import {
  FileText,
  Users,
  Search,
  BookOpen,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
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

// Export the full analysis shape
export interface AnalysisBlocksData {
  caso: CasoData;
  pessoas: PessoasData;
  provas: ProvasData;
  estrategia: EstrategiaData;
  operacional: PreparacaoData;
}

// ─── Shared Block Shell ────────────────────────────────────────────────────

function BlockShell({
  value,
  icon: Icon,
  iconBg,
  iconColor,
  title,
  count,
  children,
}: {
  value: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  count?: number | string;
  children: React.ReactNode;
}) {
  return (
    <AccordionItem value={value} className="border-none mb-3">
      <AccordionTrigger className="bg-zinc-900 dark:bg-zinc-900 text-white border border-zinc-800 dark:border-zinc-800 rounded-xl px-4 py-3 hover:no-underline hover:bg-zinc-800 dark:hover:bg-zinc-800 transition-all duration-200 data-[state=open]:rounded-b-none data-[state=open]:border-b-zinc-700/50">
        <div className="flex items-center gap-3 flex-1">
          <div
            className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center",
              iconBg
            )}
          >
            <Icon className={cn("w-3.5 h-3.5", iconColor)} />
          </div>
          <span className="text-sm font-medium text-zinc-100">{title}</span>
          {count != null && (
            <span className="text-[10px] text-zinc-400 bg-zinc-700 px-2 py-0.5 rounded-full">
              {count}
            </span>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent className="bg-white dark:bg-zinc-900 border border-t-0 border-zinc-200 dark:border-zinc-800 rounded-b-xl px-4 shadow-sm">
        {children}
      </AccordionContent>
    </AccordionItem>
  );
}

// ─── Collapsible Sub-Row ───────────────────────────────────────────────────

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
      <CollapsibleTrigger className="w-full bg-zinc-100 dark:bg-[#0f0f11] rounded-lg p-2.5 mb-1.5 cursor-pointer flex justify-between items-center hover:bg-zinc-200/70 dark:hover:bg-zinc-800/50 transition-colors">
        <span className="text-sm text-zinc-700 dark:text-zinc-300">{label}</span>
        <div className="flex items-center gap-2">
          {count != null && (
            <span className="text-[10px] text-zinc-400 bg-zinc-700 px-2 py-0.5 rounded-full">
              {count}
            </span>
          )}
          {open ? (
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-1 pb-2">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── Helper: tipo badge colors ─────────────────────────────────────────────

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
      return "bg-zinc-100 dark:bg-zinc-500/10 text-zinc-600 dark:text-zinc-400";
    default:
      return "bg-zinc-100 dark:bg-zinc-500/10 text-zinc-600 dark:text-zinc-400";
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
      return "bg-zinc-100 dark:bg-zinc-500/[0.08] text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-500/20";
    default:
      return "bg-zinc-100 dark:bg-zinc-500/[0.08] text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-500/20";
  }
}

function statusLabel(status: Depoente["statusIntimacao"]): string {
  return status.replace(/_/g, " ");
}

function urgenciaBadgeClass(urgencia: "alta" | "media" | "baixa"): string {
  switch (urgencia) {
    case "alta":
      return "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20";
    case "media":
      return "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20";
    case "baixa":
      return "bg-zinc-100 dark:bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-500/20";
  }
}

function severidadeBadgeClass(sev: "alta" | "media" | "baixa"): string {
  return urgenciaBadgeClass(sev);
}

// ─── Block 1: O Caso ───────────────────────────────────────────────────────

export function BlocoCaso({ data }: { data: CasoData }) {
  const hasContent =
    data.resumoFato ||
    data.narrativaDenuncia ||
    data.narrativaDefensiva ||
    data.cronologia?.length > 0 ||
    data.fatosRelacionados?.length > 0;

  if (!hasContent) return null;

  return (
    <BlockShell
      value="caso"
      icon={FileText}
      iconBg="bg-emerald-500/10"
      iconColor="text-emerald-400"
      title="O Caso"
    >
      {data.resumoFato && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
          {data.resumoFato}
        </p>
      )}

      {data.narrativaDenuncia && (
        <SubRow label="Versao da acusacao">
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {data.narrativaDenuncia}
          </p>
        </SubRow>
      )}

      {data.narrativaDefensiva && (
        <SubRow label="Versao da defesa">
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {data.narrativaDefensiva}
          </p>
        </SubRow>
      )}

      {data.cronologia?.length > 0 && (
        <SubRow
          label="Cronologia"
          count={`${data.cronologia.length} eventos`}
        >
          <div className="space-y-2">
            {data.cronologia.map((item, i) => (
              <div
                key={i}
                className="bg-zinc-50 dark:bg-zinc-800/40 rounded-lg p-3 flex flex-col gap-1"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono">
                    {item.data}
                  </span>
                  <span className="text-[10px] text-zinc-600">
                    via {item.fonte}
                  </span>
                </div>
                <p className="text-sm text-zinc-700 dark:text-zinc-300">{item.evento}</p>
                {item.relevancia && (
                  <p className="text-xs text-zinc-500">{item.relevancia}</p>
                )}
              </div>
            ))}
          </div>
        </SubRow>
      )}

      {data.fatosRelacionados?.length > 0 && (
        <SubRow
          label="Fatos relacionados"
          count={data.fatosRelacionados.length}
        >
          <div className="space-y-2">
            {data.fatosRelacionados.map((f, i) => (
              <div key={i} className="bg-zinc-50 dark:bg-zinc-800/40 rounded-lg p-3">
                <p className="text-sm text-zinc-700 dark:text-zinc-300">{f.descricao}</p>
                <p className="text-xs text-zinc-500 mt-1">
                  <strong className="text-zinc-800 dark:text-zinc-200">Conexao:</strong>{" "}
                  {f.conexaoComCaso}
                </p>
                <p className="text-[10px] text-zinc-600 mt-0.5">
                  Fonte: {f.fonte}
                </p>
              </div>
            ))}
          </div>
        </SubRow>
      )}
    </BlockShell>
  );
}

// ─── Block 2: Pessoas ──────────────────────────────────────────────────────

function DeponenteCard({ dep }: { dep: Depoente }) {
  const [showPerguntas, setShowPerguntas] = useState(false);

  return (
    <div className="bg-zinc-50 dark:bg-[#0f0f11] border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 mb-2">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{dep.nome}</span>
        <span
          className={cn(
            "text-[10px] px-1.5 py-0.5 rounded",
            tipoBadgeClass(dep.tipo)
          )}
        >
          {dep.tipo}
        </span>
        <span
          className={cn(
            "text-[10px] px-1.5 py-0.5 rounded",
            statusBadgeClass(dep.statusIntimacao)
          )}
        >
          {statusLabel(dep.statusIntimacao)}
        </span>
      </div>

      {/* Perfil */}
      {dep.perfil && (
        <p className="text-xs text-zinc-500 mt-1.5">{dep.perfil}</p>
      )}

      {/* Contradicoes */}
      {dep.contradicoes?.length > 0 && (
        <div className="mt-2">
          {dep.contradicoes.map((c, i) => (
            <p key={i} className="text-xs text-zinc-500">
              Contradicao: <span className="text-amber-600 dark:text-amber-400">{c}</span>
            </p>
          ))}
        </div>
      )}

      {/* Credibilidade */}
      {dep.credibilidade && (
        <p className="text-xs text-zinc-600 mt-1">
          Credibilidade: {dep.credibilidade}
        </p>
      )}

      {/* Pontos fortes/fracos */}
      {dep.pontosFortes?.length > 0 && (
        <p className="text-xs text-zinc-600 mt-1">
          <strong className="text-emerald-500/70">Fortes:</strong>{" "}
          {dep.pontosFortes.join(" / ")}
        </p>
      )}
      {dep.pontosFracos?.length > 0 && (
        <p className="text-xs text-zinc-600 mt-0.5">
          <strong className="text-red-400/70">Fracos:</strong>{" "}
          {dep.pontosFracos.join(" / ")}
        </p>
      )}

      {/* Perguntas sugeridas */}
      {dep.perguntasSugeridas?.length > 0 && (
        <div className="mt-2">
          <button
            onClick={() => setShowPerguntas(!showPerguntas)}
            className="text-xs text-emerald-500 hover:text-emerald-400 transition-colors flex items-center gap-1"
          >
            {showPerguntas ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            {dep.perguntasSugeridas.length} perguntas sugeridas
          </button>
          {showPerguntas && (
            <ol className="mt-1.5 space-y-1 pl-4 list-decimal">
              {dep.perguntasSugeridas.map((p, i) => (
                <li key={i} className="text-xs text-zinc-600 dark:text-zinc-400">
                  {p}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}

export function BlocoPessoas({ data }: { data: PessoasData }) {
  const hasContent =
    data.perfilReu ||
    data.perfilVitima ||
    data.depoentes?.length > 0 ||
    data.informantes?.length > 0;

  if (!hasContent) return null;

  const deponenteCount = data.depoentes?.length ?? 0;

  return (
    <BlockShell
      value="pessoas"
      icon={Users}
      iconBg="bg-violet-500/10"
      iconColor="text-violet-400"
      title="Pessoas"
      count={deponenteCount > 0 ? `${deponenteCount} depoentes` : undefined}
    >
      {/* Perfil cards */}
      {(data.perfilReu || data.perfilVitima) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {data.perfilReu && (
            <div className="bg-zinc-50 dark:bg-[#0f0f11] rounded-lg p-3">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                Reu
              </span>
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 mt-1">
                {data.perfilReu.historico}
              </p>
              {data.perfilReu.contextoSocial && (
                <p className="text-xs text-zinc-500 leading-relaxed mt-1">
                  {data.perfilReu.contextoSocial}
                </p>
              )}
              {data.perfilReu.condicoesAtenuantes?.length > 0 && (
                <p className="text-xs text-zinc-500 mt-1">
                  <strong className="text-zinc-800 dark:text-zinc-200">Atenuantes:</strong>{" "}
                  {data.perfilReu.condicoesAtenuantes.join(", ")}
                </p>
              )}
              {data.perfilReu.versaoDosFatos && (
                <p className="text-xs text-zinc-500 leading-relaxed mt-1">
                  <strong className="text-zinc-800 dark:text-zinc-200">Versao:</strong>{" "}
                  {data.perfilReu.versaoDosFatos}
                </p>
              )}
            </div>
          )}
          {data.perfilVitima && (
            <div className="bg-zinc-50 dark:bg-[#0f0f11] rounded-lg p-3">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                Vitima
              </span>
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 mt-1">
                {data.perfilVitima.relacaoComReu}
              </p>
              {data.perfilVitima.historico && (
                <p className="text-xs text-zinc-500 leading-relaxed mt-1">
                  {data.perfilVitima.historico}
                </p>
              )}
              {data.perfilVitima.comportamentoRelatado && (
                <p className="text-xs text-zinc-500 mt-1">
                  <strong className="text-zinc-800 dark:text-zinc-200">Comportamento:</strong>{" "}
                  {data.perfilVitima.comportamentoRelatado}
                </p>
              )}
              {data.perfilVitima.credibilidade && (
                <p className="text-xs text-zinc-600 mt-1">
                  Credibilidade: {data.perfilVitima.credibilidade}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Depoentes */}
      {data.depoentes?.length > 0 && (
        <div className="mb-3">
          {data.depoentes.map((dep, i) => (
            <DeponenteCard key={i} dep={dep} />
          ))}
        </div>
      )}

      {/* Informantes */}
      {data.informantes?.length > 0 && (
        <SubRow label="Informantes" count={data.informantes.length}>
          <div className="space-y-2">
            {data.informantes.map((info, i) => (
              <div key={i} className="bg-zinc-50 dark:bg-zinc-800/40 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {info.fonte}
                  </span>
                  <span className="text-[10px] text-zinc-600">
                    Confiabilidade: {info.confiabilidade}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  {info.conteudo}
                </p>
                {info.informacoesRelevantes?.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5">
                    {info.informacoesRelevantes.map((ir, j) => (
                      <li
                        key={j}
                        className="text-xs text-zinc-600 dark:text-zinc-400 pl-2 border-l border-zinc-300 dark:border-zinc-700"
                      >
                        {ir}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </SubRow>
      )}
    </BlockShell>
  );
}

// ─── Block 3: Provas ───────────────────────────────────────────────────────

export function BlocoProvas({ data }: { data: ProvasData }) {
  const [activeTab, setActiveTab] = useState<
    "periciais" | "documentais" | "informativos"
  >("periciais");

  const hasContent =
    data.provasPericiais?.length > 0 ||
    data.provasDocumentais?.length > 0 ||
    data.informativosInvestigacao?.length > 0 ||
    data.elementosInquisitoriais?.length > 0 ||
    data.elementosProbatorios?.length > 0 ||
    data.possibilidadesProbatorias?.length > 0;

  if (!hasContent) return null;

  const tabs = [
    {
      key: "periciais" as const,
      label: "Periciais",
      count: data.provasPericiais?.length ?? 0,
    },
    {
      key: "documentais" as const,
      label: "Documentais",
      count: data.provasDocumentais?.length ?? 0,
    },
    {
      key: "informativos" as const,
      label: "Informativos",
      count: data.informativosInvestigacao?.length ?? 0,
    },
  ].filter((t) => t.count > 0);

  return (
    <BlockShell
      value="provas"
      icon={Search}
      iconBg="bg-amber-500/10"
      iconColor="text-amber-400"
      title="Provas"
    >
      {/* Elements overview */}
      {(data.elementosInquisitoriais?.length > 0 ||
        data.elementosProbatorios?.length > 0) && (
        <div className="mb-4">
          {data.elementosInquisitoriais?.length > 0 && (
            <SubRow
              label="Elementos inquisitoriais"
              count={data.elementosInquisitoriais.length}
            >
              <div className="space-y-2">
                {data.elementosInquisitoriais.map((el, i) => (
                  <div
                    key={i}
                    className={cn(
                      "bg-zinc-50 dark:bg-zinc-800/40 rounded-lg p-3 border-l-2",
                      el.contestavel
                        ? "border-l-emerald-500"
                        : "border-l-red-500"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-zinc-700 dark:text-zinc-300">{el.tipo}</span>
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded",
                          el.peso === "alto"
                            ? "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400"
                            : el.peso === "medio"
                            ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            : "bg-zinc-100 dark:bg-zinc-500/10 text-zinc-600 dark:text-zinc-400"
                        )}
                      >
                        peso {el.peso}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">{el.descricao}</p>
                    {el.contestavel && el.argumento && (
                      <p className="text-xs text-emerald-400/70 mt-1">
                        Contestacao: {el.argumento}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </SubRow>
          )}
          {data.elementosProbatorios?.length > 0 && (
            <SubRow
              label="Elementos probatorios"
              count={data.elementosProbatorios.length}
            >
              <div className="space-y-2">
                {data.elementosProbatorios.map((el, i) => (
                  <div
                    key={i}
                    className={cn(
                      "bg-zinc-50 dark:bg-zinc-800/40 rounded-lg p-3 border-l-2",
                      el.favoravel
                        ? "border-l-emerald-500"
                        : "border-l-red-500"
                    )}
                  >
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">{el.tipo}</span>
                    <p className="text-xs text-zinc-500 mt-1">{el.descricao}</p>
                  </div>
                ))}
              </div>
            </SubRow>
          )}
        </div>
      )}

      {/* Sub-tabs */}
      {tabs.length > 0 && (
        <div className="flex gap-2 mb-3">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-full transition-colors",
                activeTab === t.key
                  ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                  : "bg-zinc-100 dark:bg-zinc-800/50 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800"
              )}
            >
              {t.label}{" "}
              <span className="text-zinc-500 ml-0.5">{t.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Periciais */}
      {activeTab === "periciais" && data.provasPericiais?.length > 0 && (
        <div className="space-y-2 mb-3">
          {data.provasPericiais.map((p, i) => (
            <div
              key={i}
              className="bg-zinc-50 dark:bg-[#0f0f11] border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 border-l-2 border-l-emerald-500"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  {p.tipo}
                </span>
                <span className="text-[10px] text-zinc-600">{p.perito}</span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                <strong className="text-zinc-800 dark:text-zinc-200">Conclusao:</strong>{" "}
                {p.conclusao}
              </p>
              {p.pontoCritico && (
                <p className="text-xs text-amber-600 dark:text-amber-400/80 mt-1">
                  Ponto critico: {p.pontoCritico}
                </p>
              )}
              {p.contestacao && (
                <p className="text-xs text-emerald-400/70 mt-1">
                  Contestacao: {p.contestacao}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Documentais */}
      {activeTab === "documentais" && data.provasDocumentais?.length > 0 && (
        <div className="space-y-2 mb-3">
          {data.provasDocumentais.map((d, i) => (
            <div
              key={i}
              className={cn(
                "bg-zinc-50 dark:bg-[#0f0f11] border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 border-l-2",
                d.favoravel ? "border-l-emerald-500" : "border-l-red-500"
              )}
            >
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                {d.documento}
              </span>
              <p className="text-xs text-zinc-500 mt-1">{d.conteudo}</p>
              <p className="text-xs text-zinc-600 mt-1">
                Relevancia: {d.relevancia}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Informativos */}
      {activeTab === "informativos" &&
        data.informativosInvestigacao?.length > 0 && (
          <div className="space-y-2 mb-3">
            {data.informativosInvestigacao.map((info, i) => (
              <div
                key={i}
                className="bg-zinc-50 dark:bg-[#0f0f11] border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    {info.fonte}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-600">
                    {info.dataApuracao}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">{info.conteudo}</p>
                {info.informacoesRelevantes?.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5">
                    {info.informacoesRelevantes.map((ir, j) => (
                      <li
                        key={j}
                        className="text-xs text-zinc-600 dark:text-zinc-400 pl-2 border-l border-zinc-300 dark:border-zinc-700"
                      >
                        {ir}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-[10px] text-zinc-600 mt-1">
                  Credibilidade: {info.credibilidade}
                </p>
              </div>
            ))}
          </div>
        )}

      {/* O que falta produzir */}
      {data.possibilidadesProbatorias?.length > 0 && (
        <SubRow
          label="O que falta produzir"
          count={data.possibilidadesProbatorias.length}
        >
          <div className="space-y-2">
            {data.possibilidadesProbatorias.map((pp, i) => (
              <div
                key={i}
                className="bg-zinc-50 dark:bg-zinc-800/40 rounded-lg p-3 border-l-2 border-l-amber-500"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    {pp.diligencia}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded",
                      urgenciaBadgeClass(pp.urgencia)
                    )}
                  >
                    {pp.urgencia.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  <strong className="text-zinc-800 dark:text-zinc-200">Objetivo:</strong>{" "}
                  {pp.objetivo}
                </p>
                <p className="text-xs text-zinc-600 mt-0.5">
                  Fundamento: {pp.fundamento}
                </p>
              </div>
            ))}
          </div>
        </SubRow>
      )}
    </BlockShell>
  );
}

// ─── Block 4: Estrategia ──────────────────────────────────────────────────

export function BlocoEstrategia({ data }: { data: EstrategiaData }) {
  const hasContent =
    data.tesePrincipal ||
    data.tesesSubsidiarias?.length > 0 ||
    data.nulidades?.length > 0 ||
    data.qualificadoras?.length > 0 ||
    data.pontosFortes ||
    data.pontosFracos ||
    data.matrizGuerra?.length > 0;

  if (!hasContent) return null;

  return (
    <BlockShell
      value="estrategia"
      icon={BookOpen}
      iconBg="bg-blue-500/10"
      iconColor="text-blue-400"
      title="Estrategia"
    >
      {/* Tese principal */}
      {data.tesePrincipal && (
        <div className="bg-gradient-to-br from-emerald-500/5 to-emerald-500/[0.02] border border-emerald-500/15 rounded-xl p-4 mb-4">
          <span className="text-[10px] uppercase tracking-wider text-emerald-500 font-semibold">
            Tese principal
          </span>
          <p className="text-base font-medium text-zinc-900 dark:text-zinc-100 mt-1">
            {data.tesePrincipal.tese}
          </p>
          {data.tesePrincipal.fundamentoFatico && (
            <p className="text-xs text-zinc-500 leading-relaxed mt-2">
              <strong className="text-zinc-800 dark:text-zinc-200">Fatico:</strong>{" "}
              {data.tesePrincipal.fundamentoFatico}
            </p>
          )}
          {data.tesePrincipal.fundamentoJuridico && (
            <p className="text-xs text-zinc-500 leading-relaxed mt-1">
              <strong className="text-zinc-800 dark:text-zinc-200">Juridico:</strong>{" "}
              {data.tesePrincipal.fundamentoJuridico}
            </p>
          )}
          {data.tesePrincipal.elementosQueCorroboram?.length > 0 && (
            <div className="mt-2">
              <span className="text-[10px] text-zinc-600">Corrobora:</span>
              <ul className="mt-0.5 space-y-0.5">
                {data.tesePrincipal.elementosQueCorroboram.map((el, i) => (
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

      {/* Pontos fortes/fracos — 4 subsections */}
      {data.pontosFortes?.defesa?.length > 0 && (
        <SubRow
          label="Pontos fortes da defesa"
          count={data.pontosFortes.defesa.length}
        >
          <div className="space-y-2">
            {data.pontosFortes.defesa.map((pf, i) => (
              <div
                key={i}
                className="bg-zinc-50 dark:bg-zinc-800/40 rounded-lg p-3 border-l-2 border-l-emerald-500"
              >
                <p className="text-sm text-zinc-700 dark:text-zinc-300">{pf.ponto}</p>
                {pf.elementos?.length > 0 && (
                  <p className="text-xs text-zinc-500 mt-1">
                    Elementos: {pf.elementos.join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </SubRow>
      )}

      {data.pontosFracos?.defesa?.length > 0 && (
        <SubRow
          label="Pontos fracos da defesa"
          count={data.pontosFracos.defesa.length}
        >
          <div className="space-y-2">
            {data.pontosFracos.defesa.map((pf, i) => (
              <div
                key={i}
                className="bg-zinc-50 dark:bg-zinc-800/40 rounded-lg p-3 border-l-2 border-l-red-500"
              >
                <p className="text-sm text-zinc-700 dark:text-zinc-300">{pf.ponto}</p>
                {pf.mitigacao && (
                  <p className="text-xs text-emerald-400/70 mt-1">
                    Mitigacao: {pf.mitigacao}
                  </p>
                )}
              </div>
            ))}
          </div>
        </SubRow>
      )}

      {data.pontosFortes?.acusacao?.length > 0 && (
        <SubRow
          label="Pontos fortes da acusacao"
          count={data.pontosFortes.acusacao.length}
        >
          <div className="space-y-2">
            {data.pontosFortes.acusacao.map((pf, i) => (
              <div
                key={i}
                className="bg-zinc-50 dark:bg-zinc-800/40 rounded-lg p-3 border-l-2 border-l-red-500"
              >
                <p className="text-sm text-zinc-700 dark:text-zinc-300">{pf.ponto}</p>
                {pf.elementos?.length > 0 && (
                  <p className="text-xs text-zinc-500 mt-1">
                    Elementos: {pf.elementos.join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </SubRow>
      )}

      {data.pontosFracos?.acusacao?.length > 0 && (
        <SubRow
          label="Pontos fracos da acusacao"
          count={data.pontosFracos.acusacao.length}
        >
          <div className="space-y-2">
            {data.pontosFracos.acusacao.map((pf, i) => (
              <div
                key={i}
                className="bg-zinc-50 dark:bg-zinc-800/40 rounded-lg p-3 border-l-2 border-l-emerald-500"
              >
                <p className="text-sm text-zinc-700 dark:text-zinc-300">{pf.ponto}</p>
                {pf.comoExplorar && (
                  <p className="text-xs text-emerald-400/70 mt-1">
                    Como explorar: {pf.comoExplorar}
                  </p>
                )}
              </div>
            ))}
          </div>
        </SubRow>
      )}

      {/* Teses subsidiarias */}
      {data.tesesSubsidiarias?.length > 0 && (
        <SubRow
          label="Teses subsidiarias"
          count={data.tesesSubsidiarias.length}
        >
          <div className="space-y-2">
            {data.tesesSubsidiarias.map((ts, i) => (
              <div key={i} className="bg-zinc-50 dark:bg-zinc-800/40 rounded-lg p-3">
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{ts.tese}</p>
                <p className="text-xs text-zinc-500 mt-1">{ts.fundamento}</p>
                <p className="text-xs text-zinc-600 mt-0.5">
                  Quando usar: {ts.quandoUsar}
                </p>
              </div>
            ))}
          </div>
        </SubRow>
      )}

      {/* Nulidades */}
      {data.nulidades?.length > 0 && (
        <SubRow label="Nulidades" count={data.nulidades.length}>
          <div className="space-y-2">
            {data.nulidades.map((n, i) => (
              <div key={i} className="bg-zinc-50 dark:bg-zinc-800/40 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">{n.tipo}</span>
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded",
                      severidadeBadgeClass(n.severidade)
                    )}
                  >
                    {n.severidade.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">{n.descricao}</p>
                <p className="text-xs text-zinc-600 mt-0.5">
                  Fundamentacao: {n.fundamentacao}
                </p>
              </div>
            ))}
          </div>
        </SubRow>
      )}

      {/* Qualificadoras */}
      {data.qualificadoras?.length > 0 && (
        <SubRow label="Qualificadoras" count={data.qualificadoras.length}>
          <div className="space-y-2">
            {data.qualificadoras.map((q, i) => (
              <div key={i} className="bg-zinc-50 dark:bg-zinc-800/40 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">{q.tipo}</span>
                  {q.imputada && (
                    <span className="text-[10px] bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded">
                      IMPUTADA
                    </span>
                  )}
                  {q.contestavel && (
                    <span className="text-[10px] bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded">
                      CONTESTAVEL
                    </span>
                  )}
                </div>
                {q.argumento && (
                  <p className="text-xs text-zinc-500 mt-1">{q.argumento}</p>
                )}
              </div>
            ))}
          </div>
        </SubRow>
      )}

      {/* Matriz de guerra */}
      {data.matrizGuerra?.length > 0 && (
        <SubRow label="Matriz de guerra" count={data.matrizGuerra.length}>
          <div className="space-y-3">
            {data.matrizGuerra.map((m, i) => (
              <div
                key={i}
                className="bg-zinc-50 dark:bg-[#0f0f11] border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5"
              >
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{m.fato}</p>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-red-500 dark:text-red-400/60">
                      Acusacao
                    </span>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {m.versaoAcusacao}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-emerald-500 dark:text-emerald-400/60">
                      Defesa
                    </span>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {m.versaoDefesa}
                    </p>
                  </div>
                </div>
                {m.elementosDeProva?.length > 0 && (
                  <div className="mt-2">
                    <span className="text-[10px] text-zinc-600">Provas:</span>
                    <p className="text-xs text-zinc-500">
                      {m.elementosDeProva.join(", ")}
                    </p>
                  </div>
                )}
                {m.contradicoes?.length > 0 && (
                  <div className="mt-1">
                    <span className="text-[10px] text-amber-500 dark:text-amber-400/60">
                      Contradicoes:
                    </span>
                    {m.contradicoes.map((c, j) => (
                      <p key={j} className="text-xs text-amber-600 dark:text-amber-400/70">
                        {c}
                      </p>
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

// ─── Block 5: Preparacao ───────────────────────────────────────────────────

export function BlocoPreparacao({ data }: { data: PreparacaoData }) {
  const hasContent =
    data.orientacaoAoAssistido ||
    data.quesitos?.length > 0 ||
    data.informacoesAtendimento?.length > 0 ||
    data.pontosCriticos?.length > 0;

  if (!hasContent) return null;

  return (
    <BlockShell
      value="preparacao"
      icon={AlertTriangle}
      iconBg="bg-rose-500/10"
      iconColor="text-rose-400"
      title="Preparacao"
    >
      {/* Orientacao */}
      {data.orientacaoAoAssistido && (
        <div className="mb-4">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
            Orientacao ao assistido
          </span>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mt-1">
            {data.orientacaoAoAssistido}
          </p>
        </div>
      )}

      {/* Quesitos */}
      {data.quesitos?.length > 0 && (
        <SubRow label="Quesitos" count={data.quesitos.length}>
          <ol className="space-y-2 list-none">
            {data.quesitos.map((q, i) => (
              <li key={i} className="bg-zinc-50 dark:bg-zinc-800/40 rounded-lg p-3">
                <div className="flex gap-2">
                  <span className="text-sm font-mono text-zinc-500 shrink-0">
                    {i + 1}.
                  </span>
                  <div>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">{q.texto}</p>
                    <p className="text-xs text-emerald-400/70 mt-1">
                      Estrategia: {q.estrategia}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </SubRow>
      )}

      {/* Atendimentos */}
      {data.informacoesAtendimento?.length > 0 && (
        <SubRow
          label="Informacoes dos atendimentos"
          count={data.informacoesAtendimento.length}
        >
          <div className="space-y-2">
            {data.informacoesAtendimento.map((at, i) => (
              <div key={i} className="bg-zinc-50 dark:bg-zinc-800/40 rounded-lg p-3">
                <span className="text-[10px] font-mono text-zinc-600">
                  {at.data}
                </span>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">{at.conteudo}</p>
                {at.relevanciaParaCaso && (
                  <p className="text-xs text-emerald-400/70 mt-1">
                    {at.relevanciaParaCaso}
                  </p>
                )}
              </div>
            ))}
          </div>
        </SubRow>
      )}

      {/* Pontos criticos */}
      {data.pontosCriticos?.length > 0 && (
        <div className="space-y-2">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
            Pontos criticos
          </span>
          {data.pontosCriticos.map((pc, i) => (
            <div
              key={i}
              className="bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/15 rounded-lg p-3"
            >
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{pc.ponto}</p>
              <p className="text-xs text-red-600 dark:text-red-400/80 mt-1">
                Risco: {pc.risco}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Mitigacao: {pc.mitigacao}
              </p>
            </div>
          ))}
        </div>
      )}
    </BlockShell>
  );
}
