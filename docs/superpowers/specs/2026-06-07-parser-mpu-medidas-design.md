# Parser de MPU deferidas → dados estruturados para monitoramento

**Data:** 2026-06-07
**Branch:** `feat/parser-mpu-medidas`
**Atribuição:** VVD (Violência Doméstica)

## Problema

Decisões de Medidas Protetivas de Urgência (Lei 11.340/2006) chegam como **texto livre** e concedem **N medidas distintas num único despacho**. Hoje esse texto é colado num registro "Ciência de MPU" (tipo `ciencia`) e fica como string opaca — não vira dado que dirija o monitoramento (esteira Triagem → Prep → Dilig → Saída → Acomp → Concl).

Exemplo real (decisão Cacia Santos de Carvalho × Adalberto Machado de Lima, proc. MPU 8010125-45.2026.8.05.0039), que concede 4 medidas:

- a) **AFASTAMENTO DO LAR** (art. 22, II)
- b) **PROIBIÇÃO DE APROXIMAÇÃO** — ofendida, familiares e testemunhas, mínimo 300 metros (art. 22, III, a)
- c) **PROIBIÇÃO DE CONTATO** — por qualquer meio (telefone, e-mail, redes sociais, mensagens, interposta pessoa) (art. 22, III, b)
- d) **PROIBIÇÃO DE FREQUENTAR** — residência e trabalho da vítima (art. 22, III, c)

## Objetivo

Parsing **determinístico, efetivo e versátil** que identifique as medidas deferidas no texto e gere **dados estruturados** persistidos, alimentando a esteira de acompanhamento das MPU — ponta a ponta.

Não-objetivos (YAGNI): extração via LLM; UI de gestão de medidas além do preview; classificação da violência (já coberta por `mpu_relatos`).

## 1. Taxonomia canônica — enum `MEDIDA_MPU`

Única fonte de verdade, em `src/lib/mpu/medidas-taxonomia.ts`, espelhando a Lei 11.340/2006:

| Código | Base legal | Parâmetros |
|---|---|---|
| `SUSPENSAO_PORTE_ARMA` | art. 22, I | — |
| `AFASTAMENTO_LAR` | art. 22, II | — |
| `PROIBICAO_APROXIMACAO` | art. 22, III, a | `distanciaMetros`, `protegidos[]` |
| `PROIBICAO_CONTATO` | art. 22, III, b | `meios[]`, `protegidos[]` |
| `PROIBICAO_FREQUENTAR` | art. 22, III, c | `lugares[]` |
| `RESTRICAO_VISITAS` | art. 22, IV | — |
| `ALIMENTOS_PROVISORIOS` | art. 22, V | `valor` (se houver) |
| `MONITORACAO_ELETRONICA` | tornozeleira | — |
| `OUTRA` | fallback | `literal` |

Vocabulários fechados:
- `protegidos[]` ∈ `ofendida` \| `familiares` \| `testemunhas`
- `meios[]` ∈ `telefone` \| `email` \| `redes_sociais` \| `mensagens` \| `interposta_pessoa`
- `lugares[]` ∈ `residencia_vitima` \| `trabalho_vitima` \| `outro`

Cada entrada do catálogo declara: `codigo`, `artigo`, `rotulo`, lista de **gatilhos** (regex/keywords tolerantes a caixa, acento e negrito) e extratores de parâmetro opcionais.

## 2. Parser — função pura `parseDecisaoMPU(texto)`

Módulo `src/lib/mpu/parse-decisao.ts`, determinístico, sem I/O. Assinatura:

```ts
function parseDecisaoMPU(texto: string): DecisaoMPUParsed
```

Retorno:

```ts
interface DecisaoMPUParsed {
  ofendida: string | null;
  agressor: string | null;
  fundamentos: string[];        // ["art. 19", "art. 20", "art. 22"]
  prazoDias: number | null;     // null quando a decisão não fixa prazo
  medidas: MedidaParsed[];
}

interface MedidaParsed {
  codigo: MedidaMpuCodigo;
  artigo: string;               // "22, III, a"
  literal: string;              // trecho da decisão de onde veio
  distanciaMetros?: number;
  protegidos?: Protegido[];
  meios?: MeioContato[];
  lugares?: Lugar[];
  valor?: string;
}
```

