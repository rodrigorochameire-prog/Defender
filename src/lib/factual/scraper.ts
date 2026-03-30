import { db } from "@/lib/db";
import { factualEdicoes, factualArtigos, factualSecoes, FACTUAL_SECOES_DEFAULT } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { cleanHtml, extractPlainText } from "@/lib/noticias/html-cleaner";

// ==========================================
// TYPES
// ==========================================

export type FactualScrapeResult = {
  secao: string;
  total: number;
  novos: number;
  erros: number;
};

type GoogleSearchResult = {
  title: string;
  link: string;
  snippet: string;
  source: string;
};

type ArticleCandidate = {
  titulo: string;
  url: string;
  fonteNome: string;
  resumo: string | null;
  conteudoOriginal: string | null;
  queryOrigem: string;
};

type SectionConfig = {
  nome: string;
  contexto: string;
  queries: string[];
  dateRestrict: string;
  maxArtigos: number;
  ordem: number;
};

// ==========================================
// CONSTANTS
// ==========================================

const MAX_RESULTS_PER_QUERY = 5;
const MAX_ARTICLES_PER_SECTION = 5;
const CONTENT_MAX_CHARS = 8000;
const REQUEST_TIMEOUT = 15000;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

// Known source name mapping (same as Python fetch_news.py)
const KNOWN_SOURCES: Record<string, string> = {
  "g1.globo.com": "G1",
  "globo.com": "G1",
  "uol.com.br": "UOL",
  "noticias.uol.com.br": "UOL",
  "folha.uol.com.br": "Folha de S.Paulo",
  "estadao.com.br": "Estadao",
  "correio24horas.com.br": "Correio 24 Horas",
  "bahianoticias.com.br": "Bahia Noticias",
  "ibahia.com": "iBahia",
  "metro1.com.br": "Metropole",
  "blogdogusmao.com.br": "Blog do Gusmao",
  "bocaonews.com.br": "Bocao News",
  "conjur.com.br": "ConJur",
  "migalhas.com.br": "Migalhas",
  "stf.jus.br": "STF",
  "stj.jus.br": "STJ",
  "tjba.jus.br": "TJBA",
  "cnnbrasil.com.br": "CNN Brasil",
  "r7.com": "R7",
  "terra.com.br": "Terra",
  "bbc.com": "BBC",
  "agenciabrasil.ebc.com.br": "Agencia Brasil",
  "ssp.ba.gov.br": "SSP-BA",
  "ba.gov.br": "Governo da Bahia",
  "gov.br": "Gov.br",
};

// ==========================================
// 1. GOOGLE CUSTOM SEARCH
// ==========================================

async function googleSearch(
  query: string,
  num: number = MAX_RESULTS_PER_QUERY,
  dateRestrict: string = "d3",
): Promise<GoogleSearchResult[]> {
  const apiKey = process.env.GOOGLE_CSE_API_KEY;
  const cx = process.env.GOOGLE_CSE_CX;

  if (!apiKey || !cx) {
    console.log("[factual] Google CSE not configured (missing GOOGLE_CSE_API_KEY or GOOGLE_CSE_CX)");
    return [];
  }

  const params = new URLSearchParams({
    key: apiKey,
    cx,
    q: query,
    num: String(Math.min(num, 10)),
    dateRestrict,
    lr: "lang_pt",
    gl: "br",
  });

  try {
    const res = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });

    if (!res.ok) {
      console.log(`[factual] Google CSE error: HTTP ${res.status} for query "${query}"`);
      return [];
    }

    const data = await res.json();
    const items = data.items || [];

    return items.map((item: { title?: string; link?: string; snippet?: string }) => ({
      title: item.title || "",
      link: item.link || "",
      snippet: item.snippet || "",
      source: getSourceName(item.link || ""),
    }));
  } catch (err) {
    console.log(`[factual] Google CSE fetch error for "${query}":`, err instanceof Error ? err.message : String(err));
    return [];
  }
}

