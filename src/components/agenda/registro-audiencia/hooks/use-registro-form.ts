import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  adicionarRegistroHistorico,
  buscarHistoricoPorEvento,
  buscarHistoricoPorProcesso,
  buscarHistoricoPorAssistido,
  vincularEventoRedesignado,
} from "@/lib/data/historico-audiencias";
import type { Depoente, RegistroAudienciaData } from "../types";

export type StatusAudiencia = "concluida" | "redesignada" | "suspensa";
export type TabKey = "geral" | "briefing" | "depoentes" | "manifestacoes" | "anotacoes" | "historico" | "registro";

interface UseRegistroFormProps {
  evento: any;
  isOpen: boolean;
  onSave: (registro: RegistroAudienciaData) => void;
  onCriarNovoEvento?: (evento: any) => void;
}

export function useRegistroForm({ evento, isOpen, onSave, onCriarNovoEvento }: UseRegistroFormProps) {
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
    estrategia: true,
    perguntas: false,
    depoimento: false,
    analise: false,
  });
  const [expandedDepoenteDetails, setExpandedDepoenteDetails] = useState<Record<string, boolean>>({});
  const [registrosAnteriores, setRegistrosAnteriores] = useState<any[]>([]);
  const [statusAudiencia, setStatusAudiencia] = useState<StatusAudiencia>("concluida");
  const [decretoRevelia, setDecretoRevelia] = useState<boolean | null>(null);
  const [registroSalvo, setRegistroSalvo] = useState(false);
  const [ultimoSalvamento, setUltimoSalvamento] = useState<string | null>(null);

  // Redesignação detail states
  const [testemunhaIntimada, setTestemunhaIntimada] = useState("");
  const [parteInsistiu, setParteInsistiu] = useState("");
  const [depoentesRedesignacao, setDepoentesRedesignacao] = useState<string[]>([]);

  // Popover states
  const [novaDataPopoverOpen, setNovaDataPopoverOpen] = useState(false);
  const [novoHorarioPopoverOpen, setNovoHorarioPopoverOpen] = useState(false);

  // Load historical records
  useEffect(() => {
    if (isOpen && evento.id) {
      let historico = buscarHistoricoPorEvento(evento.id);

      if (historico.length === 0 && (evento.processo?.id || evento.processoId)) {
        const processoId = evento.processo?.id || evento.processoId;
        historico = buscarHistoricoPorProcesso(processoId || "");
      }

      if (historico.length === 0 && (evento.assistido?.id || evento.assistidoId)) {
        const assistidoId = evento.assistido?.id || evento.assistidoId;
        historico = buscarHistoricoPorAssistido(assistidoId || "");
      }

      setRegistrosAnteriores(historico);
    } else if (!isOpen) {
      setRegistroSalvo(false);
      setUltimoSalvamento(null);
    }
  }, [isOpen, evento.id]);

  const handleSubmit = useCallback(() => {
    if (!registro.dataRealizacao) {
      toast.error("Data de realização é obrigatória");
      return;
    }
    if (statusAudiencia === "concluida" && !registro.resultado) {
      toast.error("Resultado da audiência é obrigatório");
      return;
    }
    if (statusAudiencia === "redesignada" && !registro.motivoNaoRealizacao) {
      toast.error("Motivo da redesignação é obrigatório");
      return;
    }

    const registroComVinculo: RegistroAudienciaData = {
      ...registro,
      historicoId: `HIST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      processoId: evento.processo?.id || evento.processoId,
      casoId: evento.caso?.id || evento.casoId,
      assistidoId: evento.assistido?.id || evento.assistidoId,
    };

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
        descricao: `Audiência redesignada. Motivo: ${registro.motivoRedesignacao || "Não informado"}`,
        prioridade: evento.prioridade || "media",
        recorrencia: "nenhuma",
        lembretes: ["1d"],
        tags: ["Redesignada"],
        participantes: evento.participantes || [],
        observacoes: `Audiência redesignada. Motivo: ${registro.motivoRedesignacao || "Não informado"}`,
        documentos: [],
        dataInclusao: new Date().toISOString(),
        responsavel: evento.responsavel,
      };

      onCriarNovoEvento(novoEvento);
      vincularEventoRedesignado(historicoSalvo.historicoId, novoEventoId);
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
      description: isAtualizacao ? "As alterações foram salvas no histórico" : "Você pode continuar editando ou fechar o modal",
    });
  }, [registro, statusAudiencia, registroSalvo, evento, onSave, onCriarNovoEvento]);

  const handleAddDepoente = useCallback(() => {
    if (!novoDepoenteNome.trim()) {
      toast.error("Nome do depoente é obrigatório");
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
