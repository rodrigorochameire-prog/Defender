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

### F.0 · Suíte verde + gate honesto  `[em progresso]`
**Problema:** 15 testes vermelhos e 57 erros de tipo ocultos. Sem isso TDD é teatro.
**AC:**
1. `npx vitest run` → 0 falhas.
2. `npx tsc --noEmit` → 0 erros.
3. `next.config.js`: `ignoreBuildErrors` e `ignoreDuringBuilds` → `false`.
4. `typecheck` script para de mascarar erro no CI (`|| exit 0` removido).
5. `ci.yml` roda `tsc` + `vitest` como gate bloqueante.
**Teste/verificação:** o próprio gate (build falha se algo quebrar).
**Débitos cobertos:** TD.2/SYS-001, parte de TD.7/SYS-003.

### F.1 · Cinto de segurança (CORS, webhook, segredos)
Débitos: TD.5 (CORS `*` enrichment), TD.6 (webhook Drive fail-open), TD.3 (credenciais hardcoded no client), TD.1 (rotação senha + limpeza histórico — requer @devops/ação humana), TD.4 (config.toml).
Cada um vira micro-story com teste de regressão (ex.: webhook rejeita assinatura inválida).

### F.2 · RLS (faseado)
TD.9 (habilitar RLS nas tabelas restantes) → TD.13 (role dedicada, policies reais) → TD.14 (multi-tenant por comarca). Alto esforço; faseado e testado por policy.

> F.1 e F.2 são specados em detalhe **quando F.0 fechar** (spec sob demanda).

---

## FRENTE I · Flags de Inteligência (Camada 3 do mapa-mestre)

Onde mora o valor. Cada flag é uma função pura testável (entrada estruturada → veredito + confidence) + apresentação calibrada. TDD natural: a regra do flag é teste primeiro.

Prioridade por valor/urgência:
1. **Prescrição executória iminente** (Fase IX) — pode extinguir pena. Função pura `prazo_109_cp × reincidência × idade`.
2. **Excesso de prazo — preventiva** (Fase IV) — dias preso × padrão STJ.
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
