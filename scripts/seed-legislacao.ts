#!/usr/bin/env npx tsx
/**
 * Script para buscar e parsear legislação do planalto.gov.br
 * Gera arquivos TypeScript em src/config/legislacao/data/
 *
 * Uso: npx tsx scripts/seed-legislacao.ts [lei-id]
 * Ex:  npx tsx scripts/seed-legislacao.ts prisao-temporaria
 *      npx tsx scripts/seed-legislacao.ts --all
 */

import * as cheerio from "cheerio";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

// ==========================================
// CONFIGURAÇÃO DAS LEIS
// ==========================================

const LEIS: Record<string, { url: string; encoding?: string; abreviado: string }> = {
  "codigo-penal": {
    url: "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
    abreviado: "CP",
  },
  "cpp": {
    url: "https://www.planalto.gov.br/ccivil_03/decreto-lei/del3689compilado.htm",
    abreviado: "CPP",
  },
  "lep": {
    url: "https://www.planalto.gov.br/ccivil_03/leis/l7210compilado.htm",
    abreviado: "LEP",
  },
  "maria-da-penha": {
    url: "https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11340.htm",
    abreviado: "LMP",
  },
  "drogas": {
    url: "https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11343.htm",
    abreviado: "LD",
  },
  "eca": {
    url: "https://www.planalto.gov.br/ccivil_03/leis/l8069compilado.htm",
    abreviado: "ECA",
  },
  "abuso-autoridade": {
    url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2019/lei/L13869.htm",
    abreviado: "LAA",
  },
  "cf88-titulo2": {
    url: "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm",
    abreviado: "CF",
  },
  "contravencoes": {
    url: "https://www.planalto.gov.br/ccivil_03/decreto-lei/del3688.htm",
    abreviado: "LCP",
  },
  "desarmamento": {
    url: "https://www.planalto.gov.br/ccivil_03/leis/2003/l10.826.htm",
    abreviado: "ED",
  },
  "testemunhas-protegidas": {
    url: "https://www.planalto.gov.br/ccivil_03/leis/l9807.htm",
    abreviado: "LPT",
  },
  "prisao-temporaria": {
    url: "https://www.planalto.gov.br/ccivil_03/leis/l7960.htm",
    abreviado: "LPTe",
  },
  "mariana-ferrer": {
    url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/L14245.htm",
    abreviado: "LMF",
  },
  "lc80": {
    url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/Lcp80.htm",
    abreviado: "LC80",
  },
  "lce26-bahia": {
    url: "https://leisestaduais.com.br/ba/lei-complementar-n-26-2006-bahia-dispoe-sobre-a-lei-organica-da-defensoria-publica-do-estado-da-bahia",
    abreviado: "LCE26",
  },
};

// ==========================================
// FETCHER
// ==========================================

