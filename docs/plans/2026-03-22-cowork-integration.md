# Cowork Integration (SCRUM-64 + SCRUM-65) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fechar o loop OMBUDS ↔ Cowork: enriquecer o briefing de audiência com depoimentos históricos (SCRUM-65) e importar `_analise_ia.json` do Cowork para popular o banco de dados (SCRUM-64).

**Architecture:** Três frentes independentes que se complementam: (1) extensão do briefing existente com dados de `depoimentosAnalise`; (2) nova tabela `analises_cowork` + endpoint no Enrichment Engine para parsear e importar o JSON do Cowork; (3) atualização das skills Cowork para salvar `_analise_ia.json` junto com a análise.

**Tech Stack:** Next.js 15, tRPC, Drizzle ORM, PostgreSQL (Supabase), Python/FastAPI (Enrichment Engine), Google Drive API.

---

## Task 1: DB Migration — Tabela `analises_cowork`

**Files:**
- Modify: `src/lib/db/schema/casos.ts` (adicionar tabela)
- Modify: `src/lib/db/schema/relations.ts` (adicionar relações)
- Modify: `src/lib/db/schema/index.ts` (re-exportar)
- Create: `drizzle/0015_analises_cowork.sql`

### Step 1: Adicionar schema Drizzle em `src/lib/db/schema/casos.ts`

Adicionar após a tabela `depoimentosAnalise` (linha ~190):

```typescript
// ==========================================
// ANÁLISES COWORK — importadas do _analise_ia.json
// ==========================================

export const analisesCowork = pgTable("analises_cowork", {
  id: serial("id").primaryKey(),
  assistidoId: integer("assistido_id").notNull().references(() => assistidos.id, { onDelete: "cascade" }),
  processoId: integer("processo_id").references(() => processos.id, { onDelete: "set null" }),
  audienciaId: integer("audiencia_id").references(() => audiencias.id, { onDelete: "set null" }),
  tipo: varchar("tipo", { length: 50 }).notNull(), // audiencia_criminal | audiencia_sumariante | juri | vvd | execucao_penal | ra
  schemaVersion: varchar("schema_version", { length: 10 }).notNull().default("1.0"),
  resumoFato: text("resumo_fato"),
  teseDefesa: text("tese_defesa"),
  estrategiaAtual: text("estrategia_atual"),
  crimePrincipal: varchar("crime_principal", { length: 200 }),
  pontosCriticos: jsonb("pontos_criticos").$type<string[]>().default([]),
  payload: jsonb("payload").notNull().$type<Record<string, unknown>>(),
  fonteArquivo: text("fonte_arquivo"), // nome do arquivo _analise_ia.json
  importadoEm: timestamp("importado_em").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("analises_cowork_assistido_id_idx").on(table.assistidoId),
  index("analises_cowork_processo_id_idx").on(table.processoId),
  index("analises_cowork_tipo_idx").on(table.tipo),
  index("analises_cowork_importado_em_idx").on(table.importadoEm),
]);

export type AnaliseCowork = typeof analisesCowork.$inferSelect;
export type InsertAnaliseCowork = typeof analisesCowork.$inferInsert;
```

> **Atenção:** os imports de `assistidos`, `processos`, `audiencias` já estão no topo do arquivo `casos.ts`.

### Step 2: Adicionar relações em `src/lib/db/schema/relations.ts`

Adicionar import de `analisesCowork` e as relações:

```typescript
// no import existente de casos.ts, adicionar:
import { ..., analisesCowork } from "./casos";

// no export de relações de assistidos (buscar assistidosRelations):
analisesCowork: many(analisesCowork),

// novo bloco ao final:
export const analisesCoworkRelations = relations(analisesCowork, ({ one }) => ({
  assistido: one(assistidos, { fields: [analisesCowork.assistidoId], references: [assistidos.id] }),
  processo: one(processos, { fields: [analisesCowork.processoId], references: [processos.id] }),
  audiencia: one(audiencias, { fields: [analisesCowork.audienciaId], references: [audiencias.id] }),
}));
```

