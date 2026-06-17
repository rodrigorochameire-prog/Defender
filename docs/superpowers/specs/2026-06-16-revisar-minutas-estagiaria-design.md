# Revisão de minutas da estagiária — design

**Data:** 2026-06-16
**Autor:** Rodrigo (Defensor) + Claude Code
**Status:** aprovado (brainstorming) — aguardando spec review

## Problema

Estagiária/analista produzem minutas (peças) que ficam em
`Meu Drive/1 - Defensoria 9ª DP/1 - Protocolar/1 - Revisões`. Hoje a revisão é
manual e sem método: não há um padrão explícito do que conferir, o aproveitamento
do trabalho da estagiária é informal, e não existe um retorno estruturado que a
estagiária possa acompanhar para aprender. O objetivo é ativar e aprimorar um
**fluxo de revisão de minuta** que (a) reconstrói o contexto do caso, (b) revisa a
minuta contra um padrão de qualidade equilibrando aproveitamento × padrão, (c)
entrega uma avaliação em duas camadas (para o Defensor e para a estagiária) e (d)
finaliza a peça para Protocolar, com o retorno aparecendo no kanban para a
estagiária.

## Não-objetivos (YAGNI)

- Não automatiza a mudança de status no kanban (Rodrigo avança manualmente).
- Não reescreve do zero por padrão: a revisão **parte da minuta da estagiária**.
- Não cria um editor de diff visual na primeira versão.
- Não substitui o `/peca-*` (autoria) — revisão é postura diferente de autoria.

## Decomposição

Dois sub-projetos com **um contrato de dados** (as considerações gravadas na
linha de delegação). Sequência: **sub-projeto 1 primeiro** (entrega imediata nas
3 minutas já em fila), depois sub-projeto 2.

1. **Engine de revisão** — skill Claude Code (`/revisar-minuta` + skill
   `revisar-minutas` em `skills-cowork`).
2. **Surface "revisão" no OMBUDS** — painel para a estagiária ver o que foi
   validado/ajustado + acessar a peça final + copiar orientações para WhatsApp.

## Sub-projeto 1 — Engine de revisão

### Empacotamento

Padrão já usado no repo: **command fino + skill profunda**
(`peca-vvd` command ↔ skills `vvd`/`estilo-pecas`). O rubric de revisão mora na
skill `skills-cowork/revisar-minutas/` e evolui via `/evoluir-skill`.

- Command: `~/.claude/commands/revisar-minuta.md` (gatilho: "revisar as minutas",
  "revisar minuta da estagiária", `/revisar-minuta`).
- Skill: `skills-cowork/revisar-minutas/SKILL.md` + references (rubric, formatos
  de saída) + scripts reusados (`gerar_docx`, `docx-to-pdf`, transcrição).
- **Reconciliação com `/revisao` existente:** o projeto já tinha
  `.claude/commands/revisao.md` ("Revisar peça de estagiário(a)"). Decisão:
  **engine única, dois atalhos** — `revisar-minutas` é o motor; `/revisao` e
  `/revisar-minuta` apontam para ele. O `/revisao` foi reescrito como ponteiro
  fino (preserva os gatilhos "revisa a peça"/"minuta do estagiário"). Verbos do
  rubric: mantidos em 3 (Manter/Ajustar/Substituir); o tom de WhatsApp do
  `/revisao` foi incorporado ao Layer 2. Intake ganhou dois modos: lote (inbox)
  e avulso (1 caso), cobrindo o estilo de entrada do antigo `/revisao`.

### Fluxo (por minuta em `1 - Revisões`)

**Fase 0 — Intake.** Varrer `1 - Revisões` por `.docx` (ignorar `~$`, `Icon`).
De cada arquivo extrair: endereçamento (juízo/vara), assistido, CNJ, tipo de ato,
atribuição (VVD/Júri/EP/Criminal pelo conteúdo).

**Fase 1 — Reconstrução de contexto → dossiê.** Para cada minuta:
- Localizar a pasta do assistido na raiz `Processos - X` correta.
- Conferir se o PDF dos autos é **da última semana**; se não, fazer scraping do
  PJe (fluxo existente) dos autos atualizados **+ processos associados**.
- Ler **tudo** na pasta: documentos, atendimentos, relatórios de análise prévios.
- Se houver **mídia de atendimento sem transcrição**, transcrever (skill
  `transcrever-atendimento`).
- Saída: um **dossiê** (forma reusada de `analise-*`) que é a **verdade-base**
  contra a qual a minuta é conferida.

**Fase 2 — Revisão contra o padrão.** Carregar o "padrão na cabeça": skills
`peca-{vvd|juri|ep}`/`criminal-comum` + `estilo-pecas` + `linguagem-defensiva` +
`coerencia-defensiva` + `citacoes-seguras` + `citacao-depoimentos`. Aplicar o
**rubric** (abaixo), classificando cada parte da minuta como
**Manter / Ajustar / Substituir**, e produzir um **rascunho revisado no lugar**
(os "ajustes realizados").

**Fase 3 — Apresentar → confirmar → finalizar.** Mostrar a avaliação Layer-1 + o
rascunho revisado para leitura. **Nada é finalizado/movido até a confirmação**
(a edição acontece; pdf + rename `(revisado)` + mover + gravar kanban são
gated no OK). Rodrigo pode pedir tweaks antes.