async function fetchHtml(url: string): Promise<string> {
  // Use curl because planalto.gov.br uses various encodings and may block Node fetch
  const tmpFile = `/tmp/legislacao-${Date.now()}.html`;
  try {
    execSync(
      `curl -s -L --max-time 60 --connect-timeout 15 -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" -o "${tmpFile}" "${url}"`,
      { stdio: "pipe" }
    );
    const raw = fs.readFileSync(tmpFile);

    // Detect UTF-16 BOM (FF FE or FE FF) — some planalto pages use UTF-16LE
    if ((raw[0] === 0xff && raw[1] === 0xfe) || (raw[0] === 0xfe && raw[1] === 0xff)) {
      const encoding = raw[0] === 0xff ? "utf16le" : "utf16le"; // Both cases handled
      return raw.toString(encoding);
    }

    // Detect null bytes (UTF-16 without BOM)
    if (raw.length > 10 && raw[1] === 0x00 && raw[3] === 0x00) {
      return raw.toString("utf16le");
    }

    // Try to detect encoding from meta tag
    const rawStr = raw.toString("latin1");
    if (rawStr.includes("charset=UTF-8") || rawStr.includes("charset=utf-8")) {
      return raw.toString("utf-8");
    }

    // Default to latin1 for older planalto pages
    return Buffer.from(raw).toString("latin1");
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}

// ==========================================
// PARSER
// ==========================================

interface ParsedArtigo {
  numero: string;
  rubrica?: string;
  caput: string;
  paragrafos: { numero: string; texto: string; alineas: { numero: string; texto: string }[] }[];
  incisos: { numero: string; texto: string; alineas: { numero: string; texto: string }[] }[];
  historico: { redacaoDadaPor: string | null; texto: string }[];
}

interface ParsedEstrutura {
  tipo: string;
  nome: string;
  artigos: ParsedArtigo[];
  filhos: ParsedEstrutura[];
}

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function extractModificationNote(text: string): { cleanText: string; note: string | null } {
  // Patterns: (Redação dada pela Lei nº X), (Incluído pela Lei nº X), (Revogado pela Lei nº X)
  const patterns = [
    /\(Reda[çc][ãa]o dada pel[ao] .+?\)/gi,
    /\(Inclu[ií]d[oa] pel[ao] .+?\)/gi,
    /\(Revogad[oa] pel[ao] .+?\)/gi,
    /\(Vide .+?\)/gi,
    /\(Vig[êe]ncia\)/gi,
  ];

  let note: string | null = null;
  let clean = text;

  for (const pattern of patterns) {
    const match = clean.match(pattern);
    if (match) {
      note = match[0].replace(/[()]/g, "");
      clean = clean.replace(pattern, "").trim();
    }
  }

  return { cleanText: clean, note };
}

function parsePlanaltoHtml(html: string, leiId: string, abreviado: string): {
  artigos: ParsedArtigo[];
  estrutura: ParsedEstrutura[];
} {
  const $ = cheerio.load(html, { decodeEntities: false });

  const artigos: ParsedArtigo[] = [];
  let currentArtigo: ParsedArtigo | null = null;
  let currentContext: "caput" | "inciso" | "paragrafo" | "alinea" = "caput";
  let currentIncisoIdx = -1;
  let currentParagrafoIdx = -1;

  // Collect all text paragraphs
  const paragraphs: string[] = [];
  $("p, blockquote").each((_, el) => {
    const text = cleanText($(el).text());
    if (text.length > 0) {
      paragraphs.push(text);
    }
  });

  // Parse structure headers and articles from text
  const estrutura: ParsedEstrutura[] = [];
  const headerStack: ParsedEstrutura[] = [];

  for (const text of paragraphs) {
    // Skip noise
    if (!text || text.length < 2) continue;
    if (text.startsWith("Presidência da República") || text.startsWith("Casa Civil") ||
        text.startsWith("Subchefia") || text.startsWith("O PRESIDENTE") ||
        text.startsWith("O CONGRESSO") || text.startsWith("Faço saber") ||
        text.includes("Brasília,") || text.includes("º da Independência")) continue;

    // Detect structural headers
    const headerPatterns: [RegExp, string][] = [
      [/^PARTE\s+(GERAL|ESPECIAL)/i, "parte"],
      [/^LIVRO\s+[IVX]+/i, "livro"],
      [/^T[ÍI]TULO\s+[IVX]+/i, "titulo"],
      [/^CAP[ÍI]TULO\s+[IVX]+/i, "capitulo"],
      [/^Se[çc][ãa]o\s+[IVX]+/i, "secao"],
      [/^Subse[çc][ãa]o\s+[IVX]+/i, "subsecao"],
    ];

    let isHeader = false;
    for (const [pattern, tipo] of headerPatterns) {
      if (pattern.test(text)) {
        const node: ParsedEstrutura = { tipo, nome: text, artigos: [], filhos: [] };

        // Pop stack until we find a parent of higher level
        const levelOrder = ["parte", "livro", "titulo", "capitulo", "secao", "subsecao"];
        const currentLevel = levelOrder.indexOf(tipo);
        while (headerStack.length > 0 && levelOrder.indexOf(headerStack[headerStack.length - 1].tipo) >= currentLevel) {
          headerStack.pop();
        }

        if (headerStack.length > 0) {
          headerStack[headerStack.length - 1].filhos.push(node);
        } else {
          estrutura.push(node);
        }
        headerStack.push(node);
        isHeader = true;
        break;
      }
    }
    if (isHeader) continue;

    // Detect article start
    const artMatch = text.match(/^Art\.\s*(\d+[A-Z]?[\-\w]*)[°º.]?\s*[-–.]?\s*(.*)/i);
    if (artMatch) {
      // Save previous article
      if (currentArtigo) {
        artigos.push(currentArtigo);
        if (headerStack.length > 0) {
          headerStack[headerStack.length - 1].artigos.push(currentArtigo);
        }
      }

      const numero = artMatch[1];
      const { cleanText: caputText, note } = extractModificationNote(artMatch[2] || "");

      currentArtigo = {
        numero,
        caput: caputText,
        paragrafos: [],
        incisos: [],
        historico: note ? [{ redacaoDadaPor: note, texto: caputText }] : [],
      };
      currentContext = "caput";
      currentIncisoIdx = -1;
      currentParagrafoIdx = -1;
      continue;
    }

    if (!currentArtigo) continue;

    // Detect paragraph (§)
    const parMatch = text.match(/^(?:§\s*(\d+)[°º.]?|Par[áa]grafo\s+[úu]nico\.?)\s*[-–.]?\s*(.*)/i);
    if (parMatch) {
      const numero = parMatch[1] || "único";
      const { cleanText: parText, note } = extractModificationNote(parMatch[2] || "");
      currentArtigo.paragrafos.push({ numero, texto: parText, alineas: [] });
      currentParagrafoIdx = currentArtigo.paragrafos.length - 1;
      currentContext = "paragrafo";
      if (note) currentArtigo.historico.push({ redacaoDadaPor: note, texto: `§${numero}: ${parText}` });
      continue;
    }

    // Detect inciso (Roman numeral)
    const incisoMatch = text.match(/^([IVXLCDM]+)\s*[-–.]\s*(.*)/);
    if (incisoMatch && incisoMatch[1].length <= 8) {
      const { cleanText: incisoText, note } = extractModificationNote(incisoMatch[2] || "");

      if (currentContext === "paragrafo" && currentParagrafoIdx >= 0) {
        // Inciso within a paragraph — treat as alinea of paragraph
        // Actually, incisos can appear within paragraphs too. Let's add as inciso.
      }

      currentArtigo.incisos.push({ numero: incisoMatch[1], texto: incisoText, alineas: [] });
      currentIncisoIdx = currentArtigo.incisos.length - 1;
      currentContext = "inciso";
      if (note) currentArtigo.historico.push({ redacaoDadaPor: note, texto: `Inc. ${incisoMatch[1]}: ${incisoText}` });
      continue;
    }

    // Detect alínea (lowercase letter)
    const alineaMatch = text.match(/^([a-z])\)\s*(.*)/);
    if (alineaMatch) {
      const { cleanText: alineaText } = extractModificationNote(alineaMatch[2] || "");
      const alinea = { numero: alineaMatch[1], texto: alineaText };

      if (currentContext === "inciso" && currentIncisoIdx >= 0) {
        currentArtigo.incisos[currentIncisoIdx].alineas.push(alinea);
      } else if (currentContext === "paragrafo" && currentParagrafoIdx >= 0) {
        currentArtigo.paragrafos[currentParagrafoIdx].alineas.push(alinea);
      }
      continue;
    }

    // Continuation text — append to current context
    if (currentContext === "caput" && currentArtigo.caput) {
      // Could be rubrica or continuation
      const { cleanText: contText } = extractModificationNote(text);
      if (contText.startsWith("Pena") || contText.startsWith("Detenção") || contText.startsWith("Reclusão")) {
        currentArtigo.caput += " " + contText;
      }
    }
  }

  // Don't forget the last article
  if (currentArtigo) {
    artigos.push(currentArtigo);
    if (headerStack.length > 0) {
      headerStack[headerStack.length - 1].artigos.push(currentArtigo);
    }
  }

  return { artigos, estrutura };
}

