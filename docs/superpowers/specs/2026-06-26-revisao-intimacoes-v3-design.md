# Spec — Revisão de intimações v3 (5 features)

Data: 2026-06-26 · Página: `/admin/demandas/importar/[jobId]`
Arquivos: `src/lib/trpc/routers/intimacoes.ts` (back) · `src/components/demandas-premium/intimacoes-staging-view.tsx` (front)

Princípios herdados: **Padrão Defender**, **cor só quando funcional**, **anti-poluição**
(marca-se a exceção, não o caso comum). Verde=seleção/marca · vermelho=vencido ·
âmbar=urgência(≤3d) · lilás=MPU. Não introduzir novas cores fortes sem motivo.

## Contrato de dados (listStaging → cada row ganha)

| Campo | Tipo | Significado |
|---|---|---|
| `assistidoMatch` | `"novo" \| "vinculado" \| "multiplo"` | nome casa com assistido existente? |
| `matchedAssistidoId` | `number \| null` | id do assistido quando `vinculado` (match único) |
| `prazoDefensoria` | `string \| null` | ISO `YYYY-MM-DD` de `calcularPrazoDefensoria(expedição, diasPrazo)` |

Front e back codam contra ESTE contrato (rodam em paralelo).

## Features

### 1. Assistido novo vs. já cadastrado (back + front)
- **Back:** em `comCamposParseados` (ou no `listStaging`), casar o nome de cada row
  (`assistidoParsed ?? assistidoNome`, normalizado por `normalizarNome` de
  `@/lib/pje-parser`) contra a tabela `assistidos` (não deletados). Buscar todos os
  assistidos uma vez (id + nome), normalizar, indexar `nome→ids[]`, e classificar:
  0 → `novo`; 1 → `vinculado` (+`matchedAssistidoId`); >1 → `multiplo`.
- **Front:** marca só a EXCEÇÃO. `vinculado` → tag sutil "já cadastrado" como link
  para `/admin/assistidos/{id}`. `multiplo` → tag âmbar "homônimos". `novo` → **nada**
  (é o caso comum; mostrar em 78 linhas seria poluição).

### 2. Agrupar expedientes do mesmo processo (front)
- Calcular `processo→qtde`. Em rows cujo processo aparece >1×, mostrar tag muda
  "N no mesmo processo" (ex.: VALDECI tem 3). Objetivo: o defensor PERCEBE antes de
  importar 3 demandas separadas. Não precisa reagrupar visualmente — basta o indicador
  discreto (e, na ordem do PJe, costumam já vir adjacentes).

### 3. Prazo da Defensoria ao lado do prazo PJe (back + front)
- **Back:** `prazoDefensoria` via `calcularPrazoDefensoria(int.dataExpedicao, int.prazo)`
  quando ambos existirem (a função e os campos vêm do parser). Null caso falte dado.
- **Front:** na célula Prazo, manter o data-limite PJe (com a cor de urgência) como
  principal e adicionar uma linha secundária muda "Defensoria: DD/MM" quando houver.

### 4. Cabeçalho da tabela fixo (front)
- `thead` sticky (`sticky top-0 z-10`) com fundo sólido + borda/sombra sutil ao rolar
  as 80+ linhas. Não quebrar o layout da barra de confirmar fixa do rodapé.

### 5. Lembrar preferências + selecionar urgentes (front)
- Persistir `ordenar`, `fDecisao`, `fTipo`, `fCrime` em `localStorage`
  (chave `intim-review-prefs`), restaurando no mount. Não persistir seleção/expandido.
- Botão "Selecionar urgentes" → seleciona as importáveis com prazo vencido ou ≤3 dias.

## Não-regredir (já existe, manter)
Busca · filtros decisão/MPU/crime · ordenação (PJe default, antigo, prazo, assistido) ·
seleção visíveis + shift-range · expandir-editar (assistido/ato/prazo→`edits`) ·
badge MPU lilás · status só em exceção · barra confirmar fixa · header escuro.

## Verificação
`npx tsc --noEmit` (sem erros nos 2 arquivos) · `npx eslint` nos 2 arquivos (0 erros) ·
`npx vitest run src/lib/trpc/routers/intimacoes.test.ts src/lib/services/pje-intimacoes-import.test.ts` (verde).

## Fronteira de execução (subagentes paralelos)
- **Agente BACK:** edita SOMENTE `intimacoes.ts`. Entrega features 1(back) e 3(back).
- **Agente FRONT:** edita SOMENTE `intimacoes-staging-view.tsx`. Entrega 1(front),2,3(front),4,5.
- Arquivos disjuntos → sem conflito. Ambos respeitam o contrato acima.
