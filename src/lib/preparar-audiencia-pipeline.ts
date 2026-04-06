/**
 * Pipeline de preparação de audiências.
 * 5 etapas sequenciais por audiência:
 * 1. Download autos do PJe (CDP)
 * 2. Upload para Google Drive
 * 3. Análise via Claude Code (Mac Mini)
 * 4. Popular testemunhas
 * 5. Verificar intimação dos depoentes
 */

export type PipelineStep =
  | "download_pje"
  | "upload_drive"
  | "analise_claude"
  | "popular_testemunhas"
  | "verificar_intimacao";

export interface PipelineProgress {
  audienciaId: number;
  assistidoNome: string;
  currentStep: PipelineStep;
  stepIndex: number;    // 0-4
  totalSteps: 5;
  status: "running" | "completed" | "error";
  error?: string;
  testemunhasCount?: number;
  naoIntimadas?: number;
}

export interface PipelineResult {
  audienciaId: number;
  assistidoNome: string;
  success: boolean;
  error?: string;
  testemunhas: Array<{
    nome: string;
    tipo: string;
    status: string;
  }>;
  naoIntimadas: Array<{
    nome: string;
    status: string;
    movimentacao?: string;
  }>;
}

export const PIPELINE_STEPS: Array<{
  key: PipelineStep;
  label: string;
}> = [
  { key: "download_pje", label: "Baixando autos do PJe" },
  { key: "upload_drive", label: "Enviando para o Drive" },
  { key: "analise_claude", label: "Analisando com Claude Code" },
  { key: "popular_testemunhas", label: "Identificando testemunhas" },
  { key: "verificar_intimacao", label: "Verificando intimação" },
];

export function getNextStep(status: {
  hasAutos: boolean;
  hasDriveFiles: boolean;
  hasAnalysis: boolean;
  hasTestemunhas: boolean;
  hasIntimacaoCheck: boolean;
}): PipelineStep | null {
  if (!status.hasAutos) return "download_pje";
  if (!status.hasDriveFiles) return "upload_drive";
  if (!status.hasAnalysis) return "analise_claude";
  if (!status.hasTestemunhas) return "popular_testemunhas";
  if (!status.hasIntimacaoCheck) return "verificar_intimacao";
  return null;
}
