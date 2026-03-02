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
  solar_configured: boolean;
  transcription_configured: boolean;
}

// === Transcription Types (Whisper + pyannote) ===

export interface TranscribeInput {
  fileUrl: string;
  fileName?: string;
  language?: string;
  diarize?: boolean;
  expectedSpeakers?: number | null;
  /** Bearer token para download autenticado (ex: Google Drive API) */
  authHeader?: string;
}

export interface TranscribeSegment {
  start: number;
  end: number;
  text: string;
  speaker: string;
}

export interface TranscribeOutput {
  transcript: string;
  transcript_plain: string;
  segments: TranscribeSegment[];
  speakers: string[];
  duration: number;
  language: string;
  confidence: number;
  diarization_applied: boolean;
}

// === Solar Types ===

export interface SolarSyncInput {
  numeroProcesso: string;
  processoId?: number | null;
  assistidoId?: number | null;
  casoId?: number | null;
  downloadPdfs?: boolean;
}

export interface SolarPdfDownload {
  filename: string;
  content_base64: string;
  mime_type: string;
  tipo_documento?: string;
}

export interface SolarSyncOutput {
  success: boolean;
  numero_processo: string;
  processo_data: Record<string, unknown>;
  movimentacoes_encontradas: number;
  movimentacoes_novas: number;
  documentos_baixados: number;
  anotacoes_criadas: { type: string; id?: number; movimentacao_tipo?: string }[];
  case_facts_criados: { type: string; id?: number }[];
  pdfs: SolarPdfDownload[];
  errors: string[];
}

export interface SolarBatchInput {
  processos: SolarSyncInput[];
  maxConcurrent?: number;
}

export interface SolarBatchOutput {
  total: number;
  succeeded: number;
  failed: number;
  results: SolarSyncOutput[];
}

export interface SolarAvisosOutput {
  avisos: {
    tipo?: string;
    numero_processo?: string;
    descricao?: string;
    data_publicacao?: string;
    prazo?: string;
    lido: boolean;
    ombuds_processo_id?: number;
    ombuds_assistido_id?: number;
  }[];
  total: number;
  error?: string;
}

export interface SolarStatusOutput {
  configured: boolean;
  authenticated: boolean;
  session_age_seconds: number | null;
  solar_reachable: boolean;
  selectors_mapped: boolean;
  unmapped_selectors: string[];
}

export interface SolarNomeSyncOutput {
  success: boolean;
  nome: string;
  processos_encontrados: number;
  processos: {
    numero?: string;
    grau?: number;
    classe?: string;
    vara?: string;
    comarca?: string;
    area?: string;
    atendimento_id?: string | null;
  }[];
  errors: string[];
}

export interface SolarCadastrarOutput {
  success: boolean;
  cadastrado: boolean;
  ja_existia: boolean;
  numero: string;
  atendimento_id?: string | null;
  url_pos_cadastro?: string | null;
  error?: string | null;
}

// === Solar Write Types (OMBUDS -> Solar) ===

export interface SolarAnotacaoToSync {
  id: number;
  processoId?: number | null;
  numeroAutos?: string | null;
  conteudo: string;
  tipo: string;
  createdAt: string;
}

export interface SolarSyncToInput {
  assistidoId: number;
  anotacoes: SolarAnotacaoToSync[];
  modo?: "fase" | "anotacao" | "auto";
  dryRun?: boolean;
}

export interface SolarSyncToDetalhe {
  anotacao_id: number;
  status: "created" | "skipped" | "failed" | "dry_run";
  solar_fase_id?: string | null;
  error?: string | null;
  reason?: string | null;
  requires_discovery?: boolean;
}

export interface SolarSyncToOutput {
  success: boolean;
  fases_criadas: number;
  fases_skipped: number;
  fases_falhadas: number;
  total: number;
  dry_run: boolean;
  erros: string[];
  detalhes: SolarSyncToDetalhe[];
}

// === Solar Anotação Types ===

export interface SolarCriarAnotacaoInput {
  atendimentoId: string;
  texto: string;
  qualificacaoId?: number;
  dryRun?: boolean;
}

export interface SolarCriarAnotacaoOutput {
  success: boolean;
  message: string;
  hash?: string | null;
  dry_run: boolean;
  verified: boolean;
  verificacao_msg?: string | null;
  screenshots: string[];
}

// === Upload Documento (Protocolar) ===

export interface SolarUploadDocumentoInput {
  atendimentoId: string;
  numeroProcesso: string;
  filePath: string;
  nomeArquivo?: string;
  criarFase?: boolean;
  faseTipoId?: number;
  faseDescricao?: string;
  grau?: number;
  dryRun?: boolean;
}

