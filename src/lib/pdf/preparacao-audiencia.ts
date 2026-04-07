/**
 * Preparação de Audiência — PDF generator hook (server-only)
 *
 * Spawns the local Python script `scripts/preparacao_audiencia_pdf.py`
 * to render a styled PDF with the atribuição-specific palette and saves
 * it inside the assistido's Drive folder.
 *
 * Environment-gated: only runs when `OMBUDS_LOCAL_PDF=1` and the Drive
 * path env vars resolve to an existing folder. On Vercel (or any env
 * without those vars) this is a no-op that returns `null`.
 */

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

type Atribuicao =
  | "JURI_CAMACARI"
  | "VVD_CAMACARI"
  | "EXECUCAO_PENAL"
  | "SUBSTITUICAO";

const SUBFOLDER_BY_ATRIBUICAO: Record<Atribuicao, string> = {
  JURI_CAMACARI: "Processos - Júri",
  VVD_CAMACARI: "Processos - VVD (Criminal)",
  EXECUCAO_PENAL: "Processos - Execução Penal",
  SUBSTITUICAO: "Processos - Substituição criminal",
};

export interface PreparacaoDepoente {
  nome: string;
  tipo: string;
  endereco?: string | null;
  resumo?: string | null;
  perguntas_sugeridas?: string | null;
  pontos_favoraveis?: string | null;
  pontos_desfavoraveis?: string | null;
  observacoes?: string | null;
}

export interface PreparacaoPdfInput {
  atribuicao: Atribuicao | string | null;
  assistido: string;
  processo: string;
  audiencia: {
    data?: string | Date | null;
    tipo?: string | null;
    local?: string | null;
  };
  resumo_caso?: string | null;
  depoentes: PreparacaoDepoente[];
}

export interface PreparacaoPdfResult {
  pdfPath: string;
  bytes: number;
}

const normalize = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/**
 * Resolve the assistido's Drive folder, trying exact match first, then
 * an accent/case-insensitive scan of the parent dir.
 */
function resolveAssistidoDriveDir(
  drivePath: string,
  atribuicao: string,
  assistidoNome: string,
): string | null {
  const subfolder =
    SUBFOLDER_BY_ATRIBUICAO[atribuicao as Atribuicao] ?? "Processos";
  const parent = join(drivePath, subfolder);
  if (!existsSync(parent)) return null;

  const exact = join(parent, assistidoNome);
  if (existsSync(exact) && statSync(exact).isDirectory()) return exact;

  const target = normalize(assistidoNome);
  try {
    for (const name of readdirSync(parent)) {
      const full = join(parent, name);
      if (!statSync(full).isDirectory()) continue;
      if (normalize(name) === target) return full;
    }
  } catch {
    return null;
  }
  return null;
}

function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Generate the PDF. Returns null when generation is disabled or the
 * Drive folder cannot be resolved (so the caller can keep going).
 */
export async function gerarPreparacaoAudienciaPdf(
  input: PreparacaoPdfInput,
): Promise<PreparacaoPdfResult | null> {
  if (process.env.OMBUDS_LOCAL_PDF !== "1") return null;

  const drivePath =
    process.env.OMBUDS_DRIVE_PATH ??
    process.env.OMBUDS_DRIVE_BASE ??
    null;
  if (!drivePath || !existsSync(drivePath)) return null;

  const atribuicao = (input.atribuicao || "SUBSTITUICAO").toString();
  const assistidoDir = resolveAssistidoDriveDir(
    drivePath,
    atribuicao,
    input.assistido,
  );
  if (!assistidoDir) return null;

  const scriptPath =
    process.env.OMBUDS_PREPARACAO_PDF_SCRIPT ??
    join(process.cwd(), "scripts", "preparacao_audiencia_pdf.py");
  if (!existsSync(scriptPath)) return null;

  // Normalize the audiência data field to ISO so the Python script can parse.
  const audienciaData = input.audiencia.data
    ? input.audiencia.data instanceof Date
      ? input.audiencia.data.toISOString()
      : new Date(input.audiencia.data).toISOString()
    : null;

  const payload = {
    atribuicao,
    assistido: input.assistido,
    processo: input.processo,
    audiencia: {
      data: audienciaData,
      tipo: input.audiencia.tipo ?? "—",
      local: input.audiencia.local ?? "—",
    },
    resumo_caso: input.resumo_caso ?? "",
    depoentes: input.depoentes,
  };

  const tmpDir = mkdtempSync(join(tmpdir(), "ombuds-prep-"));
  const inputJsonPath = join(tmpDir, "input.json");
  writeFileSync(inputJsonPath, JSON.stringify(payload), "utf-8");

  const safeAssistido = input.assistido.replace(/[\\/:*?"<>|]/g, "").trim();
  const outputPdfPath = join(
    assistidoDir,
    `Preparacao Audiencia - ${safeAssistido} - ${todayStamp()}.pdf`,
  );

  const result: PreparacaoPdfResult | null = await new Promise((resolve) => {
    const child = spawn("python3", [scriptPath, inputJsonPath, outputPdfPath], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", (err) => {
      console.warn("[preparacao-pdf] spawn error:", err.message);
      resolve(null);
    });
    child.on("close", (code) => {
      if (code !== 0) {
        console.warn(`[preparacao-pdf] python exit ${code}: ${stderr.slice(0, 400)}`);
        resolve(null);
        return;
      }
      try {
        const bytes = statSync(outputPdfPath).size;
        resolve({ pdfPath: outputPdfPath, bytes });
      } catch {
        resolve(null);
      }
    });
  });

  return result;
}
