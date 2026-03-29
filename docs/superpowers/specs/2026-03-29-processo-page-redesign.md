# Redesign da Página do Processo — Padrão Defender v2

**Data:** 2026-03-29
**Status:** Aprovado
**Princípios:** Hierarquia clara, respiração, progressive disclosure, tamanhos adequados, cor com propósito

---

## Objetivo

Redesenhar a página de detalhe do processo para ser clean, organizada, sofisticada. Eliminar poluição visual, criar hierarquia clara, integrar análise como hub central, e tornar o Mapa investigativo o diferencial da aplicação.

---

## 1. Estrutura Geral

### De 11 abas → 5 abas + subabas

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  AP 8013165-06.2024.8.05.0039                          │
│                                                         │
│  Gabriel Gomes de Jesus · Preso                        │
│  Diego Bonfim Almeida · Solto                          │
│                                                         │
│  Júri · Vara do Júri e Exec. Penais · Camaçari         │
│                                                         │
│  📅 Instrução — 15/04 às 14h (em 18 dias)              │
│                                                         │
│  [Analisar Autos] [Gerar Peça] [Preparar Audiência]    │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Análise    Demandas    Agenda    Documentos  Vinculados │
│  ━━━━━━━                                               │
│                                                         │
│  ┌Resumo┐  Partes  Depoimentos  Timeline  Teses  Mapa  │
│                                                         │
│  [conteúdo da subaba]                                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Cabeçalho

### Layout

```
Linha 1: Número do processo (20px, monospace, zinc-900)
Linha 2: Assistidos como chips clicáveis, cada um com badge prisional
Linha 3: Atribuição · Vara · Comarca (14px, zinc-500)
Linha 4: Próxima audiência — destaque se < 7 dias (amber), < 3 dias (red)
Linha 5: Botões Cowork (Analisar, Gerar Peça, Preparar Audiência)
```

### Assistidos como chips

```tsx
<div className="flex flex-wrap gap-2">
  {assistidos.map(a => (
    <Link href={`/admin/assistidos/${a.id}`}>
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
                      border border-zinc-200 dark:border-zinc-700
                      hover:border-emerald-300 transition-colors">
        <span className="text-sm font-medium">{a.nome}</span>
        <Badge variant={a.preso ? "danger" : "success"} className="text-[10px]">
          {a.preso ? "Preso" : "Solto"}
        </Badge>
      </div>
    </Link>
  ))}
</div>
```

### Próxima audiência

```tsx
<div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
  diasAte < 3 ? "bg-red-50 dark:bg-red-950/20 text-red-700" :
  diasAte < 7 ? "bg-amber-50 dark:bg-amber-950/20 text-amber-700" :
  "bg-zinc-50 dark:bg-zinc-900 text-zinc-600"
}`}>
  <Calendar className="h-4 w-4" />
  <span className="text-sm font-medium">{tipoAudiencia}</span>
  <span className="text-sm">— {dataFormatada}</span>
  <span className="text-xs text-muted-foreground">(em {diasAte} dias)</span>
