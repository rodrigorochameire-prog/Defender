# Design — C1: Landing da inteligência de sentença (auto-roteamento na triagem)

**Data:** 2026-07-01
**Autor:** Rodrigo Rocha Meire (via Claude Code)
**Status:** Design aprovado — aguardando revisão de spec
**Escopo:** Subsistema **C1** do plano A→B→C. Branch: `feat/c1-sentenca-landing` (criado do `main` @ `6f8071c3`).

---

## 1. Contexto e problema

Quando uma intimação de triagem é **ciência de sentença**, o defensor quer que a análise do provimento (tipo de decisão, dosimetria, teses acolhidas/rejeitadas, súmulas-alerta, recomendação de próximo passo) + o perfil do magistrado sejam gerados **automaticamente**, sem disparo manual.

Esse pipeline **já foi construído** na branch `feat/sentenca-intelligence`, mas **nunca foi mergeado** e hoje está ~283 commits atrás do `main` (que desde então ganhou o worker SEEU + os subsistemas A e B, todos reescrevendo o `varredura_triagem.py`). Nada do pipeline de sentença está no `main`; só sobrou órfão o `perfil-magistrado.tsx` (form de estado local, não ligado a este backend) e docs de design.

**Acórdão** já tem, no `main`, o subsistema `instancia-superior` (schema `acordaos`/`recursos`, router, UI, skill `analise-acordao`) — mas o disparo é **manual** (colar ementa → `analisarAcordaoIA`). Não há captura automática. **Acórdão-auto fica fora do C1** (vira C1b) porque exige captura/criação de registro que o branch não entrega.

## 2. Objetivo

Trazer o pipeline de inteligência de sentença para o `main` atual e ligar o **hook de auto-roteamento na varredura**: ciência de sentença → enfileira `analise-sentenca` (captura o PDF no PJe, faz OCR/extração, analisa, faz upsert em `sentencas` + perfila `magistrados`).

**Não-objetivos:** acórdão-auto (C1b); captura de sentença de EP (EP vem do SEEU, sem doc PJe — segue pelo caminho SEEU→analise-intimacao); UI de sentenças/dashboards de magistrado (deferidos; o branch não entrega UI).

## 3. Decisões

| Decisão | Escolha |
|---|---|
| Abordagem de landing | **Cherry-pick dos 13 commits aditivos + renumerar migração + re-aplicar o hook à mão** (rebase descartado: 283 commits de divergência conflitariam duro no varredura) |
| Acórdão | **Fora do C1** (manual via instancia-superior; auto vira C1b) |
| EP | **Fora do auto-capture** (guarda por `doc_id` do PJe pula EP; segue SEEU→analise-intimacao) |
| Migração | **`0067` → `0070`** (colide com `0067_seeu_import`; aditiva; sem journal drizzle) |
| Cópias da skill/varredura | hook espelhado em `.claude/skills/` **e** `.claude/skills-cowork/` (byte-idênticas) |

## 4. Design

### C1.1 · Cherry-pick dos commits aditivos
Trazer de `origin/feat/sentenca-intelligence` os commits que tocam **arquivos novos** ou âncoras **append-only** (esperado: zero conflito):
- **Schema:** `src/lib/db/schema/sentencas.ts` (tabelas `magistrados` + `sentencas` + tipo `AnaliseSentenca`); `src/lib/db/schema/index.ts` (+1 linha `export * from "./sentencas"`).
- **Router:** `src/lib/trpc/routers/sentencas.ts` (`upsertFromAnalysis` em transação, `getDetail` escopado, `aggregate`); `src/lib/trpc/routers/index.ts` (+wire `sentencas: sentencasRouter`).
- **Helpers puros + testes:** `src/lib/sentenca/{ato-set,dedupe,magistrado-key,parse-analise}.ts` + os `__tests__/*.test.ts`.
- **Skill:** `.claude/skills/analise-sentenca/SKILL.md` + `scripts/capturar_sentenca.py` (browser-lane: abre processo → PDF → Drive → texto).
- **Config/escopo:** `src/config/system-user.ts` (`SYSTEM_USER_ID`); `src/lib/trpc/defensor-scope.ts` (+`getSentencaDetailScope`).

**Não** cherry-pickar: o commit do hook na varredura (`6432788b` — feito contra o arquivo antigo) nem o de renumeração (`8c78c8f7`).

### C1.2 · Renumeração da migração
Renomear `drizzle/0067_sentenca_intelligence.sql` → `drizzle/0070_sentenca_intelligence.sql`. Conteúdo inalterado (`CREATE TABLE IF NOT EXISTS magistrados`/`sentencas`, FKs para `comarcas/processos/assistidos/demandas/defensores_ba`, índice único parcial `sentencas_processo_doc_unique … WHERE pje_documento_id IS NOT NULL`). Sem `drizzle/meta/_journal.json` no main → o rename basta. **Pré-check:** confirmar que o gap `0068` no main não é uma migração meio-aplicada antes de adicionar `0070`.

### C1.3 · Re-aplicação manual do hook (a parte de risco)
Duas inserções em `varredura_triagem.py` (nas duas cópias, mantendo-as byte-idênticas):

