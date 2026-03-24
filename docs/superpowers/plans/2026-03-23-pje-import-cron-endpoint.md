# PJe Import Cron Endpoint — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar `POST /api/cron/pje-import` que aceita texto bruto do PJe, faz o parse e insere demandas no banco — sem UI de revisão, chamável pelo scraper Railway ou manualmente.

**Architecture:** Uma função `importarDemandas()` reutilizável é criada em `src/lib/services/pje-import.ts`, contendo toda a lógica de DB atualmente inline no tRPC `importFromSheets`. O endpoint cron chama `parsePJeIntimacoesCompleto` + `intimacaoToDemanda` do pje-parser, e depois `importarDemandas`. A autenticação usa o `CRON_SECRET` já existente no projeto.

**Tech Stack:** Next.js 15 App Router, Drizzle ORM, TypeScript, pje-parser (interno)

---

## Files

| Ação | Arquivo | Responsabilidade |
|------|---------|-----------------|
| CREATE | `src/lib/services/pje-import.ts` | Lógica de DB para upsert assistido+processo+demanda (extraída do tRPC) |
| CREATE | `src/app/api/cron/pje-import/route.ts` | Endpoint POST: parse + import + retorno de resultado |
| MODIFY | `vercel.json` | Não alterar — este endpoint é chamado pelo scraper, não pelo Vercel cron |

**Nota:** `src/lib/trpc/routers/demandas.ts` NÃO é alterado. A refatoração DRY fica para depois.

---

## Task 1: Criar `src/lib/services/pje-import.ts`

Essa função contém toda a lógica de DB do `importFromSheets` atual, tornada standalone (sem `ctx`).

**Files:**
- Create: `src/lib/services/pje-import.ts`

- [ ] **Step 1: Criar o arquivo com os tipos e constantes**

```typescript
// src/lib/services/pje-import.ts
import { db } from "@/lib/db";
import { demandas, processos, assistidos } from "@/lib/db/schema";
import { eq, ilike, and, gte, isNull, inArray, sql } from "drizzle-orm";

export interface ImportRow {
  assistido: string;
  processoNumero?: string;
  ato: string;
  prazo?: string;
  dataEntrada?: string;
  dataExpedicaoCompleta?: string;
  dataInclusao?: string;
  status?: string;
  estadoPrisional?: string;
  providencias?: string;
  atribuicao?: string;
  importBatchId?: string;
  ordemOriginal?: number;
  assistidoMatchId?: number;
  tipoDocumento?: string;
  crime?: string;
  tipoProcesso?: string;
  vara?: string;
  idDocumentoPje?: string;
  atribuicaoDetectada?: string;
}

export interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
  assistidosSemSolar: number;
}
```

- [ ] **Step 2: Adicionar as constantes de mapeamento**