</div>
```

### O que SAI do cabeçalho
- Mini-KPIs inline (vão para Análise > Resumo)
- Defensor responsável (vai para dados do processo)
- Botões Solar, DataJud (vão para menu "..." no canto)
- Badge de fase (vai para Análise > Resumo)

---

## 3. Abas Principais

### Estilo visual
- Texto: 14px, font-medium
- Ativo: border-bottom 2px emerald-500, text-zinc-900
- Inativo: text-zinc-400, hover:text-zinc-600
- Espaçamento: gap-6 entre abas
- Altura da barra: 44px

### As 5 abas

| Aba | Conteúdo | Ícone |
|-----|----------|-------|
| **Análise** | Hub central — subabas | Brain |
| **Demandas** | Tarefas, prazos, status | ListTodo |
| **Agenda** | Audiências passadas e futuras | Calendar |
| **Documentos** | Google Drive, peças, autos | FolderOpen |
| **Vinculados** | Processos associados (IP, APF, corréus) | Link2 |

---

## 4. Aba Análise (Hub Central)

### Subabas (pills)

Estilo diferente das abas principais para evitar confusão:
- Texto: 12px
- Ativo: bg-zinc-100 dark:bg-zinc-800, rounded-full, text-zinc-900
- Inativo: text-zinc-400, hover:bg-zinc-50
- Formato: pill/chip (rounded-full, px-3 py-1)
- Espaçamento: gap-1.5

### 6 subabas

#### 4.1 Resumo
O mais importante — visão executiva do caso.

```
┌─────────────────────────────────────────────┐
│                                             │
│  [Radar Liberdade: PRESO — Urgência ALTA]   │
│                                             │
│  ┌─ KPIs ──────────────────────────────┐    │
│  │ 4 Pessoas  2 Acusações  12 Docs     │    │
│  │ 8 Eventos  3 Nulidades              │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Crime: Homicídio Qualificado (art 121 §2)  │
│                                             │
│  Resumo dos fatos (3-5 linhas)...           │
│                                             │
│  ┌─ Estratégia ────────────────────────┐    │
│  │ Legítima defesa + negativa de       │    │
│  │ autoria. Fragilidade probatória...  │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Achados-chave (3 bullets)                  │
│  Recomendações (3 bullets)                  │
│  Inconsistências (3 bullets)                │
│                                             │
│  ┌─ Saneamento ────────────────────────┐    │
│  │ • Ciência de decisão — sem prazo    │    │
│  │ • Resposta à acusação — 15/04       │    │
│  └─────────────────────────────────────┘    │
│                                             │
└─────────────────────────────────────────────┘
```

#### 4.2 Partes
Pessoas do caso com papéis e informações.

```
┌─────────────────────────────────────────────┐
│                                             │
│  ACUSADOS                                   │
│  ┌──────────────────────────────────────┐   │
│  │ Gabriel Gomes de Jesus     [Preso]   │   │
│  │ Homicídio Qualificado               │   │
│  │ 📞 (71) 99999-0000                  │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  VÍTIMA                                     │
│  ┌──────────────────────────────────────┐   │
│  │ Frank Marley da Silva     [Falecido] │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  TESTEMUNHAS DE ACUSAÇÃO                    │
│  ┌──────────────────────────────────────┐   │
│  │ Andreza Santos            [Vizinha]  │   │
│  │ ⚡ 3 perguntas sugeridas            │   │
│  │ ⚠ 1 contradição encontrada         │   │
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │ Givaldo Souza              [PM]     │   │
│  │ ⚡ 2 perguntas sugeridas            │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  TESTEMUNHAS DE DEFESA                      │
│  (nenhuma cadastrada)                       │
│  [+ Adicionar testemunha]                   │
│                                             │
└─────────────────────────────────────────────┘
```

#### 4.3 Depoimentos
Análise cruzada de depoimentos com contradições.

```
┌─────────────────────────────────────────────┐
│                                             │
│  Andreza Santos — Vizinha (Acusação)         │
│  ────────────────────────────────────────   │
│  Resumo: "Declarou que ouviu disparos..."   │
│                                             │
│  ⚠ CONTRADIÇÃO                             │
│  Delegacia: "Estava na janela"              │
│  Juízo: "Estava na porta"                   │
│                                             │
│  ⚡ Perguntas sugeridas:                    │
│  1. De que posição exatamente a Sra...      │
│  2. A que distância estava do local...      │
│                                             │
│  ─────────────────────────────────────────  │
│                                             │
│  Givaldo Souza — PM (Acusação)              │
│  ...                                        │
│                                             │
└─────────────────────────────────────────────┘
```

#### 4.4 Timeline
Cronologia unificada: fatos + movimentações processuais.

```
┌─────────────────────────────────────────────┐
│                                             │
│  ● 15/01/2024  Fato: Homicídio na Rua X    │
│  │                                          │
│  ● 16/01/2024  IP instaurado               │
│  │                                          │
│  ● 20/01/2024  Prisão em flagrante         │
│  │                                          │
│  ● 05/02/2024  Denúncia oferecida          │
│  │                                          │
│  ● 20/02/2024  Citação do réu              │
│  │                                          │
│  ● 15/03/2024  Audiência de instrução       │
│  │              (4 testemunhas ouvidas)     │
│  │                                          │
│  ○ 15/04/2025  Próxima audiência (futuro)   │
│                                             │
└─────────────────────────────────────────────┘
```

#### 4.5 Teses & Nulidades
Argumentos defensivos organizados.

```
┌─────────────────────────────────────────────┐
│                                             │
│  TESES DEFENSIVAS                           │
│                                             │
│  1. Legítima defesa (principal)             │
│     Fundamentação: art. 25 CP...           │
│                                             │
│  2. Negativa de autoria (subsidiária)       │
│     Fundamentação: fragilidade...           │
│                                             │
│  ─────────────────────────────────────────  │
│                                             │
│  NULIDADES / ILEGALIDADES                   │
│                                             │
│  🔴 ALTA — Reconhecimento sem art. 226     │
│     Procedimento sem alinhamento...         │
│     Fund: art. 157 CPP + HC 598.886/SC     │
│                                             │
│  🟡 MÉDIA — Busca pessoal sem fundada...   │
│     art. 244 CPP...                        │
│                                             │
│  ─────────────────────────────────────────  │
│                                             │
│  MATRIZ DE GUERRA                           │
│                                             │
│  Pontos Fortes          Pontos Fracos       │
│  ✅ Sem testemunha      ❌ Confissão em     │
│     presencial            flagrante         │
│  ✅ Laudo inconclusivo  ❌ Vítima conhecida │
│                                             │
└─────────────────────────────────────────────┘
```

#### 4.6 Mapa

**Modo simples (padrão):**
```
┌─────────────────────────────────────────────┐
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │                                     │    │
│  │         [MAPA INTERATIVO]           │    │
│  │                                     │    │
│  │    📍 Local do fato                 │    │
│  │    🏠 Residência do assistido       │    │
│  │    👤 Testemunha 1 (onde disse      │    │
│  │       que estava)                   │    │
│  │    📹 Câmera de segurança          │    │
│  │                                     │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Legenda: 📍Fato  🏠Residências  👤Pessoas │
│           📹Câmeras  🚗Rotas               │
│                                             │
│  [Modo Investigativo →]                     │
│                                             │
└─────────────────────────────────────────────┘
```

**Modo investigativo (expandido):**
```
┌─────────────────────────────────────────────┐
│                                             │
│  ┌─────────────────────┐ ┌──────────────┐  │
│  │                     │ │ Andreza      │  │
│  │   [MAPA GRANDE]     │ │ "Estava na   │  │
│  │                     │ │  janela"     │  │
│  │   Linhas conectando │ │              │  │
│  │   pessoas ↔ locais  │ │ ⚠ Distância │  │
│  │                     │ │   incompatível│ │
│  │   Filtro temporal:  │ │   com visão  │  │
│  │   ◀ 15/01 18:00 ▶  │ │              │  │
│  │                     │ │ [Ver depoim.]│  │
│  └─────────────────────┘ └──────────────┘  │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 5. Aba Demandas

