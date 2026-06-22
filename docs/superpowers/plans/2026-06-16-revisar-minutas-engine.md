# Revisão de Minutas — Engine (sub-projeto 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Authoring a Claude Code skill (`/revisar-minuta` command + `revisar-minutas` skill) that reconstructs case context, reviews an intern's draft against an explicit rubric, emits a two-layer evaluation, and — on confirmation — finalizes the peça to Protocolar and writes the considerations to the OMBUDS kanban.

**Architecture:** Thin command delegates to a deep skill in `skills-cowork/revisar-minutas/`. The skill orchestrates existing skills (`analise-*`, `peca-*`, `estilo-pecas`, `coerencia-defensiva`, `transcrever-atendimento`, `docx-to-pdf`, `protocolar`) and adds the new IP: a 9-dimension review rubric, two-layer output templates, and a kanban-write contract via Supabase MCP. This is **content authoring**, not unit-testable code — TDD's "failing test → pass" is adapted to **"author artifact → acceptance-validate on a real minuta."** The end-to-end acceptance run (Task 6) is the test: run on the smallest waiting draft (`[VVD] AF - VALMIR RODRIGUES VIEIRA.docx`) and verify each output.

**Tech Stack:** Markdown skills/commands; reused Python scripts (`vvd/scripts/gerar_docx.py`, `docx-to-pdf`, `protocolar`); Supabase MCP for the kanban write.

**Key paths (local, Drive mounted):**
- Revisões: `/Users/rodrigorochameire/Meu Drive/1 - Defensoria 9ª DP/1 - Protocolar/1 - Revisões`
- Protocolar: `/Users/rodrigorochameire/Meu Drive/1 - Defensoria 9ª DP/1 - Protocolar`
- Command: `/Users/rodrigorochameire/.claude/commands/revisar-minuta.md`
- Skill: `/Users/rodrigorochameire/Projetos/Defender/.claude/skills-cowork/revisar-minutas/`
- skills-cowork is gitignored → `git add -f` when committing.

---

### Task 1: Scaffold skill + command

**Files:**
- Create: `/Users/rodrigorochameire/Projetos/Defender/.claude/skills-cowork/revisar-minutas/SKILL.md` (skeleton)
- Create: `/Users/rodrigorochameire/.claude/commands/revisar-minuta.md` (skeleton)

- [ ] **Step 1: Create the skill dir and SKILL.md frontmatter skeleton**

```markdown
---
name: revisar-minutas
description: "Revisa minutas (peças) feitas por estagiária/analista que estão em '1 - Protocolar/1 - Revisões'. Use SEMPRE que o usuário pedir 'revisar as minutas', 'revisar minuta da estagiária', 'revisão de minuta', ou /revisar-minuta. Reconstrói o contexto do caso (dossiê), revisa a minuta contra um rubric de qualidade equilibrando aproveitamento × padrão, entrega avaliação em duas camadas (Defensor + estagiária) e finaliza a peça para Protocolar gravando as considerações no kanban OMBUDS."
---

# Revisão de Minutas da Estagiária/Analista

(corpo preenchido na Task 4)
```

- [ ] **Step 2: Create the command skeleton**

```markdown
# /revisar-minuta — Revisão de minuta da estagiária

(corpo preenchido na Task 5)
```

- [ ] **Step 3: Validate discoverability**

Run: `ls "/Users/rodrigorochameire/Projetos/Defender/.claude/skills-cowork/revisar-minutas/SKILL.md" && ls "/Users/rodrigorochameire/.claude/commands/revisar-minuta.md"`
Expected: both paths print (files exist).

- [ ] **Step 4: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add -f .claude/skills-cowork/revisar-minutas/SKILL.md
git add /Users/rodrigorochameire/.claude/commands/revisar-minuta.md 2>/dev/null || true
git commit -m "feat(revisar-minutas): scaffold skill + command"
```

---

### Task 2: Author the review rubric reference

**Files:**
- Create: `/Users/rodrigorochameire/Projetos/Defender/.claude/skills-cowork/revisar-minutas/references/rubric.md`

- [ ] **Step 1: Write the rubric (full content)**

The rubric is the "padrão na cabeça". Nine dimensions; for each: what good looks like, the failure modes to catch, the anchor skill, and the verdict vocabulary **Manter / Ajustar / Substituir**.

```markdown
# Rubric de Revisão de Minuta

Para cada dimensão, dar veredito: **Manter** (bom, preservar com no máximo ajuste
de modalizador) · **Ajustar** (ideia certa, execução fraca) · **Substituir**
(errado/ausente/arriscado). Registrar 1 frase de motivo por veredito.

