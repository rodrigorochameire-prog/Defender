"""
Pydantic models para Input/Output de todos os endpoints.
Validação estrita — rejeita campos extras.
"""

from pydantic import BaseModel, Field
from enum import Enum


# === Enums ===

class EnrichmentStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    ENRICHED = "enriched"
    FAILED = "failed"


class UrgencyLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class FactType(str, Enum):
    CONTROVERSO = "controverso"
    INCONTROVERSO = "incontroverso"


class PersonRole(str, Enum):
    TESTEMUNHA = "testemunha"
    CORREU = "correu"
    VITIMA = "vitima"
    FAMILIAR = "familiar"
    POLICIAL = "policial"
    PERITO = "perito"
    OUTRO = "outro"


# ==========================================
# TAXONOMY v2 — mirrored from TypeScript pdf-classifier.ts
# Source of truth: src/lib/services/pdf-classifier.ts
# ==========================================

SECTION_TIPOS = [
    # CRITICO (vermelho) — impacto direto na defesa
    "denuncia", "sentenca", "depoimento_vitima", "depoimento_testemunha", "depoimento_investigado",
    # ALTO (laranja) — analise obrigatoria
    "decisao", "pronuncia", "laudo_pericial", "laudo_necroscopico", "laudo_local",
    "ata_audiencia", "interrogatorio", "alegacoes_mp", "alegacoes_defesa",
    "resposta_acusacao", "recurso", "habeas_corpus",
    # MEDIO (azul) — contexto investigativo
    "boletim_ocorrencia", "portaria_ip", "relatorio_policial", "auto_prisao",
    "termo_inquerito", "certidao_relevante", "diligencias_422", "alegacoes",
    # BAIXO (cinza) — referencia
    "documento_identidade", "outros",
    # OCULTO — burocracia
    "burocracia",
]

TIPO_RELEVANCIA: dict[str, str] = {
    "denuncia": "critico", "sentenca": "critico",
    "depoimento_vitima": "critico", "depoimento_testemunha": "critico",
    "depoimento_investigado": "critico",
    "decisao": "alto", "pronuncia": "alto",
    "laudo_pericial": "alto", "laudo_necroscopico": "alto", "laudo_local": "alto",
    "ata_audiencia": "alto", "interrogatorio": "alto",
    "alegacoes_mp": "alto", "alegacoes_defesa": "alto",
    "resposta_acusacao": "alto", "recurso": "alto", "habeas_corpus": "alto",
    "boletim_ocorrencia": "medio", "portaria_ip": "medio",
    "relatorio_policial": "medio", "auto_prisao": "medio",
    "termo_inquerito": "medio", "certidao_relevante": "medio",
    "diligencias_422": "medio", "alegacoes": "medio",
    "documento_identidade": "baixo", "outros": "baixo",
    "burocracia": "oculto",
}

SECTION_GROUPS: dict[str, dict] = {
    "depoimentos": {
        "label": "Depoimentos e Interrogatórios",
        "tipos": ["depoimento_vitima", "depoimento_testemunha", "depoimento_investigado", "interrogatorio"],
    },
    "laudos": {
        "label": "Laudos e Perícias",
        "tipos": ["laudo_pericial", "laudo_necroscopico", "laudo_local"],
    },
    "decisoes": {
        "label": "Decisões Judiciais",
        "tipos": ["decisao", "sentenca", "pronuncia"],
    },
    "defesa": {
        "label": "Manifestações da Defesa",
        "tipos": ["alegacoes_defesa", "resposta_acusacao", "recurso", "habeas_corpus"],
    },
    "mp": {
        "label": "Manifestações do MP",
        "tipos": ["denuncia", "alegacoes_mp", "alegacoes"],
    },
    "investigacao": {
        "label": "Investigação Policial",
        "tipos": ["relatorio_policial", "portaria_ip", "auto_prisao", "termo_inquerito", "boletim_ocorrencia", "diligencias_422"],
    },
    "audiencias": {
        "label": "Audiências",
        "tipos": ["ata_audiencia"],
    },
    "documentos": {
        "label": "Documentos e Certidões",
        "tipos": ["certidao_relevante", "documento_identidade"],
    },
    "outros": {
        "label": "Outros",
        "tipos": ["outros"],
    },
    "burocracia": {
        "label": "Burocracia",
        "tipos": ["burocracia"],
    },
}

