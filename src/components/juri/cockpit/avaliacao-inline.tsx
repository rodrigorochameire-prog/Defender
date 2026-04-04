"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClipboardCheck,
  Users,
  MessageSquare,
  Scale,
  Gavel,
  Target,
  BarChart3,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  Mic,
  MapPin,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Eye,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// STORAGE KEY — compartilhado entre abas
// ============================================
export const AVALIACAO_STORAGE_KEY = "defender_cockpit_avaliacao";

// ============================================
// TIPOS
// ============================================
interface FaseConfig {
  id: string;
  label: string;
  minutes: number;
  mode: string;
}

// Seções de avaliação acompanhando as fases do plenário
const SECOES = [
  { id: "contexto", label: "Contexto", icon: MapPin, fase: null },
  { id: "jurados", label: "Jurados", icon: Users, fase: null },
  { id: "interrogatorio", label: "Interrogatório", icon: MessageSquare, fase: "interrogatorio" },
  { id: "testemunhas", label: "Testemunhas", icon: Mic, fase: "instrucao" },
  { id: "mp", label: "Acusação", icon: Gavel, fase: "sustentacao_mp" },
  { id: "defesa", label: "Defesa", icon: Scale, fase: "sustentacao_defesa" },
  { id: "replica", label: "Réplica", icon: AlertTriangle, fase: "replica" },
  { id: "treplica", label: "Tréplica", icon: Target, fase: "treplica" },
  { id: "analise", label: "Análise Final", icon: BarChart3, fase: "votacao" },
];

// ============================================
// ESCALA 1-10
// ============================================
function Escala({
  value,
  onChange,
  label,
  lowLabel = "Baixa",
  highLabel = "Alta",
}: {
  value: number | null;
  onChange: (v: number) => void;
  label?: string;
  lowLabel?: string;
  highLabel?: string;
}) {
  return (
    <div className="space-y-1.5">
      {label && <Label className="text-xs font-medium">{label}</Label>}
      <div className="flex items-center gap-0.5">
        <span className="text-[9px] text-muted-foreground w-8 shrink-0">{lowLabel}</span>
        <div className="flex-1 flex gap-0.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={cn(
                "flex-1 h-7 rounded text-[10px] font-semibold transition-colors cursor-pointer",
                value === n
                  ? n <= 3 ? "bg-red-500 text-white"
                    : n <= 6 ? "bg-amber-500 text-white"
                    : "bg-emerald-500 text-white"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
              )}
            >
              {n}
            </button>
          ))}
        </div>
        <span className="text-[9px] text-muted-foreground w-8 shrink-0 text-right">{highLabel}</span>
      </div>
    </div>
  );
}

