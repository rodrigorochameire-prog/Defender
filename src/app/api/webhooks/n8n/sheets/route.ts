import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { processos, assistidos } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { triggerReorder } from "@/lib/services/reorder-trigger";
import { resolveDemanda } from "@/lib/services/demandas-resolver";

/**
 * Webhook endpoint para importar dados do Google Sheets via n8n
 * 
 * Este endpoint permite importar demandas/prazos diretamente de planilhas.
 * 
 * Configuração no n8n:
 * 1. Trigger: Google Sheets (quando nova linha é adicionada)
 * 2. Transformar dados para o formato esperado
 * 3. HTTP Request POST para este endpoint
 * 
 * Formato esperado:
 * {
 *   "rows": [
 *     {
 *       "assistido": "Nome do Assistido",
 *       "numeroProcesso": "0001234-56.2025.8.05.0039",
 *       "ato": "Resposta à Acusação",
 *       "prazo": "2025-01-20",
 *       "area": "JURI",
 *       "status": "5_TRIAGEM",
 *       "reuPreso": true
 *     }
 *   ]
 * }
 */

interface SheetRow {
  assistido: string;
  numeroProcesso: string;
  ato: string;
  prazo?: string;
  area?: string;
  status?: string;
  reuPreso?: boolean;
  providencias?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const secret = request.headers.get("x-webhook-secret");
    const expectedSecret = process.env.N8N_WEBHOOK_SECRET;
    
    if (expectedSecret && secret !== expectedSecret) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { rows } = await request.json() as { rows: SheetRow[] };

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "Bad Request", message: "No rows provided" },
        { status: 400 }
      );
    }

    const results = {
      created: 0,
      updated: 0,
      flagged: 0,
      skipped: 0,
      errors: [] as string[],
    };
    const atribuicoesAfetadas = new Set<string>();

    for (const row of rows) {
      try {
        // Validar campos obrigatórios
        if (!row.assistido || !row.numeroProcesso || !row.ato) {
          results.skipped++;
          results.errors.push(`Linha ignorada: falta assistido, processo ou ato`);
          continue;
        }

        // Buscar ou criar assistido
        let assistido = await db.query.assistidos.findFirst({
          where: eq(assistidos.nome, row.assistido),
        });

        if (!assistido) {
          const [newAssistido] = await db.insert(assistidos).values({
            nome: row.assistido,
            statusPrisional: row.reuPreso ? "CADEIA_PUBLICA" : "SOLTO",
          }).returning();
          assistido = newAssistido;
        }

        // Buscar ou criar processo
        let processo = await db.query.processos.findFirst({
          where: eq(processos.numeroAutos, row.numeroProcesso),
        });

        if (!processo) {
          const area = (row.area || "JURI") as "JURI" | "EXECUCAO_PENAL" | "VIOLENCIA_DOMESTICA" | "SUBSTITUICAO" | "CURADORIA" | "FAMILIA" | "CIVEL" | "FAZENDA_PUBLICA";
          const [newProcesso] = await db.insert(processos).values({
            assistidoId: assistido.id,
            numeroAutos: row.numeroProcesso,
            area: area,
          }).returning();
          processo = newProcesso;
        }

        // Resolver demanda via helper centralizado
        const result = await resolveDemanda({
          processoId: processo.id,
          assistidoId: assistido.id,
          ato: row.ato,
          origem: "planilha_n8n",
          status: row.status || "5_TRIAGEM",
          prazo: row.prazo || null,
          reuPreso: Boolean(row.reuPreso),
          // providencias migrada para tabela "registros" — não passar aqui
        });

        if (result.action === "created") results.created++;
        else if (result.action === "updated") results.updated++;
        else if (result.action === "created_flagged") results.flagged++;

        if (processo.atribuicao) atribuicoesAfetadas.add(processo.atribuicao);
      } catch (error) {
        results.errors.push(`Erro ao processar ${row.assistido}: ${(error as Error).message}`);
        results.skipped++;
      }
    }

    for (const atr of atribuicoesAfetadas) {
      triggerReorder(atr, "n8n-sheets");
    }

    return NextResponse.json({
      success: true,
      ...results,
    });

  } catch (error) {
    console.error("Sheets webhook error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "Google Sheets Import",
    description: "Importa dados de planilhas Google Sheets via n8n",
    expectedFormat: {
      rows: [
        {
          assistido: "Nome do Assistido",
          numeroProcesso: "0001234-56.2025.8.05.0039",
          ato: "Resposta à Acusação",
          prazo: "2025-01-20",
          area: "JURI",
          status: "5_TRIAGEM",
          reuPreso: true,
        },
      ],
    },
  });
}
