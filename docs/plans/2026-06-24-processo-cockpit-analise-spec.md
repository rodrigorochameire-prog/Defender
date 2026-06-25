# Spec — Cockpit do Processo = casa da análise IA

> **Data:** 2026-06-24
> **Tipo:** Spec-driven / TDD (1 PR por fase, CI como gate)
> **Origem:** Análise de UX (cockpit do Processo é "a tela mais fraca") cruzada com o achado de produto: as skills de peças/análises já escrevem inteligência no OMBUDS, mas o OMBUDS não a mostra.
> **Doutrina:** seguir `padrao-defender` (zinc/emerald, CollapsiblePageHeader, cards com shadow, font-mono para número de autos) e a doutrina north-star de redesign.

---

## 1. Problema

A vista standalone do Processo (`src/app/(dashboard)/admin/processos/[id]/page.tsx`, 60 linhas) é hoje um stub:
cabeçalho seco (Número / Área / Vara / Parte contrária), aviso discreto "sem caso vinculado", lista de
vinculados e timeline de registros. Muito branco, nenhuma fase processual, nenhuma urgência, nenhuma próxima
ação óbvia. O defensor não responde em 2 segundos "em que pé está e qual é o próximo passo".

Ao mesmo tempo, **a inteligência para responder isso já está no banco e não é lida por ninguém**:

| Fonte | Onde | Estado |
|---|---|---|
| `analisesCowork` (resumoFato, teseDefesa, estrategiaAtual, crimePrincipal, pontosCriticos[], payload) | `src/lib/db/schema/casos.ts:397`, keyed por `processoId` | **Escrita pelo back-office (`_analise_ia.json`), lida por ZERO componentes/routers** |
| `processos.analysisData` / `analysisStatus` / `analyzedAt` (análise IA de scan/acórdão) | `src/lib/db/schema/core.ts:223` | Já servida por `analiseRouter.getAnaliseDoProcesso` — mas não renderizada nesta página |
| `processos.fase` | `core.ts:211` | Existe, não exibida |
| Próxima audiência | `audienciasRouter` (acesso por `processoId`) | Existe, não exibida aqui |

**Escopo desta tela é exatamente o caso órfão.** Quando o processo tem `casoId`, `page.tsx:25-30` já redireciona
para a vista rica aninhada no assistido. Logo, este cockpit é, na prática, **só** a superfície do processo
sem caso — e é precisamente onde o `criar caso` e a análise IA querem aparecer.

## 2. Objetivo

Transformar a vista standalone do processo num **cockpit que lê a análise IA já existente** e responde, no topo,
fase + próximo prazo + urgência, oferecendo como ação primária "Criar caso a partir deste processo".
**Zero pipeline novo de IA** — apenas surfacing de dados já gravados + 1 endpoint de leitura.

### Não-objetivos (YAGNI)
- Não rodar/gerar análise nova a partir da tela (a análise vem do daemon/Cowork, nunca da API — ver memória).
- Não tocar na vista caso-linked aninhada (`/assistidos/[id]/caso/[casoId]/processo/[id]`).
- Não redesenhar a lista de processos nem a timeline de registros (reuso como está).
- Não criar UI de edição/aprovação/versionamento da análise (fica para uma frente "Analysis review" futura).

## 3. Fontes de dado e contrato

A tela consome, por ordem de prioridade para o painel de análise:

1. **`analisesCowork` mais recente do processo** (estruturada, rica) — **endpoint novo** `getAnaliseCoworkDoProcesso`.
2. **fallback** `processos.analysisData` via `getAnaliseDoProcesso` (já existe) quando não há `analisesCowork`.
3. **header**: `processos.fase`, `analysisStatus`, próxima audiência (endpoint de audiência por processo), marcos.

### Endpoint novo — `analiseRouter.getAnaliseCoworkDoProcesso`
```
input:  { processoId: number }
query:  SELECT * FROM analises_cowork
        WHERE processo_id = $1
        ORDER BY importado_em DESC
        LIMIT 1
output: AnaliseCowork | null   // null = sem análise importada ainda
```
- `protectedProcedure`, mesmo padrão de `getAnaliseDoProcesso` (`src/lib/trpc/routers/analise.ts:317`).
- Reusa o índice `analises_cowork_processo_id_idx` (`casos.ts:417`) — sem custo de query.
- Retorna `null` em vez de lançar (a ausência de análise é estado normal, não erro).

## 4. Layout (padrão Defender)

Master/detalhe em duas colunas no desktop, empilhado no mobile. O branco desperdiçado à direita vira o painel de análise.