// ============================================
// TENDÊNCIA JURADO (Condenar / Indeciso / Absolver)
// ============================================
function Tendencia({
  tendencia,
  confianca,
  onTendenciaChange,
  onConfiancaChange,
}: {
  tendencia: string;
  confianca: string;
  onTendenciaChange: (v: string) => void;
  onConfiancaChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <Label className="text-[10px]">Tendência</Label>
        <div className="flex gap-1 mt-1">
          {[
            { id: "CONDENAR", icon: ThumbsDown, color: "rose", label: "Cond." },
            { id: "INDECISO", icon: Minus, color: "amber", label: "Indec." },
            { id: "ABSOLVER", icon: ThumbsUp, color: "emerald", label: "Abs." },
          ].map(({ id, icon: Icon, color, label }) => (
            <button
              key={id}
              onClick={() => onTendenciaChange(id)}
              className={cn(
                "flex-1 h-7 rounded flex items-center justify-center gap-0.5 text-[9px] font-medium transition-all cursor-pointer",
                tendencia === id
                  ? color === "emerald" ? "bg-emerald-500 text-white"
                    : color === "rose" ? "bg-rose-500 text-white"
                    : "bg-amber-500 text-white"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
              )}
            >
              <Icon className="w-3 h-3" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label className="text-[10px]">Confiança</Label>
        <Select value={confianca} onValueChange={onConfiancaChange}>
          <SelectTrigger className="mt-1 h-7 text-[10px]">
            <SelectValue placeholder="..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="BAIXA">Baixa</SelectItem>
            <SelectItem value="MEDIA">Média</SelectItem>
            <SelectItem value="ALTA">Alta</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// ============================================
// ESTADO COMPLETO — espelhando o DOCX
// ============================================
export interface AvaliacaoState {
  // Cabeçalho
  processoNumero: string;
  nomeReu: string;
  dataJulgamento: string;
  observador: string;

  // Contexto e Ambiente
  horarioInicio: string;
  duracaoEstimada: string;
  descricaoAmbiente: string;
  disposicaoFisica: string;
  climaEmocionalInicial: string;
  presencaPublicoMidia: string;

  // PARTE I — Jurados 1-7
  jurados: Array<{
    nome: string;
    profissao: string;
    idadeAproximada: string;
    sexo: string;
    aparenciaPrimeiraImpressao: string;
    linguagemCorporalInicial: string;
  }>;

  // PARTE II — Interrogatório
  interrogatorio: {
    reacaoGeral: string;
    juradosAcreditaram: string;
    juradosCeticos: string;
    momentosImpacto: string;
    contradicoes: string;
    impressaoCredibilidade: string;
    nivelCredibilidade: number | null;
  };

  // PARTE III — Testemunhas (até 8)
  testemunhas: Array<{
    nome: string;
    resumoDepoimento: string;
    reacaoJurados: string;
    expressoesFaciaisLinguagem: string;
    credibilidade: number | null;
    observacoesComplementares: string;
  }>;

  // PARTE IV — Sustentação MP
  mpEstrategiaGeral: string;
  mpArgumentos: Array<{
    descricao: string;
    reacaoJurados: string;
    nivelPersuasao: number | null;
  }>;
  mpImpactoGeral: number | null;
  mpInclinacaoCondenar: string;

  // PARTE V — Sustentação Defesa
  defesaEstrategiaGeral: string;
  defesaArgumentos: Array<{
    descricao: string;
    reacaoJurados: string;
    nivelPersuasao: number | null;
  }>;
  defesaImpactoGeral: number | null;
  defesaDuvidaRazoavel: string;

  // PARTE VI — Réplica
  replica: {
    refutacoes: string;
    argumentosNovos: string;
    reacaoGeral: string;
    impacto: number | null;
    mudancaOpiniao: string;
  };

  // PARTE VII — Tréplica
  treplica: {
    refutacoes: string;
    apeloFinal: string;
    reacaoGeral: string;
    momentoImpactante: string;
    impacto: number | null;
    reconquistaIndecisos: string;
  };

  // PARTE VIII — Análise Final
  analise: {
    ladoMaisPersuasivo: string;
    qualReacoesIndicam: string;
    impactoAcusacao: number | null;
    impactoDefesa: number | null;
    previsaoVoto: Array<{
      tendencia: string;
      confianca: string;
      justificativa: string;
    }>;
    impressaoLeiga: string;
    argumentoMaisImpactante: string;
    pontosNaoExplorados: string;
    climaGeral: string;
    momentosVirada: string;
    surpresas: string;
    observacoesAdicionais: string;
  };
}

const INITIAL: AvaliacaoState = {
  processoNumero: "",
  nomeReu: "",
  dataJulgamento: "",
  observador: "",
  horarioInicio: "",
  duracaoEstimada: "",
  descricaoAmbiente: "",
  disposicaoFisica: "",
  climaEmocionalInicial: "",
  presencaPublicoMidia: "",
  jurados: Array.from({ length: 7 }, () => ({
    nome: "", profissao: "", idadeAproximada: "", sexo: "",
    aparenciaPrimeiraImpressao: "", linguagemCorporalInicial: "",
  })),
  interrogatorio: {
    reacaoGeral: "", juradosAcreditaram: "", juradosCeticos: "",
    momentosImpacto: "", contradicoes: "", impressaoCredibilidade: "",
    nivelCredibilidade: null,
  },
  testemunhas: Array.from({ length: 5 }, () => ({
    nome: "", resumoDepoimento: "", reacaoJurados: "",
    expressoesFaciaisLinguagem: "", credibilidade: null, observacoesComplementares: "",
  })),
  mpEstrategiaGeral: "",
  mpArgumentos: Array.from({ length: 3 }, () => ({
    descricao: "", reacaoJurados: "", nivelPersuasao: null,
  })),
  mpImpactoGeral: null,
  mpInclinacaoCondenar: "",
  defesaEstrategiaGeral: "",
  defesaArgumentos: Array.from({ length: 3 }, () => ({
    descricao: "", reacaoJurados: "", nivelPersuasao: null,
  })),
  defesaImpactoGeral: null,
  defesaDuvidaRazoavel: "",
  replica: {
    refutacoes: "", argumentosNovos: "", reacaoGeral: "",
    impacto: null, mudancaOpiniao: "",
  },
  treplica: {
    refutacoes: "", apeloFinal: "", reacaoGeral: "",
    momentoImpactante: "", impacto: null, reconquistaIndecisos: "",
  },
  analise: {
    ladoMaisPersuasivo: "", qualReacoesIndicam: "",
    impactoAcusacao: null, impactoDefesa: null,
    previsaoVoto: Array.from({ length: 7 }, () => ({
      tendencia: "", confianca: "", justificativa: "",
    })),
    impressaoLeiga: "", argumentoMaisImpactante: "",
    pontosNaoExplorados: "", climaGeral: "", momentosVirada: "",
    surpresas: "", observacoesAdicionais: "",
  },
};

// ============================================
// FIELD HELPER — atualiza campo profundo
// ============================================
function setDeep(obj: any, path: string, value: any): any {
  const copy = JSON.parse(JSON.stringify(obj));
  const keys = path.split(".");
  let cur = copy;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = /^\d+$/.test(keys[i]) ? parseInt(keys[i]) : keys[i];
    cur = cur[k];
  }
  const last = /^\d+$/.test(keys[keys.length - 1]) ? parseInt(keys[keys.length - 1]) : keys[keys.length - 1];
  cur[last] = value;
  return copy;
}

// ============================================
// COMPONENTE: Formulário (estagiária escreve)
// ============================================
interface AvaliacaoInlineProps {
  isDarkMode: boolean;
  faseSelecionada: FaseConfig;
}

export function AvaliacaoInline({ isDarkMode, faseSelecionada }: AvaliacaoInlineProps) {
  const [data, setData] = useState<AvaliacaoState>(INITIAL);
  const [secao, setSecao] = useState("contexto");
  const [loaded, setLoaded] = useState(false);

  // Carregar
  useEffect(() => {
    try {
      const raw = localStorage.getItem(AVALIACAO_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setData({ ...INITIAL, ...parsed });
      }
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  // Auto-save a cada mudança (sem botão de salvar)
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(AVALIACAO_STORAGE_KEY, JSON.stringify(data)); } catch { /* */ }
  }, [data, loaded]);

  // Acompanhar fase do plenário
  useEffect(() => {
    const match = SECOES.find(s => s.fase === faseSelecionada.id);
    if (match) setSecao(match.id);
  }, [faseSelecionada.id]);

  const up = useCallback((path: string, value: any) => {
    setData(prev => setDeep(prev, path, value));
  }, []);

  const secIdx = SECOES.findIndex(s => s.id === secao);
  const cardCls = isDarkMode
    ? "rounded-xl border border-neutral-800/80 bg-neutral-900 p-4"
    : "rounded-xl border border-neutral-200/80 bg-white p-4";

  // Helper para campo de texto
  const Campo = ({ path, placeholder, multiline = false, label: lbl }: {
    path: string; placeholder: string; multiline?: boolean; label?: string;
  }) => {
    const keys = path.split(".");
    let v: any = data;
    for (const k of keys) v = v?.[/^\d+$/.test(k) ? parseInt(k) : k];
    if (multiline) return (
      <div>
        {lbl && <Label className="text-[10px] font-medium text-muted-foreground">{lbl}</Label>}
        <Textarea
          value={v || ""}
          onChange={(e) => up(path, e.target.value)}
          placeholder={placeholder}
          className="text-xs min-h-[50px] mt-0.5"
        />
      </div>
    );
    return (
      <div>
        {lbl && <Label className="text-[10px] font-medium text-muted-foreground">{lbl}</Label>}
        <Input
          value={v || ""}
          onChange={(e) => up(path, e.target.value)}
          placeholder={placeholder}
          className="h-8 text-xs mt-0.5"
        />
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Cabeçalho compacto */}
      <div className={cn(cardCls, "pb-3")}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <ClipboardCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold">Formulário de Observação do Júri</h3>
            <p className="text-[10px] text-muted-foreground">Preencha durante o julgamento • auto-salva a cada campo</p>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-emerald-500">
            <CheckCircle2 className="w-3 h-3" />
            <span>Auto-salvo</span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Campo path="processoNumero" placeholder="Nº Processo" label="Processo" />
          <Campo path="nomeReu" placeholder="Nome do réu" label="Réu" />
          <Campo path="dataJulgamento" placeholder="dd/mm/aaaa" label="Data" />
          <Campo path="observador" placeholder="Nome" label="Observador(a)" />
        </div>
      </div>

      {/* Navegação das seções — destaque da fase atual */}
      <div className="flex gap-1 overflow-x-auto scrollbar-thin pb-1">
        {SECOES.map((s) => {
          const Icon = s.icon;
          const active = secao === s.id;
          const isFase = s.fase === faseSelecionada.id;
          return (
            <button
              key={s.id}
              onClick={() => setSecao(s.id)}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all shrink-0 cursor-pointer",
                active
                  ? "bg-purple-600 text-white shadow-sm"
                  : isFase
                  ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 ring-1 ring-purple-300 dark:ring-purple-700"
                  : isDarkMode
                  ? "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
                  : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
              )}
            >
              <Icon className="w-3 h-3" />
              {s.label}
              {isFase && !active && <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />}
            </button>
          );
        })}
      </div>

      {/* ==================== CONTEÚDO POR SEÇÃO ==================== */}
      <div className={cn(cardCls, "space-y-3")}>

        {/* ===== CONTEXTO E AMBIENTE ===== */}
        {secao === "contexto" && (
          <>
            <SectionTitle icon={MapPin} title="Contexto e Ambiente do Julgamento" isDark={isDarkMode} />
            <div className="grid grid-cols-2 gap-2">
              <Campo path="horarioInicio" placeholder="00:00" label="Horário de Início" />
              <Campo path="duracaoEstimada" placeholder="Ex: 6h" label="Duração Estimada" />
            </div>
            <Campo path="descricaoAmbiente" placeholder="Iluminação, temperatura, acústica, conforto da sala..." multiline label="Descrição do Ambiente" />
            <Campo path="disposicaoFisica" placeholder="Posicionamento dos jurados em relação ao réu, testemunhas, advogados..." multiline label="Disposição Física" />
            <Campo path="climaEmocionalInicial" placeholder="Tensão, tranquilidade, expectativa observada nos jurados..." multiline label="Clima Emocional Inicial" />
            <Campo path="presencaPublicoMidia" placeholder="Influência aparente no comportamento dos jurados..." multiline label="Presença de Público/Mídia" />
          </>
        )}

        {/* ===== JURADOS ===== */}
        {secao === "jurados" && (
          <>
            <SectionTitle icon={Users} title="Parte I — Identificação dos Jurados" isDark={isDarkMode} />
            <div className="space-y-3">
              {data.jurados.map((j, i) => (
                <div key={i} className={cn(
                  "p-3 rounded-lg space-y-2",
                  isDarkMode ? "bg-neutral-800/40 border border-neutral-700/50" : "bg-neutral-50 border border-neutral-200/50"
                )}>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-bold px-1.5 h-5 shrink-0">
                      {i + 1}
                    </Badge>
                    <Input
                      value={j.nome}
                      onChange={(e) => up(`jurados.${i}.nome`, e.target.value)}
                      placeholder={`Nome do Jurado ${i + 1}`}
                      className="h-7 text-xs flex-1 font-medium"
                    />
                  </div>
                  {j.nome && (
                    <div className="space-y-2 pl-7">
                      <div className="grid grid-cols-3 gap-2">
                        <Input value={j.profissao} onChange={(e) => up(`jurados.${i}.profissao`, e.target.value)} placeholder="Profissão" className="h-7 text-[10px]" />
                        <Input value={j.idadeAproximada} onChange={(e) => up(`jurados.${i}.idadeAproximada`, e.target.value)} placeholder="Idade aprox." className="h-7 text-[10px]" />
                        <Select value={j.sexo} onValueChange={(v) => up(`jurados.${i}.sexo`, v)}>
                          <SelectTrigger className="h-7 text-[10px]"><SelectValue placeholder="Sexo" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="M">Masculino</SelectItem>
                            <SelectItem value="F">Feminino</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Input value={j.aparenciaPrimeiraImpressao} onChange={(e) => up(`jurados.${i}.aparenciaPrimeiraImpressao`, e.target.value)} placeholder="Aparência e primeira impressão" className="h-7 text-[10px]" />
                      <Input value={j.linguagemCorporalInicial} onChange={(e) => up(`jurados.${i}.linguagemCorporalInicial`, e.target.value)} placeholder="Linguagem corporal inicial" className="h-7 text-[10px]" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ===== INTERROGATÓRIO ===== */}
        {secao === "interrogatorio" && (
          <>
            <SectionTitle icon={MessageSquare} title="Parte II — Interrogatório do Réu" isDark={isDarkMode} />
            <Campo path="interrogatorio.reacaoGeral" placeholder="Reação geral dos jurados durante o interrogatório..." multiline label="Reação Geral dos Jurados" />
            <Campo path="interrogatorio.juradosAcreditaram" placeholder="Quais jurados pareceram acreditar no réu? Quais sinais?" multiline label="Jurados que Acreditaram" />
            <Campo path="interrogatorio.juradosCeticos" placeholder="Quais jurados pareceram céticos? Quais sinais?" multiline label="Jurados Céticos" />
            <Campo path="interrogatorio.momentosImpacto" placeholder="Momentos de maior impacto no interrogatório..." multiline label="Momentos de Maior Impacto" />
            <Campo path="interrogatorio.contradicoes" placeholder="Contradições ou inconsistências percebidas pelos jurados..." multiline label="Contradições Percebidas" />
            <Campo path="interrogatorio.impressaoCredibilidade" placeholder="Impressão geral sobre a credibilidade do réu perante os jurados..." multiline label="Avaliação de Credibilidade" />
            <Escala
              value={data.interrogatorio.nivelCredibilidade}
              onChange={(v) => up("interrogatorio.nivelCredibilidade", v)}
              label="Nível de Credibilidade Aparente"
              lowLabel="Muito Baixa"
              highLabel="Muito Alta"
            />
          </>
        )}

        {/* ===== TESTEMUNHAS ===== */}
        {secao === "testemunhas" && (
          <>
            <div className="flex items-center justify-between">
              <SectionTitle icon={Mic} title="Parte III — Inquirição das Testemunhas" isDark={isDarkMode} />
              <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => {
                setData(prev => ({ ...prev, testemunhas: [...prev.testemunhas, { nome: "", resumoDepoimento: "", reacaoJurados: "", expressoesFaciaisLinguagem: "", credibilidade: null, observacoesComplementares: "" }] }));
              }}>+ Testemunha</Button>
            </div>
            <div className="space-y-3">
              {data.testemunhas.map((t, i) => (
                <div key={i} className={cn(
                  "p-3 rounded-lg space-y-2",
                  isDarkMode ? "bg-neutral-800/40 border border-neutral-700/50" : "bg-neutral-50 border border-neutral-200/50"
                )}>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-bold px-1.5 h-5 shrink-0">{i + 1}</Badge>
                    <Input value={t.nome} onChange={(e) => up(`testemunhas.${i}.nome`, e.target.value)} placeholder={`Nome da Testemunha ${i + 1}`} className="h-7 text-xs flex-1 font-medium" />
                  </div>
                  {t.nome && (
                    <div className="space-y-2 pl-7">
                      <Textarea value={t.resumoDepoimento} onChange={(e) => up(`testemunhas.${i}.resumoDepoimento`, e.target.value)} placeholder="Resumo do depoimento..." className="text-[10px] min-h-[40px]" />
                      <Textarea value={t.reacaoJurados} onChange={(e) => up(`testemunhas.${i}.reacaoJurados`, e.target.value)} placeholder="Reação dos jurados..." className="text-[10px] min-h-[40px]" />
                      <Input value={t.expressoesFaciaisLinguagem} onChange={(e) => up(`testemunhas.${i}.expressoesFaciaisLinguagem`, e.target.value)} placeholder="Expressões faciais e linguagem corporal da testemunha..." className="h-7 text-[10px]" />
                      <Escala value={t.credibilidade} onChange={(v) => up(`testemunhas.${i}.credibilidade`, v)} label="Credibilidade" lowLabel="Muito Baixa" highLabel="Muito Alta" />
                      <Textarea value={t.observacoesComplementares} onChange={(e) => up(`testemunhas.${i}.observacoesComplementares`, e.target.value)} placeholder="Observações complementares..." className="text-[10px] min-h-[30px]" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ===== SUSTENTAÇÃO MP ===== */}
        {secao === "mp" && (
          <>
            <SectionTitle icon={Gavel} title="Parte IV — Sustentação do Ministério Público" isDark={isDarkMode} color="text-rose-500" />
            <Campo path="mpEstrategiaGeral" placeholder="Estratégia geral do MP..." multiline label="Estratégia Geral do MP" />
            {data.mpArgumentos.map((a, i) => (
              <div key={i} className={cn("p-3 rounded-lg space-y-2", isDarkMode ? "bg-neutral-800/40" : "bg-neutral-50")}>
                <Label className="text-[10px] font-semibold text-rose-600">Argumento {i + 1} do MP</Label>
                <Textarea value={a.descricao} onChange={(e) => up(`mpArgumentos.${i}.descricao`, e.target.value)} placeholder="Descrição do argumento..." className="text-[10px] min-h-[40px]" />
                <Textarea value={a.reacaoJurados} onChange={(e) => up(`mpArgumentos.${i}.reacaoJurados`, e.target.value)} placeholder="Reação dos jurados..." className="text-[10px] min-h-[30px]" />
                <Escala value={a.nivelPersuasao} onChange={(v) => up(`mpArgumentos.${i}.nivelPersuasao`, v)} label="Nível de Persuasão" lowLabel="Nada" highLabel="Muito" />
              </div>
            ))}
            <Escala value={data.mpImpactoGeral} onChange={(v) => up("mpImpactoGeral", v)} label="Impacto Geral nos Jurados" lowLabel="Nenhum" highLabel="Decisivo" />
            <Campo path="mpInclinacaoCondenar" placeholder="Os jurados parecem inclinados a condenar? Quais sinais indicam isso?" multiline label="Inclinação a Condenar" />
          </>
        )}

        {/* ===== SUSTENTAÇÃO DEFESA ===== */}
        {secao === "defesa" && (
          <>
            <SectionTitle icon={Scale} title="Parte V — Sustentação da Defesa" isDark={isDarkMode} color="text-emerald-500" />
            <Campo path="defesaEstrategiaGeral" placeholder="Estratégia geral da defesa..." multiline label="Estratégia Geral da Defesa" />
            {data.defesaArgumentos.map((a, i) => (
              <div key={i} className={cn("p-3 rounded-lg space-y-2", isDarkMode ? "bg-neutral-800/40" : "bg-neutral-50")}>
                <Label className="text-[10px] font-semibold text-emerald-600">Argumento {i + 1} da Defesa</Label>
                <Textarea value={a.descricao} onChange={(e) => up(`defesaArgumentos.${i}.descricao`, e.target.value)} placeholder="Descrição do argumento..." className="text-[10px] min-h-[40px]" />
                <Textarea value={a.reacaoJurados} onChange={(e) => up(`defesaArgumentos.${i}.reacaoJurados`, e.target.value)} placeholder="Reação dos jurados..." className="text-[10px] min-h-[30px]" />
                <Escala value={a.nivelPersuasao} onChange={(v) => up(`defesaArgumentos.${i}.nivelPersuasao`, v)} label="Nível de Persuasão" lowLabel="Nada" highLabel="Muito" />
              </div>
            ))}
            <Escala value={data.defesaImpactoGeral} onChange={(v) => up("defesaImpactoGeral", v)} label="Impacto Geral nos Jurados" lowLabel="Nenhum" highLabel="Decisivo" />
            <Campo path="defesaDuvidaRazoavel" placeholder="Os argumentos geraram dúvida razoável nos jurados? Quais sinais indicam isso?" multiline label="Dúvida Razoável" />
          </>
        )}

        {/* ===== RÉPLICA ===== */}
        {secao === "replica" && (
          <>
            <SectionTitle icon={AlertTriangle} title="Parte VI — Réplica do Ministério Público" isDark={isDarkMode} color="text-amber-500" />
            <Campo path="replica.refutacoes" placeholder="Refutações aos argumentos da defesa..." multiline label="Refutações" />
            <Campo path="replica.argumentosNovos" placeholder="Argumentos novos introduzidos..." multiline label="Argumentos Novos" />
            <Campo path="replica.reacaoGeral" placeholder="Reação geral dos jurados..." multiline label="Reação Geral" />
            <Escala value={data.replica.impacto} onChange={(v) => up("replica.impacto", v)} label="Impacto da Réplica nos Jurados" lowLabel="Nenhum" highLabel="Decisivo" />
            <Campo path="replica.mudancaOpiniao" placeholder="A réplica pareceu mudar a opinião de algum jurado? Quais sinais?" multiline label="Mudança de Opinião" />
          </>
        )}

        {/* ===== TRÉPLICA ===== */}
        {secao === "treplica" && (
          <>
            <SectionTitle icon={Target} title="Parte VII — Tréplica da Defesa" isDark={isDarkMode} color="text-blue-500" />
            <Campo path="treplica.refutacoes" placeholder="Refutações aos argumentos da réplica..." multiline label="Refutações" />
            <Campo path="treplica.apeloFinal" placeholder="Apelo final / encerramento emocional..." multiline label="Apelo Final" />
            <Campo path="treplica.reacaoGeral" placeholder="Reação geral dos jurados..." multiline label="Reação Geral" />
            <Campo path="treplica.momentoImpactante" placeholder="Momento mais impactante da tréplica..." multiline label="Momento Mais Impactante" />
            <Escala value={data.treplica.impacto} onChange={(v) => up("treplica.impacto", v)} label="Impacto da Tréplica" lowLabel="Nenhum" highLabel="Decisivo" />
            <Campo path="treplica.reconquistaIndecisos" placeholder="A tréplica pareceu reconquistar jurados indecisos? Quais sinais?" multiline label="Reconquista de Indecisos" />
          </>
        )}

        {/* ===== ANÁLISE FINAL ===== */}
        {secao === "analise" && (
          <>
            <SectionTitle icon={BarChart3} title="Parte VIII — Análise Final e Previsão" isDark={isDarkMode} color="text-purple-500" />
            <Campo path="analise.qualReacoesIndicam" placeholder="Qual lado pareceu mais persuasivo? Quais reações indicam isso?" multiline label="Análise Comparativa" />
            <div className="grid grid-cols-2 gap-3">
              <Escala value={data.analise.impactoAcusacao} onChange={(v) => up("analise.impactoAcusacao", v)} label="Impacto da Acusação" lowLabel="Fraco" highLabel="Forte" />
              <Escala value={data.analise.impactoDefesa} onChange={(v) => up("analise.impactoDefesa", v)} label="Impacto da Defesa" lowLabel="Fraco" highLabel="Forte" />
            </div>

            {/* Previsão de Voto — tabela compacta */}
            <div>
              <Label className="text-xs font-semibold mb-2 block">Previsão de Voto dos Jurados</Label>
              <div className="space-y-2">
                {data.analise.previsaoVoto.map((pv, i) => (
                  <div key={i} className={cn(
                    "flex items-center gap-2 p-2 rounded-lg",
                    isDarkMode ? "bg-neutral-800/40" : "bg-neutral-50"
                  )}>
                    <Badge variant="outline" className="text-[10px] font-bold px-1.5 h-5 shrink-0 w-6 justify-center">{i + 1}</Badge>
                    <span className="text-[10px] text-muted-foreground w-20 shrink-0 truncate">
                      {data.jurados[i]?.nome ? data.jurados[i].nome.split(" ").slice(0, 2).join(" ") : `Jurado ${i + 1}`}
                    </span>
                    <Tendencia
                      tendencia={pv.tendencia}
                      confianca={pv.confianca}
                      onTendenciaChange={(v) => up(`analise.previsaoVoto.${i}.tendencia`, v)}
                      onConfiancaChange={(v) => up(`analise.previsaoVoto.${i}.confianca`, v)}
                    />
                    <Input value={pv.justificativa} onChange={(e) => up(`analise.previsaoVoto.${i}.justificativa`, e.target.value)} placeholder="Justificativa..." className="h-7 text-[10px] flex-1" />
                  </div>
                ))}
              </div>
            </div>

            <Campo path="analise.impressaoLeiga" placeholder="Se fosse uma cidadã no júri (sem conhecimento jurídico), qual seria sua impressão final?" multiline label="Impressão como Observadora Leiga" />
            <Campo path="analise.argumentoMaisImpactante" placeholder="Qual argumento pareceu mais impactante para os jurados?" multiline label="Argumento Mais Impactante" />
            <Campo path="analise.pontosNaoExplorados" placeholder="Pontos que poderiam ter sido mais explorados..." multiline label="Pontos Não Explorados" />
            <Campo path="analise.climaGeral" placeholder="Clima geral do julgamento..." multiline label="Clima Geral" />
            <Campo path="analise.momentosVirada" placeholder="Momentos de virada (mudanças no ânimo dos jurados)..." multiline label="Momentos de Virada" />
            <Campo path="analise.surpresas" placeholder="Surpresas do julgamento..." multiline label="Surpresas" />
            <Campo path="analise.observacoesAdicionais" placeholder="Observações adicionais sobre as reações dos jurados..." multiline label="Observações Adicionais" />
          </>
        )}
      </div>

      {/* Navegação Anterior / Próximo */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          disabled={secIdx <= 0}
          onClick={() => setSecao(SECOES[secIdx - 1].id)}
          className="h-8 text-xs gap-1"
        >
          <ChevronLeft className="w-3 h-3" />
          {secIdx > 0 ? SECOES[secIdx - 1].label : ""}
        </Button>
        <span className="text-[10px] text-muted-foreground">{secIdx + 1} / {SECOES.length}</span>
        <Button
          variant="outline"
          size="sm"
          disabled={secIdx >= SECOES.length - 1}
          onClick={() => setSecao(SECOES[secIdx + 1].id)}
          className="h-8 text-xs gap-1"
        >
          {secIdx < SECOES.length - 1 ? SECOES[secIdx + 1].label : ""}
          <ChevronRight className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

// ============================================
// COMPONENTE: Feed em tempo real (defensor lê)
// ============================================
interface AvaliacaoLiveFeedProps {
  isDarkMode: boolean;
}

export function AvaliacaoLiveFeed({ isDarkMode }: AvaliacaoLiveFeedProps) {
  const [data, setData] = useState<AvaliacaoState | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Polling localStorage a cada 1.5s
  useEffect(() => {
    const poll = () => {
      try {
        const raw = localStorage.getItem(AVALIACAO_STORAGE_KEY);
        if (raw) setData(JSON.parse(raw));
      } catch { /* */ }
    };
    poll();
    intervalRef.current = setInterval(poll, 1500);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  if (!data) {
    return (
      <div className={cn(
        "rounded-xl border p-6 text-center",
        isDarkMode ? "border-neutral-800 bg-neutral-900" : "border-neutral-200 bg-white"
      )}>
        <Eye className="w-8 h-8 mx-auto mb-2 text-neutral-400" />
        <p className="text-sm text-muted-foreground">Aguardando dados da estagiária...</p>
        <p className="text-[10px] text-neutral-400 mt-1">O formulário aparecerá aqui em tempo real</p>
      </div>
    );
  }

  const cardCls = isDarkMode
    ? "rounded-xl border border-neutral-800/80 bg-neutral-900 p-4"
    : "rounded-xl border border-neutral-200/80 bg-white p-4";

  // Helper para mostrar campo preenchido
  const Filled = ({ label, value }: { label: string; value: string | number | null }) => {
    if (!value && value !== 0) return null;
    return (
      <div className="flex gap-2 text-[11px]">
        <span className="text-muted-foreground shrink-0 font-medium">{label}:</span>
        <span className={isDarkMode ? "text-neutral-300" : "text-neutral-700"}>{value}</span>
      </div>
    );
  };

  // Contagem de votos previstos
  const prevCondenar = data.analise?.previsaoVoto?.filter(v => v.tendencia === "CONDENAR").length || 0;
  const prevAbsolver = data.analise?.previsaoVoto?.filter(v => v.tendencia === "ABSOLVER").length || 0;
  const prevIndeciso = data.analise?.previsaoVoto?.filter(v => v.tendencia === "INDECISO").length || 0;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className={cn(cardCls, "flex items-center gap-3")}>
        <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
          <Eye className="w-4 h-4 text-purple-600 dark:text-purple-400" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold">Feed da Estagiária</h4>
          <p className="text-[10px] text-muted-foreground">Leitura em tempo real do formulário de observação</p>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-emerald-500 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Ao vivo
        </div>
      </div>

      {/* Dados do caso */}
      {(data.processoNumero || data.nomeReu) && (
        <div className={cn(cardCls, "space-y-1")}>
          <Filled label="Processo" value={data.processoNumero} />
          <Filled label="Réu" value={data.nomeReu} />
          <Filled label="Observador(a)" value={data.observador} />
        </div>
      )}

      {/* Contexto */}
      {data.descricaoAmbiente && (
        <div className={cn(cardCls, "space-y-1")}>
          <Label className="text-[10px] font-semibold text-purple-600">Contexto</Label>
          <Filled label="Ambiente" value={data.descricaoAmbiente} />
          <Filled label="Clima" value={data.climaEmocionalInicial} />
          <Filled label="Público" value={data.presencaPublicoMidia} />
        </div>
      )}

      {/* Jurados preenchidos */}
      {data.jurados.some(j => j.nome) && (
        <div className={cn(cardCls, "space-y-2")}>
          <Label className="text-[10px] font-semibold text-purple-600">Jurados Identificados</Label>
          <div className="grid grid-cols-1 gap-1">
            {data.jurados.filter(j => j.nome).map((j, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px]">
                <Badge variant="outline" className="h-4 w-4 p-0 justify-center text-[8px]">{i + 1}</Badge>
                <span className="font-medium">{j.nome}</span>
                {j.profissao && <span className="text-muted-foreground">• {j.profissao}</span>}
                {j.linguagemCorporalInicial && <span className="text-neutral-400 truncate">— {j.linguagemCorporalInicial}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interrogatório */}
      {data.interrogatorio.reacaoGeral && (
        <div className={cn(cardCls, "space-y-1")}>
          <Label className="text-[10px] font-semibold text-purple-600">Interrogatório</Label>
          <Filled label="Reação" value={data.interrogatorio.reacaoGeral} />
          <Filled label="Acreditaram" value={data.interrogatorio.juradosAcreditaram} />
          <Filled label="Céticos" value={data.interrogatorio.juradosCeticos} />
          {data.interrogatorio.nivelCredibilidade && (
            <Filled label="Credibilidade" value={`${data.interrogatorio.nivelCredibilidade}/10`} />
          )}
        </div>
      )}

      {/* Testemunhas */}
      {data.testemunhas.some(t => t.nome) && (
        <div className={cn(cardCls, "space-y-2")}>
          <Label className="text-[10px] font-semibold text-purple-600">Testemunhas</Label>
          {data.testemunhas.filter(t => t.nome).map((t, i) => (
            <div key={i} className={cn("p-2 rounded-lg space-y-1", isDarkMode ? "bg-neutral-800/40" : "bg-neutral-50")}>
              <span className="text-[10px] font-semibold">{t.nome}</span>
              <Filled label="Depoimento" value={t.resumoDepoimento} />
              <Filled label="Jurados" value={t.reacaoJurados} />
              {t.credibilidade && <Filled label="Credibilidade" value={`${t.credibilidade}/10`} />}
            </div>
          ))}
        </div>
      )}

      {/* MP */}
      {(data.mpEstrategiaGeral || data.mpImpactoGeral) && (
        <div className={cn(cardCls, "space-y-1")}>
          <Label className="text-[10px] font-semibold text-rose-500">Acusação (MP)</Label>
          <Filled label="Estratégia" value={data.mpEstrategiaGeral} />
          {data.mpArgumentos.filter(a => a.descricao).map((a, i) => (
            <Filled key={i} label={`Arg. ${i + 1}`} value={`${a.descricao}${a.nivelPersuasao ? ` (${a.nivelPersuasao}/10)` : ""}`} />
          ))}
          {data.mpImpactoGeral && <Filled label="Impacto" value={`${data.mpImpactoGeral}/10`} />}
          <Filled label="Condenar?" value={data.mpInclinacaoCondenar} />
        </div>
      )}

      {/* Defesa */}
      {(data.defesaEstrategiaGeral || data.defesaImpactoGeral) && (
        <div className={cn(cardCls, "space-y-1")}>
          <Label className="text-[10px] font-semibold text-emerald-500">Defesa</Label>
          <Filled label="Estratégia" value={data.defesaEstrategiaGeral} />
          {data.defesaArgumentos.filter(a => a.descricao).map((a, i) => (
            <Filled key={i} label={`Arg. ${i + 1}`} value={`${a.descricao}${a.nivelPersuasao ? ` (${a.nivelPersuasao}/10)` : ""}`} />
          ))}
          {data.defesaImpactoGeral && <Filled label="Impacto" value={`${data.defesaImpactoGeral}/10`} />}
          <Filled label="Dúvida razoável?" value={data.defesaDuvidaRazoavel} />
        </div>
      )}

      {/* Réplica / Tréplica */}
      {data.replica.refutacoes && (
        <div className={cn(cardCls, "space-y-1")}>
          <Label className="text-[10px] font-semibold text-amber-500">Réplica</Label>
          <Filled label="Refutações" value={data.replica.refutacoes} />
          {data.replica.impacto && <Filled label="Impacto" value={`${data.replica.impacto}/10`} />}
          <Filled label="Mudança opinião" value={data.replica.mudancaOpiniao} />
        </div>
      )}
      {data.treplica.refutacoes && (
        <div className={cn(cardCls, "space-y-1")}>
          <Label className="text-[10px] font-semibold text-blue-500">Tréplica</Label>
          <Filled label="Refutações" value={data.treplica.refutacoes} />
          {data.treplica.impacto && <Filled label="Impacto" value={`${data.treplica.impacto}/10`} />}
          <Filled label="Reconquista" value={data.treplica.reconquistaIndecisos} />
        </div>
      )}

      {/* Previsão de voto */}
      {(prevCondenar + prevAbsolver + prevIndeciso > 0) && (
        <div className={cn(cardCls, "space-y-2")}>
          <Label className="text-[10px] font-semibold text-purple-600">Previsão de Voto</Label>
          <div className="flex items-center gap-3">
            <Badge className="bg-rose-500 text-white text-xs px-2">{prevCondenar} Condenar</Badge>
            <Badge className="bg-amber-500 text-white text-xs px-2">{prevIndeciso} Indeciso</Badge>
            <Badge className="bg-emerald-500 text-white text-xs px-2">{prevAbsolver} Absolver</Badge>
          </div>
          <div className="space-y-1">
            {data.analise.previsaoVoto.map((pv, i) => pv.tendencia && (
              <div key={i} className="flex items-center gap-2 text-[10px]">
                <Badge variant="outline" className="h-4 w-4 p-0 justify-center text-[8px]">{i + 1}</Badge>
                <span className={cn(
                  "font-medium",
                  pv.tendencia === "CONDENAR" ? "text-rose-500" : pv.tendencia === "ABSOLVER" ? "text-emerald-500" : "text-amber-500"
                )}>
                  {pv.tendencia === "CONDENAR" ? "Condenar" : pv.tendencia === "ABSOLVER" ? "Absolver" : "Indeciso"}
                </span>
                {pv.justificativa && <span className="text-muted-foreground truncate">— {pv.justificativa}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Análise Final */}
      {data.analise.impressaoLeiga && (
        <div className={cn(cardCls, "space-y-1")}>
          <Label className="text-[10px] font-semibold text-purple-600">Impressão Leiga</Label>
          <p className={cn("text-[11px]", isDarkMode ? "text-neutral-300" : "text-neutral-700")}>{data.analise.impressaoLeiga}</p>
        </div>
      )}
    </div>
  );
}

// ============================================
// HELPER COMPONENT: Section Title
// ============================================
function SectionTitle({ icon: Icon, title, isDark, color = "text-purple-500" }: {
  icon: any; title: string; isDark: boolean; color?: string;
}) {
  return (
    <h4 className={cn("text-sm font-semibold flex items-center gap-2", isDark ? "text-neutral-200" : "text-neutral-700")}>
      <Icon className={cn("w-4 h-4", color)} />
      {title}
    </h4>
  );
}