### Step 3: Re-exportar em `src/lib/db/schema/index.ts`

```typescript
export { ..., analisesCowork } from "./casos";
export type { ..., AnaliseCowork, InsertAnaliseCowork } from "./casos";
```

### Step 4: Gerar e aplicar migration

```bash
cd /Users/rodrigorochameire/Projetos/Defender
npm run db:generate
# Renomear o arquivo gerado para 0015_analises_cowork.sql
npm run db:push
```

Verificar no Supabase Studio que a tabela `analises_cowork` foi criada com as colunas corretas.

### Step 5: Commit

```bash
git add src/lib/db/schema/casos.ts src/lib/db/schema/relations.ts src/lib/db/schema/index.ts drizzle/
git commit -m "feat(db): tabela analises_cowork para importação do Cowork"
```

---

## Task 2: SCRUM-65 — Briefing de Audiência com Depoimentos Históricos

**Files:**
- Modify: `src/lib/trpc/routers/briefing.ts` (função `exportarParaCowork`, bloco de audiência)

### Step 1: Localizar o ponto de edição

No arquivo `briefing.ts`, na função `exportarParaCowork`, o bloco de audiência começa em `if (input.tipo === "audiencia" && audienciaDb)` (~linha 640).

Logo após buscar `testemunhasDb` (por volta da linha 568), adicionar a busca de depoimentos:

```typescript
// Buscar depoimentos históricos do processo (caso_id via processo)
let depoimentosDb: typeof depoimentosAnalise.$inferSelect[] = [];
if (audienciaDb?.processoId) {
  // Buscar casos vinculados ao processo
  const casosDoProcesso = await db.query.casos.findMany({
    where: eq(casos.processoId, audienciaDb.processoId),
    columns: { id: true },
  });
  const casoIds = casosDoProcesso.map((c) => c.id);
  if (casoIds.length > 0) {
    depoimentosDb = await db.query.depoimentosAnalise.findMany({
      where: inArray(depoimentosAnalise.casoId, casoIds),
    });
  }
}
```

> Adicionar `inArray` no import do drizzle: `import { eq, and, isNull, inArray } from "drizzle-orm";`
> Adicionar `casos` e `depoimentosAnalise` nos imports do schema.

### Step 2: Adicionar seção de depoimentos no markdown

Dentro do bloco `if (input.tipo === "audiencia" && audienciaDb)`, após a seção de testemunhas (~linha 692), adicionar:

```typescript
// Depoimentos históricos comparativos
if (depoimentosDb.length > 0) {
  lines.push("## Histórico de Depoimentos (Análise Comparativa)");
  for (const d of depoimentosDb) {
    lines.push(`### ${d.testemunhaNome ?? "Testemunha desconhecida"}`);
    if (d.versaoDelegacia) {
      lines.push("**Versão na Delegacia:**");
      lines.push(d.versaoDelegacia);
      lines.push("");
    }
    if (d.versaoJuizo) {
      lines.push("**Versão no Juízo:**");
      lines.push(d.versaoJuizo);
      lines.push("");
    }
    if (d.contradicoesIdentificadas) {
      lines.push(`**Contradições identificadas:** ${d.contradicoesIdentificadas}`);
    }
    if (d.estrategiaInquiricao) {
      lines.push(`**Estratégia de inquirição:** ${d.estrategiaInquiricao}`);
    }
    lines.push("");
  }
}
```

### Step 3: Build e verificação

```bash
npm run build
# Deve compilar sem erros TypeScript
```

### Step 4: Commit

```bash
git add src/lib/trpc/routers/briefing.ts
git commit -m "feat(briefing): adicionar depoimentos históricos no briefing de audiência (SCRUM-65)"
```

---

## Task 3: Enrichment Engine — Serviço de Importação do Cowork

**Files:**
- Create: `enrichment-engine/services/cowork_import_service.py`
- Create: `enrichment-engine/routers/cowork.py`
- Modify: `enrichment-engine/models/schemas.py` (adicionar schemas de input/output)
- Modify: `enrichment-engine/main.py` (registrar router)

### Step 1: Adicionar schemas em `enrichment-engine/models/schemas.py`

No final do arquivo:

```python
# ==========================================
# COWORK IMPORT
# ==========================================