Mantém o layout atual mas com tipografia e espaçamento corrigidos.

```
┌─────────────────────────────────────────────┐
│                                             │
│  3 pendentes · 2 vencendo · 5 concluídas    │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │ 🔴 Alegações Finais     Prazo: 05/04│   │
│  │    Status: 2 - Elaborar             │   │
│  │    Delegado: Taissa                 │   │
│  │    [Abrir] [Ciência] [Delegar]      │   │
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │ 🟡 RESE                  Prazo: 12/04│   │
│  │    Status: 5 - Fila                 │   │
│  │    [Abrir] [Delegar]                │   │
│  └──────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 6. Aba Vinculados

Cards com contexto — cada processo associado mostra tipo, número, status e dados relevantes.

```
┌─────────────────────────────────────────────┐
│                                             │
│  PROCESSOS VINCULADOS (3)                   │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │ IP 8012813-48.2024.8.05.0039        │   │
│  │ Inquérito Policial                   │   │
│  │ 3 depoimentos · 2 laudos            │   │
│  │ Status: Concluído → Denúncia        │   │
│  │ [Abrir] [Ver documentos]            │   │
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │ APF 8139522-14.2025.8.05.0001       │   │
│  │ Auto de Prisão em Flagrante         │   │
│  │ 1 depoimento · Flagrante lavrado    │   │
│  │ [Abrir] [Ver documentos]            │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  Dados dos vinculados integrados na aba     │
│  Análise (depoimentos, timeline, etc.)      │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 7. Design System — Padrão Defender v2

### Tipografia

| Nível | Tamanho | Peso | Uso |
|-------|---------|------|-----|
| H1 | 24px (text-2xl) | bold | Número do processo |
| H2 | 20px (text-xl) | semibold | Título de seção (TESES DEFENSIVAS) |
| H3 | 16px (text-base) | semibold | Subtítulo (Nome da testemunha) |
| Body | 14px (text-sm) | regular | Texto geral, resumos |
| Small | 12px (text-xs) | regular | Metadados, subabas pills |
| Caption | 11px | regular | Datas, versão do modelo |
| Mono | 14px monospace | regular | Números de processo, CPF |

**Regra: nada abaixo de 11px. Seção headers NUNCA abaixo de 16px.**

### Espaçamento (grid de 8px)

| Token | Valor | Uso |
|-------|-------|-----|
| gap-1 | 4px | Ícone + texto no botão |
| gap-2 | 8px | Entre items em lista |
| gap-3 | 12px | Dentro de cards |
| gap-4 | 16px | Entre cards |
| gap-6 | 24px | Entre seções |
| gap-8 | 32px | Entre áreas da página |

### Cores

