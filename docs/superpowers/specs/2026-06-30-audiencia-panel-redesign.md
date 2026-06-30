# Spec: Redesign do painel de audiência (EventDetailSheet)

**Data:** 2026-06-30  
**Branch alvo:** feat/registros-panel-redesign  
**Contexto:** AIJ (Audiência de Instrução e Julgamento) é o subtipo principal afetado; outros subtipos (Custódia, Justificação, Plenário, EP, etc.) herdam mudanças de infra sem quebra.

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
- Nenhuma mudança no modelo de dados (schema, migrações de banco) — só UI e mapeamentos.
- A lógica de transcrição de áudio, gravação (`GravarDepoimento`) e `VincularAudioPopover` não muda.

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

> **`preventiva` e `cautelares`** — mapeadas para `execucao` mas ausentes de `SECOES_INSTRUCAO` (intencionalmente: existem apenas em `SECOES_CUSTODIA` e similares). Comportamento preservado do estado anterior.

> **`motivo-designacao`** — mapeada para `imputacao` mas ausente de `SECOES_INSTRUCAO` (já era o comportamento anterior; permanece em `SECOES_JUSTIFICACAO`, `SECOES_CUSTODIA` etc.).

### 4.4 Conteúdo por aba (AIJ — espinha de `SECOES_INSTRUCAO`)

**Imputação**
1. `resumo` — texto narrativo corrido do caso (resumo executivo; boa leitura contextual)
2. `imputacao` — artigo/tipo penal imputado
3. `fatos` — termos verbatim da denúncia + aditamento (se houver)
4. `depoentes` — lista leve agrupada por lado: Acusação / Defesa (ver §5)

**Depoimentos**
5. `depoimentos` — cards accordion por depoente com intimação integrada (ver §6)
6. `intimacao` — seção de texto de intimação, renderizada apenas quando presente no manifesto do subtipo. Para AIJ, a info de intimação vive dentro de cada card (§6.2), **não** como seção standalone — `intimacao` não é adicionada a `SECOES_INSTRUCAO`.

**Laudos e documentos**
7. `laudos` — laudos periciais verbatim (Drive) + lacunas probatórias
8. `documentos` — outros documentos processuais
9. `relato-vitima`, `versao`, `medidas`, `midia` — agrupados em seção "Contexto" (ver §4.6)

**Estratégia e teses**
10. `teses` — teses defensivas
11. `dossie` — roteiro da defesa
12. `contradicoes`, `analise-ia`, `requerimento-defesa` — agrupados em seção "Contexto"

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
  // Contexto (colapsado via GRUPO_CONTEXTO_INSTRUCAO — ver §4.6)
  "contradicoes", "versao", "relato-vitima", "sintese",
  "investigacao", "pendencias", "medidas", "ata",
  "anotacoes-rapidas", "analise-ia", "midia",
];
```

### 4.6 "Contexto colapsado" — mecanismo existente

As seções marcadas como "contexto colapsado" em §4.4 são membros de `GRUPO_CONTEXTO_INSTRUCAO` (definido em `secoes-manifest.ts`). O `event-detail-sheet.tsx` já as agrupa num único `<CollapsibleSection>` colapsado por padrão ao final da aba. Esse mecanismo **não muda** — as seções apenas mudam de aba (ex.: `relato-vitima` vai para `laudos-docs`, `contradicoes` fica em `estrategia`). A função `computeWorkspaceTabs` divide `espinhaDaTab` e `contextoDaTab` por área; o sheet já renderiza contexto colapsado por aba.

### 4.7 Default `activeTab` e persistência

`event-detail-sheet.tsx` linha 222: alterar `useState<AreaMae>("resumo")` → `useState<AreaMae>("imputacao")`.

`activeTab` **não é persistido** em localStorage ou URL params (confirmado: apenas `useState` local). Nenhuma limpeza de estado salvo necessária.

O hardcode `tabAtiva === "prova-oral"` na linha 1493 do sheet (que exibe o `ProvaOralConsole`) deve ser atualizado para `tabAtiva === "depoimentos"`. Renomear também `ProvaOralConsole` → `DepoimentosConsole` (arquivo: `prova-oral-console.tsx`) e `resumoProvaOral` → `resumoDepoimentos`.

---

## 5. `DepoentesSecao` — visão agrupada por lado (aba Imputação)

### 5.1 Campo determinante

O agrupamento usa `d.tipo` (campo `DepoenteRow.tipo: string`), já presente no componente. Regras:

| `d.tipo` (lowercase) | Bloco |
|----------------------|-------|
| `"vitima"`, `"ofendida"`, `"acusacao"`, `"testemunha_acusacao"` | **Acusação** |
| `"defesa"`, `"testemunha_defesa"` | **Defesa** |
| `"interrogando"` | **Defesa** (ao final, label "Interrogatório") |
| outros / ausente | **Defesa** (fallback seguro) |

### 5.2 Layout

```
ACUSAÇÃO (N)              DEFESA (N)
─────────────────         ─────────────────
• Ludmila Abade           • Edmilson Bomfim
  vítima                    test. defesa
