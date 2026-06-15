import { and, desc, eq, sql } from "drizzle-orm";
import { audiencias } from "@/lib/db/schema/agenda";
import { db } from "@/lib/db";
import { parseAtaAudiencia, type AtaParsed } from "./parse-ata-audiencia";

export interface AtaAplicada {
  audienciaId: number;
  midias: number;
  ouvidos: number;
  ausencias: number;
  resultado: string;
}

function normNome(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Marca os depoentes de registro_audiencia como ouvidos/ausentes pela ata. */
function aplicarStatusDepoentes(registro: unknown, parsed: AtaParsed): unknown {
  if (!registro || typeof registro !== "object") return registro;
  const r = registro as Record<string, unknown>;
  const deps = r.depoentes;
  if (!Array.isArray(deps)) return registro;
  const ouvidos = new Set(parsed.ouvidos.map((o) => normNome(o.nome)));
  const ausentesMap = new Map(parsed.ausencias.map((a) => [normNome(a.nome), a.motivo]));
  r.depoentes = deps.map((d: Record<string, unknown>) => {
    const nome = normNome(String(d?.nome ?? ""));
    if (!nome) return d;
    // Match por nome (tolera nome parcial na ata: inclusão em qualquer direção).
    const bate = (chaves: Iterable<string>) => {
      for (const k of chaves) {
        if (k === nome || nome.includes(k) || k.includes(nome)) return k;
      }
      return null;
    };
    const kOuv = bate(ouvidos);
    if (kOuv) {
      return { ...d, comparecimento: "compareceu", ja_ouvido: d.ja_ouvido ?? { sim: true } };
    }
    const kAus = bate(ausentesMap.keys());
    if (kAus) {
      const motivo = ausentesMap.get(kAus) ?? null;
      return {
        ...d,
        comparecimento: "nao_compareceu",
        observacao: motivo ? `Ausente: ${motivo}` : (d.observacao ?? "Ausente"),
      };
    }
    return d;
  });
  return r;
}

/**
 * Parseia uma ata de audiência e grava o resultado na audiência correspondente:
 * links de mídia (acesso direto), resultado, presenças, ouvidos/ausentes (marca
 * o painel de depoentes). Retorna null quando o texto não é uma ata.
 *
 * Alvo: `audienciaId` explícito (botão manual no sheet) OU a audiência do
 * processo na data realizada da ata OU a mais recente passada do processo.
 */
export async function aplicarAtaAudiencia(
  tx: typeof db,
  params: { processoId: number; conteudo: string; audienciaId?: number | null },
): Promise<AtaAplicada | null> {
  const parsed = parseAtaAudiencia(params.conteudo);
  if (!parsed.ehAta && parsed.midias.length === 0) return null;

  // Resolve a audiência alvo.
  let alvo: { id: number; registro: unknown } | null = null;
  if (params.audienciaId) {
    const [a] = await tx
      .select({ id: audiencias.id, registro: audiencias.registroAudiencia })
      .from(audiencias)
      .where(eq(audiencias.id, params.audienciaId))
      .limit(1);
    alvo = a ?? null;
  }
  if (!alvo && parsed.dataRealizada) {
    const [a] = await tx
      .select({ id: audiencias.id, registro: audiencias.registroAudiencia })
      .from(audiencias)
      .where(
        and(
          eq(audiencias.processoId, params.processoId),
          sql`(${audiencias.dataAudiencia} AT TIME ZONE 'America/Bahia')::date = ${parsed.dataRealizada}::date`,
        ),
      )
      .orderBy(desc(audiencias.id))
      .limit(1);
    alvo = a ?? null;
  }
  if (!alvo) {
    const [a] = await tx
      .select({ id: audiencias.id, registro: audiencias.registroAudiencia })
      .from(audiencias)
      .where(eq(audiencias.processoId, params.processoId))
      .orderBy(desc(audiencias.dataAudiencia))
      .limit(1);
    alvo = a ?? null;
  }
  if (!alvo) return null;

  const registroAtualizado = aplicarStatusDepoentes(alvo.registro, parsed);

  await tx
    .update(audiencias)
    .set({
      midias: parsed.midias,
      ata: {
        resultado: parsed.resultado,
        data_realizada: parsed.dataRealizada,
        hora_realizada: parsed.horaRealizada,
        presencas: parsed.presencas as Record<string, string | null>,
        ouvidos: parsed.ouvidos,
        ausencias: parsed.ausencias,
        parseado_em: new Date().toISOString().slice(0, 10),
      },
      registroAudiencia: registroAtualizado as never,
      updatedAt: new Date(),
    })
    .where(eq(audiencias.id, alvo.id));

  return {
    audienciaId: alvo.id,
    midias: parsed.midias.length,
    ouvidos: parsed.ouvidos.length,
    ausencias: parsed.ausencias.length,
    resultado: parsed.resultado,
  };
}