export interface SolarUploadDocumentoOutput {
  success: boolean;
  message: string;
  hash?: string | null;
  dry_run: boolean;
  verified: boolean;
  verificacao_msg?: string | null;
  fase_result?: Record<string, unknown> | null;
  file_size_mb?: number | null;
  error?: string | null;
  screenshots: string[];
}

// === SIGAD Types ===

export interface SigadObservacao {
  data?: string | null;
  defensor?: string | null;
  tipo?: string | null;
  texto?: string | null;
}

export interface SigadEnriquecerDados {
  nomeMae?: string | null;
  dataNascimento?: string | null;
  naturalidade?: string | null;
  telefone?: string | null;
}

export interface SigadExportarOutput {
  success: boolean;
  encontrado_sigad: boolean;
  ja_existia_solar: boolean;
  // Verificação processo
  verificacao_processo?: boolean | null;
  sigad_processo?: string | null;    // número do processo no SIGAD
  vara?: string | null;              // vara extraída do painel de detalhe
  // Histórico de atendimentos
  observacoes?: SigadObservacao[];
  // Enriquecimento reverso
  dados_para_enriquecer?: SigadEnriquecerDados | null;
  // Links e identificadores
  solar_url?: string | null;
  sigad_id?: string | null;
  nome_sigad?: string | null;
  message?: string | null;
  error?: string | null;
}

export interface SigadBuscarOutput {
  success: boolean;
  encontrado: boolean;
  sigad_id?: string | null;
  nome?: string | null;
  cpf?: string | null;
  data_nascimento?: string | null;
  triagem?: string | null;
  cidade?: string | null;
  error?: string | null;
}

// === Intelligence / Consolidation Types ===

export interface ConsolidationInput {
  assistidoId?: number | null;
  processoId?: number | null;
  documents: Record<string, unknown>[];
  transcripts: Record<string, unknown>[];
  demandas: Record<string, unknown>[];
  context?: Record<string, unknown> | null;
}

export interface ConsolidationTese {
  titulo: string;
  fundamentacao: string;
  confidence: number;
}

export interface ConsolidationNulidade {
  tipo: string;
  descricao: string;
  severidade: "alta" | "media" | "baixa";
  fundamentacao: string;
  documento_ref?: string | null;
}

export interface ConsolidationPessoa {
  nome: string;
  tipo: string;
  descricao?: string | null;
  documentos_ref: string[];
  relevancia_defesa?: string | null;
  confidence: number;
}

export interface ConsolidationEvento {
  data?: string | null;
  descricao: string;
  tipo: string;
  documento_ref?: string | null;
  relevancia: string;
}

export interface ConsolidationAcusacao {
  crime: string;
  artigos: string[];
  qualificadoras: string[];
  reu?: string | null;
  status?: string | null;
}

export interface ConsolidationOutput {
  resumo: string;
  achados_chave: string[];
  recomendacoes: string[];
  inconsistencias: string[];
  teses: ConsolidationTese[];
  nulidades: ConsolidationNulidade[];
  pessoas: ConsolidationPessoa[];
  cronologia: ConsolidationEvento[];
  acusacoes: ConsolidationAcusacao[];
  lacunas: string[];
  urgencias: string[];
  confidence: number;
  total_documentos: number;
  total_transcricoes: number;
  total_demandas: number;
}

// === Semantic Search Types ===

export interface SemanticSearchInput {
  query: string;
  filters?: {
    assistido_id?: number;
    processo_id?: number;
    entity_types?: string[];
  };
  limit?: number;
}

export interface SearchResultItem {
  entity_type: string;
  entity_id: number;
  assistido_id: number | null;
  processo_id: number | null;
  chunk_index: number;
  content_text: string;
  score: number;
  metadata: Record<string, unknown>;
}

export interface SemanticSearchOutput {
  results: SearchResultItem[];
  total: number;
  query: string;
}

// === OCR Types ===

export interface OcrOutput {
  pages: { page_number: number; text: string }[];
  total_pages: number;
  ocr_engine: string;
  processing_time_ms: number;
}

// === Ficha Types ===

export interface GenerateFichaInput {
  sectionText: string;
  sectionTipo: string;
  sectionTitulo?: string;
}