```typescript
const STATUS_TO_DB: Record<string, string> = {
  "fila": "5_FILA",
  "atender": "2_ATENDER",
  "analisar": "2_ATENDER",
  "elaborar": "2_ATENDER",
  "elaborando": "2_ATENDER",
  "buscar": "2_ATENDER",
  "revisar": "2_ATENDER",
  "revisando": "2_ATENDER",
  "relatorio": "2_ATENDER",
  "documentos": "2_ATENDER",
  "testemunhas": "2_ATENDER",
  "investigar": "2_ATENDER",
  "oficiar": "2_ATENDER",
  "monitorar": "4_MONITORAR",
  "protocolar": "5_FILA",
  "protocolado": "7_PROTOCOLADO",
  "ciencia": "7_CIENCIA",
  "sem_atuacao": "7_SEM_ATUACAO",
  "constituiu_advogado": "CONCLUIDO",
  "urgente": "URGENTE",
  "resolvido": "CONCLUIDO",
  "arquivado": "ARQUIVADO",
  "amanda": "2_ATENDER",
  "emilly": "2_ATENDER",
  "taissa": "2_ATENDER",
  "estágio_-_taissa": "2_ATENDER",
  "estagio_-_taissa": "2_ATENDER",
};

const ATRIBUICAO_TO_AREA: Record<string, string> = {
  "Tribunal do Júri": "JURI",
  "Grupo Especial do Júri": "JURI",
  "Violência Doméstica": "VIOLENCIA_DOMESTICA",
  "Violência Doméstica - Camaçari": "VIOLENCIA_DOMESTICA",
  "Execução Penal": "EXECUCAO_PENAL",
  "Substituição Criminal": "SUBSTITUICAO",
  "Substituição Cível": "CIVEL",
  "Curadoria Especial": "CURADORIA",
  "JURI_CAMACARI": "JURI",
  "GRUPO_JURI": "JURI",
  "VVD_CAMACARI": "VIOLENCIA_DOMESTICA",
  "EXECUCAO_PENAL": "EXECUCAO_PENAL",
  "SUBSTITUICAO": "SUBSTITUICAO",
  "SUBSTITUICAO_CIVEL": "CIVEL",
};

const ATRIBUICAO_TO_ENUM: Record<string, string> = {
  "Tribunal do Júri": "JURI_CAMACARI",
  "Grupo Especial do Júri": "GRUPO_JURI",
  "Violência Doméstica": "VVD_CAMACARI",
  "Violência Doméstica - Camaçari": "VVD_CAMACARI",
  "Execução Penal": "EXECUCAO_PENAL",
  "Substituição Criminal": "SUBSTITUICAO",
  "Substituição Cível": "SUBSTITUICAO_CIVEL",
  "Curadoria Especial": "SUBSTITUICAO_CIVEL",
  "JURI_CAMACARI": "JURI_CAMACARI",
  "GRUPO_JURI": "GRUPO_JURI",
  "VVD_CAMACARI": "VVD_CAMACARI",
  "EXECUCAO_PENAL": "EXECUCAO_PENAL",
  "SUBSTITUICAO": "SUBSTITUICAO",
  "SUBSTITUICAO_CIVEL": "SUBSTITUICAO_CIVEL",
};

const CONCLUIDA_IMPORT_KEYS = new Set([
  "protocolado", "ciencia", "sem_atuacao", "constituiu_advogado", "resolvido", "arquivado",
]);
```

- [ ] **Step 3: Adicionar helpers `convertDate` e `inferirFase`**

```typescript
function convertDate(dateStr: string | undefined): string | null {
  if (!dateStr || !dateStr.trim()) return null;
  const cleaned = dateStr.trim().replace(/\./g, "/");
  const match = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (match) {
    const [, dia, mes, ano] = match;
    const anoFull = ano.length === 2 ? `20${ano}` : ano;
    return `${anoFull}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
  }
  const isoMatch = cleaned.match(/^\d{4}-\d{2}-\d{2}$/);
  if (isoMatch) return cleaned;
  return null;
}

