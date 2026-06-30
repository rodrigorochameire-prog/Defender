# Spec: Redesign do painel de audiência (EventDetailSheet)

**Data:** 2026-06-30  
**Branch alvo:** feat/registros-panel-redesign  
**Contexto:** AIJ (Audiência de Instrução e Julgamento) é o subtipo principal afetado; outros subtipos (Custódia, Justificação, Plenário, etc.) herdam mudanças de infra sem quebra.

---

## 1. Problema

O painel de audiência organiza o conteúdo em 5 abas genéricas que não refletem o fluxo mental do defensor antes e durante um AIJ:

- A aba **Resumo** duplica conteúdo que deveria estar junto à imputação.
- A aba **Prova oral** mistura gestão de intimações, status de oitiva e o conteúdo dos próprios depoimentos numa estrutura plana.
- **Laudos** ficam enterrados em "Documentos" junto a peças de natureza diferente.
- A **Estratégia** está no segundo lugar da navegação, forçando o defensor a navegar longe dela para acessar provas.
- Os cards de depoente usam **roxo como cor padrão** (sem semântica), `border-radius` arredondado (visualmente pesado) e não integram o status de intimação.

---

## 2. Objetivos

1. Organizar o painel em abas que espelhem o raciocínio jurídico do defensor: fatos → provas pessoais → provas técnicas → estratégia → execução.
2. Disponibilizar na aba **Imputação** tudo que é necessário para entender o caso numa leitura rápida: texto narrativo + denúncia verbatim + rol de testemunhas por lado.
3. Concentrar em **Depoimentos** todo o detalhe operacional de cada depoente: status de intimação, certidão, depoimento no IP, depoimento em juízo, perguntas.
4. Aplicar visual clean e semântico nos cards de depoente: cores rose/emerald por lado, bordas retas, sem roxo.

---

## 3. Fora de escopo

- Outros subtipos de audiência (Custódia, Justificação, Plenário, EP) não têm mudança intencional de conteúdo — apenas herdam a renomeação das áreas.
- Nenhuma mudança no modelo de dados (schema, migrações) — só UI e mapeamentos.
- A lógica de transcrição de áudio, gravação e VincularAudio não muda.

---

## 4. Nova estrutura de abas

### 4.1 `AreaMae` (substituição completa)

```ts
// antes
type AreaMae = "resumo" | "estrategia" | "prova-oral" | "documentos" | "execucao"

// depois
type AreaMae = "imputacao" | "depoimentos" | "laudos-docs" | "estrategia" | "execucao"
```

### 4.2 Labels e ordem

| `AreaMae` | Label exibido | Posição |
|-----------|---------------|---------|
| `imputacao` | Imputação | 1ª |
| `depoimentos` | Depoimentos | 2ª |
| `laudos-docs` | Laudos e documentos | 3ª |
| `estrategia` | Estratégia e teses | 4ª |
| `execucao` | Execução | 5ª |

### 4.3 Mapeamento `SECAO_TO_AREA`

| SecaoId | Área anterior | Área nova |
|---------|--------------|-----------|
| `resumo` | resumo | **imputacao** |
| `resumo-audiencia` | resumo | **imputacao** |
| `sintese` | resumo | **imputacao** |
| `motivo-designacao` | resumo | **imputacao** |
| `imputacao` | estrategia | **imputacao** |
| `fatos` | documentos | **imputacao** |
| `depoentes` | prova-oral | **imputacao** |
| `depoimentos` | prova-oral | **depoimentos** |
| `intimacao` | prova-oral | **depoimentos** |
| `laudos` | documentos | **laudos-docs** |
| `documentos` | documentos | **laudos-docs** |
| `relato-vitima` | documentos | **laudos-docs** |
| `medidas` | documentos | **laudos-docs** |
| `versao` | documentos | **laudos-docs** |
| `midia` | documentos | **laudos-docs** |
| `dossie` | estrategia | estrategia (sem mudança) |
| `teses` | estrategia | estrategia (sem mudança) |
| `analise-ia` | estrategia | estrategia (sem mudança) |
| `contradicoes` | estrategia | estrategia (sem mudança) |
| `requerimento-defesa` | estrategia | estrategia (sem mudança) |
| `ata` | execucao | execucao (sem mudança) |
| `anotacoes-rapidas` | execucao | execucao (sem mudança) |
| `investigacao` | execucao | execucao (sem mudança) |
| `pendencias` | execucao | execucao (sem mudança) |
| `preventiva` | execucao | execucao (sem mudança) |
| `cautelares` | execucao | execucao (sem mudança) |

