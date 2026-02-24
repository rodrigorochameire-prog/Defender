# SIGAD Sync — Confiabilidade, Consistência e Rastreabilidade

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Tornar o fluxo SIGAD → Solar seguro contra crashes do browser, livre de anotações duplicadas, e rastreável por timestamps de sincronização.

**Architecture:**
- Task 1 (Python): `_reset_browser()` + try/except com 1 retry em `exportar_assistido_por_cpf` para falhas Playwright
- Task 2 (Migration): coluna `conteudo_hash varchar(16)` em `anotacoes` + unique index parcial; colunas `sigad_id`, `sigad_exportado_em`, `solar_exportado_em` em `assistidos`
- Task 3 (TypeScript): deduplicação via `onConflictDoNothing` em `solar.ts`; update de timestamps SIGAD/Solar após exportação

**Tech Stack:** Python/Playwright (enrichment-engine), Drizzle ORM + PostgreSQL (Next.js), tRPC

---

## Task 1 — Browser resilience no scraper Python

**Files:**
- Modify: `enrichment-engine/services/sigad_scraper_service.py`

### Step 1: Adicionar `_reset_browser()` logo após `_get_page`

Localizar o bloco `# Lifecycle` (~linha 107) e adicionar após `_get_page`:

```python
async def _reset_browser(self) -> None:
    """
    Destrói o browser Playwright e limpa todo o estado interno.
    Chamado quando um crash é detectado — a próxima chamada a _ensure_browser()
    recriará tudo do zero.
    """
    logger.warning("Resetando browser Playwright (crash ou timeout detectado)")
    self._authenticated = False
    try:
        if self._page and not self._page.is_closed():
            await self._page.close()
    except Exception:
        pass
    try:
        if self._context:
            await self._context.close()
    except Exception:
        pass
    try:
        if self._browser:
            await self._browser.close()
    except Exception:
        pass
    try:
        if self._playwright:
            await self._playwright.stop()
    except Exception:
        pass
    finally:
        self._page = None
        self._context = None
        self._browser = None
        self._playwright = None
```

### Step 2: Envolver o corpo de `exportar_assistido_por_cpf` com try/except + 1 retry

O método atual (~linha 654) não tem nenhum `try/except`. Substituir o corpo interno por:

```python
async def exportar_assistido_por_cpf(
    self,
    cpf: str,
    numeros_processo_ombuds: list[str] | None = None,
) -> dict[str, Any]:
    """..."""
    try:
        return await self._exportar_assistido_interno(cpf, numeros_processo_ombuds)
    except Exception as e:
        error_type = type(e).__name__
        # Erros Playwright que indicam browser morto
        playwright_crashes = ("TimeoutError", "TargetClosedError", "ConnectionError",
                              "BrowserType", "Error")
        is_playwright_crash = any(t in error_type for t in playwright_crashes)

        if is_playwright_crash:
            logger.warning(
                "Playwright crash detectado (%s: %s) — resetando browser e tentando 1x mais",
                error_type, e,
            )
            await self._reset_browser()
            try:
                return await self._exportar_assistido_interno(cpf, numeros_processo_ombuds)
            except Exception as e2:
                logger.error("Segunda tentativa também falhou: %s: %s", type(e2).__name__, e2)
                return {
                    "success": False,
                    "encontrado_sigad": False,
                    "ja_existia_solar": False,
                    "verificacao_processo": None,
                    "sigad_processo": None,
                    "dados_para_enriquecer": None,
                    "solar_url": None,
                    "sigad_id": None,
                    "nome_sigad": None,
                    "vara": None,
                    "observacoes": [],
                    "message": f"Falha persistente no browser: {e2}",
                    "error": f"playwright_{type(e2).__name__.lower()}",
                }

        # Erro não-Playwright (ex: bug de lógica) — retornar com tipo explícito
        logger.error("Erro inesperado em exportar_assistido_por_cpf: %s: %s", error_type, e)
        return {
            "success": False,
            "encontrado_sigad": False,
            "ja_existia_solar": False,
            "verificacao_processo": None,
            "sigad_processo": None,
            "dados_para_enriquecer": None,
            "solar_url": None,
            "sigad_id": None,
            "nome_sigad": None,
            "vara": None,
            "observacoes": [],
            "message": f"Erro interno: {e}",
            "error": f"internal_{error_type.lower()}",
        }
```

### Step 3: Renomear o corpo atual para `_exportar_assistido_interno`

O bloco atual de `exportar_assistido_por_cpf` (busca → extrato → verificação → export) vira um método privado:

```python
async def _exportar_assistido_interno(
    self,
    cpf: str,
    numeros_processo_ombuds: list[str] | None = None,
) -> dict[str, Any]:
    # ... corpo atual sem alteração ...
```

