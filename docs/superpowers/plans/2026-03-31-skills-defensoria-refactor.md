# Skills Defensoria — Refactoring & Aprimoramento

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidar as 5 skills jurídicas da Defensoria, eliminando duplicação, populando references, e unificando a infraestrutura para que funcionem end-to-end no Cowork Worker e no OMBUDS.

**Architecture:** Extrair conteúdo compartilhado (formatação DPE-BA, linguagem estratégica, schema JSON base, python-docx helpers) para `_shared/`, copiar os 49 references existentes de `.claude/skills-cowork/` para `skills-atualizadas/`, e atualizar SKILL.md de cada skill para referenciar `_shared/` em vez de duplicar. Adicionar 3 skills extras que existem em skills-cowork mas não em skills-atualizadas.

**Tech Stack:** Markdown, Python (python-docx), JSON Schema

**Diretório-alvo:** `~/Projetos/Defender/skills-atualizadas/`

---

## Estado Atual

| Local | O que tem | O que falta |
|-------|-----------|-------------|
| `.claude/skills-cowork/` | 21 skills, SKILL.md + 49 references populados | SKILL.md desatualizados (versão antiga, ~245 linhas vs ~305) |
| `skills-atualizadas/` | 5 skills, SKILL.md atualizados (versão nova) | 0 references, 0 _shared, faltam 3 skills extras (citacao-depoimentos, dpe-ba-pecas, institucional) |
| `scripts/cowork_skills.json` | Mapeia 8 skills + 7 funcionalidades | Refs vazios para 6 de 8 skills |

**Problema central:** `skills-atualizadas/` tem os SKILL.md mais novos mas ZERO references. `.claude/skills-cowork/` tem os references mas SKILL.md antigos. Ninguém está completo.

---

## Sprint 1: Infraestrutura Compartilhada (4 tasks)

### Task 1: Criar `_shared/formatacao-dpe-ba.md`

**Files:**
- Create: `skills-atualizadas/_shared/formatacao-dpe-ba.md`

Extrai a seção de formatação institucional (margens, fontes, cabeçalho, rodapé, logo, python-docx) que é duplicada em todas as 5 skills.

- [ ] **Step 1: Criar o arquivo _shared com o conteúdo de formatação**

```markdown
# Formatação Institucional DPE-BA — Referência Compartilhada

## Página e Margens
- Tamanho: A4 (11906 x 16838 twips)
- Margem superior: 2552 twips (~4.5cm)
- Margem inferior: 1134 twips (2cm)
- Margem esquerda: 1418 twips (2.5cm)
- Margem direita: 1134 twips (2cm)
- Header distance: 567 twips / Footer distance: 567 twips

## Fonte e Corpo do Texto
- **Corpo**: Verdana, 12pt, justificado, recuo 1ª linha 720 twips, espaçamento 1.5, espaço após 10pt
- **Rodapé**: Arial Narrow, 8pt
- **Títulos de seção**: justificado, negrito, sem recuo, linha em branco real antes, espaço após 6pt

## Endereçamento e Epígrafe
- Endereçamento: justificado, negrito, sem recuo, espaço após 0pt + 2 linhas em branco
- Epígrafe: justificado, negrito, sem recuo, espaço após 20pt + 2 linhas em branco

## Qualificação + Nome da Peça
- No mesmo parágrafo (inline), com recuo de 1ª linha
- Nome do assistido em negrito, nome da peça em negrito

## Fecho e Assinatura — EXCLUSIVO para peças processuais formais
- "Nesses termos, pede deferimento." — parágrafo normal com recuo
- Data: justificado com recuo (NÃO centralizado), formato "DD de mês de YYYY"
- Assinatura: centralizado, negrito, "Rodrigo Rocha Meire" / "Defensor Público"

> ⚠️ Relatórios analíticos (dossiês, análises, varreduras) NÃO levam assinatura. São documentos internos de trabalho. Encerram com **Rodapé do Relatório**.

## Cabeçalho e Rodapé
- Header: logo `assets/dpe_logo.png` centralizada, 1.777 x 1.101 inches, opacidade 60%
- Footer: borda superior 4pt, centralizado, Arial Narrow 8pt, "Defensoria Pública do Estado da Bahia" / "7ª Regional da DPE – Camaçari – Bahia."

## Como Gerar o Documento (.docx)

Usar **python-docx** (Python). O script base está em `scripts/gerar_docx.py`.

Instalar: `pip install python-docx Pillow numpy --break-system-packages`

### Pré-processamento da Logo (opacidade 60%)

\```python
from PIL import Image
import numpy as np
img = Image.open("assets/dpe_logo.png").convert("RGBA")
arr = np.array(img, dtype=np.float64)
opacity = 0.60
white = np.full_like(arr[:,:,:3], 255.0)
arr[:,:,:3] = arr[:,:,:3] * opacity + white * (1 - opacity)
arr[:,:,3] = 255
result = Image.fromarray(arr.astype(np.uint8)).convert("RGB")
result.save("dpe_logo_faded.png")
\```

## Regras Gerais
- Sempre usar **python-docx** (não a biblioteca npm)
- Data gerada automaticamente em português (ex: "10 de março de 2026")
- **Peças processuais**: `[Tipo da Peça] - [Nome do Assistido].docx`
- **Análises**: `[Tipo de Análise] - [Nome do Assistido] - [Data].md` (ou .docx se solicitado)
- Salvar na pasta do usuário
```

