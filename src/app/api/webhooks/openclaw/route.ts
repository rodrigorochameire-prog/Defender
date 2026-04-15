import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { demandas, processos, assistidos } from "@/lib/db/schema";
import { partesVVD, processosVVD, intimacoesVVD } from "@/lib/db/schema/vvd";
import { eq, and, sql } from "drizzle-orm";
import type { IntimacaoPJeSimples } from "@/lib/pje-parser";
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

async function handleNovaIntimacao(intimacoes: IntimacaoPJeSimples[]): Promise<number> {
  let processed = 0;
  const atribuicoesAfetadas = new Set<string>();

  for (const item of intimacoes) {
    if (!item.assistido || !item.numeroProcesso) continue;

    // ── 1. findOrCreate assistido ──────────────────────────────────────────
    let assistido = await db.query.assistidos.findFirst({
      where: eq(assistidos.nome, item.assistido),
    });

    if (!assistido) {
      const [created] = await db
        .insert(assistidos)
        .values({ nome: item.assistido })
        .returning();
      assistido = created;
    }

    // ── 2. findOrCreate processo ───────────────────────────────────────────
    let processo = await db.query.processos.findFirst({
      where: eq(processos.numeroAutos, item.numeroProcesso),
    });

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

    if (!existingDemanda) {
      const [created] = await db
        .insert(demandas)
        .values({
          processoId: processo.id,
          assistidoId: assistido.id,
          ato,
          dataExpedicao: item.dataExpedicao || null,
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

    // ── 4. Se isMPU: inserir também em intimacoesVVD ───────────────────────
    if (!item.isMPU) continue;

    // 4a. findOrCreate parteVVD (requerido = o assistido)
    let parteRequerido = await db.query.partesVVD.findFirst({
      where: and(
        eq(partesVVD.nome, item.assistido),
        eq(partesVVD.tipoParte, "requerido"),
      ),
    });

    if (!parteRequerido) {
      const [created] = await db
        .insert(partesVVD)
        .values({
          nome: item.assistido,
          tipoParte: "requerido",
          assistidoId: assistido.id,
        })
        .returning();
      parteRequerido = created;
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
      await db.insert(intimacoesVVD).values({
        processoVVDId: processoVVD.id,
        ato,
        tipoIntimacao: "CIENCIA",
        dataExpedicao: item.dataExpedicao || null,
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
