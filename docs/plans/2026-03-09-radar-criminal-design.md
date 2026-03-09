# Radar Criminal — Design Document

> Ferramenta de inteligencia criminal para a Defensoria Publica de Camacari.
> Monitoramento automatizado de noticias policiais, extracao de dados estruturados,
> matching com assistidos da DPE, e visualizacao geoespacial.

## Decisoes de Design

| Decisao | Escolha |
|---------|---------|
| Publico | Defensor (atendimento + juri) + Gestao (macro) |
| Fontes | 10 portais locais/regionais + redes sociais |
| Extracao | Gemini Flash (todas) → Sonnet 4.6 (matches confirmados + sob demanda) |
| Mapa | Leaflet interativo com heatmap, camadas por crime, clusters |
| Matching | Automatico com score de confianca (80+ confirma, 50-79 revisao) |
| Analise narrativa | Sob demanda manual (botao no card ou bulk para juri) |
| Posicionamento | "Radar Criminal" em Ferramentas, pagina independente |
| Integracoes | Perfil assistido, preparacao juri, dashboard, notificacoes |

---

## 1. Arquitetura Geral e Pipeline de Dados

### Camada 1 — Coleta (Enrichment Engine, diaria)

- Cron job diario (6h da manha) no enrichment-engine (Railway)
- Scraper busca em ~12 fontes:
  - **Locais**: Camacari Noticias, Blog do Valente, Jornal Grande Bahia, Alo Camacari, Jornal Camacari, Bahia Noticias
  - **Regionais**: A Tarde, Correio 24h, G1 Bahia, BNews
  - **Redes sociais**: Instagram (perfis de noticia local), X/Twitter, grupos publicos do Facebook — busca por keywords + geolocalizacao Camacari
- Cada fonte tem um parser especifico (CSS selectors para titulo, corpo, data, autor)
- Fallback: Google News API com query `"Camacari" + (homicidio OR preso OR flagrante OR operacao OR trafico OR roubo)`
- Deduplicacao por similaridade de titulo (trigram > 0.7) antes de salvar
- Salva HTML raw + texto limpo no Supabase

### Camada 2 — Analise (Gemini Flash, automatica)

Para cada noticia nova, Gemini Flash extrai JSON estruturado:

- `tipoCrime`: enum (homicidio, tentativa_homicidio, trafico, roubo, furto, violencia_domestica, sexual, lesao_corporal, porte_arma, estelionato, outros)
- `envolvidos[]`: nome, papel (suspeito/vitima/policial/testemunha), idade, vulgo
- `localizacao`: bairro, rua, coordenadas aproximadas (geocoding via Nominatim/OpenStreetMap — gratuito)
- `dataFato`: quando ocorreu (diferente da data da noticia)
- `delegacia`: se mencionada
- `circunstancia`: flagrante, mandado, denuncia, operacao policial
- `artigosPenais[]`: se mencionados
- `armaMeio`: arma de fogo, arma branca, etc.
- `resumo`: 2-3 frases

### Camada 3 — Matching (automatico + sob demanda)

- Apos extracao, compara `envolvidos[].nome` com `assistidos.nome` usando pg_trgm (similaridade > 0.6)
- Score de confianca: nome (40%) + bairro coincide (20%) + tipo crime coincide (20%) + proximidade temporal (20%)
- Score >= 80: match automatico (badge verde "Confirmado")
- Score 50-79: "Possivel mencao" (badge amarelo, revisao manual)
- Score < 50: descartado

### Escalonamento de IA por score

- **Todas as noticias**: Gemini Flash (extracao NER basica)
- **Match score >= 80 (confirmado)**: Claude Sonnet 4.6 faz analise profunda — extrai dados estruturados detalhados, sugere vinculacao ao cadastro do assistido, tenta identificar processo (por nome + tipo crime + vara + data)
- **Sob demanda manual**: analise narrativa/vies midiatico (tambem Sonnet 4.6) — botao "Analisar vies midiatico" no card da noticia quando vinculada a um caso

---

## 2. Schema do Banco de Dados

### Tabela `radar_noticias`

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | serial PK | - |
| url | text UNIQUE | URL original da noticia |
| fonte | varchar(50) | Nome do portal/rede social |
| titulo | text | Titulo da materia |
| corpo | text | Texto completo limpo |
| dataPublicacao | timestamp | Quando foi publicada |
| dataFato | timestamp | Quando o fato ocorreu |
| imagemUrl | text | Thumbnail se disponivel |
| tipoCrime | enum | homicidio, tentativa_homicidio, trafico, roubo, furto, violencia_domestica, sexual, lesao_corporal, porte_arma, estelionato, outros |
| bairro | text | Bairro extraido |
| logradouro | text | Rua/local especifico |
| latitude | decimal | Coordenada para mapa |
| longitude | decimal | Coordenada para mapa |
| delegacia | text | Delegacia mencionada |
| circunstancia | enum | flagrante, mandado, denuncia, operacao, investigacao, julgamento |
| artigosPenais | jsonb | Array de artigos do CP |
| armaMeio | text | Arma de fogo, branca, etc. |
| resumoIA | text | Resumo de 2-3 frases (Flash) |
| envolvidos | jsonb | Array de {nome, papel, idade, vulgo} |
| enrichmentStatus | enum | pending, extracted, matched, analyzed |
| analysisSonnet | jsonb | Analise profunda (so para matches confirmados) |
| rawHtml | text | HTML original para reprocessamento |
| createdAt / updatedAt | timestamp | - |

