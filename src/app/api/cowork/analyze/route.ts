/**
 * POST /api/cowork/analyze
 *
 * Dispara o Claude worker (-p mode) para executar skill de análise.
 * O worker roda localmente, usa a assinatura do defensor (zero custo API).
 *
 * Fluxo:
 * 1. Recebe processoId + assistidoNome + skill
 * 2. Monta prompt com contexto do banco
 * 3. Spawna: claude -p "prompt" no diretório do assistido no Drive
 * 4. Worker executa skill, gera _analise_ia.json no Drive
 * 5. Drive sync importa automaticamente para o banco
 */

import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { db } from "@/lib/db";
import { processos, assistidos } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const execAsync = promisify(exec);

// Skills disponíveis
const SKILL_PROMPTS: Record<string, string> = {
  "analise-autos": `Use a skill analise-audiencias para fazer uma análise estratégica completa do caso.

Leia TODOS os documentos na pasta do Google Drive do assistido. Gere os 3 arquivos obrigatórios:
1. _analise_ia.json (schema completo: pessoas, cronologia, acusacoes, depoimentos com contradições e perguntas sugeridas, laudos, nulidades, teses, matriz_guerra, radar_liberdade, saneamento, locais, _metadata)
2. Relatório em PDF
3. Relatório em Markdown

Salve na pasta do assistido no Drive.`,

  "preparar-audiencia": `Use a skill analise-audiencias para preparar audiência.

Gere briefing com:
- Perguntas estratégicas para cada testemunha
- Contradições identificadas nos depoimentos
- Orientação ao assistido
- Quesitos críticos (se júri)

Salve _analise_ia.json + PDF na pasta do assistido no Drive.`,

  "gerar-peca": `Use a skill dpe-ba-pecas para gerar peça processual.

Gere a peça em .docx com formatação institucional (Garamond, cabeçalho DPE-BA).
Salve na pasta do assistido no Drive.
Depois copie para a pasta Protocolar com nome padronizado.`,

  "analise-juri": `Use a skill juri para análise estratégica de Tribunal do Júri.

Gere dossiê completo:
- Análise de quesitos
- Matriz de guerra (pontos fortes vs fracos)
- Perspectiva plenária
- Slides de defesa

Salve _analise_ia.json + PDF na pasta do assistido no Drive.`,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { processoId, skill = "analise-autos" } = body;

    if (!processoId) {
      return NextResponse.json({ error: "processoId obrigatório" }, { status: 400 });
    }

    // Buscar dados do processo
    const proc = await db.select({
      id: processos.id,
      numeroAutos: processos.numeroAutos,
      atribuicao: processos.atribuicao,
      vara: processos.vara,
      comarca: processos.comarca,
      classeProcessual: processos.classeProcessual,
      assistidoId: processos.assistidoId,
    }).from(processos).where(eq(processos.id, processoId)).limit(1);

    if (!proc.length) {
      return NextResponse.json({ error: "Processo não encontrado" }, { status: 404 });
    }

    const p = proc[0];

    // Buscar assistido
    const assist = await db.select({
      nome: assistidos.nome,
      atribuicaoPrimaria: assistidos.atribuicaoPrimaria,
    }).from(assistidos).where(eq(assistidos.id, p.assistidoId)).limit(1);

    const assistidoNome = assist[0]?.nome ?? "Assistido";
    const atribuicaoLabel: Record<string, string> = {
      JURI_CAMACARI: "Tribunal do Júri",
      VVD_CAMACARI: "Violência Doméstica",
      EXECUCAO_PENAL: "Execução Penal",
      SUBSTITUICAO: "Substituição Criminal",
    };

    // Montar prompt com contexto
    const skillPrompt = SKILL_PROMPTS[skill] ?? SKILL_PROMPTS["analise-autos"];
    const fullPrompt = `${skillPrompt}

Contexto do caso:
- Assistido: ${assistidoNome}
- Processo: ${p.numeroAutos}
- Classe: ${p.classeProcessual ?? "Ação Penal"}
- Atribuição: ${atribuicaoLabel[p.atribuicao] ?? p.atribuicao}
- Vara: ${p.vara ?? "Vara do Júri e Execuções Penais de Camaçari"}
- Comarca: ${p.comarca ?? "Camaçari"}

Pasta no Drive: Processos - ${atribuicaoLabel[p.atribuicao]?.split(" ")[0] ?? "Júri"} / ${assistidoNome}`;

    // Escapar prompt para shell
    const escapedPrompt = fullPrompt.replace(/'/g, "'\\''");

    // Spawna claude worker com skills jurídicas
    // -p = print mode (executa e retorna)
    // --add-dir = permite acesso ao Drive + skills Cowork
    // cwd = diretório do projeto (tem .claude/skills-cowork/ com as 20 skills)
    const driveDir = `${process.env.HOME}/Library/CloudStorage/GoogleDrive-rodrigorochameire@gmail.com`;
    const projectDir = `${process.env.HOME}/Projetos/Defender`;
    const skillsDir = `${projectDir}/.claude/skills-cowork`;

    // Mapear skill do botão → skill Cowork
    const SKILL_MAP: Record<string, string> = {
      "analise-autos": "analise-audiencias",
      "preparar-audiencia": "analise-audiencias",
      "gerar-peca": "dpe-ba-pecas",
      "analise-juri": "juri",
      "feedback-estagiario": "analise-audiencias",
    };

    const coworkSkill = SKILL_MAP[skill] ?? "analise-audiencias";

    // Construir system prompt que inclui a skill
    const systemPromptFile = `${skillsDir}/${coworkSkill}/SKILL.md`;

    const cmd = [
      "claude -p",
      `--system-prompt-file "${systemPromptFile}"`,
      `--add-dir "${driveDir}"`,
      `--add-dir "${skillsDir}"`,
      `--permission-mode auto`,
      `'${escapedPrompt}'`,
    ].join(" ");

    console.log(`[CoworkWorker] Disparando: skill=${coworkSkill} assistido=${assistidoNome} processo=${p.numeroAutos}`);

    // Executar em background (não bloquear a request)
    execAsync(cmd, {
      cwd: projectDir,
      timeout: 600000, // 10 min max
      env: { ...process.env },
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer para outputs grandes
    }).then((result) => {
      console.log(`[CoworkWorker] Concluído (${coworkSkill}): ${result.stdout.substring(0, 300)}`);
    }).catch((err) => {
      console.error(`[CoworkWorker] Erro (${coworkSkill}): ${err.message?.substring(0, 200)}`);
    });

    return NextResponse.json({
      success: true,
      message: `Análise disparada para ${assistidoNome}. O resultado aparecerá automaticamente quando concluir.`,
      skill,
      processo: p.numeroAutos,
      assistido: assistidoNome,
    });

  } catch (err) {
    console.error("[CoworkWorker] Erro:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno" },
      { status: 500 }
    );
  }
}