## 1. Cabeçalho / qualificação  (âncora: linguagem-defensiva, peca-*)
- Juízo/vara de endereçamento corretos para o ato e a fase.
- CNJ com dígito verificador válido (conferir DV).
- "defendido" — nunca "réu/acusado/agressor/autor do fato"; "ofendida".
- Qualificação do assistido completa e correta.

## 2. Fatos / objeto da prova  (âncora: peca-vvd §economia probatória)
- Item dos Fatos simplifica a imputação (artigos, data, local) — não repete a
  narrativa acusatória.
- Não cita literalmente frase incriminadora; ataca a fonte, não o conteúdo.
- Não lista xingamentos/versão acusatória para depois refutar.

## 3. Tese principal + coerência defensiva  (âncora: coerencia-defensiva)
- Subsidiária NÃO contamina a tese principal (hierarquia clara).
- Sem confissão policial dentro de tese de absolvição.
- Sem leitura alternativa do próprio fato que entregue o caso.
- A tese escolhida é a mais favorável sustentável pelos autos (conferir no dossiê).

## 4. Fundamentação + jurisprudência  (âncora: citacoes-seguras, peca-* §jurisprudência)
- Zero acórdão inventado — todo precedente conferível (número/relator/turma/data)
  ou fórmula genérica sem número.
- Precedente do MP/juízo lido na íntegra e, quando útil, virado contra a acusação.
- Súmulas conferidas (ex.: Súmula 593 não barra erro de tipo; Súmula 362 é dano
  moral, não alimentos).

## 5. Prova / citações  (âncora: citacao-depoimentos)
- Timestamps no formato canônico; identifica quem perguntou; espontaneidade.
- Citações seguras; nada citado da mídia sem conferência.

## 6. Pedidos
- Pedidos claros, corretos para o ato, completos (principal + subsidiários na
  ordem certa); requerimentos finais em bullets (única lista permitida).

## 7. Estilo anti-IA-look  (âncora: estilo-pecas)
- Travessão longo (—) no corpo: 0 (conferir por contagem).
- Prosa integrada, não listas; sem subdivisões A.1/B.2 em excesso.
- Sem barroquismo/hedging/auto-comentário/paralelismos perfeitos (rodar a
  verificação operacional do estilo-pecas).

## 8. Linguagem defensiva  (âncora: linguagem-defensiva)
- Modalizadores presentes; presunção de inocência na redação; "fato imputado".

## 9. Fidelidade aos autos  (âncora: dossiê da Fase 1 + grep nos autos)
- CADA fato/data/ID afirmado na minuta conferido nos autos (lição Nailton: laudo
  "fabricado" que era só requisição). Marcar divergências como Substituir.
- Prescrição checada quando cabível (VVD/vias de fato).
```

- [ ] **Step 2: Validate**

Run: `grep -c '^## ' "/Users/rodrigorochameire/Projetos/Defender/.claude/skills-cowork/revisar-minutas/references/rubric.md"`
Expected: `9` (nine dimensions).

- [ ] **Step 3: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add -f .claude/skills-cowork/revisar-minutas/references/rubric.md
git commit -m "feat(revisar-minutas): review rubric (9 dimensions)"
```

---

### Task 3: Author the two-layer output reference

**Files:**
- Create: `/Users/rodrigorochameire/Projetos/Defender/.claude/skills-cowork/revisar-minutas/references/saida-layers.md`

- [ ] **Step 1: Write the output templates (full content)**

```markdown
# Saída em Duas Camadas

## Layer 1 — para o Defensor (no Claude Code)

Tabela compacta por dimensão + curta prosa. Construtivo e direto.

### Avaliação — {Assistido} · {Tipo de ato}
| Dimensão | Veredito | Motivo (1 frase) |
|---|---|---|
| Cabeçalho/qualificação | Manter/Ajustar/Substituir | … |
| Fatos/objeto da prova | … | … |
| Tese + coerência | … | … |
| Fundamentação/jurisprudência | … | … |
| Prova/citações | … | … |
| Pedidos | … | … |
| Estilo anti-IA | … | … |
| Linguagem defensiva | … | … |
| Fidelidade aos autos | … | … |

**Desenvolveu bem:** … (1-3 pontos concretos).
**Precisou corrigir (e o risco):** … (o que estava errado + o que teria causado
se protocolado).
**Veredito geral:** aproveitamento ~X% · {pronta após ajustes | exigiu
reescrita de Y}.

## Layer 2 — para a estagiária (kanban + WhatsApp)

Regras de estilo (anti-cara-de-IA — soa como Rodrigo num retorno rápido):
- Frases curtas. Sem tabela, sem bullets perfeitos, sem "Em síntese".
- Específico ao caso, não genérico. Cita o ponto concreto.
- Começa pelo que ficou bom, depois o ajuste principal, fecha com 1 dica.
- Tom honesto e encorajador; 2ª pessoa ("você"); 4-8 linhas no máximo.
- Zero travessão longo. Zero jargão de revisor ("dimensão", "veredito").

Template (preencher com o caso, variando a abertura):
> Valmir ficou bom no geral. A parte da [X] você mandou bem, aproveitei quase
> tudo. Ajustei [ponto principal] porque [motivo curto e concreto]. Uma coisa
> pra próxima: [dica acionável]. No mais, tá no caminho certo.
```