### Tabela `radar_matches`

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | serial PK | - |
| noticiaId | FK radar_noticias | - |
| assistidoId | FK assistidos | Nullable |
| processoId | FK processos | Nullable |
| casoId | FK casos | Nullable |
| nomeEncontrado | text | Nome que fez match |
| scoreConfianca | integer | 0-100 |
| status | enum | auto_confirmado, possivel, descartado, confirmado_manual |
| dadosExtraidos | jsonb | Dados estruturados do Sonnet (quando score alto) |
| confirmedBy | FK users | Quem confirmou manualmente |
| confirmedAt | timestamp | - |

### Tabela `radar_fontes` (configuracao)

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | serial PK | - |
| nome | varchar | "Alo Camacari" |
| tipo | enum | portal, instagram, twitter, facebook |
| url | text | URL base ou perfil |
| seletorTitulo | text | CSS selector para titulo |
| seletorCorpo | text | CSS selector para corpo |
| seletorData | text | CSS selector para data |
| ativo | boolean | Liga/desliga fonte |
| ultimaColeta | timestamp | Controle de deduplicacao |

### Indexes

- `radar_noticias_url_unique` — deduplicacao
- `radar_noticias_tipo_crime_idx` — filtro por crime
- `radar_noticias_data_fato_idx` — filtro temporal
- `radar_noticias_bairro_trgm_idx` — busca fuzzy por bairro
- `radar_noticias_envolvidos_gin_idx` — busca em JSONB de nomes
- `radar_matches_assistido_idx` — lookup rapido por assistido
- Spatial index em lat/lng para queries geograficas

---

## 3. Interface — Tabs e Layout

Pagina: `/admin/radar`

### Tab 1 — Feed (visao padrao)

- Timeline vertical de noticias, mais recentes primeiro
- Cada card mostra: badge de tipo de crime (cor por categoria), titulo, fonte + data, bairro, resumo IA de 2 linhas, contagem de envolvidos
- Cores por crime: vermelho (homicidio), laranja (tentativa), roxo (trafico), azul (roubo), amarelo (furto), rosa (VD), magenta (sexual), zinc (outros)
- Sidebar esquerda com filtros: tipo de crime (checkboxes), periodo (date range), bairro (combobox), fonte, so com match DPE (toggle)
- Badge especial "Caso DPE" quando ha match com assistido — clicavel, leva ao perfil
- Busca textual no topo (nome, local, palavras-chave)
- Infinite scroll com cursor pagination

### Tab 2 — Mapa

- Leaflet fullscreen com tiles OpenStreetMap, centrado em Camacari (-12.6976, -38.3244)
- Heatmap layer (toggle) mostrando densidade de ocorrencias
- Marker clusters por bairro — clique expande pins individuais
- Cada pin: icone colorido por tipo de crime, popup com titulo + data + link para noticia
- Layer toggles: Homicidios, Trafico, Roubo/Furto, VD, Sexual, Outros
- **Camada especial "Casos DPE"**: pins dourados/destacados para ocorrencias vinculadas a assistidos — popup mostra nome do assistido + no processo
- Slider temporal na parte inferior: arrasta para ver evolucao mensal
- Mini-legenda no canto com cores

### Tab 3 — Estatisticas

- Periodo selecionavel (7d, 30d, 90d, 1 ano, total)
- Row 1: Cards KPI — Total de ocorrencias, por tipo (top 5), matches DPE
- Row 2: Grafico de barras empilhadas (Recharts) — ocorrencias por mes, segmentado por tipo de crime
- Row 3: Dois graficos lado a lado:
  - Donut chart: distribuicao por tipo de crime
  - Bar chart horizontal: top 10 bairros mais violentos
- Row 4: Tabela "Bairros em alerta" — bairros com aumento > 30% vs periodo anterior, com seta de tendencia
- Row 5 (so para gestao): "Demanda projetada DPE" — estimativa de novos casos por tipo baseada na tendencia

### Tab 4 — Matches DPE

- Lista focada apenas em noticias vinculadas a assistidos
- Agrupado por assistido (accordion)
- Cada match mostra: score de confianca (badge verde/amarelo), noticia resumida, botoes de acao
- Acoes: "Confirmar vinculo", "Descartar", "Analisar vies midiatico" (Sonnet 4.6), "Ver no perfil do assistido"
- Para matches confirmados com analise Sonnet: card expandido mostrando dados extraidos, pontos exploraveis pela defesa, tom midiatico

---

## 4. Integracao com o Ecossistema OMBUDS