# Reverse map: tipo -> group key
TIPO_TO_GROUP: dict[str, str] = {}
for _group_key, _group_data in SECTION_GROUPS.items():
    for _tipo in _group_data["tipos"]:
        TIPO_TO_GROUP[_tipo] = _group_key


# === Document ===

class DocumentInput(BaseModel):
    """Input para /enrich/document — documento do Drive."""
    file_url: str = Field(..., description="URL signed do arquivo")
    mime_type: str = Field(..., description="MIME type (application/pdf, etc)")
    assistido_id: int | None = Field(None, description="ID do assistido vinculado")
    processo_id: int | None = Field(None, description="ID do processo vinculado")
    caso_id: int | None = Field(None, description="ID do caso vinculado")
    document_id: int | None = Field(None, description="ID do documento no OMBUDS (para indexação semântica)")
    defensor_id: str = Field(..., description="ID do defensor")


class DocumentOutput(BaseModel):
    """Output de /enrich/document."""
    document_type: str = Field(..., description="Taxonomy v2: denuncia, sentenca, depoimento_vitima, decisao, laudo_pericial, etc. (27 tipos)")
    extracted_data: dict = Field(default_factory=dict, description="JSON estruturado por tipo")
    entities_created: list[dict] = Field(default_factory=list, description="Entidades criadas/atualizadas")
    confidence: float = Field(..., ge=0, le=1, description="Score de confiança da extração")
    markdown_preview: str = Field("", description="Preview do Markdown gerado pelo Docling")


# === PJe ===

class PjeInput(BaseModel):
    """Input para /enrich/pje-text — texto colado do PJe."""
    raw_text: str = Field(..., min_length=10, description="Texto colado do PJe")
    defensor_id: str = Field(..., description="ID do defensor")


class IntimacaoExtraida(BaseModel):
    """Uma intimação extraída do texto PJe."""
    numero_processo: str | None = None
    vara: str | None = None
    comarca: str | None = None
    atribuicao: str | None = None  # JURI, VD, EP, CRIMINAL, CIVEL
    intimado: str | None = None
    correus: list[str] = Field(default_factory=list)
    vitima: str | None = None
    crime: str | None = None
    artigos: list[str] = Field(default_factory=list)
    qualificadoras: list[str] = Field(default_factory=list)
    fase_processual: str | None = None
    tipo_prazo: str | None = None
    data_limite: str | None = None
    tipo_documento: str | None = None
    tipo_expedicao: str | None = None
    reu_preso: bool = False
    confidence: float = Field(0.0, ge=0, le=1)


class PjeOutput(BaseModel):
    """Output de /enrich/pje-text."""
    intimacoes: list[IntimacaoExtraida] = Field(default_factory=list)
    processos_atualizados: list[int] = Field(default_factory=list)
    demandas_criadas: list[int] = Field(default_factory=list)
    assistidos_identificados: list[dict] = Field(default_factory=list)
    total_processadas: int = 0


# === Transcript ===

class TranscriptInput(BaseModel):
    """Input para /enrich/transcript — transcrição de atendimento."""
    transcript: str = Field(..., min_length=10, description="Texto da transcrição")
    assistido_id: int = Field(..., description="ID do assistido")
    processo_id: int | None = Field(None, description="ID do processo vinculado")
    caso_id: int | None = Field(None, description="ID do caso vinculado")
    context: str | None = Field(None, description="Contexto adicional (atendimento anterior)")


class ExtractedFact(BaseModel):
    """Fato extraído de transcrição."""
    descricao: str
    tipo: FactType
    confidence: float = Field(0.0, ge=0, le=1)


class ExtractedPerson(BaseModel):
    """Pessoa mencionada em transcrição."""
    nome: str
    papel: PersonRole


class TranscriptOutput(BaseModel):
    """Output de /enrich/transcript."""
    key_points: list[str] = Field(default_factory=list)
    facts: list[ExtractedFact] = Field(default_factory=list)
    persons_mentioned: list[ExtractedPerson] = Field(default_factory=list)
    contradictions: list[str] = Field(default_factory=list)
    suggested_actions: list[str] = Field(default_factory=list)
    urgency_level: UrgencyLevel = UrgencyLevel.LOW
    entities_created: list[dict] = Field(default_factory=list)


# === Audiência ===

class AudienciaInput(BaseModel):
    """Input para /enrich/audiencia — pauta de audiência."""
    pauta_text: str = Field(..., min_length=10, description="Texto da pauta")
    defensor_id: str = Field(..., description="ID do defensor")