- [ ] **Step 2: Validate**

Run: `grep -c 'Layer' "/Users/rodrigorochameire/Projetos/Defender/.claude/skills-cowork/revisar-minutas/references/saida-layers.md"`
Expected: `>= 2` (both layers present).

- [ ] **Step 3: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add -f .claude/skills-cowork/revisar-minutas/references/saida-layers.md
git commit -m "feat(revisar-minutas): two-layer output templates"
```

---

### Task 4: Author the SKILL.md body (orchestration)

**Files:**
- Modify: `/Users/rodrigorochameire/Projetos/Defender/.claude/skills-cowork/revisar-minutas/SKILL.md`

- [ ] **Step 1: Write the full body under the frontmatter from Task 1**

Sections, in order, with the exact behavior:

```markdown
## Quando acionar
"revisar as minutas", "revisar minuta da estagiária", "/revisar-minuta".
As minutas vivem em `1 - Protocolar/1 - Revisões`.

## Fase 0 — Intake
Varrer `1 - Revisões` por `.docx`; ignorar `~$*` e `Icon`. De cada arquivo,
extrair (lendo o texto do docx): endereçamento, assistido, CNJ, tipo de ato,
atribuição (VVD/Júri/EP/Criminal). Processar uma minuta por vez, em ordem.

## Fase 1 — Reconstrução de contexto (dossiê)
1. Localizar a pasta do assistido na raiz `Processos - {VVD (Criminal)|Júri|
   Execução Penal|...}` correspondente (ver CLAUDE.md §Estrutura).
2. Conferir a data do PDF dos autos: se NÃO for da última semana (≤7 dias),
   fazer scraping do PJe (ref: skills/memórias de scraping) dos autos atualizados
   + processos associados.
3. Ler tudo na pasta: documentos, atendimentos, relatórios de análise prévios.
4. Mídia de atendimento sem transcrição → skill `transcrever-atendimento`.
5. Montar o dossiê reusando a forma de `analise-{vvd|juri|ep|criminal}`. Este
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

## Kanban write (contrato com OMBUDS)
1. Gerar o texto **Layer 2** (`references/saida-layers.md`).
2. Achar a demanda: via Supabase MCP, casar por assistido + delegação no estágio
   "revisão" (`delegacoes_historico.status = 'aguardando_revisao'`), a mais
   recente. **Mostrar o match para Rodrigo confirmar** antes de gravar.
3. Update `delegacoes_historico.observacoes = {texto Layer 2}` na linha casada.
   Status NÃO é promovido (Rodrigo avança manualmente). Não tocar `status`.
4. Se nenhuma demanda casar, avisar e seguir (kanban manual).

## Reuso de skills (não reimplementar)
analise-* (dossiê) · peca-* + estilo-pecas + linguagem/coerencia (padrão) ·
transcrever-atendimento · docx-to-pdf · protocolar · scraping PJe (memórias).
```

- [ ] **Step 2: Validate structure**

Run: `grep -c '^## Fase' "/Users/rodrigorochameire/Projetos/Defender/.claude/skills-cowork/revisar-minutas/SKILL.md"`
Expected: `>= 3` (Fases 1, 2, 3 — Fase 0 matches too → `4`).

- [ ] **Step 3: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add -f .claude/skills-cowork/revisar-minutas/SKILL.md
git commit -m "feat(revisar-minutas): SKILL orchestration body"
```

---

### Task 5: Author the command

**Files:**
- Modify: `/Users/rodrigorochameire/.claude/commands/revisar-minuta.md`

- [ ] **Step 1: Write the thin command (full content)**

