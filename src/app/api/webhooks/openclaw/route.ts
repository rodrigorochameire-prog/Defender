import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { demandas, processos, assistidos } from "@/lib/db/schema";
import { partesVVD, processosVVD, intimacoesVVD } from "@/lib/db/schema/vvd";
import { eq, and, sql } from "drizzle-orm";
import type { IntimacaoPJeSimples } from "@/lib/pje-parser";
import { ASSISTIDO_A_IDENTIFICAR } from "@/lib/pje-parser";
import { triggerReorder } from "@/lib/services/reorder-trigger";

type NovaIntimacaoPayload = {
  event: "nova_intimacao";
  intimacoes: IntimacaoPJeSimples[];
};

type WebhookPayload = NovaIntimacaoPayload;

function detectArea(item: IntimacaoPJeSimples): "JURI" | "EXECUCAO_PENAL" | "VIOLENCIA_DOMESTICA" | "SUBSTITUICAO" | "CURADORIA" | "FAMILIA" | "CIVEL" | "FAZENDA_PUBLICA" {
  if (item.isMPU) return "VIOLENCIA_DOMESTICA";
  const vara = (item.vara ?? "").toLowerCase();
  const tipo = (item.tipoProcesso ?? "").toLowerCase();
  if (vara.includes("violência doméstica") || vara.includes("violencia domestica")) return "VIOLENCIA_DOMESTICA";
  if (tipo.includes("ep") || vara.includes("execução penal") || vara.includes("execucao penal")) return "EXECUCAO_PENAL";
  return "JURI";
}

