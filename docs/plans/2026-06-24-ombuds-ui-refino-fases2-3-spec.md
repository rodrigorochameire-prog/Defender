# OMBUDS — Refino UI/UX Fases 2 e 3 (Navegação + Camada de Apresentação)

> Spec-driven + TDD. Cada fase = uma worktree lane = um PR. CI é o gate.
> Origem: varredura completa (Claude for Chrome) + ground-truth no código (2026-06-24).
> Continuação de `docs/plans/2026-06-24-ombuds-ui-refino-fase1-spec.md` (F0–F7, F0–F4 já em produção).
> Doutrina transversal: `docs/plans/2026-06-24-ombuds-redesign-doutrina.md`.

## Princípio orientador (igual ao da Fase 1)

A varredura externa diagnostica **sintomas** bem, mas erra a **causa** — repetidamente conclui que falta um sistema quando o sistema já existe e só não é importado/aplicado. Esta spec foi **filtrada contra o código** antes de redigida: tickets cuja causa raiz já foi resolvida na Fase 1 foram **removidos** ou rebaixados a enforcement. O que resta é o trabalho genuinamente novo.

### Reconciliação com a Fase 1 (o que a varredura pediu e JÁ está feito)

| Pedido da varredura (rascunho) | Status real no código | Ação |
|---|---|---|
| F3-06 bug do nome no card mobile | **FEITO** — `DemandaCard.tsx:308` já tem `flex-1 min-w-0` (Fase 1 F3, commit 2df8d7cb) | **Removido** |
| F3-02 dicionário de enums (`7_SEM_ATUACAO`) | **FEITO** — aba demandas usa `getStatusConfig` (`assistidos/[id]/demandas/page.tsx:9,41`); dicionário em `src/config/demanda-status.ts` (Fase 1 F4) | **Removido**; reforço vira guard (Fase 1 F7) |
| F3-04 acentuação — breadcrumb "cosmovisao" cru | **FALSO** — breadcrumbs já humanizam via `ROUTE_LABELS` (`layout/breadcrumbs.tsx`). Resta só corpo de texto da Cosmovisão | Reduzido a F3-c (strings de corpo) |
| Acentos de área ("Juri"→"Júri") centralizados | **FEITO** — `atribuicoes.ts` já tem labels acentuados ("Execução Penal", "Violência Doméstica") | **Removido** |
| F1-01 tokens de cor de atribuição (Drive confirma) | **FEITO/EM CURSO** — registry `atribuicoes.ts` + consolidação Fase 1 F1 | **Removido** |
| Header variante B (perfil compartilha métrica) | **EM CURSO** — Fase 1 F6 já trata o header de entidade | Fase 2 só estende às superfícies restantes |

**Resultado:** das 8+8 ideias do rascunho, restam **6 lanes genuinamente novas**. Listadas abaixo.

## Convenções de execução (idênticas à Fase 1)

- Uma worktree por lane ([[worktree-isolation]]); nunca `git add -A` ([[git-add-pathspec]]).
- TDD: teste vermelho → implementação → verde → refactor.
- Um PR por fase; CI verde é condição de merge.
- Runner do repo (`__tests__`/`src/**/*.test.tsx`, happy-dom). Subagente confirma o comando exato antes de escrever.
- Cores/rótulos de atribuição SEMPRE via `src/lib/config/atribuicoes.ts` + `src/lib/config/tipologia/` ([[tipologia-central]]). Nunca literais inline.

---

# FASE 2 — Navegação

## F2-A — Modo Operacional do Cockpit do Júri (NOVO, alta prioridade)

**Problema (verificado).** `src/app/(dashboard)/admin/juri/cockpit/page.tsx` é uma ferramenta de uso **ao vivo** no plenário — `TimerSustentacao` (cronômetro), fases (`instrucao`/`interrogatorio`/`sustentacao_mp`/`sustentacao_defesa`/`replica`/`treplica`/`votacao`), `EncerrarSessaoButton`, auto-save por campo. Hoje renderiza **dentro do layout global** (sidebar + header de módulo). Num julgamento — defensor de pé, sob pressão, iluminação variável — esse chrome é distração e desperdício de espaço; é uma classe de interface (operação em tempo real) diferente de todo o resto do app (gestão).

**Mudança.** Tratar o cockpit como **modo**, não como página:
- Ao entrar numa sessão ativa, recolher a sidebar global e reduzir o header ao essencial (nome da sessão + cronômetro + "Encerrar Sessão").
- Alvos de toque ampliados (≥ 44px) nos controles do cronômetro e na navegação de fases.
- Contraste reforçado; avaliar tema escuro forçado no modo (sala de júri).
- Botão explícito de entrar/sair do modo, com **confirmação** ao sair de sessão ativa (não confundir com "Encerrar Sessão").
- Manter o indicador "Auto-salvo" sempre visível.

**Implementação (provável).** Mover a rota do cockpit para um segmento/layout próprio fora de `(dashboard)` ou aplicar um flag de layout que suprime `<Sidebar/>` e o header de módulo quando `cockpit && sessãoAtiva`. Confirmar no código qual mecanismo de layout o `(dashboard)` usa antes de decidir.