**Hunk A — helper**, após `normalize()`:
```python
_SENTENCA_RE = re.compile(r"senten|condena|absolvi|pronuncia|impron|desclassifica")
_ACORDAO_RE = re.compile(r"acordao")
def is_sentenca_ato(ato: str) -> bool:
    n = normalize(ato)
    if _ACORDAO_RE.search(n):
        return False
    return bool(_SENTENCA_RE.search(n))
```
(Reusar o `normalize()` do módulo — o branch trazia um `_norm_ato` próprio; consolidar no `normalize` existente.)

**Hunk B — enfileiramento**, dentro de `apply_classification`, **imediatamente antes** do bloco `# ── Side-effect: agendar / reagendar audiência` (âncora presente no main atual): monta o payload `{numero_processo, pje_documento_id, assistido_id, atribuicao, demanda_origem_id, registro_raw_text}` e faz `sb._req("POST", "/rest/v1/claude_code_tasks", { skill:"analise-sentenca", lane:"browser", status:"pending", created_by: SYSTEM_USER_ID, assistido_id, processo_id, prompt, instrucao_adicional: json.dumps(payload) })`. Guardas:
- Só dispara se `is_sentenca_ato(rule["ato"])` **e** `doc_id` presente (`pje_documento_id`/`enrichment_data.id_documento_pje`). → EP (SEEU, sem doc) é pulado.
- Todo em `try/except` que loga e continua (nunca quebra a varredura nem o side-effect de audiência).

**Coexistência (verificada no landing map):** `analise-intimacao` é enfileirada UMA vez, em lote, `lane=ai`, ao fim do loop. O hook de sentença enfileira por-demanda, `lane=browser`. Skills e lanes diferentes → não colidem. Uma demanda de sentença legitimamente recebe **ambos**: o resumo da intimação (ai) e a captura+análise da sentença (browser). Intencional.

## 5. Impacto em dados
- **DDL:** migração `0070` cria `magistrados` + `sentencas` (aditivo, `IF NOT EXISTS`, FKs já existentes). Reversível (drop tables).
- `SYSTEM_USER_ID` = 1 no `created_by` da task; confirmar que o usuário id=1 existe no ambiente e o FK `claude_code_tasks.createdBy` aceita.
- Sem alteração de dados existentes.

## 6. Arquivos afetados

| Arquivo | Mudança |
|---|---|
| (cherry-pick) `src/lib/db/schema/sentencas.ts`, `schema/index.ts` | tabelas + export |
| (cherry-pick) `src/lib/trpc/routers/sentencas.ts`, `routers/index.ts` | router + wire |
| (cherry-pick) `src/lib/sentenca/*` + `__tests__/*` | helpers + testes |
| (cherry-pick) `.claude/skills/analise-sentenca/**` | skill + capturar_sentenca.py |
| (cherry-pick) `src/config/system-user.ts`, `src/lib/trpc/defensor-scope.ts` | SYSTEM_USER_ID, getSentencaDetailScope |
| rename `drizzle/0067_sentenca_intelligence.sql` → `0070_...` | migração |
| `.claude/skills/varredura-triagem/scripts/varredura_triagem.py` + espelho cowork | hook (2 hunks) |
| Testes | `sentenca/*` (vêm no cherry-pick) + novo standalone Python p/ `is_sentenca_ato` + shape do enqueue |

## 7. Testes
- **Helpers `sentenca/*`:** os `__tests__` vêm no cherry-pick — rodar `npm test` neles.
- **`is_sentenca_ato` (novo standalone Python):** dispara em "Analisar sentença"/"Ciência condenação"/"pronúncia"/"impronúncia"/"desclassificação"; **NÃO** dispara em "Ciência acórdão"/"Analisar acórdão" (exclusão). Padrão standalone das outras suítes da varredura.
- **Shape do enqueue:** função pura testável que monta o payload/task de `analise-sentenca` (skill/lane/created_by/instrucao_adicional com as chaves certas).
- **Regressão:** as suítes existentes da varredura (A/B/SEEU) continuam verdes; ambas as cópias byte-idênticas.
- **`next build` + tsc** limpos com o schema/router novos.

## 8. Critérios de aceitação
1. Cherry-pick traz o pipeline (schema/router/helpers/skill) sem conflito; `tsc` e `next build` limpos.
2. Migração renomeada para `0070`; aplicada no prod (deferido) cria `magistrados`+`sentencas`.
3. `is_sentenca_ato` dispara em atos de sentença e **exclui acórdão** (teste).
4. Numa varredura, uma demanda cujo `ato` é de sentença **e** com `doc_id` do PJe enfileira uma task `claude_code_tasks` `skill='analise-sentenca'`, `lane='browser'`, com o payload completo — sem quebrar a varredura nem o agendamento de audiência.
5. EP (sem doc PJe) **não** enfileira `analise-sentenca`.
6. A demanda de sentença continua recebendo o resumo `analise-intimacao` (ai) normalmente (coexistência).
7. Ambas as cópias da varredura byte-idênticas; regressão A/B/SEEU verde.

## 9. Deferidos
- **Verificação viva** de `capturar_sentenca.py` (abre PJe → PDF → Drive → `upsertFromAnalysis`) — precisa de sessão PJe autenticada; inspection-verified, live-deferred.
- **Aplicar `0070` no prod** — com confirmação (como o `0069` do B).
- **C1b:** acórdão-auto (captura/criação de recurso+acordao + hook). **C2:** modal "produzir peça".
- **UI de sentenças / dashboard de magistrados** — o branch não entrega; futuro.
