/**
 * POST /api/analyze
 *
 * Enfileira um job de análise IA na tabela analysis_jobs.
 *
 * Fluxo:
 * 1. Recebe processoId + skill opcional
 * 2. Busca dados do processo e assistido no banco
 * 3. Monta prompt com contexto do caso + instrução de gravação via Supabase MCP
 * 4. Insere job na fila (status "pending")
 * 5. Atualiza processos.analysis_status = "queued"
 * 6. Retorna confirmação
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "~/lib/db";
import { processos, assistidos, analysisJobs } from "~/lib/db/schema/core";
import { eq } from "drizzle-orm";

// Instruções por skill
const SKILL_PROMPTS: Record<string, string> = {
  "analise-autos": `Faça uma análise estratégica completa do caso como Defensor Público.
Leia todos os documentos disponíveis. Identifique:
- Teses de defesa aplicáveis
- Nulidades processuais
- Inconsistências nos depoimentos e provas
- Cronologia dos fatos
- Pontos fortes e fracos da defesa
- Recomendações estratégicas prioritárias`,

  "preparar-audiencia": `Prepare um briefing completo para a audiência como Defensor Público.
Elabore:
- Perguntas estratégicas para cada testemunha
- Contradições identificadas nos depoimentos
- Orientação ao assistido (postura, o que esperar)
- Quesitos críticos (se for júri)
- Ordem de oitiva recomendada
- Alertas e pontos de atenção`,

  "gerar-peca": `Elabore a peça processual adequada para o momento processual do caso.
Siga os padrões da DPE-BA:
- Formatação institucional
- Linguagem jurídica precisa e objetiva
- Fundamentação legal e jurisprudencial atualizada
- Pedidos claros e objetivos
- Tom respeitoso ao juízo, mas assertivo na defesa`,

  "analise-juri": `Faça análise estratégica completa para o Tribunal do Júri como Defensor Público.
Elabore dossiê com:
- Análise dos quesitos esperados
- Matriz de guerra (pontos fortes vs fracos da defesa)
- Perspectiva plenária (como apresentar ao júri popular)
- Contradições e fragilidades da acusação
- Testemunhas: perguntas e estratégia de oitiva
- Argumentos de última palavra
- Indicadores de risco e probabilidade`,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { processoId, skill = "analise-autos" } = body;

    if (!processoId) {
      return NextResponse.json({ error: "processoId obrigatório" }, { status: 400 });
    }

    // Buscar dados do processo
    const proc = await db
      .select({
        id: processos.id,
        numeroAutos: processos.numeroAutos,
        atribuicao: processos.atribuicao,
        vara: processos.vara,
        comarca: processos.comarca,
        classeProcessual: processos.classeProcessual,
        assistidoId: processos.assistidoId,
      })
      .from(processos)
      .where(eq(processos.id, processoId))
      .limit(1);

    if (!proc.length) {
      return NextResponse.json({ error: "Processo não encontrado" }, { status: 404 });
    }

    const p = proc[0]!;

    // Buscar nome do assistido
    const assist = await db
      .select({ nome: assistidos.nome })
      .from(assistidos)
      .where(eq(assistidos.id, p.assistidoId))
      .limit(1);

    const assistidoNome = assist[0]?.nome ?? "Assistido";

    const atribuicaoLabel: Record<string, string> = {
      JURI_CAMACARI: "Tribunal do Júri",
      VVD_CAMACARI: "Violência Doméstica",
      EXECUCAO_PENAL: "Execução Penal",
      SUBSTITUICAO: "Substituição Criminal",
    };

    // Montar prompt com contexto do caso
    const skillInstruction = SKILL_PROMPTS[skill] ?? SKILL_PROMPTS["analise-autos"]!;

    const prompt = `${skillInstruction}

Contexto do caso:
- Assistido: ${assistidoNome}
- Processo: ${p.numeroAutos}
- Classe: ${p.classeProcessual ?? "Ação Penal"}
- Atribuição: ${atribuicaoLabel[p.atribuicao] ?? p.atribuicao}
- Vara: ${p.vara ?? "Vara do Júri e Execuções Penais de Camaçari"}
- Comarca: ${p.comarca ?? "Camaçari"}

IMPORTANTE: Ao final da análise, grave o resultado no banco de dados via Supabase MCP:
UPDATE processos SET
  analysis_data = '<JSON com resumo, teses, nulidades, kpis, etc>',
  analysis_status = 'completed',
  analyzed_at = NOW(),
  analysis_version = COALESCE(analysis_version, 0) + 1
WHERE id = ${processoId};`;

    // Inserir job na fila
    await db.insert(analysisJobs).values({
      processoId: p.id,
      skill,
      prompt,
      status: "pending",
    });

    // Atualizar status do processo para "queued"
    await db
      .update(processos)
      .set({ analysisStatus: "queued" })
      .where(eq(processos.id, p.id));

    return NextResponse.json({
      success: true,
      message: `Análise enfileirada para ${assistidoNome} (${p.numeroAutos}). O resultado aparecerá quando o job for processado.`,
      skill,
      processo: p.numeroAutos,
      assistido: assistidoNome,
    });
  } catch (err) {
    console.error("[/api/analyze] Erro:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno" },
      { status: 500 }
    );
  }
}
