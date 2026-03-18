# Feature: Radar — Relevância de Notícias + Sheet Redesign

## Contexto

O Radar Criminal coleta notícias policiais da região de Camaçari/BA. Dois problemas principais:

1. **Relevância:** notícias irrelevantes (de outras cidades, assuntos não-policiais) entram no feed porque os filtros atuais são permissivos, especialmente para fontes locais e portais genéricos. Não há score de confiança visível — o defensor não sabe distinguir "notícia certinha de Camaçari" de "notícia que menciona Camaçari de passagem".

2. **Sheet lateral:** o painel de detalhe da notícia tem hierarquia visual fraca, usa `<details>` nativo do HTML para matches, título some ao rolar, ações enterradas no rodapé. Dificulta leitura rápida durante atendimento.

---

## User Stories

### US-01: Score de relevância visível no feed
**Como** defensor usando o Radar
**Quero** ver um indicador de confiança em cada notícia
**Para** saber quais priorizar e quais desconfiar

#### Critérios de Aceitação
- [ ] CA-01: Cada card no feed exibe chip "Confirmada", "Provável" ou "Possível"
- [ ] CA-02: Chip é colorido: verde (≥85), âmbar (60-84), cinza (35-59)
- [ ] CA-03: Notícias com score < 35 não são salvas no banco
- [ ] CA-04: O feed pode ser filtrado por threshold de relevância

### US-02: Filtros mais precisos no scraper
**Como** sistema de scraping
**Quero** rejeitar notícias fora de Camaçari antes de salvar
**Para** reduzir ruído no feed

#### Critérios de Aceitação
- [ ] CA-05: Fontes `local` exigem score ≥ 35 (antes: qualquer keyword nos 1000 chars)
- [ ] CA-06: Fontes `regional` exigem score ≥ 50 + keyword estrita no título
- [ ] CA-07: O score é calculado antes de chamar a IA de pré-triagem

### US-03: Pré-triagem IA para zona cinzenta
**Como** sistema de enriquecimento
**Quero** usar IA para decidir sobre notícias com score 35-59
**Para** recuperar notícias legítimas que os filtros estáticos rejeitariam

#### Critérios de Aceitação
- [ ] CA-08: Artigos com score 35-59 são enviados ao Claude com título + 200 chars
- [ ] CA-09: Resultado IA ajusta o score final (±10) e determina salvar/descartar
- [ ] CA-10: Custo máximo: 1 chamada IA por artigo na zona cinzenta

### US-04: Sheet lateral com sticky header e footer
**Como** defensor lendo uma notícia no sheet
**Quero** ver título e crime sempre visíveis, ações sempre acessíveis
**Para** não perder contexto ao rolar e não precisar voltar ao topo para fechar

#### Critérios de Aceitação
- [ ] CA-11: Header com título, badge de crime, badge de relevância e status enrichment fica fixo
- [ ] CA-12: Footer com "Abrir fonte", "Re-analisar" e "Copiar resumo" fica fixo
- [ ] CA-13: Botão Editar e botão × (fechar) ficam no sticky header

### US-05: Seção Resumo IA com identidade visual
**Como** defensor
**Quero** identificar visualmente o resumo gerado por IA
**Para** distinguir análise automatizada de texto original da notícia

#### Critérios de Aceitação
- [ ] CA-14: Resumo IA aparece em card com fundo `zinc-50`, borda, ícone Sparkles âmbar
- [ ] CA-15: Estado pending mostra skeleton shimmer + "Analisando com IA..."
- [ ] CA-16: Texto completo (corpo) disponível em acordeão colapsado abaixo do card

### US-06: Envolvidos com avatar por papel
**Como** defensor
**Quero** identificar rapidamente o papel de cada envolvido
**Para** focar nos suspeitos/acusados que podem ser assistidos da DPE

#### Critérios de Aceitação
- [ ] CA-17: Avatar circular com iniciais, cor mapeada por papel (red=suspeito, amber=vítima, blue=testemunha)
- [ ] CA-18: Botão "Copiar nome" aparece no hover de cada envolvido

### US-07: Matches DPE com Accordion shadcn
**Como** defensor
**Quero** ver matches expandidos/colapsados de forma consistente
**Para** ter melhor usabilidade que o `<details>` nativo atual

#### Critérios de Aceitação
- [ ] CA-19: Accordion shadcn substitui `<details>` em cada match
- [ ] CA-20: Matches com score ≥ 80 abrem automaticamente
- [ ] CA-21: Score exibido como barra de progresso `h-1` colorida

### US-08: Localização como chips inline
**Como** defensor
**Quero** ver bairro, logradouro e delegacia como chips
**Para** escanear localização mais rápido que um grid de texto

#### Critérios de Aceitação
- [ ] CA-22: Cada campo de localização vira chip `bg-zinc-100 rounded-full`
- [ ] CA-23: Chips exibidos inline, quebra natural

---

## Requisitos Não-Funcionais
- Performance: score calculado em memória, sem query extra ao banco
- Custo IA: pré-triagem só para zona cinzenta (35-59), não para todos os artigos
- Sem breaking changes: props do RadarNoticiaSheet permanecem iguais
- SSR-safe: sem `window` no render server-side

## Fora do Escopo
- Reprocessar notícias já salvas com o novo score (só novas coletas)
- Redesign dos cards do feed (apenas o sheet)
- Mudanças no schema de matches ou assistidos

## Dependências
- `radar_noticias.relevancia_score` (novo campo integer)
- Migration Supabase para o novo campo
- Accordion de shadcn/ui já instalado no projeto

## Riscos
| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Pré-triagem IA adiciona latência ao scrape | Média | Baixo | Só zona cinzenta; timeout 5s |
| Sticky header conflita com SheetContent scroll | Baixa | Médio | Usar `overflow-y-auto` no body, não no SheetContent |
| Score muito restritivo rejeita notícias legítimas | Média | Alto | Threshold configurável; log de rejeições |
