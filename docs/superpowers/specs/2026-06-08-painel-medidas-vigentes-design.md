# Painel de medidas vigentes (medidas_mpu) — design

**Data:** 2026-06-08
**Branch:** `feat/painel-medidas-vigentes`
**Atribuição:** VVD (Violência Doméstica) — paleta amber

## Problema

A tabela `medidas_mpu` (1 linha por medida protetiva, populada pelo parser de decisões — ver `2026-06-07-parser-mpu-medidas-design.md`) **não tem nenhuma superfície de UI**. As medidas estruturadas (afastamento, aproximação+distância, contato+meios, frequentar+lugares, etc.) ficam invisíveis: o `tab-mpu.tsx` do caso é um stub que só linka para a "vista técnica", a página global `admin/vvd/medidas` mostra MPU apenas no nível do processo (campos string `tiposMPU`/`distanciaMinima`), e o `DossieV2Block` da agenda não exibe medidas.

## Objetivo

Tornar as medidas vigentes visíveis e gerenciáveis, com **um núcleo reutilizável** consumido por três superfícies. Gestão completa (leitura + mudança de status + adicionar manual) no caso e na página global; resumo read-only na agenda.

**Fato de domínio:** as MPU da VVD de Camaçari **não são submetidas a prazo** — logo `dataVencimento`/`prazoMpuDias` são tipicamente nulos. O painel NÃO pode depender de vencimento para funcionar; mostra-o só quando existir.

Não-objetivos (YAGNI): gestão de medidas na agenda; status `prorrogada` (não se aplica sem prazo); edição dos parâmetros de uma medida derivada do parser (muda-se só o status, ou adiciona-se manual).

## 1. Núcleo

### 1a. Rótulos canônicos — em `src/lib/mpu/medidas-taxonomia.ts`

Fonte única de rótulos PT-BR, reusada por todos os consumidores e pelo toast do editor:

```ts
export const STATUS_MEDIDA = {
  ATIVA: "ativa",
  CUMPRIDA: "cumprida",
  DESCUMPRIDA: "descumprida",
  REVOGADA: "revogada",
  SUSPENSA: "suspensa",
} as const;
export type StatusMedida = (typeof STATUS_MEDIDA)[keyof typeof STATUS_MEDIDA];

export const STATUS_MEDIDA_LABEL: Record<StatusMedida, string> = { /* PT-BR */ };

/** Rótulo legal do código (do catálogo); fallback para o próprio código. */
export function rotuloMedida(codigo: string): string { /* lookup em CATALOGO_MEDIDAS */ }
```

### 1b. Router `mpu` (estende `src/lib/trpc/routers/mpu.ts`)

- `listMedidas({ processoId?, processoVvdId?, assistidoId? })` (query) — resolve o `processo_vvd` (por CNJ quando vier `processoId` core, mesma lógica de `aplicarMedidasMPU`; direto quando vier `processoVvdId`; por assistido via partes/processos quando vier `assistidoId`). Retorna `{ processoVvdId, numeroAutos, medidas: MedidaMPURow[], mpu: { ativa, dataDecisao, dataVencimento, distanciaMinima } }`. Vazio (não erro) quando não há `processo_vvd`.
- `setStatusMedida({ id, status })` (mutation) — valida `status` ∈ `STATUS_MEDIDA`; atualiza `medidas_mpu.status`, `updatedAt`, e marca `origem='manual'` (blinda da reimportação do parser, conforme idempotência do parser).
- `addMedidaManual({ processoVvdId, codigo, artigo?, distanciaMetros?, parametros?, dataDecisao?, dataVencimento? })` (mutation) — valida `codigo` ∈ `MEDIDA_MPU`; insere com `origem='manual'`, `status='ativa'`.

Todas protegidas; a página global filtra por defensor visível como o resto de `vvd` (padrão `ctx.user.id` / `defensoresVisiveis`).

### 1c. Componente reutilizável

`src/components/mpu/medidas-vigentes-panel.tsx` + `medida-mpu-card.tsx`:
- `MedidaMpuCard` (apresentacional puro): recebe uma `MedidaMPURow`; mostra `rotuloMedida(codigo)`, `artigo`, distância (se houver), chips de `parametros.protegidos/meios/lugares`, badge de status (`STATUS_MEDIDA_LABEL`) e vencimento (se houver). Paleta amber.
- `MedidasVigentesPanel`: recebe `processoId`|`processoVvdId`|`assistidoId` e um booleano `readOnly`. Chama `mpu.listMedidas`, renderiza os cards. Quando `!readOnly`: dropdown de status por card (chama `setStatusMedida`) + botão "Adicionar medida" abrindo um diálogo com `select` de código (taxonomia) + distância opcional (chama `addMedidaManual`). Estado vazio: "Nenhuma medida estruturada — gere pela Ciência de MPU ou adicione manualmente."

## 2. Consumidor — aba MPU do caso (`tab-mpu.tsx`)

Substituir o stub por `<MedidasVigentesPanel processoId={procRef.id} />` (gestão completa, `readOnly={false}`). Mantém o link "Abrir vista técnica" como ação secundária.

## 3. Consumidor — página global (`admin/vvd/medidas/page.tsx`)

No painel de detalhe do processo selecionado (já carregado via `vvd.getProcessoById`), acrescentar uma seção "Medidas estruturadas" com `<MedidasVigentesPanel processoVvdId={processoSelecionado.id} />` (gestão completa) abaixo do resumo MPU atual. Sem reescrever as 785 linhas — só adicionar a seção.

## 4. Consumidor — DossieV2Block (agenda)

Acrescentar um resumo **read-only** (`<MedidasVigentesPanel processoId={...} readOnly />` ou um sub-resumo compacto): lista dos códigos vigentes (status `ativa`/`suspensa`) + distância. Glanceável; sem ações.

## 5. Testes

- Router: `listMedidas` resolve por CNJ (processoId core → processo_vvd → medidas); `setStatusMedida` seta `origem='manual'` e o status; `addMedidaManual` rejeita código inválido e insere `origem='manual'`.
- Taxonomia: `rotuloMedida` retorna rótulo legal para código conhecido e o próprio código para desconhecido; `STATUS_MEDIDA_LABEL` cobre todos os status.
- Componente: render do `MedidaMpuCard` com uma row mock (status badge + chips presentes; sem vencimento quando nulo).

## Arquitetura — unidades isoladas

| Unidade | Responsabilidade | Depende de |
|---|---|---|
| `medidas-taxonomia.ts` (+rótulos/status) | catálogo + rótulos PT-BR + status | nada |
| `mpu` router (`listMedidas`/`setStatusMedida`/`addMedidaManual`) | leitura/gestão de `medidas_mpu` | schema, taxonomia |
| `medida-mpu-card.tsx` | render de uma medida (puro) | taxonomia |
| `medidas-vigentes-panel.tsx` | lista + ações (gestão/readOnly) | router, card |
| `tab-mpu.tsx` | aba do caso (gestão) | panel |
| `admin/vvd/medidas/page.tsx` | seção estruturada no detalhe (gestão) | panel |
| `dossie-v2-block.tsx` | resumo read-only na agenda | panel |

O componente é a peça reutilizada; os três consumidores são finos. O núcleo (router + taxonomia) é testável em isolamento.

## Limitações / notas

- MPU de Camaçari sem prazo → vencimento normalmente nulo; o painel funciona sem ele.
- `setStatusMedida` marca `origem='manual'`: depois disso, um reparse do parser não sobrescreve aquela linha (comportamento desejado).
- O resumo da agenda é read-only por decisão de escopo.