### No perfil do assistido (`/admin/assistidos/[id]`)

- Novo card "Radar Criminal" na sidebar de inteligencia
- Mostra contagem de mencoes na midia com badge de cor (verde=confirmado, amarelo=possivel)
- Clique expande lista de noticias vinculadas, com resumo e link
- Se houver analise Sonnet: secao "Impacto Midiatico" com tom, pontos exploraveis, inconsistencias entre versao da midia e versao dos autos
- Alerta visual quando ha noticia nova (dot de notificacao no card)

### Na preparacao de juri (`/admin/juri/[id]` > aba Preparacao)

- Novo bloco "Cobertura Midiatica" no checklist inteligente
- Item dinamico: "X noticias encontradas sobre o caso — Y analisadas"
- Botao "Analisar vies midiatico" dispara Sonnet 4.6 em todas as noticias vinculadas e gera relatorio consolidado:
  - Como a midia retratou o reu (presuncao de culpa? uso de algemas na foto? vulgo no titulo?)
  - Pontos de contradicao entre versoes da midia e depoimentos nos autos
  - Argumentos para sustentar nulidade por influencia midiatica nos jurados (art. 478 CPP)
  - Sugestao de perguntas para a selecao de jurados sobre exposicao previa ao caso

### No dashboard principal

- Widget "Radar" compacto: "X novas ocorrencias hoje em Camacari", mini-grafico sparkline da semana
- Badge de alerta se houver match novo com assistido (numero no icone do sidebar)

### Notificacoes

- Push notification no OMBUDS quando um match de alta confianca (>= 80) e detectado
- Notificacao diaria resumo: "Radar: X ocorrencias ontem, Y matches com assistidos"
- Configuravel por defensor (pode silenciar tipos especificos de crime)

---

## 5. Implementacao — Fases e Arquivos

### Fase 1 — Fundacao (schema + scraper + extracao)

- Schema Drizzle: `src/lib/db/schema/radar.ts`
- Migration SQL: `supabase/migrations/20260309_radar_criminal.sql`
- Enrichment Engine: `enrichment-engine/services/radar_scraper_service.py`
- Enrichment Engine: `enrichment-engine/services/radar_extraction_service.py`
- Cron: `enrichment-engine/jobs/radar_daily.py`
- tRPC Router: `src/lib/trpc/routers/radar.ts`

### Fase 2 — Interface principal

- Pagina: `src/app/(dashboard)/admin/radar/page.tsx`
- Componentes:
  - `src/components/radar/radar-feed.tsx`
  - `src/components/radar/radar-noticia-card.tsx`
  - `src/components/radar/radar-mapa.tsx`
  - `src/components/radar/radar-estatisticas.tsx`
  - `src/components/radar/radar-matches.tsx`
  - `src/components/radar/radar-filtros.tsx`
- Sidebar: adicionar "Radar Criminal" em TOOLS_NAV com icone `Radio` (lucide)

### Fase 3 — Matching + Sonnet

- Service: `enrichment-engine/services/radar_matching_service.py`
- Service: `enrichment-engine/services/radar_analysis_service.py`
- tRPC: procedures `confirmMatch`, `dismissMatch`, `analyzeNoticia`, `analyzeBulkForJuri`

### Fase 4 — Integracoes

- `src/components/assistidos/radar-card.tsx`
- `src/components/juri/preparacao/cobertura-midiatica.tsx`
- `src/components/dashboard/radar-widget.tsx`
- Notificacoes: hook no matching para criar notificacao quando score >= 80

### Dependencias novas

- `react-leaflet` + `leaflet` — mapa interativo
- `leaflet.heat` — plugin heatmap
- `leaflet.markercluster` — agrupamento de pins
- Nenhuma dependencia nova no backend (Playwright ja existe no enrichment-engine)

### Arquivos: 14 novos + 4 modificados

---

## 6. Fluxo de Dados

```
[Cron diario 6h] → radar_scraper_service.py
    ├── Scrape 12 fontes (portais + redes sociais)
    ├── Deduplicacao (pg_trgm titulo > 0.7)
    └── Salva em radar_noticias (status: pending)

[Pos-coleta] → radar_extraction_service.py
    ├── Gemini Flash extrai NER JSON
    ├── Geocoding via Nominatim (bairro → lat/lng)
    └── Atualiza radar_noticias (status: extracted)

[Pos-extracao] → radar_matching_service.py
    ├── pg_trgm compara envolvidos[] vs assistidos.nome
    ├── Calcula score (nome 40% + bairro 20% + crime 20% + tempo 20%)
    ├── Score >= 80 → auto_confirmado → Sonnet 4.6 analise profunda
    ├── Score 50-79 → possivel (revisao manual)
    └── Score < 50 → descartado

[Sob demanda] → radar_analysis_service.py (Sonnet 4.6)
    ├── Analise narrativa/vies midiatico
    ├── Pontos exploraveis pela defesa
    └── Salva em radar_noticias.analysisSonnet
```