class AudienciaExtraida(BaseModel):
    """Audiência extraída da pauta."""
    tipo: str | None = None  # instrucao, JAM, juri, admonicao, justificacao
    numero_processo: str | None = None
    reu: str | None = None
    vitima: str | None = None
    juiz: str | None = None
    promotor: str | None = None
    data: str | None = None
    hora: str | None = None
    sala: str | None = None
    vara: str | None = None
    confidence: float = Field(0.0, ge=0, le=1)


class AudienciaOutput(BaseModel):
    """Output de /enrich/audiencia."""
    audiencias: list[AudienciaExtraida] = Field(default_factory=list)
    audiencias_criadas: list[int] = Field(default_factory=list)
    processos_vinculados: list[int] = Field(default_factory=list)


# === WhatsApp ===

class WhatsAppInput(BaseModel):
    """Input para /enrich/whatsapp — mensagem recebida."""
    message: str = Field(..., min_length=1, description="Conteúdo da mensagem")
    contact_id: str = Field(..., description="ID do contato WhatsApp")
    assistido_id: int | None = Field(None, description="ID do assistido vinculado")


class WhatsAppOutput(BaseModel):
    """Output de /enrich/whatsapp."""
    urgency_level: UrgencyLevel = UrgencyLevel.LOW
    subject: str | None = None  # pedido_informacao, relato_fato, documentacao, outro
    extracted_info: dict = Field(default_factory=dict)
    suggested_response: str | None = None
    entities_created: list[dict] = Field(default_factory=list)


# === Solar ===

class SolarSyncInput(BaseModel):
    """Input para /solar/sync-processo."""
    numero_processo: str = Field(..., min_length=5, description="Número do processo (formato CNJ)")
    processo_id: int | None = Field(None, description="ID do processo no OMBUDS (se já conhecido)")
    assistido_id: int | None = Field(None, description="ID do assistido no OMBUDS")
    caso_id: int | None = Field(None, description="ID do caso no OMBUDS")
    download_pdfs: bool = Field(True, description="Se deve baixar PDFs de documentos")


class SolarPdfDownload(BaseModel):
    """Um PDF baixado do Solar, codificado em base64."""
    filename: str
    content_base64: str
    mime_type: str = "application/pdf"
    tipo_documento: str | None = None


class SolarSyncOutput(BaseModel):
    """Output de /solar/sync-processo."""
    success: bool
    numero_processo: str
    processo_data: dict = Field(default_factory=dict, description="Dados do processo extraídos")
    movimentacoes_encontradas: int = 0
    movimentacoes_novas: int = 0
    documentos_baixados: int = 0
    anotacoes_criadas: list[dict] = Field(default_factory=list)
    case_facts_criados: list[dict] = Field(default_factory=list)
    pdfs: list[SolarPdfDownload] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)


class SolarBatchInput(BaseModel):
    """Input para /solar/sync-batch."""
    processos: list[SolarSyncInput] = Field(..., max_length=20, description="Max 20 processos por batch")
    max_concurrent: int = Field(default=1, ge=1, le=5, description="Max processos simultâneos")


class SolarBatchOutput(BaseModel):
    """Output de /solar/sync-batch."""
    total: int
    succeeded: int
    failed: int
    results: list[SolarSyncOutput] = Field(default_factory=list)


class SolarAvisoItem(BaseModel):
    """Um aviso pendente do Solar."""
    tipo: str | None = None
    numero_processo: str | None = None
    descricao: str | None = None
    data_publicacao: str | None = None
    prazo: str | None = None
    lido: bool = False
    ombuds_processo_id: int | None = None
    ombuds_assistido_id: int | None = None


class SolarAvisosOutput(BaseModel):
    """Output de /solar/avisos."""
    avisos: list[SolarAvisoItem] = Field(default_factory=list)
    total: int = 0
    error: str | None = None


class SolarStatusOutput(BaseModel):
    """Output de GET /solar/status."""
    configured: bool
    authenticated: bool
    session_age_seconds: int | None = None
    solar_reachable: bool = False
    selectors_mapped: bool = False
    unmapped_selectors: list[str] = Field(default_factory=list)


class SolarNomeSyncInput(BaseModel):
    """Input para /solar/sync-por-nome — busca processos por nome de defensor."""
    nome: str = Field(..., min_length=3, description="Nome do defensor ex: 'rodrigo rocha meire'")
    sync_movimentacoes: bool = Field(False, description="Se true, extrai movimentações de cada processo")


