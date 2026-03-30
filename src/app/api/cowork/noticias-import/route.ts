/**
 * POST /api/cowork/noticias-import
 *
 * Importa resultado da curadoria offline (Cowork claude -p, custo $0).
 * Recebe o JSON gerado pela skill "noticias" e atualiza o banco.
 *
 * Usado por: scripts/cowork_noticias.sh (etapa 3)
 *            ou manualmente via curl/fetch
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { noticiasJuridicas, factualArtigos } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

interface NoticiasCuradas {
  schema_version: string;
  gerado_em: string;
  total_processadas: number;
  noticias: Array<{
    id: number;
    relevante: boolean;
    categoria?: string;
    motivo?: string;
    tags?: string[];
    resumo?: string;
    resumo_executivo?: string;
    impacto_pratico?: string;
    status_sugerido?: string;
  }>;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      data: NoticiasCuradas;
      mode?: "juridicas" | "factual";
    };

    const { data, mode = "juridicas" } = body;

    if (!data?.noticias?.length) {
      return NextResponse.json({ error: "Nenhuma notícia para importar" }, { status: 400 });
    }

    let updated = 0;
    let errors = 0;
    const details: Array<{ id: number; status: string; error?: string }> = [];

    for (const n of data.noticias) {
      if (!n.id) continue;

      try {
        if (mode === "juridicas") {
          await db.update(noticiasJuridicas)
            .set({
              status: n.status_sugerido || "pendente",
              categoria: n.categoria || "artigo",
              tags: n.tags || [],
              resumo: n.resumo || undefined,
              analiseIa: {
                resumoExecutivo: n.resumo_executivo || "",
                impactoPratico: n.impacto_pratico || "",
                casosAplicaveis: [],
                processadoEm: data.gerado_em || new Date().toISOString(),
                modeloUsado: "cowork-claude-local",
              },
              updatedAt: new Date(),
            })
            .where(eq(noticiasJuridicas.id, n.id));

        } else if (mode === "factual") {
          await db.update(factualArtigos)
            .set({
              resumo: n.resumo || undefined,
              tags: n.tags || [],
              modeloSumarizacao: "cowork-claude-local",
            })
            .where(eq(factualArtigos.id, n.id));
        }

        updated++;
        details.push({ id: n.id, status: n.status_sugerido || "atualizada" });
      } catch (err) {
        errors++;
        details.push({
          id: n.id,
          status: "erro",
          error: err instanceof Error ? err.message : "Erro desconhecido",
        });
      }
    }

    return NextResponse.json({
      success: true,
      updated,
      errors,
      total: data.noticias.length,
      details,
    });

  } catch (err) {
    console.error("[noticias-import] Erro:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno" },
      { status: 500 },
    );
  }
}
