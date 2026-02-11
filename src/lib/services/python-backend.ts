/**
 * Serviço de Integração com Backend Python
 *
 * Comunicação com o backend de IA (Docling + LangChain)
 * para processamento de documentos e análises estratégicas.
 */

import { env } from "@/lib/env";

// ==========================================
// TIPOS
// ==========================================

export interface ExtractRequest {
  drive_file_id: string;
  file_name: string;
}

export interface ExtractResponse {
  success: boolean;
  content_markdown?: string;
  tables?: Array<{
    headers: string[];
    rows: unknown[][];
    shape: [number, number];
  }>;
  metadata?: {
    pages: number;
    tables_count: number;
    images_count: number;
    format: string;
  };
  error?: string;
}

export interface AnalyzeRequest {
  content: string;
  atribuicao: "JURI" | "VVD" | "EP" | "CRIMINAL";
  assistido_id?: number;
  processo_id?: number;
  caso_id?: number;
}

export interface AnalyzeResponse {
  success: boolean;
  analysis?: {
    // Júri
    radar_liberdade?: {
      status: string;
      urgencia: string;
      acoes_sugeridas: string[];
    };
    saneamento?: {
      pendencias: string[];
      status: string;
    };
    nulidades?: Array<{
      tipo: string;
      fundamento: string;
      consequencia: string;
    }>;
    laudos?: {
      presentes: string[];
      ausentes: string[];
      quesitos: string[];
    };
    osint?: {
      linhas_investigacao: string[];
      testemunhas_sugeridas: string[];
      provas_buscar: string[];
    };
    matriz?: Array<{
      fato: string;
      versao_acusacao: string;
      versao_defesa: string;
      contradicoes: string[];
    }>;
    tese?: {
      principal: string;
      fundamento_fatico: string;
      fundamento_juridico: string;
    };
    subsidiarias?: string[];
    desclassificacao?: {
      possivel: boolean;
      para_crime: string;
      fundamento: string;
    };
    quesitos?: string[];

    // VVD
    painel_controle?: {
      fase_processual: string;
      proximo_ato: string;
      prazos: string[];
      medidas_protetivas: {
        vigentes: boolean;
        tipos: string[];
        data_concessao: string;
        possibilidade_revogacao: string;
      };
      status_acusado: {
        situacao: string;
        detalhes: string;
      };
    };
    prescricao?: {
      data_fato: string;
      crimes: string[];
      pena_maxima_abstrato: string;
      prazo_prescricional: string;
      data_limite: string;
      risco: string;
      marcos_interruptivos: Array<{
        evento: string;
        data: string;
      }>;
    };
    perfil_acusado?: Record<string, unknown>;
    perfil_vitima?: Record<string, unknown>;
    acusacao?: Record<string, unknown>;
    estrategia?: Record<string, unknown>;

    // Metadata
    _metadata?: {
      assistido_id?: number;
      processo_id?: number;
      caso_id?: number;
      atribuicao: string;
      model: string;
    };
  };
  error?: string;
}

export interface EnrichRequest {
  entity_type: "assistido" | "processo" | "caso";
  entity_id: number;
  content: string;
}

export interface EnrichResponse {
  success: boolean;
  suggestions?: {
    // Assistido
    nome_completo?: string;
    cpf?: string;
    rg?: string;
    data_nascimento?: string;
    filiacao_mae?: string;
    filiacao_pai?: string;
    endereco?: string;
    telefone?: string;
    profissao?: string;
    escolaridade?: string;
    estado_civil?: string;
    naturalidade?: string;
    status_prisional?: string;
    local_prisao?: string;
    data_prisao?: string;

    // Processo
    numero?: string;
    vara?: string;
    comarca?: string;
    juiz?: string;
    promotor?: string;
    crimes?: string[];
    partes?: Array<{ nome: string; papel: string }>;
    data_fato?: string;
    fase_processual?: string;
  };
  confidence?: number;
  error?: string;
}

export interface PrepareAudienciaRequest {
  evento_id: number;
  atribuicao: string;
  documentos: string[];
}

export interface PrepareAudienciaResponse {
  success: boolean;
  briefing?: {
    resumo_fatos: {
      data_fato: string;
      local: string;
      narrativa_acusacao: string;
      narrativa_defesa: string;
      pontos_controvertidos: string[];
    };
    testemunhas: Array<{
      nome: string;
      papel: string;
      relacao_fatos: string;
      pontos_fortes: string[];
      pontos_fracos: string[];
      perguntas_sugeridas: Array<{
        pergunta: string;
        objetivo: string;
        armadilha: string;
      }>;
    }>;
    comparativo_depoimentos: {
      matriz: Array<{
        fato: string;
        versoes: Array<{ fonte: string; versao: string }>;
        contradicao: boolean;
        relevancia: string;
      }>;
    };
    estrategia: {
      tese_principal: string;
      teses_subsidiarias: string[];
      provas_favoraveis: string[];
      provas_desfavoraveis: string[];
      linha_argumentativa: string;
    };
    riscos: Array<{
      descricao: string;
      probabilidade: string;
      mitigacao: string;
    }>;
    pontos_atencao: string[];
    requerimentos: Array<{
      tipo: string;
      descricao: string;
      fundamento: string;
    }>;
  };
  error?: string;
}

