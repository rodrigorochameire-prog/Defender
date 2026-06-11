import { and, eq, inArray } from "drizzle-orm";
import { processos } from "@/lib/db/schema/core";
import { processosVVD, historicoMPU, medidasMPU } from "@/lib/db/schema/vvd";
import { FASE_PROCEDIMENTO, MOTIVO_INTIMACAO } from "@/lib/mpu-constants";
import { parseDecisaoMPU, type DecisaoMPUParsed, type MedidaParsed } from "./parse-decisao";
import { db } from "@/lib/db";

export interface ResumoProcessoVVD {
  mpuAtiva: true;
  faseProcedimento: string;
  motivoUltimaIntimacao: string;
  distanciaMinima: number | null;
  prazoMpuDias: number | null;
  dataDecisaoMPU: string | null;
  dataVencimentoMPU: string | null;
}

function addDias(isoDate: string, dias: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Converte o parse nos campos da esteira de `processos_vvd`. Pura. */
export function resumirParaProcessoVVD(
  parsed: DecisaoMPUParsed,
  dataDecisaoISO: string | null,
): ResumoProcessoVVD {
  const distancias = parsed.medidas
    .map((m) => m.distanciaMetros)
    .filter((d): d is number => typeof d === "number");
  // distanciaMinima stores the GOVERNING (largest/most restrictive) radius among granted measures — intentionally Math.max, not Math.min.
  const distanciaMinima = distancias.length ? Math.max(...distancias) : null;
  const dataVencimentoMPU =
    parsed.prazoDias && dataDecisaoISO ? addDias(dataDecisaoISO, parsed.prazoDias) : null;
  return {
    mpuAtiva: true,
    faseProcedimento: FASE_PROCEDIMENTO.DECISAO_LIMINAR,
    motivoUltimaIntimacao: MOTIVO_INTIMACAO.CIENCIA_DECISAO_MPU,
    distanciaMinima,
    prazoMpuDias: parsed.prazoDias,
    dataDecisaoMPU: dataDecisaoISO,
    dataVencimentoMPU,
  };
}

export interface MedidaCriada {
  codigo: string;
  artigo: string;
  distanciaMetros: number | null;
}

export interface MedidaExistente {
  id: number;
  codigo: string;
  origem: string | null;
  status: string | null;
}

export interface PlanoMergeMedidas {
  inserir: MedidaParsed[];
  atualizar: Array<{ id: number; medida: MedidaParsed }>;
  revogarIds: number[];
}

/**
 * Decide como aplicar um parse sobre as medidas já gravadas — um ajuste
 * posterior (reconsideração parcial) NUNCA apaga medidas anteriores:
 *  - código novo → inserir;
 *  - código já existente origem=parser → atualizar no lugar (reimportação
 *    idempotente e modificações, ex. nova distância);
 *  - código já existente origem=manual → não toca (manual vence);
 *  - código revogado na decisão → marcar as linhas existentes como revogadas.
 * Pura — testável sem banco.
 */
export function planejarMergeMedidas(
  existentes: MedidaExistente[],
  parsed: DecisaoMPUParsed,
): PlanoMergeMedidas {
  const inserir: MedidaParsed[] = [];
  const atualizar: Array<{ id: number; medida: MedidaParsed }> = [];

  for (const m of parsed.medidas) {
    const mesmas = existentes.filter((e) => e.codigo === m.codigo);
    if (mesmas.length === 0) {
      inserir.push(m);
      continue;
    }
    const doParser = mesmas.find((e) => e.origem === "parser");
    if (doParser) atualizar.push({ id: doParser.id, medida: m });
    // só manual → não duplica nem sobrescreve
  }

  const concedidos = new Set(parsed.medidas.map((m) => m.codigo));
  const revogarIds = existentes
    .filter(
      (e) =>
        parsed.medidasRevogadas.includes(e.codigo as never) &&
        !concedidos.has(e.codigo as never) &&
        e.status !== "revogada",
    )
    .map((e) => e.id);

  return { inserir, atualizar, revogarIds };
}

/**
 * Orquestra parse → persist medidas + esteira + histórico, dentro de uma transação.
 * Retorna as medidas gravadas (vazio se não houver processo_vvd correspondente
 * ou nenhuma medida detectada).
 *
 * `tx` é tipado como `typeof db` — o mesmo tipo que `withTransaction` passa ao callback
 * (veja src/lib/db/index.ts: `fn: (tx: typeof db) => Promise<T>`).
 */
export async function aplicarMedidasMPU(
  tx: typeof db,
  params: { processoId: number; conteudo: string; dataDecisaoISO: string | null },
): Promise<MedidaCriada[]> {
  const parsed = parseDecisaoMPU(params.conteudo);
  if (parsed.medidas.length === 0 && parsed.medidasRevogadas.length === 0) return [];

  const [proc] = await tx
    .select({ numero: processos.numeroAutos })
    .from(processos)
    .where(eq(processos.id, params.processoId))
    .limit(1);
  if (!proc?.numero) return [];

  let [pvvd] = await tx
    .select({ id: processosVVD.id })
    .from(processosVVD)
    .where(eq(processosVVD.numeroAutos, proc.numero))
    .limit(1);
  if (!pvvd) {
    // Decisão de MPU sem esteira ainda — cria a linha mínima em vez de
    // descartar as medidas em silêncio (caso Roberto, registros 463/464).
    [pvvd] = await tx
      .insert(processosVVD)
      .values({ numeroAutos: proc.numero })
      .returning({ id: processosVVD.id });
    if (!pvvd) return [];
  }

  const existentes: MedidaExistente[] = await tx
    .select({
      id: medidasMPU.id,
      codigo: medidasMPU.codigo,
      origem: medidasMPU.origem,
      status: medidasMPU.status,
    })
    .from(medidasMPU)
    .where(eq(medidasMPU.processoVvdId, pvvd.id));

  const plano = planejarMergeMedidas(existentes, parsed);

  const valoresDe = (m: MedidaParsed) => ({
    codigo: m.codigo,
    artigo: m.artigo,
    distanciaMetros: m.distanciaMetros ?? null,
    parametros: {
      protegidos: m.protegidos,
      meios: m.meios,
      lugares: m.lugares,
      valor: m.valor,
    },
    literal: m.literal,
    dataDecisao: params.dataDecisaoISO,
    dataVencimento:
      parsed.prazoDias && params.dataDecisaoISO
        ? addDias(params.dataDecisaoISO, parsed.prazoDias)
        : null,
    status: "ativa" as const,
  });

  const rows: MedidaCriada[] = [];
  for (const m of plano.inserir) {
    await tx
      .insert(medidasMPU)
      .values({ processoVvdId: pvvd.id, origem: "parser", ...valoresDe(m) });
    rows.push({ codigo: m.codigo, artigo: m.artigo, distanciaMetros: m.distanciaMetros ?? null });
  }
  for (const { id, medida } of plano.atualizar) {
    await tx.update(medidasMPU).set(valoresDe(medida)).where(eq(medidasMPU.id, id));
    rows.push({
      codigo: medida.codigo,
      artigo: medida.artigo,
      distanciaMetros: medida.distanciaMetros ?? null,
    });
  }
  if (plano.revogarIds.length) {
    await tx
      .update(medidasMPU)
      .set({ status: "revogada" })
      .where(inArray(medidasMPU.id, plano.revogarIds));
  }

  // Esteira: recalculada sobre o conjunto VIGENTE pós-merge (não só o parse
  // desta decisão — um ajuste posterior sem prazo não pode zerar o prazo).
  const ativas = await tx
    .select({ distancia: medidasMPU.distanciaMetros })
    .from(medidasMPU)
    .where(and(eq(medidasMPU.processoVvdId, pvvd.id), eq(medidasMPU.status, "ativa")));
  const distancias = ativas
    .map((a) => a.distancia)
    .filter((d): d is number => typeof d === "number");
  const resumo = resumirParaProcessoVVD(parsed, params.dataDecisaoISO);
  await tx
    .update(processosVVD)
    .set({
      mpuAtiva: ativas.length > 0,
      faseProcedimento: resumo.faseProcedimento,
      motivoUltimaIntimacao: resumo.motivoUltimaIntimacao,
      distanciaMinima: distancias.length ? Math.max(...distancias) : null,
      ...(params.dataDecisaoISO ? { dataDecisaoMPU: params.dataDecisaoISO } : {}),
      ...(parsed.prazoDias
        ? {
            prazoMpuDias: parsed.prazoDias,
            dataVencimentoMPU: resumo.dataVencimentoMPU,
          }
        : {}),
    })
    .where(eq(processosVVD.id, pvvd.id));

  const partes: string[] = [];
  if (plano.inserir.length) partes.push(`${plano.inserir.length} concedida(s)`);
  if (plano.atualizar.length) partes.push(`${plano.atualizar.length} atualizada(s)`);
  if (plano.revogarIds.length) partes.push(`${plano.revogarIds.length} revogada(s)`);
  await tx.insert(historicoMPU).values({
    processoVVDId: pvvd.id,
    tipoEvento:
      rows.length === 0 && plano.revogarIds.length ? "revogacao" : "concessao",
    dataEvento: params.dataDecisaoISO ?? new Date().toISOString().slice(0, 10),
    descricao: `Decisão aplicada pelo parser: ${partes.join(", ")}.`,
    medidasVigentes: rows.map((r) => r.codigo).join(", "),
    novaDistancia: distancias.length ? Math.max(...distancias) : null,
    novaDataVencimento: parsed.prazoDias ? resumo.dataVencimentoMPU : null,
  });

  return rows;
}