### Step 4: Verificar sintaxe

```bash
cd enrichment-engine
python3 -c "import ast; ast.parse(open('services/sigad_scraper_service.py').read()); print('✅ OK')"
```

Esperado: `✅ OK`

### Step 5: Commit

```bash
git add enrichment-engine/services/sigad_scraper_service.py
git commit -m "feat(sigad): browser resilience — reset + 1 retry em crashes Playwright"
```

---

## Task 2 — Migration: colunas de hash e rastreabilidade

**Files:**
- Modify: `src/lib/db/schema.ts`
- Run: `npm run db:push`

### Step 1: Adicionar `conteudoHash` na tabela `anotacoes`

Localizar `export const anotacoes = pgTable("anotacoes", {` (~linha 164 do schema.ts).

Após a linha `importante: boolean("importante").default(false),`, adicionar:

```typescript
// Deduplicação de anotações importadas de sistemas externos (ex: SIGAD)
// SHA-256 truncado (16 hex chars) do conteúdo — previne inserção duplicada
conteudoHash: varchar("conteudo_hash", { length: 16 }),
```

No bloco de índices da tabela `anotacoes` (dentro do array `(table) => [`), adicionar:

```typescript
// Unique parcial: só aplica quando conteudo_hash está preenchido
// Previne duplicatas de anotações importadas sem afetar notas manuais
uniqueIndex("anotacoes_conteudo_hash_assistido_unique_idx")
  .on(table.assistidoId, table.conteudoHash)
  .where(isNotNull(table.conteudoHash)),
```

Adicionar `isNotNull` ao import do drizzle-orm no schema:
```typescript
// O schema já importa de drizzle-orm/pg-core — verificar se isNotNull está disponível
// Se não estiver: é uma função de drizzle-orm (não pg-core), adicionar import separado
```

**Nota:** `uniqueIndex(...).where(...)` é suportado pelo Drizzle ORM com Postgres. A sintaxe SQL gerada será:
```sql
CREATE UNIQUE INDEX ... ON anotacoes (assistido_id, conteudo_hash)
WHERE conteudo_hash IS NOT NULL;
```

### Step 2: Adicionar colunas SIGAD/Solar em `assistidos`

Localizar `export const assistidos = pgTable("assistidos", {` (~linha 164).

Após `driveFolderId: text("drive_folder_id"),`, antes dos metadados (`deletedAt`), adicionar:

```typescript
// Integração SIGAD / Solar
sigadId: varchar("sigad_id", { length: 20 }),         // ID no SIGAD (ex: "299298")
sigadExportadoEm: timestamp("sigad_exportado_em"),    // Última busca/sync com o SIGAD
solarExportadoEm: timestamp("solar_exportado_em"),    // Última exportação ao Solar com sucesso
```

### Step 3: Aplicar migration

```bash
npm run db:push
```

Esperado: Drizzle confirma as colunas novas sem erros.

Se o `uniqueIndex(...).where(...)` gerar erro de sintaxe no push, fallback: usar índice normal sem `.where()` — ainda protege, mas aplica à todas as linhas (inclusive `NULL`s, que o Postgres trata como distintos — logo não há problema prático).

### Step 4: Verificar no banco

```bash
npm run db:studio
```

Confirmar visualmente: tabela `anotacoes` tem coluna `conteudo_hash`; tabela `assistidos` tem `sigad_id`, `sigad_exportado_em`, `solar_exportado_em`.

### Step 5: Commit

```bash
git add src/lib/db/schema.ts
git commit -m "feat(schema): conteudo_hash em anotacoes + sigad_id/timestamps em assistidos"
```

---

## Task 3 — TypeScript: deduplicação + rastreabilidade em solar.ts

**Files:**
- Modify: `src/lib/trpc/routers/solar.ts`

### Step 1: Adicionar import de `createHash`

No topo do arquivo, após os imports existentes:

```typescript
import { createHash } from "crypto";
```

### Step 2: Adicionar `sigadId`, `sigadExportadoEm`, `solarExportadoEm` ao import do schema

No import `{ processos, documentos, anotacoes }` do schema, adicionar `assistidos` se ainda não estiver importado no bloco superior (já está presente via `import("@/lib/db/schema")` dinâmico, mas precisamos dele estático para o update de rastreabilidade).

Verificar linha ~18 — se `assistidos` já aparece no import estático, ok. Se não:
```typescript
import { processos, documentos, anotacoes, assistidos } from "@/lib/db/schema";
```

### Step 3: Substituir o loop de inserção de observações em `exportarViaSigad`

Localizar o bloco (~linha 372):

