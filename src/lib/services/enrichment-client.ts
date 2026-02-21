/**
 * Enrichment Engine Client
 * Cliente HTTP para comunicar com o serviço Python (Railway).
 *
 * Uso: importar e chamar os métodos nos pontos de integração
 * (PJe Import, Drive Webhook, Plaud Webhook, WhatsApp Webhook)
 */

// === Types ===

export interface EnrichDocumentInput {
  fileUrl: string;
  mimeType: string;
  assistidoId?: number | null;
  processoId?: number | null;
  casoId?: number | null;
  defensorId: string;
}

export interface EnrichDocumentOutput {
  document_type: string;
  extracted_data: Record<string, unknown>;
  entities_created: { type: string; id?: number }[];
  confidence: number;
  markdown_preview: string;
}

export interface EnrichPjeInput {
  rawText: string;
  defensorId: string;
}

export interface IntimacaoEnriquecida {
  numero_processo?: string;
  vara?: string;
  comarca?: string;
  atribuicao?: string;
  intimado?: string;
  reu_principal?: string;
  correus?: string[];
  vitima?: string;
  crime?: string;
  artigos?: string[];
  qualificadoras?: string[];
  fase_processual?: string;
  tipo_documento?: string;
  tipo_prazo?: string;
  data_limite?: string;
  reu_preso?: boolean;
  urgencia?: string;
  confidence?: number;
}

export interface EnrichPjeOutput {
  intimacoes: IntimacaoEnriquecida[];
  processos_atualizados: number[];
  demandas_criadas: number[];
  assistidos_identificados: { nome: string; id_existente?: number; novo?: boolean }[];
  total_processadas: number;
}

export interface EnrichTranscriptInput {
  transcript: string;
  assistidoId: number;
  processoId?: number | null;
  casoId?: number | null;
  context?: string | null;
}

export interface EnrichTranscriptOutput {
  key_points: string[];
  facts: { descricao: string; tipo: string; confidence: number }[];
  persons_mentioned: { nome: string; papel: string }[];
  contradictions: string[];
  suggested_actions: string[];
  urgency_level: "low" | "medium" | "high" | "critical";
  entities_created: { type: string; id?: number }[];
}

export interface EnrichAudienciaInput {
  pautaText: string;
  defensorId: string;
}

export interface EnrichAudienciaOutput {
  audiencias: {
    tipo?: string;
    numero_processo?: string;
    reu?: string;
    data?: string;
    hora?: string;
    sala?: string;
    reu_preso?: boolean;
    confidence?: number;
  }[];
  audiencias_criadas: number[];
  processos_vinculados: number[];
}

export interface EnrichWhatsAppInput {
  message: string;
  contactId: string;
  assistidoId?: number | null;
}

export interface EnrichWhatsAppOutput {
  urgency_level: "low" | "medium" | "high" | "critical";
  subject?: string;
  extracted_info: Record<string, unknown>;
  suggested_response?: string;
  entities_created: { type: string; id?: number }[];
}

export interface EnrichmentHealthResponse {
  status: string;
  version: string;
  docling_available: boolean;
  gemini_configured: boolean;
  supabase_configured: boolean;
}

// === Client ===

class EnrichmentClient {
  private baseUrl: string;
  private apiKey: string;
  private timeout: number;

  constructor() {
    this.baseUrl = process.env.ENRICHMENT_ENGINE_URL || "";
    this.apiKey = process.env.ENRICHMENT_ENGINE_API_KEY || "";
    this.timeout = 60_000; // 60s
  }

  private get isConfigured(): boolean {
    return Boolean(this.baseUrl && this.apiKey);
  }

  private async request<T>(
    endpoint: string,
    body: Record<string, unknown>,
  ): Promise<T> {
    if (!this.isConfigured) {
      throw new Error(
        "Enrichment Engine not configured. Set ENRICHMENT_ENGINE_URL and ENRICHMENT_ENGINE_API_KEY",
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": this.apiKey,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(
          `Enrichment Engine error: ${response.status} — ${errorText}`,
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Enrichment Engine timeout after ${this.timeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // === Public Methods ===

  /**
   * Enriquecer documento do Drive (PDF, DOCX).
   * Chamado pelo: Drive Webhook
   */
  async enrichDocument(input: EnrichDocumentInput): Promise<EnrichDocumentOutput> {
    return this.request<EnrichDocumentOutput>("/enrich/document", {
      file_url: input.fileUrl,
      mime_type: input.mimeType,
      assistido_id: input.assistidoId,
      processo_id: input.processoId,
      caso_id: input.casoId,
      defensor_id: input.defensorId,
    });
  }

  /**
   * Enriquecer texto PJe (extração profunda de intimações).
   * Chamado pelo: PJe Import Modal (via tRPC ou direto)
   */
  async enrichPjeText(input: EnrichPjeInput): Promise<EnrichPjeOutput> {
    return this.request<EnrichPjeOutput>("/enrich/pje-text", {
      raw_text: input.rawText,
      defensor_id: input.defensorId,
    });
  }

  /**
   * Enriquecer transcrição de atendimento.
   * Chamado pelo: Plaud Webhook / Atendimento save
   */
  async enrichTranscript(input: EnrichTranscriptInput): Promise<EnrichTranscriptOutput> {
    return this.request<EnrichTranscriptOutput>("/enrich/transcript", {
      transcript: input.transcript,
      assistido_id: input.assistidoId,
      processo_id: input.processoId,
      caso_id: input.casoId,
      context: input.context,
    });
  }

  /**
   * Enriquecer pauta de audiência.
   * Chamado pelo: Agenda PJe Import
   */
  async enrichAudiencia(input: EnrichAudienciaInput): Promise<EnrichAudienciaOutput> {
    return this.request<EnrichAudienciaOutput>("/enrich/audiencia", {
      pauta_text: input.pautaText,
      defensor_id: input.defensorId,
    });
  }

  /**
   * Triagem de mensagem WhatsApp.
   * Chamado pelo: Evolution API Webhook
   */
  async enrichWhatsApp(input: EnrichWhatsAppInput): Promise<EnrichWhatsAppOutput> {
    return this.request<EnrichWhatsAppOutput>("/enrich/whatsapp", {
      message: input.message,
      contact_id: input.contactId,
      assistido_id: input.assistidoId,
    });
  }

  /**
   * Verificar saúde do serviço.
   * Chamado para: diagnóstico, monitoring
   */
  async healthCheck(): Promise<EnrichmentHealthResponse> {
    if (!this.baseUrl) {
      throw new Error("ENRICHMENT_ENGINE_URL not configured");
    }

    const response = await fetch(`${this.baseUrl}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }

    return (await response.json()) as EnrichmentHealthResponse;
  }

  /**
   * Chamar enriquecimento de forma assíncrona (fire-and-forget).
   * Não bloqueia o fluxo principal — erros são logados mas ignorados.
   */
  async enrichAsync<T>(
    method: () => Promise<T>,
    label: string,
  ): Promise<T | null> {
    if (!this.isConfigured) {
      console.warn(`[Enrichment] Skipped ${label}: not configured`);
      return null;
    }

    try {
      const result = await method();
      console.log(`[Enrichment] ${label}: success`);
      return result;
    } catch (error) {
      console.error(`[Enrichment] ${label}: failed —`, error);
      return null;
    }
  }
}

// Singleton export
export const enrichmentClient = new EnrichmentClient();
