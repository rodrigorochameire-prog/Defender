# Estado do Projeto - OMBUDS

## Ultima Atualizacao
Data: 2026-02-26 21:00
Sessao: Spec-driven retrospectivo — documentacao de features existentes

## Completo (Sessoes Recentes)

### Spec-Driven Retrospectivo
- [x] `.specs/features/pje-parser/spec.md` — Parser completo documentado
- [x] `.specs/features/prazos/spec.md` — Calculo de prazos documentado
- [x] `.specs/features/demandas/spec.md` — Sistema de demandas documentado
- [x] `.specs/features/drive/spec.md` — Google Drive sync documentado
- [x] `.specs/features/juri/spec.md` — Tribunal do Juri documentado
- [x] `.specs/features/auth/spec.md` — Auth e usuarios documentado
- [x] `.specs/codebase/ARCHITECTURE.md` — Arquitetura geral do sistema

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

## Inventario do Sistema
| Modulo | Router (linhas) | Componentes (linhas) | Status |
|--------|----------------|---------------------|--------|
| Demandas | 852 | 14.746 (31 arquivos) | Completo, spec escrito |
| Drive | 2.207 | 9.321 (28 arquivos) | Completo, spec escrito |
| Juri | 270 + 1.391 (casos) | 8.362 (10 paginas) | Completo, spec escrito |
| Prazos | 643 | 908 (3 comps) + 492 (pagina) | Completo, spec escrito |
| PJe Parser | - (lib) | 1.527 + 894 (modal) | Completo, spec escrito |
| Auth/Users | 839 + 33 | ~850 (paginas auth) | Completo, spec escrito |
| WhatsApp | 1.883 (2 routers) | - | Funcional, sem spec |
| Solar | 1.060 | - | Funcional, sem spec |
| Assistidos | 1.000 | - | Funcional, sem spec |
| Jurisprudencia | 776 | - | Funcional, sem spec |
| Distribuicao | 745 | - | Funcional, sem spec |
| Palacio | 672 | - | Funcional, sem spec |

**Total routers**: 30 routers, 24.523 linhas

## Decisoes Recentes
| Data | Decisao | Contexto |
|------|---------|----------|
| 2026-02-26 | Spec-driven retrospectivo | Documentar o que existe antes de criar novo |
| 2026-02-26 | Adotar spec-driven | Workflow padrao de desenvolvimento |
| 2026-02-26 | userInvitations com crypto.randomBytes | Token seguro 64 hex, expira 7 dias |
| 2026-02-26 | Settings como JSONB | Flexivel para futuras configs |
| 2026-02-26 | defensorNome via JOIN | Substituir hardcoded por alias users |

## Commits na Main (ultimos)
```
b221433 docs(specs): adotar spec-driven development
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

## Proximos Passos (Roadmap)
1. PJe Parser v2 — melhorias no parser para novos formatos
2. Mobile/Responsivo — compact views para uso em audiencias
3. Templates de Pecas — geracao de pecas processuais com dados do caso

## Preferencias do Usuario
- Commits granulares com mensagens em portugues
- Documentacao em portugues
- Prefere resolver quick wins antes de features complexas
- Usa /commit para padronizar commits
- Usa /merge-main-push para deploy
- Adotou /spec-driven como workflow padrao
- Quer documentar o existente antes de criar features novas
