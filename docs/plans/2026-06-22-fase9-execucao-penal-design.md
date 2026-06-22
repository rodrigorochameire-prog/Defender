# Fase IX · Execução Penal — Design (Spec-Driven)

**Data:** 2026-06-22
**Seed:** mapa-mestre `2026-04-18-ombuds-mapa-mestre-inteligencia.md` (seção Fase IX).
**Spec-master:** `2026-06-22-aprimoramentos-ombuds-spec-master.md` (desbloqueia flag I.1).
**Método:** TDD + spec-driven. Fatiado para entregar valor sem migração imediata.

## Princípio de fatiamento

A peça de maior valor — **prescrição executória iminente** — é uma **função pura** (entrada tipada → veredito). Logo:
- **Fatia 1 (esta, sem migração):** função pura `calcularPrescricaoExecutoria` + testes. Valor algorítmico-coroa, risco zero em prod.
- **Fatia 2 (com checkpoint):** schema Drizzle dos blocos da Fase IX + migração.
- **Fatia 3:** tRPC readers + UI dashboard `/admin/execucao-penal` + integração com `/admin/demandas` (flag gera demanda com prazo).

## Fatia 1 · Prescrição da Pretensão Executória (PPE)

### Base legal modelada
- **Art. 109 CP** — prazos prescricionais pela pena (tabela).
- **Art. 110 CP** — PPE regula-se pela pena aplicada; **+1/3 se reincidente**.
- **Art. 113 CP** — evasão/revogação de livramento: prescrição pela **pena residual** (modelo adotado como base, por ser o mais útil ao detector "preso há muito, pena quase prescrita").
- **Art. 115 CP** — prazo **reduzido à metade** se menor de 21 na data do fato ou maior de 70 na data da sentença.
- **Art. 112/117 CP** — termo inicial / interrupção: `marcoInterruptivo` = data do último marco (início/continuação do cumprimento, trânsito p/ acusação, recaptura pós-fuga).

### Contrato (função pura)
```ts
interface PrescricaoExecutoriaInput {
  penaTotalDias: number;
  diasCumpridos: number;
  diasRemidos?: number;
  diasDetraidos?: number;
  reincidente?: boolean;
  menor21NaDataFato?: boolean;
  maior70NaDataSentenca?: boolean;
  marcoInterruptivo: string;      // ISO date do último marco interruptivo
  hoje?: Date;                    // injetável p/ teste
  janelaIminenciaDias?: number;   // default 180
}
interface PrescricaoExecutoriaResult {
  penaResidualDias: number;
  prazoPrescricionalDias: number;
  diasDecorridos: number;
  diasParaPrescricao: number;     // prazo − decorrido (negativo = já consumada)
  iminente: boolean;
  nivel: "amber" | "red";
  motivo: string;
}
```

### Regra
```
residual = max(0, penaTotal − cumprido − remidos − detraidos)
se residual <= 0 → null (pena praticamente extinta; não é caso de PPE)
prazoAnos = tabela109(residual/365)
prazoDias = prazoAnos·365 · (reincidente?4/3:1) · (art115?1/2:1)
decorrido = hoje − marcoInterruptivo
faltam = prazoDias − decorrido
se faltam > janela → null
nivel = (faltam <= 0 || faltam <= 60) ? "red" : "amber"
```

`tabela109(anos)`: >12→20 · >8→16 · >4→12 · >2→8 · >=1→4 · senão 3 (limites do art. 109 I–VI).

### Disclaimer de produto
Sinal para **provocar a extinção** (petição de prescrição), não opinião legal fechada. PPE tem controvérsias (termo inicial p/ réu solto, Súmula 220 STJ sobre reincidência na sentença) — a UI deve dizer "verificar prescrição executória", com os números do cálculo expostos para conferência.

## Fatia 2 · Schema (futuro — requer migração, checkpoint)
Blocos do mapa-mestre: Título Executivo · Cronologia Executiva · Comportamento/Faltas · Endereço/Contato do Executado · Benefícios Pleiteados. Entidades de catálogo: `unidades_prisionais`, `locais_cumprimento_alternativo`.

## Fatia 3 · Apresentação (futuro)
Dashboard `/admin/execucao-penal`, timeline executiva (reusa `ProcessoTimeline`), cards de alerta ordenados por urgência, geração de demanda automática com prazo.

## Log
- 2026-06-22: design criado; Fatia 1 (função pura PPE) em implementação TDD.
