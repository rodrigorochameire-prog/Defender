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
export type TabKey = "briefing" | "depoentes" | "anotacoes" | "resultado" | "historico";

interface UseRegistroFormProps {
  evento: any;
  isOpen: boolean;
  onSave: (registro: RegistroAudienciaData) => void;
  onCriarNovoEvento?: (evento: any) => void;
}

export function useRegistroForm({ evento, isOpen, onSave, onCriarNovoEvento }: UseRegistroFormProps) {
  // Resolve o id numérico da audiência-fonte (tabela `audiencias`).
  // Estratégia preferida: usar `evento.rawId` + `evento.fonte === "audiencias"` diretamente do AgendaItem.
  // Fallback: aceitar `evento.id` como número cru ou string no formato "audiencia-<n>" (compat).
  // Importante: eventos do tipo "calendar" NÃO são backados pela tabela `audiencias`
  // — para esses retornamos null e o fluxo cai no fallback in-memory / localStorage.
  const audienciaId = (() => {
    if (evento?.fonte === "audiencias" && typeof evento.rawId === "number") {
      return evento.rawId;
    }
    if (evento?.fonte === "calendar") return null;
    const raw = evento?.id;
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
    if (typeof raw === "string") {
      const match = raw.match(/^audiencia-(\d+)$/);
      if (match) return parseInt(match[1], 10);
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

  // Auto-populate: load preview when depoentes are empty
  const { data: preparacaoData } = trpc.audiencias.previewPreparacao.useQuery(
    { audienciaId: audienciaId ?? 0 },
    { enabled: isOpen && audienciaId !== null }
  );

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

  const [activeTab, setActiveTab] = useState<TabKey>("resultado");
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

  // Juiz / Promotor inline header fields
  const [juiz, setJuiz] = useState(evento.juiz || "");
  const [promotor, setPromotor] = useState(evento.promotor || "");

  // Auto-save state
  const [isDirty, setIsDirty] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  // Track whether we already loaded from DB to avoid overwriting user edits
  const dbLoadedRef = useRef(false);
  const autoPopulatedRef = useRef(false);

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
  // Auto-populate depoentes from analysis_data when registro is empty
  // ==========================================
  useEffect(() => {
    if (!isOpen || autoPopulatedRef.current) return;
    if (!preparacaoData || preparacaoData.total === 0) return;

    // Only auto-populate if depoentes are currently empty
    const currentDepoentes = registro.depoentes;
    if (currentDepoentes.length > 0) {
      autoPopulatedRef.current = true;
      return;
    }

    // Wait for DB load to complete first
    if (audienciaId !== null && !dbLoadedRef.current && savedRegistro === undefined) return;

    const isPolicial = (t: any) => {
      const v = ((t as any).vinculo ?? "").toLowerCase();
      return v.includes("policial") || v.includes("pm ") || v.includes("condutor")
        || v.includes("investigador") || /^(cb|sd|sgt|cap|ten|ipc|del)\b/i.test(t.nome ?? "");
    };

    const mapTipo = (tipo: string, t: any): Depoente["tipo"] => {
      if (isPolicial(t)) return "policial";
      switch (tipo) {
        case "VITIMA": return "vitima";
        case "INFORMANTE": return "informante";
        case "PERITO": return "perito";
        default: return "testemunha";
      }
    };

    const imported: Depoente[] = preparacaoData.depoentes.map((t, i) => ({
      id: `auto-${i}-${t.nome}`,
      nome: t.nome,
      tipo: mapTipo(t.tipo ?? "COMUM", t),
      lado: (t.tipo === "ACUSACAO" ? "acusacao" : t.tipo === "DEFESA" ? "defesa" : undefined) as Depoente["lado"],
      intimado: false,
      presente: false,
      statusIntimacao: "pendente" as const,
      jaOuvido: (t.resumo ? "delegacia" : "nenhum") as Depoente["jaOuvido"],
      depoimentoDelegacia: t.resumo ?? "",
      depoimentoAnterior: "",
      pontosFortes: t.pontosFavoraveis ?? "",
      pontosFracos: t.pontosDesfavoraveis ?? "",
      estrategiaInquiricao: t.perguntasSugeridas ?? "",
      perguntasDefesa: "",
      depoimentoLiteral: "",
      analisePercepcoes: t.observacoes ?? "",
    }));

    if (imported.length > 0) {
      setRegistro((prev) => ({ ...prev, depoentes: imported }));
      setIsDirty(true);
      autoPopulatedRef.current = true;
    }
  }, [isOpen, preparacaoData, registro.depoentes, savedRegistro, audienciaId]);

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
      autoPopulatedRef.current = false;
    }
  }, [isOpen, evento.id, audienciaId]);

  // ==========================================
  // Auto-save every 30s when dirty
  // ==========================================
  useEffect(() => {
    if (!isOpen || !audienciaId) return;
    const timer = setInterval(() => {
      if (isDirty && !salvarMutation.isPending) {
        setAutoSaveStatus("saving");
        const registroComVinculo: RegistroAudienciaData = {
          ...registro,
          historicoId: registro.historicoId || `HIST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          processoId: evento.processo?.id || evento.processoId,
          casoId: evento.caso?.id || evento.casoId,
          assistidoId: evento.assistido?.id || evento.assistidoId,
        };
        salvarMutation.mutate(
          {
            audienciaId,
            registro: registroComVinculo,
            juiz: juiz || undefined,
            promotor: promotor || undefined,
          },
          {
            onSuccess: () => {
              setIsDirty(false);
              setAutoSaveStatus("saved");
              setTimeout(() => setAutoSaveStatus("idle"), 3000);
            },
            onError: () => {
              setAutoSaveStatus("idle");
            },
          },
        );
      }
    }, 30_000);
    return () => clearInterval(timer);
  }, [isOpen, audienciaId, isDirty, registro, juiz, promotor, salvarMutation.isPending, evento]);

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
          juiz: juiz || undefined,
          promotor: promotor || undefined,
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

      setIsDirty(false);
      setAutoSaveStatus("idle");
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
    setIsDirty(true);
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
    juiz,
    promotor,
    isDirty,
    autoSaveStatus,

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
    setJuiz,
    setPromotor,

    // Actions
    updateRegistro,
    handleSubmit,
    handleAddDepoente,
    handleRemoveDepoente,
    handleUpdateDepoente,
    toggleSection,
    toggleDepoenteDetails,
    setRegistro,
    audienciaId,
    assistidoId: assistidoIdNum,
  };
}
