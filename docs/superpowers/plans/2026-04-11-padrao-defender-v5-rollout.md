# Padrão Defender v5 — Rollout Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidar e aplicar o padrão visual v5 (refinamento de qualidade aprovado em 11/04/2026) como o Padrão Defender oficial, em toda a aplicação OMBUDS.

**Architecture:** Rollout em 4 fases com TDD via script de verificação (`scripts/verify-padrao-defender.sh`). Fase 0 estabelece foundation (skill + tokens + plano); Fase 1 faz audit de cores hardcoded em todas as páginas; Fase 2 padroniza estrutura das páginas Grupo 1 (maior visibilidade); Fase 3 aplica a cards/tabelas globais. Cada tarefa tem verificação executável.

**Tech Stack:** React 19, Next.js 15, Tailwind CSS, Lucide icons, bash + ripgrep para verificação.

---

## Padrão Defender v5 — Especificação

### Paleta (HSL 240 2%, praticamente neutra)

| Camada | Hex | HSL | Tailwind equivalente |
|---|---|---|---|
| Sidebar (light mode) | `#3e3e41` | 240 2% 25% | — |
| Sidebar (dark mode) | `#232324` | 240 2% 14% | ≈ zinc-900 |
| Page header container (Row 1) | `#414144` | 240 2% 26% | — |
| Utility bar | `#464649` | 240 2% 28% | — |
| Collapsed bar | `#464649` | 240 2% 28% | — |
| Row 2 (overlay dentro do card) | container + `bg-white/[0.10]` | ≈ l=30% | — |
| Fundo página | `#f5f5f5` | 0 0% 96% | `neutral-100` |
| Cards (conteúdo) | `white` | — | `bg-white` |
| Icon container no Row 1 | `#525252` | 0 0% 32% | — |

### Princípios

1. **HSL 240 2% (barely cool)** — não "azulado", não "warm bege". Luminâncias calibradas pra criar gradiente visível entre sidebar → Row 1 → utility → Row 2.
2. **Shell coeso** — sidebar + utility + page header formam um shell unificado, separado do conteúdo pelo fundo `#f5f5f5`.
3. **Row 1 mais escuro que Row 2** — ancora o título; Row 2 mais clara acolhe filtros/pills.
4. **Bordas crisp `white/[0.08]`** — dá aresta sem escurecer o fill.
5. **Shell shadow** — inset highlight 1px (`rgba(255,255,255,0.05)`) + drop shadow sutil (`0 2px 12px -4px rgba(15,23,42,0.10)`) pra "lift" do fundo claro.
6. **Cores funcionais preservadas** — status dos cards, atribuição, urgência mantêm sua linguagem semântica.
7. **Emerald como assinatura** — só em botões primários (CTA) e estados ativos discretos.

### Estrutura canônica do page header

```tsx
<CollapsiblePageHeader
  title="Nome da Página"
  icon={LucideIcon}        // mesmo ícone da sidebar
  collapsedStats={...}
  collapsedPill={...}
  collapsedSearch={...}
  bottomRow={...}          // Row 2: pills, busca, filtros
>
  {/* Row 1: ícone + título + stats + botões */}
</CollapsiblePageHeader>
```

### Row 1 — template

```tsx
<div className="flex items-center justify-between">
  <div className="flex items-center gap-3">
    <div className="w-9 h-9 rounded-xl bg-[#525252] flex items-center justify-center">
      <PageIcon className="w-4 h-4 text-white" />
    </div>
    <div>
      <h1 className="text-white text-[15px] font-semibold tracking-tight leading-tight">Título</h1>
      <div className="flex items-center gap-1.5 mt-0.5">
        <span className="text-[10px] text-white/55 tabular-nums">N itens</span>
      </div>
    </div>
  </div>
  <div className="flex items-center gap-1.5">
    {/* Botões secundários */}
    <button className="w-8 h-8 rounded-xl bg-white/[0.08] text-white/70 ring-1 ring-white/[0.05] hover:bg-white/[0.14] hover:text-white transition-all duration-150 cursor-pointer flex items-center justify-center" title="Ação">
      <Icon className="w-[15px] h-[15px]" />
    </button>
    {/* Botão primário — emerald OU branco */}
    <button className="h-8 px-3 rounded-xl bg-emerald-500 text-white shadow-sm hover:bg-emerald-600 transition-all duration-150 cursor-pointer flex items-center gap-1.5 text-[11px] font-semibold" title="Nova">
      <Plus className="w-3.5 h-3.5" />
      Nova
    </button>
  </div>
</div>
```

