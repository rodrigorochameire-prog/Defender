"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  Timer,
  CalendarDays,
  ArrowRight,
  CheckCircle2,
  Clock,
  Shield,
  Home,
  Sun,
  Key,
  Flag,
  MapPin,
  Phone,
  MessageSquare,
  Send,
  Settings,
  Edit3,
  Loader2,
  AlertTriangle,
  Info,
  ChevronDown,
  Copy,
  Check,
} from "lucide-react";
import {
  calcularExecucaoPenal,
  type ExecucaoPenalInput,
  type ExecucaoPenalResult,
  type MarcoExecucao,
  type TipoPenal,
  type RegimeInicial,
} from "@/lib/juri/execucao-penal";

// ============================================
// TYPES
// ============================================

type TabView = "projecao" | "handoff" | "whatsapp";

// ============================================
// MARCO ICONS
// ============================================

const MARCO_ICONS: Record<string, React.ElementType> = {
  detracao: Shield,
  progressao_1: ArrowRight,
  progressao_2: Home,
  saida_temporaria: Sun,
  livramento_condicional: Key,
  fim_pena: Flag,
};

const MARCO_COLORS: Record<string, string> = {
  detracao: "text-sky-500 bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800/30",
  progressao_1: "text-amber-500 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/30",
  progressao_2: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/30",
  saida_temporaria: "text-violet-500 bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800/30",
  livramento_condicional: "text-cyan-500 bg-cyan-50 dark:bg-cyan-950/30 border-cyan-200 dark:border-cyan-800/30",
  fim_pena: "text-rose-500 bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/30",
};

// ============================================
// TIMELINE MARCO CARD
// ============================================

