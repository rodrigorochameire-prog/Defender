import Dexie, { type Table } from "dexie";

// ==========================================
// OFFLINE DB SCHEMA — Mirror das tabelas principais
// Exclui colunas JSONB pesadas (analysisData, enrichmentData, etc.)
// ==========================================

export interface OfflineAssistido {
  id: number;
  nome: string;
  cpf: string | null;
  rg: string | null;
  nomeMae: string | null;
  dataNascimento: string | null;
  statusPrisional: string;
  localPrisao: string | null;
  telefone: string | null;
  endereco: string | null;
  photoUrl: string | null;
  observacoes: string | null;
  defensorId: number | null;
  atribuicaoPrimaria: string;
  driveFolderId: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OfflineProcesso {
  id: number;
  assistidoId: number;
  atribuicao: string;
  numeroAutos: string;
  comarca: string | null;
  vara: string | null;
  area: string;
  assunto: string | null;
  parteContraria: string | null;
  fase: string | null;
  situacao: string | null;
  isJuri: boolean;
  dataSessaoJuri: string | null;
  defensorId: number | null;
  observacoes: string | null;
  driveFolderId: string | null;
  casoId: number | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OfflineDemanda {
  id: number;
  processoId: number;
  assistidoId: number;
  ato: string;
  tipoAto: string | null;
  prazo: string | null;
  dataEntrada: string | null;
  dataIntimacao: string | null;
  dataConclusao: string | null;
  status: string;
  substatus: string | null;
  prioridade: string;
  providencias: string | null;
  defensorId: number | null;
  delegadoParaId: number | null;
  reuPreso: boolean;
  casoId: number | null;
  ordemManual: number | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OfflineAtendimento {
  id: number;
  assistidoId: number;
  processoId: number | null;
  casoId: number | null;
  dataAtendimento: string;
  duracao: number | null;
  tipo: string;
  local: string | null;
  assunto: string | null;
  resumo: string | null;
  status: string;
  transcricaoStatus: string | null;
  enrichmentStatus: string | null;
  atendidoPorId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface OfflineCaso {
  id: number;
  titulo: string;
  codigo: string | null;
  atribuicao: string;
  status: string | null;
  fase: string | null;
  prioridade: string;
  defensorId: number | null;
  observacoes: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SyncQueueItem {
  id?: number;
  table: string;
  operation: "create" | "update" | "delete";
  recordId: number | string;
  data: Record<string, unknown>;
  expectedUpdatedAt?: string;
  status: "pending" | "syncing" | "failed" | "conflict";
  createdAt: string;
  attempts: number;
  lastError?: string;
}

export interface ConflictItem {
  id?: number;
  table: string;
  recordId: number;
  localData: Record<string, unknown>;
  serverData: Record<string, unknown>;
  localTimestamp: string;
  serverTimestamp: string;
  resolvedAt?: string;
  resolution?: "local" | "server" | "merged";
  mergedData?: Record<string, unknown>;
}

export interface SyncMeta {
  key: string;
  value: string;
}

class OfflineDatabase extends Dexie {
  assistidos!: Table<OfflineAssistido, number>;
  processos!: Table<OfflineProcesso, number>;
  demandas!: Table<OfflineDemanda, number>;
  atendimentos!: Table<OfflineAtendimento, number>;
  casos!: Table<OfflineCaso, number>;
  syncQueue!: Table<SyncQueueItem, number>;
  conflictQueue!: Table<ConflictItem, number>;
  syncMeta!: Table<SyncMeta, string>;

  constructor() {
    super("ombuds-offline");

    this.version(1).stores({
      assistidos: "id, nome, cpf, updatedAt, defensorId, deletedAt",
      processos: "id, assistidoId, numeroAutos, updatedAt, deletedAt",
      demandas: "id, assistidoId, processoId, prazo, status, updatedAt, deletedAt",
      atendimentos: "id, assistidoId, processoId, dataAtendimento, updatedAt",
      casos: "id, titulo, updatedAt, deletedAt",
      syncQueue: "++id, table, operation, recordId, status, createdAt",
      conflictQueue: "++id, table, recordId, resolvedAt",
      syncMeta: "key",
    });
  }
}

export const offlineDb = new OfflineDatabase();

// Helper: get last sync timestamp
export async function getLastSyncAt(): Promise<string | null> {
  const meta = await offlineDb.syncMeta.get("lastSyncAt");
  return meta?.value ?? null;
}

// Helper: set last sync timestamp
export async function setLastSyncAt(timestamp: string): Promise<void> {
  await offlineDb.syncMeta.put({ key: "lastSyncAt", value: timestamp });
}

// Helper: get pending sync count
export async function getPendingSyncCount(): Promise<number> {
  return offlineDb.syncQueue.where("status").equals("pending").count();
}

// Helper: get unresolved conflict count
export async function getConflictCount(): Promise<number> {
  return offlineDb.conflictQueue.where("resolvedAt").equals("").count();
}
