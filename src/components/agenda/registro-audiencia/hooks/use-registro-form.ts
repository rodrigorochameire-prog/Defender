import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import {
  adicionarRegistroHistorico,
  buscarHistoricoPorEvento,
  buscarHistoricoPorProcesso,
  buscarHistoricoPorAssistido,
  vincularEventoRedesignado,
} from "@/lib/data/historico-audiencias";
import type { Depoente, RegistroAudienciaData } from "../types";

export type StatusAudiencia = "concluida" | "redesignada" | "suspensa";
export type TabKey = "geral" | "briefing" | "depoentes" | "manifestacoes" | "anotacoes" | "historico" | "registro" | "midia";

interface UseRegistroFormProps {
  evento: any;
  isOpen: boolean;
  onSave: (registro: RegistroAudienciaData) => void;
  onCriarNovoEvento?: (evento: any) => void;
}

export function useRegistroForm({ evento, isOpen, onSave, onCriarNovoEvento }: UseRegistroFormProps) {
  // Determine if this is a DB-backed audiencia or local event.
  // On the agenda page, DB audiencias receive a prefixed string id like "audiencia-179".
  // Calendar events use "calendar-<id>" and are NOT backed by the audiencias table.
  // We accept: raw number, "audiencia-<number>", or any numeric string.
  const audienciaId = (() => {
    const raw = evento?.id;
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
    if (typeof raw === "string") {
      const match = raw.match(/^audiencia-(\d+)$/);
      if (match) return parseInt(match[1], 10);
      // accept plain numeric strings for backward compatibility
      if (/^\d+$/.test(raw)) return parseInt(raw, 10);
    }
    return null;
  })();

  // Extract numeric processoId and assistidoId for DB queries
  const processoId = (() => {
    const pid = evento.processo?.id ?? evento.processoId;
    return typeof pid === "number" ? pid : undefined;
  })();
  const assistidoIdNum = (() => {
    const aid = evento.assistido?.id ?? evento.assistidoId;
    return typeof aid === "number" ? aid : undefined;
  })();

  // ==========================================
  // tRPC hooks (must be at top level)
  // ==========================================

  // Load saved registro from DB
  const { data: savedRegistro } = trpc.audiencias.buscarRegistro.useQuery(
    { audienciaId: audienciaId! },
    { enabled: isOpen && audienciaId !== null }
  );

  // Load historical registros from DB (by processo or assistido)
  const { data: historicoDb } = trpc.audiencias.buscarHistoricoRegistros.useQuery(
    { processoId, assistidoId: assistidoIdNum },
    { enabled: isOpen && (!!processoId || !!assistidoIdNum) }
  );

  // Save mutation
  const salvarMutation = trpc.audiencias.salvarRegistro.useMutation();

  // ==========================================
  // Local state
  // ==========================================

  const [registro, setRegistro] = useState<RegistroAudienciaData>({
    eventoId: evento.id,
    dataRealizacao: new Date().toISOString().split("T")[0],
    realizada: true,
    assistidoCompareceu: true,
    resultado: "",
    depoentes: [],
    atendimentoReuAntes: "",
    estrategiasDefesa: "",
    manifestacaoMP: "",
    manifestacaoDefesa: "",
    decisaoJuiz: "",
    encaminhamentos: "",
    anotacoesGerais: "",
    registradoPor: "Defensor Responsável",
    dataRegistro: new Date().toISOString(),
  });

  const [activeTab, setActiveTab] = useState<TabKey>("geral");
  const [editandoDepoente, setEditandoDepoente] = useState<Depoente | null>(null);
  const [novoDepoenteNome, setNovoDepoenteNome] = useState("");
  const [novoDepoenteTipo, setNovoDepoenteTipo] = useState<Depoente["tipo"]>("testemunha");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    estrategia: false,
    analise: false,
  });
  const [expandedDepoenteDetails, setExpandedDepoenteDetails] = useState<Record<string, boolean>>({});
  const [registrosAnteriores, setRegistrosAnteriores] = useState<any[]>([]);
  const [statusAudiencia, setStatusAudiencia] = useState<StatusAudiencia>("concluida");
  const [decretoRevelia, setDecretoRevelia] = useState<boolean | null>(null);
  const [registroSalvo, setRegistroSalvo] = useState(false);
  const [ultimoSalvamento, setUltimoSalvamento] = useState<string | null>(null);

  // Redesignacao detail states
  const [testemunhaIntimada, setTestemunhaIntimada] = useState("");
  const [parteInsistiu, setParteInsistiu] = useState("");
  const [depoentesRedesignacao, setDepoentesRedesignacao] = useState<string[]>([]);

  // Popover states
  const [novaDataPopoverOpen, setNovaDataPopoverOpen] = useState(false);
  const [novoHorarioPopoverOpen, setNovoHorarioPopoverOpen] = useState(false);

  // Track whether we already loaded from DB to avoid overwriting user edits
  const dbLoadedRef = useRef(false);

  // ==========================================
  // Load saved registro from DB when modal opens
  // ==========================================
  useEffect(() => {
    if (savedRegistro && isOpen && !dbLoadedRef.current) {
      const saved = savedRegistro as Record<string, any>;
      setRegistro((prev) => ({
        ...prev,
        ...saved,
        // Ensure depoentes is always an array
        depoentes: Array.isArray(saved.depoentes) ? saved.depoentes : prev.depoentes,
      }));
      setRegistroSalvo(true);
      dbLoadedRef.current = true;
    }
  }, [savedRegistro, isOpen]);

  // ==========================================
  // Load historico from DB
  // ==========================================
  useEffect(() => {
    if (historicoDb && historicoDb.length > 0) {
      const transformed = historicoDb.map((h) => ({
        ...((h.registroAudiencia || {}) as Record<string, any>),
        historicoId: `DB-${h.id}`,
        dataRealizacao: h.dataAudiencia,
        realizada: h.status === "realizada",
      }));
      setRegistrosAnteriores(transformed);
    }
  }, [historicoDb]);

  // ==========================================
  // Fallback: Load from localStorage for local events
  // ==========================================
  useEffect(() => {
    if (isOpen && evento.id && audienciaId === null) {
      // Local event -- use in-memory historico
      let historico = buscarHistoricoPorEvento(evento.id);

      if (historico.length === 0 && (evento.processo?.id || evento.processoId)) {
        const pid = evento.processo?.id || evento.processoId;
        historico = buscarHistoricoPorProcesso(pid || "");
      }

      if (historico.length === 0 && (evento.assistido?.id || evento.assistidoId)) {
        const aid = evento.assistido?.id || evento.assistidoId;
        historico = buscarHistoricoPorAssistido(aid || "");
      }

      setRegistrosAnteriores(historico);
    } else if (!isOpen) {
      setRegistroSalvo(false);
      setUltimoSalvamento(null);
      dbLoadedRef.current = false;
    }
  }, [isOpen, evento.id, audienciaId]);

  // ==========================================
  // Submit handler (async for DB persistence)
  // ==========================================
  const handleSubmit = useCallback(async () => {
    if (!registro.dataRealizacao) {
      toast.error("Data de realizacao e obrigatoria");
      return;
    }
    if (statusAudiencia === "concluida" && !registro.resultado) {
      toast.error("Resultado da audiencia e obrigatorio");
      return;
    }
    if (statusAudiencia === "redesignada" && !registro.motivoNaoRealizacao) {
      toast.error("Motivo da redesignacao e obrigatorio");
      return;
    }

    const registroComVinculo: RegistroAudienciaData = {
      ...registro,
      historicoId: `HIST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      processoId: evento.processo?.id || evento.processoId,
      casoId: evento.caso?.id || evento.casoId,
      assistidoId: evento.assistido?.id || evento.assistidoId,
    };

    try {
      if (audienciaId) {
        // Save to Supabase via tRPC
        await salvarMutation.mutateAsync({
          audienciaId,
          registro: registroComVinculo,
        });
      } else {
        // Fallback to in-memory store for local events
        const historicoSalvo = adicionarRegistroHistorico(registroComVinculo);

        if (!registro.realizada && registro.dataRedesignacao && onCriarNovoEvento) {
          const novoEventoId = `EVT-${Date.now()}`;
          const novoEvento = {
            id: novoEventoId,
            titulo: evento.titulo,
            assistido: evento.assistido,
            processo: evento.processo,
            atribuicao: evento.atribuicao,
            data: registro.dataRedesignacao,
            horarioInicio: registro.horarioRedesignacao || evento.horarioInicio || "09:00",
            horarioFim: evento.horarioFim || "10:00",
            local: evento.local,
            tipo: evento.tipo || "audiencia",
            status: "agendado",
            descricao: `Audiencia redesignada. Motivo: ${registro.motivoRedesignacao || "Nao informado"}`,
            prioridade: evento.prioridade || "media",
            recorrencia: "nenhuma",
            lembretes: ["1d"],
            tags: ["Redesignada"],
            participantes: evento.participantes || [],
            observacoes: `Audiencia redesignada. Motivo: ${registro.motivoRedesignacao || "Nao informado"}`,
            documentos: [],
            dataInclusao: new Date().toISOString(),
            responsavel: evento.responsavel,
          };

          onCriarNovoEvento(novoEvento);
          vincularEventoRedesignado(historicoSalvo.historicoId, novoEventoId);
          toast.success("Novo evento criado para a data redesignada!");
        }
      }

      // Also handle redesignacao for DB-backed events
      if (audienciaId && !registro.realizada && registro.dataRedesignacao && onCriarNovoEvento) {
        const novoEvento = {
          id: `EVT-${Date.now()}`,
          titulo: evento.titulo,
          assistido: evento.assistido,
          processo: evento.processo,
          atribuicao: evento.atribuicao,
          data: registro.dataRedesignacao,
          horarioInicio: registro.horarioRedesignacao || evento.horarioInicio || "09:00",
          horarioFim: evento.horarioFim || "10:00",
          local: evento.local,
          tipo: evento.tipo || "audiencia",
          status: "agendado",
          descricao: `Audiencia redesignada. Motivo: ${registro.motivoRedesignacao || "Nao informado"}`,
          prioridade: evento.prioridade || "media",
          recorrencia: "nenhuma",
          lembretes: ["1d"],
          tags: ["Redesignada"],
          participantes: evento.participantes || [],
          observacoes: `Audiencia redesignada. Motivo: ${registro.motivoRedesignacao || "Nao informado"}`,
          documentos: [],
          dataInclusao: new Date().toISOString(),
          responsavel: evento.responsavel,
        };

        onCriarNovoEvento(novoEvento);
        toast.success("Novo evento criado para a data redesignada!");
      }

      onSave(registroComVinculo);

      const isAtualizacao = registroSalvo;
      setRegistroSalvo(true);
      setUltimoSalvamento(
        new Date().toLocaleString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          day: "2-digit",
          month: "2-digit",
        })
      );

      toast.success(isAtualizacao ? "Registro atualizado com sucesso!" : "Registro salvo com sucesso!", {
        description: audienciaId
          ? "Salvo no banco de dados"
          : isAtualizacao
            ? "As alteracoes foram salvas no historico"
            : "Voce pode continuar editando ou fechar o modal",
      });
    } catch (error) {
      console.error("Erro ao salvar registro:", error);
      toast.error("Erro ao salvar registro", {
        description: "Tente novamente",
      });
    }
  }, [registro, statusAudiencia, registroSalvo, evento, onSave, onCriarNovoEvento, audienciaId, salvarMutation]);

  const handleAddDepoente = useCallback(() => {
    if (!novoDepoenteNome.trim()) {
      toast.error("Nome do depoente e obrigatorio");
      return;
    }
    const novoDepoente: Depoente = {
      id: `dep-${Date.now()}`,
      nome: novoDepoenteNome.trim(),
      tipo: novoDepoenteTipo,
      intimado: false,
      presente: true,
      estrategiaInquiricao: "",
      perguntasDefesa: "",
      depoimentoLiteral: "",
      analisePercepcoes: "",
    };
    setRegistro((prev) => ({ ...prev, depoentes: [...prev.depoentes, novoDepoente] }));
    setNovoDepoenteNome("");
    setNovoDepoenteTipo("testemunha");
    setEditandoDepoente(novoDepoente);
    toast.success("Depoente adicionado");
  }, [novoDepoenteNome, novoDepoenteTipo]);

  const handleRemoveDepoente = useCallback(
    (id: string) => {
      setRegistro((prev) => ({ ...prev, depoentes: prev.depoentes.filter((d) => d.id !== id) }));
      if (editandoDepoente?.id === id) setEditandoDepoente(null);
      toast.success("Depoente removido");
    },
    [editandoDepoente]
  );

  const handleUpdateDepoente = useCallback((depoente: Depoente) => {
    setRegistro((prev) => ({
      ...prev,
      depoentes: prev.depoentes.map((d) => (d.id === depoente.id ? depoente : d)),
    }));
    setEditandoDepoente(depoente);
  }, []);

  const updateRegistro = useCallback((partial: Partial<RegistroAudienciaData>) => {
    setRegistro((prev) => ({ ...prev, ...partial }));
  }, []);

  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const toggleDepoenteDetails = useCallback((id: string) => {
    setExpandedDepoenteDetails((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // Computed
  const completude = (() => {
    const camposPreenchidos = [
      registro.resultado,
      registro.depoentes.length > 0,
      registro.manifestacaoMP,
      registro.manifestacaoDefesa,
      registro.decisaoJuiz,
      registro.anotacoesGerais,
      statusAudiencia === "redesignada" ? registro.motivoNaoRealizacao : true,
    ].filter(Boolean).length;
    return Math.round((camposPreenchidos / 7) * 100);
  })();

  return {
    // State
    registro,
    activeTab,
    editandoDepoente,
    novoDepoenteNome,
    novoDepoenteTipo,
    expandedSections,
    expandedDepoenteDetails,
    registrosAnteriores,
    statusAudiencia,
    decretoRevelia,
    registroSalvo,
    ultimoSalvamento,
    testemunhaIntimada,
    parteInsistiu,
    depoentesRedesignacao,
    novaDataPopoverOpen,
    novoHorarioPopoverOpen,
    completude,

    // Setters
    setActiveTab,
    setEditandoDepoente,
    setNovoDepoenteNome,
    setNovoDepoenteTipo,
    setStatusAudiencia,
    setDecretoRevelia,
    setTestemunhaIntimada,
    setParteInsistiu,
    setDepoentesRedesignacao,
    setNovaDataPopoverOpen,
    setNovoHorarioPopoverOpen,

    // Actions
    updateRegistro,
    handleSubmit,
    handleAddDepoente,
    handleRemoveDepoente,
    handleUpdateDepoente,
    toggleSection,
    toggleDepoenteDetails,
  };
}