// Converte "DD/MM/YYYY" (formato do PJe) ou "YYYY-MM-DD" (ISO) para Date UTC.
function parseDataParaDate(dataStr: string): Date | null {
  const soData = dataStr.split(" ")[0];
  // ISO?
  if (/^\d{4}-\d{2}-\d{2}$/.test(soData)) {
    const d = new Date(`${soData}T00:00:00Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  // DD/MM/YYYY?
  const m = soData.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) {
    const d = new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Lei 11.419/2006, art. 5º §3º: considera-se realizada a intimação 10 dias
// corridos após a expedição eletrônica, se não houver consulta antes.
function calcularDataIntimacao(dataExpedicao: string | undefined | null): string | null {
  if (!dataExpedicao) return null;
  const d = parseDataParaDate(dataExpedicao);
  if (!d) return null;
  d.setUTCDate(d.getUTCDate() + 10);
  return toIsoDate(d);
}

// Prazo final: data_intimacao + prazoDias em dias úteis, com ajuste para
// próximo dia útil. A dobra de prazo da Defensoria (CPC art. 186) fica a
// cargo da UI/validação final — aqui guardamos o prazo processual cru.
function calcularPrazoFinal(dataIntimacao: string | null, prazoDias: number | undefined | null): string | null {
  if (!dataIntimacao || !prazoDias || prazoDias <= 0) return null;
  const base = parseDataParaDate(dataIntimacao);
  if (!base) return null;
  let adicionados = 0;
  const cursor = new Date(base);
  while (adicionados < prazoDias) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const dow = cursor.getUTCDay();
    if (dow !== 0 && dow !== 6) adicionados++;
  }
  // Se cair em fim de semana (não deveria, mas por garantia):
  while (cursor.getUTCDay() === 0 || cursor.getUTCDay() === 6) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return toIsoDate(cursor);
}

async function handleNovaIntimacao(intimacoes: IntimacaoPJeSimples[]): Promise<number> {
  let processed = 0;
  const atribuicoesAfetadas = new Set<string>();

  for (const item of intimacoes) {
    if (!item.assistido || !item.numeroProcesso) continue;

    const isAIdentificar =
      item.assistidoNaoIdentificado || item.assistido === ASSISTIDO_A_IDENTIFICAR;

    // ── 1. Buscar processo já existente pelo número CNJ ───────────────────
    // Importante: antes de decidir qual assistido usar, checar se o processo
    // já está cadastrado. Isso cobre o caso do re-import: se o defensor já
    // corrigiu o nome do placeholder para "João da Silva", nova intimação
    // do mesmo processo deve reaproveitar esse assistido em vez de criar
    // outro placeholder "⚠ A identificar — <cnj>" órfão.
    let processo = await db.query.processos.findFirst({
      where: eq(processos.numeroAutos, item.numeroProcesso),
    });

    // ── 2. Resolver assistido ──────────────────────────────────────────────
    let assistido: typeof assistidos.$inferSelect | undefined;

    if (processo?.assistidoId) {
      // Processo já existe → reaproveita o assistido vinculado (mesmo que
      // seja um placeholder ainda, mantém a identidade). Só ignoramos o
      // reuso se o parser identificou um nome real e ele difere do atual
      // placeholder (defensor pode ter enfim identificado via scraping).
      const atual = await db.query.assistidos.findFirst({
        where: eq(assistidos.id, processo.assistidoId),
      });
      const atualEhPlaceholder = atual?.nome.startsWith(ASSISTIDO_A_IDENTIFICAR);
      if (atual && (!isAIdentificar ? !atualEhPlaceholder || atual : true)) {
        assistido = atual;
      }
      // Se o parser trouxe nome real e o processo ainda tem placeholder,
      // promovemos o placeholder para o nome real (renomeando o registro —
      // preserva todas as FKs e histórico).
      if (atual && atualEhPlaceholder && !isAIdentificar) {
        await db
          .update(assistidos)
          .set({ nome: item.assistido, observacoes: null })
          .where(eq(assistidos.id, atual.id));
        assistido = { ...atual, nome: item.assistido, observacoes: null };
      }
    }

    if (!assistido) {
      // Processo inexistente OU assistido ainda não resolvido.
      const nomeAssistido = isAIdentificar
        ? `${ASSISTIDO_A_IDENTIFICAR} — ${item.numeroProcesso}`
        : item.assistido;

      assistido = await db.query.assistidos.findFirst({
        where: eq(assistidos.nome, nomeAssistido),
      });

      if (!assistido) {
        const [created] = await db
          .insert(assistidos)
          .values({
            nome: nomeAssistido,
            observacoes: isAIdentificar
              ? `Importado via PJe sem identificação do réu. Destinatário bruto: ${item.destinatarioOriginal ?? "desconhecido"}. Revisar e corrigir o nome.`
              : null,
          })
          .returning();
        assistido = created;
      }
    }

    // ── 3. findOrCreate processo ───────────────────────────────────────────
    if (!processo) {
      const [created] = await db
        .insert(processos)
        .values({
          assistidoId: assistido.id,
          numeroAutos: item.numeroProcesso,
          area: detectArea(item),
          vara: item.vara ?? null,
        })
        .returning();
      processo = created;
    }

    // ── 3. Deduplicar e inserir demanda ────────────────────────────────────
    const ato = item.tipoDocumento
      ? item.idDocumento
        ? `${item.tipoDocumento} #${item.idDocumento}`
        : item.tipoDocumento
      : "Intimação PJe";

    let existingDemanda = item.idDocumento
      ? await db.query.demandas.findFirst({
          where: and(
            eq(demandas.processoId, processo.id),
            sql`${demandas.enrichmentData}->>'id_documento_pje' = ${item.idDocumento}`,
          ),
        })
      : await db.query.demandas.findFirst({
          where: and(
            eq(demandas.processoId, processo.id),
            eq(demandas.ato, ato),
          ),
        });

    let demanda;

    const dataIntimacao = calcularDataIntimacao(item.dataExpedicao);
    const prazoFinal = calcularPrazoFinal(dataIntimacao, item.prazo);

    if (!existingDemanda) {
      const [created] = await db
        .insert(demandas)
        .values({
          processoId: processo.id,
          assistidoId: assistido.id,
          ato,
          dataExpedicao: item.dataExpedicao || null,
          dataIntimacao,
          prazo: prazoFinal,
          ordemOriginal: item.ordemOriginal ?? null,
          enrichmentData: {
            crime: item.crime,
            atribuicao_detectada: item.atribuicaoDetectada,
            tipo_documento_pje: item.tipoDocumento,
            id_documento_pje: item.idDocumento,
            tipo_processo: item.tipoProcesso,
            vara: item.vara,
          },
        })
        .returning();
      demanda = created;
      if (processo.atribuicao) atribuicoesAfetadas.add(processo.atribuicao);
      processed++;
    } else {
      demanda = existingDemanda;
    }

    // ── 4. Se é processo de VVD: inserir também em intimacoesVVD ───────────
    // Toda intimação em processo de Violência Doméstica precisa aparecer no
    // painel VVD. Antes restringíamos a MPU (item.isMPU), mas a Vara de VVD
    // também julga AP ordinária/sumária, liberdade provisória etc. Filtro
    // atualizado para cobrir tanto MPU explícita quanto detecção por área.
    const isVVD = item.isMPU || detectArea(item) === "VIOLENCIA_DOMESTICA";
    if (!isVVD) continue;

    // 4a. findOrCreate parteVVD (requerido = o assistido)
    // Usa o próprio nome do assistido (já individualizado no bloco 2 quando
    // é placeholder), garantindo que o parte VVD fica colado no registro
    // correto de assistido — não agrupa processos distintos num só requerido.
    let parteRequerido = await db.query.partesVVD.findFirst({
      where: and(
        eq(partesVVD.nome, assistido.nome),
        eq(partesVVD.tipoParte, "requerido"),
      ),
    });

    if (!parteRequerido) {
      const [created] = await db
        .insert(partesVVD)
        .values({
          nome: assistido.nome,
          tipoParte: "requerido",
          assistidoId: assistido.id,
        })
        .returning();
      parteRequerido = created;
    } else if (!parteRequerido.assistidoId) {
      // Backfill: parte criada antes do vínculo existir (ou sem assistido na
      // rodada original) fica órfã e quebra joins de painéis VVD. Preenche
      // agora que temos o assistido em mãos.
      await db
        .update(partesVVD)
        .set({ assistidoId: assistido.id })
        .where(eq(partesVVD.id, parteRequerido.id));
      parteRequerido = { ...parteRequerido, assistidoId: assistido.id };
    }

    // 4b. findOrCreate processoVVD
    let processoVVD = await db.query.processosVVD.findFirst({
      where: eq(processosVVD.numeroAutos, item.numeroProcesso),
    });

    if (!processoVVD) {
      const [created] = await db
        .insert(processosVVD)
        .values({
          requeridoId: parteRequerido.id,
          numeroAutos: item.numeroProcesso,
          tipoProcesso: item.tipoProcesso ?? "MPU",
          vara: item.vara ?? "Vara de Violência Doméstica",
          crime: item.crime ?? null,
          processoId: processo.id,
        })
        .returning();
      processoVVD = created;
    }

    // 4c. Deduplicar e inserir intimacaoVVD
    const existingIntimacaoVVD = item.idDocumento
      ? await db.query.intimacoesVVD.findFirst({
          where: and(
            eq(intimacoesVVD.processoVVDId, processoVVD.id),
            eq(intimacoesVVD.pjeDocumentoId, item.idDocumento),
          ),
        })
      : await db.query.intimacoesVVD.findFirst({
          where: and(
            eq(intimacoesVVD.processoVVDId, processoVVD.id),
            eq(intimacoesVVD.ato, ato),
          ),
        });

    if (!existingIntimacaoVVD) {
      const dataIntimacao = calcularDataIntimacao(item.dataExpedicao);
      await db.insert(intimacoesVVD).values({
        processoVVDId: processoVVD.id,
        ato,
        tipoIntimacao: "CIENCIA",
        dataExpedicao: item.dataExpedicao || null,
        dataIntimacao,
        prazoDias: item.prazo ?? null,
        pjeDocumentoId: item.idDocumento ?? null,
        pjeTipoDocumento: item.tipoDocumento ?? null,
        demandaId: demanda.id,
      });
    }
  }

  for (const atr of atribuicoesAfetadas) {
    triggerReorder(atr, "openclaw");
  }

  return processed;
}

export async function POST(request: NextRequest) {
  try {
    // ── Auth ────────────────────────────────────────────────────────────────
    const secret = request.headers.get("x-openclaw-secret");
    const expectedSecret = process.env.OPENCLAW_WEBHOOK_SECRET;

    if (expectedSecret && secret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as WebhookPayload;

    if (!body?.event) {
      return NextResponse.json(
        { error: "Bad Request", message: "Missing event field" },
        { status: 400 },
      );
    }

    // ── Dispatch ────────────────────────────────────────────────────────────
    switch (body.event) {
      case "nova_intimacao": {
        const { intimacoes } = body;

        if (!Array.isArray(intimacoes) || intimacoes.length === 0) {
          return NextResponse.json(
            { error: "Bad Request", message: "intimacoes must be a non-empty array" },
            { status: 400 },
          );
        }

        const processed = await handleNovaIntimacao(intimacoes);

        return NextResponse.json({ received: true, processed });
      }

      default:
        return NextResponse.json(
          { error: "Bad Request", message: `Unknown event: ${(body as { event: string }).event}` },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("[openclaw webhook] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: (error as Error).message },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "OpenClaw Webhook",
    events: ["nova_intimacao"],
    description: "Recebe intimações processadas pelo OpenClaw e insere no Defender",
    expectedFormat: {
      event: "nova_intimacao",
      intimacoes: [
        {
          assistido: "Nome do Assistido",
          numeroProcesso: "0001234-56.2025.8.05.0039",
          dataExpedicao: "2025-01-15",
          idDocumento: "62096897",
          tipoDocumento: "Intimação",
          prazo: 15,
          tipoProcesso: "APOrd",
          crime: "Furto",
          vara: "1ª Vara Criminal",
          isMPU: false,
        },
      ],
    },
  });
}