```markdown
# /revisar-minuta — Revisão de minuta da estagiária

Aciona a skill `revisar-minutas` (skills-cowork). Use quando o usuário pedir
"revisar as minutas", "revisar minuta da estagiária", "revisão de minuta".

## O que faz
1. Lê as minutas em `1 - Protocolar/1 - Revisões` (uma por vez).
2. Reconstrói o contexto do caso → dossiê (autos da última semana, senão
   scraping; processos associados; documentos; atendimentos — transcrevendo
   mídia sem transcrição).
3. Revisa contra o rubric de 9 dimensões (Manter/Ajustar/Substituir),
   equilibrando aproveitar a peça da estagiária × padrão de qualidade.
4. Apresenta avaliação **Layer 1** (para o Defensor) + rascunho revisado.
5. Após confirmação: pdf + rename `(Revisado)` + mover p/ Protocolar + arquivar
   o original + gravar a avaliação **Layer 2** no kanban (match confirmado).

Detalhes e rubric: skill `revisar-minutas`.
```

- [ ] **Step 2: Validate**

Run: `test -s "/Users/rodrigorochameire/.claude/commands/revisar-minuta.md" && echo OK`
Expected: `OK`.

- [ ] **Step 3: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add /Users/rodrigorochameire/.claude/commands/revisar-minuta.md 2>/dev/null || true
git commit -m "feat(revisar-minutas): /revisar-minuta command" || true
```

---

### Task 6: Acceptance validation — end-to-end on one real minuta

This is the integration test. Target the smallest waiting draft:
`[VVD] AF - VALMIR RODRIGUES VIEIRA.docx` (AF = Alegações Finais).

- [ ] **Step 1: Dry-run Fases 0-2 (no finalization)**

Invoke `/revisar-minuta` (or the skill) on the Valmir draft. Stop before Fase 3
finalization.
Expected outputs to verify by inspection:
- Atribuição detectada = VVD; CNJ + assistido extraídos.
- Dossiê montado: autos conferidos (≤7 dias ou scraping feito), processos
  associados, atendimentos lidos (mídia sem transcrição foi transcrita).
- Avaliação Layer 1 renderizada (tabela 9 dimensões + prosa).
- Rascunho revisado preserva trechos "Manter", ajusta o resto.

- [ ] **Step 2: Verify anti-IA-look on the revised draft**

Run (after the revised docx text is available as a .txt/markdown for checking):
`python3 -c "import sys; t=open(sys.argv[1]).read(); print('travessoes corpo:', t.count('—'))" <arquivo_texto>`
Expected: `0` (fora de cabeçalhos/footer institucional).

- [ ] **Step 3: Confirm + run Fase 3 finalization**

After Rodrigo's OK:
- pdf gerado; arquivo renomeado para `[VVD] Alegacoes Finais - {Fundamento} -
  Valmir Rodrigues Vieira (Revisado).docx/pdf`.
- docx+pdf em `1 - Protocolar/`.
- original em `1 - Revisões/_Originais revisados/`.

Verify:
Run: `ls "/Users/rodrigorochameire/Meu Drive/1 - Defensoria 9ª DP/1 - Protocolar/" | grep -i "Valmir.*Revisado"`
Expected: docx + pdf listed.
Run: `ls "/Users/rodrigorochameire/Meu Drive/1 - Defensoria 9ª DP/1 - Protocolar/1 - Revisões/_Originais revisados/" | grep -i Valmir`
Expected: original listed.

- [ ] **Step 4: Verify kanban write**

Via Supabase MCP: the matched `delegacoes_historico` row for Valmir has
`observacoes` populated with the Layer-2 text and `status` still
`aguardando_revisao` (unchanged).
Expected: confirmed before write (match shown to Rodrigo), observacoes non-null,
status untouched.

- [ ] **Step 5: Commit any skill refinements discovered during the run**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add -f .claude/skills-cowork/revisar-minutas/
git commit -m "fix(revisar-minutas): refinements from Valmir acceptance run" || true
```

---

## Self-Review

- **Spec coverage:** Intake (T1/T4), dossiê + scraping + transcrição (T4 Fase 1),
  rubric 9 dim (T2), two-layer output (T3), finalização + convenção v2 +
  `(Revisado)` + arquivar original (T4 Fase 3), kanban match-confirm + observacoes
  (T4 Kanban write + T6 S4), acceptance (T6). Sub-projeto 2 (UI OMBUDS) é plano
  separado — fora deste escopo, conforme spec.
- **Placeholders:** `{Fundamento}` em nomes é dado do caso (preenchido em runtime),
  não placeholder de plano. Sem TBD/TODO.
- **Type consistency:** veredito vocabulary **Manter/Ajustar/Substituir** usado em
  T2, T3, T4 de forma idêntica. Estágio "revisão" = `aguardando_revisao` em todo o
  plano. Caminhos de Revisões/Protocolar idênticos em todas as tasks.
