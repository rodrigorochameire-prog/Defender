# Estado do Projeto - OMBUDS

## Ultima Atualizacao
Data: 2026-02-26 17:00
Sessao: Pos-plano "Resolver TODOs Criticos"

## Completo (Sessoes Recentes)

### Pipeline PDF (Enrichment)
- Extracao de texto via pdfjs-dist
- Classificacao de secoes via Gemini
- Bookmarks via pdf-lib
- Viewer com indice de secoes

### Drive UI
- Subpastas com navegacao
- Backfill de parentFileId (2401 arquivos)
- Logo fingerprint OMBUDS

### TODOs Criticos (7/7 completos)
- [x] T-01: Agenda - calendar events update/delete
- [x] T-02: Audiencias + Varas - criar demanda
- [x] T-03: Avaliacao Juri - salvar via tRPC
- [x] T-04: Settings - sistema de configuracoes
- [x] T-05: User Invitations - convites com token seguro
- [x] T-06: Teses - router CRUD
- [x] T-07: Processos - defensorNome dinamico

## Decisoes Recentes
| Data | Decisao | Contexto |
|------|---------|----------|
| 2026-02-26 | Adotar spec-driven | Workflow padrao de desenvolvimento |
| 2026-02-26 | userInvitations com crypto.randomBytes | Token seguro 64 hex, expira 7 dias |
| 2026-02-26 | Settings como JSONB | Flexivel para futuras configs |
| 2026-02-26 | defensorNome via JOIN | Substituir hardcoded por alias users |

## Commits na Main (ultimos)
```
a6cbd9d feat(teses): router CRUD + processos defensorNome dinamico
faab44a feat(invitations): sistema de convites para novos defensores
9f19ea1 feat(settings): criar sistema de configuracoes persistentes
5f7ca7d fix(ui): conectar formularios a mutations tRPC existentes
467d3d6 fix(drive): navegacao de subpastas
ec7c18a style(brand): substituir logo por fingerprint OMBUDS
e41a157 feat(pdf): pipeline de enriquecimento PDF
```

## Blockers
Nenhum blocker ativo.

## Preferencias do Usuario
- Commits granulares com mensagens em portugues
- Documentacao em portugues
- Prefere resolver quick wins antes de features complexas
- Usa /commit para padronizar commits
- Usa /merge-main-push para deploy
- Adotou /spec-driven como workflow padrao