// ==========================================
// CF88 SPECIAL PARSER (Título II only)
// ==========================================

function parseCf88Selecionada(html: string): { artigos: ParsedArtigo[]; estrutura: ParsedEstrutura[] } {
  // Parse full CF88 first, then filter to relevant article number ranges
  const fullResult = parsePlanaltoHtml(html, "cf88-titulo2", "CF");

  // Relevant ranges for criminal defense:
  // Art. 1-17: Princípios + Direitos e Garantias Fundamentais
  // Art. 92-135: Judiciário + MP + Advocacia + Defensoria
  // Art. 225-230: Meio Ambiente + Família + Criança + Idoso
  const RELEVANT_RANGES: [number, number][] = [
    [1, 17],
    [92, 135],
    [225, 230],
  ];

  function isRelevant(numero: string): boolean {
    const num = parseInt(numero.replace(/[^0-9]/g, ""), 10);
    if (isNaN(num)) return false;
    return RELEVANT_RANGES.some(([min, max]) => num >= min && num <= max);
  }

  const filteredArtigos = fullResult.artigos.filter(a => isRelevant(a.numero));

  const grupos: ParsedEstrutura[] = [
    {
      tipo: "titulo",
      nome: "Princípios Fundamentais e Direitos e Garantias (Art. 1-17)",
      artigos: filteredArtigos.filter(a => { const n = parseInt(a.numero); return n >= 1 && n <= 17; }),
      filhos: [],
    },
    {
      tipo: "titulo",
      nome: "Poder Judiciário, MP e Defensoria Pública (Art. 92-135)",
      artigos: filteredArtigos.filter(a => { const n = parseInt(a.numero); return n >= 92 && n <= 135; }),
      filhos: [],
    },
    {
      tipo: "titulo",
      nome: "Meio Ambiente, Família, Criança e Idoso (Art. 225-230)",
      artigos: filteredArtigos.filter(a => { const n = parseInt(a.numero); return n >= 225 && n <= 230; }),
      filhos: [],
    },
  ].filter(g => g.artigos.length > 0);

  console.log(`   CF88 selecionada: ${filteredArtigos.length} artigos filtrados de ${fullResult.artigos.length} total`);

  return { artigos: filteredArtigos, estrutura: grupos };
}