```typescript
for (const obs of result.observacoes) {
  if (!obs.texto) continue;
  const conteudo = [...]
    .filter(Boolean)
    .join("\n");

  await db.insert(anotacoes).values({
    assistidoId: input.assistidoId,
    ...
  });
}
```

Substituir por:

```typescript
for (const obs of result.observacoes) {
  if (!obs.texto) continue;
  const conteudo = [
    `[SIGAD] ${obs.tipo ?? "Observação"} — ${obs.data ?? ""}`,
    obs.defensor ? `Defensor/Servidor: ${obs.defensor}` : null,
    obs.texto,
  ]
    .filter(Boolean)
    .join("\n");

  // Hash SHA-256 truncado (16 hex) para deduplicação idempotente
  const conteudoHash = createHash("sha256")
    .update(conteudo)
    .digest("hex")
    .slice(0, 16);

  const inserted = await db
    .insert(anotacoes)
    .values({
      assistidoId: input.assistidoId,
      processoId: processoIdVinculo,
      conteudo,
      conteudoHash,
      tipo: "atendimento",
      importante: false,
      createdById: ctx.user.id,
    })
    .onConflictDoNothing();   // unique index em (assistidoId, conteudoHash)

  // Só conta como "nova" se de fato inseriu
  if ((inserted.rowCount ?? 0) > 0) {
    novasAnotacoes++;
  }
}
```

**Nota:** declarar `let novasAnotacoes = 0;` antes do loop e usar no `camposEnriquecidos.push(...)` no final:
```typescript
if (novasAnotacoes > 0) {
  camposEnriquecidos.push(`${novasAnotacoes} observações novas`);
} else if (result.observacoes.length > 0) {
  camposEnriquecidos.push(`${result.observacoes.length} observações já existiam (sem duplicatas)`);
}
```

### Step 4: Atualizar timestamps SIGAD/Solar após exportação

No `exportarViaSigad`, **após** o bloco de enriquecimento de campos (~linha 356), adicionar:

```typescript
// Rastreabilidade: registrar quando foi sincronizado com SIGAD e Solar
const sigadTimestampUpdate: Record<string, unknown> = {
  sigadExportadoEm: new Date(),
  updatedAt: new Date(),
};
// Gravar sigad_id se disponível
if (result.sigad_id) {
  sigadTimestampUpdate.sigadId = result.sigad_id;
}
// Solar: só marcar se exportação foi bem-sucedida (inclui "já existia")
if (result.success) {
  sigadTimestampUpdate.solarExportadoEm = new Date();
}

await db
  .update(assistidos)
  .set(sigadTimestampUpdate)
  .where(eq(assistidos.id, input.assistidoId));
```

**Importante:** este update acontece mesmo quando `result.success === false` (para registrar a tentativa) — só `solarExportadoEm` é condicional.

### Step 5: Repetir deduplicação e rastreabilidade em `exportarBatch`

O `exportarBatch` tem código duplicado do `exportarViaSigad` (~linha 406). Aplicar as mesmas mudanças:
1. `conteudoHash` + `onConflictDoNothing` no loop de observações (se houver)
2. Update de `sigadExportadoEm` + `solarExportadoEm` por assistido

**Nota:** o `exportarBatch` atual **não** persiste observações ainda (só enriquece campos). Verificar se isso deve ser adicionado também — se sim, extrair a lógica para uma função helper `_persistirObservacoesSigad(assistidoId, processos, observacoes, userId)` e chamar dos dois lugares.

### Step 6: Verificar TypeScript

```bash
npx tsc --noEmit 2>&1 | head -30
```

Esperado: 0 erros.

### Step 7: Commit

```bash
git add src/lib/trpc/routers/solar.ts
git commit -m "feat(solar): deduplicação de anotações SIGAD por hash + timestamps sigad/solar"
```

---

## Checklist Final

- [ ] `_reset_browser()` implementado e chamado no catch de `exportar_assistido_por_cpf`
- [ ] `_exportar_assistido_interno` é o corpo real do fluxo (renomeado)
- [ ] `python3 -c "import ast; ast.parse(...)"` passa sem erro
- [ ] Colunas `conteudo_hash` em `anotacoes` e `sigad_id`, `sigad_exportado_em`, `solar_exportado_em` em `assistidos` no schema
- [ ] `npm run db:push` aplicou sem erro
- [ ] `onConflictDoNothing` com `conteudoHash` no insert de anotações
- [ ] Contador `novasAnotacoes` distingue inserções novas de duplicatas ignoradas
- [ ] Update de `sigadExportadoEm` sempre + `solarExportadoEm` só em sucesso
- [ ] `npx tsc --noEmit` passa sem erro
- [ ] 3 commits separados (Python / schema / TS)