### Row 2 — template

```tsx
<div className="flex items-center gap-2.5 flex-wrap overflow-x-auto scrollbar-none">
  <AtribuicaoPills variant="dark" singleSelect compact ... />
  <div className="w-px h-5 bg-white/[0.10] shrink-0" />
  <div className="hidden sm:flex relative flex-1 max-w-[220px]">
    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40" />
    <input
      className="w-full bg-black/[0.15] ring-1 ring-white/[0.08] rounded-lg py-1.5 pl-7 pr-3 text-[11px] text-white/90 placeholder:text-white/35 outline-none focus:bg-black/[0.25] focus:ring-white/[0.15] transition-all"
    />
  </div>
  <div className="w-px h-5 bg-white/[0.10] shrink-0" />
  <button className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/[0.08] transition-all duration-200 cursor-pointer">
    <Settings className="w-[14px] h-[14px] text-white/50" />
  </button>
</div>
```

### Cards (conteúdo) — template

```tsx
<div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm shadow-black/[0.04] hover:shadow-md hover:shadow-black/[0.08] border border-neutral-200/60 dark:border-neutral-800/60 transition-all duration-200">
  {/* conteúdo */}
</div>
```

### Status badges (com cor funcional)

```tsx
<span
  className="text-[10px] px-2 py-0.5 rounded-md font-semibold border"
  style={{
    backgroundColor: `${groupColor}14`,  // ~8% alpha, fill sutil
    borderColor: `${groupColor}40`,       // ~25% alpha, border visível
    color: groupColor,
  }}
>
  {label}
</span>
```

---

## File Structure

### Files to create

- `scripts/verify-padrao-defender.sh` — verification script (TDD foundation)
- `docs/superpowers/plans/2026-04-11-padrao-defender-v5-rollout.md` — this file

### Files to modify

**Foundation:**
- `.claude/skills/padrao-defender/SKILL.md` — atualizar pra v5
- `.claude/skills/padrao-defender/references/tokens.md` — atualizar valores

**Audit de cores (substituições)**:
- Qualquer `src/app/(dashboard)/admin/*/page.tsx` com hex forbidden
- Qualquer `src/components/**/*.tsx` com hex forbidden

**Padronização estrutural (Grupo 1)**:
- `src/app/(dashboard)/admin/agenda/page.tsx`
- `src/app/(dashboard)/admin/processos/page.tsx`
- `src/app/(dashboard)/admin/dashboard/page.tsx`
- `src/app/(dashboard)/admin/whatsapp/page.tsx`

**Global:**
- Componentes de card reutilizados (DemandaCard, etc.)

---

## Tasks

### Task 1: Criar script de verificação (TDD foundation)

**Files:**
- Create: `scripts/verify-padrao-defender.sh`

- [ ] **Step 1: Escrever o script de verificação**

