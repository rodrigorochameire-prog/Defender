# Drive UI Redesign — Hub + File Manager + IA Ready

**Data**: 2026-02-25
**Status**: Design aprovado, aguardando implementacao
**Autor**: Claude + Rodrigo

---

## Visao Geral

Redesign completo da interface `/admin/drive` para um Hub + File Manager com 3 zonas:
- **Sidebar** (240px): arvore de navegacao com atribuicoes, pastas especiais, acesso rapido
- **Content Area** (flex-1): lista/grid de arquivos com filtros, batch actions, drag & drop
- **Detail Panel** (320px, toggle): preview inline, metadados, contexto juridico, IA

## Secao 1: Layout Geral

```
+------------------------------------------------------------------+
| Busca global (Ctrl+K)                    Sync 2min  * Healthy     |
+------------+------------------------------------+------------------+
| SIDEBAR    | CONTENT AREA                       | DETAIL PANEL     |
| (240px)    | (flex-1)                            | (320px, toggle)  |
|            |                                     |                  |
| > Juri     | Breadcrumbs: Juri > Joao > 01-Init  | Peticao.pdf      |
|   |- Ana   |                                     |                  |
|   |- Joao  | [Grid/List] [Filtros] [+ Upload]    | [PDF Preview]    |
|   |- Pedro |                                     |                  |
| > VVD      | Cards/rows de arquivos              | Vinculado:       |
| > EP       |                                     | -> Proc. 001..   |
| > Subst.   |                                     | -> Joao da Silva |
| ------     |                                     |                  |
| Distrib.   |                                     | Enrichment: OK   |
| Jurisp.    |                                     | Tipo: Peticao    |
| ------     |                                     |                  |
| Recentes   | [Drag & drop zone]                  | Acoes: Download, |
| Favoritos  |                                     | Renomear, etc.   |
+------------+------------------------------------+------------------+
```

## Secao 2: Barra Superior

- **Busca global**: pesquisa em TODAS as atribuicoes de uma vez
- **Resultados**: agrupados por atribuicao com breadcrumb de contexto
- **Atalho**: Ctrl+K para focar (command palette estilo VS Code)
- **Indicador de saude**: verde/amber/vermelho com tempo desde ultimo sync
- **Botao Sync**: forccar sincronizacao manual
- **Botao Upload**: upload rapido na pasta atual
- **Popover de saude**: detalhes de channels, erros, folders sincronizados

## Secao 3: Sidebar — Arvore de Navegacao

### Estrutura
```
ATRIBUICOES
  Juri (234 docs)          <- cor emerald
    |- Ana Santos
    |- Joao da Silva  *    <- dot = alteracao recente
    |- Pedro Oliveira
  VVD (108 docs)           <- cor rose
  EP (89 docs)             <- cor amber
  Substituicao (45 docs)   <- cor sky

ESPECIAIS
  Distribuicao [3]         <- badge vermelho = pendentes
  Jurisprudencia

ACESSO RAPIDO
  Recentes (ultimos 10)
  Favoritos
```

### Comportamento
- **Lazy loading**: subpastas carregam ao expandir
- **Highlight ativo**: zinc-800 + borda emerald-500 a esquerda
- **Contagem dinamica**: total de docs sincronizados
- **Collapse**: chevron no desktop, drawer no mobile
- **Right-click**: menu contextual (Abrir no Drive, Sincronizar, Copiar link)
- **Recentes**: localStorage, ultimos 10 arquivos visualizados
- **Favoritos**: starred pelo usuario (campo tags no DB)

## Secao 4: Content Area — Lista de Arquivos

### Modo Grid (padrao)
- Cards com thumbnail, nome, tamanho, status enrichment
- Pastas com contagem de docs
- Hover actions: Ver, Vincular, Download, Renomear

### Modo List
- Tabela: checkbox, icone, nome, tamanho, data, status enrichment
- Colunas ordenaveis

