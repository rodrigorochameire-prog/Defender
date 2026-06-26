# Spec — Loop de importação v1 (relatório · watermark · agrupar triagem)

Data: 2026-06-26. Fecha a experiência de importação (itens 1→3 do roadmap).
Princípios: Padrão Defender, cor só funcional, anti-poluição, equilíbrio (sem faltas/excessos).

## Contrato de dados (backend → frontend)

`intimacoes.ultimaImportacao` passa a retornar **também**:
- `proximoSince: string | null` — ISO `YYYY-MM-DD` sugerido para o "De" da próxima
  importação = a **maior data de EXPEDIÇÃO já importada** (entre as demandas vivas
  com `pjeDocumentoId`, escopo das `atribuicoes` do último job). É o "de onde partir".
- `maxExpedicaoImportada: string | null` — a mesma data, em ISO, para exibição
  ("importado até DD/MM").

`confirmarImport` mantém o retorno atual (`imported, updated, skipped, errors,
assistidosSemSolar, ledgerWritten`). O relatório usa isso + os dados já no cliente.

## Features

### 1. Relatório pós-importação (frontend: intimacoes-staging-view.tsx)
Após `confirmarImport` com sucesso, **substituir a tabela por um painel de resultado**:
- "✓ {imported} importadas → coluna **Triagem** · {atribuições do job}".
- "{skipped} não importadas" com quebra derivada dos dados do cliente:
  - quantas das selecionadas eram `ja_importada` (já no sistema),
  - quantas eram do **mesmo processo** de outra selecionada (colapso) — usar o
    `processoCount` já existente.
- Erros (`errors[]`) se houver, discretos.
- Botão primário **"Ir ao Kanban → Triagem"** (`<Link href="/admin/demandas">`).
- Botão secundário "Nova importação" → volta para `/admin/demandas` (ou recarrega).
- Anti-poluição: número grande + 2–3 linhas de contexto, nada de tabela de novo.

### 2. Agrupar Triagem por data de importação (frontend: demandas-premium-view.tsx)
Na **coluna Triagem do kanban**, agrupar os cards por **data** (sub-cabeçalhos discretos,
ex.: "Importado em 26/06 · 12"). Usar a data de criação da demanda (`createdAt`) já
disponível no card — se não estiver no shape do card, NÃO buscar em outro arquivo:
parar e reportar. Mudança ADITIVA e cirúrgica: só a renderização da coluna Triagem,
sem refatorar o resto. Sub-cabeçalho neutro (sem cor forte). Ordenar grupos do mais
recente ao mais antigo.

### 3. Watermark de período (backend: intimacoes.ts · frontend: intimacoes-import-modal.tsx)
- **Back:** em `ultimaImportacao`, calcular `proximoSince` e `maxExpedicaoImportada`
  (ver contrato). Query: maior `dataExpedicao` entre demandas vivas com
  `pjeDocumentoId`. Se quiser escopar por atribuição, usar as `atribuicoes` do último
  job; se complicar, o máximo global serve. NUNCA lançar; null se não houver dado.
- **Front (modal):** ao abrir, **pré-preencher o campo "De"** com `proximoSince`
  (só se o usuário ainda não digitou). Mostrar uma linha discreta "importado até
  {maxExpedicaoImportada} · começa daqui". Manter o card "última importação" atual e
  o botão "Continuar daqui".

## Não-regredir
Toda a tela de revisão atual (busca/filtros/ordenação/seleção/expandir-editar/MPU/
prazo/sticky/dedup) e o modal atual (atribuições/datas/limite/última importação).

## Verificação
`npx tsc --noEmit` (sem erros nos arquivos tocados) · `npx eslint` neles (0 erros) ·
`npx vitest run src/lib/trpc/routers/intimacoes.test.ts src/lib/services/pje-intimacoes-import.test.ts`.

## Fronteira de execução (subagentes paralelos — arquivos DISJUNTOS)
- **A (back):** SOMENTE `src/lib/trpc/routers/intimacoes.ts` — feature 3 (back).
- **B (front):** SOMENTE `src/components/demandas-premium/intimacoes-staging-view.tsx` — feature 1.
- **C (front):** SOMENTE `src/components/demandas-premium/intimacoes-import-modal.tsx` — feature 3 (front).
- **D (front):** SOMENTE `src/components/demandas-premium/demandas-premium-view.tsx` — feature 2.
Todos respeitam o contrato. B e C consomem `proximoSince` (definido por A).
