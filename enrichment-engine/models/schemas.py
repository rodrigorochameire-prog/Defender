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


# === Health ===

class HealthResponse(BaseModel):
    """Response de GET /health."""
    status: str = "ok"
    version: str
    docling_available: bool
    gemini_configured: bool
    supabase_configured: bool
