# Design: Mapas — Radar, Cadastro e VVD/MPU

**Data:** 2026-03-20
**Status:** Aprovado pelo usuário

---

## 1. Radar Map — Donut Clusters + Dissolução Antecipada

### Problema
Clusters laranja genéricos forçam zoom para ver os crimes individuais. Usuário perde a visão panorâmica.

### Solução
Combinar dissolução antecipada (zoom menor) com clusters informativos por tipo de crime (donut SVG).

### Mudanças em `radar-mapa-leaflet.tsx`

```
maxClusterRadius: 50 → 20       (clusters menores, menos agrupamento)
disableClusteringAtZoom: 14     (dots individuais a partir do zoom 14)
```

### Ícone do Cluster — Donut SVG

- Círculo 36px
- Borda segmentada em arcos SVG proporcionais a cada `tipoCrime` presente no cluster
- Centro branco com número de ocorrências em bold
- Gerado via `iconCreateFunction` (inspeciona markers filhos, agrupa por tipoCrime, calcula ângulos)
- Zero dependências novas

**Exemplo:** cluster com 6 homicídios + 4 tráficos → arco vermelho 60% + arco roxo 40%, "10" no centro.

**Cores dos arcos** (já definidas em `radar-filtros.tsx`):
| Crime | Hex |
|-------|-----|
| homicidio | #ef4444 |
| tentativa_homicidio | #f97316 |
| trafico | #a855f7 |
| roubo | #3b82f6 |
| furto | #eab308 |
| violencia_domestica | #ec4899 |
| sexual | #d946ef |
| lesao_corporal | #f59e0b |
| porte_arma | #64748b |
| estelionato | #14b8a6 |
| outros | #71717a |

---

## 2. Mapa de Cadastro — Visão Geral de Processos e Atendimentos

### Localização
Nova aba "Mapa" em `/admin/cadastro` (ou rota `/admin/cadastro/mapa`).

### Camadas

| Camada | Ícone | Cor | Localização |
|--------|-------|-----|-------------|
| Processos | círculo sólido 10px | por atribuição (ver abaixo) | `local_do_fato` do processo |
| Atendimentos | quadrado 8px | zinc-500 (opacidade 60%) | endereço do assistido |
| Sem geocode | não exibe | — | aguarda enriquecimento |

### Cores por Atribuição (tokens já existentes no sistema)

| Atribuição | Cor | Token Tailwind |
|------------|-----|----------------|
| JURI_CAMACARI (Tribunal do Júri) | verde | `green-600` |
| GRUPO_JURI (Grupo Especial do Júri) | laranja | `orange-600` |
| VVD_CAMACARI (Violência Doméstica) | âmbar | `amber-600` |
| EP (Execução Penal) | azul | `blue-600` |
| SUBSTITUICAO (Substituição Criminal) | vermelho | `rose-600` |
| SUBSTITUICAO_CIVEL (Cível/Curadoria) | roxo | `violet-600` |

Referência: `src/components/demandas-premium/demandas-premium-view.tsx` (linhas 154-157).

### Filtros
- Toggle por atribuição
- Toggle processos / atendimentos
- Filtro por defensor responsável

### Geocoding de Endereços — 2 Fases

**Fase 1 (imediato):**
- Campo `local_do_fato` editável no processo (endereço texto)
- Ao salvar → enrichment engine faz geocoding via Nominatim → persiste `lat`/`lng` na tabela `processos`

**Fase 2 (automação futura):**
- Job no enrichment engine varre processos sem `lat/lng`
- Tenta extrair endereço do PDF no Drive
- Se não achar → busca no PJe pelo número do processo

---

## 3. Mapa VVD/MPU — Zonas de Restrição

### Localização
Aba "Mapa" dentro da especialidade VVD (`/admin/vvd/mapa`).

### Camadas por Caso MPU

| Elemento | Visual | Dado |
|----------|--------|------|
| Residência da vítima (assistida) | ícone casa — amber-600 | endereço cadastrado no assistido |
| Local do fato | círculo sólido — rose-600 | `local_do_fato` do processo |
| Residência do agressor | ícone pessoa — zinc-500 | campo no caso VVD |
| Local de trabalho do agressor | ícone briefcase — zinc-500 | campo no caso VVD |
| Raio de restrição | círculo translúcido — rose-500/20%, borda rose-500 | `raio_restricao_metros` (manual) |

### Interação
- Clique em marcador → painel lateral: nome da assistida, nº processo, status MPU, distância, validade
- Toggle por camada (residência / fato / raio)
- Filtro por status MPU: ativa, expirada, sem decisão

### Campo `raio_restricao_metros`
- Entrada manual pelo defensor na tela do caso VVD
- Valor em metros (ex: 200, 300, 500)
- Renderizado via `L.circle(latlng, { radius: metros })` no Leaflet

### Fase 2 (futura)
- Enrichment engine extrai distância da decisão judicial (PDF) automaticamente
- Preenche `raio_restricao_metros` via regex/NLP no texto da decisão

---

## Componentes a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/components/radar/radar-mapa-leaflet.tsx` | Modificar: donut cluster icon + maxClusterRadius + disableClusteringAtZoom |
| `src/components/cadastro/cadastro-mapa-leaflet.tsx` | Criar: mapa de processos/atendimentos |
| `src/app/(dashboard)/admin/cadastro/mapa/page.tsx` | Criar: página do mapa de cadastro |
| `src/components/vvd/vvd-mapa-leaflet.tsx` | Criar: mapa VVD com zonas de restrição |
| `src/app/(dashboard)/admin/vvd/mapa/page.tsx` | Criar: página do mapa VVD |
| `src/lib/db/schema/vvd.ts` | Modificar: adicionar campo `raio_restricao_metros` |
| `src/lib/db/schema/core.ts` | Modificar: adicionar campos `local_do_fato_lat/lng` em processos (se não existirem) |

---

## Dependências Técnicas

- **Leaflet + MarkerCluster**: já instalados
- **Nominatim API**: geocoding gratuito via OpenStreetMap (sem chave de API)
- **SVG inline**: donut cluster via string template — sem libs adicionais
- `L.circle()`: já disponível no Leaflet para raio de restrição
