#!/usr/bin/env node

/**
 * prepare-audiencia.mjs
 *
 * Called from the Defender app to trigger Claude Code analysis on Mac Mini.
 * Usage: node scripts/prepare-audiencia.mjs --processoId=123 --assistidoId=456
 */

import { parseArgs } from "node:util";
import { execSync } from "node:child_process";

const { values } = parseArgs({
  options: {
    processoId: { type: "string" },
    assistidoId: { type: "string" },
    dryRun: { type: "boolean", default: false },
  },
});

if (!values.processoId || !values.assistidoId) {
  console.error("Usage: node prepare-audiencia.mjs --processoId=ID --assistidoId=ID");
  process.exit(1);
}

const processoId = values.processoId;
const assistidoId = values.assistidoId;

console.log(`[prepare-audiencia] Starting analysis for processo=${processoId}, assistido=${assistidoId}`);

const prompt = `
Analise o processo ID ${processoId} do assistido ID ${assistidoId}.

1. Busque os arquivos do processo no Google Drive usando MCP
2. Leia todos os documentos disponíveis
3. Gere o analysisData completo seguindo o schema ProcessoAnalysisData
4. Foque especialmente em:
   - depoimentos (todos os depoentes com suas fases, contradições, credibilidade)
   - audiências realizadas e futuras
   - testemunhas arroladas e seus papéis
5. Grave o resultado diretamente no Supabase:
   - UPDATE processos SET analysis_data = '{...}', analysis_status = 'completed' WHERE id = ${processoId}
   - UPDATE casos SET analysis_data = '{...}', analysis_status = 'completed' WHERE assistido_id = ${assistidoId}
`.trim();

if (values.dryRun) {
  console.log("[prepare-audiencia] DRY RUN — prompt:");
  console.log(prompt);
  process.exit(0);
}

try {
  const result = execSync(
    `claude -p "${prompt.replace(/"/g, '\\"')}"`,
    {
      cwd: process.cwd(),
      timeout: 600_000, // 10 min
      stdio: ["pipe", "pipe", "pipe"],
      encoding: "utf-8",
    }
  );
  console.log("[prepare-audiencia] Claude Code output:");
  console.log(result);
  console.log("[prepare-audiencia] Analysis completed successfully");
} catch (error) {
  console.error("[prepare-audiencia] Analysis failed:", error.message);
  process.exit(1);
}
