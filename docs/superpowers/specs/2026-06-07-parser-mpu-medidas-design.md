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

## 3. Persistência — nova tabela `medidas_mpu` (1 linha por medida)

> **Decisão (08/06):** `medidas_protetivas` está marcada como LEGADA no schema ("NÃO usar em novas features"). O modelo VVD novo (`partes_vvd` / `processos_vvd` / `historico_mpu`) não tem tabela por-medida. Criamos **`medidas_mpu`** nesse modelo novo, com FK → `processos_vvd`.

Tabela `medidas_mpu`:

| Coluna | Tipo | Origem |
|---|---|---|
| `id` | serial PK | — |
| `processo_vvd_id` | int FK → `processos_vvd` (cascade) | match por CNJ |
| `codigo` | varchar(40) | `MedidaParsed.codigo` |
| `artigo` | varchar(20) | `MedidaParsed.artigo` |
| `distancia_metros` | int null | `distanciaMetros` |
| `parametros` | jsonb null | `{ protegidos, meios, lugares, valor }` |
| `literal` | text | trecho da decisão |
| `data_decisao` | date null | data da decisão |
| `data_vencimento` | date null | se `prazoDias` |
| `status` | varchar(20) default `'ativa'` | manual ou derivado |
| `origem` | varchar(20) default `'parser'` | distingue derivado de manual |
| `created_at` / `updated_at` | timestamp | — |

Schema drizzle em `src/lib/db/schema/vvd.ts` (módulo novo, não o legado).

### Migration

Nova migration `drizzle/0048_medidas_mpu.sql` (sequência atual termina em 0047): `CREATE TABLE medidas_mpu (...)` + índices em `processo_vvd_id` e `status`.

### Idempotência

Reparse do mesmo processo **substitui** apenas as medidas de `origem='parser'` (delete-where-processo-and-origem-parser + insert) em vez de duplicar. Linhas com `origem='manual'` (criadas/editadas pelo defensor) nunca são tocadas (respeita "última edição manual vence").

## 4. Gatilho + avanço da esteira

Espelha o padrão já existente no `registros.create` (`detectarDesignacaoAudiencia`, que auto-cria audiência a partir de despacho de ciência).

**Preview:** query tRPC `mpu.previewMedidas({ texto })` (dry-run, sem efeito) que a UI do editor de registro chama para mostrar as medidas detectadas antes de salvar.

**Persistência (no save):** dentro do `registros.create`, quando `tipo === 'ciencia'`, `processoId` presente e `parseDecisaoMPU(conteudo).medidas.length > 0`:

1. Resolve `processos_vvd` por CNJ (`processos.numeroAutos` do `processoId` → `processosVVD.numeroAutos`). Se não houver, retorna as medidas no payload mas pula a persistência.
2. Substitui as linhas `origem='parser'` em `medidas_mpu` e insere as novas.
3. Atualiza `processos_vvd`: `mpuAtiva = true`, `dataDecisaoMPU`, `faseProcedimento = 'decisao_liminar'`, `motivoUltimaIntimacao = 'ciencia_decisao_mpu'`, `distanciaMinima` (maior distância), `prazoMpuDias`, `dataVencimentoMPU`.
4. Cria evento em `historico_mpu`: `tipoEvento = 'concessao'`, `medidasVigentes` = resumo, `novaDistancia`, `dataEvento`.

O `registros.create` retorna `medidasCriadas` no payload (espelhando o `audienciaCriada` já existente), que o `registro-editor.tsx` exibe. Esses campos de `processos_vvd` é que movem a esteira e os KPIs.

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
| migration + schema `vvd.ts` | tabela `medidas_mpu` | — |
| `aplicar-medidas-mpu.ts` | parse → persist medidas + esteira + histórico (tx) | parser, schema |
| `registros.create` hook | dispara `aplicarMedidasMPU` no save | aplicar |
| `mpu.previewMedidas` (tRPC) | dry-run para o preview | parser |
| `registro-editor.tsx` | exibe `medidasCriadas` / preview | tRPC |

O parser é a peça central e totalmente testável em isolamento.
