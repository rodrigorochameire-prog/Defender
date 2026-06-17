---
name: revisar-minutas
description: "Revisa minutas (peças) feitas por estagiária/analista que estão em '1 - Protocolar/1 - Revisões'. Use SEMPRE que o usuário pedir 'revisar as minutas', 'revisar minuta da estagiária', 'revisão de minuta', ou /revisar-minuta. Reconstrói o contexto do caso (dossiê), revisa a minuta contra um rubric de qualidade equilibrando aproveitamento × padrão, entrega avaliação em duas camadas (Defensor + estagiária) e finaliza a peça para Protocolar gravando as considerações no kanban OMBUDS."
---

# Revisão de Minutas da Estagiária/Analista

## Quando acionar
"revisar as minutas", "revisar minuta da estagiária", "revisão de minuta",
"revisa a peça", "minuta do estagiário", `/revisar-minuta`, `/revisao`.
As minutas vivem em `1 - Protocolar/1 - Revisões`.
Esta é a engine única de revisão: `/revisao` e `/revisar-minuta` apontam para cá.

## Fase 0 — Intake (dois modos de entrada)
- **Lote (inbox):** sem caso indicado, varrer `1 - Revisões` por `.docx`;
  ignorar `~$*` e `Icon`. Processar uma minuta por vez, em ordem.
- **Avulso:** com assistido/processo indicado (ou detectável do contexto),
  revisar só aquela peça — buscar a minuta na pasta do assistido / `Protocolar/`.

De cada minuta, extrair (lendo o texto do docx): endereçamento, assistido, CNJ,
tipo de ato, atribuição (VVD/Júri/EP/Criminal).

## Fase 1 — Reconstrução de contexto (dossiê)
1. Localizar a pasta do assistido na raiz `Processos - {VVD (Criminal)|Júri|
   Execução Penal|...}` correspondente (ver CLAUDE.md §Estrutura).
2. Conferir a data do PDF dos autos: se NÃO for da última semana (≤7 dias),
   fazer scraping do PJe. **Método validado (autos sigilosos VVD):** CDP no
   Chromium logado (porta 9222) → rota **Peticionar → captura do `ca` →
   `listProcessoCompletoAdvogado.seam?id=&ca=`** (vence o sigilo). Scripts:
   `preparar-audiencias/scripts/pje-cdp/preparar_download.py --fase A` +
   `fase_d_area.py`. NÃO usar "Liberar visualização" (di­álogo nativo trava o
   CDP). Ref: skill `preparar-audiencias` §fluxo_cdp_v2. Baixar também processos
   associados/conexos (buscar CNJs no próprio PDF + no OMBUDS).
3. Ler tudo na pasta: documentos, atendimentos, relatórios de análise prévios.
4. **Mídia de audiência/atendimento sem transcrição → BAIXAR e TRANSCREVER**
   (`baixar_midias_lifesize.py --scan <autos.pdf>` + `transcrever_midias.py`).
   Isto é OBRIGATÓRIO e bloqueia a finalização: nos 3 casos do 1º run a peça
   virou (ou caiu) no áudio — o resumo da sentença e as alegações do MP
   frequentemente **distorcem** o que a vítima/PMs disseram. Conferir os
   timestamps de ouvido antes de citar (transcrição whisper é ruidosa).
5. **Verificar TODO precedente citado na minuta** na base oficial do STJ/TJBA
   (skill `citacoes-seguras` + WebSearch). Armadilha recorrente: jurisprudência
   de IA com número inexistente OU holding invertido (ex.: caso Selton, AREsp
   "2.967.413/RS" fabricado; STJ real diz o oposto sobre prints da vítima).
6. Montar o dossiê reusando a forma de `analise-{vvd|juri|ep|criminal}`. Este
   dossiê é a VERDADE-BASE da Fase 2.

## Fase 2 — Revisão contra o padrão
Carregar o "padrão na cabeça": `peca-{atribuição}` + `estilo-pecas` +
`linguagem-defensiva` + `coerencia-defensiva` + `citacoes-seguras` +
`citacao-depoimentos`. Aplicar `references/rubric.md` dimensão a dimensão,
classificando Manter/Ajustar/Substituir. Conferir CADA fato da minuta contra o
dossiê (grep nos autos). Produzir um RASCUNHO REVISADO no lugar (não reescrever o
que está Manter; ajustar/substituir o resto), preservando a voz da estagiária
onde o veredito é Manter.

## Fase 3 — Apresentar → confirmar → finalizar
1. Apresentar no chat: avaliação **Layer 1** (`references/saida-layers.md`) + o
   rascunho revisado para leitura.
2. **NADA é finalizado até o OK.** Rodrigo pode pedir tweaks.
3. Após o OK:
   a. Gerar pdf (skill `docx-to-pdf`).
   b. Renomear à convenção v2 + `(Revisado)`:
      `[Unidade] Tipo - Fundamento sucinto - Nome do Assistido (Revisado).ext`
      (Title Case, sem acentos).
   c. Mover docx+pdf para `1 - Protocolar/` (skill `protocolar`).
   d. Arquivar o ORIGINAL da estagiária em
      `1 - Revisões/_Originais revisados/` (criar a pasta se faltar).
   e. Gravar no kanban (ver `## Kanban write` abaixo).

## Kanban write (contrato com OMBUDS — harmonizado no 1º run)
Acesso: via `postgres` driver + `DATABASE_URL` do `.env.local` (prepare:false,
ssl require). NÃO o Supabase MCP (exige OAuth). `users` não tem coluna `nome`.
1. Gerar o texto **Layer 2** (`references/saida-layers.md`).
2. Achar a demanda do ato: `demandas` com `substatus='revisar'` + assistido (essa
   é a etapa REAL de revisão; o ciclo `delegacoes_historico.status`
   aguardando_revisao/revisado é schema morto — só existem `pendente`/`cancelada`
   na base). Achar a delegação da Emilly (estagiária, normalmente `delegado_para_id`
   da estagiária; users 14=Emilly) ligada a essa demanda. **Mostrar o match para
   Rodrigo confirmar** antes de gravar.
3. Em transação: `UPDATE delegacoes_historico SET status='aguardando_revisao',
   observacoes={Layer 2} WHERE id={delegação da estagiária}` + `UPDATE demandas
   SET status_delegacao='delegado', delegacao_work_status='aguardando_revisao',
   delegado_para_id={estagiária} WHERE id={demanda}`. Manter `substatus='revisar'`.
   Assim o card mostra "{Estagiária} · aguardando revisão" na seção Revisar, e a
   orientação aponta para o mesmo lugar. Rodrigo avança o status manualmente.
4. Se nenhuma demanda casar, avisar e seguir (kanban manual).

## Reuso de skills (não reimplementar)
analise-* (dossiê) · peca-* + estilo-pecas + linguagem/coerencia (padrão) ·
transcrever-atendimento · docx-to-pdf · protocolar · scraping PJe (memórias).