```bash
#!/usr/bin/env bash
# scripts/verify-padrao-defender.sh
# Verifica compliance com o Padrão Defender v5.
# Exit 0 = compliance OK. Exit 1 = violações detectadas.

set -euo pipefail
cd "$(dirname "$0")/.."

ERRORS=0
CHECK() {
  local label="$1"
  local status="$2"
  if [ "$status" -eq 0 ]; then
    echo "  ✓ $label"
  else
    echo "  ✗ $label"
    ERRORS=$((ERRORS + 1))
  fi
}

echo "=== Padrão Defender v5 — Verification ==="
echo ""
echo "1. Design tokens (HEADER_STYLE valores v5)"

TOKENS_FILE="src/lib/config/design-tokens.ts"
grep -q '"rounded-xl bg-\[#414144\]"' "$TOKENS_FILE" && CHECK "container = #414144" 0 || CHECK "container = #414144" 1
grep -q '"bg-\[#464649\] border-b border-white/\[0.08\]"' "$TOKENS_FILE" && CHECK "utilityRow = #464649 + border white/[0.08]" 0 || CHECK "utilityRow = #464649 + border" 1
grep -q 'collapsedBar: "bg-\[#464649\]' "$TOKENS_FILE" && CHECK "collapsedBar = #464649" 0 || CHECK "collapsedBar = #464649" 1
grep -q 'shellShadow:' "$TOKENS_FILE" && CHECK "shellShadow definido" 0 || CHECK "shellShadow definido" 1

echo ""
echo "2. Sidebar CSS (globals.css)"

CSS_FILE="src/app/globals.css"
grep -q 'background: #3e3e41' "$CSS_FILE" && CHECK ".glass-sidebar = #3e3e41" 0 || CHECK ".glass-sidebar = #3e3e41" 1
grep -q 'background: #232324' "$CSS_FILE" && CHECK ".dark .glass-sidebar = #232324" 0 || CHECK ".dark .glass-sidebar = #232324" 1
grep -q 'background-color: #f5f5f5' "$CSS_FILE" && CHECK ".medium body = #f5f5f5" 0 || CHECK ".medium body = #f5f5f5" 1

echo ""
echo "3. Page wrappers — nenhum hex forbidden nas páginas admin"

FORBIDDEN_HEXES=("#f0f0f0" "#f0f0ee" "#f2f1ef" "#fafafa" "#383838" "#3a3a3a" "#424242" "#f6f7f9" "#33373d" "#3a3e46" "#3c4049" "#41454d" "#1f2229" "#24272e")
ANY_VIOLATION=0
for hex in "${FORBIDDEN_HEXES[@]}"; do
  matches=$(grep -rn "bg-\[${hex}\]" src/app/\(dashboard\)/admin/ --include="*.tsx" 2>/dev/null || true)
  if [ -n "$matches" ]; then
    echo "  ✗ Hex forbidden encontrado: $hex"
    echo "$matches" | sed 's/^/    /'
    ANY_VIOLATION=1
  fi
done
CHECK "Nenhum hex forbidden em páginas" $ANY_VIOLATION

echo ""
echo "4. AtribuicaoPills — sem emerald underline hardcoded"
if grep -q 'bg-emerald-500' src/components/demandas-premium/AtribuicaoPills.tsx; then
  CHECK "AtribuicaoPills sem emerald interno" 1
else
  CHECK "AtribuicaoPills sem emerald interno" 0
fi

echo ""
echo "5. Status badge no kanban — border + bg sutil"
if grep -q '"${groupColor}14"\|borderColor: .*groupColor.*40' src/components/demandas-premium/kanban-premium.tsx; then
  CHECK "Kanban badge usa border + fill sutil" 0
else
  CHECK "Kanban badge usa border + fill sutil" 1
fi

echo ""
if [ $ERRORS -eq 0 ]; then
  echo "✓ Padrão Defender v5 compliance: OK"
  exit 0
else
  echo "✗ $ERRORS violação(ões) detectada(s)"
  exit 1
fi
```

- [ ] **Step 2: Tornar o script executável**

```bash
chmod +x scripts/verify-padrao-defender.sh
```

- [ ] **Step 3: Rodar o script — deve PASSAR nos itens já feitos e possivelmente FALHAR no item 3 (páginas com hex velho)**

```bash
./scripts/verify-padrao-defender.sh
```

Expected: itens 1, 2, 4, 5 passam; item 3 pode falhar se houver páginas com `#f0f0f0`, `#f0f0ee` etc. Isso é esperado — é a base de comparação TDD pras próximas tarefas.

- [ ] **Step 4: Commit**

```bash
git add scripts/verify-padrao-defender.sh docs/superpowers/plans/2026-04-11-padrao-defender-v5-rollout.md
git commit -m "chore: verification script + plan para Padrão Defender v5 rollout"
```

---

### Task 2: Atualizar skill padrao-defender para v5

**Files:**
- Modify: `.claude/skills/padrao-defender/SKILL.md`
- Modify: `.claude/skills/padrao-defender/references/tokens.md`

- [ ] **Step 1: Reescrever SKILL.md com a paleta v5**

Substituir o conteúdo do SKILL.md (ou seção Paleta/Princípios) pelos valores v5. Manter as seções de Row 1, Row 2, Dropdowns, Cards e Textos — já estavam corretas. Mudança crítica:

