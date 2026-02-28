import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assistidos, processos } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { assistidoId, processoId } = body as {
      assistidoId?: number;
      processoId?: number;
    };

    if (!assistidoId && !processoId) {
      return NextResponse.json(
        { error: "assistidoId ou processoId obrigatório" },
        { status: 400 }
      );
    }

    // Dynamic imports (server-only modules)
    const { listFilesInFolder, downloadFileContent, isGoogleDriveConfigured } =
      await import("@/lib/services/google-drive");

    if (!isGoogleDriveConfigured()) {
      return NextResponse.json(
        { error: "Google Drive não configurado" },
        { status: 503 }
      );
    }

    const {
      analyzeMultipleDocuments,
      extractFromPdf,
      isPdfExtractionConfigured,
    } = await import("@/lib/ai/pdf-extraction");

    if (!isPdfExtractionConfigured()) {
      return NextResponse.json(
        { error: "Extração de PDF não configurada. Verifique a API key do Gemini." },
        { status: 503 }
      );
    }

    // --- Caso 1: Análise multi-documento do assistido ---
    if (assistidoId) {
      const [assistido] = await db
        .select({
          id: assistidos.id,
          nome: assistidos.nome,
          cpf: assistidos.cpf,
          driveFolderId: assistidos.driveFolderId,
        })
        .from(assistidos)
        .where(eq(assistidos.id, assistidoId))
        .limit(1);

      if (!assistido) {
        return NextResponse.json({ error: "Assistido não encontrado" }, { status: 404 });
      }

      if (!assistido.driveFolderId) {
        return NextResponse.json(
          { error: "Assistido não possui pasta no Google Drive" },
          { status: 400 }
        );
      }

      // List and filter PDFs
      const files = await listFilesInFolder(assistido.driveFolderId);
      const pdfFiles = (files || []).filter(
        (f: any) => f.mimeType === "application/pdf" || f.name?.endsWith(".pdf")
      );

      if (pdfFiles.length === 0) {
        return NextResponse.json(
          { error: "Nenhum PDF encontrado na pasta do assistido" },
          { status: 404 }
        );
      }

      // Download up to 10 PDFs
      const documents: Array<{ name: string; base64: string; mimeType: string }> = [];
      const limit = Math.min(pdfFiles.length, 10);

      for (let i = 0; i < limit; i++) {
        try {
          const content = await downloadFileContent(pdfFiles[i].id);
          if (content) {
            const base64 = Buffer.from(content).toString("base64");
            documents.push({
              name: pdfFiles[i].name || `documento_${i + 1}.pdf`,
              base64,
              mimeType: "application/pdf",
            });
          }
        } catch (error) {
          console.error(`[AI] Erro ao baixar ${pdfFiles[i].name}:`, error);
        }
      }

      if (documents.length === 0) {
        return NextResponse.json(
          { error: "Não foi possível baixar nenhum documento" },
          { status: 500 }
        );
      }

      const result = await analyzeMultipleDocuments(documents);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "Erro na análise multi-documento" },
          { status: 500 }
        );
      }

      // Update CPF if extracted and assistido has none
      if (result.dadosConsolidados?.cpf && !assistido.cpf) {
        await db
          .update(assistidos)
          .set({ cpf: result.dadosConsolidados.cpf, updatedAt: new Date() })
          .where(eq(assistidos.id, assistidoId));
      }

      return NextResponse.json({
        summary: result.resumoGeral || "Análise concluída.",
        documentosAnalisados: result.documentosAnalisados,
        dadosConsolidados: result.dadosConsolidados,
        timelineUnificada: result.timelineUnificada,
        alertas: result.alertas,
      });
    }

    // --- Caso 2: Análise de processo individual ---
    if (processoId) {
      const [processo] = await db
        .select({
          id: processos.id,
          numero: processos.numero,
          driveFolderId: processos.driveFolderId,
        })
        .from(processos)
        .where(eq(processos.id, processoId))
        .limit(1);

      if (!processo) {
        return NextResponse.json({ error: "Processo não encontrado" }, { status: 404 });
      }

      if (!processo.driveFolderId) {
        return NextResponse.json(
          { error: "Processo não possui pasta no Google Drive" },
          { status: 400 }
        );
      }

      // List PDFs in processo folder
      const files = await listFilesInFolder(processo.driveFolderId);
      const pdfFiles = (files || []).filter(
        (f: any) => f.mimeType === "application/pdf" || f.name?.endsWith(".pdf")
      );

      if (pdfFiles.length === 0) {
        return NextResponse.json(
          { error: "Nenhum PDF encontrado na pasta do processo" },
          { status: 404 }
        );
      }

      // For a single processo, extract from the first PDF with deep analysis
      try {
        const content = await downloadFileContent(pdfFiles[0].id);
        if (!content) {
          return NextResponse.json(
            { error: "Não foi possível baixar o PDF" },
            { status: 500 }
          );
        }

        const base64 = Buffer.from(content).toString("base64");
        const result = await extractFromPdf(base64, { deep: true });

        if (!result.success) {
          return NextResponse.json(
            { error: result.error || "Erro na extração" },
            { status: 500 }
          );
        }

        const summaryParts: string[] = [];
        if (result.analise?.resumoFatos) {
          summaryParts.push(result.analise.resumoFatos);
        }
        if (result.analise?.pontosAtencao?.length) {
          summaryParts.push(
            `Pontos de atenção: ${result.analise.pontosAtencao.join("; ")}`
          );
        }
        if (summaryParts.length === 0 && result.processo?.tipoPenal) {
          summaryParts.push(`Tipo: ${result.processo.tipoPenal}`);
        }

        return NextResponse.json({
          summary: summaryParts.join("\n\n") || "Análise concluída.",
          processo: result.processo,
          assistido: result.assistido,
          analise: result.analise,
          confianca: result.confianca,
        });
      } catch (error) {
        console.error("[AI] Erro na análise do processo:", error);
        return NextResponse.json(
          { error: "Erro ao analisar o processo" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ error: "Parâmetro inválido" }, { status: 400 });
  } catch (error) {
    console.error("[AI] Erro na rota analyze-folder:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno" },
      { status: 500 }
    );
  }
}
