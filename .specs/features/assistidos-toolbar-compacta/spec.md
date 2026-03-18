# Feature: Toolbar Compacta — Página Assistidos

## Contexto
A área acima da tabela de assistidos ocupa ~470px antes de mostrar qualquer linha de dado.
Isso exige scroll desnecessário e fragmenta informação que poderia estar unificada.

## Problema
- Header da página: ~150px (gradiente, título grande, padding generoso)
- Stats bar: ~48px separado dos filtros
- Alertas urgência: ~44px conditional abaixo das stats
- Card de filtros (Atribuição + Filtros rápidos + Ordenar): ~160px em card separado
- Contador "375 assistidos": ~32px isolado

## Solução
Colapsar tudo em dois blocos compactos:
1. **Header compacto** (~48px): ícone pequeno + título + busca + ações inline
2. **Toolbar unificada** (~44px): stats clicáveis | chips atribuição | filtros rápidos | ordenar | toggle grid/tabela

Total: ~92px antes da tabela (redução de 80%)

## User Stories

### US-01: Header compacto
**Como** defensor
**Quero** um header menor na página de assistidos
**Para** ver mais linhas da tabela sem precisar rolar

#### Critérios de Aceitação
- [ ] CA-01: Header máximo 48px de altura (vs 150px atual)
- [ ] CA-02: Título, busca e botões (Solar, Export, Novo) continuam visíveis
- [ ] CA-03: Sem gradiente decorativo
- [ ] CA-04: Atalhos de teclado mantidos

### US-02: Toolbar unificada
**Como** defensor
**Quero** stats + filtros numa única linha horizontal
**Para** filtrar rapidamente sem perder espaço de tela

#### Critérios de Aceitação
- [ ] CA-05: Stats (total, presos, audiências hoje, demandas) na mesma linha dos filtros
- [ ] CA-06: Chips de atribuição inline, sem card separado
- [ ] CA-07: Filtros rápidos inline, sem card separado
- [ ] CA-08: Ordenar integrado na toolbar ou na barra da tabela
- [ ] CA-09: Alertas de urgência (prazos vencidos, audiências hoje) inline como badges na stats bar
- [ ] CA-10: Toggle grid/tabela mantido e visível
- [ ] CA-11: Toda funcionalidade existente preservada

## Fora do Escopo
- Não remover nenhuma funcionalidade existente
- Não alterar a tabela em si
- Não alterar a tab Analytics

## Arquivo Principal
`src/app/(dashboard)/admin/assistidos/page.tsx`
Seções afetadas: linhas 990–1105 (header), 1251–1322 (stats+alertas), 1325–1500 (filtros)
