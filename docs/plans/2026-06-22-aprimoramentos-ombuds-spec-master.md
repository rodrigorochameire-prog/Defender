# OMBUDS · Spec-Master de Aprimoramentos (TDD + Spec-Driven)

**Data:** 2026-06-22
**Autor:** Defensor Rodrigo + Claude
**Método:** Spec-driven + TDD. Nenhuma mudança sem spec testável e sem **gate verde** (`tsc --noEmit` 0 erros · `vitest run` 0 falhas · `next lint` limpo). Cada story define AC verificável e teste antes do código.
**Escopo declarado pelo usuário:** "tdd e spec driven, com tudo" — cobre as 4 frentes, sequenciadas por dependência.

---

## Princípio ordenador

TDD exige um gate verde para existir. Hoje o build esconde erros (`ignoreBuildErrors: true`, `ignoreDuringBuilds: true`) e há 15 testes vermelhos. **Logo a Fundação não é uma opção entre quatro — é o pré-requisito das outras três.** Sequência: `F (fundação) → I (flags inteligência) → D (dashboard) → P (polish)`.

## Baseline medido (2026-06-22)

| Métrica | Valor medido | Fonte |
|---|---|---|
| Erros `tsc --noEmit` | **57** (28 em `instancia-superior.ts`) | `npx tsc --noEmit` |
| Testes totais | 1114 (1099 ✅ / **15 ❌** em 7 arquivos) | `vitest run` |
| `ignoreBuildErrors` | `true` (next.config.js:23) | grep |
| `ignoreDuringBuilds` (lint) | `true` (next.config.js:27) | grep |
| CI | `ci.yml` existe; `typecheck` mascara erro (`|| exit 0`) | package.json |
| Runners | vitest 4, playwright 1.59, ts 5.7 | package.json |

---

## FRENTE F · Fundação / Gate Verde  ⬅️ EM EXECUÇÃO

Pré-requisito de tudo. Reativa type-safety, deixa a suíte verde e trava o gate no CI.

### F.0 · Suíte verde + gate honesto  `[✅ concluído 2026-06-22 · commit a5fdf4cd]`
**Problema:** 15 testes vermelhos e 57 erros de tipo ocultos. Sem isso TDD é teatro.
**AC:**
1. `npx vitest run` → 0 falhas.
2. `npx tsc --noEmit` → 0 erros.
3. `next.config.js`: `ignoreBuildErrors` e `ignoreDuringBuilds` → `false`.
4. `typecheck` script para de mascarar erro no CI (`|| exit 0` removido).
5. `ci.yml` roda `tsc` + `vitest` como gate bloqueante.
**Teste/verificação:** o próprio gate (build falha se algo quebrar).
**Débitos cobertos:** TD.2/SYS-001, parte de TD.7/SYS-003.

### F.1 · Cinto de segurança (CORS, webhook, segredos)  `[✅ código já corrigido ad-hoc · verificado 2026-06-22]`
Auditado: a maioria já estava resolvida no código, stories só ficaram desatualizadas.
- TD.5 (CORS): ✅ `enrichment-engine/main.py` lê `ALLOWED_ORIGINS` (default localhost), não `*`.
- TD.6 (webhook Drive): ✅ `api/webhooks/drive/route.ts` é fail-closed — valida `x-goog-channel-token` com `timingSafeEqual`, rejeita secret ausente, exige canal registrado+ativo.
- TD.3 (credenciais hardcoded): ✅ nenhum JWT/segredo hardcoded em `src/`.
- TD.4 (config.toml): ✅ `project_id` bate com o projeto real.
- **TD.1 (rotação senha + limpeza histórico): ⚠️ ABERTO — operacional.** Rotacionar no painel Supabase + rewrite de histórico (irreversível, `@devops`/humano). `.env.local` não está versionado, mas a senha deve ser rotacionada. **Não automatizável com segurança.**

### F.2 · RLS (faseado)
TD.9 (habilitar RLS nas tabelas restantes) → TD.13 (role dedicada, policies reais) → TD.14 (multi-tenant por comarca). Alto esforço; faseado e testado por policy.

> F.1 e F.2 são specados em detalhe **quando F.0 fechar** (spec sob demanda).

---

## FRENTE I · Flags de Inteligência (Camada 3 do mapa-mestre)

Onde mora o valor. Cada flag é uma função pura testável (entrada estruturada → veredito + confidence) + apresentação calibrada. TDD natural: a regra do flag é teste primeiro.

Prioridade por valor/urgência:
1. **Prescrição executória iminente** (Fase IX) — pode extinguir pena. Função pura `prazo_109_cp × reincidência × idade`. *(Bloqueada: Fase IX não tem schema de execução ainda.)*
0. **Tempo fato→denúncia excessivo** (Fase IV) — `[✅ I.2b concluído 2026-06-22]` `detectTempoFatoDenunciaExcessivo` em `flags.ts` (limites tunáveis 3a/4a, amber/red, sinal de prescrição da pretensão punitiva — não afirma, manda checar). 6 testes; UI no `situacao-atual-block` com container temático (rose=custódia, amber=só timeline).

> **Bloqueadas por falta de schema/dado (não implementáveis sem inventar — "threshold rigoroso"):**
> - Cautelar descumprida *sem incidente*: não há marco `incidente` no enum.
> - **I.3 ANPP cabível não oferecido**: só existe `delitos.cabeAnpp` (catálogo), falta o par per-processo cabível∧não-oferecido. → precede schema ANPP (Fase X).
> - **I.4 uso instrumental da LMP**: MPU só tem `tiposViolencia`; falta bloco `contexto_civel` (divórcio/guarda). → precede Fase VII.
2. **Excesso de prazo — preventiva** (Fase IV) — `[✅ I.2 concluído 2026-06-22]` evoluído de cego-pós-denúncia para **consciente de fase** (pré-denúncia 80d / instrução 150d / pós-sentença 540d) + severidade amber/red calibrada. Função pura `detectExcessoPrazoPreventiva` em `src/lib/cronologia/flags.ts`, 14 testes; UI `situacao-atual-block` agora pinta por `nivel`. Dados já existiam (`prisoes` + `marcos_processuais`).
3. **ANPP cabível não oferecido** (Fase X) — argumento recursal.
4. **Uso instrumental da LMP** (Fase VII) — score ≥3 indicadores; copy ultra-cuidadosa.

> Pré-condição: confirmar quais blocos de dados (Camada 2) já existem nas rotas `delitos`, `execucao/progressoes`, `cronologia`, `vvd/medidas`. Specar flag a flag só após inventário do schema real.

---

## FRENTE D · Dashboard Cross-Dimension (Fase XII)

Colhe o que já está plantado (rotas `pessoas`, `lugares`, `delitos`, `inteligencia` já existem). Materialized views de recorrência + `/admin/inteligencia` com cards de alerta ordenados por urgência + busca unificada (Cmd+K). Depende das flags da Frente I para os alertas terem conteúdo.

---

## FRENTE P · Polish de Features Recentes

Daemon/browser-lane, kanban de demandas, leitor→peça, revisão de minuta. Cada aresta vira story com teste de regressão. Backlog reativo (entra conforme uso real reporta atrito).

---

## Ordem de execução

```
F.0 (gate verde) ──► F.1 (segurança) ──► F.2 (RLS faseado)
        │
        └──► I.1 prescrição ──► I.2 excesso prazo ──► I.3 ANPP ──► I.4 LMP
                        │
                        └──► D (dashboard cross) ──► P (polish reativo)
```

## Log de progresso
- 2026-06-22: baseline medido, spec-master criado, F.0 iniciado.