- [ ] **Step 2: Verificar que o arquivo está completo**

Run: `wc -l skills-atualizadas/_shared/formatacao-dpe-ba.md`
Expected: ~60-70 linhas

- [ ] **Step 3: Commit**

```bash
git add skills-atualizadas/_shared/formatacao-dpe-ba.md
git commit -m "feat(skills): extrair formatação DPE-BA para _shared/"
```

---

### Task 2: Criar `_shared/linguagem-estrategica.md`

**Files:**
- Create: `skills-atualizadas/_shared/linguagem-estrategica.md`

Extrai a seção "Linguagem Estratégica da Defesa" idêntica nas 5 skills (~30 linhas cada = ~150 linhas de duplicação).

- [ ] **Step 1: Criar o arquivo**

Copiar a seção de Linguagem Estratégica da Defesa de qualquer SKILL.md (são idênticas). Conteúdo:
- "Evite vítima para se referir ao ofendido" + tabela de substituições
- Exceção importante (quando assistido é ofendido)
- Outras escolhas linguísticas (supostamente, alegadamente, condicional)
- Raciocínio por trás da diretriz

- [ ] **Step 2: Verificar**

Run: `wc -l skills-atualizadas/_shared/linguagem-estrategica.md`
Expected: ~30-35 linhas

- [ ] **Step 3: Commit**

```bash
git add skills-atualizadas/_shared/linguagem-estrategica.md
git commit -m "feat(skills): extrair linguagem estratégica para _shared/"
```

---

### Task 3: Criar `_shared/padrao-relatorio.md`

**Files:**
- Create: `skills-atualizadas/_shared/padrao-relatorio.md`

Extrai o padrão tipológico de relatório (banner, tabela de identificação, headings, subheadings, corpo, separadores, rodapé) que aparece em juri, execucao-penal e analise-audiencias com variações de cor.

- [ ] **Step 1: Criar o arquivo com paleta parametrizada**

O conteúdo deve definir a estrutura visual genérica e incluir a tabela de cores por atribuição:

| Atribuição | Cor-tema | Fundo suave | Cor clara |
|---|---|---|---|
| Tribunal do Júri | `1A5C36` | `EAF5EE` | `A8D5B5` |
| VVD / Maria da Penha | `92400E` | `FFFBEB` | `FCD34D` |
| Execução Penal | `1E3A8A` | `EEF4FF` | `93C5FD` |
| Criminal Comum | `991B1B` | `FFF0F0` | `FCA5A5` |
| APF / Plantão | `374151` | `F1F5F9` | `94A3B8` |

Incluir hierarquia tipológica: BANNER → TABELA 4 COLUNAS → BARRA PROGRESSO → HEADING → subheading → corpo → SEPARADOR → RODAPÉ DO RELATÓRIO.

- [ ] **Step 2: Verificar**

Run: `wc -l skills-atualizadas/_shared/padrao-relatorio.md`
Expected: ~80-90 linhas

- [ ] **Step 3: Commit**

