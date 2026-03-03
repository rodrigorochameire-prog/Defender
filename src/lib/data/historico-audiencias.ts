import { RegistroAudienciaData } from "@/components/agenda/registro-audiencia-modal-simples";

// Tipos para o histórico
export interface HistoricoAudiencia extends RegistroAudienciaData {
  historicoId: string;
  processoId: string;
  casoId?: string;
  assistidoId?: string;
  eventoOriginalId: string; // ID do evento da audiência original
  eventosRelacionados?: string[]; // IDs de eventos redesignados
}

// Armazenamento local do histórico (simulação - em produção seria banco de dados)
let historicoAudiencias: HistoricoAudiencia[] = [];

// Função para adicionar registro ao histórico
export const adicionarRegistroHistorico = (registro: RegistroAudienciaData): HistoricoAudiencia => {
  const historicoRegistro: HistoricoAudiencia = {
    ...registro,
    historicoId: registro.historicoId || `HIST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    processoId: registro.processoId || "",
    eventoOriginalId: registro.eventoId,
    eventosRelacionados: [],
  };

  historicoAudiencias.push(historicoRegistro);

  return historicoRegistro;
};

// Buscar histórico por evento
export const buscarHistoricoPorEvento = (eventoId: string): HistoricoAudiencia[] => {
  return historicoAudiencias.filter(
    (h) => h.eventoOriginalId === eventoId || h.eventosRelacionados?.includes(eventoId)
  );
};

// Buscar histórico por processo
export const buscarHistoricoPorProcesso = (processoId: string): HistoricoAudiencia[] => {
  return historicoAudiencias.filter((h) => h.processoId === processoId);
};

// Buscar histórico por caso
export const buscarHistoricoPorCaso = (casoId: string): HistoricoAudiencia[] => {
  return historicoAudiencias.filter((h) => h.casoId === casoId);
};

// Buscar histórico por assistido
export const buscarHistoricoPorAssistido = (assistidoId: string): HistoricoAudiencia[] => {
  return historicoAudiencias.filter((h) => h.assistidoId === assistidoId);
};

// Vincular evento redesignado ao histórico
export const vincularEventoRedesignado = (
  historicoId: string,
  novoEventoId: string
): void => {
  const registro = historicoAudiencias.find((h) => h.historicoId === historicoId);
  if (registro) {
    if (!registro.eventosRelacionados) {
      registro.eventosRelacionados = [];
    }
    registro.eventosRelacionados.push(novoEventoId);
  }
};

// Buscar último registro de um evento (útil para audiências redesignadas)
export const buscarUltimoRegistroPorEvento = (eventoId: string): HistoricoAudiencia | null => {
  const registros = buscarHistoricoPorEvento(eventoId);
  if (registros.length === 0) return null;
  
  // Ordenar por data de registro e retornar o mais recente
  return registros.sort((a, b) => 
    new Date(b.dataRegistro).getTime() - new Date(a.dataRegistro).getTime()
  )[0];
};

// Obter todos os registros de um processo (ordenados por data)
export const obterHistoricoCompleto = (processoId: string): HistoricoAudiencia[] => {
  return buscarHistoricoPorProcesso(processoId).sort((a, b) => 
    new Date(b.dataRegistro).getTime() - new Date(a.dataRegistro).getTime()
  );
};

// Exportar histórico completo (para debug ou exportação)
export const exportarHistorico = (): HistoricoAudiencia[] => {
  return [...historicoAudiencias];
};

// Limpar histórico (útil para testes)
export const limparHistorico = (): void => {
  historicoAudiencias = [];
};