### Funcionalidades
- **Breadcrumbs navegaveis**: clicar em qualquer nivel volta
- **Filtros combinaveis**: Tipo (PDF/Imagem/Audio/Pasta/GDocs), Data, Enrichment status
- **Busca local**: pesquisa na pasta atual
- **Multi-select**: checkboxes com toolbar de acoes em lote
- **Batch actions**: Vincular, Mover, Enrich, Excluir, Extrair com IA
- **Drag & drop**: upload do desktop, overlay "Solte para enviar"
- **View toggle**: Grid/List persistido em localStorage

## Secao 5: Detail Panel — Preview + Contexto Juridico

### Preview por tipo
- **PDF**: iframe com Google Drive preview embed (webViewLink)
- **Imagem**: img com zoom ao clicar
- **Audio**: Player HTML5 com controles
- **Google Docs**: preview embed
- **Outros**: icone grande + botao "Abrir no Drive"

### Secoes do panel
1. **Acoes**: Download, Abrir no Drive, Renomear, Favoritar
2. **Detalhes**: tipo, tamanho, datas, checksum
3. **Enrichment**: status, tipo detectado, confianca, re-processar
4. **Contexto juridico**: assistido (nome, status prisional, contato),
   processo (numero, vara, status), demandas abertas com prazo
5. **Vinculacao**: vincular a processo/assistido, adicionar tags

### Toggle
- Abre/fecha com animacao slide
- Mobile: bottom sheet
- Atalho: Space

## Secao 5b: Inteligencia Artificial (Agno + LangChain Ready)

### No Detail Panel
- **Dados extraidos**: exibe JSON estruturado do enrichment (reu, vitima, crime, datas)
- **Preview Docling**: Markdown renderizado do conteudo do PDF
- **Jurisprudencia RAG**: precedentes encontrados na pasta Jurisprudencia (placeholder)
- **Analise de caso**: contradicoes detectadas, teses sugeridas (placeholder)
- **Acoes IA**: Re-extrair, Copiar, Ver completo, Solicitar analise

### Agentes planejados (backend futuro)
| Agente            | Framework  | Funcao                                        |
|-------------------|------------|-----------------------------------------------|
| Classificador     | LangChain  | Classifica tipo do documento                  |
| Extrator          | LangChain  | Extrai dados estruturados                     |
| RAG Jurisprud.    | LangChain  | Busca precedentes com PgVector                |
| Analista de Caso  | Agno       | Cruza todos docs de um assistido              |
| Detector Contrad. | Agno       | Compara depoimentos, encontra inconsistencias |
| Estrategista      | Agno       | Sugere teses de defesa                        |

### No Overview Dashboard
- Card de enrichment: extraidos, processando, falharam, pendentes
- Botao "Processar pendentes"

### Batch actions IA
- Selecionar multiplos PDFs -> "Extrair com IA" -> envia para enrichment engine

## Secao 6: Funcionalidades Diferenciais

### 6.1 — Command Palette (Ctrl+K)
- Overlay central estilo VS Code / Notion
- Busca unificada: arquivos + assistidos + processos + acoes rapidas
- Resultados em tempo real (debounce 300ms)
- Enter navega, setas navegam

### 6.2 — Drag & Drop Inteligente
- Upload: desktop -> content area
- Mover: arquivo -> pasta na sidebar
- Vincular: arquivo -> nome de assistido/processo

### 6.3 — Atividade Recente (feed)
- Na sidebar, timeline de ultimas acoes
- Arquivo adicionado, renomeado, vinculado, pasta criada

### 6.4 — Status Cards no Overview
- Quando nenhuma pasta selecionada, mostra dashboard
- Cards das 4 atribuicoes com contagem e status
- Distribuicao com badge de pendentes
- Metricas gerais: total docs, enriched %, vinculados %
- Card de IA/enrichment