```bash
git add skills-atualizadas/_shared/padrao-relatorio.md
git commit -m "feat(skills): extrair padrão tipológico de relatório para _shared/"
```

---

### Task 4: Criar `_shared/schema-base.md`

**Files:**
- Create: `skills-atualizadas/_shared/schema-base.md`

Define o schema JSON base compartilhado por todas as skills, com campos comuns e regras de preenchimento. Cada skill estende com seu `payload` específico.

- [ ] **Step 1: Criar o arquivo**

```markdown
# Schema `_analise_ia.json` — Base Compartilhada

## Campos Comuns (obrigatórios em todas as skills)

\```json
{
  "schema_version": "1.0",
  "tipo": "<skill_tipo_peca>",
  "gerado_em": "<ISO 8601 com fuso -03:00>",
  "assistido": "<nome completo>",
  "processo": "<número CNJ>",
  "resumo_fato": "<2-3 frases>",
  "tese_defesa": "<tese principal>",
  "estrategia_atual": "<estratégia recomendada>",
  "crime_principal": "<tipo penal>",
  "pontos_criticos": ["<ponto 1>", "<ponto 2>"],
  "payload": { ... }
}
\```

## Regras de Preenchimento
- Campos sem informação: usar `null` (não omitir)
- Arrays sem itens: usar `[]` (não omitir)
- `gerado_em`: ISO 8601 com fuso de Brasília (-03:00)
- JSON válido, indentado com 2 espaços
- Se já existir `_analise_ia.json`, **sobrescreva**

## Localização
Salvar na pasta raiz do assistido no Google Drive.

## Confirmação Obrigatória
Após salvar: `✅ _analise_ia.json salvo na pasta do assistido — pronto para importar no OMBUDS via botão "Importar do Cowork"`

## Payloads por Skill
Cada skill define campos extras no `payload`. Veja o SKILL.md da skill correspondente.
```

- [ ] **Step 2: Verificar**

Run: `wc -l skills-atualizadas/_shared/schema-base.md`
Expected: ~35-40 linhas

- [ ] **Step 3: Commit**

```bash
git add skills-atualizadas/_shared/schema-base.md
git commit -m "feat(skills): extrair schema JSON base para _shared/"
```

---

## Sprint 2: Popular References (5 tasks)

### Task 5: Copiar references do Júri

**Files:**
- Create: `skills-atualizadas/juri/references/` (12 arquivos)
- Source: `.claude/skills-cowork/juri/references/`

- [ ] **Step 1: Criar diretório e copiar**

```bash
mkdir -p skills-atualizadas/juri/references/
cp .claude/skills-cowork/juri/references/*.md skills-atualizadas/juri/references/
```

- [ ] **Step 2: Verificar quantidade**

```bash
ls skills-atualizadas/juri/references/ | wc -l
```

Expected: 12 arquivos (absolvicao_sumaria_alibe.md, alegacoes_finais_juri.md, analise_dos_jurados.md, analise_estrategica_juri.md, analise_juri_estruturada_2.md, analise_juri_estruturada.md, analise_para_juri.md, analise_preparar_juri_422.md, apelacao_pos_juri.md, diligencias_422_cpp.md, fabrica_ideias_defensivas.md, slides_do_juri.md)

- [ ] **Step 3: Commit**

```bash
git add skills-atualizadas/juri/references/
git commit -m "feat(skills): popular references do júri (12 prompts)"
```

---

### Task 6: Copiar references da VVD

**Files:**
- Create: `skills-atualizadas/vvd/references/` (13 arquivos)
- Source: `.claude/skills-cowork/vvd/references/`

- [ ] **Step 1: Copiar**

```bash
mkdir -p skills-atualizadas/vvd/references/
cp .claude/skills-cowork/vvd/references/*.md skills-atualizadas/vvd/references/
```

- [ ] **Step 2: Verificar**

```bash
ls skills-atualizadas/vvd/references/ | wc -l
```

Expected: 13 arquivos

- [ ] **Step 3: Commit**

```bash
git add skills-atualizadas/vvd/references/
git commit -m "feat(skills): popular references da VVD (13 prompts)"
```

---

### Task 7: Copiar references da Execução Penal

**Files:**
- Create: `skills-atualizadas/execucao-penal/references/` (5 arquivos)
- Source: `.claude/skills-cowork/execucao-penal/references/`

