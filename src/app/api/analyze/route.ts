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
     analysis_data = '<JSON estruturado conforme schema abaixo>',
     analysis_status = 'completed',
     analyzed_at = NOW(),
     analysis_version = COALESCE(analysis_version, 0) + 1
   WHERE id = ${processo.id};

## SCHEMA JSON OBRIGATÓRIO PARA analysis_data

O JSON gravado em analysis_data DEVE usar EXATAMENTE estes nomes de campo (camelCase).
A interface OMBUDS lê esses campos diretamente — nomes errados = dados invisíveis.

### TIER 1 — SEMPRE POPULAR (obrigatório para todas as atribuições)

\`\`\`json
{
  "resumo": "Síntese executiva do caso em 3-5 parágrafos",
  "crimePrincipal": "Ex: Homicídio qualificado (art. 121, §2º, I e IV, CP)",
  "estrategia": "Estratégia geral de defesa em 2-3 parágrafos",
  "achadosChave": ["achado 1", "achado 2", "..."],
  "recomendacoes": ["recomendação 1", "recomendação 2", "..."],
  "inconsistencias": ["inconsistência 1", "inconsistência 2", "..."],

  "painelControle": {
    "crimePrincipal": "tipo penal principal",
    "totalPessoas": 0,
    "totalAcusacoes": 0,
    "totalDocumentosAnalisados": 0,
    "totalEventos": 0,
    "totalNulidades": 0,
    "totalRelacoes": 0,
    "faseProcessual": "instrução|pronúncia|plenário|recurso|execução",
    "reuPreso": false,
    "proximaAudiencia": "2026-05-15 ou null"
  },

  "alertasOperacionais": [
    { "tipo": "PRAZO|PRISAO|PRESCRICAO|AUDIENCIA", "mensagem": "...", "severidade": "critica|alta|media|baixa", "prazo": "2026-05-01 ou null" }
  ],

  "checklistTatico": ["item 1 a fazer", "item 2 a fazer", "..."],

  "radarLiberdade": {
    "absolvicao": 0.0,
    "desclassificacao": 0.0,
    "atenuantes": 0.0,
    "nulidade": 0.0,
    "prescricao": 0.0
  },

  "saneamento": {
    "pendencias": [{ "item": "...", "status": "pendente|resolvido", "prazo": "..." }],
    "observacoes": "..."
  }
}
\`\`\`

### TIER 2 — PARTES, DEPOIMENTOS, CRONOLOGIA (obrigatório)

\`\`\`json
{
  "pessoas": [
    { "nome": "...", "papel": "defendido|vitima|testemunha_acusacao|testemunha_defesa|perito|delegado|promotor|juiz", "descricao": "...", "qualificacao": "...", "contato": "...", "observacoes": "..." }
  ],

  "depoimentos": [
    { "nome": "...", "papel": "...", "resumo": "resumo detalhado", "citacoes": ["trecho literal entre aspas"], "contradicoes": ["contradição com outro depoimento"], "credibilidade": "alta|media|baixa", "observacoes": "..." }
  ],

  "cronologia": [
    { "data": "2025-01-15", "evento": "...", "fonte": "documento ou depoimento", "relevancia": "alta|media|baixa", "observacoes": "..." }
  ],

  "locais": [
    { "nome": "...", "descricao": "...", "relevancia": "..." }
  ]
}
\`\`\`

### TIER 3 — TESES & ESTRATÉGIA (obrigatório)

\`\`\`json
{
  "tesesCompleto": {
    "principal": { "nome": "...", "fundamentacao": "...", "viabilidade": 8, "observacoes": "..." },
    "subsidiarias": [
      { "nome": "...", "fundamentacao": "...", "viabilidade": 6, "observacoes": "..." }
    ],
    "desclassificacao": { "para": "tipo penal menos grave", "fundamentacao": "...", "viabilidade": 5 }
  },

  "nulidades": [
    { "tipo": "absoluta|relativa", "descricao": "...", "severidade": "alta|media|baixa", "fundamentacao": "art. 564, CPP...", "documentoRef": "fls. 45" }
  ],

  "matrizGuerra": [
    { "argumento": "...", "tipo": "acusacao|defesa", "forca": 7, "resposta": "contra-argumento", "fonte": "..." }
  ],

  "orientacaoAssistido": "Texto completo de orientação ao defendido para atendimento/audiência",

  "perguntasEstrategicas": [
    { "testemunha": "Nome", "papel": "acusacao|defesa", "perguntas": ["pergunta 1", "pergunta 2"], "objetivo": "..." }
  ]
}
\`\`\`

### TIER 4 — PROVAS & DOCUMENTOS (obrigatório)

\`\`\`json
{
  "inventarioProvas": [
    { "tipo": "documental|testemunhal|pericial|material", "descricao": "...", "origem": "...", "favoravel": true, "observacoes": "...", "documentoRef": "fls. 123" }
  ],

  "mapaDocumental": [
    { "documento": "nome do documento", "tipo": "...", "paginas": "fls. 1-15", "conteudoRelevante": "...", "observacoes": "..." }
  ],

  "laudos": [
    { "tipo": "necropsia|toxicológico|balístico|...", "perito": "nome", "conclusao": "...", "pontosFracos": ["..."], "observacoes": "..." }
  ]
}
\`\`\`

### TIER 5 — IMPUTAÇÕES & DOSIMETRIA (obrigatório)

\`\`\`json
{
  "imputacoes": [
    { "crime": "...", "artigo": "art. 121, §2º, I, CP", "qualificadoras": ["..."], "agravantes": ["..."], "atenuantes": ["..."], "penaMinima": "12 anos", "penaMaxima": "30 anos", "observacoes": "..." }
  ],

  "acusacaoRadiografia": {
    "orgaoAcusador": "MP-BA",
    "tese": "tese acusatória resumida",
    "provasIndicadas": ["..."],
    "fragilidades": ["..."],
    "observacoes": "..."
  },

  "calculoPena": {
    "penaBase": "...",
    "circunstanciasJudiciais": [{ "circunstancia": "...", "valoracao": "..." }],
    "agravantesAtenuantes": [{ "tipo": "agravante|atenuante", "descricao": "...", "efeito": "..." }],
    "causasAumentoDiminuicao": [{ "tipo": "aumento|diminuição", "descricao": "...", "fracao": "1/3" }],
    "penaProvisoria": "...",
    "penaDefinitiva": "...",
    "regime": "fechado|semiaberto|aberto",
    "substituicao": "...",
    "observacoes": "..."
  },

  "cadeiaCustodia": {
    "itens": [{ "evidencia": "...", "etapas": [{ "fase": "...", "responsavel": "...", "data": "...", "local": "..." }], "irregularidades": ["..."], "impacto": "..." }],
    "observacoes": "..."
  },

  "licitudeProva": {
    "provasIlicitas": [{ "prova": "...", "motivo": "...", "fundamentacao": "...", "provasDerivadas": ["..."] }],
    "observacoes": "..."
  }
}
\`\`\`

### TIER 6 — CONDICIONAL POR ATRIBUIÇÃO

#### Se atribuição = Tribunal do Júri → popular OBRIGATORIAMENTE:

\`\`\`json
{
  "perspectivaPlenaria": "Texto sobre perspectiva do caso em plenário",

  "ritoBifasico": {
    "fase": "sumário|plenário",
    "pronuncDesclassific": "pronúncia|desclassificação|impronúncia|absolvição sumária",
    "materialidade": { "status": "comprovada|contestada|insuficiente", "observacoes": "..." },
    "autoria": { "status": "comprovada|contestada|insuficiente", "observacoes": "..." },
    "qualificadoras": [{ "nome": "...", "fundamentacao": "...", "estrategia": "..." }],
    "observacoes": "..."
  },

  "preparacaoPlenario": {
    "tesesPlenario": [{ "tese": "...", "argumento": "...", "prova": "..." }],
    "quesitos": [{ "quesito": "...", "resposta_esperada": "sim|não", "estrategia": "..." }],
    "jurados": { "perfil": "...", "orientacoes": "..." },
    "retorica": "linha retórica para sustentação oral",
    "observacoes": "..."
  }
}
\`\`\`

#### Se atribuição = Violência Doméstica → popular OBRIGATORIAMENTE:

\`\`\`json
{
  "mpu": {
    "medidasVigentes": [{ "medida": "...", "status": "vigente|revogada|descumprida", "dataConcessao": "..." }],
    "descumprimentos": [{ "descricao": "...", "data": "...", "providencia": "..." }],
    "observacoes": "..."
  },

  "contextoRelacional": {
    "tipoRelacao": "cônjuge|companheiro|ex-companheiro|namoro|familiar",
    "tempoRelacao": "...",
    "filhos": 0,
    "dependenciaEconomica": false,
    "cicloViolencia": "fase atual do ciclo",
    "historico": "...",
    "observacoes": "..."
  }
}
\`\`\`

#### Se atribuição = Execução Penal → popular OBRIGATORIAMENTE:

\`\`\`json
{
  "cronogramaBeneficios": {
    "beneficios": [{ "nome": "progressão|livramento|saída temporária|remição", "dataPrevisao": "2026-06-01", "fracao": "2/5", "status": "a requerer|requerido|deferido|indeferido", "observacoes": "..." }],
    "detracao": { "diasDescontados": 0, "fundamentacao": "..." },
    "remicao": { "diasRemidos": 0, "fundamentacao": "..." },
    "observacoes": "..."
  }
}
\`\`\`

### META (sempre incluir)

\`\`\`json
{
  "documentosProcessados": 15,
  "documentosTotal": 15,
  "versaoModelo": "claude-sonnet-4-20250514"
}
\`\`\`

## REGRAS DE GERAÇÃO
1. TODOS os campos dos Tiers 1-5 são OBRIGATÓRIOS — se não houver dado, usar array vazio [] ou null
2. Campos do Tier 6 são obrigatórios APENAS para a atribuição correspondente
3. Use camelCase EXATO conforme acima — a interface não reconhece snake_case no nível raiz
4. Arrays de pessoas, depoimentos e cronologia devem ter o MÁXIMO de entradas possível
5. Citações em depoimentos devem ser trechos LITERAIS dos autos (entre aspas)
6. Viabilidade em teses é de 0 a 10
7. Força em matrizGuerra é de 0 a 10
8. radarLiberdade usa valores de 0.0 a 1.0

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