### 6.5 — Keyboard Shortcuts
| Atalho     | Acao               |
|------------|--------------------|
| Ctrl+K     | Busca global       |
| Enter      | Abrir pasta/arquivo|
| Backspace  | Voltar nivel       |
| Space      | Toggle detail panel|
| Ctrl+U     | Upload             |
| Ctrl+A     | Selecionar tudo    |
| Delete     | Excluir            |
| G -> L     | Toggle Grid/List   |
| /          | Busca local        |

## Secao 7: Arquitetura de Componentes

```
/admin/drive/page.tsx                    <- Pagina principal (hub)
  |- DriveCommandPalette.tsx             <- Ctrl+K busca global
  |- DriveTopBar.tsx                     <- Barra superior
  |- DriveSidebar.tsx                    <- Arvore de navegacao
  |    |- SidebarAtribuicaoItem.tsx      <- Item expandivel
  |    |- SidebarSpecialFolders.tsx      <- Distribuicao + Jurisprudencia
  |    |- SidebarQuickAccess.tsx         <- Recentes + Favoritos
  |- DriveContentArea.tsx                <- Area central
  |    |- DriveBreadcrumbs.tsx           <- Navegacao por caminho
  |    |- DriveFilters.tsx               <- Filtros: tipo, data, enrichment
  |    |- DriveFileGrid.tsx              <- Modo grid com thumbnails
  |    |- DriveFileList.tsx              <- Modo lista tabular
  |    |- DriveBatchActions.tsx          <- Toolbar de acoes em lote
  |    |- DriveOverviewDashboard.tsx     <- Cards/metricas (nada selecionado)
  |    |- DriveDropZone.tsx              <- Drag & drop overlay
  |- DriveDetailPanel.tsx                <- Painel direito
       |- FilePreview.tsx                <- Preview por tipo
       |- FileMetadata.tsx               <- Detalhes do arquivo
       |- FileEnrichmentInfo.tsx         <- Status enrichment + dados extraidos
       |- FileContextJuridico.tsx        <- Assistido + processo + demandas
       |- FileAIInsights.tsx             <- Jurisprudencia RAG + analise (placeholder)
       |- FileLinkActions.tsx            <- Vincular/desvincular
```

### Estado (React Context ou Zustand)
- selectedFolderId: pasta ativa na sidebar
- breadcrumbPath: array de {id, name}
- viewMode: 'grid' | 'list'
- selectedFileIds: Set para multi-select
- detailPanelFileId: arquivo aberto (null = fechado)
- searchQuery: busca local
- filters: {type, date, enrichmentStatus}
- favorites: localStorage
- recentFiles: localStorage

### Padrao Visual Defender
- Background: zinc-950 / zinc-900
- Cards: zinc-800/50 com border-zinc-700/50
- Hover: emerald-500/10 com border-emerald-500/30
- Text: zinc-100 primario, zinc-400 secundario
- Icones: Lucide (sem emojis)
- Transicoes: 150-300ms
- Font mono: numeros de processo, checksums
- Cores por atribuicao: emerald (Juri), rose (VVD), amber (EP), sky (Subst)

### Endpoints tRPC utilizados (ja existem)
- drive.files, drive.syncFolder, drive.syncAll
- drive.healthStatus, drive.stats, drive.statsDetailed
- drive.linkFileToEntity, drive.getAssistidoByFolderName
- drive.getDriveStatusForAssistido/Processo
- drive.searchProcessosForLink, drive.searchAssistidosForLink
- drive.uploadFile, drive.uploadFileSafe
- drive.renameFile, drive.deleteFile
- drive.retryEnrichment, drive.syncFolders

### YAGNI — Nao fazemos
- Edicao inline de documentos (Google Docs faz isso)
- Versionamento de arquivos (Drive ja tem)
- Compartilhamento/permissoes
- Preview de video

---

## Proximos Passos

1. Implementar UI (este design)
2. Garantir funcionalidade das 4 atribuicoes + 2 especiais
3. Integrar backend Agno + LangChain no enrichment-engine (projeto subsequente)