class SolarNomeSyncOutput(BaseModel):
    """Output de /solar/sync-por-nome."""
    success: bool
    nome: str
    processos_encontrados: int = 0
    processos: list[dict] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)


class SolarCadastrarInput(BaseModel):
    """Input para /solar/cadastrar-processo."""
    numero_processo: str = Field(..., min_length=5, description="Número do processo (formato CNJ)")
    grau: int = Field(1, ge=1, le=2, description="Grau do processo (1 ou 2)")


class SolarCadastrarOutput(BaseModel):
    """Output de /solar/cadastrar-processo."""
    success: bool
    cadastrado: bool  # True = criado agora
    ja_existia: bool  # True = já estava cadastrado
    numero: str
    atendimento_id: str | None = None
    url_pos_cadastro: str | None = None
    error: str | None = None


# === Solar Write (OMBUDS -> Solar) ===

class SolarAnotacaoToSync(BaseModel):
    """Uma anotacao do OMBUDS para sincronizar como fase processual no Solar."""
    id: int = Field(..., description="ID da anotacao no OMBUDS")
    processo_id: int | None = Field(None, description="ID do processo no OMBUDS")
    numero_autos: str | None = Field(None, description="Numero do processo (formato CNJ)")
    conteudo: str = Field(..., description="Texto da anotacao")
    tipo: str = Field("nota", description="Tipo da anotacao (nota, atendimento, audiencia, etc)")
    created_at: str = Field(..., description="Data de criacao ISO 8601")


class SolarSyncToInput(BaseModel):
    """Input para /solar/sync-to-solar — escreve dados do OMBUDS no Solar."""
    assistido_id: int = Field(..., description="ID do assistido no OMBUDS")
    anotacoes: list[SolarAnotacaoToSync] = Field(
        ..., max_length=50, description="Anotacoes a sincronizar (max 50)"
    )
    modo: str = Field(
        "auto",
        description="Modo de escrita: 'fase' (Fase Processual), 'anotacao' (Historico), 'auto' (decide por tipo)",
    )
    dry_run: bool = Field(False, description="Se True, preenche mas nao salva")


class SolarSyncToDetalhe(BaseModel):
    """Detalhe de uma anotacao sincronizada."""
    anotacao_id: int
    status: str  # "created", "skipped", "failed", "dry_run"
    solar_fase_id: str | None = None
    error: str | None = None
    reason: str | None = None
    requires_discovery: bool = False


class SolarSyncToOutput(BaseModel):
    """Output de /solar/sync-to-solar."""
    success: bool
    fases_criadas: int = 0
    fases_skipped: int = 0
    fases_falhadas: int = 0
    total: int = 0
    dry_run: bool = False
    erros: list[str] = Field(default_factory=list)
    detalhes: list[SolarSyncToDetalhe] = Field(default_factory=list)


# === Solar Anotacao (OMBUDS -> Solar Historico) ===

class SolarCriarAnotacaoInput(BaseModel):
    """Input para /solar/criar-anotacao — cria anotação no Histórico do atendimento."""
    atendimento_id: str = Field(..., description="Numero do atendimento Solar (ex: 260120000756)")
    texto: str = Field(..., max_length=5000, description="Texto da anotacao")
    qualificacao_id: int = Field(
        302,
        description="ID da qualificacao (302=ANOTAÇÕES, 304=ANDAMENTO, 307=LEMBRETE, etc)",
    )
    atuacao_value: str | None = Field(
        None, description="Valor do select atuacao (defensoria+defensor)"
    )
    dry_run: bool = Field(False, description="Se True, preenche mas nao salva")


class SolarCriarAnotacaoOutput(BaseModel):
    """Output de /solar/criar-anotacao."""
    success: bool
    message: str = ""
    hash: str | None = None
    dry_run: bool = False
    verified: bool = False
    verificacao_msg: str | None = None
    screenshots: list[str] = Field(default_factory=list)


# === Upload Documento (Protocolar) ===

class SolarUploadDocumentoInput(BaseModel):
    """Input para /solar/upload-document — faz upload de PDF ao Solar."""
    atendimento_id: str = Field(..., description="Numero do atendimento Solar (ex: 260120000756)")
    numero_processo: str = Field(..., description="Numero CNJ do processo (ex: 8000189-30.2025.8.05.0039)")
    file_path: str = Field(..., description="Caminho local do arquivo PDF para upload")
    nome_arquivo: str | None = Field(None, description="Nome do arquivo (auto-detecta se None)")
    criar_fase: bool = Field(True, description="Se True, cria fase processual apos upload")
    fase_tipo_id: int = Field(1, description="Tipo da fase Solar (1=Peticao, 53=Apelacao, etc.)")
    fase_descricao: str = Field("", description="Descricao da fase processual")
    grau: int = Field(1, description="Grau do processo (1 ou 2)")
    dry_run: bool = Field(False, description="Se True, prepara mas nao envia")