• CB PM Helder Castro     Assistido: [nome]
  testemunha acusação       (interrogatório)
```

- Ordem dentro de Acusação: vítima/ofendida primeiro (art. 400 CPP), depois demais testemunhas.
- Sem certidão de comunicação, sem badge de oitiva — apenas nome e qualificação (`TIPO_DEP_LABEL`).
- Sem botões de ação (ver certidão → vai para o card na aba Depoimentos).

---

## 6. Card de depoente — redesign visual (`DepoenteCardV2`)

Apenas `depoente-card-v2.tsx` existe (não há v1 coexistente). Este arquivo é modificado diretamente.

### 6.1 Estilo base (opção B aprovada)

- `border-radius: 0` no wrapper do card, botões e badges — classe Tailwind: remover `rounded-lg`, substituir por sem classe de radius ou `rounded-none`.
- **Faixa superior** de 3 px — `<div className="h-[3px] w-full ..." />` como primeiro filho do card:
  - `acusacao` → `bg-rose-300/70`
  - `defesa` → `bg-emerald-300/70`
  - `neutro` → `bg-neutral-200`
- Remoção de `border-l-[3px]` e `ladoBorder` (substituídos pela faixa top).
- `PessoaAvatar` passa a receber `papel` derivado de `lado`: `"ACUSACAO"`, `"DEFESA"`, ou omitido (neutral).

O `lado` é determinado pela função `ladoOf(d: DepoenteV2)` **já existente** em `depoente-card-v2.tsx`:
```ts
function ladoOf(d: DepoenteV2): "acusacao" | "defesa" | "neutro" {
  if (d.lado === "acusacao" || d.tipo === "ACUSACAO" || d.tipo === "VITIMA") return "acusacao";
  if (d.lado === "defesa" || d.tipo === "DEFESA") return "defesa";
  return "neutro";
}
```

### 6.2 Integração de intimação no body do card

Adicionar, logo abaixo do cabeçalho (antes de DELEGACIA/EM JUÍZO), uma linha de status de intimação derivada de `depoente.status`:

| `depoente.status` | Display | Cor Tailwind |
|-------------------|---------|--------------|
| `"INTIMADA"` | Intimada | `text-emerald-600` |
| `"ARROLADA"` | Não intimada | `text-rose-600` |
| `"NAO_LOCALIZADA"` | Não intimada — não localizada | `text-rose-600` |
| `"CARTA_PRECATORIA"` | Carta precatória expedida | `text-amber-600` |
| `"DESISTIDA"` | Desistência comunicada | `text-neutral-400` |
| `undefined` / valor desconhecido | *(linha omitida — nenhum texto)* | — |

Abaixo da linha de status: expander "Ver certidão de comunicação" (idêntico ao `CertidaoExpander` já em `DepoentesSecao.tsx`) — exibido somente se `depoente.certidaoComunicacao` for string não-vazia.

### 6.3 `certidaoComunicacao` — decisão de implementação

**Abordagem escolhida: prop adicional via `event-detail-sheet.tsx` (sem migração de banco).**

O `event-detail-sheet.tsx` já possui `analysisData.depoentes` (IA) com campo `certidao_comunicacao`. O sheet faz merge por nome ao montar `depoentesAtualizados` (ou passa um `Map<nome, certidao>` por prop). A interface `DepoenteV2` ganha o campo opcional:

```ts
certidaoComunicacao?: string | null;
```

O campo não precisa de nova coluna no banco — é populado no momento da composição do prop no sheet. Se o merge falhar (nome não bate), o campo fica `null` e o expander não aparece — degradação graceful.

---

## 7. `PessoaAvatar` — correção de cores semânticas

### 7.1 Problema atual

`DEFAULT_TONE` é violet — qualquer papel não mapeado recebe avatar roxo.

### 7.2 `DEFAULT_TONE` corrigido

```ts
// antes
const DEFAULT_TONE: PapelTone = {
  ...NEUTRAL_BG,
  text: "text-violet-700",
  ring: "ring-violet-300/60 dark:ring-violet-700/40",
  darkText: "dark:text-violet-300"
}