- [ ] **Step 1: Copiar**

```bash
mkdir -p skills-atualizadas/execucao-penal/references/
cp .claude/skills-cowork/execucao-penal/references/*.md skills-atualizadas/execucao-penal/references/
```

- [ ] **Step 2: Verificar**

```bash
ls skills-atualizadas/execucao-penal/references/ | wc -l
```

Expected: 5 arquivos

- [ ] **Step 3: Commit**

```bash
git add skills-atualizadas/execucao-penal/references/
git commit -m "feat(skills): popular references da execução penal (5 prompts)"
```

---

### Task 8: Copiar references do Criminal Comum

**Files:**
- Create: `skills-atualizadas/criminal-comum/references/` (12 arquivos)
- Source: `.claude/skills-cowork/criminal-comum/references/`

- [ ] **Step 1: Copiar**

```bash
mkdir -p skills-atualizadas/criminal-comum/references/
cp .claude/skills-cowork/criminal-comum/references/*.md skills-atualizadas/criminal-comum/references/
```

- [ ] **Step 2: Verificar**

```bash
ls skills-atualizadas/criminal-comum/references/ | wc -l
```

Expected: 12 arquivos

- [ ] **Step 3: Commit**

```bash
git add skills-atualizadas/criminal-comum/references/
git commit -m "feat(skills): popular references do criminal comum (12 prompts)"
```

---

### Task 9: Copiar references da Análise de Audiências

**Files:**
- Create: `skills-atualizadas/analise-audiencias/references/` (7 arquivos)
- Source: `.claude/skills-cowork/analise-audiencias/references/`

- [ ] **Step 1: Copiar**

```bash
mkdir -p skills-atualizadas/analise-audiencias/references/
cp .claude/skills-cowork/analise-audiencias/references/*.md skills-atualizadas/analise-audiencias/references/
```

- [ ] **Step 2: Verificar**

```bash
ls skills-atualizadas/analise-audiencias/references/ | wc -l
```

Expected: 7 arquivos (analise_audiencia_criminal.md, analise_audiencia_sumariante.md, analise_audiencia_trafico.md, analise_auto_prisao_flagrante.md, analise_para_ra.md, relatorio_audiencia_justificacao.md, tripla_saida.md)

- [ ] **Step 3: Commit**

```bash
git add skills-atualizadas/analise-audiencias/references/
git commit -m "feat(skills): popular references da análise de audiências (7 prompts)"
```

---

## Sprint 3: Refatorar SKILL.md (5 tasks)

### Task 10: Refatorar `juri/SKILL.md`

**Files:**
- Modify: `skills-atualizadas/juri/SKILL.md`

Substituir seções duplicadas por referências ao `_shared/`:

- [ ] **Step 1: Remover seção "Formatação Institucional Obrigatória"**

Substituir as ~35 linhas de formatação por:

```markdown
## Formatação Institucional

> Para padrões de página, margens, fontes, cabeçalho/rodapé e geração .docx, consulte [`_shared/formatacao-dpe-ba.md`](../_shared/formatacao-dpe-ba.md).
```

- [ ] **Step 2: Remover seção "Como Gerar o Documento" (python-docx + logo)**

Substituir as ~25 linhas de python-docx/logo por:

```markdown
## Como Gerar o Documento

> Instruções de geração .docx (python-docx, logo): [`_shared/formatacao-dpe-ba.md`](../_shared/formatacao-dpe-ba.md).
```

- [ ] **Step 3: Remover seção "Linguagem Estratégica da Defesa"**

Substituir as ~30 linhas por:

```markdown
## Linguagem Estratégica da Defesa

> Diretrizes completas de linguagem defensiva: [`_shared/linguagem-estrategica.md`](../_shared/linguagem-estrategica.md).
```

- [ ] **Step 4: Simplificar seção "Integração OMBUDS"**

Manter apenas o `payload` específico do Júri. Substituir campos comuns + regras de preenchimento por referência:

```markdown
## Integração OMBUDS — `_analise_ia.json`

> Campos comuns, regras de preenchimento e localização: [`_shared/schema-base.md`](../_shared/schema-base.md).

### Payload específico do Júri

\```json
"payload": {
  "tipo_peca": "<nome>",
  "fase_processual": "<sumario_culpa|pronuncia|preparacao_plenario|plenario|pos_juri>",
  "qualificadoras_imputadas": [],
  "teses_subsidiarias": [],
  "tese_plenario": "<tese principal>",
  "pedidos": [],
  "perguntas_por_testemunha": [],
  "contradicoes": [],
  "orientacao_ao_assistido": "<orientação>",
  "perfil_jurados": "<observações>"
}
\```

### Valores de `tipo`
`juri_apelacao`, `juri_alegacoes_finais`, `juri_diligencias_422`, `juri_absolvicao_sumaria`, `juri_analise_estrategica`, `juri_analise_estruturada`, `juri_preparacao_422`, `juri_analise_rapida`, `juri_analise_jurados`, `juri_slides`, `juri_fabrica_ideias`
```

- [ ] **Step 5: Adicionar referência ao padrão de relatório**

Na seção de relatórios, substituir a definição completa do padrão tipológico por:

```markdown
### Para Relatórios Analíticos (.docx)

> Padrão tipológico completo (banner, headings, corpo, rodapé): [`_shared/padrao-relatorio.md`](../_shared/padrao-relatorio.md).

**Cor-tema do Júri**: `1A5C36` (verde) · Fundo: `EAF5EE` · Clara: `A8D5B5`
```

- [ ] **Step 6: Verificar resultado**

```bash
wc -l skills-atualizadas/juri/SKILL.md
```

Expected: ~120-150 linhas (antes era 306). Redução de ~50%.

- [ ] **Step 7: Commit**

```bash
git add skills-atualizadas/juri/SKILL.md
git commit -m "refactor(skills): juri SKILL.md → referencia _shared/, -50% duplicação"
```

---

### Task 11: Refatorar `vvd/SKILL.md`

**Files:**
- Modify: `skills-atualizadas/vvd/SKILL.md`

Mesmo padrão da Task 10. Manter:
- Tabela de tipos de peça (13 tipos)
- Particularidades da VVD (Paz em Casa, MPU, desvio de finalidade)
- Payload específico VVD (`tipo_violencia`, `mpu_vigente`, `mpu_desvio_finalidade`, `relacao_partes`)

Remover: formatação DPE-BA, python-docx, linguagem estratégica, schema base.

- [ ] **Step 1: Substituir seções duplicadas** (formatação, python-docx, linguagem, schema base) pelas mesmas referências _shared/ da Task 10

- [ ] **Step 2: Manter seção "Particularidades da VVD"** intacta (Juízo Paz em Casa, teses FONAVID, etc.)

- [ ] **Step 3: Manter payload específico VVD** com `tipo_violencia`, `mpu_vigente`, `mpu_desvio_finalidade`, `relacao_partes`

- [ ] **Step 4: Verificar**

```bash
wc -l skills-atualizadas/vvd/SKILL.md
```

Expected: ~90-110 linhas (antes era 198).

- [ ] **Step 5: Commit**

```bash
git add skills-atualizadas/vvd/SKILL.md
git commit -m "refactor(skills): vvd SKILL.md → referencia _shared/, -45% duplicação"
```

---

### Task 12: Refatorar `execucao-penal/SKILL.md`

**Files:**
- Modify: `skills-atualizadas/execucao-penal/SKILL.md`

Mesmo padrão. Manter:
- Tabela de tipos (5 tipos com descrições detalhadas de reconversão/prescrição)
- Cor-tema azul profundo
- Payload específico EP (`regime_atual`, `pena_total`, `pena_restante`, `data_transito`, `prescricao_executoria`, `intimacao`, `endereco_atualizado`, `diligencias_esgotadas`, `urgencia`)

- [ ] **Step 1: Substituir seções duplicadas** por referências _shared/

- [ ] **Step 2: Manter descrições detalhadas** das peças de EP (são únicas e extensas)

- [ ] **Step 3: Manter payload específico EP** (mais rico de todas as skills)

- [ ] **Step 4: Verificar**

```bash
wc -l skills-atualizadas/execucao-penal/SKILL.md
```

Expected: ~110-130 linhas (antes era 225).

- [ ] **Step 5: Commit**

```bash
git add skills-atualizadas/execucao-penal/SKILL.md
git commit -m "refactor(skills): execução penal SKILL.md → referencia _shared/, -45% duplicação"
```