// ==========================================
// GENERATOR
// ==========================================

function generateTypeScriptFile(leiId: string, artigos: ParsedArtigo[], estrutura: ParsedEstrutura[], abreviado: string): string {
  function buildArtigo(a: ParsedArtigo): string {
    const id = `${abreviado.toLowerCase()}:art-${a.numero}`;
    const refs: string[] = [];

    // Detect cross-references in caput
    const refPattern = /art\.\s*(\d+)/gi;
    let match;
    while ((match = refPattern.exec(a.caput)) !== null) {
      refs.push(`${abreviado.toLowerCase()}:art-${match[1]}`);
    }

    return `    {
      tipo: "artigo" as const,
      id: ${JSON.stringify(id)},
      numero: ${JSON.stringify(a.numero)},
      caput: ${JSON.stringify(a.caput)},${a.rubrica ? `\n      rubrica: ${JSON.stringify(a.rubrica)},` : ""}
      paragrafos: ${JSON.stringify(a.paragrafos.map(p => ({
        id: `${id}-p${p.numero}`,
        numero: p.numero,
        texto: p.texto,
        alineas: p.alineas.map(al => ({ id: `${id}-p${p.numero}-${al.numero}`, numero: al.numero, texto: al.texto })),
      })))},
      incisos: ${JSON.stringify(a.incisos.map(inc => ({
        id: `${id}-inc-${inc.numero}`,
        numero: inc.numero,
        texto: inc.texto,
        alineas: inc.alineas.map(al => ({ id: `${id}-inc-${inc.numero}-${al.numero}`, numero: al.numero, texto: al.texto })),
      })))},
      referencias: ${JSON.stringify(refs)},
      historico: ${JSON.stringify(a.historico.map((h, i) => ({
        versao: i + 1,
        texto: h.texto,
        redacaoDadaPor: h.redacaoDadaPor ? { lei: h.redacaoDadaPor, artigo: "" } : null,
        publicadoEm: "",
        vigenteDesde: "",
        vigenteAte: null,
      })))},
    }`;
  }

  function buildEstrutura(node: ParsedEstrutura, indent: number): string {
    const pad = "  ".repeat(indent);
    const artigos = node.artigos.map(a => buildArtigo(a)).join(",\n");
    const filhos = node.filhos.map(f => buildEstrutura(f, indent + 1)).join(",\n");

    const allFilhos = [
      ...node.filhos.map(f => buildEstrutura(f, indent + 1)),
      ...node.artigos.map(a => buildArtigo(a)),
    ].join(",\n");

    return `${pad}{
${pad}  tipo: ${JSON.stringify(node.tipo)} as const,
${pad}  nome: ${JSON.stringify(node.nome)},
${pad}  filhos: [
${allFilhos}
${pad}  ],
${pad}}`;
  }

  // If we have structure, use it; otherwise wrap all articles in a flat structure
  let estruturaStr: string;
  if (estrutura.length > 0) {
    estruturaStr = estrutura.map(e => buildEstrutura(e, 1)).join(",\n");
  } else {
    // Flat: all articles at top level in a single "titulo" node
    const artigosStr = artigos.map(a => buildArtigo(a)).join(",\n");
    estruturaStr = `  {
    tipo: "titulo" as const,
    nome: "Disposições",
    filhos: [
${artigosStr}
    ],
  }`;
  }

  return `import type { Legislacao } from "../types";

const data: Legislacao = {
  id: ${JSON.stringify(leiId)},
  nome: ${JSON.stringify(LEIS[leiId] ? getLeiNome(leiId) : leiId)},
  nomeAbreviado: ${JSON.stringify(abreviado)},
  referencia: ${JSON.stringify(getLeiReferencia(leiId))},
  fonte: ${JSON.stringify(LEIS[leiId]?.url || "")},
  dataUltimaAtualizacao: ${JSON.stringify(new Date().toISOString().split("T")[0])},
  estrutura: [
${estruturaStr}
  ],
};

export default data;
`;
}