class CoworkImportInput(BaseModel):
    """Input para importar _analise_ia.json do Drive."""
    assistido_id: int
    processo_id: Optional[int] = None
    audiencia_id: Optional[int] = None
    drive_folder_id: str
    arquivo_nome: str = "_analise_ia.json"
    access_token: str  # Google OAuth token do OMBUDS

class CoworkImportOutput(BaseModel):
    """Output do import com resumo do que foi populado."""
    analise_cowork_id: int
    tipo: str
    campos_atualizados: list[str]  # ex: ["processos.analysisData", "testemunhas[3].perguntasSugeridas"]
    testemunhas_atualizadas: int
    sucesso: bool
    mensagem: str
```

### Step 2: Criar `enrichment-engine/services/cowork_import_service.py`

```python
"""
Cowork Import Service
Detecta e importa _analise_ia.json gerado pelo Cowork nas pastas Drive.
Popula: analises_cowork, processos.analysis_data, testemunhas.*
"""
from __future__ import annotations

import json
import logging
from typing import Any

import httpx

from services.supabase_service import SupabaseService

logger = logging.getLogger("enrichment-engine.cowork_import")


class CoworkImportService:

    def __init__(self):
        self.supabase = SupabaseService()

    async def importar(
        self,
        assistido_id: int,
        processo_id: int | None,
        audiencia_id: int | None,
        drive_folder_id: str,
        arquivo_nome: str,
        access_token: str,
    ) -> dict[str, Any]:
        # 1. Baixar _analise_ia.json do Drive
        analise = await self._baixar_json_drive(drive_folder_id, arquivo_nome, access_token)

        tipo = analise.get("tipo", "desconhecido")
        payload = analise.get("payload", {})

        campos_atualizados: list[str] = []

        # 2. Salvar na tabela analises_cowork
        client = self.supabase._get_client()
        row = {
            "assistido_id": assistido_id,
            "processo_id": processo_id,
            "audiencia_id": audiencia_id,
            "tipo": tipo,
            "schema_version": analise.get("schema_version", "1.0"),
            "resumo_fato": analise.get("resumo_fato"),
            "tese_defesa": analise.get("tese_defesa"),
            "estrategia_atual": analise.get("estrategia_atual"),
            "crime_principal": analise.get("crime_principal"),
            "pontos_criticos": analise.get("pontos_criticos", []),
            "payload": payload,
            "fonte_arquivo": arquivo_nome,
        }
        result = client.table("analises_cowork").insert(row).execute()
        analise_cowork_id = result.data[0]["id"]
        campos_atualizados.append("analises_cowork")

        # 3. Atualizar processos.analysis_data
        if processo_id and analise.get("resumo_fato"):
            analysis_data = {
                "resumo": analise.get("resumo_fato"),
                "teses": [analise["tese_defesa"]] if analise.get("tese_defesa") else [],
                "estrategia": analise.get("estrategia_atual"),
                "crimePrincipal": analise.get("crime_principal"),
                "pontosCriticos": analise.get("pontos_criticos", []),
            }
            client.table("processos").update({
                "analysis_data": analysis_data,
            }).eq("id", processo_id).execute()
            campos_atualizados.append("processos.analysis_data")

        # 4. Atualizar testemunhas (se payload tem perguntas_por_testemunha)
        testemunhas_atualizadas = 0
        perguntas = payload.get("perguntas_por_testemunha", [])
        if perguntas and processo_id:
            testemunhas_db = client.table("testemunhas").select("id, nome").eq("processo_id", processo_id).execute()
            testemunhas_map = {t["nome"].lower(): t["id"] for t in testemunhas_db.data}

            for item in perguntas:
                nome = item.get("nome", "").lower()
                match_id = testemunhas_map.get(nome)
                if match_id:
                    import json as _json
                    client.table("testemunhas").update({
                        "perguntas_sugeridas": _json.dumps(item.get("perguntas", []), ensure_ascii=False),
                    }).eq("id", match_id).execute()
                    testemunhas_atualizadas += 1

            if testemunhas_atualizadas:
                campos_atualizados.append(f"testemunhas[{testemunhas_atualizadas}].perguntas_sugeridas")

        # 5. Atualizar contradicoes → depoimentosAnalise (se existir caso vinculado)
        contradicoes = payload.get("contradicoes", [])
        if contradicoes and processo_id:
            # Buscar caso vinculado ao processo
            casos_result = client.table("casos").select("id").eq("processo_id", processo_id).execute()
            if casos_result.data:
                caso_id = casos_result.data[0]["id"]
                for c in contradicoes:
                    nome = c.get("testemunha")
                    if not nome:
                        continue
                    existing = client.table("depoimentos_analise").select("id").eq("caso_id", caso_id).eq("testemunha_nome", nome).execute()
                    update_data = {
                        "caso_id": caso_id,
                        "testemunha_nome": nome,
                        "versao_delegacia": c.get("delegacia"),
                        "versao_juizo": c.get("juizo"),
                        "contradicoes_identificadas": c.get("contradicao"),
                    }
                    if existing.data:
                        client.table("depoimentos_analise").update(update_data).eq("id", existing.data[0]["id"]).execute()
                    else:
                        client.table("depoimentos_analise").insert(update_data).execute()
                campos_atualizados.append("depoimentos_analise")

        return {
            "analise_cowork_id": analise_cowork_id,
            "tipo": tipo,
            "campos_atualizados": campos_atualizados,
            "testemunhas_atualizadas": testemunhas_atualizadas,
            "sucesso": True,
            "mensagem": f"Análise '{tipo}' importada com sucesso.",
        }

    async def _baixar_json_drive(self, folder_id: str, arquivo_nome: str, access_token: str) -> dict:
        """Busca o arquivo pelo nome na pasta Drive e faz download do JSON."""
        async with httpx.AsyncClient() as client:
            # Listar arquivos da pasta
            resp = await client.get(
                "https://www.googleapis.com/drive/v3/files",
                params={
                    "q": f"'{folder_id}' in parents and name = '{arquivo_nome}' and trashed = false",
                    "fields": "files(id,name)",
                },
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=10,
            )
            resp.raise_for_status()
            files = resp.json().get("files", [])
            if not files:
                raise ValueError(f"Arquivo '{arquivo_nome}' não encontrado na pasta {folder_id}")

            file_id = files[0]["id"]

            # Download do conteúdo
            dl = await client.get(
                f"https://www.googleapis.com/drive/v3/files/{file_id}",
                params={"alt": "media"},
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=15,
            )
            dl.raise_for_status()
            return dl.json()


