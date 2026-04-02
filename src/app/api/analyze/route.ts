/**
 * POST /api/analyze
 *
 * Enfileira um job de análise IA na tabela analysis_jobs.
 *
 * Fluxo:
 * 1. Recebe processoId + skill opcional
 * 2. Busca dados do processo e assistido no banco
 * 3. Carrega Padrão Defender v2 + skill da atribuição + paleta
 * 4. Monta prompt completo com contexto + instruções premium
 * 5. Insere job na fila (status "pending")
 * 6. Atualiza processos.analysis_status = "queued"
 * 7. Retorna confirmação
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { processos, assistidos, analysisJobs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { readFile } from "fs/promises";
import { join } from "path";

// ==========================================
// PADRÃO DEFENDER — CONFIGURAÇÃO POR ATRIBUIÇÃO
// ==========================================

const SKILLS_BASE = join(process.env.HOME ?? "/Users/rodrigorochameire", "Projetos/Defender/.claude/skills-cowork");
const PADRAO_DEFENDER_PATH = join(SKILLS_BASE, "padrao-defender-relatorios.md");

interface AtribuicaoConfig {
  label: string;
  palette: { dark: string; accent: string; bg: string; title: string };
  skillPaths: Record<string, string>; // skill → relative path from SKILLS_BASE
  drivePath: string; // pasta dos processos no Drive
}

const ATRIBUICAO_CONFIG: Record<string, AtribuicaoConfig> = {
  JURI_CAMACARI: {
    label: "Tribunal do Júri",
    palette: { dark: "#1A5C36", accent: "#2D8B57", bg: "#F0FFF4", title: "#064E3B" },
    skillPaths: {
      "analise-autos": "juri/references/analise_estrategica_juri.md",
      "preparar-audiencia": "juri/references/analise_para_juri.md",
      "analise-juri": "juri/references/analise_juri_estruturada.md",
      "preparar-422": "juri/references/analise_preparar_juri_422.md",
    },
    drivePath: "Meu Drive/1 - Defensoria 9ª DP/Processos - Júri",
  },
  VVD_CAMACARI: {
    label: "Violência Doméstica",
    palette: { dark: "#6B4D2B", accent: "#C8A84E", bg: "#FAF8F2", title: "#5C3D1A" },
    skillPaths: {
      "analise-autos": "vvd/references/vvd_analise_para_audiencia.md",
      "preparar-audiencia": "vvd/references/vvd_analise_para_audiencia.md",
      "analise-ra": "vvd/references/vvd_analise_para_ra.md",
      "analise-justificacao": "vvd/references/vvd_analise_audiencia_justificacao.md",
    },
    drivePath: "Meu Drive/1 - Defensoria 9ª DP/Processos - VVD (Criminal)",
  },
  EXECUCAO_PENAL: {
    label: "Execução Penal",
    palette: { dark: "#1E3A8A", accent: "#3B82F6", bg: "#EFF6FF", title: "#1E3A5C" },
    skillPaths: {
      "analise-autos": "execucao-penal/references/analise_varredura_conformidade_ep.md",
      "preparar-audiencia": "execucao-penal/references/analise_varredura_conformidade_ep.md",
      "prescricao": "execucao-penal/references/ep_extincao_prescricao_executoria.md",
      "reconversao": "execucao-penal/references/ep_impugnacao_reconversao_nao_localizado.md",
      "readequacao-anpp": "execucao-penal/references/ep_readequacao_anpp.md",
    },
    drivePath: "Meu Drive/1 - Defensoria 9ª DP/Processos - Execução Penal",
  },
  SUBSTITUICAO: {
    label: "Substituição Criminal",
    palette: { dark: "#334155", accent: "#64748B", bg: "#F8FAFC", title: "#1E293B" },
    skillPaths: {
      "analise-autos": "analise-audiencias/references/analise_audiencia_criminal.md",
      "preparar-audiencia": "analise-audiencias/references/analise_audiencia_criminal.md",
      "analise-trafico": "analise-audiencias/references/analise_audiencia_trafico.md",
    },
    drivePath: "Meu Drive/1 - Defensoria 9ª DP/Processos - Substituição",
  },
};

// Fallback para atribuições não mapeadas
const DEFAULT_CONFIG: AtribuicaoConfig = {
  label: "Criminal",
  palette: { dark: "#334155", accent: "#64748B", bg: "#F8FAFC", title: "#1E293B" },
  skillPaths: {
    "analise-autos": "analise-audiencias/references/analise_audiencia_criminal.md",
  },
  drivePath: "Meu Drive/1 - Defensoria 9ª DP",
};

// ==========================================
// HELPERS
// ==========================================

async function loadFileContent(path: string): Promise<string> {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return "";
  }
}

async function buildPremiumPrompt(
  skill: string,
  atribuicao: string,
  assistidoNome: string,
  processo: { id: number; numeroAutos: string; vara: string | null; comarca: string | null; classeProcessual: string | null },
): Promise<string> {
  const config = ATRIBUICAO_CONFIG[atribuicao] ?? DEFAULT_CONFIG;

  // Carregar Padrão Defender
  const padraoDefender = await loadFileContent(PADRAO_DEFENDER_PATH);

  // Carregar skill específica
  const skillRelPath = config.skillPaths[skill] ?? config.skillPaths["analise-autos"] ?? "";
  const skillContent = skillRelPath ? await loadFileContent(join(SKILLS_BASE, skillRelPath)) : "";

  // Carregar skills transversais
  const linguagem = await loadFileContent(join(SKILLS_BASE, "linguagem-defensiva/SKILL.md"));
  const citacoes = await loadFileContent(join(SKILLS_BASE, "citacoes-seguras/SKILL.md"));

  const homePath = process.env.HOME ?? "/Users/rodrigorochameire";
  const drivePath = join(homePath, config.drivePath);

  return `# INSTRUÇÃO: Gerar Dossiê Estratégico de Defesa — Padrão Defender v2

## CONTEXTO DO CASO
- **Assistido**: ${assistidoNome}
- **Processo**: ${processo.numeroAutos}
- **Classe**: ${processo.classeProcessual ?? "Ação Penal"}
- **Atribuição**: ${config.label}
- **Vara**: ${processo.vara ?? "Camaçari"}
- **Comarca**: ${processo.comarca ?? "Camaçari"}

## PALETA — ${config.label}
| Elemento | Cor |
|---|---|
| Dark headers | ${config.palette.dark} |
| Accent border | ${config.palette.accent} |
| Subtle bg | ${config.palette.bg} |
| Title text | ${config.palette.title} |

## PASTA DO ASSISTIDO
Buscar em: ${drivePath}/${assistidoNome}/
Extrair TODOS os PDFs com pdftotext e ler integralmente.

## PADRÃO DEFENDER v2 (REFERÊNCIA COMPLETA)
${padraoDefender ? padraoDefender.substring(0, 8000) : "Consultar: skills-cowork/padrao-defender-relatorios.md"}

## SKILL ESPECÍFICA — ${skill}
${skillContent ? skillContent.substring(0, 4000) : "Aplicar análise padrão da atribuição."}

## LINGUAGEM DEFENSIVA
${linguagem ? linguagem.substring(0, 1500) : "Usar 'defendido', 'ofendida', modalizadores. Nunca 'réu', 'agressor'."}

## CITAÇÕES SEGURAS
${citacoes ? citacoes.substring(0, 1000) : "Marcar [VERIFICAR PRECEDENTE] quando incerto."}

## OUTPUT OBRIGATÓRIO
1. Gerar .docx com timbre DPE-BA (logo faded + rodapé) — fonte Verdana 11pt
2. Converter para .pdf via LibreOffice
3. Salvar _analise_ia.json na pasta do assistido
4. Gravar resumo no banco via SQL:
   UPDATE processos SET
     analysis_data = '<JSON com kpis, teses, fragilidades, providencias>',
     analysis_status = 'completed',
     analyzed_at = NOW(),
     analysis_version = COALESCE(analysis_version, 0) + 1
   WHERE id = ${processo.id};

## CHECKLIST (verificar antes de entregar)
Dashboard KPIs, índice, contatos, prazos, qualificação, cronologia 10+ eventos,
inventário documentos, fichas depoentes com citações REAIS, tabela comparativa,
fragilidades com severidade, teses ranked ■□, narrativa defensiva, dosimetria,
matriz riscos 2D, roteiro atendimento, protocolo dia, perguntas estratégicas,
orientação ao defendido, requerimentos orais prontos, cenários, providências checklist.`;
}

// ==========================================
// ROUTE HANDLER
// ==========================================

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

    // Montar prompt premium com Padrão Defender
    const prompt = await buildPremiumPrompt(skill, p.atribuicao, assistidoNome, {
      id: p.id,
      numeroAutos: p.numeroAutos,
      vara: p.vara,
      comarca: p.comarca,
      classeProcessual: p.classeProcessual,
    });

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

    const config = ATRIBUICAO_CONFIG[p.atribuicao] ?? DEFAULT_CONFIG;

    return NextResponse.json({
      success: true,
      message: `Análise Padrão Defender enfileirada para ${assistidoNome} (${p.numeroAutos}).`,
      skill,
      atribuicao: config.label,
      palette: config.palette.dark,
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