### 4.4 Conteúdo por aba (AIJ — espinha de `SECOES_INSTRUCAO`)

**Imputação**
1. `resumo` — texto narrativo corrido do caso (resumo executivo; bom de ler, não técnico)
2. `imputacao` — artigo/tipo penal imputado
3. `fatos` — termos verbatim da denúncia + aditamento (se houver)
4. `depoentes` — lista agrupada por lado: Acusação / Defesa (nomes + qualificação, sem certidão)

**Depoimentos**
5. `depoimentos` — cards accordion por depoente (ver §6)
6. `intimacao` — seção standalone de intimação (quando existente)

**Laudos e documentos**
7. `laudos` — laudos periciais verbatim (Drive) + lacunas probatórias
8. `documentos` — outros documentos processuais
9. `relato-vitima`, `versao`, `medidas`, `midia` (contexto colapsado)

**Estratégia e teses**
10. `teses` — teses defensivas
11. `dossie` — roteiro da defesa
12. `contradicoes`, `analise-ia`, `requerimento-defesa` (contexto colapsado)

**Execução**
13. `ata`, `anotacoes-rapidas`, `pendencias`, `investigacao`, `preventiva`, `cautelares`

### 4.5 `SECOES_INSTRUCAO` — espinha reordenada

```ts
export const SECOES_INSTRUCAO: SecaoId[] = [
  // Espinha (7)
  "resumo",        // narrativa do caso — topo da aba Imputação
  "imputacao",
  "fatos",
  "depoentes",
  "depoimentos",
  "laudos",
  "documentos",
  // Preparação
  "dossie",
  "teses",
  // Contexto (colapsado)
  "contradicoes", "versao", "relato-vitima", "sintese",
  "investigacao", "pendencias", "medidas", "ata",
  "anotacoes-rapidas", "analise-ia", "midia",
];
```

> `motivo-designacao` não faz parte de `SECOES_INSTRUCAO` (já era o comportamento anterior). Permanece presente em `SECOES_JUSTIFICACAO`, `SECOES_CUSTODIA` e similares.

### 4.6 Default `activeTab`

`event-detail-sheet.tsx`: alterar valor inicial do `useState` de `"resumo"` para `"imputacao"`.

---

## 5. `DepoentesSecao` — visão agrupada por lado (aba Imputação)

A seção `depoentes` passa a renderizar uma lista leve agrupada em dois blocos:

```
ACUSAÇÃO (N)              DEFESA (N)
─────────────────         ─────────────────
• Ludmila Abade           • Edmilson Bomfim
  vítima                    test. defesa
• CB PM Helder Castro     Assistido: [nome]
  testemunha                (interrogatório)
```

- Sem certidão de comunicação nesta visão (vai para o card na aba Depoimentos).
- Sem badge de oitiva detalhado — apenas nome e qualificação.
- Vítima/ofendida vai no bloco Acusação (ordem: art. 400 CPP — ofendida primeiro).
- Interrogatório aparece ao final do bloco Defesa com label "Interrogatório".

---

## 6. Card de depoente — redesign visual (`DepoenteCardV2`)

### 6.1 Estilo base (opção B aprovada)

- `border-radius: 0` em todo o card, botões e badges (bordas retas).
- **Faixa superior** de 3 px, cor por lado:
  - `acusacao` → `bg-rose-300/70`
  - `defesa` → `bg-emerald-300/70`
  - `neutro` → `bg-neutral-200`
- Avatar `PessoaAvatar`: micro-borda semântica (ring), sem borda arredondada excessiva, mesmo esquema de cores.
- Remoção do `border-l-[3px]` lateral (substituído pela faixa top).

### 6.2 Integração de intimação no body do card

Adicionar, logo abaixo do cabeçalho, uma linha de status de intimação derivada de `depoente.status`:

| Status | Display |
|--------|---------|
| `INTIMADA` | `Intimada` — texto emerald |
| `ARROLADA` | `Não intimada` — texto rose |
| `NAO_LOCALIZADA` | `Não intimada — não localizada` — texto rose |
| `CARTA_PRECATORIA` | `Carta precatória expedida` — texto amber |
| `DESISTIDA` | `Desistência comunicada` — texto neutral |

Abaixo da linha de status: link expansível "Ver certidão de comunicação" (se `depoente.certidaoComunicacao` presente — campo a adicionar em `DepoenteV2`).