---

### Task 13: Refatorar `criminal-comum/SKILL.md`

**Files:**
- Modify: `skills-atualizadas/criminal-comum/SKILL.md`

Mesmo padrão. Manter:
- Tabela de tipos (12 tipos)
- Payload específico (`nulidades_arguidas`, `status_prisional`, `urgencia`)

- [ ] **Step 1: Substituir seções duplicadas** por referências _shared/

- [ ] **Step 2: Manter payload específico** criminal-comum

- [ ] **Step 3: Verificar**

```bash
wc -l skills-atualizadas/criminal-comum/SKILL.md
```

Expected: ~80-100 linhas (antes era 187).

- [ ] **Step 4: Commit**

```bash
git add skills-atualizadas/criminal-comum/SKILL.md
git commit -m "refactor(skills): criminal-comum SKILL.md → referencia _shared/, -47% duplicação"
```

---

### Task 14: Refatorar `analise-audiencias/SKILL.md`

**Files:**
- Modify: `skills-atualizadas/analise-audiencias/SKILL.md`

Mesmo padrão. Manter:
- Tabela de tipos (6 análises)
- Estruturas tipicamente incluídas (13 seções de análise criminal + módulos RA)
- Payload específico (`perguntas_por_testemunha`, `contradicoes`, `nulidades_identificadas`, `provas_a_requerer`)

- [ ] **Step 1: Substituir seções duplicadas** por referências _shared/

- [ ] **Step 2: Manter "Estruturas Tipicamente Incluídas"** intacta (é conteúdo único e valioso)

- [ ] **Step 3: Simplificar formatação** — remover definição completa do padrão de relatório, manter apenas referência _shared/ + paleta por atribuição (que é definida nesta skill)

- [ ] **Step 4: Verificar**

```bash
wc -l skills-atualizadas/analise-audiencias/SKILL.md
```

Expected: ~130-150 linhas (antes era 279).

- [ ] **Step 5: Commit**

```bash
git add skills-atualizadas/analise-audiencias/SKILL.md
git commit -m "refactor(skills): analise-audiencias SKILL.md → referencia _shared/, -46% duplicação"
```

---

## Sprint 4: Skills Extras + Metadados (3 tasks)

### Task 15: Migrar skills extras para `skills-atualizadas/`

**Files:**
- Create: `skills-atualizadas/citacao-depoimentos/SKILL.md` + `references/`
- Create: `skills-atualizadas/dpe-ba-pecas/SKILL.md` + `references/`
- Create: `skills-atualizadas/institucional/SKILL.md` + `references/`

Copia as 3 skills que existem em `.claude/skills-cowork/` mas não em `skills-atualizadas/`.

- [ ] **Step 1: Copiar citacao-depoimentos**

```bash
mkdir -p skills-atualizadas/citacao-depoimentos/references/
cp .claude/skills-cowork/citacao-depoimentos/SKILL.md skills-atualizadas/citacao-depoimentos/
# citacao-depoimentos não tem references, mas check:
cp .claude/skills-cowork/citacao-depoimentos/references/*.md skills-atualizadas/citacao-depoimentos/references/ 2>/dev/null
```

- [ ] **Step 2: Copiar dpe-ba-pecas**

```bash
mkdir -p skills-atualizadas/dpe-ba-pecas/references/
cp .claude/skills-cowork/dpe-ba-pecas/SKILL.md skills-atualizadas/dpe-ba-pecas/
cp .claude/skills-cowork/dpe-ba-pecas/references/*.md skills-atualizadas/dpe-ba-pecas/references/ 2>/dev/null
```

- [ ] **Step 3: Copiar institucional**

```bash
mkdir -p skills-atualizadas/institucional/references/
cp .claude/skills-cowork/institucional/SKILL.md skills-atualizadas/institucional/
cp .claude/skills-cowork/institucional/references/*.md skills-atualizadas/institucional/references/ 2>/dev/null
```

- [ ] **Step 4: Verificar estrutura**

```bash
find skills-atualizadas/ -name "SKILL.md" | sort
```

Expected: 8 skills (5 originais + 3 novas)

- [ ] **Step 5: Commit**