// ==========================================
// 2. CONTENT EXTRACTION
// ==========================================

async function extractPageContent(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      redirect: "follow",
    });

    if (!res.ok) {
      console.log(`[factual] Content fetch error: HTTP ${res.status} for ${url}`);
      return null;
    }

    const html = await res.text();

    // Priority order (same as Python): article > main > role="main" > p tags
    const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    if (articleMatch) {
      const cleaned = cleanHtml(articleMatch[1]);
      const text = extractPlainText(cleaned);
      return text.substring(0, CONTENT_MAX_CHARS) || null;
    }

    const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    if (mainMatch) {
      const cleaned = cleanHtml(mainMatch[1]);
      const text = extractPlainText(cleaned);
      return text.substring(0, CONTENT_MAX_CHARS) || null;
    }

    const roleMainMatch = html.match(/<[^>]*role=["']main["'][^>]*>([\s\S]*?)<\/[^>]+>/i);
    if (roleMainMatch) {
      const cleaned = cleanHtml(roleMainMatch[1]);
      const text = extractPlainText(cleaned);
      return text.substring(0, CONTENT_MAX_CHARS) || null;
    }

    // Fallback: collect all <p> tags
    const pMatches = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];
    if (pMatches.length > 0) {
      const combined = pMatches
        .map((p) => extractPlainText(p))
        .filter((t) => t.length > 30)
        .join("\n\n");
      return combined.substring(0, CONTENT_MAX_CHARS) || null;
    }

    return null;
  } catch (err) {
    console.log(`[factual] Content extraction error for ${url}:`, err instanceof Error ? err.message : String(err));
    return null;
  }
}

// ==========================================
// 3. CLAUDE SUMMARIZATION (DESATIVADA)
// ==========================================
// Sumarização agora é feita offline via Cowork (claude -p)
// que gera JSON importável. Sem chamadas à API Anthropic.

async function summarizeArticle(
  _title: string,
  _content: string,
  _sectionContext: string,
): Promise<string | null> {
  return null;
}

// ==========================================
// 4. DEDUPLICATION
// ==========================================

function deduplicateArticles(articles: ArticleCandidate[]): ArticleCandidate[] {
  const seen: ArticleCandidate[] = [];

  for (const article of articles) {
    const isDuplicate = seen.some((existing) => {
      const overlap = titleSimilarity(existing.titulo, article.titulo);
      return overlap >= 0.6;
    });

    if (!isDuplicate) {
      seen.push(article);
    }
  }

  return seen;
}

function titleSimilarity(a: string, b: string): number {
  const wordsA = new Set(
    a.toLowerCase().replace(/[^\w\sàáâãéêíóôõúç]/gi, "").split(/\s+/).filter((w) => w.length > 2),
  );
  const wordsB = new Set(
    b.toLowerCase().replace(/[^\w\sàáâãéêíóôõúç]/gi, "").split(/\s+/).filter((w) => w.length > 2),
  );

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let overlap = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) overlap++;
  }

  const smaller = Math.min(wordsA.size, wordsB.size);
  return overlap / smaller;
}

// ==========================================
// 5. CLEAN TITLE
// ==========================================

function cleanTitle(title: string): string {
  // Remove site suffixes like " - G1", " | UOL", " — Folha"
  return title
    .replace(/\s*[-|—–]\s*[A-ZÀ-Ú][^\n]{0,30}$/i, "")
    .replace(/\s*\|\s*[A-ZÀ-Ú][^\n]{0,30}$/i, "")
    .trim();
}

// ==========================================
// 6. SOURCE NAME RESOLUTION
// ==========================================