_service: CoworkImportService | None = None

def get_cowork_import_service() -> CoworkImportService:
    global _service
    if _service is None:
        _service = CoworkImportService()
    return _service
```

### Step 3: Criar `enrichment-engine/routers/cowork.py`

```python
"""
POST /cowork/import — Importa _analise_ia.json do Drive para o banco OMBUDS.
"""
import logging

from fastapi import APIRouter, HTTPException, status

from models.schemas import CoworkImportInput, CoworkImportOutput
from services.cowork_import_service import get_cowork_import_service

logger = logging.getLogger("enrichment-engine.cowork")
router = APIRouter()


@router.post("/import", response_model=CoworkImportOutput)
async def importar_analise_cowork(input_data: CoworkImportInput) -> CoworkImportOutput:
    """
    Importa _analise_ia.json gerado pelo Cowork.

    1. Baixa o JSON da pasta Drive do assistido
    2. Salva histórico em analises_cowork
    3. Popula processos.analysis_data, testemunhas.*, depoimentos_analise
    """
    try:
        service = get_cowork_import_service()
        result = await service.importar(
            assistido_id=input_data.assistido_id,
            processo_id=input_data.processo_id,
            audiencia_id=input_data.audiencia_id,
            drive_folder_id=input_data.drive_folder_id,
            arquivo_nome=input_data.arquivo_nome,
            access_token=input_data.access_token,
        )
        return CoworkImportOutput(**result)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.exception("Erro ao importar análise Cowork")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