```
┌──────────────────────────────────────────────────────────────┐
│  HEADER BAND (CollapsiblePageHeader)                           │
│  Nº autos (font-mono) · Área · Vara                            │
│  [Fase: Instrução]  [Próx. audiência: 02/07 — em 8 dias]      │
│  [Urgência: ●●○]                    [▸ Criar caso deste proc.] │
├───────────────────────────────┬──────────────────────────────┤
│  COL ESQUERDA (reuso)          │  COL DIREITA — ANÁLISE IA     │
│  • Processos vinculados        │  card "Análise" com:          │
│  • Registros (timeline)        │   – Crime principal (badge)   │
│                                │   – Resumo do fato            │
│                                │   – Tese de defesa            │
│                                │   – Estratégia atual          │
│                                │   – Pontos críticos (lista    │
│                                │     destacada — os "saltos")  │
│                                │   – rodapé: fonte + data      │
│                                │   (empty state se null)       │
└───────────────────────────────┴──────────────────────────────┘
```

### Regras visuais
- **Urgência** deriva da próxima audiência / prazo (escala contínua neutro→âmbar→vermelho), coerente com o item
  "criticidade que se enxerga" da análise de UX. Sem prazo conhecido → indicador neutro, sem ruído.
- **Pontos críticos** recebem o maior peso visual do painel (é o que o defensor escaneia primeiro).
- **CTA primário** = "Criar caso a partir deste processo" (verde OMBUDS), só quando `!processo.casoId`.
  Reusa o fluxo de criação já existente (`casos.vincularProcesso` + criação, ou o `criarDeProcesso` da reforma
  de Assistidos — **confirmar wiring na Fase 3**).
- Acentuação e rótulos humanos (sem enum cru, sem CAIXA ALTA de vara) — herdar tipologia central.

### Empty states
- Sem `analisesCowork` e sem `analysisData` → card "Sem análise importada ainda" + dica de como gerar
  (via daemon/Cowork), no tom dos empty states que já existem.
- Sem próxima audiência → header omite o chip de prazo (não mostra "—" cru).

## 5. Fases (TDD, 1 PR cada, CI = gate)

> Trabalho em **worktree** isolado (memória: daemon mata `tsc` do worktree → CI é o gate, não o tsc local).

| Fase | Entrega | Testes |
|---|---|---|
| **0** | Endpoint `getAnaliseCoworkDoProcesso` + tipo de retorno | unit do router: retorna a mais recente; retorna `null` sem registro |
| **1** | Primitivo `AnaliseProcessoCard` (renderiza AnaliseCowork \| analysisData \| empty) | render test: 3 estados (cowork / fallback / vazio) |
| **2** | Header band: fase + próxima audiência + urgência (deriva de prazo) | escala de urgência: neutro/âmbar/vermelho por dias; omite chip sem prazo |
| **3** | CTA "Criar caso deste processo" fiado ao fluxo existente | smoke: clique → caso criado → redirect para vista aninhada |
| **4** | Montagem do layout 2-col no `page.tsx` + responsivo + a11y | layout não quebra sem análise; mobile empilha; foco/contraste |

Cada fase: `npm run lint` + `typecheck` + testes verdes antes do PR. Squash por fase.

## 6. Critérios de aceite

1. Abrir um processo órfão **com** `analisesCowork` mostra resumoFato, teseDefesa, estratégia e pontos críticos no painel direito.
2. Processo órfão **sem** `analisesCowork` mas **com** `analysisData` cai no fallback sem erro.
3. Processo **sem nenhuma** análise mostra empty state claro, nunca branco morto nem `null`/`undefined` na tela.
4. Header exibe fase humanizada + chip de próxima audiência com urgência proporcional (ou omite o chip se não houver).
5. CTA "Criar caso" só aparece em processo órfão e leva à vista aninhada após criar.
6. Nenhum enum cru / CAIXA ALTA / texto sem acento na superfície (regra transversal de humanização).
7. Responsivo (375/768/1024/1440) e foco visível; `prefers-reduced-motion` respeitado.

## 7. Riscos / pontos a confirmar

- **Wiring exato do "Criar caso"**: confirmar se reusa `criarDeProcesso` (reforma Assistidos) ou `casos.vincularProcesso` + criação — decidir na Fase 3.
- **Cobertura de `analisesCowork` em prod**: se pouquíssimos processos órfãos têm análise importada, o fallback `analysisData` e o empty state carregam a tela no dia 1 (aceitável; o valor cresce conforme o back-office popula). Vale o inventário (opção (b)) em paralelo para dimensionar.
- **`payload` JSONB**: a v1 usa só os campos estruturados (resumo/tese/estratégia/pontos). Campos extras do `payload` ficam para uma v2, sob demanda.
