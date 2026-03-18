# Feature: Noticias Upgrade — Triagem, Categorização e Cobertura

## Contexto
A Central de Notícias Jurídicas tem três gargalos que comprometem a eficiência diária:
1. A triagem exige expandir cada item para tomar uma decisão — muitos cliques para uma tarefa repetitiva.
2. A categorização keyword-based classifica errado notícias com linguagem mais informal ou nova.
3. A cobertura de fontes é limitada (9 fontes), deixando passar notícias importantes do cenário jurídico penal.

## User Stories

### US-01: Triagem com resumo inline e navegação por teclado
**Como** defensor
**Quero** ver o resumo da IA diretamente na linha colapsada e navegar entre itens com ↑↓
**Para** tomar decisões de aprovação/descarte em segundos, sem expandir cada card

#### Critérios de Aceitação
- [ ] CA-01: Cada item colapsado exibe `resumoExecutivo` em até 2 linhas (clampado)
- [ ] CA-02: Teclas `↑` / `↓` mudam o item focado na lista (auto-expandindo o item ativo)
- [ ] CA-03: `A` aprova e avança para o próximo; `D` descarta e avança para o próximo
- [ ] CA-04: Se `analiseIa` for null (pendente de enriquecimento), mostrar `resumo` do DB como fallback ou "Analisando..."
- [ ] CA-05: Hint de teclado sempre visível no header (não só quando expandido)
- [ ] CA-06: Primeiro item da lista começa focado/expandido automaticamente

### US-02: Categorização por IA durante aprovação
**Como** sistema
**Quero** que a IA reclassifique a categoria da notícia durante o enriquecimento
**Para** corrigir erros do classifier keyword-based e ter categorias mais precisas

#### Critérios de Aceitação
- [ ] CA-01: O prompt de enriquecimento inclui instrução para classificar em `legislativa | jurisprudencial | artigo`
- [ ] CA-02: A IA retorna `categoriaIA` no JSON de resposta
- [ ] CA-03: Se `categoriaIA` difere da `categoria` atual, o banco é atualizado com o valor da IA
- [ ] CA-04: Notícias já enriquecidas (analiseIa não null) não são re-categorizadas automaticamente

### US-03: Novas fontes RSS diretas
**Como** defensor
**Quero** que o sistema capture notícias de Migalhas, Canal Ciências Criminais, Empório do Direito, TRF-1, TRF-5 e outros
**Para** não perder jurisprudência e artigos relevantes que hoje passam pela fresta

#### Critérios de Aceitação
- [ ] CA-01: 6 novas fontes inseridas na tabela `noticias_fontes` com ativo=true
- [ ] CA-02: Cores e labels das novas fontes adicionadas nos mapas de UI (feed, triagem, card)
- [ ] CA-03: Fontes aparecem no dropdown de filtro por fonte no feed
- [ ] CA-04: Scraping das novas fontes funciona sem erros (notícias chegam como pendentes)

### US-04: Google News RSS como meta-fonte
**Como** sistema
**Quero** consultar o Google News RSS com queries especializadas em direito penal
**Para** capturar notícias de fontes que não têm RSS próprio ou que não estamos monitorando

#### Critérios de Aceitação
- [ ] CA-01: Scraper busca Google News RSS com 3 queries penal-focadas
- [ ] CA-02: Links do Google News são resolvidos para URLs originais antes de salvar
- [ ] CA-03: Deduplicação por `urlOriginal` evita duplicatas com fontes diretas
- [ ] CA-04: Fonte salva no campo `fonte` como slug da origem real (ex: "migalhas"), não "google-news"
- [ ] CA-05: Funciona com `buscarAgora` manual e cron automatizado

## Requisitos Não-Funcionais
- Performance: triagem de 20 itens em menos de 2 minutos com navegação por teclado
- Custo IA: categorização não deve adicionar tokens significativos (reutiliza call do enriquecimento)
- Resiliência: falha de uma fonte não bloqueia scraping das demais
- Sem paywall: usar apenas fontes com conteúdo acessível sem login

## Fora do Escopo
- Feedback loop de treinamento do classifier (próxima iteração)
- Subcategorias granulares (STF vs STJ) — próxima iteração
- Deduplicação por similaridade de conteúdo (fuzzy match)
- Paywalled sources (JOTA Pro, etc.)
- Responsividade mobile da triagem

## Dependências
- Enricher existente (`src/lib/noticias/enricher.ts`) — modificar para incluir categoria
- Scraper existente (`src/lib/noticias/scraper.ts`) — adicionar Google News como fonte especial
- Tabela `noticias_fontes` — insert das novas fontes via SQL/seed

## Riscos
| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Google News muda formato RSS | Média | Alto | Fallback gracioso, alerta no erro do scraper |
| TRF-1/TRF-5 bloqueiam bot | Média | Médio | User-Agent respeitoso, retry com backoff |
| IA classifica errado em borda | Baixa | Baixo | Usuário ainda pode corrigir manualmente no reader |
| Redirect Google News falha | Baixa | Médio | Manter URL do Google como fallback se redirect falhar |
