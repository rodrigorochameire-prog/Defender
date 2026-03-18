// Queries especializadas em direito penal brasileiro
// Cada query tem limite próprio configurado em QUERY_LIMITS
const GOOGLE_NEWS_QUERIES: { q: string; limit: number }[] = [
  // Jurisprudência geral penal
  { q: '"habeas corpus" OR "STJ decidiu" OR "STF fixou" OR "tese fixada" "processo penal"', limit: 10 },
  // Legislação penal
  { q: '"lei penal" OR "código penal" OR "CPP" "execução penal" OR "reforma penal"', limit: 10 },
  // Defensoria / sistema prisional
  { q: '"defensoria pública" OR "presídio" OR "preso provisório" direito penal', limit: 10 },
  // STJ — câmaras criminais (alta prioridade)
  { q: 'site:stj.jus.br "turma criminal" OR "habeas corpus" OR "tráfico" OR "execução penal" OR "júri"', limit: 15 },
  // STJ informativos penais
  { q: 'STJ "Informativo" "criminal" OR "penal" OR "habeas corpus" OR "execução penal"', limit: 15 },
  // TJBA decisões criminais
  { q: 'site:tjba.jus.br "criminal" OR "penal" OR "habeas corpus" OR "tráfico" OR "homicídio"', limit: 15 },
  // TJBA notícias e jurisprudência (sem site: para pegar portais que repercutem TJBA)
  { q: '"TJBA" OR "Tribunal de Justiça da Bahia" "criminal" OR "penal" OR "decisão"', limit: 12 },
  // Segurança pública / criminalidade — Bahia e nacional
  { q: '"segurança pública" OR "policial" OR "homicídio" OR "tráfico de drogas" Bahia direito', limit: 10 },
  // Operações policiais com repercussão jurídica
  { q: '"operação policial" OR "flagrante" OR "prisão preventiva" OR "mandado de busca" Bahia OR "STJ" OR "STF"', limit: 10 },
];

// Mapa de domínios conhecidos → slug
const DOMAIN_TO_SLUG: Record<string, string> = {
  "migalhas.com.br": "migalhas",
  "conjur.com.br": "conjur",
  "jota.info": "jota",
  "stj.jus.br": "stj-noticias",
  "stf.jus.br": "stf-noticias",
  "tjba.jus.br": "tjba",
  "canalcienciascriminais.com.br": "canal-ciencias-criminais",
  "emporiododireito.com.br": "emporio-do-direito",
  "trf1.jus.br": "trf1",
  "trf5.jus.br": "trf5",
  "defensoria.ba.def.br": "dpeba",
  "ibccrim.org.br": "ibccrim",
  "cnj.jus.br": "cnj",
  "senado.leg.br": "senado-federal",
  "pm.ba.gov.br": "pm-bahia",
  "ssp.ba.gov.br": "ssp-bahia",
};

export type GoogleNewsItem = {
  titulo: string;
  url: string;         // URL REAL (após resolver redirect)
  fonte: string;       // slug derivado do domínio
  publicadoEm?: Date;
  conteudoHtml?: string;
};

async function resolveGoogleNewsUrl(googleUrl: string): Promise<string> {
  try {
    // Tentar HEAD primeiro (mais rápido)
    const res = await fetch(googleUrl, {
      method: "HEAD",
      redirect: "follow",
      headers: { "User-Agent": "OmbudsBot/1.0 (Defensoria Publica BA; legal research)" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.url.includes("news.google.com")) return res.url;

    // Se HEAD não resolveu (alguns servidores bloqueiam HEAD), tentar GET
    const res2 = await fetch(googleUrl, {
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; OmbudsBot/1.0)" },
      signal: AbortSignal.timeout(8000),
    });
    return res2.url;
  } catch {
    return googleUrl; // fallback: manter URL do Google
  }
}

function extractFonteSlug(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return DOMAIN_TO_SLUG[hostname] ?? hostname.split(".")[0];
  } catch {
    return "google-news";
  }
}

export async function scrapeGoogleNews(): Promise<GoogleNewsItem[]> {
  const allItems: GoogleNewsItem[] = [];
  const seenUrls = new Set<string>();

  for (const { q: query, limit } of GOOGLE_NEWS_QUERIES) {
    try {
      const encodedQuery = encodeURIComponent(query);
      const rssUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=pt-BR&gl=BR&ceid=BR:pt`;

      const res = await fetch(rssUrl, {
        headers: { "User-Agent": "OmbudsBot/1.0 (Defensoria Publica BA; legal research)" },
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) continue;

      const xml = await res.text();
      const itemMatches = xml.match(/<item[\s\S]*?<\/item>/gi) || [];

      for (const itemXml of itemMatches.slice(0, limit)) {
        const titulo =
          itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ||
          itemXml.match(/<title>(.*?)<\/title>/)?.[1] ||
          "";
        const googleUrl =
          itemXml.match(/<link>(.*?)<\/link>/)?.[1] ||
          itemXml.match(/<link[^>]*href="([^"]*)"[^>]*\/>/)?.[1] ||
          "";
        const pubDate = itemXml.match(/<pubDate>(.*?)<\/pubDate>/)?.[1];

        if (!titulo || !googleUrl) continue;
        if (seenUrls.has(googleUrl)) continue;
        seenUrls.add(googleUrl);

        // Resolver redirect
        const realUrl = await resolveGoogleNewsUrl(googleUrl);
        if (seenUrls.has(realUrl)) continue;
        seenUrls.add(realUrl);

        const fonte = extractFonteSlug(realUrl);

        allItems.push({
          titulo: titulo
            .replace(/<!\[CDATA\[|\]\]>/g, "")
            .replace(/<[^>]+>/g, "")
            .trim(),
          url: realUrl,
          fonte,
          publicadoEm: pubDate ? new Date(pubDate) : undefined,
        });
      }

      // Rate limit entre queries
      await new Promise((r) => setTimeout(r, 1000));
    } catch (err) {
      console.error(`[google-news] Erro na query "${query}":`, err);
      continue;
    }
  }

  return allItems;
}
