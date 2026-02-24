"""
Schemas para busca semântica via pgvector.
"""

from pydantic import BaseModel, Field


class SemanticSearchInput(BaseModel):
    query: str = Field(..., min_length=2, max_length=1000)
    filters: dict = Field(default_factory=dict, description="assistido_id, processo_id, entity_types")
    limit: int = Field(20, ge=1, le=100)


class SearchResultItem(BaseModel):
    entity_type: str
    entity_id: int
    assistido_id: int | None = None
    processo_id: int | None = None
    chunk_index: int = 0
    content_text: str
    score: float
    metadata: dict = Field(default_factory=dict)


class SemanticSearchOutput(BaseModel):
    results: list[SearchResultItem]
    total: int
    query: str


class IndexEntityInput(BaseModel):
    entity_type: str = Field(..., pattern="^(documento|anotacao|movimentacao|case_fact)$")
    entity_id: int
    text: str = Field(..., min_length=1)
    assistido_id: int | None = None
    processo_id: int | None = None
    metadata: dict = Field(default_factory=dict)
