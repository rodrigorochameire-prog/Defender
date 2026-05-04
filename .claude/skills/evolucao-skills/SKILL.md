---
name: evolucao-skills
description: "Meta-skill — toda vez que um fluxo de trabalho (varredura, scraping, importação, geração de relatórios, população do OMBUDS, etc.) é melhorado durante uma sessão, esta skill orienta a agregar o aprendizado na skill correspondente, sincronizar cópias locais e atualizar a memória. Use quando: surgir uma heurística nova, regra de classificação for corrigida, fluxo de scraping ganhar etapa, padrão de relatório evoluir, bug for corrigido, ou parâmetro for descoberto. NUNCA aprender e esquecer — toda iteração é insumo da próxima."
---

# Evolução Contínua de Skills

A regra fundamental: **se aprendi algo nesta sessão que tornaria a próxima sessão
mais eficiente, isto vai para a skill correspondente — não fica só na memória da
conversa.**

> Memória da conversa some quando o contexto fecha. Skill é persistente. **Skill
> é onde o conhecimento opera.**

---

## Quando esta skill dispara

Triggers:
- Bug corrigido em script de scraping/importação/análise → atualizar skill do fluxo
- Heurística de classificação refinada (false-positive identificado e corrigido) →
  atualizar `references/heuristicas-*.md` da skill
- Padrão de relatório evoluído (nova seção, formato de citação, paleta) →
  atualizar `padrao-defender-relatorios.md` ou skill da atribuição
- Workaround descoberto para limitação externa (Comet bloqueia CDP, JSF
  ViewState corrupto após N requests, etc.) → "Bugs conhecidos e contornos"
- Regra nova de OMBUDS (campo descoberto, status alterado, side-effect cruzado) →
  skill correspondente + memória factual
- Comando útil cristalizado (busca SQL específica, JS para extrair algo do PJe) →
  `references/snippets.md` da skill

**Não dispara para:**
- Bugs efêmeros / específicos de uma sessão
- Decisões de UX que estão só no código (vão pro git, não pra skill)
- Conversas exploratórias que não chegaram a uma conclusão

---

## Pipeline de evolução (5 etapas)

### 1. Identificar — qual skill é "dona" deste aprendizado?

| Aprendizado | Skill destino |
|---|---|
| Heurística classificação intimação | `varredura-triagem/references/heuristicas-classificacao.md` |
| Workaround scraping PJe (ViewState, login, sigilo) | `varredura-triagem/SKILL.md` (seção "Bugs conhecidos") |
| Estrutura nova de demanda OMBUDS | (memória `project_*` ou criar skill nova) |
| Padrão de citação em relatório Júri | `juri/SKILL.md` ou `dpe-ba-pecas/SKILL.md` |
| Padrão de peça VVD | `vvd/SKILL.md` |
| Comando útil de busca no banco | `references/snippets.md` da skill mais próxima |
| Regra de redação anti-IA | `estilo-pecas/SKILL.md` |

Se não houver skill dona, pode ser sinal de que falta uma — registrar em
memória `project_*` indicando "candidato a virar skill quando estabilizar".

### 2. Localizar — pasta canônica do Drive

Toda edição deve ir **primeiro** para:

```
/Users/rodrigorochameire/Library/CloudStorage/GoogleDrive-rodrigorochameire@gmail.com/Meu Drive/1 - Defensoria 9ª DP/Skills - harmonizacao/<skill>/
```

NUNCA editar direto em `.claude/skills/` ou `.claude/skills-cowork/` —
essas são cópias derivadas. A regra está em
`reference_skills_canonical_location.md`.

### 3. Editar — onde dentro da skill?

| Tipo de aprendizado | Arquivo |
|---|---|
| Comportamento operacional / pipeline / "como rodar" | `SKILL.md` |
| Regras de classificação / heurísticas / mapeamentos | `references/heuristicas-*.md` ou `references/regras-*.md` |
| Bugs e contornos | `SKILL.md` → seção "Bugs conhecidos e contornos" |
| Snippets reutilizáveis (SQL, JS, regex) | `references/snippets.md` |
| Casos validados / exemplos reais | `references/exemplos.md` |
| Lição com data (histórico) | `SKILL.md` → seção "Histórico" no final |
| Script / código executável | `scripts/<nome>.py` ou `.ts` |

### 4. Sincronizar — cópias locais

Após editar a canônica:

```bash
# (a) Cópia para uso operacional do Claude Code
cp -R "/Users/rodrigorochameire/Library/CloudStorage/.../Skills - harmonizacao/<skill>/" \
      "/Users/rodrigorochameire/Projetos/Defender/.claude/skills/<skill>/"

# (b) Cópia para skills-cowork (legado, ainda usado)
cp -R "...harmonizacao/<skill>/" \
      "/Users/rodrigorochameire/Projetos/Defender/.claude/skills-cowork/<skill>/"
```

Se a skill é **nova**, adicionar ao array `SKILLS=( ... )` em
`Skills - harmonizacao/INSTALAR.sh`.

### 5. Persistir — git + memória

**Git** (`.claude/skills/...` está versionado em main):

```bash
git checkout -b feat/<skill>-<aprendizado>
git add .claude/skills/<skill>/
git commit -m "feat(<skill>): <aprendizado em uma frase>

Detalhes do que mudou. Por que. Lição que motivou.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push origin feat/...
# merge para main via worktree, conforme padrão
```

**Memória** — atualizar entrada em `MEMORY.md` se a referência mudou:

```markdown
- [<Título>](reference_<topico>.md) — <hook>
```

E o arquivo de memória relacionado (`reference_*.md` ou `feedback_*.md`).

---

## Anti-padrões (NÃO faça)

- ❌ Editar só em `.claude/skills/` — fica fora da canônica, vai dar drift.
- ❌ Hardcodar exemplo específico de hoje na skill — abstrair pra regra reutilizável.
- ❌ Adicionar bug fix sem documentar **o sintoma e a causa** — o próximo cai no mesmo.
- ❌ Atualizar só script sem atualizar SKILL.md — fica desincronizado.
- ❌ Criar nova skill pra cada idéia — primeiro tentar agregar à existente.
- ❌ Esquecer de sincronizar local após editar canônica.

---

## Padrão de commit (skills evolutivas)

```
feat(<skill>): <verbo curto> <objeto>

Contexto: o que disparou a mudança (sessão, caso real, bug observado).
Mudança: o que foi alterado (regra X → Y, regra nova Z, fix W).
Validação: rodada em N casos com resultado M/N.
Lição: o que isso ensina sobre o domínio.
```

Exemplo real (2026-05-04):

```
feat(varredura-triagem): título da timeline > keyword no texto

Contexto: rodada nas 10 demandas VVD em triagem; 2 falsos-positivos —
acórdão classificado como "Analisar sentença" (acórdão cita sentença
da 1ª instância) e decisão de MPU classificada como "Analisar acórdão"
(decisão cita precedente que contém "acórdão XXX").

Mudança: classify() ganha parâmetro titulo (best_titulo da timeline);
_decide_by_titulo() prioriza tipo declarado pelo PJe sobre keyword.

Validação: 10/10 das demandas VVD ontem+hoje (0 manual-review).

Lição: o PJe categoriza docs no upload (Decisão/Sentença/Acórdão/...) —
esse título é metadado curado, mais confiável que keyword no corpo.
```

---

## Histórico de aplicação

| Data | Skill afetada | Aprendizado |
|---|---|---|
| 2026-05-04 | varredura-triagem | título da timeline > keyword no texto; modo CDP > direct; regra inquérito→MP |
| 2026-05-04 | (esta) | criação da skill `evolucao-skills` |
