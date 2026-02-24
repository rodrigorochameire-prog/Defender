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
    document_type: str = Field(..., description="sentenca, decisao, laudo, certidao, peticao, outro")
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


# === Health ===

class HealthResponse(BaseModel):
    """Response de GET /health."""
    status: str = "ok"
    version: str
    docling_available: bool
    gemini_configured: bool
    supabase_configured: bool
    solar_configured: bool = False
