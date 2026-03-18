# Tasks: Toolbar Compacta — Assistidos

## Fase 1: Header Compacto (T-01)
Arquivo: `page.tsx` linhas ~990–1105

| ID | Tarefa | Status |
|----|--------|--------|
| T-01 | Reduzir header: py-8→py-2, remover gradiente, título text-lg, layout horizontal compacto | ✅ |

**Antes:** `relative px-4 sm:px-5 md:px-8 py-5 sm:py-6 md:py-8 bg-white ... border-b` com gradiente absoluto
**Depois:** `flex items-center justify-between px-5 py-2.5 bg-white border-b` sem gradiente, título `text-base font-semibold`, ícone `w-7 h-7`

## Fase 2: Toolbar Unificada (T-02)
Arquivo: `page.tsx` linhas ~1251–1500

| ID | Tarefa | Status |
|----|--------|--------|
| T-02a | Mover alertas (prazos vencidos, audiências hoje) para inline na stats bar como dots/badges | ✅ |
| T-02b | Mover chips de atribuição para a toolbar (mesma linha das stats) | ✅ |
| T-02c | Mover filtros rápidos para segunda linha compacta ou inline com atribuição | ✅ |
| T-02d | Remover o `<Card>` container dos filtros | ✅ |
| T-02e | Integrar Ordenar + toggle grid/tabela na borda direita da toolbar | ✅ |

**Estrutura alvo:**
```
┌─────────────────────────────────────────────────────────────────┐
│ [375] [4🔒⚠] [10📅⚡] [179] │ VVD Júri Exec │ Presos Semana │ ↕ ⊞≡ │
└─────────────────────────────────────────────────────────────────┘
```

Uma única div `flex items-center gap-2 px-4 py-2 border-b bg-white` substituindo:
- stats bar (~48px)
- alertas (~44px)
- card filtros (~160px)

## Critérios de Done
- [ ] Nenhum erro TypeScript
- [ ] Nenhuma funcionalidade quebrada (filtros, stats, alertas, ordenar, toggle)
- [ ] Altura total antes da tabela ≤ 110px
- [ ] Responsivo: funciona em 768px+