**Testes.**
- `cockpit-modo.test.tsx`: com sessão ativa, a sidebar global e o header de módulo não são renderizados; controles de cronômetro/fase têm classe de alvo ≥ 44px; existe caminho de saída distinto de "Encerrar Sessão".

**Aceite.** Cockpit em sessão ativa ocupa tela cheia sem chrome de navegação; toque ≥ 44px nos controles ao vivo; sair do modo ≠ encerrar sessão; auto-save visível; CI verde.

## F2-B — Estender o header de entidade às superfícies restantes (delta da Fase 1 F6)

**Problema (verificado).** A Fase 1 F6 define duas variantes oficiais (A = lista/módulo via `CollapsiblePageHeader`; B = entidade, perfil serifado). A varredura achou um quarto padrão fora da norma: VVD (Inter 20px), Drive, WhatsApp, Recursos, Cosmovisão usam títulos próprios.

**Mudança.** Migrar os títulos de VVD, Drive, WhatsApp, Recursos e Cosmovisão para a variante A do sistema de header (Source Serif 4, 18px, weight 600 — a mesma matriz métrica de Demandas). **Não** introduzir novo componente — herdar `CollapsiblePageHeader`/variante já definida na Fase 1 F6.

**Depende de:** Fase 1 F6 mergeado.

**Testes.**
- `header-cobertura.test.ts` (grep arquitetural): nenhum título de página em Inter 12/20px ou Serif 17px nos módulos VVD/Drive/WhatsApp/Recursos/Cosmovisão; todos resolvem para o componente de header canônico.

**Aceite.** Todos os módulos compartilham a métrica/tipografia do header de Demandas; grep retorna zero stragglers; CI verde.

---

# FASE 3 — Camada de Apresentação e Fechamentos Estruturais

## F3-A — Camada única de formatters de apresentação (NOVO, crítico)

**Problema (verificado).** Não existe camada central. `formatPhone` está duplicado inline em `whatsapp/ConversationList.tsx:235` e `admin/whatsapp/page.tsx:635`; **não há** `formatCNJ`/`formatProcesso` (número renderizado cru) nem `formatNomeArquivo`. Resultado onipresente: telefone "557135086246", arquivos "0000010-29.2002.8.05.0044-1762785454112-1329818-processo.pdf", pastas "Distribuicao".

**Mudança.** Criar `src/lib/format/apresentacao.ts` (camada de **renderização**, nunca toca o dado armazenado):
- `formatTelefone(raw)` → "(71) 9358-2869"; **substituir** as duas cópias inline do WhatsApp por esta.
- `formatProcesso(numero)` → máscara CNJ legível; metadados técnicos (`-1762785454112-1329818-`) vão para `title`/tooltip, não para o texto visível.
- `formatNomeArquivo(raw)` → nome amigável + extensão; técnico no detalhe/tooltip.
- `formatArea(key)` → delega a `atribuicoes.ts` (já acentuado); não reinventar.
- Capitalização natural de vara a partir de caixa-alta (`formatVara`).

Consumidores na 1ª onda: WhatsApp (telefone), Drive (nomes de arquivo/pasta), Timeline (nomes de arquivo). CNJ onde for renderizado cru.

**Testes (vermelho primeiro).**
- `apresentacao.test.ts`: tabela — telefone BR com/sem DDI/DDD; CNJ com sufixo técnico → máscara + sufixo só no tooltip; nome de arquivo longo → amigável; idempotência (formatar já-formatado não corrompe).
- Regressão grep: nenhuma definição inline de `formatPhone` fora de `src/lib/format/`.

**Aceite.** Nenhuma tela de leitura rápida exibe telefone sem máscara, CNJ com sufixo técnico, ou nome de arquivo cru; bruto acessível em tooltip/detalhe; uma única fonte de formatação; CI verde.

## F3-B — Sheet de Processo (eliminar a página standalone como padrão) (NOVO, alta)

**Problema (verificado).** Processo é a única entidade **sem sheet**. Existe só a página `src/app/(dashboard)/admin/processos/[id]/page.tsx` (que ainda redireciona para a rota aninhada `.../caso/{casoId}/processo/{id}`). Clicar num processo faz full-page navigation e quebra o contexto do assistido. Nenhum `ProcessoSheet`/drawer existe.

**Mudança.** Criar `ProcessoSheet` herdando o template-mestre das sheets existentes (Assistido/Júri/Demanda):
- Cabeçalho: número via `formatProcesso` (F3-A) + assistido + área via `atribuicoes.ts`.
- Faixa: fase atual + próxima audiência + urgência via `<PrazoBadge>` (Fase 1 F2).
- Abas: Registros / Documentos / Partes / Vinculados.
- Rodapé fixo: "Vincular a caso", "Abrir no PJe".
- Clique no processo (em qualquer lista, incl. aba Casos) abre a sheet; a página standalone permanece só como deep-link por URL.

**Depende de:** F3-A (formatProcesso) e o gesto de abertura de sheet já padronizado.