### Rubric de revisão (o "padrão na cabeça")

Nove dimensões; cada uma julgada Manter/Ajustar/Substituir, ancorada às skills:

1. **Cabeçalho/qualificação** — juízo certo, CNJ com DV válido, "defendido"
   (nunca réu/agressor).
2. **Fatos / objeto da prova** — economia probatória (não repetir a narrativa
   acusatória; atacar a fonte, não o conteúdo).
3. **Tese principal + coerência defensiva** — subsidiária não contamina a
   principal; sem confissão policial em absolvição; sem leitura alternativa do
   fato.
4. **Fundamentação + jurisprudência** — precedentes verificados (zero acórdão
   inventado; precedente do MP virado contra ele).
5. **Prova / citações** — timestamps, quem perguntou, citações seguras, sem citar
   literalmente frase incriminadora.
6. **Pedidos** — claros, corretos, completos.
7. **Estilo anti-IA-look** — travessões=0, prosa e não listas, sem barroquismo
   (verificação operacional do `estilo-pecas`).
8. **Linguagem defensiva** — modalizadores, defendido/ofendida.
9. **Fidelidade aos autos** — cada fato/ID conferido por grep nos autos (lição
   Nailton: laudo "fabricado"; prescrição checada).

### Saída em duas camadas

- **Layer 1 — para Rodrigo, no Claude Code.** Tabela compacta por dimensão
  (Manter/Ajustar/Substituir + por quê) + curta prosa: o que ela desenvolveu bem,
  o que estava errado e o risco que traria. Construtivo e direto.
- **Layer 2 — para a estagiária, no kanban + WhatsApp.** Curto, humano,
  **não-cara-de-IA**: soa como Rodrigo mandando retorno rápido — frases curtas,
  específico, honesto mas encorajador. Vai para `delegacoes_historico.observacoes`
  e é o texto do botão copiar-WhatsApp.

### Finalização & gravação no kanban (após OK)

- Gerar pdf; renomear à **convenção v2 + `(Revisado)`**
  (`[VVD] Apelacao - Fundamento - Nome (Revisado)`).
- Mover para `1 - Protocolar/` (fluxo `protocolar` existente).
- **Arquivar o original** em `1 - Revisões/_Originais revisados/` (registro +
  permite comparar original × final).
- Gravar no kanban: **auto-match por assistido + delegação em estágio "revisão"
  (`aguardando_revisao`)**, mostrando o match para Rodrigo confirmar antes de
  escrever em `delegacoes_historico.observacoes` (+ link da peça final). Status
  permanece em revisão; Rodrigo avança para protocolado manualmente.

## Sub-projeto 2 — Surface "revisão" no OMBUDS

Quando a estagiária aciona "Retornar para mim", o card sai de `delegado` para o
estágio **revisão** (`delegacaoWorkStatus = aguardando_revisao`). Esse estágio
vira um **hub de aprendizado**: painel onde a estagiária vê as considerações (o
que foi validado/ajustado), acessa a peça final, e copia as orientações para
WhatsApp.

### Reuso de infraestrutura existente

- `delegacoes_historico.observacoes` — home das considerações (Layer 2).
- `delegacoes_historico.orientacoes` — orientações adicionais, se necessário.
- `delegacaoWorkStatus` / `rotuloDelegacaoChip` — já exibe "· aguardando revisão".
- `src/lib/clipboard.ts` (`copyToClipboard`) + `delegacao-message.ts`
  (`montarMensagemDelegacao`) — base do botão copiar-WhatsApp.
- `demanda-status.ts` — secção "revisão" sob `acompanhar` (ou coluna derivada).
- `drive_files` (`processoId`/`assistidoId`/`categoria`) — link da peça final.

### Contrato de dados (entre sub-projetos)

A engine grava, na linha `delegacoes_historico` da demanda casada:
- `observacoes`: texto Layer-2 (orientações para a estagiária).
- (a definir no plano) referência à peça final revisada (drive file id / nome).
- status mantido em `aguardando_revisao` (não promovido automaticamente).

A UI lê esses campos para montar o painel de revisão e o botão WhatsApp.

## Riscos / armadilhas

- **Fato fabricado na minuta** (lição Nailton): a Fase 1 (dossiê + grep nos
  autos) é a salvaguarda; nunca aceitar afirmação da minuta sem conferir nos autos.
- **Autos desatualizados**: gate de "última semana" → scraping.
- **Match errado de demanda**: confirmação humana antes de gravar no kanban.
- **Layer-2 com cara de IA**: regras de estilo dedicadas no rubric da skill.
- **Convenção v2 de nome**: minutas chegam fora do padrão (CAIXA ALTA, sem
  Fundamento) → renomear na finalização.

## Critérios de sucesso

- Rodar `/revisar-minuta` nas 3 minutas em fila produz, por minuta: dossiê,
  avaliação Layer-1, rascunho revisado, e — após OK — peça final em Protocolar +
  original arquivado + considerações no kanban.
- A estagiária consegue, no OMBUDS, ver as considerações e copiá-las para WhatsApp.
