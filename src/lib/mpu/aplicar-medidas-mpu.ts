import { eq, and } from "drizzle-orm";
import { processos } from "@/lib/db/schema/core";
import { processosVVD, historicoMPU, medidasMPU } from "@/lib/db/schema/vvd";
import { FASE_PROCEDIMENTO, MOTIVO_INTIMACAO } from "@/lib/mpu-constants";
import { parseDecisaoMPU, type DecisaoMPUParsed } from "./parse-decisao";
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
  if (parsed.medidas.length === 0) return [];

  const [proc] = await tx
    .select({ numero: processos.numeroAutos })
    .from(processos)
    .where(eq(processos.id, params.processoId))
    .limit(1);
  if (!proc?.numero) return [];

  const [pvvd] = await tx
    .select({ id: processosVVD.id })
    .from(processosVVD)
    .where(eq(processosVVD.numeroAutos, proc.numero))
    .limit(1);
  if (!pvvd) return [];

  // Idempotência: remove apenas as medidas derivadas pelo parser.
  await tx
    .delete(medidasMPU)
    .where(and(eq(medidasMPU.processoVvdId, pvvd.id), eq(medidasMPU.origem, "parser")));

  const rows: MedidaCriada[] = [];
  for (const m of parsed.medidas) {
    await tx.insert(medidasMPU).values({
      processoVvdId: pvvd.id,
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
      status: "ativa",
      origem: "parser",
    });
    rows.push({
      codigo: m.codigo,
      artigo: m.artigo,
      distanciaMetros: m.distanciaMetros ?? null,
    });
  }

  const resumo = resumirParaProcessoVVD(parsed, params.dataDecisaoISO);
  await tx
    .update(processosVVD)
    .set({
      mpuAtiva: resumo.mpuAtiva,
      dataDecisaoMPU: resumo.dataDecisaoMPU,
      dataVencimentoMPU: resumo.dataVencimentoMPU,
      distanciaMinima: resumo.distanciaMinima,
      prazoMpuDias: resumo.prazoMpuDias,
      faseProcedimento: resumo.faseProcedimento,
      motivoUltimaIntimacao: resumo.motivoUltimaIntimacao,
    })
    .where(eq(processosVVD.id, pvvd.id));

  await tx.insert(historicoMPU).values({
    processoVVDId: pvvd.id,
    tipoEvento: "concessao",
    dataEvento: params.dataDecisaoISO ?? new Date().toISOString().slice(0, 10),
    descricao: `Concessão de ${rows.length} medida(s) protetiva(s) (parser).`,
    medidasVigentes: rows.map((r) => r.codigo).join(", "),
    novaDistancia: resumo.distanciaMinima,
    novaDataVencimento: resumo.dataVencimentoMPU,
  });

  return rows;
}
