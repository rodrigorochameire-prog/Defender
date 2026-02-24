# Fase 1: Pesquisa Semântica Universal — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable semantic search across ALL OMBUDS entities (documents, annotations, movements, case facts, jurisprudence) using pgvector.

**Architecture:** pgvector extension on Supabase + centralized `embeddings` table with HNSW index + `EmbeddingService` in Enrichment Engine + `POST /search/semantic` endpoint + refactored `/admin/busca` UI.

**Tech Stack:** PostgreSQL pgvector, Gemini text-embedding-004 (768d), Drizzle ORM, FastAPI, tRPC, React

---

### Task 1: Enable pgvector Extension + Create embeddings Table

**Files:**
- Create: `supabase/migrations/20260224_add_pgvector_embeddings.sql`
- Modify: `src/lib/db/schema.ts` (add embeddings table + conteudo_completo column)

**Step 1: Create the SQL migration**

```sql
-- supabase/migrations/20260224_add_pgvector_embeddings.sql
CREATE EXTENSION IF NOT EXISTS vector;

-- Centralized embeddings table
CREATE TABLE embeddings (
  id SERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  assistido_id INTEGER REFERENCES assistidos(id) ON DELETE SET NULL,
  processo_id INTEGER REFERENCES processos(id) ON DELETE SET NULL,
  chunk_index INTEGER DEFAULT 0,
  content_text TEXT NOT NULL,
  embedding vector(768) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_embeddings_hnsw ON embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
CREATE INDEX idx_embeddings_entity ON embeddings (entity_type, entity_id);
CREATE INDEX idx_embeddings_assistido ON embeddings (assistido_id) WHERE assistido_id IS NOT NULL;
CREATE INDEX idx_embeddings_processo ON embeddings (processo_id) WHERE processo_id IS NOT NULL;

-- Store full Docling markdown (currently discarded)
ALTER TABLE documentos ADD COLUMN conteudo_completo TEXT;
```

**Step 2: Apply migration to Supabase**

Run: `npx supabase db push` or apply via Supabase Dashboard SQL editor.
Expected: Extension enabled, table created, column added.

**Step 3: Add Drizzle schema for embeddings table**

In `src/lib/db/schema.ts`, after the `documentos` table definition (~line 719), add:

```typescript
// === Embeddings (pgvector semantic search) ===
export const embeddings = pgTable("embeddings", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  assistidoId: integer("assistido_id").references(() => assistidos.id, { onDelete: "set null" }),
  processoId: integer("processo_id").references(() => processos.id, { onDelete: "set null" }),
  chunkIndex: integer("chunk_index").default(0),
  contentText: text("content_text").notNull(),
  // embedding is vector(768) — handled via raw SQL, not Drizzle native
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
});
```

Also add `conteudo_completo` to the `documentos` table (after `enrichedAt` ~line 702):

```typescript
  conteudoCompleto: text("conteudo_completo"),
```

**Step 4: Generate Drizzle types**

Run: `npm run db:generate`
Expected: New migration generated, types updated.

**Step 5: Commit**

```bash
git add supabase/migrations/ src/lib/db/schema.ts
git commit -m "feat(search): pgvector extension + embeddings table + conteudo_completo column"
```

---

### Task 2: EmbeddingService in Enrichment Engine

**Files:**
- Create: `enrichment-engine/services/embedding_service.py`
- Modify: `enrichment-engine/requirements.txt` (no new deps needed — uses google-genai already installed)
- Modify: `enrichment-engine/config.py` (add embedding config)

**Step 1: Add config values**

In `enrichment-engine/config.py`, before `model_config` (~line 51), add:

```python
    # Embedding
    embedding_model: str = "text-embedding-004"
    embedding_dimensions: int = 768
    chunk_max_tokens: int = 500
    chunk_overlap_tokens: int = 50
    search_default_limit: int = 20
```

**Step 2: Create EmbeddingService**

Create `enrichment-engine/services/embedding_service.py`:

```python
"""
Serviço de embeddings vetoriais para busca semântica.
Usa text-embedding-004 (Gemini) com 768 dimensões.
Armazena em pgvector via Supabase.
"""
import hashlib
import logging
from typing import Optional
from config import get_settings
from google import genai

logger = logging.getLogger(__name__)
settings = get_settings()


class EmbeddingService:
    """Gera embeddings e gerencia busca semântica via pgvector."""

    def __init__(self, supabase_client):
        self.supabase = supabase_client
        self._client = None

    def _get_client(self):
        if not self._client:
            self._client = genai.Client(api_key=settings.gemini_api_key)
        return self._client

    async def generate_embedding(self, text: str) -> list[float]:
        """Gera embedding de 768 dimensões para um texto."""
        if not text or not text.strip():
            raise ValueError("Text cannot be empty")

        # Truncar texto longo (embedding model tem limite)
        truncated = text[:8000]

        client = self._get_client()
        result = client.models.embed_content(
            model=f"models/{settings.embedding_model}",
            contents=[truncated],
        )
        return result.embeddings[0].values

    def _chunk_text(self, text: str, max_tokens: int = 500, overlap: int = 50) -> list[str]:
        """Split texto em chunks por parágrafos, respeitando max_tokens."""
        paragraphs = text.split("\n\n")
        chunks = []
        current_chunk = []
        current_len = 0

        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
            para_tokens = len(para.split())

            if current_len + para_tokens > max_tokens and current_chunk:
                chunks.append("\n\n".join(current_chunk))
                # Overlap: keep last paragraph
                if overlap > 0 and current_chunk:
                    last = current_chunk[-1]
                    current_chunk = [last]
                    current_len = len(last.split())
                else:
                    current_chunk = []
                    current_len = 0

            current_chunk.append(para)
            current_len += para_tokens

        if current_chunk:
            chunks.append("\n\n".join(current_chunk))

        return chunks if chunks else [text[:2000]]

    async def index_document(
        self,
        doc_id: int,
        markdown: str,
        assistido_id: Optional[int] = None,
        processo_id: Optional[int] = None,
        metadata: Optional[dict] = None,
    ) -> int:
        """Indexa um documento em chunks com embeddings."""
        chunks = self._chunk_text(markdown)
        count = 0

        # Limpar embeddings anteriores deste documento
        self.supabase.table("embeddings").delete().match(
            {"entity_type": "documento", "entity_id": doc_id}
        ).execute()

        for i, chunk in enumerate(chunks):
            try:
                embedding = await self.generate_embedding(chunk)
                self.supabase.table("embeddings").insert({
                    "entity_type": "documento",
                    "entity_id": doc_id,
                    "assistido_id": assistido_id,
                    "processo_id": processo_id,
                    "chunk_index": i,
                    "content_text": chunk[:5000],
                    "embedding": embedding,
                    "metadata": metadata or {},
                }).execute()
                count += 1
            except Exception as e:
                logger.error("Failed to index chunk %d of doc %d: %s", i, doc_id, e)

        logger.info("Indexed %d chunks for documento %d", count, doc_id)
        return count

    async def index_entity(
        self,
        entity_type: str,
        entity_id: int,
        text: str,
        assistido_id: Optional[int] = None,
        processo_id: Optional[int] = None,
        metadata: Optional[dict] = None,
    ) -> bool:
        """Indexa uma entidade curta (anotacao, movimentacao, case_fact)."""
        if not text or len(text.strip()) < 10:
            return False

        try:
            embedding = await self.generate_embedding(text)

            # Upsert: limpar anterior
            self.supabase.table("embeddings").delete().match(
                {"entity_type": entity_type, "entity_id": entity_id}
            ).execute()

            self.supabase.table("embeddings").insert({
                "entity_type": entity_type,
                "entity_id": entity_id,
                "assistido_id": assistido_id,
                "processo_id": processo_id,
                "chunk_index": 0,
                "content_text": text[:5000],
                "embedding": embedding,
                "metadata": metadata or {},
            }).execute()
            return True
        except Exception as e:
            logger.error("Failed to index %s %d: %s", entity_type, entity_id, e)
            return False

    async def search(
        self,
        query: str,
        filters: Optional[dict] = None,
        limit: int = 20,
    ) -> list[dict]:
        """Busca semântica via pgvector cosine similarity."""
        query_embedding = await self.generate_embedding(query)
        filters = filters or {}

        # Build SQL with filters
        where_clauses = []
        params = {"query_embedding": str(query_embedding), "lim": limit}

        if filters.get("assistido_id"):
            where_clauses.append("assistido_id = :assistido_id")
            params["assistido_id"] = filters["assistido_id"]

        if filters.get("processo_id"):
            where_clauses.append("processo_id = :processo_id")
            params["processo_id"] = filters["processo_id"]

        if filters.get("entity_types"):
            types = filters["entity_types"]
            placeholders = ", ".join(f"'{t}'" for t in types)
            where_clauses.append(f"entity_type IN ({placeholders})")

        where_sql = " AND ".join(where_clauses) if where_clauses else "TRUE"

        sql = f"""
        SELECT
            id, entity_type, entity_id, assistido_id, processo_id,
            chunk_index, content_text, metadata,
            1 - (embedding <=> '{str(query_embedding)}') AS score
        FROM embeddings
        WHERE {where_sql}
        ORDER BY embedding <=> '{str(query_embedding)}'
        LIMIT {limit}
        """

        result = self.supabase.rpc("exec_sql", {"query": sql}).execute()

        # Fallback: use direct pgvector query via Supabase
        # If exec_sql RPC doesn't exist, use match_embeddings function
        return result.data if result.data else []
```