export interface GenerateFichaOutput {
  ficha_data: Record<string, unknown>;
  section_tipo: string;
  confidence: number;
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
   * Transcrever arquivo de áudio/vídeo (Whisper + pyannote).
   * Chamado pelo: tRPC solar.transcreverDrive
   */
  async transcribe(input: TranscribeInput): Promise<TranscribeOutput> {
    // Transcription via Gemini can take 10+ min for large files (190MB+)
    // Pipeline: download file + upload to Gemini File API + process + generate
    const originalTimeout = this.timeout;
    this.timeout = 600_000; // 10 min
    try {
      return await this.request<TranscribeOutput>("/api/transcribe", {
        file_url: input.fileUrl,
        file_name: input.fileName ?? "audio.mp3",
        language: input.language ?? "pt",
        diarize: input.diarize ?? true,
        expected_speakers: input.expectedSpeakers ?? null,
        auth_header: input.authHeader ?? null,
      });
    } finally {
      this.timeout = originalTimeout;
    }
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

  // === Solar Methods ===

  /**
   * Sincronizar um processo via Solar (DPEBA).
   * Chamado pelo: tRPC solar.syncProcesso
   */
  async solarSyncProcesso(input: SolarSyncInput): Promise<SolarSyncOutput> {
    return this.request<SolarSyncOutput>("/solar/sync-processo", {
      numero_processo: input.numeroProcesso,
      processo_id: input.processoId,
      assistido_id: input.assistidoId,
      caso_id: input.casoId,
      download_pdfs: input.downloadPdfs ?? true,
    });
  }

  /**
   * Sincronizar múltiplos processos via Solar (max 20).
   * Chamado pelo: tRPC solar.syncBatch
   */
  async solarSyncBatch(input: SolarBatchInput): Promise<SolarBatchOutput> {
    return this.request<SolarBatchOutput>("/solar/sync-batch", {
      processos: input.processos.map((p) => ({
        numero_processo: p.numeroProcesso,
        processo_id: p.processoId,
        assistido_id: p.assistidoId,
        caso_id: p.casoId,
        download_pdfs: p.downloadPdfs ?? true,
      })),
      max_concurrent: input.maxConcurrent ?? 1,
    });
  }

  /**
   * Listar avisos pendentes do Solar (intimações PJe/SEEU).
   * Chamado pelo: tRPC solar.avisos
   */
  async solarAvisos(): Promise<SolarAvisosOutput> {
    return this.request<SolarAvisosOutput>("/solar/avisos", {});
  }

  /**
   * Status da integração Solar.
   * Chamado pelo: tRPC solar.status
   */
  async solarStatus(): Promise<SolarStatusOutput> {
    if (!this.baseUrl) {
      throw new Error("ENRICHMENT_ENGINE_URL not configured");
    }

    const response = await fetch(`${this.baseUrl}/solar/status`, {
      method: "GET",
      headers: { "X-API-Key": this.apiKey },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new Error(`Solar status check failed: ${response.status}`);
    }

    return (await response.json()) as SolarStatusOutput;
  }

  /**
   * Buscar todos os processos de um defensor pelo nome no Solar.
   * Chamado pelo: tRPC solar.syncPorNome
   */
  async solarSyncPorNome(input: {
    nome: string;
    syncMovimentacoes?: boolean;
  }): Promise<SolarNomeSyncOutput> {
    return this.request<SolarNomeSyncOutput>("/solar/sync-por-nome", {
      nome: input.nome,
      sync_movimentacoes: input.syncMovimentacoes ?? false,
    });
  }

  /**
   * Cadastrar um processo no Solar (se ainda não existir).
   * Chamado pelo: tRPC solar.cadastrarNoSolar
   */
  async solarCadastrarProcesso(input: {
    numeroProcesso: string;
    grau?: number;
  }): Promise<SolarCadastrarOutput> {
    return this.request<SolarCadastrarOutput>("/solar/cadastrar-processo", {
      numero_processo: input.numeroProcesso,
      grau: input.grau ?? 1,
    });
  }

  /**
   * Sincronizar anotacoes do OMBUDS como Fases Processuais no Solar.
   * Chamado pelo: tRPC solar.sincronizarComSolar
   */
  async solarSyncTo(input: SolarSyncToInput): Promise<SolarSyncToOutput> {
    return this.request<SolarSyncToOutput>("/solar/sync-to-solar", {
      assistido_id: input.assistidoId,
      anotacoes: input.anotacoes.map((a) => ({
        id: a.id,
        processo_id: a.processoId ?? null,
        numero_autos: a.numeroAutos ?? null,
        conteudo: a.conteudo,
        tipo: a.tipo,
        created_at: a.createdAt,
      })),
      modo: input.modo ?? "auto",
      dry_run: input.dryRun ?? false,
    });
  }

  /**
   * Criar anotação simples no Histórico de um atendimento Solar.
   * Alternativa mais leve que solarSyncTo para notas rápidas.
   */
  async solarCriarAnotacao(
    input: SolarCriarAnotacaoInput,
  ): Promise<SolarCriarAnotacaoOutput> {
    return this.request<SolarCriarAnotacaoOutput>("/solar/criar-anotacao", {
      atendimento_id: input.atendimentoId,
      texto: input.texto,
      qualificacao_id: input.qualificacaoId ?? 302,
      dry_run: input.dryRun ?? false,
    });
  }

  // === Upload Documento (Protocolar) ===

  /**
   * Upload de documento (PDF) ao Solar para protocolo.
   * Solar protocola automaticamente no PJe via integracao nativa.
   * Opcionalmente cria fase processual (Peticao, Recurso, etc.)
   */
  async solarUploadDocument(
    input: SolarUploadDocumentoInput,
  ): Promise<SolarUploadDocumentoOutput> {
    return this.request<SolarUploadDocumentoOutput>("/solar/upload-document", {
      atendimento_id: input.atendimentoId,
      numero_processo: input.numeroProcesso,
      file_path: input.filePath,
      nome_arquivo: input.nomeArquivo ?? null,
      criar_fase: input.criarFase ?? true,
      fase_tipo_id: input.faseTipoId ?? 1,
      fase_descricao: input.faseDescricao ?? "",
      grau: input.grau ?? 1,
      dry_run: input.dryRun ?? false,
    });
  }

  // === SIGAD Methods ===

  /**
   * Exportar assistido do SIGAD para o Solar pelo CPF.
   * Inclui verificação cruzada de número de processo e enriquecimento de dados.
   * Chamado pelo: tRPC solar.exportarViaSigad
   */
  async sigadExportarAssistido(input: {
    cpf: string;
    ombudsAssistidoId?: number | null;
    numerosProcessoOmbuds?: string[];
  }): Promise<SigadExportarOutput> {
    return this.request<SigadExportarOutput>("/sigad/exportar-assistido", {
      cpf: input.cpf,
      ombuds_assistido_id: input.ombudsAssistidoId ?? null,
      numeros_processo_ombuds: input.numerosProcessoOmbuds ?? null,
    });
  }

  /**
   * Buscar assistido no SIGAD pelo CPF (sem exportar).
   * Chamado pelo: tRPC solar.buscarNoSigad
   */
  async sigadBuscarAssistido(input: { cpf: string }): Promise<SigadBuscarOutput> {
    return this.request<SigadBuscarOutput>("/sigad/buscar-assistido", {
      cpf: input.cpf,
    });
  }

  // === Intelligence / Consolidation Methods ===

  /**
   * Consolidar enrichments de multiplos documentos em analise sintetica.
   * Chamado pelo: tRPC intelligence.generate
   */
  async consolidateCase(input: ConsolidationInput): Promise<ConsolidationOutput> {
    return this.request<ConsolidationOutput>("/enrich/consolidate", {
      assistido_id: input.assistidoId,
      processo_id: input.processoId,
      documents: input.documents,
      transcripts: input.transcripts,
      demandas: input.demandas,
      context: input.context,
    });
  }

  // === Semantic Search Methods ===

  /**
   * Busca semântica via pgvector (embeddings).
   * Chamado pelo: tRPC search.semantic
   */
  async semanticSearch(input: SemanticSearchInput): Promise<SemanticSearchOutput> {
    return this.request<SemanticSearchOutput>("/search/semantic", {
      query: input.query,
      filters: input.filters || {},
      limit: input.limit || 20,
    });
  }

  /**
   * OCR: extrair texto de PDFs digitalizados via Tesseract.
   * Chamado pelo: Inngest pipeline quando detectNeedsOcr retorna true
   */
  async ocr(input: { fileUrl: string; driveFileId: string }): Promise<OcrOutput> {
    return this.request<OcrOutput>("/api/ocr", {
      file_url: input.fileUrl,
      drive_file_id: input.driveFileId,
    });
  }

  // === Ficha Methods ===

  /**
   * Gerar ficha tipo-específica para seção aprovada.
   * Chamado pelo: Inngest function section/generate-ficha
   */
  async generateFicha(input: GenerateFichaInput): Promise<GenerateFichaOutput> {
    // Ficha generation can take up to 2 min for large sections
    const originalTimeout = this.timeout;
    this.timeout = 120_000;
    try {
      return await this.request<GenerateFichaOutput>("/enrich/ficha", {
        section_text: input.sectionText,
        section_tipo: input.sectionTipo,
        section_titulo: input.sectionTitulo ?? "",
      });
    } finally {
      this.timeout = originalTimeout;
    }
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
