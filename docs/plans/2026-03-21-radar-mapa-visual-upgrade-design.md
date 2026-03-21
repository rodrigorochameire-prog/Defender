# Design: Radar Map — Visual Upgrade

**Data:** 2026-03-21
**Status:** Aprovado pelo usuário

---

## 1. Mapa Base

Trocar OpenStreetMap por **CartoDB Positron** — fundo neutro, ruas em cinza suave.
Marcadores passam a ter muito mais contraste e destaque visual.

```
https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png
```

---

## 2. Sistema de Cores Semântico

| Grupo | Crimes | Cor | Hex |
|-------|--------|-----|-----|
| **Júri** | Homicídio, Tentativa, Feminicídio | Verde | `#15803d` |
| **VD** | Violência Doméstica | Âmbar | `#b45309` |
| **Execução Penal** | Crimes em cumprimento de pena | Azul | `#1d4ed8` |
| Tráfico | — | Vermelho | `#dc2626` |
| Roubo | — | Laranja escuro | `#c2410c` |
| Lesão Corporal | — | Rosa | `#be185d` |
| Sexual | — | Roxo | `#7c3aed` |
| Furto | — | Laranja claro | `#ea580c` |
| Porte de Arma | — | Rosa claro | `#db2777` |
| Estelionato | — | Lilás | `#a21caf` |
| Outros | — | Zinco | `#52525b` |

---

## 3. Marcadores Diferenciados (3 Níveis)

### Nível 1 — Crimes do Júri (verde, 16px + anel)
- Círculo 16px verde sólido
- Anel externo 24px (1.5px, verde translúcido)
- Se ocorrência < 72h: anel pulsa com CSS animation (2s loop, `@keyframes pulse-ring`)

### Nível 2 — Violência Doméstica (âmbar, losango)
- Losango SVG 14px (quadrado rotacionado 45°)
- Forma única, impossível confundir

### Nível 3 — Demais crimes (círculos, tamanho por risco)
- Tráfico / Roubo: 12px
- Lesão / Sexual / Furto: 10px
- Porte / Estelionato / Outros: 8px
- Todos: borda branca 1.5px + sombra sutil

---

## 4. Clusters com Escala

| Count | Tamanho | Extra |
|-------|---------|-------|
| ≤ 10 | 36px | — |
| 11–50 | 44px | fonte maior |
| > 50 | 54px | borda externa fina |

Clusters com crimes do júri → arco verde pulsa suavemente.

---

## 5. Heatmap Ponderado por Gravidade

| Crime | Peso |
|-------|------|
| Homicídio / Tentativa / Feminicídio | 5 |
| Sexual (estupro) | 4 |
| Tráfico / Roubo | 3 |
| Violência Doméstica | 2 |
| Lesão Corporal / Execução Penal | 2 |
| Furto / Porte / Estelionato / Outros | 1 |

Gradiente: azul frio → ciano → verde → âmbar → vermelho

---

## 6. Legenda Agrupada e Colapsável

Posição: bottom-right. Três grupos com símbolo correspondente ao marcador:
- Grupo Júri (anel + ponto verde)
- Violência Doméstica (losango âmbar)
- Outros Delitos (mini grid com cor de cada tipo)

Botão [−] colapsa para só o título.

---

## 7. Schema — Novos Valores de Enum

```sql
ALTER TYPE tipo_crime_radar ADD VALUE IF NOT EXISTS 'feminicidio';
ALTER TYPE tipo_crime_radar ADD VALUE IF NOT EXISTS 'execucao_penal';
```

Não quebra dados existentes.

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/radar/radar-mapa-leaflet.tsx` | Tudo acima |
| `src/components/radar/radar-filtros.tsx` | Sincronizar cores + novos tipos |
| `src/lib/db/schema/enums.ts` | Adicionar feminicidio + execucao_penal |
| `supabase/migrations/YYYYMMDD_radar_enum.sql` | ALTER TYPE |