**Step 3: Verify Python syntax**

Run: `cd /Users/rodrigorochameire/Projetos/Defender/enrichment-engine && python3 -c "import ast; ast.parse(open('services/embedding_service.py').read()); print('OK')"`
Expected: `OK`

**Step 4: Commit**

```bash
git add enrichment-engine/services/embedding_service.py enrichment-engine/config.py
git commit -m "feat(search): EmbeddingService with chunking, indexing, and pgvector search"
```

---

### Task 3: Supabase RPC Function for Vector Search

**Files:**
- Create: `supabase/migrations/20260224_search_embeddings_rpc.sql`

**Step 1: Create the RPC function**

We need a Supabase RPC function because the Supabase JS/Python client doesn't natively support pgvector operators. Create:

```sql
-- supabase/migrations/20260224_search_embeddings_rpc.sql
CREATE OR REPLACE FUNCTION search_embeddings(
  query_embedding vector(768),
  filter_assistido_id INTEGER DEFAULT NULL,
  filter_processo_id INTEGER DEFAULT NULL,
  filter_entity_types TEXT[] DEFAULT NULL,
  match_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id INTEGER,
  entity_type TEXT,
  entity_id INTEGER,
  assistido_id INTEGER,
  processo_id INTEGER,
  chunk_index INTEGER,
  content_text TEXT,
  metadata JSONB,
  score FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.entity_type,
    e.entity_id,
    e.assistido_id,
    e.processo_id,
    e.chunk_index,
    e.content_text,
    e.metadata,
    (1 - (e.embedding <=> query_embedding))::FLOAT AS score
  FROM embeddings e
  WHERE
    (filter_assistido_id IS NULL OR e.assistido_id = filter_assistido_id)
    AND (filter_processo_id IS NULL OR e.processo_id = filter_processo_id)
    AND (filter_entity_types IS NULL OR e.entity_type = ANY(filter_entity_types))
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_limit;
END;
$$;
```

**Step 2: Apply migration**

Run: Apply via Supabase Dashboard SQL editor or `npx supabase db push`.
Expected: Function `search_embeddings` available.

**Step 3: Update EmbeddingService.search() to use RPC**

Replace the raw SQL in `embedding_service.py` search method with:

```python
    async def search(
        self,
        query: str,
        filters: Optional[dict] = None,
        limit: int = 20,
    ) -> list[dict]:
        """Busca semântica via pgvector RPC."""
        query_embedding = await self.generate_embedding(query)
        filters = filters or {}

        rpc_params = {
            "query_embedding": query_embedding,
            "match_limit": limit,
        }

        if filters.get("assistido_id"):
            rpc_params["filter_assistido_id"] = filters["assistido_id"]
        if filters.get("processo_id"):
            rpc_params["filter_processo_id"] = filters["processo_id"]
        if filters.get("entity_types"):
            rpc_params["filter_entity_types"] = filters["entity_types"]

        result = self.supabase.rpc("search_embeddings", rpc_params).execute()
        return result.data or []
```

**Step 4: Commit**

```bash
git add supabase/migrations/ enrichment-engine/services/embedding_service.py
git commit -m "feat(search): Supabase RPC function for pgvector similarity search"
```

---

### Task 4: Search Router + Schemas

**Files:**
- Create: `enrichment-engine/routers/search.py`
- Create: `enrichment-engine/models/search_schemas.py`
- Modify: `enrichment-engine/main.py` (register router)

**Step 1: Create Pydantic schemas**

Create `enrichment-engine/models/search_schemas.py`:

```python
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
```

**Step 2: Create search router**

Create `enrichment-engine/routers/search.py`:

```python
import logging
from fastapi import APIRouter, Depends
from models.search_schemas import (
    SemanticSearchInput,
    SemanticSearchOutput,
    SearchResultItem,
    IndexEntityInput,
)
from services.embedding_service import EmbeddingService
from dependencies import get_supabase

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/search")


def get_embedding_service():
    from dependencies import get_supabase_client
    return EmbeddingService(get_supabase_client())


@router.post("/semantic", response_model=SemanticSearchOutput)
async def semantic_search(input_data: SemanticSearchInput):
    """Busca semântica via pgvector em todas as entidades."""
    service = get_embedding_service()
    results = await service.search(
        query=input_data.query,
        filters=input_data.filters,
        limit=input_data.limit,
    )

    return SemanticSearchOutput(
        results=[SearchResultItem(**r) for r in results],
        total=len(results),
        query=input_data.query,
    )


@router.post("/index")
async def index_entity(input_data: IndexEntityInput):
    """Indexa uma entidade no pgvector."""
    service = get_embedding_service()
    success = await service.index_entity(
        entity_type=input_data.entity_type,
        entity_id=input_data.entity_id,
        text=input_data.text,
        assistido_id=input_data.assistido_id,
        processo_id=input_data.processo_id,
        metadata=input_data.metadata,
    )
    return {"success": success, "entity_type": input_data.entity_type, "entity_id": input_data.entity_id}
```

**Step 3: Register router in main.py**

In `enrichment-engine/main.py`, add import and registration after line 85:

```python
from routers.search import router as search_router
# ...
app.include_router(search_router, tags=["Search"])
```

**Step 4: Verify syntax**

Run: `cd /Users/rodrigorochameire/Projetos/Defender/enrichment-engine && python3 -c "import ast; ast.parse(open('routers/search.py').read()); ast.parse(open('models/search_schemas.py').read()); print('OK')"`
Expected: `OK`

**Step 5: Commit**

```bash
git add enrichment-engine/routers/search.py enrichment-engine/models/search_schemas.py enrichment-engine/main.py
git commit -m "feat(search): /search/semantic + /search/index endpoints with Pydantic schemas"
```

---

### Task 5: Hook Embedding Indexing into Document Pipeline

**Files:**
- Modify: `enrichment-engine/services/enrichment_orchestrator.py` (~line 141-147, save full markdown + trigger indexing)

**Step 1: Save conteudo_completo in orchestrator**

In `enrichment_orchestrator.py`, find where `markdown_preview` is saved (~line 146) and:
1. Add `conteudo_completo` to the Supabase update
2. Trigger embedding indexing after successful enrichment

After the Supabase upsert that saves `enrichment_data`, add:

```python
# Save full markdown to conteudo_completo
if markdown:
    self.supabase.table("documentos").update({
        "conteudo_completo": markdown
    }).eq("id", document_id).execute()

# Index document for semantic search
try:
    from services.embedding_service import EmbeddingService
    embedding_svc = EmbeddingService(self.supabase)
    await embedding_svc.index_document(
        doc_id=document_id,
        markdown=markdown,
        assistido_id=assistido_id,
        processo_id=processo_id,
        metadata={
            "document_type": result.get("document_type"),
            "titulo": titulo,
        },
    )
except Exception as e:
    logger.warning("Embedding indexing failed for doc %d: %s", document_id, e)
```

**Step 2: Commit**

```bash
git add enrichment-engine/services/enrichment_orchestrator.py
git commit -m "feat(search): save conteudo_completo + auto-index documents for semantic search"
```

---

### Task 6: tRPC Search Router (Frontend)

**Files:**
- Create: `src/lib/trpc/routers/search.ts`
- Modify: `src/lib/services/enrichment-client.ts` (add search method)
- Modify: `src/lib/trpc/routers/_app.ts` or wherever routers are merged

**Step 1: Add search types and method to enrichment client**

In `src/lib/services/enrichment-client.ts`, add:

```typescript
// === Search Types ===
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
```

And the method:

```typescript
async semanticSearch(input: SemanticSearchInput): Promise<SemanticSearchOutput> {
  return this.post<SemanticSearchOutput>("/search/semantic", {
    query: input.query,
    filters: input.filters || {},
    limit: input.limit || 20,
  });
}
```

**Step 2: Create tRPC search router**

Create `src/lib/trpc/routers/search.ts`:

```typescript
import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { enrichmentClient } from "@/lib/services/enrichment-client";

export const searchRouter = router({
  semantic: protectedProcedure
    .input(
      z.object({
        query: z.string().min(2).max(1000),
        assistidoId: z.number().optional(),
        processoId: z.number().optional(),
        entityTypes: z.array(z.string()).optional(),
        limit: z.number().min(1).max(100).default(20),
      }),
    )
    .query(async ({ input }) => {
      return enrichmentClient.semanticSearch({
        query: input.query,
        filters: {
          assistido_id: input.assistidoId,
          processo_id: input.processoId,
          entity_types: input.entityTypes,
        },
        limit: input.limit,
      });
    }),
});
```

**Step 3: Register in app router**

Find the main tRPC app router and add: `search: searchRouter`

**Step 4: Commit**