```bash
git add skills-atualizadas/citacao-depoimentos/ skills-atualizadas/dpe-ba-pecas/ skills-atualizadas/institucional/
git commit -m "feat(skills): migrar citacao-depoimentos, dpe-ba-pecas, institucional para skills-atualizadas/"
```

---

### Task 16: Atualizar `cowork_skills.json`

**Files:**
- Modify: `scripts/cowork_skills.json`

Atualizar o campo `referencias` de cada skill para listar os arquivos reais.

- [ ] **Step 1: Atualizar cada skill com a lista real de referencias**

Gerar a lista de references por skill:

```bash
for skill in juri criminal-comum vvd execucao-penal analise-audiencias; do
  echo "\"$skill\": $(ls skills-atualizadas/$skill/references/ 2>/dev/null | jq -R . | jq -s .)"
done
```

- [ ] **Step 2: Editar cowork_skills.json** — preencher campo `referencias` de cada skill

- [ ] **Step 3: Verificar JSON válido**

```bash
python3 -c "import json; json.load(open('scripts/cowork_skills.json')); print('OK')"
```

- [ ] **Step 4: Commit**

```bash
git add scripts/cowork_skills.json
git commit -m "fix(skills): atualizar referencias em cowork_skills.json"
```

---

### Task 17: Criar `skills-atualizadas/README.md`

**Files:**
- Create: `skills-atualizadas/README.md`

Índice das skills com contagem de tipos, referências e cor-tema.

- [ ] **Step 1: Criar README**

```markdown
# Skills da Defensoria — Índice

## Estrutura

\```
skills-atualizadas/
├── _shared/                  # Conteúdo compartilhado (formatação, linguagem, schema)
│   ├── formatacao-dpe-ba.md
│   ├── linguagem-estrategica.md
│   ├── padrao-relatorio.md
│   └── schema-base.md
├── juri/                     # 🟢 Tribunal do Júri (12 refs)
├── vvd/                      # 🟤 Violência Doméstica (13 refs)
├── execucao-penal/           # 🔵 Execução Penal (5 refs)
├── criminal-comum/           # 🔴 Criminal Comum (12 refs)
├── analise-audiencias/       # ⬛ Análise de Audiências (7 refs)
├── citacao-depoimentos/      # Citação de Depoimentos
├── dpe-ba-pecas/             # Peças Processuais Genéricas
└── institucional/            # Documentos Institucionais
\```

## Como funciona

1. SKILL.md define tipos de peça, fluxo de trabalho e payload JSON específico
2. `references/` contém os prompts completos (extraídos dos Gemini Gems)
3. `_shared/` contém formatação DPE-BA, linguagem estratégica e schema base
4. O Cowork Worker (`scripts/cowork_worker.py`) carrega SKILL.md + references para montar o prompt

## Paleta de Cores

| Atribuição | Cor-tema | Hex |
|---|---|---|
| Tribunal do Júri | Verde | `1A5C36` |
| VVD / Maria da Penha | Marrom | `92400E` |
| Execução Penal | Azul | `1E3A8A` |
| Criminal Comum | Vermelho | `991B1B` |
| APF / Plantão | Cinza | `374151` |
```

- [ ] **Step 2: Commit**

```bash
git add skills-atualizadas/README.md
git commit -m "docs(skills): adicionar README.md com índice e estrutura"
```

---

## Resumo de Impacto

| Métrica | Antes | Depois |
|---------|-------|--------|
| Skills em skills-atualizadas/ | 5 | 8 |
| References populados | 0 | 49 |
| Linhas duplicadas (formatação) | ~400 | 0 (referência _shared/) |
| Linhas duplicadas (linguagem) | ~150 | 0 (referência _shared/) |
| cowork_skills.json refs preenchidos | 1 de 8 | 8 de 8 |
| Total linhas SKILL.md (5 core) | ~1.195 | ~600-650 |

## Fora de escopo (próximos sprints)

- `scripts/gerar_docx.py` — precisa ser criado ou verificado
- `assets/dpe_logo.png` — precisa existir no repositório
- Revisar conteúdo dos prompts de referência (qualidade jurídica)
- Atualizar SkillResult component e skills router no OMBUDS
- Migrar skills-cowork restantes (citacoes-seguras, estudo-dpe, noticias, etc.)
