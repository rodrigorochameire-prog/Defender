import { offlineDb } from "./db";
import type {
  OfflineAssistido,
  OfflineProcesso,
  OfflineDemanda,
  OfflineAtendimento,
  OfflineCaso,
} from "./db";

// ==========================================
// IDB READ HELPERS — Fallback para leitura offline
// Retorna dados do IndexedDB quando sem conexao
// ==========================================

/** Retorna assistidos nao deletados, ordenados por nome */
export async function getOfflineAssistidos(): Promise<OfflineAssistido[]> {
  return offlineDb.assistidos
    .where("deletedAt")
    .equals("")
    .or("deletedAt")
    .equals(null as any)
    .sortBy("nome");
}

/** Retorna assistido por ID */
export async function getOfflineAssistido(id: number): Promise<OfflineAssistido | undefined> {
  return offlineDb.assistidos.get(id);
}

/** Retorna processos nao deletados, ordenados por updatedAt desc */
export async function getOfflineProcessos(): Promise<OfflineProcesso[]> {
  const all = await offlineDb.processos.toArray();
  return all
    .filter((p) => !p.deletedAt)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

/** Retorna processos de um assistido */
export async function getOfflineProcessosByAssistido(assistidoId: number): Promise<OfflineProcesso[]> {
  return offlineDb.processos
    .where("assistidoId")
    .equals(assistidoId)
    .toArray()
    .then((items) => items.filter((p) => !p.deletedAt));
}

/** Retorna demandas nao deletadas, ordenadas por prazo asc */
export async function getOfflineDemandas(): Promise<OfflineDemanda[]> {
  const all = await offlineDb.demandas.toArray();
  return all
    .filter((d) => !d.deletedAt)
    .sort((a, b) => {
      if (!a.prazo) return 1;
      if (!b.prazo) return -1;
      return new Date(a.prazo).getTime() - new Date(b.prazo).getTime();
    });
}

/** Retorna demandas de um assistido */
export async function getOfflineDemandasByAssistido(assistidoId: number): Promise<OfflineDemanda[]> {
  return offlineDb.demandas
    .where("assistidoId")
    .equals(assistidoId)
    .toArray()
    .then((items) => items.filter((d) => !d.deletedAt));
}

/** Retorna atendimentos, ordenados por dataAtendimento desc */
export async function getOfflineAtendimentos(): Promise<OfflineAtendimento[]> {
  const all = await offlineDb.atendimentos.toArray();
  return all.sort((a, b) => new Date(b.dataAtendimento).getTime() - new Date(a.dataAtendimento).getTime());
}

/** Retorna casos nao deletados */
export async function getOfflineCasos(): Promise<OfflineCaso[]> {
  const all = await offlineDb.casos.toArray();
  return all
    .filter((c) => !c.deletedAt)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

/** Contagem rapida para dashboard */
export async function getOfflineCounts() {
  const [assistidos, processos, demandas, atendimentos, casos] = await Promise.all([
    offlineDb.assistidos.count(),
    offlineDb.processos.count(),
    offlineDb.demandas.count(),
    offlineDb.atendimentos.count(),
    offlineDb.casos.count(),
  ]);
  return { assistidos, processos, demandas, atendimentos, casos };
}
