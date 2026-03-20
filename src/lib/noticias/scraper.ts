import { db } from "@/lib/db";
import { noticiasFontes, noticiasJuridicas } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { cleanHtml, gerarResumo, extractPlainText } from "./html-cleaner";
import {
  classificarNoticia,
  extrairTags,
  isIrrelevante,
  isRelevante,
  temContextoJuridico,
} from "@/config/noticias";
import { scrapeGoogleNews } from "./google-news-scraper";

type ScrapedItem = {
  titulo: string;
  url: string;
  autor?: string;
  publicadoEm?: Date;
  conteudoHtml?: string;
};

// Máximo de dias para aceitar notícias (descarta antigas)
const MAX_DIAS_ATRAS = 7;

// ==========================================
// RSS PARSER (sem dependência externa)
// ==========================================

function parseRssItems(xml: string): ScrapedItem[] {
  const items: ScrapedItem[] = [];
  const itemMatches = xml.match(/<item[\s\S]*?<\/item>/gi) || [];

  for (const itemXml of itemMatches) {
    const titulo = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
      || itemXml.match(/<title>(.*?)<\/title>/)?.[1]
      || "";
    const url = itemXml.match(/<link>(.*?)<\/link>/)?.[1]
      || itemXml.match(/<link[^>]*href="([^"]*)"[^>]*\/>/)?.[1]
      || "";
    const autor = itemXml.match(/<dc:creator><!\[CDATA\[(.*?)\]\]><\/dc:creator>/)?.[1]
      || itemXml.match(/<author>(.*?)<\/author>/)?.[1];
    const pubDate = itemXml.match(/<pubDate>(.*?)<\/pubDate>/)?.[1];
    const contentEncoded = itemXml.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/)?.[1];
    const description = itemXml.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/)?.[1]
      || itemXml.match(/<description>([\s\S]*?)<\/description>/)?.[1];

    if (!titulo || !url) continue;

    items.push({
      titulo: titulo.replace(/<!\[CDATA\[|\]\]>/g, "").trim(),
      url: url.trim(),
      autor: autor?.trim(),
      publicadoEm: pubDate ? new Date(pubDate) : undefined,
      conteudoHtml: contentEncoded || description,
    });
  }
  return items;
}

// ==========================================
// HTML SCRAPER (para Dizer o Direito etc.)
// ==========================================

async function scrapeHtmlPage(url: string, _seletorCss?: string | null): Promise<ScrapedItem[]> {
  const res = await fetch(url, {
    headers: { "User-Agent": "OmbudsBot/1.0 (Defensoria Publica BA; legal research)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  const html = await res.text();

  const items: ScrapedItem[] = [];
  const postPattern = /<h3[^>]*class="[^"]*post-title[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = postPattern.exec(html)) !== null) {
    items.push({
      titulo: match[2].replace(/<[^>]+>/g, "").trim(),
      url: match[1].trim(),
    });
  }

  if (items.length === 0) {
    const linkPattern = /<(?:h2|h3)[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    while ((match = linkPattern.exec(html)) !== null) {
      const titulo = match[2].replace(/<[^>]+>/g, "").trim();
      if (titulo.length > 10) {
        items.push({ titulo, url: match[1].trim() });
      }
    }
  }

  return items.slice(0, 20);
}

// ==========================================
// FETCH CONTEÚDO COMPLETO
// ==========================================

export async function fetchFullContent(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "OmbudsBot/1.0 (Defensoria Publica BA; legal research)" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)
    || html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)
    || html.match(/<div[^>]*class="[^"]*(?:post-body|entry-content|article-content|content-text|materia-content)[^"]*"[^>]*>([\s\S]*?)<\/div>/i);

  const rawContent = articleMatch ? (articleMatch[1] || articleMatch[0]) : html;
  return cleanHtml(rawContent);
}

// ==========================================
// CAMADA 3: CLASSIFICAÇÃO POR IA (opcional)
// ==========================================

async function classificarComIA(titulo: string, resumo: string): Promise<{
  relevante: boolean;
  categoria: "legislativa" | "jurisprudencial" | "artigo";
  motivo: string;
} | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 150,
        messages: [{
          role: "user",
          content: `Você é um filtro de notícias para a Defensoria Pública Criminal da Bahia.
Analise esta notícia e responda em JSON:

Título: ${titulo}
Resumo: ${resumo}

Responda APENAS com JSON válido:
{"relevante": true/false, "categoria": "legislativa"|"jurisprudencial"|"artigo", "motivo": "explicação em 1 frase"}

Considere RELEVANTE se trata de: direito penal, processo penal, execução penal, tribunal do júri, drogas, violência doméstica, ECA, defensoria pública, direitos humanos, segurança pública, sistema prisional, decisões STF/STJ em matéria criminal.

Considere IRRELEVANTE se é: evento/congresso/curso, processo seletivo, notícia administrativa, assunto cível/trabalhista/tributário sem relação com criminal.`,
        }],
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const text = data.content?.[0]?.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

// ==========================================
// PIPELINE PRINCIPAL
// ==========================================

export type ScrapeResult = {
  fonte: string;
  total: number;
  novos: number;
  filtrados: number;
  erros: number;
  erro?: string;
};

