# Renderizar dossiê v2 no painel da agenda

**Data:** 2026-06-02
**Contexto:** OMBUDS / agenda — painel lateral de detalhe (`EventDetailSheet`).

## Problema

Dossiês gravados por um processo externo em lote (`fonte: dossie_vvd_autos_pje_v2`)
ficam aninhados em `processos.analysis_data.dossie`. O painel da agenda lê
`analysis_data` **no topo** (chaves do formato do app: `resumo_executivo`, `imputacao`,
`teses`, `versao_juizo`…) e a tabela `casos`. Não há **nenhuma** leitura de `.dossie`,
então o conteúdo existe no banco mas é invisível na tela; pior, como `analysis_status`
é `null`, o painel mostra o botão "Analisar" como se o caso nunca tivesse sido analisado.

Hoje 5 processos têm esse formato (incluindo a audiência das 10:40, proc. 138 —
`8002212-80.2024.8.05.0039`).

## Escopo

Mudança **somente de frontend**. `getAudienciaContext` já devolve o `analysis_data`
inteiro (incluindo `.dossie`) ao cliente — o dado já está disponível, falta renderizar.

**Fora de escopo (YAGNI):** alterar backend, migrar/transformar dados, regerar os
processos que só têm `pje_autos` (esses não possuem dossiê — assunto separado), ToC.

## Formato do dossiê v2 (`analysis_data.dossie`)

Chaves observadas (todas opcionais; tolerar ausência):

- `ato`: string — tipo do ato (ex.: "Instrução e Julgamento — Ação Penal").
- `gerado_em`: string (data ISO curta, ex.: "2026-06-02").
- `resumo`: string[] — parágrafos do resumo executivo.
- `teses`: Array<{ nome: string; nivel: string; fundamento: string }> —
  `nivel` no formato "■■■■□ ALTA" | "■■■□□ MÉDIA" | "■■□□□ BAIXA".
- `fragilidades`: string[] — fragilidades da acusação.
- `perguntas`: string[] — perguntas / atos em audiência.
- `providencias`: string[] — providências da defesa.
- `versao_defendido`: string — versão do defendido (citação).
- `intimacao`: string — situação da intimação.
- `fonte`, `versao`: metadados (não renderizados como conteúdo).

## Solução

### Componente: `src/components/agenda/sheet/dossie-v2-block.tsx`

Componente puro `DossieV2Block({ dossie })` que renderiza, nesta ordem:

1. Cabeçalho: `ato` + badge "gerado em {gerado_em}" (se presentes).
2. **Resumo** — cada parágrafo de `resumo` num `<p>`.
3. **Teses** — para cada tese: `nome` (negrito), badge de `nivel` colorido por classe
   (ALTA → emerald, MÉDIA → amber, BAIXA → neutral; detectado por regex no texto do
   nível), e `fundamento`.
4. **Fragilidades da acusação** — `fragilidades` como lista.
5. **Perguntas / atos em audiência** — `perguntas` como lista.
6. **Providências da defesa** — `providencias` como lista.
7. **Versão do defendido** — `versao_defendido` em bloco de citação.
8. **Intimação** — `intimacao` como texto.

Cada subseção só renderiza se o campo correspondente existir e for não-vazio.
Sem fetch; recebe tudo por prop. Estilo seguindo o idioma do arquivo (Tailwind +
`dark:`, tamanhos `text-xs`/`text-[11px]`, `EmptyHint` quando o dossiê não tiver
nenhum conteúdo renderizável).

### Helper puro: `src/lib/agenda/dossie-v2.ts`

- `type DossieV2 = { ato?: string; gerado_em?: string; resumo?: string[];
  teses?: Array<{ nome?: string; nivel?: string; fundamento?: string }>;
  fragilidades?: string[]; perguntas?: string[]; providencias?: string[];
  versao_defendido?: string; intimacao?: string; fonte?: string; versao?: string }`
