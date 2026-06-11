/**
 * Fontes dos feeds ICS — converte linhas do banco em EventoICS.
 * Janela: −30/+180 dias. Tudo filtrado pelo defensor dono do token.
 * Audiências canceladas/redesignadas dentro da janela ENTRAM com
 * cancelado=true — é o STATUS:CANCELLED que faz o Outlook remover o evento.
 */

import { and, eq, gte, inArray, isNotNull, isNull, lte, or } from "drizzle-orm";
import { db, audiencias, processos, assistidos, demandas, registros } from "@/lib/db";
import { sessoesJuri } from "@/lib/db/schema/juri";
import type { FeedICS } from "./feeds";
import type { EventoICS } from "./serializar";
import { combinarDataHorario } from "./horario-local";

const DIA = 24 * 3600_000;

function janela(): { ini: Date; fim: Date } {
  const agora = new Date();
  return { ini: new Date(agora.getTime() - 30 * DIA), fim: new Date(agora.getTime() + 180 * DIA) };
}

function janelaISO(): { ini: string; fim: string } {
  const { ini, fim } = janela();
  return { ini: ini.toISOString().slice(0, 10), fim: fim.toISOString().slice(0, 10) };
}

export async function eventosDoFeed(feed: FeedICS, defensorId: number): Promise<EventoICS[]> {
  switch (feed.fonte) {
    case "audiencias":
      return eventosAudiencias(feed.atribuicoes ?? [], defensorId);
    case "sessoes_juri":
      return eventosSessoesJuri(defensorId);
    case "atendimentos":
      return eventosAtendimentos(defensorId);
    case "prazos":
      return eventosPrazos(defensorId);
  }
}

async function eventosAudiencias(atribuicoes: string[], defensorId: number): Promise<EventoICS[]> {
  if (!atribuicoes.length) return [];
  const { ini, fim } = janela();
  const rows = await db
    .select({
      id: audiencias.id,
      data: audiencias.dataAudiencia,
      horario: audiencias.horario,
      tipo: audiencias.tipo,
      local: audiencias.local,
      status: audiencias.status,
      atualizadoEm: audiencias.updatedAt,
      numero: processos.numeroAutos,
      vara: processos.vara,
      comarca: processos.comarca,
      atribuicao: processos.atribuicao,
      assistido: assistidos.nome,
    })
    .from(audiencias)
    .innerJoin(processos, eq(processos.id, audiencias.processoId))
    .leftJoin(assistidos, eq(assistidos.id, audiencias.assistidoId))
    .where(
      and(
        inArray(processos.atribuicao, atribuicoes as never),
        eq(audiencias.defensorId, defensorId),
        gte(audiencias.dataAudiencia, ini),
        lte(audiencias.dataAudiencia, fim),
      ),
    );

  return rows.map((r) => {
    const mutirao = r.atribuicao === "MUTIRAO_PROTEGE" ? "[Mutirão] " : "";
    const cancelada = r.status === "cancelada" || r.status === "redesignada";
    return {
      uid: `audiencia-${r.id}@ombuds.app`,
      titulo: `${mutirao}${r.tipo ?? "Audiência"} – ${r.assistido ?? "Sem assistido"} – ${r.numero ?? ""}`.trim(),
      descricao: [r.vara, r.comarca, r.numero ? `Processo ${r.numero}` : null]
        .filter(Boolean)
        .join("\n"),
      local: r.local ?? undefined,
      inicio: combinarDataHorario(r.data, r.horario),
      cancelado: cancelada,
      atualizadoEm: r.atualizadoEm,
    };
  });
}

async function eventosSessoesJuri(defensorId: number): Promise<EventoICS[]> {
  const { ini, fim } = janela();
  const rows = await db
    .select({
      id: sessoesJuri.id,
      data: sessoesJuri.dataSessao,
      horario: sessoesJuri.horario,
      sala: sessoesJuri.sala,
      status: sessoesJuri.status,
      assistido: sessoesJuri.assistidoNome,
      numero: processos.numeroAutos,
    })
    .from(sessoesJuri)
    .innerJoin(processos, eq(processos.id, sessoesJuri.processoId))
    .where(
      and(
        or(eq(sessoesJuri.defensorId, defensorId), isNull(sessoesJuri.defensorId)),
        gte(sessoesJuri.dataSessao, ini),
        lte(sessoesJuri.dataSessao, fim),
      ),
    );

  return rows.map((r) => {
    const inicio = combinarDataHorario(r.data, r.horario);
    const status = (r.status ?? "").toLowerCase();
    return {
      uid: `sessao-${r.id}@ombuds.app`,
      titulo: `Plenário – ${r.assistido ?? "Sem assistido"} – ${r.numero ?? ""}`.trim(),
      descricao: r.numero ? `Processo ${r.numero}` : undefined,
      local: r.sala ?? undefined,
      inicio,
      // sessão dura o dia de trabalho — 8h é a duração padrão do plenário
      fim: new Date(inicio.getTime() + 8 * 3600_000),
      cancelado: status === "cancelada" || status === "adiada",
    };
  });
}

async function eventosAtendimentos(defensorId: number): Promise<EventoICS[]> {
  const { ini, fim } = janela();
  const rows = await db
    .select({
      id: registros.id,
      data: registros.dataRegistro,
      titulo: registros.titulo,
      assunto: registros.assunto,
      local: registros.local,
      status: registros.status,
      assistido: assistidos.nome,
    })
    .from(registros)
    .leftJoin(assistidos, eq(assistidos.id, registros.assistidoId))
    .where(
      and(
        eq(registros.tipo, "atendimento"),
        eq(registros.autorId, defensorId),
        inArray(registros.status, ["agendado", "cancelado"]),
        gte(registros.dataRegistro, ini),
        lte(registros.dataRegistro, fim),
      ),
    );

  return rows.map((r) => ({
    uid: `registro-${r.id}@ombuds.app`,
    titulo: `Atendimento – ${r.assistido ?? r.titulo ?? "Assistido"}`,
    descricao: [r.titulo, r.assunto].filter(Boolean).join("\n") || undefined,
    local: r.local ?? undefined,
    inicio: r.data,
    cancelado: r.status === "cancelado",
  }));
}

async function eventosPrazos(defensorId: number): Promise<EventoICS[]> {
  const { ini, fim } = janelaISO();
  const rows = await db
    .select({
      id: demandas.id,
      prazo: demandas.prazo,
      ato: demandas.ato,
      status: demandas.status,
      assistido: assistidos.nome,
      numero: processos.numeroAutos,
    })
    .from(demandas)
    .innerJoin(processos, eq(processos.id, demandas.processoId))
    .leftJoin(assistidos, eq(assistidos.id, demandas.assistidoId))
    .where(
      and(
        eq(demandas.defensorId, defensorId),
        isNotNull(demandas.prazo),
        gte(demandas.prazo, ini),
        lte(demandas.prazo, fim),
      ),
    );

  return rows.map((r) => ({
    uid: `demanda-prazo-${r.id}@ombuds.app`,
    titulo: `Prazo: ${r.ato} – ${r.assistido ?? ""}`.trim(),
    descricao: r.numero ? `Processo ${r.numero}` : undefined,
    inicio: r.prazo as string,
    allDay: true,
    // demanda concluída/arquivada some do feed de prazos? Não — o prazo passado
    // sai sozinho da janela; manter o histórico recente é útil no calendário.
  }));
}
