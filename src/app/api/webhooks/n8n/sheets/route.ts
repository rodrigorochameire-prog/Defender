import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { demandas, processos, assistidos } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

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
 *       "status": "5_FILA",
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
      imported: 0,
      skipped: 0,
      errors: [] as string[],
    };

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

        // Verificar se a demanda já existe
        const existingDemanda = await db.query.demandas.findFirst({
          where: and(
            eq(demandas.processoId, processo.id),
            eq(demandas.ato, row.ato)
          ),
        });

        if (existingDemanda) {
          results.skipped++;
          continue;
        }

        // Criar demanda
        await db.insert(demandas).values({
          processoId: processo.id,
          assistidoId: assistido.id,
          ato: row.ato,
          prazo: row.prazo || null,
          status: (row.status as "5_FILA" | "2_ATENDER" | "4_MONITORAR" | "7_PROTOCOLADO") || "5_FILA",
          reuPreso: Boolean(row.reuPreso),
          providencias: row.providencias || null,
        });

        results.imported++;

      } catch (error) {
        results.errors.push(`Erro ao processar ${row.assistido}: ${(error as Error).message}`);
        results.skipped++;
      }
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
          status: "5_FILA",
          reuPreso: true,
        },
      ],
    },
  });
}