// ==========================================
// CLIENTE
// ==========================================

class PythonBackendClient {
  private baseUrl: string;

  constructor() {
    // URL do backend Python (Railway em produção, localhost em dev)
    this.baseUrl = env.PYTHON_BACKEND_URL || "http://localhost:8000";
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Python Backend Error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Health check do backend
   */
  async health(): Promise<{
    status: string;
    environment: string;
    docling: string;
    agno: string;
    gemini: boolean;
    database: boolean;
  }> {
    return this.request("/health");
  }

  /**
   * Extrai conteúdo de documento do Google Drive
   */
  async extractFromDrive(
    driveFileId: string,
    fileName: string
  ): Promise<ExtractResponse> {
    return this.request<ExtractResponse>("/extract", {
      method: "POST",
      body: JSON.stringify({
        drive_file_id: driveFileId,
        file_name: fileName,
      } satisfies ExtractRequest),
    });
  }

  /**
   * Extrai conteúdo de documento via upload
   */
  async extractFromUpload(file: File): Promise<ExtractResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${this.baseUrl}/extract/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Python Backend Error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Análise estratégica para Júri
   */
  async analyzeJuri(
    content: string,
    options?: {
      assistidoId?: number;
      processoId?: number;
      casoId?: number;
    }
  ): Promise<AnalyzeResponse> {
    return this.request<AnalyzeResponse>("/analyze/juri", {
      method: "POST",
      body: JSON.stringify({
        content,
        atribuicao: "JURI",
        assistido_id: options?.assistidoId,
        processo_id: options?.processoId,
        caso_id: options?.casoId,
      } satisfies AnalyzeRequest),
    });
  }

  /**
   * Análise estratégica para VVD
   */
  async analyzeVVD(
    content: string,
    options?: {
      assistidoId?: number;
      processoId?: number;
      casoId?: number;
    }
  ): Promise<AnalyzeResponse> {
    return this.request<AnalyzeResponse>("/analyze/vvd", {
      method: "POST",
      body: JSON.stringify({
        content,
        atribuicao: "VVD",
        assistido_id: options?.assistidoId,
        processo_id: options?.processoId,
        caso_id: options?.casoId,
      } satisfies AnalyzeRequest),
    });
  }

  /**
   * Extrai dados para preencher Assistido
   */
  async enrichAssistido(
    content: string,
    assistidoId: number
  ): Promise<EnrichResponse> {
    return this.request<EnrichResponse>("/enrich/assistido", {
      method: "POST",
      body: JSON.stringify({
        entity_type: "assistido",
        entity_id: assistidoId,
        content,
      } satisfies EnrichRequest),
    });
  }

  /**
   * Extrai dados para preencher Processo
   */
  async enrichProcesso(
    content: string,
    processoId: number
  ): Promise<EnrichResponse> {
    return this.request<EnrichResponse>("/enrich/processo", {
      method: "POST",
      body: JSON.stringify({
        entity_type: "processo",
        entity_id: processoId,
        content,
      } satisfies EnrichRequest),
    });
  }

  /**
   * Prepara briefing completo para audiência
   */
  async prepareAudiencia(
    eventoId: number,
    atribuicao: string,
    documentos: string[]
  ): Promise<PrepareAudienciaResponse> {
    return this.request<PrepareAudienciaResponse>("/prepare/audiencia", {
      method: "POST",
      body: JSON.stringify({
        evento_id: eventoId,
        atribuicao,
        documentos,
      } satisfies PrepareAudienciaRequest),
    });
  }
}

// Singleton
export const pythonBackend = new PythonBackendClient();

// ==========================================
// HELPERS
// ==========================================

/**
 * Verifica se o backend Python está disponível
 */
export async function isPythonBackendAvailable(): Promise<boolean> {
  try {
    const health = await pythonBackend.health();
    return health.status === "healthy";
  } catch {
    return false;
  }
}

/**
 * Processa documento do Drive e retorna conteúdo extraído
 */
export async function processDocumentFromDrive(
  driveFileId: string,
  fileName: string
): Promise<{
  markdown: string;
  tables: ExtractResponse["tables"];
  metadata: ExtractResponse["metadata"];
}> {
  const result = await pythonBackend.extractFromDrive(driveFileId, fileName);

  if (!result.success) {
    throw new Error(result.error || "Falha na extração do documento");
  }

  return {
    markdown: result.content_markdown || "",
    tables: result.tables,
    metadata: result.metadata,
  };
}

/**
 * Analisa caso e retorna estratégia
 */
export async function analyzeCase(
  content: string,
  atribuicao: "JURI" | "VVD",
  options?: {
    assistidoId?: number;
    processoId?: number;
    casoId?: number;
  }
): Promise<AnalyzeResponse["analysis"]> {
  const result =
    atribuicao === "JURI"
      ? await pythonBackend.analyzeJuri(content, options)
      : await pythonBackend.analyzeVVD(content, options);

  if (!result.success) {
    throw new Error(result.error || "Falha na análise do caso");
  }

  return result.analysis;
}
