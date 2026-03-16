import { db } from "@/lib/db";
import { noticiasFontes, noticiasJuridicas } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { cleanHtml, gerarResumo, extractPlainText } from "./html-cleaner";
import { classificarNoticia, extrairTags } from "@/config/noticias";

type ScrapedItem = {
  titulo: string;
  url: string;
  autor?: string;
  publicadoEm?: Date;
  conteudoHtml?: string;
};

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

async function fetchFullContent(url: string): Promise<string> {
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
// PIPELINE PRINCIPAL
// ==========================================

export type ScrapeResult = {
  fonte: string;
  total: number;
  novos: number;
  erros: number;
  erro?: string;
};

export async function scrapeAllFontes(): Promise<ScrapeResult[]> {
  const fontes = await db.select().from(noticiasFontes).where(eq(noticiasFontes.ativo, true));
  const results: ScrapeResult[] = [];

  for (const fonte of fontes) {
    const result: ScrapeResult = { fonte: fonte.nome, total: 0, novos: 0, erros: 0 };

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
          const existing = await db.select({ id: noticiasJuridicas.id })
            .from(noticiasJuridicas)
            .where(eq(noticiasJuridicas.urlOriginal, item.url))
            .limit(1);

          if (existing.length > 0) continue;

          let conteudo = item.conteudoHtml || "";
          if (!conteudo || conteudo.length < 200) {
            try {
              conteudo = await fetchFullContent(item.url);
            } catch {
              // Use o que temos
            }
          }

          const plainText = extractPlainText(conteudo);
          const categoria = classificarNoticia(item.titulo, plainText);
          const tags = extrairTags(item.titulo, plainText);
          const resumo = gerarResumo(conteudo);

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
            status: "pendente",
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

  return results;
}