function getLeiNome(id: string): string {
  const nomes: Record<string, string> = {
    "codigo-penal": "Código Penal",
    "cpp": "Código de Processo Penal",
    "lep": "Lei de Execução Penal",
    "maria-da-penha": "Lei Maria da Penha",
    "drogas": "Lei de Drogas",
    "eca": "Estatuto da Criança e do Adolescente",
    "abuso-autoridade": "Lei de Abuso de Autoridade",
    "cf88-titulo2": "CF/88 - Direitos e Garantias Fundamentais",
    "contravencoes": "Lei das Contravenções Penais",
    "desarmamento": "Estatuto do Desarmamento",
    "testemunhas-protegidas": "Proteção a Testemunhas",
    "prisao-temporaria": "Prisão Temporária",
    "mariana-ferrer": "Lei Mariana Ferrer",
    "lc80": "LC da Defensoria Pública",
    "lce26-bahia": "LCE Defensoria Bahia",
  };
  return nomes[id] || id;
}

function getLeiReferencia(id: string): string {
  const refs: Record<string, string> = {
    "codigo-penal": "Decreto-Lei nº 2.848/1940",
    "cpp": "Decreto-Lei nº 3.689/1941",
    "lep": "Lei nº 7.210/1984",
    "maria-da-penha": "Lei nº 11.340/2006",
    "drogas": "Lei nº 11.343/2006",
    "eca": "Lei nº 8.069/1990",
    "abuso-autoridade": "Lei nº 13.869/2019",
    "cf88-titulo2": "Constituição Federal de 1988, Título II",
    "contravencoes": "Decreto-Lei nº 3.688/1941",
    "desarmamento": "Lei nº 10.826/2003",
    "testemunhas-protegidas": "Lei nº 9.807/1999",
    "prisao-temporaria": "Lei nº 7.960/1989",
    "mariana-ferrer": "Lei nº 14.245/2021",
    "lc80": "Lei Complementar nº 80/1994",
    "lce26-bahia": "Lei Complementar Estadual nº 26/2006",
  };
  return refs[id] || "";
}

// ==========================================
// MAIN
// ==========================================

async function processLei(leiId: string) {
  const config = LEIS[leiId];
  if (!config) {
    console.error(`Lei não encontrada: ${leiId}`);
    console.log("Leis disponíveis:", Object.keys(LEIS).join(", "));
    return;
  }

  console.log(`\n📥 Buscando ${leiId} de ${config.url}...`);
  const html = await fetchHtml(config.url);
  console.log(`   HTML: ${html.length} bytes`);

  console.log(`🔍 Parseando...`);
  let result;
  if (leiId === "cf88-titulo2") {
    result = parseCf88Selecionada(html);
  } else {
    result = parsePlanaltoHtml(html, leiId, config.abreviado);
  }

  console.log(`   Artigos encontrados: ${result.artigos.length}`);
  console.log(`   Estrutura: ${result.estrutura.length} nós raiz`);

  const tsContent = generateTypeScriptFile(leiId, result.artigos, result.estrutura, config.abreviado);

  const outputDir = path.join(__dirname, "..", "src", "config", "legislacao", "data");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, `${leiId}.ts`);
  fs.writeFileSync(outputPath, tsContent, "utf-8");
  console.log(`✅ Salvo: ${outputPath} (${(tsContent.length / 1024).toFixed(1)} KB)`);
  console.log(`   Artigos: ${result.artigos.length}`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--all")) {
    const leiIds = Object.keys(LEIS);
    console.log(`Processando ${leiIds.length} leis...`);
    for (const id of leiIds) {
      try {
        await processLei(id);
      } catch (err) {
        console.error(`❌ Erro em ${id}:`, (err as Error).message);
      }
    }
  } else if (args.length > 0) {
    for (const id of args) {
      try {
        await processLei(id);
      } catch (err) {
        console.error(`❌ Erro em ${id}:`, (err as Error).message);
      }
    }
  } else {
    console.log("Uso: npx tsx scripts/seed-legislacao.ts [lei-id | --all]");
    console.log("Leis disponíveis:", Object.keys(LEIS).join(", "));
  }
}

main();