- `hasDossieV2(analysisData): boolean` — `true` quando `analysisData?.dossie` é um
  objeto não-nulo. Usado para detecção/gating, testável sem render.
- `nivelTeseClass(nivel?: string): "alta" | "media" | "baixa" | "neutra"` — classifica
  o texto do nível por regex (alta|média|baixa), usado pelo badge. Testável.

### Integração em `event-detail-sheet.tsx`

- Derivar `const dossieV2 = hasDossieV2(ad) ? (ad as any).dossie : null;`
- Quando `dossieV2`: renderizar `<CollapsibleSection id="dossie" label="Dossiê"
  defaultOpen>` com `<DossieV2Block dossie={dossieV2} />`, logo após a seção
  "Resumo Executivo".
- Quando `dossieV2`: **suprimir** as seções narrativas do formato-app e o CTA
  "Analisar" — concretamente, o grupo de seções derivadas de `analysisData`
  (Análise IA/CTA, Imputação, Fatos, Versão do Acusado, Contradições, Laudos,
  Investigação, Pendências, Teses) passa a ser gated por `!dossieV2`.
- **Mantidas sempre** (fontes independentes): Resumo (cabeçalho), Anotações rápidas,
  Depoentes, Documentos, Mídia.

### Comportamento de borda

- Sem `dossie` (formato-app normal, ou só `pje_autos`, ou sem `analysis_data`): painel
  **inalterado** — mesmas seções e mesmo CTA "Analisar" de hoje. Zero regressão.

## Testes

O projeto tem testing-library + jest-dom configurados; testes de render ficam em
`__tests__/components/*.test.tsx` (seguir o padrão de `collapsible-section.test.tsx`,
incluindo o pragma `// @vitest-environment jsdom` se os vizinhos usarem — o
`vitest.config.ts` roda em `node` por padrão).

- `__tests__/unit/dossie-v2.test.ts`: `hasDossieV2` (true com `.dossie`, false sem/`null`/
  sem analysisData); `nivelTeseClass` (alta/média/baixa/neutra a partir de "■■■■□ ALTA",
  "■■■□□ MÉDIA", "■■□□□ BAIXA", e fallback neutra).
- `__tests__/components/dossie-v2-block.test.tsx`: renderiza resumo, teses (nome +
  fundamento) e perguntas a partir de um `dossie` de exemplo; verifica que uma subseção
  com campo ausente (ex.: sem `intimacao`) não renderiza seu título.

## Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `src/lib/agenda/dossie-v2.ts` (novo) | tipo `DossieV2`, `hasDossieV2`, `nivelTeseClass` |
| `src/components/agenda/sheet/dossie-v2-block.tsx` (novo) | renderizador fiel do dossiê |
| `src/components/agenda/event-detail-sheet.tsx` | detecção, seção "Dossiê", gating `!dossieV2` |
| `__tests__/unit/dossie-v2.test.ts` (novo) | testes dos helpers |
| `__tests__/components/dossie-v2-block.test.tsx` (novo) | teste de render do bloco |

## Critérios de aceite

1. Numa audiência cujo processo tem `analysis_data.dossie` (ex.: 10:40, proc. 138), o
   painel mostra a seção "Dossiê" com resumo, teses (com nível e fundamento),
   fragilidades, perguntas, providências, versão do defendido e intimação.
2. Nessa mesma audiência, o painel **não** mostra o CTA "Analisar" nem as seções vazias
   "Imputação não extraída"/"rode a análise IA".
3. Depoentes, Documentos e Mídia continuam aparecendo normalmente.
4. Numa audiência com formato-app (ex.: proc. 647) ou só `pje_autos`, o painel fica
   **idêntico** ao atual (nenhuma seção "Dossiê", CTA "Analisar" preservado onde cabia).
5. Subseções do dossiê com campo ausente não quebram nem deixam título órfão.
