# Sistema Nervoso Defensivo Vivo — Design

> Data: 2026-03-05
> Status: Aprovado

## Objetivo

Transformar dados extraidos pelo enrichment (documentos classificados, transcricoes, analises IA) em interfaces vivas nas paginas de assistidos e processos. O Drive e a fonte de verdade — nenhum arquivo e duplicado.

## Componentes

### 1. Timeline Processual Viva

**Onde:** Aba "Timeline" em processos e consolidada no assistido.

**Fonte de dados:**
- `driveDocumentSections.tipo` (denuncia, sentenca, decisao, depoimento, etc.)
- `driveFileContents.documentType` / `documentSubtype`
- `driveFiles.lastModifiedTime` como fallback para ordenacao temporal
- `enrichmentData.analysis` para datas mencionadas no texto

**Comportamento:**
- Timeline cronologica de atos juridicos
- Cada item mostra: tipo de ato, data, resumo curto, link "Abrir no Drive"
- Midias (deposicoes) aparecem com botao play inline
- Contradicoes detectadas entre depoimentos mostram badge de alerta
- Funciona com dados existentes; enriquece conforme enrichment evolui

### 2. Hub de Midias Inteligente

**Onde:** Aba "Midias" no assistido (evolucao do existente).

**Layout:**
- Agrupamento por processo (driveFiles.processoId)
- Cada midia: player inline (streaming via webContentLink), transcricao, resumo IA
- Badges: contradicoes, pontos favoraveis/desfavoraveis
- Botao "Transcrever" para arquivos pendentes (dispara Inngest job)

**Principios lightweight:**
- Player usa webContentLink do Drive como src — streaming direto
- Transcricao/resumo do driveFiles.enrichmentData (ja no banco)
- Zero storage adicional

### 3. Status da Instrucao (Ficha no Processo)

**Onde:** Card acima das tabs na pagina de processo.

**Conteudo:**
- Quem foi ouvido, quem falta ouvir
- Status de intimacao de cada testemunha
- Desistencias do MP
- Intercorrencias por audiencia (detectadas via enrichment ou registradas manualmente)
- Providencias sugeridas

**Fonte:**
- audiencias table + enrichment data
- driveDocumentSections filtrado por processoId
- crossAnalyses para contradicoes

## Plano de Implementacao

| # | Item | Prioridade |
|---|------|-----------|
| 1 | Queries tRPC: timelineByProcesso, midiasByAssistido | P0 |
| 2 | MidiasHub: agrupamento + player + transcricao | P0 |
| 3 | ProcessoTimelineViva: timeline de atos | P1 |
| 4 | InstrucaoStatus: status instrucao + intercorrencias | P1 |

## Principio Fundamental

Cada componente funciona com dados existentes. Conforme o enrichment evolui e classifica mais documentos, as telas automaticamente ficam mais ricas — o sistema ganha "vida" gradativamente.