```

### Step 4: Registrar router em `enrichment-engine/main.py`

Adicionar após os outros imports/routers:

```python
from routers.cowork import router as cowork_router
# ...
app.include_router(cowork_router, prefix="/cowork", tags=["cowork"])
```

### Step 5: Adicionar tipo `CoworkImportInput`/`Output` em `src/lib/services/python-backend.ts`

No arquivo `src/lib/services/python-backend.ts`, adicionar método ao final da classe `PythonBackend`:

```typescript
async importarAnaliseCowork(input: {
  assistidoId: number;
  processoId?: number;
  audienciaId?: number;
  driveFolderId: string;
  arquivoNome?: string;
  accessToken: string;
}): Promise<{
  analiseCoworkId: number;
  tipo: string;
  camposAtualizados: string[];
  testemunhasAtualizadas: number;
  sucesso: boolean;
  mensagem: string;
}> {
  return this.request("/cowork/import", {
    method: "POST",
    body: JSON.stringify({
      assistido_id: input.assistidoId,
      processo_id: input.processoId,
      audiencia_id: input.audienciaId,
      drive_folder_id: input.driveFolderId,
      arquivo_nome: input.arquivoNome ?? "_analise_ia.json",
      access_token: input.accessToken,
    }),
  });
}
```

### Step 6: Commit

```bash
git add enrichment-engine/services/cowork_import_service.py enrichment-engine/routers/cowork.py enrichment-engine/main.py enrichment-engine/models/schemas.py src/lib/services/python-backend.ts
git commit -m "feat(enrichment): endpoint /cowork/import para importar _analise_ia.json (SCRUM-64)"
```

---

## Task 4: tRPC endpoint `briefing.importarAnaliseCowork`

**Files:**
- Modify: `src/lib/trpc/routers/briefing.ts`

### Step 1: Adicionar mutation no briefingRouter

No final do objeto `briefingRouter`, após `exportarParaCowork`:

```typescript
importarAnaliseCowork: protectedProcedure
  .input(
    z.object({
      assistidoId: z.number(),
      processoId: z.number().optional(),
      audienciaId: z.number().optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const assistido = await db.query.assistidos.findFirst({
      where: eq(assistidos.id, input.assistidoId),
    });

    if (!assistido?.driveFolderId) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Assistido sem pasta no Drive.",
      });
    }

    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Não foi possível obter token Google.",
      });
    }

    const result = await pythonBackend.importarAnaliseCowork({
      assistidoId: input.assistidoId,
      processoId: input.processoId,
      audienciaId: input.audienciaId,
      driveFolderId: assistido.driveFolderId,
      accessToken,
    });

    return result;
  }),
```

### Step 2: Build

```bash
npm run build
```

### Step 3: Commit

```bash
git add src/lib/trpc/routers/briefing.ts
git commit -m "feat(trpc): briefing.importarAnaliseCowork — trigger de importação (SCRUM-64)"
```

---

## Task 5: UI — Botão "Importar análise do Cowork"

**Files:**
- Modify: `src/app/(dashboard)/admin/assistidos/[id]/page.tsx`

### Step 1: Localizar e adicionar mutation

No topo do componente, próximo ao `exportarParaCowork.useMutation` (linha ~92):

```typescript
const importarAnaliseCowork = trpc.briefing.importarAnaliseCowork.useMutation({
  onSuccess: (data) => {
    toast.success(`Análise importada! Campos atualizados: ${data.camposAtualizados.join(", ")}`);
    utils.assistidos.getById.invalidate({ id: Number(id) });
  },
  onError: (err) => toast.error(err.message),
});
```

### Step 2: Adicionar botão na seção de processos

Na mesma área onde está o botão `exportarParaCowork` para processos (~linha 622), adicionar após o botão existente:

```tsx
<Button
  variant="outline"
  size="sm"
  disabled={importarAnaliseCowork.isPending}
  onClick={() =>
    importarAnaliseCowork.mutate({
      assistidoId: Number(id),
      processoId: p.id,
    })
  }