class SolarUploadDocumentoOutput(BaseModel):
    """Output de /solar/upload-document."""
    success: bool
    message: str = ""
    hash: str | None = None
    dry_run: bool = False
    verified: bool = False
    verificacao_msg: str | None = None
    fase_result: dict | None = None
    file_size_mb: float | None = None
    error: str | None = None
    screenshots: list[str] = Field(default_factory=list)


# === SIGAD ===

class SigadAcao(BaseModel):
    """Uma ação registrada no SIGAD para o assistido."""
    data_cadastro: str | None = None
    numero_acao: str | None = None
    especializada: str | None = None
    tipo_acao: str | None = None
    numero_processo: str | None = None
    situacao: str | None = None
    viz_url: str | None = None


class SigadObservacao(BaseModel):
    """Uma observação de atendimento registrada no SIGAD."""
    data: str | None = None
    defensor: str | None = None
    tipo: str | None = None
    texto: str | None = None


class SigadEnriquecerDados(BaseModel):
    """Dados extraídos do SIGAD para enriquecer o OMBUDS."""
    nomeMae: str | None = None
    dataNascimento: str | None = None
    naturalidade: str | None = None  # cidade de nascimento
    telefone: str | None = None


class SigadExportarInput(BaseModel):
    """Input para /sigad/exportar-assistido."""
    cpf: str = Field(..., min_length=11, description="CPF do assistido (com ou sem máscara)")
    ombuds_assistido_id: int | None = Field(None, description="ID do assistido no OMBUDS (para logging)")
    numeros_processo_ombuds: list[str] | None = Field(
        None,
        description="Números de processo do OMBUDS para verificação cruzada com SIGAD"
    )


class SigadExportarOutput(BaseModel):
    """Output de /sigad/exportar-assistido."""
    success: bool
    encontrado_sigad: bool
    ja_existia_solar: bool
    # Verificação processo
    verificacao_processo: bool | None = None  # None = não verificado (sem processos)
    sigad_processo: str | None = None         # número do processo extraído do SIGAD
    vara: str | None = None                   # vara extraída do painel de detalhe
    # Histórico de atendimentos extraído do SIGAD
    observacoes: list[SigadObservacao] = Field(default_factory=list)
    # Enriquecimento reverso
    dados_para_enriquecer: SigadEnriquecerDados | None = None
    # Links e identificadores
    solar_url: str | None = None
    sigad_id: str | None = None
    nome_sigad: str | None = None
    message: str | None = None
    error: str | None = None


class SigadBuscarInput(BaseModel):
    """Input para /sigad/buscar-assistido."""
    cpf: str = Field(..., min_length=11, description="CPF do assistido")


class SigadBuscarOutput(BaseModel):
    """Output de /sigad/buscar-assistido."""
    success: bool
    encontrado: bool
    sigad_id: str | None = None
    nome: str | None = None
    cpf: str | None = None
    data_nascimento: str | None = None
    triagem: str | None = None
    cidade: str | None = None
    error: str | None = None


# === Consolidation (Sistema Nervoso Defensivo) ===

class ConsolidationInput(BaseModel):
    """Input para /enrich/consolidate — consolida enrichments de multiplos documentos."""
    assistido_id: int | None = Field(None, description="ID do assistido no OMBUDS")
    processo_id: int | None = Field(None, description="ID do processo no OMBUDS")
    documents: list[dict] = Field(default_factory=list, description="Lista de enrichmentData de documentos")
    transcripts: list[dict] = Field(default_factory=list, description="Lista de enrichmentData de atendimentos")
    demandas: list[dict] = Field(default_factory=list, description="Lista de enrichmentData de demandas")
    context: dict | None = Field(None, description="Contexto adicional (nome assistido, processo, etc)")


class ConsolidationTese(BaseModel):
    """Uma tese defensiva identificada."""
    titulo: str
    fundamentacao: str = ""
    confidence: float = 0.0