function inferirFaseProcessual(tipoDocumento?: string): string | undefined {
  if (!tipoDocumento) return undefined;
  const tipo = tipoDocumento.toLowerCase();
  if (tipo.includes("sentença") || tipo.includes("sentenca")) return "sentença";
  if (tipo.includes("decisão") || tipo.includes("decisao")) return "instrução";
  if (tipo.includes("ato ordinatório") || tipo.includes("ato ordinatorio")) return "instrução";
  if (tipo.includes("despacho")) return "instrução";
  return undefined;
}
```

- [ ] **Step 4: Implementar a função `importarDemandas`**

```typescript
export async function importarDemandas(
  rows: ImportRow[],
  defensorId: number,
  atualizarExistentes = false,
): Promise<ImportResult> {
  const results: ImportResult = {
    imported: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    assistidosSemSolar: 0,
  };

  const assistidoIdsImportados = new Set<number>();

  for (const row of rows) {
    try {
      // 1. Buscar ou criar assistido
      let assistido;
      if (row.assistidoMatchId) {
        assistido = await db.query.assistidos.findFirst({
          where: and(eq(assistidos.id, row.assistidoMatchId), isNull(assistidos.deletedAt)),
        });
      }
      if (!assistido) {
        assistido = await db.query.assistidos.findFirst({
          where: and(ilike(assistidos.nome, row.assistido.trim()), isNull(assistidos.deletedAt)),
        });
      }

      if (assistido && !assistido.atribuicaoPrimaria) {
        const backfill = ATRIBUICAO_TO_ENUM[row.atribuicao || row.atribuicaoDetectada || ""];
        if (backfill) {
          await db.update(assistidos)
            .set({ atribuicaoPrimaria: backfill as any })
            .where(eq(assistidos.id, assistido.id));
        }
      }

      if (!assistido) {
        const statusPrisional = row.estadoPrisional === "preso"
          ? "CADEIA_PUBLICA"
          : row.estadoPrisional === "monitorado"
            ? "MONITORADO"
            : "SOLTO";
        const targetAtribuicaoPrimaria = (ATRIBUICAO_TO_ENUM[row.atribuicao || row.atribuicaoDetectada || ""] || "JURI_CAMACARI") as any;
        const [newAssistido] = await db.insert(assistidos).values({
          nome: row.assistido.trim(),
          statusPrisional: statusPrisional as any,
          atribuicaoPrimaria: targetAtribuicaoPrimaria,
          defensorId,
        }).returning();
        assistido = newAssistido;

        // Auto-create Drive folder (fire-and-forget)
        (async () => {
          try {
            const { isGoogleDriveConfigured, createOrFindAssistidoFolder, mapAtribuicaoToFolderKey } =
              await import("@/lib/services/google-drive");
            if (!isGoogleDriveConfigured()) return;
            const folderKey = mapAtribuicaoToFolderKey(targetAtribuicaoPrimaria);
            if (!folderKey) return;
            const folder = await createOrFindAssistidoFolder(folderKey, newAssistido.nome);
            if (folder) {
              await db.update(assistidos)
                .set({ driveFolderId: folder.id, updatedAt: new Date() })
                .where(eq(assistidos.id, newAssistido.id));
            }
          } catch (err) {
            console.error(`[pje-import] Drive folder failed for ${newAssistido.id}:`, err);
          }
        })();
      }

      assistidoIdsImportados.add(assistido.id);

      // 2. Buscar ou criar processo
      const processoNumero = row.processoNumero?.trim() || "";
      const inputAtribuicao = row.atribuicao || "";
      const targetArea = (ATRIBUICAO_TO_AREA[inputAtribuicao] || "JURI") as any;
      const targetAtribuicao = (ATRIBUICAO_TO_ENUM[inputAtribuicao] || inputAtribuicao || "JURI_CAMACARI") as any;

      let processo;
      if (processoNumero) {
        processo = await db.query.processos.findFirst({
          where: and(eq(processos.numeroAutos, processoNumero), isNull(processos.deletedAt)),
        });
        if (processo && processo.atribuicao !== targetAtribuicao) {
          const [updated] = await db.update(processos)
            .set({ atribuicao: targetAtribuicao, area: targetArea, updatedAt: new Date() })
            .where(eq(processos.id, processo.id))
            .returning();
          processo = updated;
        }
      }
      if (!processo) {
        const [newProcesso] = await db.insert(processos).values({
          assistidoId: assistido.id,
          numeroAutos: processoNumero || `SN-${Date.now()}-${results.imported}`,
          area: targetArea,
          atribuicao: targetAtribuicao,
        }).returning();
        processo = newProcesso;
      }

      // 3. Converter data de expedição para busca de duplicata
      const dataEntradaConvertida = convertDate(row.dataEntrada);
      let dataExpedicaoParaBusca = dataEntradaConvertida;
      if (row.dataExpedicaoCompleta) {
        if (row.dataExpedicaoCompleta.includes("T")) {
          dataExpedicaoParaBusca = row.dataExpedicaoCompleta.split("T")[0];
        } else if (row.dataExpedicaoCompleta.includes(" ")) {
          dataExpedicaoParaBusca = convertDate(row.dataExpedicaoCompleta.split(" ")[0]);
        } else {
          dataExpedicaoParaBusca = convertDate(row.dataExpedicaoCompleta);
        }
      }

      // 4. Verificar duplicata
      let existingDemanda;
      if (dataExpedicaoParaBusca) {
        existingDemanda = await db.query.demandas.findFirst({
          where: and(
            eq(demandas.processoId, processo.id),
            eq(demandas.dataEntrada, dataExpedicaoParaBusca),
            isNull(demandas.deletedAt),
          ),
        });
      }
      if (!existingDemanda && row.ato && row.ato !== "Demanda importada") {
        existingDemanda = await db.query.demandas.findFirst({
          where: and(
            eq(demandas.processoId, processo.id),
            eq(demandas.ato, row.ato),
            dataExpedicaoParaBusca
              ? eq(demandas.dataEntrada, dataExpedicaoParaBusca)
              : isNull(demandas.dataEntrada),
            isNull(demandas.deletedAt),
          ),
        });
      }
      if (!existingDemanda && !dataExpedicaoParaBusca) {
        const trintaDiasAtras = new Date();
        trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
        existingDemanda = await db.query.demandas.findFirst({
          where: and(
            eq(demandas.processoId, processo.id),
            isNull(demandas.dataEntrada),
            gte(demandas.createdAt, trintaDiasAtras),
            isNull(demandas.deletedAt),
          ),
        });
      }

      // 5. Determinar status
      const statusKey = (row.status || "analisar").toLowerCase().replace(/\s+/g, "_").trim();
      const dbStatus = CONCLUIDA_IMPORT_KEYS.has(statusKey)
        ? (STATUS_TO_DB[statusKey] || "5_FILA")
        : "5_FILA";
      const reuPreso = row.estadoPrisional === "preso";
      const substatus = statusKey || null;

      // 6. Inserir ou atualizar
      if (existingDemanda) {
        if (atualizarExistentes) {
          await db.update(demandas)
            .set({
              ato: row.ato,
              prazo: convertDate(row.prazo),
              dataEntrada: convertDate(row.dataEntrada),
              status: dbStatus as any,
              substatus,
              prioridade: reuPreso ? "REU_PRESO" : "NORMAL",
              reuPreso,
              providencias: row.providencias || null,
              updatedAt: new Date(),
            })
            .where(eq(demandas.id, existingDemanda.id));
          results.updated++;
        } else {
          results.skipped++;
        }
        continue;
      }

      await db.insert(demandas).values({
        processoId: processo.id,
        assistidoId: assistido.id,
        ato: row.ato,
        prazo: convertDate(row.prazo),
        dataEntrada: convertDate(row.dataEntrada),
        status: dbStatus as any,
        substatus,
        prioridade: reuPreso ? "REU_PRESO" : "NORMAL",
        reuPreso,
        providencias: row.providencias || null,
        defensorId,
        importBatchId: row.importBatchId || null,
        ordemOriginal: row.ordemOriginal ?? null,
        enrichmentData: (row.crime || row.tipoDocumento || row.tipoProcesso) ? {
          crime: row.crime || undefined,
          artigos: [],
          fase_processual: inferirFaseProcessual(row.tipoDocumento),
          tipo_documento_pje: row.tipoDocumento || undefined,
          tipo_processo: row.tipoProcesso || undefined,
          id_documento_pje: row.idDocumentoPje || undefined,
          vara: row.vara || undefined,
        } as any : undefined,
      });

      results.imported++;
    } catch (error) {
      results.errors.push(`${row.assistido}: ${(error as Error).message}`);
    }
  }

  // Contar assistidos sem Solar
  if (assistidoIdsImportados.size > 0) {
    const idsArray = Array.from(assistidoIdsImportados);
    const [semSolarResult] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(assistidos)
      .where(and(
        inArray(assistidos.id, idsArray),
        isNull(assistidos.solarExportadoEm),
        isNull(assistidos.deletedAt),
      ));
    results.assistidosSemSolar = semSolarResult?.count ?? 0;
  }

  return results;
}
```

- [ ] **Step 5: Verificar TypeScript compilando**
```bash
cd /Users/rodrigorochameire/Projetos/Defender
npx tsc --noEmit 2>&1 | head -30
```
Esperado: sem erros em `pje-import.ts`

- [ ] **Step 6: Commit**
```bash
git add src/lib/services/pje-import.ts
git commit -m "feat(pje): criar serviço compartilhado importarDemandas"
```

---

## Task 2: Criar `src/app/api/cron/pje-import/route.ts`

**Files:**
- Create: `src/app/api/cron/pje-import/route.ts`

**Contrato da API:**
```
POST /api/cron/pje-import
Authorization: Bearer <CRON_SECRET>
Content-Type: application/json

