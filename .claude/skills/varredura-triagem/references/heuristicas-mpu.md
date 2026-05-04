# Heurísticas MPU — Triagem Defensiva (defesa do requerido)

> Premissa: o assistido é o REQUERIDO (a pessoa demandada a cumprir a MPU).
> Toda classificação opera sob essa ótica. Caso atípico (defesa da requerente)
> exige flag explícita — esta tabela não cobre.

Ordem importa: a primeira regra que casa vence. Regras mais específicas
ficam em cima. Padrões usam `re.IGNORECASE` e operam em texto **normalizado**
(sem acento, lowercase) — ver `normalize()` no script.

## Tabela canônica

| Pattern (texto normalizado) | Ato | Prioridade | Prazo (dias) | Registro | Fase | Motivo |
|---|---|---|---|---|---|---|
| `designada.{0,40}audiencia.{0,20}(justifica\|aij)` | Defesa em audiência de justificação | URGENTE | 5 | diligencia | audiencia_designada | ciencia_audiencia |
| `(deferi\|defiro).{0,40}medidas? protetiva` (em "Decisão") | Analisar viabilidade de agravo | NORMAL | 15 | diligencia | decisao_liminar | ciencia_decisao_mpu |
| `(prorrog\|renov\|manten\|continui).{0,30}(medida\|mpu\|protetiva)` | Manifestar contra prorrogação de MPU | URGENTE | 5 | diligencia | manifestacao_pendente | manifestar_renovacao |
| `(pedido\|requeri).{0,30}revogac` (pela requerente / MP) | Acompanhar pedido de revogação | BAIXA | — | anotacao | manifestacao_pendente | manifestar_revogacao |
| `(notic\|comunic).{0,30}descumpriment` (Lei 11.340 art. 24-A) | Defesa criminal — descumprimento art. 24-A | URGENTE | 5 | diligencia | descumprimento_apurado | manifestar_descumprimento |
| `laudo.{0,20}psicossoci\|estudo psicossoci` | Manifestar sobre laudo psicossocial | NORMAL | 10 | diligencia | manifestacao_pendente | manifestar_laudo |
| `(modul\|redu).{0,40}(raio\|distancia\|medida)` | Manifestar sobre modulação de MPU | NORMAL | 10 | diligencia | manifestacao_pendente | manifestar_modulacao |
| `tornozeleira\|monitoramento eletronico` | Contestar imposição de tornozeleira | URGENTE | 5 | diligencia | manifestacao_pendente | manifestar_modulacao |
| Vencimento próximo (proativo, sem texto — campo `data_vencimento_mpu`) | Pleitear não-renovação de MPU | BAIXA | até venc. | diligencia | expirada | intimacao_generica |
| TOMAR CIÊNCIA genérico (fallback) | Ciência | BAIXA | — | ciencia | manifestacao_pendente | intimacao_generica |

Os valores de **Fase** correspondem a `FASE_PROCEDIMENTO` em `src/lib/mpu-constants.ts`.
Os valores de **Motivo** correspondem a `MOTIVO_INTIMACAO` no mesmo arquivo.

## Exemplos reais de texto que dispara cada regra

### Defesa em audiência de justificação
> "...DESIGNO audiência de justificação para o dia 12/05/2026 às 14h, no
> Fórum desta Comarca, intimando-se as partes..."

### Analisar viabilidade de agravo (MPU deferida)
> "...DEFIRO as medidas protetivas requeridas, determinando ao requerido:
> (a) afastamento do lar; (b) proibição de aproximação..."

### Manifestar contra prorrogação
> "...intime-se o requerido para, no prazo de 5 dias, manifestar-se sobre
> o pedido de prorrogação das medidas protetivas formulado pela
> requerente..."

### Acompanhar pedido de revogação
> "...a requerente compareceu em juízo manifestando interesse na revogação
> das medidas protetivas, alegando reconciliação..."

### Defesa criminal — descumprimento art. 24-A
> "...notícia de descumprimento das medidas protetivas pelo requerido,
> conforme registro policial em apenso. Encaminhe-se ao MP para
> oferecimento de denúncia (art. 24-A da Lei 11.340/2006)..."

### Manifestar sobre laudo psicossocial
> "...juntado aos autos o laudo psicossocial elaborado pelo CRAM, abra-se
> vista ao requerido pelo prazo de 10 dias..."

### Manifestar sobre modulação
> "...requereu o requerido a modulação da medida protetiva, reduzindo o
> raio de afastamento de 200m para 100m..."

### Contestar imposição de tornozeleira
> "...em razão do reiterado descumprimento, decreto a aplicação de
> monitoramento eletrônico (tornozeleira) ao requerido..."

## Bugs conhecidos / casos limite

- **"medida protetiva" pode aparecer em decisão de processo que NÃO é MPU**
  (ex.: criminal comum citando uma MPU como antecedente). Por isso a
  detecção `is_mpu` precisa ser feita ANTES de aplicar `RULES_MPU` —
  baseada em `processos_vvd.tipo_processo`, `mpu_ativa` ou prefixo
  `MPUMP*` no número (ver `src/lib/mpu.ts`).

- **"audiência de justificação"** existe em outros contextos (execução penal).
  Por isso a regra MPU vem só quando `is_mpu=True`. Em RULES_BASE existe
  uma regra similar mas com ato genérico "Ciência designação de audiência".

- **Sigilo polo passivo VVD**: para ler partes/decisão de processos MPU é
  necessário usar o popup "Peticionar" → token `ca` → `listProcessoCompleto.seam`
  (ver `reference_pje_polo_passivo_scraping.md` na memória).
