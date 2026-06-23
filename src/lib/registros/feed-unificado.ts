import { familiaDeTipo, rotuloDoTipo, type Familia, type Origem } from "./tipologia";

/** Item normalizado do feed unificado do assistido. */
export interface ItemFeed {
  id: string; // "registro:5" | "demanda-evento:9" | "audiencia:3"
  origem: Origem;
  tipo: string;
  familia: Familia;
  rotulo: string;
  data: string; // ISO datetime (para ordenar)
  titulo: string | null;
  resumo: string | null;
  status: string | null;
  prazo: string | null;
  links: { demandaId: number | null; audienciaId: number | null; processoId: number | null };
  temDados: boolean; // tem dado estruturado (dossiê/enrichment/pontos-chave)
  autorId: number | null;
  autorNome?: string | null; // preenchido pela camada tRPC (mapa de autores)
}

export interface RegistroFonte {
  id: number;
  tipo: string;
  dataRegistro: Date | string;
  titulo: string | null;
  conteudo: string | null;
  status: string | null;
  demandaId: number | null;
  audienciaId: number | null;
  processoId: number | null;
  dossieAtendimento: unknown;
  enrichmentData: unknown;
  pontosChave: unknown;
  autorId: number | null;
}

export interface DemandaEventoFonte {
  id: number;
  tipo: string;
  subtipo: string | null;
  resumo: string;
  descricao: string | null;
  status: string | null;
  prazo: string | null;
  createdAt: Date | string;
  demandaId: number;
  processoId: number | null;
  autorId: number | null;
}

export interface AudienciaFonte {
  id: number;
  tipo: string;
  dataAudiencia: Date | string;
  local: string | null;
  status: string | null;
  processoId: number | null;
}

const iso = (d: Date | string): string => (typeof d === "string" ? d : d.toISOString());

export function normalizarFeed(fontes: {
  registros: RegistroFonte[];
  demandaEventos: DemandaEventoFonte[];
  audiencias: AudienciaFonte[];
}): ItemFeed[] {
  const itens: ItemFeed[] = [];

  for (const r of fontes.registros) {
    itens.push({
      id: `registro:${r.id}`,
      origem: "registro",
      tipo: r.tipo,
      familia: familiaDeTipo("registro", r.tipo),
      rotulo: rotuloDoTipo("registro", r.tipo),
      data: iso(r.dataRegistro),
      titulo: r.titulo,
      resumo: r.conteudo,
      status: r.status,
      prazo: null,
      links: { demandaId: r.demandaId, audienciaId: r.audienciaId, processoId: r.processoId },
      temDados: !!(r.dossieAtendimento || r.enrichmentData || r.pontosChave),
      autorId: r.autorId,
    });
  }

  for (const e of fontes.demandaEventos) {
    itens.push({
      id: `demanda-evento:${e.id}`,
      origem: "demanda-evento",
      tipo: e.tipo,
      familia: familiaDeTipo("demanda-evento", e.tipo),
      rotulo: rotuloDoTipo("demanda-evento", e.tipo),
      data: iso(e.createdAt),
      titulo: e.resumo,
      resumo: e.descricao,
      status: e.status,
      prazo: e.prazo,
      links: { demandaId: e.demandaId, audienciaId: null, processoId: e.processoId },
      temDados: false,
      autorId: e.autorId,
    });
  }

  for (const a of fontes.audiencias) {
    itens.push({
      id: `audiencia:${a.id}`,
      origem: "audiencia",
      tipo: a.tipo,
      familia: familiaDeTipo("audiencia", a.tipo),
      rotulo: "Audiência",
      data: iso(a.dataAudiencia),
      titulo: `Audiência · ${a.tipo}`,
      resumo: a.local,
      status: a.status,
      prazo: null,
      links: { demandaId: null, audienciaId: a.id, processoId: a.processoId },
      temDados: false,
      autorId: null,
    });
  }

  // Mais recente primeiro.
  itens.sort((x, y) => (x.data < y.data ? 1 : x.data > y.data ? -1 : 0));
  return itens;
}