function getSourceName(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");

    // Exact match first
    if (KNOWN_SOURCES[hostname]) return KNOWN_SOURCES[hostname];

    // Partial match (e.g., "economia.uol.com.br" -> "UOL")
    for (const [domain, name] of Object.entries(KNOWN_SOURCES)) {
      if (hostname.endsWith(domain)) return name;
    }

    // Fallback: use domain without TLD
    const parts = hostname.split(".");
    return parts.length >= 2 ? parts[parts.length - 2] : hostname;
  } catch {
    return "Desconhecido";
  }
}

// ==========================================
// 7. FETCH SECTION
// ==========================================

async function fetchSection(
  sectionConfig: SectionConfig,
  edicaoId: number,
): Promise<FactualScrapeResult> {
  const result: FactualScrapeResult = {
    secao: sectionConfig.nome,
    total: 0,
    novos: 0,
    erros: 0,
  };

  console.log(`[factual] Processing section: ${sectionConfig.nome} (${sectionConfig.queries.length} queries)`);

  // Collect all search results across queries
  const allCandidates: ArticleCandidate[] = [];

  for (const query of sectionConfig.queries) {
    try {
      const searchResults = await googleSearch(query, MAX_RESULTS_PER_QUERY, sectionConfig.dateRestrict);
      result.total += searchResults.length;

      for (const sr of searchResults) {
        allCandidates.push({
          titulo: cleanTitle(sr.title),
          url: sr.link,
          fonteNome: sr.source,
          resumo: null,
          conteudoOriginal: null,
          queryOrigem: query,
        });
      }
    } catch (err) {
      console.log(`[factual] Search error for query "${query}":`, err instanceof Error ? err.message : String(err));
      result.erros++;
    }
  }

  // Deduplicate
  const unique = deduplicateArticles(allCandidates);
  const toProcess = unique.slice(0, Math.min(sectionConfig.maxArtigos, MAX_ARTICLES_PER_SECTION));

  console.log(`[factual] ${sectionConfig.nome}: ${allCandidates.length} found, ${unique.length} unique, processing ${toProcess.length}`);

  // Check existing URLs to avoid DB duplicates
  const existingUrls = new Set<string>();
  for (const candidate of toProcess) {
    try {
      const existing = await db
        .select({ id: factualArtigos.id })
        .from(factualArtigos)
        .where(eq(factualArtigos.fonteUrl, candidate.url))
        .limit(1);
      if (existing.length > 0) {
        existingUrls.add(candidate.url);
      }
    } catch {
      // Continue on DB check failure
    }
  }

  // Process each article: extract content + summarize + save
  let ordem = 0;
  for (const candidate of toProcess) {
    if (existingUrls.has(candidate.url)) continue;

    try {
      // Extract content
      const content = await extractPageContent(candidate.url);
      candidate.conteudoOriginal = content;

      // Summarize with Claude
      if (content && content.length >= 100) {
        candidate.resumo = await summarizeArticle(
          candidate.titulo,
          content,
          sectionConfig.contexto,
        );
      }

      // Generate content hash for dedup
      const hashSource = `${candidate.titulo}|${candidate.url}`;
      const contentHash = simpleHash(hashSource);

      // Save to DB
      await db.insert(factualArtigos).values({
        edicaoId,
        secao: sectionConfig.nome,
        titulo: candidate.titulo,
        resumo: candidate.resumo,
        conteudoOriginal: candidate.conteudoOriginal,
        fonteNome: candidate.fonteNome,
        fonteUrl: candidate.url,
        queryOrigem: candidate.queryOrigem,
        contentHash,
        modeloSumarizacao: candidate.resumo ? "claude-haiku-4-5-20251001" : null,
        ordem: ordem++,
        destaque: ordem === 1, // First article is highlighted
      });

      result.novos++;
    } catch (err) {
      console.log(`[factual] Article error (${candidate.url}):`, err instanceof Error ? err.message : String(err));
      result.erros++;
    }
  }

  console.log(`[factual] ${sectionConfig.nome} done: ${result.novos} new, ${result.erros} errors`);
  return result;
}

// Simple hash for deduplication
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

