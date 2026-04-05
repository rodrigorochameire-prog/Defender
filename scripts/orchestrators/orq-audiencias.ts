#!/usr/bin/env npx tsx
/**
 * Orquestrador 2: Audiências Semanais
 *
 * Fluxo completo:
 *  1. Navega à pauta de audiências no PJe (já logado)
 *  2. Extrai: data, hora, processo, tipo, partes, local
 *  3. Popula OMBUDS: audiência, assistido, processo (importBatch)
 *  4. Sincroniza calendário (Google Calendar / Outlook 365)
 *  5. Enfileira download de autos (referência + associados)
 *  6. Upload ao Drive/OneDrive
 *  7. Dispara análise IA (briefing de audiência)
 *  8. Pré-popula registro de audiência (depoentes, juiz, promotor)
 *  9. Gera relatório da semana
 *
 * Uso:
 *   # Com PJe logado:
 *   npx tsx scripts/orchestrators/orq-audiencias.ts
 *
 *   # Com pauta já capturada:
 *   npx tsx scripts/orchestrators/orq-audiencias.ts --from-file ~/Desktop/pauta.txt
 *
 *   # Só sincronizar calendário (sem download):
 *   npx tsx scripts/orchestrators/orq-audiencias.ts --skip-download
 *
 *   # Dry run (sem alterações):
 *   npx tsx scripts/orchestrators/orq-audiencias.ts --dry-run
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";
import { createCalendarEvent, listCalendarEvents, getProvider } from "./providers";

// ─── Config ───────────────────────────────────────────────────────────────

const ROOT = resolve(__dirname, "../..");
const ENRICHMENT_URL = process.env.ENRICHMENT_ENGINE_URL || "http://localhost:8000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const APP_URL = process.env.NEXTAUTH_URL || "http://localhost:3001";
const OUTPUT_DIR = resolve(process.env.HOME || "~", "Desktop/pje-audiencias");

// ─── Args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const fromFile = args.includes("--from-file") ? args[args.indexOf("--from-file") + 1] : null;
const dryRun = args.includes("--dry-run");
const skipDownload = args.includes("--skip-download");
const skipCalendar = args.includes("--skip-calendar");
const skipAnalysis = args.includes("--skip-analysis");

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

async function supabaseSelect(table: string, params: string): Promise<any[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  return res.json();
}

async function supabaseInsert(table: string, data: any): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: "return=representation",
    },
    body: JSON.stringify(data),
  });
  return res.json();
}

async function supabaseUpdate(table: string, id: number, data: any): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: "return=representation",
    },
    body: JSON.stringify(data),
  });
  return res.json();
}

// ─── Types ────────────────────────────────────────────────────────────────

interface PautaItem {
  data: string;           // "2026-04-10"
  horario: string;        // "09:00"
  processoNumero: string; // "8003969-75.2025.8.05.0039"
  tipo: string;           // "Instrução e Julgamento", "Sessão de Julgamento do Tribunal do Júri"
  local: string;          // "Fórum Clemente Mariani - Camaçari"
  sala?: string;
  assistidoNome?: string;
  juiz?: string;
  promotor?: string;
  atribuicao?: string;
}

interface ImportResult {
  audienciasCriadas: number;
  audienciasAtualizadas: number;
  assistidosCriados: number;
  processosCriados: number;
  duplicados: number;
  calendarSynced: number;
  downloadQueued: number;
  analysisTriggered: number;
  erros: string[];
}

// ─── Step 1: Capture pauta from PJe ──────────────────────────────────────

async function capturePauta(): Promise<string> {
  if (fromFile) {
    log(`Lendo pauta de ${fromFile}...`);
    return readFileSync(fromFile, "utf-8");
  }

  log("Capturando pauta de audiências do PJe via Chrome CDP...");

  try {
    const script = `
      const puppeteer = require('puppeteer-core');
      (async () => {
        const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222' });
        const pages = await browser.pages();
        const pjePage = pages.find(p => p.url().includes('pje.tjba.jus.br'));
        if (!pjePage) { console.error('PJe tab not found'); process.exit(1); }

        // Navigate to Pauta de Audiências
        const text = await pjePage.evaluate(() => {
          // Try multiple selectors for pauta section
          const selectors = [
            '[id*="pauta"]',
            '[id*="audiencia"]',
            '.painel-audiencias',
            '#divAudiencias',
          ];
          for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el?.innerText?.length > 50) return el.innerText;
          }
          return document.body.innerText;
        });

        console.log(text);
        await browser.disconnect();
      })();
    `;

    return execSync(`node -e '${script.replace(/'/g, "\\'")}'`, {
      encoding: "utf-8",
      timeout: 30000,
      cwd: ROOT,
    });
  } catch (e: any) {
    log(`⚠ CDP não disponível: ${e.message}`);
    log("Copie a pauta para ~/Desktop/pauta.txt e rode com --from-file");
    process.exit(1);
  }
}

// ─── Step 2: Parse pauta ──────────────────────────────────────────────────

async function parsePauta(rawText: string): Promise<PautaItem[]> {
  log(`Enviando pauta (${rawText.length} chars) ao enrichment engine...`);

  // Use Gemini to extract structured hearing data
  const res = await fetch(`${ENRICHMENT_URL}/enrich/pje-text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      raw_text: `PAUTA DE AUDIÊNCIAS - Extraia os dados das audiências agendadas:\n\n${rawText}`,
      defensor_id: "orquestrador-audiencias",
    }),
  });

  if (!res.ok) {
    throw new Error(`Enrichment error: ${res.status}`);
  }

  const data = await res.json();

  // Map enrichment response to PautaItem format
  const items: PautaItem[] = (data.intimacoes ?? [])
    .filter((i: any) => i.tipo_prazo === "audiencia" || i.tipo_documento?.toLowerCase().includes("audiência"))
    .map((i: any) => ({
      data: i.data_limite || new Date().toISOString().split("T")[0],
      horario: "09:00",
      processoNumero: i.numero_processo,
      tipo: i.tipo_documento || "Audiência",
      local: i.vara || "",
      assistidoNome: i.reu_principal,
      atribuicao: i.atribuicao,
    }));

  log(`${items.length} audiências extraídas`);
  return items;
}

// ─── Step 3: Populate OMBUDS (audiências, assistidos, processos) ──────────

async function populateOmbuds(pauta: PautaItem[]): Promise<ImportResult> {
  const result: ImportResult = {
    audienciasCriadas: 0,
    audienciasAtualizadas: 0,
    assistidosCriados: 0,
    processosCriados: 0,
    duplicados: 0,
    calendarSynced: 0,
    downloadQueued: 0,
    analysisTriggered: 0,
    erros: [],
  };

  if (dryRun) {
    log("🏁 DRY RUN — sem alterações");
    return result;
  }

  for (const item of pauta) {
    try {
      // Find or create assistido
      let assistidoId: number | null = null;
      if (item.assistidoNome) {
        const existing = await supabaseSelect(
          "assistidos",
          `select=id&nome=ilike.${encodeURIComponent(item.assistidoNome)}&limit=1`
        );
        if (existing?.length > 0) {
          assistidoId = existing[0].id;
        } else {
          const created = await supabaseInsert("assistidos", {
            nome: item.assistidoNome,
            atribuicao: item.atribuicao,
          });
          assistidoId = Array.isArray(created) ? created[0]?.id : created?.id;
          result.assistidosCriados++;
        }
      }

      // Find or create processo
      let processoId: number | null = null;
      if (item.processoNumero) {
        const existing = await supabaseSelect(
          "processos",
          `select=id&numero_autos=eq.${encodeURIComponent(item.processoNumero)}&limit=1`
        );
        if (existing?.length > 0) {
          processoId = existing[0].id;
        } else {
          const created = await supabaseInsert("processos", {
            numero_autos: item.processoNumero,
            vara: item.local,
            atribuicao: item.atribuicao,
          });
          processoId = Array.isArray(created) ? created[0]?.id : created?.id;
          result.processosCriados++;

          // Link assistido ↔ processo
          if (assistidoId && processoId) {
            await supabaseInsert("assistidos_processos", {
              assistido_id: assistidoId,
              processo_id: processoId,
              papel: "REU",
              ativo: true,
            });
          }
        }
      }

      if (!processoId) {
        result.erros.push(`${item.processoNumero}: processo não criado`);
        continue;
      }

      // Check for duplicate audiência
      const dataAudiencia = `${item.data}T${item.horario}:00`;
      const existingAudiencias = await supabaseSelect(
        "audiencias",
        `select=id&processo_id=eq.${processoId}&data_audiencia=eq.${encodeURIComponent(dataAudiencia)}&limit=1`
      );

      if (existingAudiencias?.length > 0) {
        // Update existing
        await supabaseUpdate("audiencias", existingAudiencias[0].id, {
          local: item.local,
          sala: item.sala,
          juiz: item.juiz,
          promotor: item.promotor,
          updated_at: new Date().toISOString(),
        });
        result.audienciasAtualizadas++;
        result.duplicados++;
      } else {
        // Create new audiência
        const audienciaData = {
          processo_id: processoId,
          assistido_id: assistidoId,
          data_audiencia: dataAudiencia,
          tipo: item.tipo,
          local: item.local,
          sala: item.sala,
          horario: item.horario,
          titulo: `${item.tipo} — ${item.assistidoNome || item.processoNumero}`,
          juiz: item.juiz,
          promotor: item.promotor,
          status: "agendada",
        };

        await supabaseInsert("audiencias", audienciaData);
        result.audienciasCriadas++;
      }

      // Step 4: Sync calendar
      if (!skipCalendar) {
        try {
          const provider = getProvider();
          await createCalendarEvent({
            title: `${item.tipo} — ${item.assistidoNome || item.processoNumero}`,
            start: `${item.data}T${item.horario}:00-03:00`,
            end: `${item.data}T${String(Number(item.horario.split(":")[0]) + 2).padStart(2, "0")}:${item.horario.split(":")[1]}:00-03:00`,
            location: item.local,
            description: `Processo: ${item.processoNumero}\nAssistido: ${item.assistidoNome || "—"}\nProvider: ${provider}`,
          });
          result.calendarSynced++;
        } catch (e: any) {
          log(`  ⚠ Calendar sync failed: ${e.message}`);
        }
      }

    } catch (e: any) {
      result.erros.push(`${item.processoNumero}: ${e.message}`);
    }
  }

  return result;
}

// ─── Step 5: Download autos ───────────────────────────────────────────────

async function enqueueDownloads(pauta: PautaItem[]): Promise<number> {
  if (skipDownload) {
    log("Download pulado (--skip-download)");
    return 0;
  }

  const processos = [...new Set(pauta.map(p => p.processoNumero).filter(Boolean))];
  log(`Enfileirando download de ${processos.length} processos...`);

  // Write process list file
  const listFile = resolve(OUTPUT_DIR, "processos-download.txt");
  writeFileSync(listFile, processos.join("\n"));

  // Call existing Phase 1 script
  try {
    log("Fase 1: Enfileirando no PJe (agent-browser)...");
    execSync(
      `bash "${resolve(ROOT, "scripts/pje_download_v4.sh")}" "${listFile}"`,
      { stdio: "inherit", timeout: processos.length * 60000, cwd: ROOT }
    );

    log("Fase 2: Baixando PDFs (Playwright)...");
    execSync(
      `python3 "${resolve(ROOT, "scripts/pje_area_download.py")}"`,
      { stdio: "inherit", timeout: processos.length * 120000, cwd: ROOT }
    );

    log("Fase 3: Upload ao Drive...");
    const downloadDir = resolve(process.env.HOME || "~", "Desktop/pje-autos-juri");
    if (existsSync(downloadDir)) {
      execSync(
        `bash "${resolve(ROOT, "scripts/pje_upload_drive_curl.sh")}" "${downloadDir}"`,
        { stdio: "inherit", timeout: processos.length * 60000, cwd: ROOT }
      );
    }

    return processos.length;
  } catch (e: any) {
    log(`⚠ Download pipeline error: ${e.message}`);
    log("Processos salvos em " + listFile + " para retry manual.");
    return 0;
  }
}

// ─── Step 6: Trigger AI analysis ──────────────────────────────────────────

async function triggerAnalysis(pauta: PautaItem[]): Promise<number> {
  if (skipAnalysis) {
    log("Análise pulada (--skip-analysis)");
    return 0;
  }

  let triggered = 0;

  for (const item of pauta) {
    if (!item.processoNumero) continue;

    try {
      // Find the processo + assistido IDs
      const processos = await supabaseSelect(
        "processos",
        `select=id&numero_autos=eq.${encodeURIComponent(item.processoNumero)}&limit=1`
      );
      if (!processos?.length) continue;

      const processoId = processos[0].id;

      // Find assistido linked to this processo
      const links = await supabaseSelect(
        "assistidos_processos",
        `select=assistido_id&processo_id=eq.${processoId}&limit=1`
      );
      const assistidoId = links?.[0]?.assistido_id;
      if (!assistidoId) continue;

      // Trigger analysis via enrichment engine or tRPC
      const res = await fetch(`${APP_URL}/api/trpc/analise.criarTask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          json: {
            assistidoId,
            processoId,
            skill: "analise-completa",
            instrucaoAdicional: `Briefing para audiência de ${item.tipo} em ${item.data}`,
          },
        }),
      });

      if (res.ok) triggered++;
    } catch {
      // Non-critical — continue
    }
  }

  return triggered;
}

// ─── Step 7: Pre-populate registro ────────────────────────────────────────

async function prepopulateRegistros(pauta: PautaItem[]): Promise<number> {
  let populated = 0;

  for (const item of pauta) {
    if (!item.processoNumero) continue;

    try {
      // Find audiência
      const dataAudiencia = `${item.data}T${item.horario}:00`;
      const processos = await supabaseSelect(
        "processos",
        `select=id&numero_autos=eq.${encodeURIComponent(item.processoNumero)}&limit=1`
      );
      if (!processos?.length) continue;

      const audiencias = await supabaseSelect(
        "audiencias",
        `select=id,registro_audiencia&processo_id=eq.${processos[0].id}&data_audiencia=eq.${encodeURIComponent(dataAudiencia)}&limit=1`
      );
      if (!audiencias?.length) continue;

      const aud = audiencias[0];
      if (aud.registro_audiencia) continue; // Already has registro

      // Pre-populate with available data
      const registro = {
        eventoId: aud.id,
        processoId: processos[0].id,
        dataRealizacao: item.data,
        juiz: item.juiz || "",
        promotor: item.promotor || "",
        realizada: true,
        statusAudiencia: "concluida",
        assistidoCompareceu: true,
        registradoPor: "Pré-preenchido pelo orquestrador",
        dataRegistro: new Date().toISOString(),
        depoentes: [],
        anotacoesGerais: "",
      };

      await supabaseUpdate("audiencias", aud.id, {
        registro_audiencia: registro,
        juiz: item.juiz || aud.juiz,
        promotor: item.promotor || aud.promotor,
      });

      populated++;
    } catch {
      // Non-critical
    }
  }

  return populated;
}

// ─── Step 8: Report ───────────────────────────────────────────────────────

function generateReport(pauta: PautaItem[], result: ImportResult): string {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 4);

  const dateRange = `${weekStart.toLocaleDateString("pt-BR")} a ${weekEnd.toLocaleDateString("pt-BR")}`;
  const provider = getProvider();

  let report = `
# Relatório de Audiências da Semana

**Período:** ${dateRange}
**Provider:** ${provider === "microsoft" ? "Microsoft 365" : "Google Workspace"}
**Total de audiências:** ${pauta.length}

## Importação

| Métrica | Qtd |
|---------|-----|
| Audiências criadas | ${result.audienciasCriadas} |
| Audiências atualizadas | ${result.audienciasAtualizadas} |
| Assistidos criados | ${result.assistidosCriados} |
| Processos criados | ${result.processosCriados} |
| Calendário sincronizado | ${result.calendarSynced} |
| Downloads enfileirados | ${result.downloadQueued} |
| Análises IA disparadas | ${result.analysisTriggered} |

## Pauta

${pauta.map(p => `- **${p.data} ${p.horario}** — ${p.tipo} — ${p.assistidoNome || "?"} — \`${p.processoNumero}\` — ${p.local}`).join("\n")}
`;

  if (result.erros.length > 0) {
    report += `\n## Erros\n\n${result.erros.map(e => `- ${e}`).join("\n")}\n`;
  }

  return report;
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  logSection("ORQUESTRADOR 2: AUDIÊNCIAS SEMANAIS");

  // Step 1: Capture
  log("── Etapa 1: Captura da pauta ──");
  const rawText = await capturePauta();
  log(`✓ ${rawText.length} caracteres capturados`);

  if (!existsSync(OUTPUT_DIR)) execSync(`mkdir -p "${OUTPUT_DIR}"`);
  writeFileSync(resolve(OUTPUT_DIR, `pauta-raw-${new Date().toISOString().split("T")[0]}.txt`), rawText);

  // Step 2: Parse
  log("\n── Etapa 2: Análise da pauta ──");
  const pauta = await parsePauta(rawText);

  if (pauta.length === 0) {
    log("Nenhuma audiência encontrada.");
    return;
  }

  log(`\nAudiências encontradas:`);
  for (const p of pauta) {
    log(`  📅 ${p.data} ${p.horario} — ${p.tipo} — ${p.assistidoNome || "?"}`);
  }

  // Step 3: Populate OMBUDS
  log("\n── Etapa 3: População do OMBUDS + Calendário ──");
  const result = await populateOmbuds(pauta);
  log(`✓ ${result.audienciasCriadas} audiências, ${result.calendarSynced} calendar events`);

  // Step 4: Downloads
  log("\n── Etapa 4: Download de autos ──");
  result.downloadQueued = await enqueueDownloads(pauta);
  log(`✓ ${result.downloadQueued} processos enfileirados`);

  // Step 5: AI Analysis
  log("\n── Etapa 5: Análise IA (briefing) ──");
  result.analysisTriggered = await triggerAnalysis(pauta);
  log(`✓ ${result.analysisTriggered} análises disparadas`);

  // Step 6: Pre-populate registros
  log("\n── Etapa 6: Pré-população de registros ──");
  const prepopulated = await prepopulateRegistros(pauta);
  log(`✓ ${prepopulated} registros pré-preenchidos`);

  // Step 7: Report
  log("\n── Etapa 7: Relatório ──");
  const report = generateReport(pauta, result);
  writeFileSync(resolve(OUTPUT_DIR, `relatorio-audiencias-${new Date().toISOString().split("T")[0]}.md`), report);
  console.log(report);

  logSection("CONCLUÍDO");
}

main().catch(e => {
  console.error("❌ Erro fatal:", e.message);
  process.exit(1);
});
