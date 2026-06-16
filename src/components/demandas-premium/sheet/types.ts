// Shared types for the demanda sheet section components.
// Source of truth for Demanda/Processo used by typed section components
// that import from this file. DemandaQuickPreview.tsx keeps its own inline
// copy (@ts-nocheck) — these must stay in sync with that file.

export interface Processo {
  tipo: string;
  numero: string;
  numeroAutos?: string;
}

export interface Demanda {
  id: string;
  assistido: string;
  assistidoId?: number | null;
  processoId?: number | null;
  status: string;
  substatus?: string;
  prazo: string;
  data: string;
  dataInclusao?: string;
  processos: Processo[];
  ato: string;
  providencias: string;
  atribuicao: string;
  atribuicaoEnum?: string | null;
  estadoPrisional?: string;
  prioridade?: string;
  arquivado?: boolean;
  importBatchId?: string | null;
  ordemOriginal?: number | null;
  photoUrl?: string | null;
  updatedAt?: string | null;
}