> **Dependência de dados:** o campo `certidaoComunicacao` (string | null) precisa ser adicionado à interface `DepoenteV2` e populado no query tRPC `audiencias.getDepoentes`. O dado já existe em `analysisData.depoentes[].certidao_comunicacao` (AI analysis); a tarefa é fazê-lo fluir até o `DepoenteV2` do banco ou passar o dado por prop.

---

## 7. `PessoaAvatar` — correção de cores semânticas

### 7.1 Problema atual

`DEFAULT_TONE` é violet — qualquer papel não mapeado (ex.: testemunha sem `papel` explícito) recebe avatar roxo.

### 7.2 Correção

```ts
// antes
const DEFAULT_TONE: PapelTone = { ...NEUTRAL_BG, text: "text-violet-700", ring: "ring-violet-300/60 ...", ... }

// depois
const DEFAULT_TONE: PapelTone = { ...NEUTRAL_BG, text: "text-neutral-500", ring: "ring-neutral-200/70 ...", ... }
```

### 7.3 Entradas novas em `PAPEL_AVATAR_MAP`

```ts
ACUSACAO:     { ...NEUTRAL_BG, text: "text-rose-700",    ring: "ring-rose-300/60 ...",    darkText: "dark:text-rose-300" },
INTERROGANDO: { ...NEUTRAL_BG, text: "text-emerald-700", ring: "ring-emerald-300/60 ...", darkText: "dark:text-emerald-300" },
INFORMANTE:   { ...NEUTRAL_BG, text: "text-neutral-500", ring: "ring-neutral-200/70 ...", darkText: "dark:text-neutral-300" },
PERITO:       { ...NEUTRAL_BG, text: "text-indigo-700",  ring: "ring-indigo-300/60 ...",  darkText: "dark:text-indigo-300" },
```

Mapeamento final por `lado` no `DepoenteCardV2`:

| `ladoOf()` | Cor faixa top | Avatar ring |
|-----------|--------------|-------------|
| acusacao | rose-300/70 | rose |
| defesa | emerald-300/70 | emerald |
| neutro | neutral-200 | neutral |

---

## 8. Arquivos a modificar

| Arquivo | Natureza da mudança |
|---------|---------------------|
| `src/components/agenda/sheet/areas-mae.ts` | Novo `AreaMae`, `AREA_ORDER`, `AREA_LABELS`, `SECAO_TO_AREA` |
| `src/components/agenda/sheet/area-tabs.tsx` | Refs a `AreaMae` (TypeScript — compilador guia) |
| `src/components/agenda/sheet/secoes-manifest.ts` | Reordenar `SECOES_INSTRUCAO` (espinha) |
| `src/components/agenda/event-detail-sheet.tsx` | Default `activeTab = "imputacao"` |
| `src/components/shared/pessoa-avatar.tsx` | Corrigir `DEFAULT_TONE` + novas entradas `PAPEL_AVATAR_MAP` |
| `src/components/agenda/sheet/depoente-card-v2.tsx` | Opção B visual + linha de intimação integrada |
| `src/components/agenda/sheet/secoes/DepoentesSecao.tsx` | Renderização agrupada por Acusação / Defesa |
| `src/components/agenda/sheet/area-tabs.test.tsx` | Atualizar para novos nomes de áreas |
| `src/components/agenda/sheet/areas-mae.test.ts` | Atualizar para novo `AreaMae` |
| `src/components/agenda/sheet/secoes-manifest.test.ts` | Validar nova espinha |

---

## 9. Critérios de aceitação

- [ ] Ao abrir o sheet de um AIJ, a primeira aba ativa é **Imputação**.
- [ ] A aba Imputação mostra: resumo narrativo → artigo imputado → denúncia verbatim → lista de testemunhas agrupada por Acusação / Defesa.
- [ ] A aba Depoimentos mostra os cards accordion com faixa rose/emerald no topo, bordas retas, linha de intimação integrada.
- [ ] Nenhum avatar de depoente exibe roxo — acusação=rose, defesa=emerald, interrogatório=emerald, outros=neutral.
- [ ] A aba Laudos e documentos agrupa laudos periciais, relato da vítima, versão do assistido.
- [ ] A aba Estratégia e teses contém teses + dossiê + contradições + análise IA.
- [ ] Outros subtipos de audiência (Custódia, Justificação, Plenário, EP) continuam renderizando sem erro.
- [ ] Testes de `areas-mae`, `area-tabs` e `secoes-manifest` passam.
- [ ] `npm run typecheck` e `npm run lint` passam sem erros.
