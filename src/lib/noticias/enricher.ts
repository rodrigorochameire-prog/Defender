import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { noticiasJuridicas } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { extractPlainText } from "./html-cleaner";

const anthropic = new Anthropic();

export type AnaliseIA = {
  resumoExecutivo: string;
  impactoPratico: string;
  ratioDecidendi?: string;
  casosAplicaveis: string[];
  categoriaIA?: "legislativa" | "jurisprudencial" | "artigo";
  processadoEm: string;
  modeloUsado: string;
};

const SYSTEM_PROMPT = `Você é um assistente jurídico especializado da Defensoria Pública do Estado da Bahia (DPE-BA), 7ª Regional, com foco em direito penal e processual penal.

Sua função é analisar notícias jurídicas e extrair informações práticas para defensores públicos que atuam em:
- Criminal comum (furto, roubo, homicídio, tráfico, estelionato)
- Execução penal (progressão, livramento, indulto, remição)
- Tribunal do Júri
- Violência doméstica (Lei Maria da Penha)
- ECA (atos infracionais)

Responda SEMPRE em JSON válido, sem markdown, sem texto fora do JSON.`;

function buildPrompt(noticia: {
  titulo: string;
  categoria: string;
  conteudo: string | null;
  resumo: string | null;
}): string {
  const texto = noticia.conteudo
    ? extractPlainText(noticia.conteudo).slice(0, 4000)
    : (noticia.resumo ?? "");

  const ratioInstrucao =
    noticia.categoria === "jurisprudencial"
      ? `"ratioDecidendi": "Tese fixada em 1-2 frases, exatamente como citaria numa peça processual",`
      : `"ratioDecidendi": null`;

  return `Analise a notícia jurídica abaixo e responda com JSON neste formato exato:
{
  "resumoExecutivo": "3-4 frases diretas sobre o que aconteceu, sem juridiquês desnecessário",
  "impactoPratico": "O que isso muda na prática para defensores públicos criminais? Seja concreto.",
  ${ratioInstrucao},
  "casosAplicaveis": ["situação concreta 1", "situação concreta 2", "situação concreta 3"],
  "categoriaIA": "jurisprudencial"
}

REGRAS PARA categoriaIA (escolha UMA):
- "jurisprudencial": notícias que RELATAM DECISÕES ou PRECEDENTES de tribunais (STF, STJ, TRF, TJBA etc.) — acórdãos, súmulas, informativos, teses fixadas, julgamentos concretos. O tribunal proferiu ou vai proferir uma decisão específica.
- "legislativa": notícias sobre ALTERAÇÕES LEGISLATIVAS em andamento ou recentes — lei aprovada/sancionada/promulgada, PL ou PEC em tramitação, medida provisória nova, decreto normativo. Deve haver NOVIDADE LEGISLATIVA concreta, não apenas citação de lei existente.
- "artigo": TODO O RESTANTE — análises doutrinais, opiniões de juristas, artigos acadêmicos, comentários sobre tendências, entrevistas, reportagens sobre política criminal, debate de políticas públicas, notícias sem decisão judicial específica e sem novidade legislativa. É a CATEGORIA RESIDUAL.

IMPORTANTE: Se houver dúvida entre "artigo" e outra categoria → escolha "artigo". Só use "jurisprudencial" se houver uma decisão judicial concreta. Só use "legislativa" se houver uma lei/PL/MP nova ou em tramitação.
Categoria atual (pode estar incorreta): ${noticia.categoria}

Título: ${noticia.titulo}
Conteúdo: ${texto}`;
}

/** Enriquece uma notícia com análise IA. Salva no banco. Retorna a análise. */
export async function enriquecerNoticia(noticiaId: number): Promise<AnaliseIA> {
  const [noticia] = await db
    .select()
    .from(noticiasJuridicas)
    .where(eq(noticiasJuridicas.id, noticiaId))
    .limit(1);

  if (!noticia) throw new Error(`Notícia ${noticiaId} não encontrada`);

  // Retornar cache se já processado
  if (noticia.analiseIa) return noticia.analiseIa as AnaliseIA;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildPrompt(noticia) }],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Resposta inesperada da API");

  // Parsear JSON — Claude às vezes inclui markdown code blocks
  const jsonText = content.text.replace(/```json\n?|```\n?/g, "").trim();
  const parsed = JSON.parse(jsonText);

  const CATEGORIAS_VALIDAS = ["legislativa", "jurisprudencial", "artigo"] as const;
  const categoriaIA = CATEGORIAS_VALIDAS.includes(parsed.categoriaIA)
    ? (parsed.categoriaIA as "legislativa" | "jurisprudencial" | "artigo")
    : undefined;

  const analise: AnaliseIA = {
    resumoExecutivo: parsed.resumoExecutivo ?? "",
    impactoPratico: parsed.impactoPratico ?? "",
    ratioDecidendi: parsed.ratioDecidendi ?? undefined,
    casosAplicaveis: parsed.casosAplicaveis ?? [],
    categoriaIA,
    processadoEm: new Date().toISOString(),
    modeloUsado: "claude-sonnet-4-6",
  };

  await db
    .update(noticiasJuridicas)
    .set({ analiseIa: analise, updatedAt: new Date() })
    .where(eq(noticiasJuridicas.id, noticiaId));

  // Corrigir categoria se IA discorda
  if (categoriaIA && categoriaIA !== noticia.categoria) {
    await db
      .update(noticiasJuridicas)
      .set({ categoria: categoriaIA, updatedAt: new Date() })
      .where(eq(noticiasJuridicas.id, noticiaId));
  }

  return analise;
}

/** Processa em batch todas as notícias aprovadas sem análise IA */
export async function enriquecerPendentes(
  limit = 10
): Promise<{ processadas: number; erros: number }> {
  const noticias = await db
    .select({ id: noticiasJuridicas.id })
    .from(noticiasJuridicas)
    .where(
      sql`${noticiasJuridicas.status} = 'aprovado' AND ${noticiasJuridicas.analiseIa} IS NULL`
    )
    .limit(limit);

  let processadas = 0;
  let erros = 0;

  for (const { id } of noticias) {
    try {
      await enriquecerNoticia(id);
      processadas++;
      // Rate limit: 500ms entre chamadas
      await new Promise((r) => setTimeout(r, 500));
    } catch {
      erros++;
    }
  }

  return { processadas, erros };
}