>
  {importarAnaliseCowork.isPending ? (
    <Loader2 className="h-3 w-3 animate-spin" />
  ) : (
    <Download className="h-3 w-3" />
  )}
  Importar do Cowork
</Button>
```

### Step 3: Adicionar botão na seção de audiências

Na linha ~756 onde está o botão de exportar audiência, adicionar botão de importar:

```tsx
<Button
  variant="outline"
  size="sm"
  disabled={importarAnaliseCowork.isPending}
  onClick={() =>
    importarAnaliseCowork.mutate({
      assistidoId: Number(id),
      audienciaId: a.id,
      processoId: a.processoId ?? undefined,
    })
  }
>
  <Download className="h-3 w-3" />
  Importar do Cowork
</Button>
```

### Step 4: Build final

```bash
npm run build
# Zero erros TypeScript
```

### Step 5: Commit

```bash
git add src/app/(dashboard)/admin/assistidos/[id]/page.tsx
git commit -m "feat(ui): botão 'Importar do Cowork' em processos e audiências (SCRUM-64)"
```

---

## Task 6: Atualizar Skills Cowork para salvar `_analise_ia.json`

**Files:**
- Modify: `~/Library/CloudStorage/GoogleDrive-rodrigorochameire@gmail.com/Meu Drive 2/1 - Defensoria 9ª DP/Inteligencia artificial/Skills Atualizadas/analise-audiencias.skill`
- Idem para: `criminal-comum.skill`, `juri.skill`, `vvd.skill`, `execucao-penal.skill`

### Step 1: Extrair e editar a skill

```bash
cd ~/Library/CloudStorage/GoogleDrive-rodrigorochameire@gmail.com/Meu\ Drive\ 2/1\ -\ Defensoria\ 9ª\ DP/Inteligencia\ artificial/Skills\ Atualizadas/
python3 -c "
import zipfile, shutil, os

skills = ['analise-audiencias', 'criminal-comum', 'juri', 'vvd', 'execucao-penal']
for skill in skills:
    with zipfile.ZipFile(f'{skill}.skill', 'r') as z:
        z.extractall(f'_edit_{skill}')
print('Extraídas. Edite os SKILL.md e rode o step 2.')
"
```

### Step 2: Adicionar seção de output JSON em cada `SKILL.md` extraído

No final de cada `_edit_<skill>/<skill>/SKILL.md`, adicionar:

```markdown
---

## Output Estruturado — _analise_ia.json

**SEMPRE ao final de cada análise**, além de salvar o `.md` / `.docx`, salvar o arquivo `_analise_ia.json` na **mesma pasta do assistido** com o seguinte schema:

\`\`\`json
{
  "schema_version": "1.0",
  "tipo": "<audiencia_criminal|audiencia_sumariante|juri|vvd|execucao_penal|ra>",
  "gerado_em": "<ISO 8601>",
  "assistido": "<nome completo>",
  "processo": "<número dos autos>",
  "resumo_fato": "<síntese do fato em 2-3 frases>",
  "tese_defesa": "<tese principal identificada>",
  "estrategia_atual": "<estratégia recomendada>",
  "crime_principal": "<tipo penal principal>",
  "pontos_criticos": ["<ponto 1>", "<ponto 2>"],
  "payload": {
    // audiencia_criminal / audiencia_sumariante:
    "perguntas_por_testemunha": [
      { "nome": "<nome>", "tipo": "ACUSACAO|DEFESA", "perguntas": ["<p1>", "<p2>"] }
    ],
    "contradicoes": [
      { "testemunha": "<nome>", "delegacia": "<versão>", "juizo": "<versão>", "contradicao": "<descrição>" }
    ],
    "orientacao_ao_assistido": "<orientação para o interrogatório>"
    // juri (adicional):
    // "perspectiva_plenaria": "<estratégia para o plenário>"
    // "quesitos_criticos": ["<quesito 1>"]
    // vvd (adicional):
    // "medidas_protetivas_vigentes": ["<medida 1>"]
    // execucao_penal (adicional):
    // "beneficios_pendentes": ["<benefício 1>"]
    // "datas_criticas": [{ "evento": "<nome>", "data": "YYYY-MM-DD" }]
  }
}
\`\`\`

**Instruções de salvamento:**
1. Gere o JSON com os campos preenchidos da análise
2. Salve como `_analise_ia.json` na pasta raiz do assistido (ex: `Meu Drive 2/.../NOME DO ASSISTIDO/_analise_ia.json`)
3. Se já existir um `_analise_ia.json` anterior, **substitua** (não crie novo)
4. Após salvar, informe: "✅ `_analise_ia.json` salvo — pronto para importar no OMBUDS via botão 'Importar do Cowork'"
```

### Step 3: Reempacotar as skills

```bash
python3 -c "
import zipfile, os, shutil

skills = ['analise-audiencias', 'criminal-comum', 'juri', 'vvd', 'execucao-penal']
for skill in skills:
    src = f'_edit_{skill}/{skill}'
    dest = f'{skill}.skill'
    # Backup original
    shutil.copy(dest, f'{dest}.bak')
    # Reempacotar
    with zipfile.ZipFile(dest, 'w', zipfile.ZIP_DEFLATED) as z:
        for root, dirs, files in os.walk(src):
            for file in files:
                fp = os.path.join(root, file)
                arcname = os.path.relpath(fp, f'_edit_{skill}')
                z.write(fp, arcname)
    shutil.rmtree(f'_edit_{skill}')
    print(f'{skill}.skill atualizada')
"
```

### Step 4: Reinstalar skills no Claude Desktop

Abrir Claude Desktop → Settings → Skills → reinstalar cada `.skill` atualizada.

---

## Task 7: Deploy Enrichment Engine

```bash
cd /Users/rodrigorochameire/Projetos/Defender/enrichment-engine
railway up -d
```

Verificar nos logs do Railway que o endpoint `/cowork/import` aparece registrado.

---

## Task 8: Fechar tickets no Jira

```bash
# Marcar SCRUM-65 e SCRUM-64 como Done via API
AUTH="rodrigorochameire@gmail.com:SEU_ATLASSIAN_API_TOKEN"
for key in SCRUM-65 SCRUM-64; do
  curl -s -o /dev/null -w "$key: %{http_code}\n" -u "$AUTH" \
    -X POST "https://ombuds.atlassian.net/rest/api/3/issue/$key/transitions" \
    -H "Content-Type: application/json" \
    -d '{"transition":{"id":"41"}}'
done
```

---

## Sumário de Arquivos Modificados

| Arquivo | Tipo | Tarefa |
|---------|------|--------|
| `src/lib/db/schema/casos.ts` | Modify | Task 1 — tabela analises_cowork |
| `src/lib/db/schema/relations.ts` | Modify | Task 1 — relações |
| `src/lib/db/schema/index.ts` | Modify | Task 1 — re-export |
| `drizzle/0015_analises_cowork.sql` | Create | Task 1 — migration |
| `src/lib/trpc/routers/briefing.ts` | Modify | Task 2 + Task 4 |
| `enrichment-engine/models/schemas.py` | Modify | Task 3 |
| `enrichment-engine/services/cowork_import_service.py` | Create | Task 3 |
| `enrichment-engine/routers/cowork.py` | Create | Task 3 |
| `enrichment-engine/main.py` | Modify | Task 3 |
| `src/lib/services/python-backend.ts` | Modify | Task 3 |
| `src/app/(dashboard)/admin/assistidos/[id]/page.tsx` | Modify | Task 5 |
| `*.skill` (5 arquivos) | Modify | Task 6 |
