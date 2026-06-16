/**
 * Serviço de enriquecimento de nome para autores não identificados.
 *
 * Quando um assistido tem autorNaoIdentificado=true, tenta construir um nome
 * descritivo a partir dos dados do processo (classe, assunto, comarca, polo passivo).
 * Atualiza assistidos.nome se o resultado for melhor que o placeholder.
 */

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { processos, assistidos } from "@/lib/db/schema";
import { nomeAutorDesconhecido, placeholderAutorDesconhecido } from "@/lib/autor-desconhecido";

export interface DadosEnriquecimento {
  autorNaoIdentificado: boolean;
  numeroAutos: string;
  classeProcessual?: string | null;
  assunto?: string | null;
  comarca?: string | null;
  parteContraria?: string | null;
}

/**
 * PURA: retorna o nome descritivo enriquecido, ou null se não deve enriquecer
 * (assistido não é autor desconhecido, ou o resultado seria igual ao placeholder
 * → sem ganho informacional).
 */
export function computarNomeEnriquecido(d: DadosEnriquecimento): string | null {
  if (!d.autorNaoIdentificado) return null;
  const nome = nomeAutorDesconhecido({
    cnj: d.numeroAutos,
    classe: d.classeProcessual,
    assunto: d.assunto,
    comarca: d.comarca,
    poloPassivo: d.parteContraria,
  });
  if (nome === placeholderAutorDesconhecido(d.numeroAutos)) return null;
  return nome;
}

/**
 * Async: busca processo + assistido no banco e, se aplicável,
 * atualiza assistidos.nome com o nome enriquecido.
 */
export async function enriquecerNomeAutorDesconhecido(processoId: number): Promise<void> {
  const proc = await db.query.processos.findFirst({
    where: eq(processos.id, processoId),
  });
  if (!proc?.assistidoId) return;

  const assistido = await db.query.assistidos.findFirst({
    where: eq(assistidos.id, proc.assistidoId),
  });
  if (!assistido?.autorNaoIdentificado) return;

  const novo = computarNomeEnriquecido({
    autorNaoIdentificado: assistido.autorNaoIdentificado,
    numeroAutos: proc.numeroAutos,
    classeProcessual: proc.classeProcessual,
    assunto: proc.assunto,
    comarca: proc.comarca,
    parteContraria: proc.parteContraria,
  });
  if (!novo || novo === assistido.nome) return;

  await db
    .update(assistidos)
    .set({ nome: novo, updatedAt: new Date() })
    .where(eq(assistidos.id, assistido.id));
}