function MarcoCard({ marco, index, total }: { marco: MarcoExecucao; index: number; total: number }) {
  const Icon = MARCO_ICONS[marco.tipo] || Clock;
  const colorClass = MARCO_COLORS[marco.tipo] || "text-neutral-500 bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-800";
  const dataFormatada = new Date(marco.data).toLocaleDateString("pt-BR");

  return (
    <div className="flex gap-4">
      {/* Timeline line */}
      <div className="flex flex-col items-center">
        <div className={cn("w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0", colorClass)}>
          <Icon className="w-4 h-4" />
        </div>
        {index < total - 1 && (
          <div className="w-px flex-1 bg-neutral-200 dark:bg-neutral-700 my-1" />
        )}
      </div>

      {/* Content */}
      <div className="pb-6 flex-1">
        <div className="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                {marco.labelAcessivel}
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {marco.label}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                {dataFormatada}
              </p>
              {marco.fracao && (
                <Badge variant="outline" className="text-[10px] mt-1">
                  {marco.fracao}
                </Badge>
              )}
            </div>
          </div>
          <p className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mt-2">
            {marco.fundamentoLegal}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// HANDOFF CONFIG EDITOR
// ============================================

function HandoffEditor({
  comarca,
}: {
  comarca: string;
}) {
  const { data: config, isLoading } = trpc.posJuri.getHandoffConfig.useQuery(
    { comarca },
    { enabled: !!comarca }
  );

  const [editing, setEditing] = useState(false);
  const [defensor2grau, setDefensor2grau] = useState("");
  const [defensorEP, setDefensorEP] = useState("");
  const [endereco, setEndereco] = useState("");
  const [telefone, setTelefone] = useState("");
  const [horario, setHorario] = useState("");
  const [mensagem, setMensagem] = useState("");

  const utils = trpc.useUtils();
  const upsertMutation = trpc.posJuri.upsertHandoffConfig.useMutation({
    onSuccess: () => {
      utils.posJuri.getHandoffConfig.invalidate();
      setEditing(false);
    },
  });

  const startEditing = () => {
    setDefensor2grau(config?.defensor2grauInfo || "");
    setDefensorEP(config?.defensorEPInfo || "");
    setEndereco(config?.nucleoEPEndereco || "");
    setTelefone(config?.nucleoEPTelefone || "");
    setHorario(config?.nucleoEPHorario || "");
    setMensagem(config?.mensagemPersonalizada || "");
    setEditing(true);
  };

  const handleSave = () => {
    upsertMutation.mutate({
      comarca,
      defensor2grauInfo: defensor2grau || null,
      defensorEPInfo: defensorEP || null,
      nucleoEPEndereco: endereco || null,
      nucleoEPTelefone: telefone || null,
      nucleoEPHorario: horario || null,
      mensagemPersonalizada: mensagem || null,
    });
  };

  if (isLoading) return <Skeleton className="h-48" />;

  if (editing) {
    return (
      <div className="space-y-4 p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Configurar Handoff — {comarca}
        </h3>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Defensor do 2º Grau (recurso)</Label>
            <Textarea
              value={defensor2grau}
              onChange={(e) => setDefensor2grau(e.target.value)}
              placeholder="Ex: Núcleo Criminal da 2ª Instância - DPEBA"
              rows={2}
            />
          </div>
          <div>
            <Label className="text-xs">Defensor da Execução Penal</Label>
            <Textarea
              value={defensorEP}
              onChange={(e) => setDefensorEP(e.target.value)}
              placeholder="Ex: Núcleo de Execução Penal - DPEBA"
              rows={2}
            />
          </div>
          <div>
            <Label className="text-xs">Endereço do Núcleo de EP</Label>
            <Textarea
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              placeholder="Endereço completo"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Telefone</Label>
              <input
                type="text"
                className="flex h-9 w-full rounded-md border border-neutral-200 bg-neutral-100 dark:bg-neutral-800 dark:border-neutral-700 px-3 py-1 text-sm"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(71) 3117-6800"
              />
            </div>
            <div>
              <Label className="text-xs">Horário</Label>
              <input
                type="text"
                className="flex h-9 w-full rounded-md border border-neutral-200 bg-neutral-100 dark:bg-neutral-800 dark:border-neutral-700 px-3 py-1 text-sm"
                value={horario}
                onChange={(e) => setHorario(e.target.value)}
                placeholder="Seg-Sex, 8h-14h"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Mensagem personalizada (opcional)</Label>
            <Textarea
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Mensagem adicional para o réu/família"
              rows={2}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={upsertMutation.isPending}>
            {upsertMutation.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
            Salvar
          </Button>
        </div>
      </div>
    );
  }

  // Read-only view
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
          Próximos Passos
        </h3>
        <Button variant="ghost" size="sm" onClick={startEditing} className="cursor-pointer">
          <Edit3 className="w-3 h-3 mr-1" />
          Configurar
        </Button>
      </div>

      <div className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 space-y-4">
        <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
          O trabalho do defensor do Tribunal do Júri se encerra com a interposição da apelação. A partir de agora, o acompanhamento segue com:
        </p>

        {/* Defensor 2º Grau */}
        <div className="p-3 rounded-lg bg-sky-50 dark:bg-sky-950/20 border border-sky-200/50 dark:border-sky-800/30">
          <p className="text-[10px] uppercase tracking-wider text-sky-500 mb-1">Recurso (2º Grau)</p>
          <p className="text-sm text-neutral-700 dark:text-neutral-300">
            {config?.defensor2grauInfo || "Não configurado — clique em Configurar"}
          </p>
        </div>

        {/* Defensor EP */}
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30">
          <p className="text-[10px] uppercase tracking-wider text-amber-500 mb-1">Execução Penal</p>
          <p className="text-sm text-neutral-700 dark:text-neutral-300">
            {config?.defensorEPInfo || "Não configurado — clique em Configurar"}
          </p>
        </div>

        {/* Núcleo EP */}
        {(config?.nucleoEPEndereco || config?.nucleoEPTelefone) && (
          <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/50 dark:border-neutral-800/50 space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider text-neutral-400 mb-1">Onde buscar atendimento</p>
            {config.nucleoEPEndereco && (
              <div className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-neutral-400" />
                {config.nucleoEPEndereco}
              </div>
            )}
            {config.nucleoEPTelefone && (
              <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                <Phone className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
                {config.nucleoEPTelefone}
              </div>
            )}
            {config.nucleoEPHorario && (
              <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                <Clock className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
                {config.nucleoEPHorario}
              </div>
            )}
          </div>
        )}

        {config?.mensagemPersonalizada && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400 italic">
            {config.mensagemPersonalizada}
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================
// WHATSAPP MESSAGE COMPOSER
// ============================================

function WhatsAppComposer({
  sessaoJuriId,
  marcos,
  handoff,
}: {
  sessaoJuriId: number;
  marcos: MarcoExecucao[];
  handoff: any;
}) {
  const [mensagem, setMensagem] = useState("");
  const [gerada, setGerada] = useState(false);
  const [copied, setCopied] = useState(false);

  const gerarMutation = trpc.posJuri.gerarMensagemExecucao.useMutation({
    onSuccess: (data) => {
      setMensagem(data.mensagem);
      setGerada(true);
    },
  });

  const handleGerar = () => {
    gerarMutation.mutate({
      sessaoJuriId,
      marcos: marcos.map((m) => ({
        label: m.labelAcessivel,
        data: m.data,
        fracao: m.fracao,
      })),
      handoff: handoff
        ? {
            defensor2grauInfo: handoff.defensor2grauInfo || undefined,
            defensorEPInfo: handoff.defensorEPInfo || undefined,
            nucleoEPEndereco: handoff.nucleoEPEndereco || undefined,
            nucleoEPTelefone: handoff.nucleoEPTelefone || undefined,
            nucleoEPHorario: handoff.nucleoEPHorario || undefined,
            mensagemPersonalizada: handoff.mensagemPersonalizada || undefined,
          }
        : undefined,
    });
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(mensagem);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Enviar via WhatsApp
        </h3>
        {!gerada && (
          <Button
            size="sm"
            onClick={handleGerar}
            disabled={gerarMutation.isPending}
            className="cursor-pointer"
          >
            {gerarMutation.isPending ? (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <MessageSquare className="w-3 h-3 mr-1" />
            )}
            Gerar mensagem
          </Button>
        )}
      </div>

      {!gerada ? (
        <div className="p-6 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 text-center">
          <MessageSquare className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Gere uma mensagem formatada com a projeção de marcos e informações de handoff para enviar ao réu ou família via WhatsApp.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <Textarea
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            rows={16}
            className="font-mono text-xs"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy} className="cursor-pointer">
              {copied ? (
                <Check className="w-3 h-3 mr-1 text-emerald-500" />
              ) : (
                <Copy className="w-3 h-3 mr-1" />
              )}
              {copied ? "Copiado!" : "Copiar"}
            </Button>
            <Button
              size="sm"
              onClick={handleGerar}
              disabled={gerarMutation.isPending}
              className="cursor-pointer"
            >
              {gerarMutation.isPending && (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              )}
              Regenerar
            </Button>
          </div>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            Edite a mensagem acima antes de enviar. Copie e cole no WhatsApp ou use a integração automática.
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function ExecucaoPage() {
  const [selectedSessaoId, setSelectedSessaoId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<TabView>("projecao");

  // Buscar sessões condenadas
  const { data: sessoesCondenadas, isLoading: loadingSessoes } =
    trpc.posJuri.listSessoesCondenadas.useQuery();

  // Buscar dados da sessão selecionada
  const { data: projecaoData, isLoading: loadingProjecao } =
    trpc.posJuri.getProjecaoExecucao.useQuery(
      { sessaoJuriId: Number(selectedSessaoId) },
      { enabled: !!selectedSessaoId }
    );

  // Buscar handoff config da comarca
  const comarca = projecaoData?.sessao?.comarca || "";
  const { data: handoffData } = trpc.posJuri.getHandoffConfig.useQuery(
    { comarca },
    { enabled: !!comarca }
  );

  // Calcular projeção de execução
  const resultado = useMemo<ExecucaoPenalResult | null>(() => {
    if (!projecaoData?.dosimetria || !projecaoData?.sessao) return null;

    const d = projecaoData.dosimetria;
    const s = projecaoData.sessao;

    // Verificar campos obrigatórios
    if (!d.penaTotalMeses || !d.regimeInicial || !s.tipoPenal) return null;

    try {
      return calcularExecucaoPenal({
        tipoPenal: s.tipoPenal as TipoPenal,
        penaTotalMeses: d.penaTotalMeses,
        regimeInicial: d.regimeInicial as RegimeInicial,
        dataFato: d.dataFato || new Date().toISOString().split("T")[0],
        dataCondenacao: s.dataSessao
          ? new Date(s.dataSessao).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        reuPrimario: s.reuPrimario ?? true,
        resultouMorte: d.resultouMorte ?? false,
        detracaoInicio: d.detracaoInicio || undefined,
      });
    } catch {
      return null;
    }
  }, [projecaoData]);

  const sessaoSelecionada = sessoesCondenadas?.find(
    (s) => String(s.id) === selectedSessaoId
  );

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-[#0f0f11]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-neutral-900 dark:bg-white flex items-center justify-center shadow-lg">
            <Timer className="w-5 h-5 text-white dark:text-neutral-900" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
              Execução
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Projeção de marcos e handoff pós-condenação
            </p>
          </div>
        </div>

        {/* Seletor de sessão */}
        <div className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80">
          <Label className="text-xs text-neutral-500 dark:text-neutral-400 mb-2 block">
            Selecione a sessão de júri (condenação)
          </Label>
          {loadingSessoes ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Select value={selectedSessaoId} onValueChange={setSelectedSessaoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma sessão com condenação..." />
              </SelectTrigger>
              <SelectContent>
                {sessoesCondenadas?.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.assistidoNome || "Réu"} — {s.numeroAutos || "S/N"} (
                    {s.dataSessao
                      ? new Date(s.dataSessao).toLocaleDateString("pt-BR")
                      : "S/D"}
                    ) — {s.comarca || "S/C"}
                  </SelectItem>
                ))}
                {(!sessoesCondenadas || sessoesCondenadas.length === 0) && (
                  <SelectItem value="_none" disabled>
                    Nenhuma sessão com condenação
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Conteúdo */}
        {selectedSessaoId && (
          <>
            {loadingProjecao ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            ) : (
              <>
                {/* Info da sessão */}
                {projecaoData?.sessao && (
                  <div className="flex flex-wrap gap-3">
                    <Badge variant="outline" className="text-xs">
                      {projecaoData.sessao.assistidoNome || "Réu"}
                    </Badge>
                    <Badge variant="outline" className="text-xs font-mono">
                      {projecaoData.sessao.numeroAutos || "S/N"}
                    </Badge>
                    {projecaoData.dosimetria?.penaTotalMeses && (
                      <Badge variant="outline" className="text-xs">
                        Pena: {projecaoData.dosimetria.penaTotalMeses} meses
                      </Badge>
                    )}
                    {projecaoData.dosimetria?.regimeInicial && (
                      <Badge variant="outline" className="text-xs">
                        Regime: {projecaoData.dosimetria.regimeInicial}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Tabs */}
                <div className="flex gap-1 p-1 rounded-lg bg-neutral-100 dark:bg-neutral-800/50">
                  {[
                    { id: "projecao" as const, label: "Projeção", icon: CalendarDays },
                    { id: "handoff" as const, label: "Próximos Passos", icon: ArrowRight },
                    { id: "whatsapp" as const, label: "WhatsApp", icon: MessageSquare },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all duration-200 cursor-pointer",
                        activeTab === tab.id
                          ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm"
                          : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
                      )}
                    >
                      <tab.icon className="w-3.5 h-3.5" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                {activeTab === "projecao" && (
                  <div className="space-y-4">
                    {!resultado ? (
                      <div className="p-6 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 text-center">
                        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
                        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
                          Dados insuficientes
                        </h3>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                          Preencha a dosimetria da sessão (pena total, regime inicial, tipo penal) para calcular a projeção de execução penal.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Resumo */}
                        <div className="flex flex-wrap gap-3">
                          <div className="px-3 py-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-800/80">
                            <span className="text-[10px] uppercase tracking-wider text-neutral-400 block">Pena Total</span>
                            <span className="text-sm font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                              {resultado.penaTotalDias} dias ({Math.floor(resultado.penaTotalDias / 30)} meses)
                            </span>
                          </div>
                          {resultado.detracaoDias > 0 && (
                            <div className="px-3 py-2 rounded-lg bg-sky-50 dark:bg-sky-950/20 border border-sky-200/50 dark:border-sky-800/30">
                              <span className="text-[10px] uppercase tracking-wider text-sky-500 block">Detração</span>
                              <span className="text-sm font-mono font-semibold text-sky-700 dark:text-sky-300">
                                {resultado.detracaoDias} dias
                              </span>
                            </div>
                          )}
                          <div className="px-3 py-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-800/80">
                            <span className="text-[10px] uppercase tracking-wider text-neutral-400 block">Fração Progressão</span>
                            <span className="text-sm font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                              {resultado.fracaoLabel}
                            </span>
                          </div>
                          <div className="px-3 py-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-800/80">
                            <span className="text-[10px] uppercase tracking-wider text-neutral-400 block">Inciso</span>
                            <span className="text-sm font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                              {resultado.incisoAplicado}
                            </span>
                          </div>
                        </div>

                        {/* Timeline */}
                        <div className="mt-4">
                          {resultado.marcos.map((marco, i) => (
                            <MarcoCard
                              key={`${marco.tipo}-${i}`}
                              marco={marco}
                              index={i}
                              total={resultado.marcos.length}
                            />
                          ))}
                        </div>

                        {resultado.vedadoLivramento && (
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-800/30">
                            <AlertTriangle className="w-4 h-4 text-rose-500" />
                            <span className="text-sm text-rose-700 dark:text-rose-300 font-medium">
                              Livramento condicional vedado
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {activeTab === "handoff" && (
                  <HandoffEditor comarca={comarca || "Camaçari"} />
                )}

                {activeTab === "whatsapp" && resultado && (
                  <WhatsAppComposer
                    sessaoJuriId={Number(selectedSessaoId)}
                    marcos={resultado.marcos}
                    handoff={handoffData}
                  />
                )}

                {activeTab === "whatsapp" && !resultado && (
                  <div className="p-6 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 text-center">
                    <Info className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Preencha a dosimetria primeiro para gerar a mensagem de WhatsApp.
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Empty state */}
        {!selectedSessaoId && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-4">
              <Timer className="w-8 h-8 text-neutral-300 dark:text-neutral-600" />
            </div>
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
              Selecione uma sessão
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Escolha uma sessão de júri com condenação para projetar a execução penal
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