class ConsolidationNulidade(BaseModel):
    """Uma nulidade processual identificada."""
    tipo: str
    descricao: str = ""
    severidade: str = "media"  # alta | media | baixa
    fundamentacao: str = ""
    documento_ref: str | None = None


class ConsolidationPessoa(BaseModel):
    """Uma pessoa extraida do caso."""
    nome: str
    tipo: str = "outro"  # reu | testemunha | vitima | perito | policial | delegado | juiz | familiar | outro
    descricao: str | None = None
    documentos_ref: list[str] = Field(default_factory=list)
    relevancia_defesa: str | None = None
    confidence: float = 0.0


class ConsolidationEvento(BaseModel):
    """Um evento na cronologia."""
    data: str | None = None  # YYYY-MM-DD
    descricao: str
    tipo: str = "fato"  # fato | processual | probatorio
    documento_ref: str | None = None
    relevancia: str = "media"  # alta | media | baixa


class ConsolidationAcusacao(BaseModel):
    """Uma acusacao criminal."""
    crime: str
    artigos: list[str] = Field(default_factory=list)
    qualificadoras: list[str] = Field(default_factory=list)
    reu: str | None = None
    status: str | None = None


class ConsolidationOutput(BaseModel):
    """Output de /enrich/consolidate — visao sintetica do caso."""
    resumo: str = ""
    achados_chave: list[str] = Field(default_factory=list)
    recomendacoes: list[str] = Field(default_factory=list)
    inconsistencias: list[str] = Field(default_factory=list)
    teses: list[ConsolidationTese] = Field(default_factory=list)
    nulidades: list[ConsolidationNulidade] = Field(default_factory=list)
    pessoas: list[ConsolidationPessoa] = Field(default_factory=list)
    cronologia: list[ConsolidationEvento] = Field(default_factory=list)
    acusacoes: list[ConsolidationAcusacao] = Field(default_factory=list)
    lacunas: list[str] = Field(default_factory=list)
    urgencias: list[str] = Field(default_factory=list)
    confidence: float = 0.0
    total_documentos: int = 0
    total_transcricoes: int = 0
    total_demandas: int = 0


# === Transcription (Whisper + pyannote) ===

class TranscribeSegment(BaseModel):
    """Um segmento de transcrição com timestamp e speaker."""
    start: float = Field(0, description="Início em segundos")
    end: float = Field(0, description="Fim em segundos")
    text: str = Field("", description="Texto transcrito")
    speaker: str = Field("SPEAKER_0", description="Identificador do speaker")


class TranscribeInput(BaseModel):
    """Input para /api/transcribe — transcrição de áudio/vídeo."""
    file_url: str | None = Field(None, description="URL para download do arquivo (Drive signed URL)")
    file_name: str = Field("audio.mp3", description="Nome do arquivo (para detectar formato)")
    language: str = Field("pt", description="Código ISO 639-1 do idioma")
    diarize: bool = Field(True, description="Ativar diarização de speakers")
    expected_speakers: int | None = Field(None, description="Número esperado de speakers (ajuda pyannote)")
    auth_header: str | None = Field(None, description="Header de autenticação para download (ex: Bearer token)")


class TranscribeAsyncInput(TranscribeInput):
    """Input para /api/transcribe-async — transcrição async com callback via Supabase.
    Retorna 202 imediatamente. O resultado é salvo diretamente no drive_files via Supabase.
    """
    drive_file_id: str = Field(..., description="driveFileId (Google Drive ID) para atualizar o registro no Supabase")
    db_record_id: int = Field(..., description="ID do registro na tabela drive_files")


class TranscribeOutput(BaseModel):
    """Output de /api/transcribe."""
    transcript: str = Field("", description="Transcrição completa formatada com timestamps + speakers")
    transcript_plain: str = Field("", description="Transcrição sem formatação (texto corrido)")
    segments: list[TranscribeSegment] = Field(default_factory=list, description="Segmentos com timestamps")
    speakers: list[str] = Field(default_factory=list, description="Lista de speakers identificados")
    duration: float = Field(0, description="Duração total em segundos")
    language: str = Field("pt", description="Idioma detectado/usado")
    confidence: float = Field(0, ge=0, le=1, description="Score de confiança")
    diarization_applied: bool = Field(False, description="Se diarização foi aplicada")


# === Health ===

class HealthResponse(BaseModel):
    """Response de GET /health."""
    status: str = "ok"
    version: str
    docling_available: bool
    gemini_configured: bool
    supabase_configured: bool
    solar_configured: bool = False
    transcription_configured: bool = False