{
  "textoJuri":      "<texto copiado do PJe — pasta Júri>",
  "textoExecucoes": "<texto copiado do PJe — pasta Execuções>",
  "defensorId":     42          // opcional, fallback: env CRON_DEFENSOR_ID
}

Response 200:
{
  "ok": true,
  "juri":     { "imported": 3, "updated": 0, "skipped": 1, "errors": [] },
  "execucoes": { "imported": 2, "updated": 0, "skipped": 0, "errors": [] },
  "totalNovas": 5
}
```

- [ ] **Step 1: Criar o arquivo de rota**

```typescript
/**
 * POST /api/cron/pje-import
 *
 * Recebe texto bruto do PJe (caixa de intimações), faz parse e importa
 * demandas diretamente no banco, sem passar pelo modal de revisão do UI.
 *
 * Chamado pelo PJe scraper no Railway (Fase 2) ou manualmente para testes.
 *
 * Autenticação: Bearer token (CRON_SECRET)
 * Body: { textoJuri?, textoExecucoes?, defensorId? }
 */

import { NextRequest, NextResponse } from "next/server";
import { parsePJeIntimacoesCompleto, intimacaoToDemanda } from "@/lib/pje-parser";
import { importarDemandas, type ImportRow } from "@/lib/services/pje-import";
import { randomUUID } from "crypto";

