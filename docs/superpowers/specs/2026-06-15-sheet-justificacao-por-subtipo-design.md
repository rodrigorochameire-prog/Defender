# Sheet de evento por subtipo de audiência — reestruturação (Justificação primeiro)

**Data:** 2026-06-15
**Autor:** Rodrigo Rocha Meire + Claude
**Status:** Aprovado para planejamento
**Escopo desta entrega:** mecanismo genérico de manifesto por subtipo + subtipo **Justificação (MPU)** completo. Demais subtipos herdam a ordem atual até serem detalhados.

---

## 1. Problema

O `EventDetailSheet` (`src/components/agenda/event-detail-sheet.tsx`) renderiza o mesmo conjunto de seções, na **mesma ordem fixa**, para qualquer tipo de audiência. A ordem é montada em `tocSections` (`event-detail-sheet.tsx:460-483`) e replicada na renderização do corpo — duas listas que precisam ser mantidas em sincronia manualmente.

Consequências, observadas no sheet de **Justificação (MPU)**:

1. **Seções de ação penal vazam para a justificação.** Imputação, Fatos/Denúncia, Síntese processual, Contradições, Laudos e Teses aparecem num ato que decide *manutenção/revisão/revogação de medidas protetivas* — não instrução criminal. Não há denúncia nem imputação numa justificação.
2. **A informação mais importante está enterrada e vazia.** "Medidas protetivas vigentes" — o coração da justificação — aparece lá embaixo e em branco, enquanto uma seção concorrente "Medidas protetivas (deferidas)" aparece antes. São **duas fontes diferentes** com nomes quase idênticos (ver §4).
3. **Não há resumo geral.** O defensor não tem uma orientação situacional no topo; só seções específicas soltas.
4. **Ordem não reflete relevância.** Para o defensor, na justificação, importa primeiro *por que estou aqui e se a audiência acontece*, depois *a situação*, depois *o mérito*.

O princípio que resolve isso vale para todos os ritos: **cada tipo de audiência tem seu próprio conjunto de seções e sua própria ordem.** Consertar só a justificação no código atual deixaria os demais tipos com o mesmo problema e criaria dívida técnica; por isso a entrega inclui o mecanismo genérico, ainda que só a Justificação seja detalhada agora.

---

## 2. Objetivo

1. Introduzir um **manifesto de seções por subtipo**: cada subtipo declara quais seções aparecem e em que ordem.
2. Tornar **ToC e corpo derivados da mesma fonte** (acabar com a divergência).
3. Entregar a **Justificação (MPU)** 100% reestruturada, por relevância.
4. Adicionar os campos que faltam (resumo geral, requerimento da defesa, motivo tipado) e **unificar** as medidas protetivas.
5. Não regredir nenhum outro subtipo.

**Fora de escopo agora:** detalhar os manifestos de Instrução/AIJ, Custódia, ANPP, EP etc. (herdam o default). Edição manual dos campos novos no sheet (a fonte é o pipeline de análise).

---

## 3. Arquitetura

### 3.1 Manifesto por subtipo

Um identificador de seção e o manifesto vivem junto da config de subtipo já existente (`src/components/agenda/registro-audiencia/subtipo-audiencia.ts`).

```ts
export type SecaoId =
  | "motivo_designacao" | "requerimento_defesa" | "intimacao" | "resumo_geral"
  | "medidas_vigentes"  | "relato_ofendida"     | "relato_assistido"
  | "roteiro"           | "depoentes"
  // seções de ação penal / instrução (default e demais ritos):
  | "imputacao" | "fatos" | "sintese" | "versoes" | "depoimentos"
  | "contradicoes" | "laudos" | "teses" | "investigacao" | "pendencias"
  | "documentos" | "midia";
```

Adicionar a `SubtipoConfig` o campo:

```ts
/** Lista ordenada de seções deste rito. Se ausente, usa SECOES_DEFAULT. */
secoes?: SecaoId[];
```

Manifesto da Justificação (ordem aprovada):

```ts
justificacao.secoes = [
  "motivo_designacao",   // tipado: origem/gatilho + detalhe
  "requerimento_defesa", // o que a defesa sustenta (condicional)
  "intimacao",           // a audiência vai acontecer? partes localizáveis?
  "resumo_geral",        // 3–4 linhas situacionais
  "medidas_vigentes",    // unificada (banco → analysisData)
  "relato_ofendida",
  "relato_assistido",
  "roteiro",
  "depoentes",
  "documentos",
  "midia",
];
```