// ==========================================
// 8. MAIN PIPELINE
// ==========================================

export async function runFactualPipeline(): Promise<FactualScrapeResult[]> {
  console.log("[factual] Starting pipeline...");

  // 1. Get section configs from DB, fallback to defaults
  let sectionConfigs: SectionConfig[];
  try {
    const dbSections = await db
      .select()
      .from(factualSecoes)
      .where(eq(factualSecoes.ativo, true))
      .orderBy(factualSecoes.ordem);

    if (dbSections.length > 0) {
      sectionConfigs = dbSections.map((s) => ({
        nome: s.nome,
        contexto: s.contexto,
        queries: (s.queries as string[]) || [],
        dateRestrict: s.dateRestrict,
        maxArtigos: s.maxArtigos,
        ordem: s.ordem,
      }));
      console.log(`[factual] Loaded ${sectionConfigs.length} sections from DB`);
    } else {
      sectionConfigs = FACTUAL_SECOES_DEFAULT.map((s) => ({
        nome: s.nome,
        contexto: s.contexto,
        queries: [...s.queries],
        dateRestrict: s.dateRestrict,
        maxArtigos: s.maxArtigos,
        ordem: s.ordem,
      }));
      console.log(`[factual] Using ${sectionConfigs.length} default sections`);
    }
  } catch (err) {
    console.log("[factual] Error loading sections, using defaults:", err instanceof Error ? err.message : String(err));
    sectionConfigs = FACTUAL_SECOES_DEFAULT.map((s) => ({
      nome: s.nome,
      contexto: s.contexto,
      queries: [...s.queries],
      dateRestrict: s.dateRestrict,
      maxArtigos: s.maxArtigos,
      ordem: s.ordem,
    }));
  }

  // 2. Create edition record
  const now = new Date();
  const titulo = `Diario da Bahia`;
  const subtitulo = now.toLocaleDateString("pt-BR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const [edicao] = await db
    .insert(factualEdicoes)
    .values({
      titulo,
      subtitulo,
      dataEdicao: now,
      totalArtigos: 0,
      secoes: sectionConfigs.map((s) => s.nome),
      status: "rascunho",
    })
    .returning({ id: factualEdicoes.id });

  console.log(`[factual] Created edition #${edicao.id}: ${subtitulo}`);

  // 3. Process each section sequentially
  const results: FactualScrapeResult[] = [];
  let totalArtigos = 0;

  for (const config of sectionConfigs) {
    try {
      const sectionResult = await fetchSection(config, edicao.id);
      results.push(sectionResult);
      totalArtigos += sectionResult.novos;
    } catch (err) {
      console.log(`[factual] Section "${config.nome}" failed:`, err instanceof Error ? err.message : String(err));
      results.push({
        secao: config.nome,
        total: 0,
        novos: 0,
        erros: 1,
      });
    }
  }

  // 4. Update edition with total count and publish
  await db
    .update(factualEdicoes)
    .set({
      totalArtigos,
      status: totalArtigos > 0 ? "publicado" : "rascunho",
      publicadoEm: totalArtigos > 0 ? now : undefined,
      updatedAt: now,
    })
    .where(eq(factualEdicoes.id, edicao.id));

  console.log(`[factual] Pipeline complete: ${totalArtigos} total articles across ${results.length} sections`);
  return results;
}

// ==========================================
// 9. GET LATEST EDITION
// ==========================================

export async function getLatestEdicao() {
  const [edicao] = await db
    .select()
    .from(factualEdicoes)
    .where(eq(factualEdicoes.status, "publicado"))
    .orderBy(desc(factualEdicoes.dataEdicao))
    .limit(1);

  if (!edicao) return null;

  const artigos = await db
    .select()
    .from(factualArtigos)
    .where(eq(factualArtigos.edicaoId, edicao.id))
    .orderBy(factualArtigos.secao, factualArtigos.ordem);

  return { ...edicao, artigos };
}