```bash
git add src/lib/trpc/routers/search.ts src/lib/services/enrichment-client.ts
git commit -m "feat(search): tRPC search router + enrichment client search method"
```

---

### Task 7: Refactor /admin/busca Page (UI)

**Files:**
- Rewrite: `src/app/(dashboard)/admin/busca/page.tsx` (currently a stub)

**Step 1: Rewrite the busca page**

Replace the entire stub with a functional semantic search page:
- Search input with debounce
- Entity type filter chips (documento, anotacao, movimentacao, case_fact, julgado)
- Assistido/processo filter (optional selects)
- Results list with: icon by type, content preview (highlighted), score badge, link to original
- Loading skeleton while searching
- Empty state: "Digite para buscar em todos os documentos, anotacoes e movimentacoes"

Key patterns to follow:
- Use `trpc.search.semantic.useQuery` with enabled: false, then `refetch()` on submit
- Debounce search input (300ms)
- Group results by entity_type
- Show score as relevance percentage (score * 100)

**Step 2: Add to sidebar (if not already visible)**

In `src/components/layouts/admin-sidebar.tsx`, verify "Busca" is accessible. Add to `DOCUMENTOS_NAV` or `TOOLS_NAV` if missing:

```typescript
{ label: "Busca IA", path: "/admin/busca", icon: "Search" },
```

**Step 3: Commit**

```bash
git add src/app/(dashboard)/admin/busca/page.tsx src/components/layouts/admin-sidebar.tsx
git commit -m "feat(search): semantic search UI page with filters, results, and entity links"
```

---

### Task 8: Dependency Check for Supabase Client in Enrichment Engine

**Files:**
- Modify: `enrichment-engine/dependencies.py` (ensure get_supabase_client works)

**Step 1: Verify or create dependency injection**

Check if `enrichment-engine/dependencies.py` exists and has `get_supabase_client()`. If not, create it:

```python
from supabase import create_client
from config import get_settings

_supabase_client = None

def get_supabase_client():
    global _supabase_client
    if _supabase_client is None:
        settings = get_settings()
        _supabase_client = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key
        )
    return _supabase_client
```

**Step 2: Update EmbeddingService instantiation in search router**

Make sure `routers/search.py` correctly instantiates `EmbeddingService` with a real Supabase client.

**Step 3: Commit**

```bash
git add enrichment-engine/dependencies.py enrichment-engine/routers/search.py
git commit -m "feat(search): Supabase dependency injection for EmbeddingService"
```

---

### Task 9: Integration Test — End-to-End Search

**Files:**
- Create: `enrichment-engine/tests/test_embedding_service.py`

**Step 1: Write basic tests**

```python
import pytest
from services.embedding_service import EmbeddingService


class TestChunking:
    def test_chunk_short_text(self):
        svc = EmbeddingService(supabase_client=None)
        chunks = svc._chunk_text("Hello world. This is short.")
        assert len(chunks) == 1
        assert "Hello world" in chunks[0]

    def test_chunk_long_text(self):
        svc = EmbeddingService(supabase_client=None)
        # Generate text with many paragraphs
        paragraphs = ["Paragraph number %d with enough words to count." % i for i in range(50)]
        text = "\n\n".join(paragraphs)
        chunks = svc._chunk_text(text, max_tokens=50, overlap=10)
        assert len(chunks) > 1
        # Each chunk should be under max_tokens
        for chunk in chunks:
            assert len(chunk.split()) <= 60  # some tolerance

    def test_chunk_empty_text(self):
        svc = EmbeddingService(supabase_client=None)
        chunks = svc._chunk_text("")
        assert len(chunks) == 1
```

**Step 2: Run tests**

Run: `cd /Users/rodrigorochameire/Projetos/Defender/enrichment-engine && python3 -m pytest tests/test_embedding_service.py -v`
Expected: All PASS

**Step 3: Commit**

```bash
git add enrichment-engine/tests/test_embedding_service.py
git commit -m "test(search): unit tests for EmbeddingService chunking"
```

---

## Summary — Fase 1 Deliverables

After all 9 tasks:
- [x] pgvector extension enabled on Supabase
- [x] `embeddings` table with HNSW index
- [x] `conteudo_completo` column on `documentos`
- [x] `EmbeddingService` with chunking, indexing, and search
- [x] `search_embeddings` RPC function
- [x] `POST /search/semantic` endpoint
- [x] tRPC `search.semantic` procedure
- [x] Refactored `/admin/busca` page with real semantic search
- [x] Auto-indexing on document enrichment
- [x] Unit tests for chunking logic

**Next:** Fase 2 (Chat RAG) builds on this foundation.