export async function scrapeAllFontes(): Promise<ScrapeResult[]> {
  const fontes = await db.select().from(noticiasFontes).where(eq(noticiasFontes.ativo, true));
  const results: ScrapeResult[] = [];
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - MAX_DIAS_ATRAS);

  for (const fonte of fontes) {
    const result: ScrapeResult = { fonte: fonte.nome, total: 0, novos: 0, filtrados: 0, erros: 0 };

    try {
      let items: ScrapedItem[];

      if (fonte.tipo === "rss") {
        const res = await fetch(fonte.urlFeed, {
          headers: { "User-Agent": "OmbudsBot/1.0 (Defensoria Publica BA)" },
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) throw new Error(`RSS HTTP ${res.status}`);
        items = parseRssItems(await res.text());
      } else {
        items = await scrapeHtmlPage(fonte.urlFeed, fonte.seletorCss);
      }

      result.total = items.length;

      for (const item of items) {
        try {
          // FILTRO DE DATA: descartar notícias antigas
          if (item.publicadoEm && item.publicadoEm < cutoffDate) {
            result.filtrados++;
            continue;
          }

          // Checar duplicata por URL
          const existing = await db.select({ id: noticiasJuridicas.id })
            .from(noticiasJuridicas)
            .where(eq(noticiasJuridicas.urlOriginal, item.url))
            .limit(1);

          if (existing.length > 0) continue;

          // Fetch conteúdo completo se não veio no RSS
          let conteudo = item.conteudoHtml || "";
          if (!conteudo || conteudo.length < 200) {
            try {
              conteudo = await fetchFullContent(item.url);
            } catch {
              // Use o que temos
            }
          }

          const plainText = extractPlainText(conteudo);
          const resumo = gerarResumo(conteudo);

          // ======================================
          // FILTRAGEM EM 3 CAMADAS
          // ======================================

          // CAMADA 1: Keywords negativas → descarte imediato
          if (isIrrelevante(item.titulo, resumo)) {
            result.filtrados++;
            continue;
          }

          // CAMADA 2: Keywords positivas → precisa ter ao menos 1 match
          const temRelevancia = isRelevante(item.titulo, plainText);
          // CAMADA 2.5: Contexto jurídico → distingue análise de notícia factual pura
          // Notícia factual ("preso por furto") tem relevância mas SEM contexto → vai para IA
          const temContexto = temContextoJuridico(item.titulo, plainText);
          let autoAprovado = false;

          if (!temRelevancia || !temContexto) {
            // CAMADA 3: IA como tiebreaker para itens ambíguos
            const iaResult = await classificarComIA(item.titulo, resumo);

            if (iaResult && !iaResult.relevante) {
              result.filtrados++;
              continue;
            }

            // Se IA não disponível e sem keywords positivas → descartar
            if (!iaResult) {
              result.filtrados++;
              continue;
            }

            // IA confirmou relevância → auto-aprovar sem triagem manual
            autoAprovado = true;
          }

          // Classificar e salvar
          const categoria = classificarNoticia(item.titulo, plainText);
          const tags = extrairTags(item.titulo, plainText);

          await db.insert(noticiasJuridicas).values({
            titulo: item.titulo,
            conteudo: cleanHtml(conteudo),
            resumo,
            fonte: fonte.nome.toLowerCase().replace(/\s+/g, "-"),
            fonteId: fonte.id,
            urlOriginal: item.url,
            autor: item.autor,
            categoria,
            tags,
            status: autoAprovado ? "aprovado" : "pendente",
            aprovadoEm: autoAprovado ? new Date() : undefined,
            publicadoEm: item.publicadoEm,
          });

          result.novos++;
        } catch {
          result.erros++;
        }
      }

      await db.update(noticiasFontes)
        .set({ ultimoScrapeEm: new Date(), ultimoErro: null })
        .where(eq(noticiasFontes.id, fonte.id));

    } catch (err) {
      result.erro = err instanceof Error ? err.message : String(err);
      await db.update(noticiasFontes)
        .set({ ultimoErro: result.erro, ultimoScrapeEm: new Date() })
        .where(eq(noticiasFontes.id, fonte.id));
    }

    results.push(result);
  }

  // Google News como meta-fonte
  try {
    const googleItems = await scrapeGoogleNews();
    const googleResult: ScrapeResult = { fonte: "Google News", total: googleItems.length, novos: 0, filtrados: 0, erros: 0 };

    for (const item of googleItems) {
      try {
        // Checar duplicata por URL
        const existing = await db.select({ id: noticiasJuridicas.id })
          .from(noticiasJuridicas)
          .where(eq(noticiasJuridicas.urlOriginal, item.url))
          .limit(1);

        if (existing.length > 0) continue;

        // Filtrar por relevância + contexto jurídico (mesmo pipeline)
        if (isIrrelevante(item.titulo, "")) { googleResult.filtrados++; continue; }
        if (!isRelevante(item.titulo, "")) { googleResult.filtrados++; continue; }
        if (!temContextoJuridico(item.titulo, "")) { googleResult.filtrados++; continue; }

        // Classificar
        const categoria = classificarNoticia(item.titulo, "");
        const tags = extrairTags(item.titulo, "");

        await db.insert(noticiasJuridicas).values({
          titulo: item.titulo,
          conteudo: null,
          resumo: null,
          fonte: item.fonte,
          fonteId: null,
          urlOriginal: item.url,
          categoria,
          tags,
          status: "pendente",
          publicadoEm: item.publicadoEm,
        });

        googleResult.novos++;
      } catch {
        googleResult.erros++;
      }
    }

    results.push(googleResult);
  } catch (err) {
    console.error("[scraper] Erro no Google News:", err);
    // Não bloqueia o retorno dos outros resultados
  }

  return results;
}