// depois
const DEFAULT_TONE: PapelTone = {
  ...NEUTRAL_BG,
  text: "text-neutral-500",
  ring: "ring-neutral-200/70 dark:ring-neutral-700/50",
  darkText: "dark:text-neutral-300"
}
```

### 7.3 Entradas novas em `PAPEL_AVATAR_MAP`

```ts
ACUSACAO: {
  ...NEUTRAL_BG,
  text: "text-rose-700",
  ring: "ring-rose-300/60 dark:ring-rose-700/40",
  darkText: "dark:text-rose-300",
},
INTERROGANDO: {
  ...NEUTRAL_BG,
  text: "text-emerald-700",
  ring: "ring-emerald-300/60 dark:ring-emerald-700/40",
  darkText: "dark:text-emerald-300",
},
INFORMANTE: {
  ...NEUTRAL_BG,
  text: "text-neutral-500",
  ring: "ring-neutral-200/70 dark:ring-neutral-700/50",
  darkText: "dark:text-neutral-300",
},
PERITO: {
  ...NEUTRAL_BG,
  text: "text-indigo-700",
  ring: "ring-indigo-300/60 dark:ring-indigo-700/40",
  darkText: "dark:text-indigo-300",
},
```

> O padrão dos campos (`from`, `to`, `darkFrom`, `darkTo`) segue `NEUTRAL_BG` — idêntico às entradas existentes `VITIMA` e `TESTEMUNHA`.

### 7.4 Mapeamento `lado` → papel no `DepoenteCardV2`

```ts
const papelParaAvatar = { acusacao: "ACUSACAO", defesa: "DEFESA", neutro: undefined }[lado];
// passa papelParaAvatar como prop `papel` do PessoaAvatar
```

---

## 8. Arquivos a modificar

| Arquivo | Natureza da mudança |
|---------|---------------------|
| `src/components/agenda/sheet/areas-mae.ts` | Novo `AreaMae`, `AREA_ORDER`, `AREA_LABELS`, `SECAO_TO_AREA` |
| `src/components/agenda/sheet/area-tabs.tsx` | Refs a `AreaMae` (TypeScript — compilador guia) |
| `src/components/agenda/sheet/secoes-manifest.ts` | Reordenar espinha de `SECOES_INSTRUCAO` |
| `src/components/agenda/event-detail-sheet.tsx` | Default `activeTab = "imputacao"`; linha 1493 `"prova-oral"` → `"depoimentos"`; renomear `ProvaOralConsole` import → `DepoimentosConsole` |
| `src/components/agenda/sheet/prova-oral-console.tsx` | Renomear export `ProvaOralConsole` → `DepoimentosConsole`; ajustar label |
| `src/components/shared/pessoa-avatar.tsx` | Corrigir `DEFAULT_TONE`; adicionar ACUSACAO, INTERROGANDO, INFORMANTE, PERITO ao mapa |
| `src/components/agenda/sheet/depoente-card-v2.tsx` | Opção B: faixa top, remoção `border-l`, `rounded-none`, linha de intimação + certidão expander, `certidaoComunicacao` na interface `DepoenteV2` |
| `src/components/agenda/sheet/secoes/DepoentesSecao.tsx` | Renderização agrupada por Acusação / Defesa (§5) |
| `src/components/agenda/sheet/area-tabs.test.tsx` | Atualizar para novos nomes de áreas |
| `src/components/agenda/sheet/areas-mae.test.ts` | Atualizar para novo `AreaMae` |
| `src/components/agenda/sheet/secoes-manifest.test.ts` | Validar nova espinha |

---

## 9. Critérios de aceitação

- [ ] Ao abrir o sheet de um AIJ, a primeira aba ativa é **Imputação**.
- [ ] A aba Imputação mostra em ordem: resumo narrativo → artigo imputado → denúncia verbatim → lista de testemunhas agrupada por Acusação / Defesa, com vítima/ofendida no topo do bloco Acusação.
- [ ] A aba Depoimentos mostra cards accordion com faixa rose/emerald/neutral no topo, bordas retas (`rounded-none`), e linha de status de intimação integrada no body.
- [ ] Quando `depoente.certidaoComunicacao` é string não-vazia, o expander "Ver certidão de comunicação" aparece no card. Quando `null`/`undefined`, o expander está ausente.
- [ ] Quando `depoente.status` é `undefined` ou valor não reconhecido, a linha de intimação é omitida sem erro.
- [ ] Nenhum avatar de depoente exibe roxo: acusação=rose, defesa=emerald, interrogatório=emerald, outros=neutral.
- [ ] A aba Laudos e documentos agrupa laudos periciais + relato da vítima + versão do assistido.
- [ ] A aba Estratégia e teses contém teses + dossiê + contradições + análise IA.
- [ ] Outros subtipos (Custódia, Justificação, Plenário, EP) continuam renderizando sem erro — smoke test visual em ao menos um caso de cada subtipo.
- [ ] Testes de `areas-mae`, `area-tabs` e `secoes-manifest` passam sem modificação dos casos de uso — apenas os valores literais de `AreaMae` são atualizados.
- [ ] `npm run typecheck` e `npm run lint` passam sem erros.
