#!/usr/bin/env npx tsx
/**
 * Orquestrador 1: Intimações Semanais
 *
 * Fluxo:
 *  1. Consulta escala do mês → identifica atribuição ativa
 *  2. Navega ao PJe (já logado) → Painel → Expedientes
 *  3. Captura texto das intimações pendentes
 *  4. Parse via Gemini (enrichment-engine)
 *  5. Popula OMBUDS: assistido, processo, demanda
 *  6. Gera relatório resumo
 *
 * Uso:
 *   # Com PJe logado no Chrome (porta 9222):
 *   npx tsx scripts/orchestrators/orq-intimacoes.ts
 *
 *   # Ou com texto já capturado:
 *   npx tsx scripts/orchestrators/orq-intimacoes.ts --from-file ~/Desktop/expedientes.txt
 *
 * Requisitos:
 *   - Chrome com --remote-debugging-port=9222
 *   - PJe logado (defensor faz login manual com e-CPF)
 *   - .env.local com DATABASE_URL, ENRICHMENT_ENGINE_URL
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";

// ─── Config ───────────────────────────────────────────────────────────────

const ROOT = resolve(__dirname, "../..");
const ENV_FILE = resolve(ROOT, ".env.local");
const ENRICHMENT_URL = process.env.ENRICHMENT_ENGINE_URL || "http://localhost:8000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OUTPUT_DIR = resolve(process.env.HOME || "~", "Desktop/pje-intimacoes");

// ─── Args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const fromFile = args.includes("--from-file") ? args[args.indexOf("--from-file") + 1] : null;
const dryRun = args.includes("--dry-run");
const atribuicaoOverride = args.includes("--atribuicao") ? args[args.indexOf("--atribuicao") + 1] : null;

// ─── Helpers ──────────────────────────────────────────────────────────────

function log(msg: string) {
  const ts = new Date().toLocaleTimeString("pt-BR");
  console.log(`[${ts}] ${msg}`);
}

function logSection(title: string) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${"═".repeat(60)}\n`);
}

async function supabaseQuery(query: string): Promise<any[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({ query }),
  });
  return res.json();
}

async function supabaseSelect(table: string, params: string): Promise<any[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  return res.json();
}

// ─── Step 1: Identify current attribution ─────────────────────────────────

async function getCurrentAtribuicao(): Promise<{ defensorNome: string; atribuicao: string }> {
  if (atribuicaoOverride) {
    return { defensorNome: "Manual", atribuicao: atribuicaoOverride };
  }

  const now = new Date();
  const mes = now.getMonth() + 1;
  const ano = now.getFullYear();

  log(`Consultando escala de ${mes}/${ano}...`);

  const escalas = await supabaseSelect(
    "escalas_atribuicao",
    `select=*,profissionais(nome)&mes=eq.${mes}&ano=eq.${ano}&ativo=eq.true`
  );

  if (!escalas?.length) {
    log("⚠ Nenhuma escala encontrada para este mês. Use --atribuicao para forçar.");
    process.exit(1);
  }

  // Show all active attributions
  log(`Escalas ativas:`);
  for (const e of escalas) {
    const nome = (e as any).profissionais?.nome ?? "?";
    log(`  ${nome} → ${e.atribuicao}`);
  }

  // Default to first criminal attribution
  const criminal = escalas.find((e: any) =>
    ["JURI_CAMACARI", "CRIMINAL", "SUBSTITUICAO"].includes(e.atribuicao)
  );
  const selected = criminal || escalas[0];

  return {
    defensorNome: (selected as any).profissionais?.nome ?? "Defensor",
    atribuicao: selected.atribuicao,
  };
}

// ─── Step 2: Capture expedientes from PJe ─────────────────────────────────

async function captureExpedientes(): Promise<string> {
  if (fromFile) {
    log(`Lendo expedientes de ${fromFile}...`);
    return readFileSync(fromFile, "utf-8");
  }

  log("Capturando expedientes do PJe via Chrome CDP...");
  log("Certifique-se de que o PJe está logado e na aba de Expedientes.");

  // Use Chrome CDP to extract text from the Expedientes tab
  try {
    const script = `
      const puppeteer = require('puppeteer-core');
      (async () => {
        const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222' });
        const pages = await browser.pages();
        const pjePage = pages.find(p => p.url().includes('pje.tjba.jus.br'));
        if (!pjePage) { console.error('PJe tab not found'); process.exit(1); }

        // Click on Expedientes tab if not already selected
        await pjePage.evaluate(() => {
          const tabs = document.querySelectorAll('.ui-tabs-nav li a');
          for (const tab of tabs) {
            if (tab.textContent?.includes('Expedientes') || tab.textContent?.includes('EXPEDIENTES')) {
              (tab as HTMLElement).click();
              break;
            }
          }
        });

        await new Promise(r => setTimeout(r, 3000));

        // Extract all text from expedientes table
        const text = await pjePage.evaluate(() => {
          const container = document.querySelector('[id*="expedientes"]') ||
                           document.querySelector('.painel-expedientes') ||
                           document.querySelector('#divExpedientes') ||
                           document.body;
          return container?.innerText || '';
        });

        console.log(text);
        await browser.disconnect();
      })();
    `;

    const result = execSync(`node -e '${script.replace(/'/g, "\\'")}'`, {
      encoding: "utf-8",
      timeout: 30000,
      cwd: ROOT,
    });

    return result;
  } catch (e: any) {
    log(`⚠ Não foi possível capturar via CDP: ${e.message}`);
    log("Alternativa: copie o texto dos Expedientes e salve em ~/Desktop/expedientes.txt");
    log("Depois rode: npx tsx scripts/orchestrators/orq-intimacoes.ts --from-file ~/Desktop/expedientes.txt");
    process.exit(1);
  }
}

// ─── Step 3: Parse via Enrichment Engine (Gemini) ─────────────────────────

interface IntimacaoParsed {
  numero_processo: string;
  vara: string;
  comarca: string;
  atribuicao: string;
  reu_principal: string | null;
  crime: string;
  tipo_documento: string;
  tipo_prazo: string;
  data_limite: string | null;
  dias_prazo: number;
  texto_expediente: string;
  urgencia: string;
}

async function parseIntimacoes(rawText: string): Promise<IntimacaoParsed[]> {
  log(`Enviando ${rawText.length} caracteres ao enrichment engine...`);

  const res = await fetch(`${ENRICHMENT_URL}/enrich/pje-text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      raw_text: rawText,
      defensor_id: "orquestrador-intimacoes",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Enrichment engine error: ${res.status} ${err}`);
  }

  const data = await res.json();
  log(`${data.intimacoes?.length ?? 0} intimações extraídas pela IA`);
  return data.intimacoes ?? [];
}

// ─── Step 4: Populate OMBUDS ──────────────────────────────────────────────

interface PopulateResult {
  assistidosCriados: number;
  processosCriados: number;
  demandasCriadas: number;
  duplicados: number;
  erros: string[];
}

async function populateOmbuds(intimacoes: IntimacaoParsed[], atribuicao: string): Promise<PopulateResult> {
  log(`Populando OMBUDS com ${intimacoes.length} intimações...`);

  if (dryRun) {
    log("🏁 DRY RUN — nenhuma alteração no banco");
    return { assistidosCriados: 0, processosCriados: 0, demandasCriadas: 0, duplicados: 0, erros: [] };
  }

  // Use the existing import endpoint
  const rows = intimacoes.map((int, i) => ({
    assistido: int.reu_principal || "Não identificado",
    processoNumero: int.numero_processo,
    ato: int.tipo_documento || "Intimação",
    prazo: int.data_limite || undefined,
    status: int.urgencia === "critical" ? "urgente" : "fila",
    atribuicao,
    tipoDocumento: int.tipo_documento,
    crime: int.crime,
    vara: int.vara,
    ordemOriginal: i,
  }));

  // Call the Next.js API (which uses pje-import.ts internally)
  const res = await fetch(`${process.env.NEXTAUTH_URL || "http://localhost:3001"}/api/pje/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rows, atribuicao }),
  });

  if (!res.ok) {
    // Fallback: insert directly via Supabase REST
    log("API não disponível, inserindo diretamente via Supabase...");
    return insertDirectly(intimacoes, atribuicao);
  }

  const result = await res.json();
  return {
    assistidosCriados: result.assistidosCriados ?? 0,
    processosCriados: result.processosCriados ?? 0,
    demandasCriadas: result.imported ?? 0,
    duplicados: result.skipped ?? 0,
    erros: result.errors ?? [],
  };
}

async function insertDirectly(intimacoes: IntimacaoParsed[], atribuicao: string): Promise<PopulateResult> {
  const result: PopulateResult = {
    assistidosCriados: 0,
    processosCriados: 0,
    demandasCriadas: 0,
    duplicados: 0,
    erros: [],
  };

  for (const int of intimacoes) {
    try {
      const nome = int.reu_principal || "Não identificado";

      // 1. Find or create assistido
      const existingAssistidos = await supabaseSelect(
        "assistidos",
        `select=id,nome&nome=ilike.${encodeURIComponent(nome)}&limit=1`
      );

      let assistidoId: number;
      if (existingAssistidos?.length > 0) {
        assistidoId = existingAssistidos[0].id;
      } else {
        const createRes = await fetch(`${SUPABASE_URL}/rest/v1/assistidos`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            Prefer: "return=representation",
          },
          body: JSON.stringify({ nome, atribuicao }),
        });
        const created = await createRes.json();
        assistidoId = Array.isArray(created) ? created[0]?.id : created?.id;
        result.assistidosCriados++;
      }

      // 2. Find or create processo
      if (int.numero_processo) {
        const existingProcessos = await supabaseSelect(
          "processos",
          `select=id&numero_autos=eq.${encodeURIComponent(int.numero_processo)}&limit=1`
        );

        let processoId: number;
        if (existingProcessos?.length > 0) {
          processoId = existingProcessos[0].id;
        } else {
          const createRes = await fetch(`${SUPABASE_URL}/rest/v1/processos`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
              Prefer: "return=representation",
            },
            body: JSON.stringify({
              numero_autos: int.numero_processo,
              vara: int.vara,
              comarca: int.comarca,
              atribuicao,
            }),
          });
          const created = await createRes.json();
          processoId = Array.isArray(created) ? created[0]?.id : created?.id;
          result.processosCriados++;

          // Link assistido ↔ processo
          await fetch(`${SUPABASE_URL}/rest/v1/assistidos_processos`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
              Prefer: "return=minimal",
            },
            body: JSON.stringify({
              assistido_id: assistidoId,
              processo_id: processoId,
              papel: "REU",
              ativo: true,
            }),
          });
        }

        // 3. Create demanda
        await fetch(`${SUPABASE_URL}/rest/v1/demandas`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            processo_id: processoId,
            assistido_id: assistidoId,
            ato: int.tipo_documento || "Intimação",
            tipo_ato: int.tipo_prazo || "ciencia",
            prazo: int.data_limite,
            status: int.urgencia === "critical" ? "1_URGENTE" : "5_FILA",
            observacoes: int.texto_expediente,
          }),
        });
        result.demandasCriadas++;
      }
    } catch (e: any) {
      result.erros.push(`${int.numero_processo}: ${e.message}`);
    }
  }

  return result;
}

// ─── Step 5: Generate Report ──────────────────────────────────────────────

function generateReport(
  atribuicao: string,
  defensor: string,
  intimacoes: IntimacaoParsed[],
  result: PopulateResult,
): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  const urgentes = intimacoes.filter(i => i.urgencia === "critical" || i.urgencia === "high");
  const porTipo = intimacoes.reduce((acc, i) => {
    const tipo = i.tipo_documento || "Outro";
    acc[tipo] = (acc[tipo] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  let report = `
# Relatório de Intimações — ${dateStr}

**Atribuição:** ${atribuicao}
**Defensor:** ${defensor}
**Total de intimações:** ${intimacoes.length}

## Resumo da Importação

| Métrica | Qtd |
|---------|-----|
| Assistidos criados | ${result.assistidosCriados} |
| Processos criados | ${result.processosCriados} |
| Demandas criadas | ${result.demandasCriadas} |
| Duplicados ignorados | ${result.duplicados} |
| Erros | ${result.erros.length} |

## Por Tipo de Documento

${Object.entries(porTipo).map(([tipo, qtd]) => `- **${tipo}:** ${qtd}`).join("\n")}
`;

  if (urgentes.length > 0) {
    report += `
## ⚠ Urgentes (${urgentes.length})

${urgentes.map(u => `- **${u.numero_processo}** — ${u.reu_principal || "?"} — ${u.tipo_documento} — prazo: ${u.data_limite || "sem prazo"}`).join("\n")}
`;
  }

  if (result.erros.length > 0) {
    report += `
## Erros

${result.erros.map(e => `- ${e}`).join("\n")}
`;
  }

  return report;
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  logSection("ORQUESTRADOR 1: INTIMAÇÕES SEMANAIS");

  // Step 1: Identify attribution
  log("── Etapa 1: Identificação da atribuição ──");
  const { defensorNome, atribuicao } = await getCurrentAtribuicao();
  log(`✓ Atribuição: ${atribuicao} (${defensorNome})`);

  // Step 2: Capture expedientes
  log("\n── Etapa 2: Captura de expedientes ──");
  const rawText = await captureExpedientes();
  log(`✓ ${rawText.length} caracteres capturados`);

  // Save raw text for reference
  if (!existsSync(OUTPUT_DIR)) {
    execSync(`mkdir -p "${OUTPUT_DIR}"`);
  }
  const rawFile = resolve(OUTPUT_DIR, `expedientes-${new Date().toISOString().split("T")[0]}.txt`);
  writeFileSync(rawFile, rawText);
  log(`  Salvo em ${rawFile}`);

  // Step 3: Parse
  log("\n── Etapa 3: Análise com IA ──");
  const intimacoes = await parseIntimacoes(rawText);

  if (intimacoes.length === 0) {
    log("Nenhuma intimação encontrada. Verifique o texto capturado.");
    return;
  }

  // Show summary
  log(`\nIntimações encontradas:`);
  for (const int of intimacoes) {
    const urgIcon = int.urgencia === "critical" ? "🔴" : int.urgencia === "high" ? "🟡" : "⚪";
    log(`  ${urgIcon} ${int.numero_processo} — ${int.reu_principal || "?"} — ${int.tipo_documento}`);
  }

  // Step 4: Populate OMBUDS
  log("\n── Etapa 4: População do OMBUDS ──");
  const result = await populateOmbuds(intimacoes, atribuicao);
  log(`✓ ${result.assistidosCriados} assistidos, ${result.processosCriados} processos, ${result.demandasCriadas} demandas`);
  if (result.erros.length > 0) {
    log(`⚠ ${result.erros.length} erros`);
  }

  // Step 5: Report
  log("\n── Etapa 5: Relatório ──");
  const report = generateReport(atribuicao, defensorNome, intimacoes, result);
  const reportFile = resolve(OUTPUT_DIR, `relatorio-${new Date().toISOString().split("T")[0]}.md`);
  writeFileSync(reportFile, report);
  log(`✓ Relatório salvo em ${reportFile}`);

  console.log(report);

  logSection("CONCLUÍDO");
}

main().catch(e => {
  console.error("❌ Erro fatal:", e.message);
  process.exit(1);
});
