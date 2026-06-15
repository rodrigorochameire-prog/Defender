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
  distanciaMetros?: number | null;
  parametros?: {
    protegidos?: string[];
    meios?: string[];
    lugares?: string[];
    valor?: string;
    alteracoes?: AlteracaoMedida[];
  } | null;
  literal?: string | null;
}

export interface AlteracaoMedida {
  em: string | null;
  descricao: string;
  anterior: { distanciaMetros: number | null; parametros: unknown; literal: string | null };
  nova: { distanciaMetros: number | null; parametros: unknown; literal: string | null };
}

export interface PlanoMergeMedidas {
  inserir: MedidaParsed[];
  atualizar: Array<{ id: number; medida: MedidaParsed; alteracao: string | null }>;
  revogarIds: number[];
}

const CAMPO_LISTA = [
  ["protegidos", "protegidos"],
  ["meios", "meios"],
  ["lugares", "lugares"],
] as const;

/**
 * Descreve a modulação de uma medida existente por uma decisão posterior
 * (anterior → nova) — null quando nada material mudou (reimportação idêntica
 * não gera observação). Pura.
 */
export function descreverModulacao(
  antes: MedidaExistente,
  depois: MedidaParsed,
): string | null {
  const partes: string[] = [];

  const distAntes = antes.distanciaMetros ?? null;
  const distDepois = depois.distanciaMetros ?? null;
  if (distAntes !== distDepois) {
    partes.push(
      `distância: ${distAntes != null ? `${distAntes} m` : "—"} → ${distDepois != null ? `${distDepois} m` : "—"}`,
    );
  }

  for (const [campo, rotulo] of CAMPO_LISTA) {
    const a = [...((antes.parametros?.[campo] as string[] | undefined) ?? [])].sort();
    const d = [...((depois[campo] as string[] | undefined) ?? [])].sort();
    if (a.join(",") !== d.join(",") && (a.length || d.length)) {
      partes.push(`${rotulo}: ${a.join(", ") || "—"} → ${d.join(", ") || "—"}`);
    }
  }

  const valorAntes = antes.parametros?.valor ?? null;
  const valorDepois = depois.valor ?? null;
  if (valorAntes !== valorDepois && (valorAntes || valorDepois)) {
    partes.push(`valor: ${valorAntes ?? "—"} → ${valorDepois ?? "—"}`);
  }

  return partes.length ? partes.join("; ") : null;
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
  const atualizar: Array<{ id: number; medida: MedidaParsed; alteracao: string | null }> = [];

  for (const m of parsed.medidas) {
    const mesmas = existentes.filter((e) => e.codigo === m.codigo);
    if (mesmas.length === 0) {
      inserir.push(m);
      continue;
    }
    const doParser = mesmas.find((e) => e.origem === "parser");
    if (doParser) {
      atualizar.push({
        id: doParser.id,
        medida: m,
        alteracao: descreverModulacao(doParser, m),
      });
    }
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
  if (
    parsed.medidas.length === 0 &&
    parsed.medidasRevogadas.length === 0 &&
    !parsed.revogacaoTotal
  )
    return [];

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
      distanciaMetros: medidasMPU.distanciaMetros,
      parametros: medidasMPU.parametros,
      literal: medidasMPU.literal,
    })
    .from(medidasMPU)
    .where(eq(medidasMPU.processoVvdId, pvvd.id));

  const plano = planejarMergeMedidas(existentes, parsed);

  type ValoresMedida = {
    codigo: string;
    artigo: string;
    distanciaMetros: number | null;
    parametros: NonNullable<MedidaExistente["parametros"]>;
    literal: string;
    dataDecisao: string | null;
    dataVencimento: string | null;
    status: "ativa";
  };
  const valoresDe = (m: MedidaParsed): ValoresMedida => ({
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
  const modulacoes: string[] = [];
  for (const { id, medida, alteracao } of plano.atualizar) {
    const valores = valoresDe(medida);
    if (alteracao) {
      // Observação durável da modulação: versão anterior → nova, no jsonb da
      // própria medida (a UI exibe) e no histórico do processo (abaixo).
      const antes = existentes.find((e) => e.id === id);
      const trilha: AlteracaoMedida[] = [
        ...(antes?.parametros?.alteracoes ?? []),
        {
          em: params.dataDecisaoISO,
          descricao: alteracao,
          anterior: {
            distanciaMetros: antes?.distanciaMetros ?? null,
            parametros: antes?.parametros ?? null,
            literal: antes?.literal ?? null,
          },
          nova: {
            distanciaMetros: medida.distanciaMetros ?? null,
            parametros: valores.parametros,
            literal: medida.literal,
          },
        },
      ];
      valores.parametros = { ...valores.parametros, alteracoes: trilha };
      modulacoes.push(`${medida.codigo}: ${alteracao}`);
    }
    await tx.update(medidasMPU).set(valores).where(eq(medidasMPU.id, id));
    rows.push({
      codigo: medida.codigo,
      artigo: medida.artigo,
      distanciaMetros: medida.distanciaMetros ?? null,
    });
  }
  // Revogação total ("revogo as medidas protetivas", sem nomear medida) →
  // revoga TODAS as ativas origem=parser do processo. Senão, só as nomeadas.
  const revogarIds = parsed.revogacaoTotal
    ? existentes
        .filter((e) => e.origem === "parser" && e.status !== "revogada")
        .map((e) => e.id)
    : plano.revogarIds;
  if (revogarIds.length) {
    await tx
      .update(medidasMPU)
      .set({
        status: "revogada",
        motivoRevogacao: parsed.motivoRevogacao ?? parsed.motivoRevogacaoLiteral ?? "Revogação (motivo não classificado)",
        dataRevogacao: params.dataDecisaoISO,
      })
      .where(inArray(medidasMPU.id, revogarIds));
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
  if (parsed.revogacaoTotal) {
    partes.push(
      `revogação total das MPU${revogarIds.length ? ` (${revogarIds.length} medida(s) marcada(s))` : ""}${parsed.motivoRevogacao ? ` — motivo: ${parsed.motivoRevogacao}` : ""}`,
    );
  } else if (revogarIds.length) {
    partes.push(
      `${revogarIds.length} revogada(s)${parsed.motivoRevogacao ? ` — motivo: ${parsed.motivoRevogacao}` : ""}`,
    );
  }
  if (modulacoes.length) partes.push(`modulação — ${modulacoes.join(" | ")}`);
  await tx.insert(historicoMPU).values({
    processoVVDId: pvvd.id,
    tipoEvento:
      parsed.revogacaoTotal || (rows.length === 0 && revogarIds.length)
        ? "revogacao"
        : "concessao",
    dataEvento: params.dataDecisaoISO ?? new Date().toISOString().slice(0, 10),
    descricao: `Decisão aplicada pelo parser: ${partes.join(", ")}.`,
    medidasVigentes: rows.map((r) => r.codigo).join(", "),
    novaDistancia: distancias.length ? Math.max(...distancias) : null,
    novaDataVencimento: parsed.prazoDias ? resumo.dataVencimentoMPU : null,
  });

  return rows;
}
