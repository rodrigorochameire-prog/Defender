# Spec-Driven Tasks — Redesign Sheet AIJ

Ref: [tdd.md](./tdd.md). Cada task é granular, testável, e marca `[ ]→[x]`. TDD: tasks com `(TDD)` começam por teste.

**Decisão resolvida**: `drive.sectionsByProcesso` retorna `textoExtraido` + `paginaInicio/Fim` + `fileWebViewLink` + `tipo` (`src/lib/trpc/routers/drive.ts:2073`). Logo F2 (denúncia verbatim + laudos) está desbloqueada.

---

## F1 — Reorganização + header/pills (sem decisões abertas)

Ordem-alvo da espinha (instrução):
`resumo → imputacao → fatos(denúncia) → depoentes → depoimentos → laudos → documentos`
Preparação (logo após documentos): `dossie (Roteiro) → teses`.
Grupo **Contexto** (colapsado, ao final): `contradicoes, versao, relato-vitima, sintese, investigacao, pendencias, medidas, ata, anotacoes-rapidas, analise-ia, midia`.

- [ ] **T1.1 (TDD)** Em `secoes-manifest.test.ts`: assert nova `SECOES_INSTRUCAO` começa exatamente por `["resumo","imputacao","fatos","depoentes","depoimentos","laudos","documentos","dossie","teses"]` e que todo SecaoId restante está presente (nenhuma seção sumiu).
- [ ] **T1.2** Adicionar `"depoimentos"` e `"resumo"` à `SECOES_INSTRUCAO`; reordenar conforme T1.1; manter os demais ao final na ordem do grupo Contexto.
- [ ] **T1.3 (TDD)** Em `secoes-manifest.ts`: exportar `GRUPO_CONTEXTO_INSTRUCAO: SecaoId[]` (as 11 seções de contexto) + teste de que são disjuntas da espinha.
- [ ] **T1.4** Em `event-detail-sheet.tsx`: renderizar as seções do grupo Contexto dentro de **um único** `<CollapsibleSection title="Contexto" defaultOpen={false}>`, preservando `data-section-id` para o ToC. Espinha permanece como seções de topo.
- [ ] **T1.5** Header: consolidar status — exibir **um** pill (status OU resultado, prioridade ao resultado quando concluída); rebaixar assunto (Violência Doméstica) e órgão a chips secundários discretos. Sem mudança de dados, só apresentação.
- [ ] **T1.6** ToC/pills: refletir a espinha de 7 + “Preparação” + “Contexto” (grupo único). Verificar IntersectionObserver com a seção-grupo.
- [ ] **T1.7** Verificação: `npm run test` (manifesto) + `tsc --noEmit` + `eslint`. Browser-test do sheet AIJ.

---

## F2 — Denúncia verbatim + Laudos linkados

- [ ] **T2.1 (TDD)** util `secaoPorTipo(sections, tipos[])` que filtra `sectionsByProcesso` por `tipo` (denúncia/laudo) e retorna `{textoExtraido, paginaInicio, fileWebViewLink}`. Teste com fixtures.
- [ ] **T2.2** `secoes/DenunciaSecao.tsx`: blockquote citável com `textoExtraido` (verbatim) + botão “ver na exordial” (deep-link `fileWebViewLink#page=paginaInicio`). Fallback para `narrativa_denuncia` (resumo) se não houver seção classificada.
- [ ] **T2.3** Renomear seção `fatos`→ rótulo “Denúncia”; manter id ou introduzir `"denuncia"` (atualizar manifesto + ToC + teste T1.1).
- [ ] **T2.4** `secoes/LaudosSecao.tsx`: cards por laudo (conteúdo de `ad.laudos` + `textoExtraido` da seção) + link “ver laudo” (deep-link). Manter subseção lacunas.
- [ ] **T2.5** Verificação idem T1.7.

---

## F3 — Depoentes (situação + intimação + certidão)

- [ ] **T3.1** ALTER `testemunhas`: `certidao_comunicacao text` (idempotente + schema).
- [ ] **T3.2 (TDD)** estender `derivarStatusOitiva` p/ expor `intimado:boolean|null` + `certidao:string|null`.
- [ ] **T3.3** `secoes/DepoentesSecao.tsx` (evolui `PainelDepoentesStatus`): por depoente — tipo, situação (ouvido juízo/IP/não), intimação, e teor da certidão (expandível).
- [ ] **T3.4** Skill de sistematização: emitir `certidao_comunicacao` por depoente (documentar; população via daemon).
- [ ] **T3.5** Verificação.

---

## F4 — Depoimentos power (a fase mais pesada)

- [ ] **T4.1** ALTER `testemunhas`: `depoimento_audio_drive_file_id`, `depoimento_audio_url`, `depoimento_transcricao`, `depoimento_segments jsonb`, `depoimento_transcricao_status`.
- [ ] **T4.2** Rota `POST /api/depoentes/[id]/audio` (clone de `/api/audiencias/[id]/audio`): upload Drive + enqueue `claude_code_tasks` skill `transcrever-depoimento`.
- [ ] **T4.3** Skill `transcrever-depoimento` (clone de `transcrever-audiencia`, **whisper com segmentos** → `depoimento_segments`); allowlist `.gitignore`.
- [ ] **T4.4** `gravar-depoimento.tsx` (clone de `gravar-audiencia.tsx`, reusa `gravacao-audio.ts`).
- [ ] **T4.5 (TDD)** `transcript-player.tsx`: util `seekParaSegmento(segments, t)` + UI de transcrição segmentada; clique no segmento → `audio.currentTime=start`. Teste do util.
- [ ] **T4.6** `depoente-card-v2.tsx`: roteamento ao clicar — depoimento IP → termo (seção classificada/PDF); depoimento juízo → mídia/TranscriptPlayer; botão gravar (depoentes não ouvidos).
- [ ] **T4.7** `audiencias.getDepoenteMidia` query (polling de status).
- [ ] **T4.8** Verificação + browser-test do sync.

---

## F5 — Registro integrado no rodapé

- [ ] **T5.1** Levantar `RegistroAudienciaModal` + mutations `registros.*` reusáveis.
- [ ] **T5.2** Integrar registro no `sheet-action-footer.tsx` (refinado, como Demandas): criar/editar registro vinculado (audiência↔processo↔assistido), anotação de audiência.
- [ ] **T5.3** Refino da anotação rápida (parser de evento mantém).
- [ ] **T5.4** Verificação + browser-test.

---

## Execução por subagents
- 1 subagent por fase, **worktree isolado** (`isolation: worktree`) p/ sobreviver ao churn de branch da sessão.
- Cada subagent: TDD-first nas tasks `(TDD)`, depois implementação, depois `tsc+eslint+test`, e relata diff + resultado.
- Verificação adversarial após cada fase antes de PR.
- Ordem: F1 → (F2 ∥ F3) → F4 → F5.