### Estratégia de varredura (versátil)

1. **Segmentação por itens** quando houver alíneas (`a)`, `b)`…) ou incisos romanos (`I -`, `II -`). Cada item é casado contra os gatilhos do catálogo.
2. **Varredura global** do texto inteiro por gatilho de cada medida — cobre decisões sem enumeração (corrido). A união dos dois passos é deduplicada por `codigo`.
3. **Extratores de parâmetro** rodam sobre o trecho da medida:
   - distância: regex `(\d{1,4})\s*(?:\([^)]*\)\s*)?met` → `distanciaMetros`
   - protegidos: presença de "ofendida/vítima", "familiares", "testemunhas"
   - meios: telefone, e-mail, rede social, aplicativo/mensagem, interposta pessoa
   - lugares: "residência", "trabalho/local de trabalho"
   - prazo: `(\d+)\s*dias` no contexto de vigência
4. Normalização prévia: `toLowerCase`, remoção de acentos para o matching (preserva-se o `literal` original).

Partes (ofendida/agressor) extraídas dos padrões "em favor de X" e "determino que Y cumpra".

## 3. Persistência — 1 linha por medida em `medidas_protetivas`

Cada `MedidaParsed` vira uma linha:

- `tipoMedida` = `codigo`
- `distanciaMetros` = `distanciaMetros`
- `nomeVitima` = `ofendida`
- `dataDecisao`, `dataVencimento` (se `prazoDias`)
- `status` = `'ativa'`
- **nova coluna `parametros jsonb`** — guarda `{ protegidos, meios, lugares, valor, artigo, literal }` de forma estruturada. Sem ela esses dados morreriam em texto livre.

### Migration

`ALTER TABLE medidas_protetivas ADD COLUMN parametros jsonb;` — aditiva, nullable, sem backfill. Schema drizzle em `src/lib/db/schema/vvd.ts` ganha `parametros: jsonb("parametros").$type<MedidaParametros>()`.

### Idempotência

Reparse do mesmo processo **substitui** as medidas derivadas (delete-where-processo + insert) em vez de duplicar. Medidas com status manual alterado pelo defensor não são sobrescritas (respeita o princípio "última edição manual vence").

## 4. Gatilho + avanço da esteira

Disparo ao **salvar o registro "Ciência de MPU"** (tipo `ciencia`), com **preview de confirmação**: o parser roda sobre `registros.conteudo`, exibe as medidas detectadas, e ao confirmar:

1. Grava/atualiza as linhas em `medidas_protetivas`.
2. Atualiza `processos_vvd`: `mpuAtiva = true`, `faseProcedimento = DECISAO_LIMINAR`, `motivoUltimaIntimacao = CIENCIA_DECISAO_MPU`.
3. Cria evento em `historico_mpu`: `tipoEvento = 'concessao'`, `medidasVigentes` = resumo, `novaDistancia`, `dataEvento`.

Esses campos é que movem a esteira e os KPIs de monitoramento. O preview dá a revisão humana antes de gravar (atende ao requisito de conferência).

## 5. Testes

Fixtures em `src/lib/mpu/__tests__/parse-decisao.test.ts`:

- Decisão Cacia (4 medidas com alíneas, distância 300m, sem prazo) — caso canônico.
- Variação com **incisos romanos** (`I -`, `II -`).
- Variação **corrida** (sem enumeração).
- Variação com **prazo** ("pelo prazo de 90 dias").
- Variação com **tornozeleira** + suspensão de porte.
- Decisão de **indeferimento parcial** (não confundir medida indeferida com deferida).

Cada teste valida o JSON de `parseDecisaoMPU` campo a campo.

## Arquitetura — unidades isoladas

| Unidade | Responsabilidade | Depende de |
|---|---|---|
| `medidas-taxonomia.ts` | catálogo + vocabulários + gatilhos | nada |
| `parse-decisao.ts` | texto → `DecisaoMPUParsed` (pura) | taxonomia |
| migration + schema `vvd.ts` | coluna `parametros jsonb` | — |
| mutation de save do registro | orquestra parse → persist → esteira | parser, schema |
| preview (UI) | mostra medidas antes de confirmar | tRPC do parser |

O parser é a peça central e totalmente testável em isolamento.