Tabela Paleta v4 (remover):
```
| Sidebar | `#383838` |
| Utility Bar | `#3a3a3a` |
| Page Header | `#424242` |
| Fundo | `#f0f0f0` |
```

Tabela Paleta v5 (adicionar):
```
| Sidebar light | `#3e3e41` | HSL 240 2% 25% |
| Sidebar dark | `#232324` | HSL 240 2% 14% |
| Page header (Row 1) | `#414144` | HSL 240 2% 26% |
| Utility bar | `#464649` | HSL 240 2% 28% |
| Collapsed | `#464649` | HSL 240 2% 28% |
| Row 2 overlay | `bg-white/[0.10]` (sobre container) | — |
| Page bg | `#f5f5f5` | Tailwind `neutral-100` |
| Icon container | `#525252` | — |
```

Atualizar a seção "Princípios" com:
1. "HSL 240 2% (barely cool) — praticamente neutro, não azulado."
2. "Luminâncias harmonizadas — sidebar (l=25) próxima do utility (l=28); Row 1 (l=26) entre as duas; Row 2 via overlay white/[0.10] (l≈30)."
3. Manter princípios existentes sobre cards, cores funcionais, header colapsável, dropdowns.

- [ ] **Step 2: Atualizar references/tokens.md**

Substituir valores antigos pelos v5 no arquivo de referência. Garantir que todos os exemplos tenham os hexes corretos.

- [ ] **Step 3: Verificar que o script passa o check 1**

```bash
./scripts/verify-padrao-defender.sh
```

Expected: check 1 (Design tokens) continua passando.

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/padrao-defender/
git commit -m "docs: atualizar skill padrao-defender para v5 (HSL 240 2%, luminâncias harmonizadas)"
```

---

### Task 3: Audit — substituir `#f0f0f0` e `#f0f0ee` por `#f5f5f5`

**Files:**
- Modify: todos os arquivos `.tsx` em `src/` que usam `bg-[#f0f0f0]` ou `bg-[#f0f0ee]`

- [ ] **Step 1: Listar todas as ocorrências**

```bash
grep -rn 'bg-\[#f0f0f0\]\|bg-\[#f0f0ee\]' src/ --include="*.tsx" | tee /tmp/v5-audit-f0f0f0.txt
```

- [ ] **Step 2: Substituir em massa usando sed, excluindo o WhatsApp MessageBubble (contexto próprio)**

```bash
# Excluir WhatsApp que tem contexto de chat próprio
files=$(grep -rl 'bg-\[#f0f0f0\]\|bg-\[#f0f0ee\]' src/ --include="*.tsx" | grep -v whatsapp/MessageBubble)
for f in $files; do
  sed -i '' 's/bg-\[#f0f0f0\]/bg-[#f5f5f5]/g; s/bg-\[#f0f0ee\]/bg-[#f5f5f5]/g' "$f"
done
```

- [ ] **Step 3: Verificar no script**

```bash
./scripts/verify-padrao-defender.sh
```

Expected: check 3 passa quanto a `#f0f0f0` e `#f0f0ee`.

- [ ] **Step 4: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | head -5
```

Expected: zero novos erros (só pré-existentes de `instancia-superior.ts`).

- [ ] **Step 5: Commit**

```bash
git add src/
git commit -m "style: Padrão Defender v5 — audit bg [#f0f0f0/#f0f0ee → #f5f5f5]"
```

---

### Task 4: Audit — substituir `#f2f1ef` e `#fafafa` por `#f5f5f5`

**Files:**
- Modify: arquivos `.tsx` que usam `bg-[#f2f1ef]` ou `bg-[#fafafa]` em contextos de page wrapper

- [ ] **Step 1: Listar ocorrências**

```bash
grep -rn 'bg-\[#f2f1ef\]\|bg-\[#fafafa\]' src/ --include="*.tsx" | tee /tmp/v5-audit-warm.txt
```

- [ ] **Step 2: Revisar e substituir apenas os que são page-level bg (não inputs, não badges internos)**

Para cada ocorrência no `/tmp/v5-audit-warm.txt`, abrir o arquivo e verificar o contexto:
- Se é `<div className="min-h-screen bg-[...]">` ou wrapper de página → substituir
- Se é um input/badge/hover state → deixar (contexto próprio)