function getDefensorId(bodyDefensorId?: number): number | null {
  if (bodyDefensorId) return bodyDefensorId;
  const envId = process.env.CRON_DEFENSOR_ID;
  return envId ? parseInt(envId, 10) : null;
}

async function processarTexto(
  texto: string,
  atribuicao: string,
  defensorId: number,
): Promise<{ imported: number; updated: number; skipped: number; errors: string[] }> {
  const resultado = parsePJeIntimacoesCompleto(texto);
  const batchId = randomUUID();

  const rows: ImportRow[] = resultado.intimacoes.map((int) => {
    const demanda = intimacaoToDemanda(int, atribuicao);
    return {
      assistido: demanda.assistido,
      processoNumero: demanda.processos?.[0]?.numero,
      ato: demanda.ato || "Ciência",
      prazo: demanda.prazo || undefined,
      dataEntrada: demanda.data?.split("T")[0] || undefined,
      dataExpedicaoCompleta: demanda.data || undefined,
      dataInclusao: demanda.dataInclusao || undefined,
      status: demanda.status || "analisar",
      estadoPrisional: demanda.estadoPrisional || "Solto",
      atribuicao,
      importBatchId: batchId,
      ordemOriginal: int.ordemOriginal,
      tipoDocumento: int.tipoDocumento,
      crime: int.crime,
      tipoProcesso: int.tipoProcesso,
      vara: int.vara,
      idDocumentoPje: int.idDocumento,
      atribuicaoDetectada: int.atribuicaoDetectada,
    };
  });

  return importarDemandas(rows, defensorId, false);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Autenticação
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse do body
  let body: { textoJuri?: string; textoExecucoes?: string; defensorId?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const defensorId = getDefensorId(body.defensorId);
  if (!defensorId) {
    return NextResponse.json(
      { error: "defensorId required — set body.defensorId or CRON_DEFENSOR_ID env var" },
      { status: 400 },
    );
  }

  const resultadoJuri = body.textoJuri
    ? await processarTexto(body.textoJuri, "Tribunal do Júri", defensorId)
    : { imported: 0, updated: 0, skipped: 0, errors: [] };

  const resultadoExecucoes = body.textoExecucoes
    ? await processarTexto(body.textoExecucoes, "Execução Penal", defensorId)
    : { imported: 0, updated: 0, skipped: 0, errors: [] };

  const totalNovas = resultadoJuri.imported + resultadoExecucoes.imported;

  console.log(
    `[pje-import] Júri: +${resultadoJuri.imported} | Exec: +${resultadoExecucoes.imported} | Total novas: ${totalNovas}`,
  );

  return NextResponse.json({
    ok: true,
    juri: resultadoJuri,
    execucoes: resultadoExecucoes,
    totalNovas,
  });
}
```

- [ ] **Step 2: Verificar TypeScript**
```bash
npx tsc --noEmit 2>&1 | head -30
```
Esperado: sem erros novos

- [ ] **Step 3: Build local para verificar**
```bash
npm run build 2>&1 | tail -20
```
Esperado: build sem erros

- [ ] **Step 4: Commit**
```bash
git add src/app/api/cron/pje-import/route.ts
git commit -m "feat(pje): endpoint POST /api/cron/pje-import para import headless"
```

---

## Task 3: Configurar env var `CRON_DEFENSOR_ID` no Vercel

- [ ] **Step 1: Descobrir o defensorId do usuário**

Executar no terminal local:
```bash
node -e "
const { createClient } = require('@supabase/supabase-js');
// ou usar a DATABASE_URL diretamente via psql:
// psql \$DATABASE_URL -c 'SELECT id, name, email, role FROM users WHERE role = \'DEFENSOR\' LIMIT 10;'
"
```

Alternativa mais simples (consulta direta):
```bash
npx dotenv -e .env.local -- node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT id, name, email FROM users WHERE role = \'DEFENSOR\' LIMIT 5', (e, r) => {
  console.log(r?.rows); pool.end();
});
"
```

Anotar o `id` do defensor responsável pelas importações (o usuário que hoje faz o copy-paste manual).

- [ ] **Step 2: Adicionar a env var no Vercel**
```bash
vercel env add CRON_DEFENSOR_ID production
# Quando pedir o valor: digitar o ID descoberto no step anterior (ex: 42)
```

- [ ] **Step 3: Verificar env vars do projeto**
```bash
vercel env ls
```
Esperado: `CRON_DEFENSOR_ID` aparece em production.

---

## Task 4: Testar o endpoint manualmente

- [ ] **Step 1: Deploy para staging/preview**
```bash
vercel
```
Anotar a URL do preview deployment (ex: `https://defender-xyz.vercel.app`)