`SECOES_DEFAULT` reproduz a **saída renderizada completa de hoje** para todos os subtipos sem manifesto próprio. Atenção: hoje o sheet renderiza (a) as seções indexadas no `tocSections` (`event-detail-sheet.tsx:460-483`) **e** (b) blocos renderizados à parte, fora do ToC — `roteiro` (DossieV2Block, `:781-785`), painel de medidas vigentes (`:787-791`) e intimação. O default precisa contemplar os dois grupos, na posição visual atual. A ordem-base a partir do `tocSections`:

```
imputacao, fatos, motivo_designacao, medidas_vigentes, relato_ofendida,
sintese, relato_assistido, depoentes, depoimentos, contradicoes, laudos,
investigacao, pendencias, teses, documentos, midia
```

…intercalada com `roteiro`, `intimacao` e o painel de medidas nas posições onde hoje aparecem. A ordem exata do default deve ser **capturada lendo a árvore de renderização atual** durante a implementação, e validada por paridade visual num subtipo não-Justificação (ver §8).

> Nota: o default herda a renderização unificada de medidas (§4) e a normalização do motivo (§5) — a única mudança de comportamento para os demais subtipos é essa unificação/normalização, intencional e segura.

### 3.2 Registro de seções (fonte única de ToC + corpo)

```ts
interface SecaoDef {
  label: string;                         // rótulo no ToC e no cabeçalho da seção
  temDado: (ctx: SheetCtx) => boolean;   // se há dado para exibir
  contagem?: (ctx: SheetCtx) => number;  // badge opcional (ex.: depoentes)
  render: (ctx: SheetCtx) => ReactNode;  // componente da seção
}

const SECAO_REGISTRY: Record<SecaoId, SecaoDef> = { /* ... */ };
```

Resolução em runtime:

```ts
const manifesto = config.secoes ?? SECOES_DEFAULT;
const secoesVisiveis = manifesto.filter((id) => SECAO_REGISTRY[id].temDado(ctx));
// ToC e corpo iteram secoesVisiveis — mesma ordem, mesma fonte.
```

`SheetCtx` é um objeto único reunindo os dados que as seções consomem (analysisData já extraído, caso, processoId, depoentes, diligências etc.), montado uma vez no componente.

### 3.3 Refatoração de arquivo

`event-detail-sheet.tsx` tem ~1.351 linhas. Como a renderização passa a ser por registro, extrair cada seção para componentes pequenos em `src/components/agenda/sheet/secoes/` (ex.: `MotivoDesignacaoSecao.tsx`, `MedidasVigentesSecao.tsx`, `RequerimentoDefesaSecao.tsx`, `ResumoGeralSecao.tsx`, …). O `event-detail-sheet.tsx` fica responsável por: montar `SheetCtx`, resolver o manifesto, renderizar ToC + loop de seções, e a barra de ações (Concluir/Redesignar/Registrar). Seções já existentes (imputação, fatos, depoentes etc.) são movidas como estão — sem mudar comportamento — para dentro do registry.

---

## 4. Medidas protetivas unificadas

Hoje existem **duas** seções com fontes distintas:

| Seção atual | Fonte | Natureza |
|---|---|---|
| "Medidas protetivas vigentes" | tabela `medidas_mpu` (via `MedidasVigentesPanel`, `processoId`) | estruturada, autoritativa (art. 22, status, distância, origem) |
| "Medidas protetivas (deferidas)" | `analysisData.medidas_protetivas` / `.medidas_protetivas_vigentes` | resumo informacional extraído pela IA |

A seção "vigentes" aparece vazia quando não há registros `medidas_mpu` para o processo, enquanto a versão fraca (IA) aparece antes — confuso.

**Decisão:** uma única seção `medidas_vigentes`, com fallback:

1. Se há registros no banco (`medidas_mpu`) → renderiza o `MedidasVigentesPanel` (comportamento atual, dado autoritativo).
2. Senão, se há dado no `analysisData` → renderiza esse dado com selo **"extraído dos autos — conferir no PJe"** (sinaliza origem não-autoritativa).
3. Senão → seção oculta (não entra em `secoesVisiveis`).

A seção concorrente `medidas-deferidas` é removida. `temDado` da `medidas_vigentes` = (banco tem registros) OU (analysisData tem medidas).

---

## 5. Campos novos (em `analysisData`, sem migração de banco)

Todos os campos novos moram no JSON `analysisData` (campo `dossie`/topo, conforme o pipeline). Não há DDL nova; `medidas_mpu` já existe.

### 5.1 `motivo_designacao` tipado

De `string` para:

```ts
type OrigemDesignacao =
  | "requerimento_defesa" | "pedido_revogacao_ofendida"
  | "alegacao_descumprimento" | "reavaliacao_juizo" | "caso_novo" | "outro";

interface MotivoDesignacao { origem: OrigemDesignacao | null; detalhe: string; }
```

**Retrocompatibilidade (obrigatória):** um normalizador `normalizarMotivo(raw)` aceita:
- `string` → `{ origem: null, detalhe: raw }`
- objeto `{ origem, detalhe }` → usado como está
- ausente → seção oculta.

Render: chip da origem (quando houver) + texto do `detalhe`. Quando `origem === "requerimento_defesa"`, a seção `requerimento_defesa` é vinculada visualmente (ex.: "ver Requerimento da defesa").

### 5.2 `resumo_audiencia: string`

O "resumo geral" orientado ao **tipo** de audiência. Para a Justificação: 3–4 linhas com quem é quem, medidas em vigor e desde quando, status do risco/relação, e direção da defesa. Renderizado na seção `resumo_geral`. `temDado` = string não vazia.

### 5.3 `requerimento_defesa: string`

A pretensão de mérito da defesa naquele ato (ex.: "revogação total por reconciliação e endereço comum"). Distinto do **Roteiro** (playbook de perguntas/providências). `temDado` = string não vazia. Quando o `motivo_designacao.origem` é `requerimento_defesa`, há vínculo visual com a seção de motivo.

---

## 6. Pipeline de geração

A fonte dos campos de `analysisData` é o pipeline/skill de análise VVD (skill `analise-vvd` e o gerador de dossiê v2 — `dossie_vvd_autos_pje_v2`). Atualizar o **prompt/esquema** desse pipeline para emitir:

- `resumo_audiencia` (texto orientado ao subtipo do ato);
- `requerimento_defesa` (quando houver pretensão da defesa);
- `motivo_designacao` no formato `{ origem, detalhe }`.

O sheet **não depende** dessa atualização para funcionar: dados antigos (sem os campos, com `motivo_designacao` string) continuam renderizando via os `temDado`/normalizador. A atualização do pipeline e o reprocessamento dos autos são incrementais.

---

## 7. Retrocompatibilidade e não-regressão

- `motivo_designacao` string legado → normalizado, renderiza igual.
- `analysisData` sem `resumo_audiencia`/`requerimento_defesa` → seções ocultas.
- Subtipos sem manifesto próprio → `SECOES_DEFAULT` = ordem de hoje. Única diferença de comportamento: medidas unificadas (§4) e motivo normalizado (§5.1), ambas intencionais.
- Plenário do Júri (`direcionaCockpit`) mantém o redirecionamento atual — não passa pelo manifesto.

---

## 8. Plano de testes

**Unit:**
- Resolução do manifesto: subtipo com `secoes` próprio usa-o; subtipo sem → `SECOES_DEFAULT`; seções sem dado são filtradas; ToC e corpo derivam da mesma lista.
- `normalizarMotivo`: string, objeto, ausente.
- Fallback de medidas: banco com registros → painel do banco; banco vazio + analysisData → fallback com selo; ambos vazios → oculta.

**Visual / manual:**
- Justificação (MPU) renderiza na ordem aprovada, sem seções de ação penal, com medidas no topo do mérito.
- AIJ/Instrução renderiza igual a hoje (default inalterado).
- Evento sem `analysisData` (só `pje_autos`) não quebra.

---

## 9. Arquivos afetados (estimativa)

- `src/components/agenda/registro-audiencia/subtipo-audiencia.ts` — `SecaoId`, `SubtipoConfig.secoes`, manifesto da Justificação, `SECOES_DEFAULT`.
- `src/components/agenda/event-detail-sheet.tsx` — montar `SheetCtx`, resolver manifesto, ToC + loop por registry; remover `tocSections` fixo e a seção `medidas-deferidas`.
- `src/components/agenda/sheet/secoes/*` — componentes de seção extraídos + novos (`ResumoGeralSecao`, `RequerimentoDefesaSecao`, `MotivoDesignacaoSecao`, `MedidasVigentesSecao`).
- `src/components/agenda/sheet/dossie-v2-block.tsx` — permanece como render do `roteiro` (sem mudança funcional).
- `src/components/mpu/medidas-vigentes-panel.tsx` — reusado pela seção unificada (sem mudança, ou ajuste mínimo para o caso de fallback).
- Lib de normalização: `normalizarMotivo`, tipos `OrigemDesignacao`/`MotivoDesignacao` (em `subtipo-audiencia.ts` ou util próximo).
- Pipeline/skill `analise-vvd` (prompt/esquema) — emissão dos campos novos.