```bash
# Substituir em page wrappers (min-h-screen context)
files=$(grep -rl 'min-h-screen.*bg-\[#f2f1ef\]\|min-h-screen.*bg-\[#fafafa\]' src/ --include="*.tsx")
for f in $files; do
  sed -i '' 's/bg-\[#f2f1ef\]/bg-[#f5f5f5]/g; s/bg-\[#fafafa\]/bg-[#f5f5f5]/g' "$f"
done
```

- [ ] **Step 3: Verificar script**

```bash
./scripts/verify-padrao-defender.sh
```

- [ ] **Step 4: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | head -5
```

- [ ] **Step 5: Commit**

```bash
git add src/
git commit -m "style: Padrão Defender v5 — audit bg [#f2f1ef/#fafafa → #f5f5f5]"
```

---

### Task 5: Audit — substituir hexes antigos do shell (`#383838`, `#3a3a3a`, `#424242`)

**Files:**
- Modify: arquivos que referenciam os hexes antigos do shell hardcoded fora do design-tokens/globals.css

- [ ] **Step 1: Listar ocorrências**

```bash
grep -rn 'bg-\[#383838\]\|bg-\[#3a3a3a\]\|bg-\[#424242\]\|bg-\[#3e3e3e\]' src/ --include="*.tsx" --include="*.ts" | tee /tmp/v5-audit-shell.txt
```

- [ ] **Step 2: Substituir por v5 ou token apropriado**

| Antigo | Novo |
|---|---|
| `#383838` | `#3e3e41` (sidebar) |
| `#3a3a3a` | `#464649` (utility) |
| `#424242` | `#414144` (page header) |
| `#3e3e3e` | `#464649` (collapsed) |

```bash
for f in $(grep -rl 'bg-\[#383838\]\|bg-\[#3a3a3a\]\|bg-\[#424242\]\|bg-\[#3e3e3e\]' src/ --include="*.tsx"); do
  sed -i '' \
    -e 's/bg-\[#383838\]/bg-[#3e3e41]/g' \
    -e 's/bg-\[#3a3a3a\]/bg-[#464649]/g' \
    -e 's/bg-\[#424242\]/bg-[#414144]/g' \
    -e 's/bg-\[#3e3e3e\]/bg-[#464649]/g' \
    "$f"
done
```

- [ ] **Step 3: Verificar script**

```bash
./scripts/verify-padrao-defender.sh
```

- [ ] **Step 4: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | head -5
```

- [ ] **Step 5: Commit**

```bash
git add src/
git commit -m "style: Padrão Defender v5 — audit shell hexes antigos → v5"
```

---

### Task 6: Audit — outros hexes anteriores do experimento azulado

**Files:**
- Modify: qualquer arquivo que referencie `#33373d`, `#3a3e46`, `#3c4049`, `#41454d`, `#1f2229`, `#24272e`, `#f6f7f9`

- [ ] **Step 1: Listar ocorrências**

```bash
grep -rn 'bg-\[#33373d\]\|bg-\[#3a3e46\]\|bg-\[#3c4049\]\|bg-\[#41454d\]\|bg-\[#1f2229\]\|bg-\[#24272e\]\|bg-\[#f6f7f9\]' src/ --include="*.tsx" --include="*.ts" | tee /tmp/v5-audit-blue.txt
```

- [ ] **Step 2: Substituir para v5**

| Antigo (azulado) | Novo (v5) |
|---|---|
| `#33373d` | `#3e3e41` |
| `#3a3e46` | `#3e3e41` |
| `#3c4049` | `#414144` |
| `#41454d` | `#464649` |
| `#1f2229` | `#232324` |
| `#24272e` | `#232324` |
| `#f6f7f9` | `#f5f5f5` |

```bash
for f in $(grep -rl 'bg-\[#33373d\]\|bg-\[#3a3e46\]\|bg-\[#3c4049\]\|bg-\[#41454d\]\|bg-\[#1f2229\]\|bg-\[#24272e\]\|bg-\[#f6f7f9\]' src/ --include="*.tsx" --include="*.ts"); do
  sed -i '' \
    -e 's/bg-\[#33373d\]/bg-[#3e3e41]/g' \
    -e 's/bg-\[#3a3e46\]/bg-[#3e3e41]/g' \
    -e 's/bg-\[#3c4049\]/bg-[#414144]/g' \
    -e 's/bg-\[#41454d\]/bg-[#464649]/g' \
    -e 's/bg-\[#1f2229\]/bg-[#232324]/g' \
    -e 's/bg-\[#24272e\]/bg-[#232324]/g' \
    -e 's/bg-\[#f6f7f9\]/bg-[#f5f5f5]/g' \
    "$f"
done
```

