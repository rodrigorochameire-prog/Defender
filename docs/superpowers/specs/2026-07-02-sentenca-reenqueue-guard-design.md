# Design — Fix: guard de re-enqueue da sentença (follow-up C1)

**Data:** 2026-07-02
**Autor:** Rodrigo Rocha Meire (via Claude Code)
**Status:** Design aprovado (modo autônomo — usuário dormindo; fix bem definido pela review do C1)
**Escopo:** Follow-up do C1. Branch: `fix/sentenca-reenqueue-guard` (do `main` @ `4f78a89e`).

---

## 1. Problema (achado na whole-branch review do C1)

O hook de sentença na varredura (`apply_classification`, call-site em `varredura_triagem.py:1500`) enfileira uma task `analise-sentenca` sempre que o ato é de sentença **e** há `doc_id` — **sem guarda de re-enqueue**. Como a varredura roda repetidamente sobre demandas que permanecem em triagem (a skill não muda o status), uma demanda de sentença **re-enfileira `analise-sentenca` a cada passada**. Dano é limitado (`upsertFromAnalysis` é idempotente no `sentencas`), mas: (a) desperdiça ciclos do browser-lane, e (b) pode **duplicar PDFs no Drive** (o upload da captura não deduplica).

Ao contrário do subsistema B (que guarda por `enrichment_status`) e do registro base (que deduplica por título), o hook de sentença não tem guarda.

## 2. Solução

Antes de enfileirar, pular se a sentença **já foi processada ou está em curso**:
- **(a)** já existe uma linha em `sentencas` para `(processo_id, pje_documento_id)` — índice único `sentencas_processo_doc_unique` garante 1 por doc; ou
- **(b)** já existe uma task `analise-sentenca` `pending`/`processing` para esse `processo_id` (captura enfileirada mas ainda não concluída).

**Fail-open:** se o próprio check falhar (rede), retorna `False` → **deixa enfileirar** (preserva o comportamento atual; melhor um raro duplicado do que nunca analisar).

## 3. Design (em `.claude/skills/varredura-triagem/scripts/varredura_triagem.py`, espelhado em `skills-cowork/`)

### 3.1 `sentenca_ja_processada(sb, processo_id, doc_id) -> bool` (I/O; nunca levanta)
```python
def sentenca_ja_processada(sb, processo_id, doc_id) -> bool:
    """True se já há sentença processada/em curso p/ este processo+doc.
    Fail-open: qualquer erro → False (deixa enfileirar)."""
    try:
        if processo_id and doc_id:
            row = sb._req("GET",
                f"/rest/v1/sentencas?processo_id=eq.{processo_id}&pje_documento_id=eq.{doc_id}&select=id&limit=1")
            if row:
                return True
        if processo_id:
            pend = sb._req("GET",
                f"/rest/v1/claude_code_tasks?skill=eq.analise-sentenca&processo_id=eq.{processo_id}"
                f"&status=in.(pending,processing)&select=id&limit=1")
            if pend:
                return True
        return False
    except Exception:
        return False
```

### 3.2 Call-site (uma condição a mais)
```python
    if is_sentenca_ato(rule["ato"]) and _doc_id and not sentenca_ja_processada(sb, proc_id, str(_doc_id)):
        try:
            ...enqueue... (inalterado)
```
`proc_id` já está em escopo (usado no side-effect de audiência logo abaixo).

## 4. Tratamento de erro
- `sentenca_ja_processada` nunca levanta (try/except → `False`). O enqueue segue no seu próprio try/except (inalterado). Nenhuma passada da varredura quebra por causa da guarda.
- Semântica: guarda só **PULA** quando confirma positivamente (sentença existente OU task pendente). Em dúvida/erro → enfileira.

## 5. Testes (TDD)
- **`sentenca_ja_processada` (FakeSB):**
  - `sentencas` retorna linha → `True`.
  - `sentencas` vazio + task pendente retorna linha → `True`.
  - ambos vazios → `False`.
  - `sb._req` levanta → `False` (fail-open).
  - `processo_id`/`doc_id` faltando → não quebra (skip da query correspondente).
- **Regressão:** as suítes existentes da varredura verdes; cópias byte-idênticas; `ast.parse` ok.

## 6. Critérios de aceitação
1. `sentenca_ja_processada` testada (existe/pendente/nenhum/erro=fail-open).
2. Call-site pula o enqueue quando a guarda retorna True; enfileira normalmente quando False.
3. Guarda nunca levanta; enqueue e varredura intactos em erro.
4. Ambas as cópias (`skills/` + `skills-cowork/`) byte-idênticas; suítes existentes verdes; `ast.parse` ok.
5. Sem migração, sem daemon/skill, sem mudança no `build_sentenca_task`/`is_sentenca_ato`.

## 7. Deferidos
- Guarda análoga poderia ser considerada para acórdão-auto quando C1b existir (não há hook de acórdão hoje).
- Verificação viva (rodar 2 varreduras seguidas sobre a mesma demanda de sentença e confirmar 1 só enqueue).