- [ ] **Step 2: Testar com texto PJe real**
```bash
curl -X POST https://PREVIEW_URL/api/cron/pje-import \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "textoJuri": "FULANO DA SILVA\nIntimação (62096897)\n0123456-78.2024.8.05.0001\n01/03/2026\nVARA DO JURI DE CAMACARI"
  }'
```
Esperado:
```json
{ "ok": true, "juri": { "imported": 1, "skipped": 0, "errors": [] }, "totalNovas": 1 }
```

- [ ] **Step 3: Verificar no OMBUDS que a demanda apareceu**
Acessar `https://ombuds.vercel.app/demandas` e confirmar que a demanda do FULANO DA SILVA aparece na triagem (status 5_FILA).

- [ ] **Step 4: Testar idempotência — rodar de novo com o mesmo texto**
```bash
# Mesmo curl do Step 2
```
Esperado:
```json
{ "ok": true, "juri": { "imported": 0, "skipped": 1, "errors": [] }, "totalNovas": 0 }
```
Confirma que duplicata foi detectada.

- [ ] **Step 5: Commit final + deploy prod**
```bash
git add -A && git commit -m "test: validado endpoint pje-import — Fase 1 completa"
vercel --prod
```

---

## Próximos Passos (fora deste plano)

- **Fase 2**: `services/pje_scraper.py` no enrichment-engine que usa Playwright para logar no PJe, extrair texto e chamar este endpoint — ticket SCRUM-66
- **Fase 3**: Railway cron `0 8 * * 1-6` que aciona o scraper
- **DRY opcional**: Refatorar `demandas.ts` para usar `importarDemandas` do shared service (elimina duplicação)
