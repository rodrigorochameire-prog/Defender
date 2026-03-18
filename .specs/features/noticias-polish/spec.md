# Feature: Polimento Visual da Central de Notícias

## Contexto
A Central de Notícias passou por dois ciclos de redesign (feed, reader drawer, header, sidebar).
O visual funciona, mas cinco pontos de refinamento ainda comprometem a sofisticação:
entidades HTML cruas nos títulos, badge redundante, ausência de coluna de leitura,
skeletons genéricos e highlight de card selecionado pesado demais.

## User Stories

### US-01: Títulos sem ruído de encoding
**Como** defensor
**Quero** ver títulos limpos como "Habermas: o último 'mandarim' democrata alemão"
**Para** ter uma experiência de leitura profissional, sem artefatos técnicos visíveis

#### Critérios de Aceitação
- [ ] CA-01: Entidades HTML (`&#8216;`, `&#8217;`, `&amp;`, `&quot;`, etc.) são decodificadas antes de renderizar
- [ ] CA-02: Decodificação ocorre tanto no card quanto no header do reader panel
- [ ] CA-03: Sem uso de `dangerouslySetInnerHTML` para o título (segurança)

### US-02: Badge de categoria refinado
**Como** defensor
**Quero** que o badge "JURISPRUDENCIAL" não competia visualmente com a borda colorida da fonte
**Para** que a hierarquia visual do card seja clara e elegante

#### Critérios de Aceitação
- [ ] CA-01: Badge em lowercase (`Jurisprudencial`, não `JURISPRUDENCIAL`)
- [ ] CA-02: Cor neutra (`text-zinc-500`, `bg-zinc-100`) — sem cor da fonte no badge
- [ ] CA-03: A borda lateral esquerda continua colorida por fonte (único indicador de cor)

### US-03: Coluna de leitura com max-width
**Como** defensor
**Quero** que os cards não se estirem até a borda da tela
**Para** ter uma coluna de leitura confortável, como em publicações editoriais

#### Critérios de Aceitação
- [ ] CA-01: Feed com `max-w-3xl` centralizado quando sidebar está expandida
- [ ] CA-02: Feed com `max-w-2xl` quando sidebar está colapsada (mais estreita, mais elegante)
- [ ] CA-03: Sem quebra de layout com o drawer aberto

### US-04: Skeletons com forma de card real
**Como** defensor
**Quero** que o estado de carregamento se pareça com os cards reais
**Para** ter uma sensação de continuidade e profissionalismo

#### Critérios de Aceitação
- [ ] CA-01: Skeleton tem borda lateral esquerda simulada (zinc-200)
- [ ] CA-02: Skeleton simula: linha meta (badge + fonte + data), título (2 linhas), síntese (3 linhas), caixa de impacto
- [ ] CA-03: Animação `animate-pulse` mantida

### US-05: Highlight de card selecionado refinado
**Como** defensor
**Quero** que o card aberto no drawer tenha um destaque sutil e elegante
**Para** saber qual card está ativo sem distorção visual

#### Critérios de Aceitação
- [ ] CA-01: Remover `border-emerald-400 ring-1 ring-emerald-400/30` (pesado)
- [ ] CA-02: Substituir por `bg-zinc-50 dark:bg-zinc-800/60 border-zinc-300` — sutil, neutro
- [ ] CA-03: Borda lateral colorida da fonte continua visível no card selecionado

## Fora do Escopo
- Mudanças no backend ou schema
- Novos campos de dados
- Responsividade mobile (separado)

## Riscos
| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Decodificação quebrar títulos com HTML real | Baixa | Médio | Usar DOMParser apenas para texto, não HTML |
| max-width quebrar layout com drawer | Baixa | Baixo | Testar com drawer aberto e fechado |