**Testes.**
- `processo-sheet.test.tsx`: a sheet renderiza número formatado, fase, próxima audiência, `PrazoBadge` e CTA "Vincular a caso"; abrir a partir da aba Casos não desmonta o contexto do assistido.

**Aceite.** Clicar num processo abre sheet sem sair do contexto; sheet mostra fase/próxima audiência/prazo; CTA presente; página standalone só via URL direta; CI verde.

## F3-C — Higiene de strings de corpo + glossário (NOVO, reduzido)

**Problema (verificado, escopo estreito).** Breadcrumbs **já** humanizam (claim externa do slug cru é falsa). O resíduo real: strings de **corpo** da Cosmovisão sem acento ("sessoes", "estatisticas", "padroes", "automaticos") enquanto o título está correto. Além disso, a mesma métrica de completude aparece como "FICHA %" e "Cadastro %" — um conceito, dois rótulos.

**Mudança.**
- Acentuar as strings de corpo da Cosmovisão (revisão pontual, não sistêmica).
- **Decidido:** termo canônico é **"Ficha"** (substituir "Cadastro %" por "Ficha %" no chip de Atenção Imediata; "FICHA %" da seção Geral vira "Ficha %", sem caixa-alta).

**Testes.**
- `vocab-cosmovisao.test.ts` (grep): nenhuma das strings-alvo sem acento em `src/app/**/cosmovisao/**`.
- Render: o chip de Atenção Imediata e a seção Geral usam o mesmo rótulo de completude.

**Aceite.** Cosmovisão acentuada no corpo; um único rótulo para completude; CI verde.

## F3-D — Contraste AA do texto terciário (NOVO, medição primeiro)

**Problema (a medir).** `--muted-foreground` é `0 0% 45%` (light) e `0 0% 64%` (dark) — `globals.css:35,124`. O dark a 64% sobre `--background` precisa ser medido contra WCAG AA; a Fase 1 F0 já deixou o light em aberto.

**Mudança.** Medir ambos os temas. Se reprovar AA (4.5:1 texto normal / 3:1 ≥18px), escurecer/clarear o token o mínimo para passar, mantendo a discrição. **Se já passar, fechar a lane sem mudança** e registrar a medição (evita "refino" cosmético).

**Testes.** `contraste-muted.test.ts`: razão de contraste de `--muted-foreground` sobre `--background` ≥ 4.5:1 em light e dark.

**Aceite.** Texto terciário ≥ AA em ambos os temas (ou evidência de que já passava); CI verde.

## F3-E — Consolidar EmptyState e extrair DistribuicaoBar (NOVO, baixa-média)

**Problema (verificado).** **Dois** EmptyState reutilizáveis coexistem — `src/components/ds/empty-state.tsx` e `src/components/shared/empty-state.tsx` (este com variantes default/search/error). Duplicação, não ausência. E a barra de paridade do Júri é **inline** com cores hardcoded (`PautaTab.tsx:184-239`, emerald/violet), não reutilizável.

**Mudança.**
- Eleger **um** EmptyState canônico (provavelmente `ds/empty-state.tsx`), migrar consumidores do outro e remover o duplicado. Garantir as 3 variantes (inicial+CTA / filtro vazio / erro).
- Extrair `<DistribuicaoBar>` de `PautaTab` — divisão proporcional com cor **por pessoa** (consumindo o registry de pessoas/cores, não hardcode emerald/violet). Reutilizável para carga por defensor, status de processos.

**Testes.**
- `empty-state-unico.test.ts` (grep): só um módulo `empty-state` é importado em `src/`.
- `distribuicao-bar.test.tsx`: renderiza proporção correta para entradas assimétricas; cor vem de prop/registry, não de literal.

**Aceite.** Um único EmptyState no codebase; `DistribuicaoBar` reutilizável e documentado; paridade do Júri migrada sem regressão; CI verde.

---

## Grafo de dependências / paralelização

| Lane | Depende de | Risco | ROI | Paralelizável |
|------|-----------|-------|-----|---------------|
| F2-A Cockpit modo | layout do `(dashboard)` | médio-alto | alto (UX ao vivo) | sim |
| F2-B header restantes | Fase 1 F6 | baixo | médio | sim |
| F3-A formatters | — | médio | alto (transversal) | sim |
| F3-B sheet Processo | F3-A | médio-alto | alto (fechamento) | depois de F3-A |
| F3-C vocab corpo | — | baixo | baixo-médio | sim |
| F3-D contraste | — | baixo | baixo (talvez no-op) | sim |
| F3-E EmptyState + DistribuicaoBar | — | baixo | médio | sim |

**Onda 1 (fundação + higiene barata):** F3-A (formatters), F3-C, F3-D, F2-B.
**Onda 2 (fechamentos estruturais):** F3-B (sheet Processo, após F3-A), F2-A (Cockpit modo).
**Onda 3 (consolidação):** F3-E.

Cada lane: worktree isolado → branch `feat/refino-f{2|3}-...` → testes vermelhos → implementação → verde → diff revisado → PR. CI é o gate.
