# Feature: Drive (Google Drive Sync)

## Contexto
Integracao com Google Drive para sincronizacao de documentos. Cada assistido/processo tem uma pasta no Drive. Suporta upload, auto-vinculacao, extracao inteligente (Gemini), visualizacao de PDFs e webhooks.

## Arquitetura

### Arquivos
| Arquivo | Linhas | Responsabilidade |
|---------|--------|------------------|
| `src/lib/trpc/routers/drive.ts` | 2.207 | 52 procedures tRPC |
| `src/lib/services/google-drive.ts` | 3.737 | Servico Google Drive (OAuth, sync, linking) |
| `src/components/drive/` | 9.321 | 28 componentes UI |
| `src/app/api/drive/upload/route.ts` | ~50 | Endpoint de upload |
| `src/app/api/webhooks/drive/route.ts` | ~50 | Webhook handler |

### Schema (5 tabelas)
- **driveFiles** — Arquivos sincronizados com metadados
- **driveSyncFolders** — Pastas configuradas para sync
- **driveDocumentSections** — Secoes extraidas de documentos
- **driveSyncLogs** — Logs de sincronizacao
- **driveWebhooks** — Configuracao de webhooks

### Componentes Principais
| Componente | Linhas | Funcao |
|------------|--------|--------|
| DriveDetailPanel.tsx | 1.463 | Painel de detalhes |
| PdfViewerModal.tsx | 786 | Visualizador PDF |
| DriveSidebar.tsx | 691 | Sidebar de navegacao |
| SmartExtractModal.tsx | 563 | Extracao inteligente (Gemini) |
| FileUploadWithLink.tsx | 532 | Upload com vinculacao |
| FilesByProcesso.tsx | 468 | Organizacao por processo |
| DriveOverviewDashboard.tsx | 413 | Dashboard de overview |
| DriveCommandPalette.tsx | 343 | Paleta de comandos |
| DriveFileList.tsx | 342 | Lista de arquivos |
| DriveFilters.tsx | 267 | Filtros avancados |
| DriveContext.tsx | 167 | State management (Context API) |

## Funcionalidades
- OAuth com Google Drive API
- Sync hierarquico de pastas (por atribuicao)
- Auto-vinculacao arquivo → processo/assistido
- Extracao inteligente via Gemini (classificacao, secoes)
- Visualizacao PDF com bookmarks/indice
- Upload com vinculacao automatica
- Webhooks para notificacao de mudancas
- Health check de sincronizacao
- Navegacao de subpastas

## Melhorias Futuras
- [ ] Sync bidirecional (upload para Drive)
- [ ] Notificacao de novos documentos
- [ ] Busca full-text em documentos sincronizados