| Função | Cor | Uso |
|--------|-----|-----|
| Primária | Emerald-500 | Ações, aba ativa, hover |
| Neutra | Zinc-100/800 | Backgrounds, borders |
| Texto | Zinc-900/100 | Texto principal |
| Texto secundário | Zinc-500 | Metadados |
| Perigo | Red-500 | Preso, prazo vencido, nulidade alta |
| Alerta | Amber-500 | Prazo próximo, nulidade média |
| Sucesso | Emerald-500 | Solto, concluído |
| IA/Cowork | Violet-500 | Botões Cowork, badge IA |
| Informação | Blue-500 | Links, teses |

### Componentes

**Abas principais:**
```
text-sm font-medium text-zinc-400 hover:text-zinc-600
border-b-2 border-transparent
[ativo]: text-zinc-900 border-emerald-500
gap-6, h-11
```

**Subabas (pills):**
```
text-xs px-3 py-1 rounded-full text-zinc-400
hover:bg-zinc-50 dark:hover:bg-zinc-800
[ativo]: bg-zinc-100 dark:bg-zinc-800 text-zinc-900
gap-1.5
```

**Cards de conteúdo:**
```
rounded-lg border border-zinc-200 dark:border-zinc-800
p-4 space-y-3
```

**Botões Cowork:**
```
h-9 px-4 text-sm rounded-lg gap-2
border border-{color}-200 text-{color}-600
hover:bg-{color}-50 dark:hover:bg-{color}-950/20
```

---

## 8. Dados do _analise_ia.json → UI

| Campo JSON | Onde aparece |
|------------|-------------|
| `_metadata.tipo` | Badge no cabeçalho |
| `resumo_fatos` | Análise > Resumo |
| `acusacoes[].crime` | Cabeçalho + Resumo |
| `pessoas[]` | Análise > Partes |
| `depoimentos[]` | Análise > Depoimentos |
| `depoimentos[].contradicoes` | Análise > Depoimentos (destaque) |
| `depoimentos[].perguntas_sugeridas` | Análise > Depoimentos + Partes |
| `cronologia[]` | Análise > Timeline |
| `teses` | Análise > Teses |
| `nulidades[]` | Análise > Teses & Nulidades |
| `matriz_guerra[]` | Análise > Teses (seção Matriz) |
| `radar_liberdade` | Cabeçalho + Análise > Resumo |
| `saneamento` | Análise > Resumo |
| `laudos` | Análise > Resumo (menção) + Documentos |
| `inconsistencias` | Análise > Resumo |
| `achados_chave` | Análise > Resumo |
| `recomendacoes` | Análise > Resumo |
| Local do fato (novo campo) | Análise > Mapa |
| Endereços das partes (novo) | Análise > Mapa |

---

## 9. Mapa — Campos Necessários no JSON

Adicionar ao schema `_analise_ia.json`:

```json
{
  "locais": [
    {
      "tipo": "FATO|RESIDENCIA|TESTEMUNHA|CAMERA|ROTA|OUTRO",
      "descricao": "Local do homicídio",
      "endereco": "Rua X, nº 123, Bairro Y, Camaçari-BA",
      "coordenadas": { "lat": -12.6958, "lng": -38.3244 },
      "pessoa_relacionada": "Nome (se aplicável)",
      "horario": "18:30",
      "observacoes": "Próximo ao bar do Zé"
    }
  ]
}
```

As skills Cowork devem extrair esses dados dos autos quando disponíveis.

---

## 10. Arquivos a Criar/Modificar

### Criar
| Arquivo | Responsabilidade |
|---------|------------------|
| `src/lib/config/design-tokens.ts` | Tokens de tipografia, espaçamento, cores |
| `src/components/processo/processo-header.tsx` | Cabeçalho redesenhado |
| `src/components/processo/processo-tabs.tsx` | 5 abas principais |
| `src/components/processo/analise-hub.tsx` | Container das subabas |
| `src/components/processo/analise-resumo.tsx` | Subaba Resumo |
| `src/components/processo/analise-partes.tsx` | Subaba Partes |
| `src/components/processo/analise-depoimentos.tsx` | Subaba Depoimentos |
| `src/components/processo/analise-timeline.tsx` | Subaba Timeline |
| `src/components/processo/analise-teses.tsx` | Subaba Teses & Nulidades |
| `src/components/processo/analise-mapa.tsx` | Subaba Mapa (simples + investigativo) |
| `src/components/processo/vinculados-cards.tsx` | Cards de processos vinculados |
| `src/components/processo/demandas-list.tsx` | Lista de demandas redesenhada |
| `src/components/processo/agenda-panel.tsx` | Painel de audiências |

### Modificar
| Arquivo | Mudança |
|---------|---------|
| `src/app/(dashboard)/admin/processos/[id]/page.tsx` | Reescrever com novos componentes |
| `src/components/analysis/analysis-panel.tsx` | Refatorar para ser usado dentro do analise-hub |
| `enrichment-engine/services/cowork_import_service.py` | Adicionar campo `locais` no normalizer |
