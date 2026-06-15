import { and, eq, inArray } from "drizzle-orm";
import { cautelaresDecisao as cautelaresTable } from "@/lib/db/schema/cautelares";
import { db } from "@/lib/db";
import {
  parseDecisaoCautelar,
  type CautelarParsed,
  type DecisaoCautelarParsed,
} from "./parse-decisao-cautelar";
import { STATUS_CAUTELAR } from "./cautelares-taxonomia";

export interface CautelarCriada {
  codigo: string;
  especie: string;
  artigo: string | null;
}

export interface CautelarExistente {
  id: number;
  codigo: string;
  origem: string | null;
  status: string | null;
}

export interface PlanoMergeCautelares {
  inserir: CautelarParsed[];
  atualizar: Array<{ id: number; cautelar: CautelarParsed }>;
  revogarIds: number[];
}

function parametrosDe(c: CautelarParsed) {
  const p: Record<string, unknown> = {};
  if (c.periodicidade) p.periodicidade = c.periodicidade;
  if (c.valorFianca) p.valorFianca = c.valorFianca;
  if (c.horario) p.horario = c.horario;
  if (typeof c.distanciaMetros === "number") p.distanciaMetros = c.distanciaMetros;
  if (c.pessoas?.length) p.pessoas = c.pessoas;
  if (c.lugares?.length) p.lugares = c.lugares;
  return Object.keys(p).length ? p : null;
}

/**
 * Decide como aplicar um parse sobre as cautelares já gravadas — um ajuste
 * posterior nunca apaga as anteriores:
 *  - código novo → inserir;
 *  - código já existente origem=parser → atualizar no lugar (idempotente);
 *  - código já existente origem=manual → não toca (manual vence);
 *  - código revogado na decisão → marcar linhas existentes como revogadas.
 * Pura — testável sem banco.
 */
export function planejarMergeCautelares(
  existentes: CautelarExistente[],
  parsed: DecisaoCautelarParsed,
): PlanoMergeCautelares {
  const inserir: CautelarParsed[] = [];
  const atualizar: Array<{ id: number; cautelar: CautelarParsed }> = [];

  for (const c of parsed.cautelares) {
    const mesmas = existentes.filter((e) => e.codigo === c.codigo);
    if (mesmas.length === 0) {
      inserir.push(c);
      continue;
    }
    const doParser = mesmas.find((e) => e.origem === "parser");
    if (doParser) atualizar.push({ id: doParser.id, cautelar: c });
    // só manual → não duplica nem sobrescreve
  }

  const concedidos = new Set(parsed.cautelares.map((c) => c.codigo));
  const revogarIds = existentes
    .filter(
      (e) =>
        parsed.revogadas.includes(e.codigo as never) &&
        !concedidos.has(e.codigo as never) &&
        e.status !== STATUS_CAUTELAR.REVOGADA,
    )
    .map((e) => e.id);

  return { inserir, atualizar, revogarIds };
}

/**
 * Orquestra parse → persist das cautelares (prisão e diversas da prisão) a
 * partir do texto de uma decisão, dentro de uma transação. Retorna as
 * cautelares gravadas (vazio quando a decisão não fixa cautelar alguma).
 *
 * `tx` é tipado como `typeof db` (o mesmo tipo passado a withTransaction).
 */
export async function aplicarCautelares(
  tx: typeof db,
  params: { processoId: number; conteudo: string; dataDecisaoISO: string | null; origem?: string },
): Promise<CautelarCriada[]> {
  const parsed = parseDecisaoCautelar(params.conteudo);
  if (parsed.cautelares.length === 0 && parsed.revogadas.length === 0) return [];

  const existentes: CautelarExistente[] = await tx
    .select({
      id: cautelaresTable.id,
      codigo: cautelaresTable.codigo,
      origem: cautelaresTable.origem,
      status: cautelaresTable.status,
    })
    .from(cautelaresTable)
    .where(eq(cautelaresTable.processoId, params.processoId));

  const plano = planejarMergeCautelares(existentes, parsed);
  const criadas: CautelarCriada[] = [];
  const origem = params.origem ?? "parser";

  for (const c of plano.inserir) {
    await tx.insert(cautelaresTable).values({
      processoId: params.processoId,
      codigo: c.codigo,
      especie: c.especie,
      artigo: c.artigo,
      parametros: parametrosDe(c),
      literal: c.literal,
      dataDecisao: params.dataDecisaoISO,
      status: STATUS_CAUTELAR.ATIVA,
      origem,
    });
    criadas.push({ codigo: c.codigo, especie: c.especie, artigo: c.artigo });
  }

  for (const { id, cautelar } of plano.atualizar) {
    await tx
      .update(cautelaresTable)
      .set({
        especie: cautelar.especie,
        artigo: cautelar.artigo,
        parametros: parametrosDe(cautelar),
        literal: cautelar.literal,
        dataDecisao: params.dataDecisaoISO,
        status: STATUS_CAUTELAR.ATIVA,
        updatedAt: new Date(),
      })
      .where(eq(cautelaresTable.id, id));
  }

  if (plano.revogarIds.length) {
    await tx
      .update(cautelaresTable)
      .set({ status: STATUS_CAUTELAR.REVOGADA, updatedAt: new Date() })
      .where(
        and(
          inArray(cautelaresTable.id, plano.revogarIds),
          eq(cautelaresTable.processoId, params.processoId),
        ),
      );
  }

  return criadas;
}