- [ ] **Step 3: Verificar script — check 3 deve passar completo agora**

```bash
./scripts/verify-padrao-defender.sh
```

Expected: check 3 PASSA.

- [ ] **Step 4: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | head -5
```

- [ ] **Step 5: Commit**

```bash
git add src/
git commit -m "style: Padrão Defender v5 — audit hexes v4-experimental → v5"
```

---

### Task 7: Grupo 1 — Padronizar Agenda

**Files:**
- Modify: `src/app/(dashboard)/admin/agenda/page.tsx`

- [ ] **Step 1: Ler seções do arquivo — wrapper, Row 1 e Row 2**

```bash
grep -n 'min-h-screen\|CollapsiblePageHeader\|bg-\[#525252\]\|bottomRow' src/app/\(dashboard\)/admin/agenda/page.tsx | head -30
```

- [ ] **Step 2: Verificar wrapper**

Garantir que a linha do wrapper externo usa `bg-[#f5f5f5]` ou `bg-neutral-100` (ambos aceitáveis).
- Se usar `bg-neutral-100`, deixar.
- Se usar outro, trocar para `bg-[#f5f5f5]`.

- [ ] **Step 3: Verificar Row 1 — ícone, título, stats, botões seguem template canônico**

Checklist:
- [ ] Ícone em container `w-9 h-9 rounded-xl bg-[#525252]` com ícone Lucide `w-4 h-4 text-white`
- [ ] Título `text-white text-[15px] font-semibold tracking-tight leading-tight`
- [ ] Stats `text-[10px] text-white/55 tabular-nums`
- [ ] Botões secundários `w-8 h-8 rounded-xl bg-white/[0.08] text-white/70 ring-1 ring-white/[0.05]`
- [ ] Botão primário (se houver "Novo") emerald

Ajustar somente o que não bater.

- [ ] **Step 4: Verificar Row 2 — pills, separadores, busca, settings**

Checklist:
- [ ] Separador `w-px h-5 bg-white/[0.10] shrink-0`
- [ ] Busca (se houver) `bg-black/[0.15] ring-1 ring-white/[0.08] rounded-lg`
- [ ] Pills usam `<AtribuicaoPills variant="dark" singleSelect />`
- [ ] Settings button `w-7 h-7 rounded-lg hover:bg-white/[0.08]`

- [ ] **Step 5: Rodar script + typecheck**

```bash
./scripts/verify-padrao-defender.sh && npx tsc --noEmit 2>&1 | grep -E "error TS" | head -5
```

- [ ] **Step 6: Commit**

```bash
git add src/app/\(dashboard\)/admin/agenda/
git commit -m "style(agenda): Padrão Defender v5 — Row 1/Row 2 padronizados"
```

---

### Task 8: Grupo 1 — Padronizar Processos

**Files:**
- Modify: `src/app/(dashboard)/admin/processos/page.tsx`

- [ ] **Step 1-6: Mesmo roteiro da Task 7, aplicado a Processos**

Aplicar o checklist Row 1 / Row 2 da Task 7. Ícone: `FileText` (confirmar consistente com sidebar).

- [ ] **Step 7: Commit**

```bash
git add src/app/\(dashboard\)/admin/processos/
git commit -m "style(processos): Padrão Defender v5 — Row 1/Row 2 padronizados"
```

---

### Task 9: Grupo 1 — Padronizar Dashboard

**Files:**
- Modify: `src/app/(dashboard)/admin/dashboard/page.tsx`

- [ ] **Step 1-6: Mesmo roteiro, ícone `LayoutDashboard`**

- [ ] **Step 7: Commit**

```bash
git add src/app/\(dashboard\)/admin/dashboard/
git commit -m "style(dashboard): Padrão Defender v5 — Row 1/Row 2 padronizados"
```

---

### Task 10: Grupo 1 — Padronizar WhatsApp

**Files:**
- Modify: `src/app/(dashboard)/admin/whatsapp/page.tsx`

- [ ] **Step 1-6: Mesmo roteiro, ícone `MessageCircle`**

- [ ] **Step 7: Commit**

```bash
git add src/app/\(dashboard\)/admin/whatsapp/
git commit -m "style(whatsapp): Padrão Defender v5 — Row 1/Row 2 padronizados"
```

---

### Task 11: Auditar cards globais (shadow + rounded + border)

**Files:**
- Modify: componentes de card em `src/components/` que não seguem o padrão

- [ ] **Step 1: Identificar componentes de card sem o padrão**

```bash
grep -rn 'rounded-lg\|rounded-xl' src/components/demandas-premium/DemandaCard.tsx src/components/demandas-premium/DemandaCompactView.tsx | head -20
```

- [ ] **Step 2: Auditar e alinhar os cards reutilizáveis**

Checklist por componente:
- [ ] Outer: `bg-white dark:bg-neutral-900 rounded-xl`
- [ ] Shadow: `shadow-sm shadow-black/[0.04] hover:shadow-md hover:shadow-black/[0.08]`
- [ ] Border: `border border-neutral-200/60 dark:border-neutral-800/60`

Kanban cards do `kanban-premium.tsx` já seguem esse padrão (confirmado na conversa anterior — border usa `groupColor` funcional, shadow refinada). **Não mexer.**

- [ ] **Step 3: Typecheck + script**

```bash
./scripts/verify-padrao-defender.sh && npx tsc --noEmit 2>&1 | grep -E "error TS" | head -5
```

- [ ] **Step 4: Commit**

```bash
git add src/components/
git commit -m "style(cards): Padrão Defender v5 — shadow/border refinados em cards globais"
```

---

### Task 12: Review final e cleanup

**Files:**
- Audit completo

- [ ] **Step 1: Varredura final por hexes forbidden**

```bash
./scripts/verify-padrao-defender.sh
```

Expected: TODOS os checks passam.

- [ ] **Step 2: Typecheck final**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | wc -l
```

Expected: só erros pré-existentes não-relacionados.

- [ ] **Step 3: Build de sanidade**

```bash
npm run build 2>&1 | tail -20
```

Expected: build completa sem erros novos.

- [ ] **Step 4: Commit de cleanup (se houver)**

```bash
git status && git add -A && git commit -m "chore: cleanup final — Padrão Defender v5 rollout completo"
```

---

## Dependencies

- Task 1 → todas as outras (foundation do TDD)
- Task 2 → pode rodar em paralelo com Tasks 3-6 (doc only)
- Tasks 3-6 → sequenciais entre si (mesmo script de audit, commits incrementais)
- Tasks 7-10 → paralelizáveis entre si (páginas independentes)
- Task 11 → depende de 7-10 estarem prontas? Não — pode rodar em paralelo
- Task 12 → depende de todas

**Parallel opportunities:**
- Task 2 paralelo com Tasks 3-6
- Tasks 7, 8, 9, 10 paralelos entre si (4 subagentes)
- Task 11 paralelo com Tasks 7-10

---

## Self-Review Checklist

**1. Spec coverage:** ✓
- Foundation (skill + tokens + plano): Tasks 1, 2
- Audit hexes forbidden: Tasks 3, 4, 5, 6
- Padronização estrutural Grupo 1: Tasks 7, 8, 9, 10
- Cards globais: Task 11
- Final verification: Task 12

**2. Placeholder scan:** ✓ Zero "TBD", "implement later" etc. Todo passo tem comando ou código.

**3. Type consistency:** ✓ Hexes v5 consistentes em todas as tasks.

---

## Notes

- O design-tokens.ts e globals.css já foram atualizados para v5 na sessão anterior — a Task 1 verifica isso.
- O kanban-premium.tsx já tem o status badge refinado (border + fill sutil) — não precisa ser re-editado.
- A AtribuicaoPills.tsx já teve o emerald underline revertido — Task 1 verifica isso.
- Grupo 2, Grupo 3 e Grupo 4 do plano v4 original NÃO estão incluídos nesta rodada — serão tratados em rollout posterior depois que Grupo 1 for validado visualmente.
