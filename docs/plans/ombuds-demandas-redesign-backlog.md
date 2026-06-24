# Demandas Redesign — Backlog técnico (derivado da spec)

> Gerado na Fase 0 (discovery). Fonte: `ombuds-demandas-redesign-spec.md` + mapeamento da árvore de componentes. Execução fase a fase, com testes antes de refator estrutural, validação no browser e merge por fase completa.

## Mapa de componentes (estado atual)
| Área | Arquivo | Linhas | Nota |
|------|---------|-------|------|
| Page | `app/(dashboard)/admin/demandas/page.tsx` | 8 | wrapper |
| **View (monolito)** | `components/demandas-premium/demandas-premium-view.tsx` | **4.181** | orquestra header/filtros/views/modais/estado |
| Header | `components/layouts/collapsible-page-header.tsx` | — | charcoal, colapsa no scroll |
| Filtros | `AtribuicaoPills.tsx` (203), `filter-sections-compact.tsx` (329), `PrazoCockpitBar` (inline) | — | estado local + localStorage |
| Kanban | `kanban-premium.tsx` | 2.350 | view default |
| Planilha | `DemandaCompactView.tsx` | 1.724 | colunas redimensionáveis |
| Tabela | `DemandaTableView.tsx` | 666 | — |
| Card | `DemandaCard.tsx` (904), `DemandaGridCard` (inline) | — | anatomia do item |
| **Sheet** | `DemandaQuickPreview.tsx` | 2.083 | hero+stepper+ToC scroll-spy+seções |
| Seções sheet | `sheet/secoes/*` + `secoes-manifest.ts` | — | Registros/Identificação/Cronologia/Autos/Recursos/Ofício |
| Modal PJe | `pje-import-modal.tsx` (1.408) + `pje-review-table.tsx` (1.000+) | — | **já é wizard 4 etapas** |

**Stack de testes**: vitest + @testing-library/react (`__tests__/components/*.test.tsx`), Playwright (`e2e/smoke.spec.ts`). Tokens em `lib/config/design-tokens.ts`. Primitivos em `components/ui/*`.

## Já entregue nesta sessão (não refazer)
- Sheet (Épico 4 parcial, PR #215 em prod): header sem "Editar/vincular", chip de processo, **status dropdown** agrupado, **menu "⋯ Ações"** (Delegar/Encaminhar/Transferir/Parecer/Histórico/Excluir), **Ofícios & Peças genérico** (12 tipos), prazo em destaque na Cronologia, Autos reordenado acima de Ofício, pills da ToC discretas, a11y (reduced-motion + focus-visible).
- **Gap do Épico 4 que falta**: os **modos internos por aba (Registros/Dados/Autos/Produção)** + **stepper visual** (hoje é nó-popover) + **barra inferior contextual**. Hoje o sheet usa ToC scroll-spy sobre seções empilhadas — a spec quer 4 abas-modo com rolagem interna.

## Riscos transversais
- **Monolito de 4.181 linhas**: alto risco de regressão. Mitigação: extrair em hooks/subcomponentes com contrato testado antes de mudar visual.
- **Auto-sync reseta a árvore/main**: trabalhar na branch `feat/demandas-redesign`, commitar cedo, stagear paths explícitos (ver memória `git-add-pathspec`).
- **4 view modes** (kanban/planilha/tabela/grid): mudanças de anatomia do item precisam valer nos 4 (ou unificar).
- **Push na main = deploy de produção**: por isso branch dedicada; só mergeia fase completa+testada.

## Backlog por fase

### Fase 0 — Discovery (em andamento)
- [x] 0.1 Mapear árvore de componentes.
- [x] 0.2 Inventariar tokens/primitivos/stack de testes.
- [ ] 0.3 **Baseline**: estender `e2e/smoke.spec.ts` cobrindo `admin/demandas` (render lista → abrir sheet → abrir modal PJe) — rede de segurança contra regressão.

### Fase 1 — Fundamentos visuais (DoD: tokens + variantes testados, sem mudança de layout ainda)
- 1.1 Consolidar tokens locais da tela (tipografia/espaçamento/raios/sombras/superfícies) em/derivado de `design-tokens.ts`.
- 1.2 Variantes de botão (primário/secundário/ghost/destrutivo/link) — auditar `ui/button.tsx`, padronizar uso na tela.
- 1.3 Padronizar chips/status/inputs/textarea/select/switch (cor semântica, foco elegante).
- 1.4 **Testes**: component tests de render/variantes (vitest+RTL) dos primitivos-chave.

### Fase 2 — Header, métricas e filtros
- 2.1 Header em camadas (título+CTA / busca+filtros essenciais / indicadores discretos).
- 2.2 Métricas compactas (PrazoCockpitBar enxuto; poucos; cor só p/ sinal).
- 2.3 Filtros essenciais vs avançados; chips ativos; limpar rápido; busca central.
- 2.4 **Testes**: filtros aplicam/limpam; busca; chips ativos; responsivo.

### Fase 3 — Lista operacional
- 3.1 Anatomia final do item (DemandaCard/Grid/Table/Compact) — 1 ação principal + overflow.
- 3.2 Mover ações secundárias p/ overflow; rebalancear pesos tipográficos.
- 3.3 **Testes**: render de campos essenciais; ação principal visível; overflow; clique abre sheet certo.

### Fase 4 — Sheet: modos internos (estende o #215)
- 4.1 **Stepper visual discreto** (substituir/elevar o nó-popover atual).
- 4.2 **Navegação por abas-modo**: Registros · Dados · Autos · Produção (com rolagem interna por modo) — regroup do `secoes-manifest` (ToC scroll-spy → tabs).
  - Registros → modo Registros. Identificação + Cronologia → **Dados**. Autos & Documentos + Recursos → **Autos**. Ofícios & Peças + Nota privada → **Produção**. Próxima audiência → no topo do modo Dados (ou faixa fixa).
- 4.3 **Barra inferior contextual** (Atender / Adicionar prazo / Agendar audiência conforme contexto).
- 4.4 **Testes**: troca de aba muda conteúdo; stepper reflete status; ações persistem; abrir/fechar preserva contexto.

### Fase 5 — Modal PJe (refino do wizard existente)
- 5.1 Stepper compacto + bloco de contexto da atribuição (Etapa 1).
- 5.2 Textarea protagonista + ajuda "Como copiar do PJe" recolhível (Etapa 2).
- 5.3 Revisão com inconsistências destacadas + recuperação de erro (Etapa 3 — já existe `pje-review-table`).
- 5.4 **Testes**: avança entre etapas; bloqueia avanço vazio; parsing→revisão; erro recuperável.

### Fase 6 — Mobile
- 6.1 Lista em cards compactos verticais (metadados secundários ocultos por padrão).
- 6.2 Sheet full-screen mobile (abas horizontais/segment + barra inferior fixa).
- 6.3 Modal PJe full-screen wizard (textarea acima da dobra; CTA fixo no rodapé).
- 6.4 Filtros recolhidos (drawer / chips scroll horizontal).
- 6.5 **Testes**: breakpoints críticos (sheet/modal full-screen; alvo de toque).

### Fase 7 — Estados especiais + polimento
- 7.1 Skeletons coerentes por área. 7.2 Empty states (lista/registros/autos). 7.3 Erro+sucesso contextual. 7.4 A11y final. 7.5 QA visual desktop/mobile.

## Ordem recomendada
0 → 1 → 2 → 3 → 4 → 5 → 6 → 7, mergeando cada fase completa+testada na main. Fase 4 (modos do sheet) é a de maior valor/risco e já tem base do #215.
