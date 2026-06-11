# Eventos de audiência via anotações rápidas, Concluir e ajuste manual

**Data:** 2026-06-11 · **Status:** aprovado pelo Rodrigo

## Problema

Quando uma audiência não acontece (vítima ausente, testemunha não localizada, excesso de pauta…), hoje o registro fica solto numa anotação rápida em texto livre. Não há:

- estado estruturado "redesignada sem nova data" (cartório vai designar) com motivo;
- pendência visível "aguardando nova data" nem resolução automática quando a nova designação chega;
- caminho no fluxo Concluir para "não foi realizada" (com ou sem nova data já conhecida);
- parsing das anotações rápidas (são JSONB texto-livre puro).

Caso concreto: audiência VVD de 11/06 10h suspensa por ausência da suposta vítima, apesar de intimada; cartório definirá nova data.

## Decisões (com o usuário)

1. **Pendência**: flag na audiência + badge + **resolução automática** quando o parser de designação detectar nova data do processo. Sem demanda/card extra.
2. **Parsing**: detecta ao salvar a anotação e **sugere; usuário confirma** (banner com botão Aplicar). Nada muda sem confirmação.
3. **Catálogo de motivos**: ausência da vítima; ausência de testemunha/réu (incl. réu não conduzido); pauta/juízo/estrutura (suspensa pelo juízo, excesso de pauta, problema técnico, magistrado ausente); outro (texto livre sempre disponível).

## Arquitetura escolhida

Campos novos na própria `audiencias` + parser determinístico (padrão `parseDecisaoMPU`: catálogo de regex, gate de polaridade, falso negativo seguro). Rejeitados: tabela nova de eventos (duplicaria `audienciasHistorico`/registros) e parsing por LLM (anotações curtas e padronizáveis; determinístico é auditável).

## Componentes

### 1. Schema (drizzle/schema.ts **e** src/lib/db/schema/agenda.ts + migração)

- `audiencias.motivoNaoRealizacao` varchar(40): `ausencia_vitima | ausencia_testemunha | ausencia_reu | reu_nao_conduzido | pauta_juizo | problema_tecnico | outro`
- `audiencias.motivoDetalhe` text — texto livre / anotação original
- `audiencias.aguardandoNovaData` boolean NOT NULL default false

### 2. Parser — `src/lib/agenda/parse-anotacao-audiencia.ts`

`parseAnotacaoAudiencia(texto): { evento: 'redesignada'|'suspensa'|'adiada'|'cancelada', motivo: MotivoNaoRealizacao|null, motivoDetalhe: string, novaData: string|null, novaHora: string|null } | null`

- Evento por keywords (redesignad-, suspens-, adiad-, cancelad-, "não foi realizada", "não se realizou").
- Motivo pelo catálogo: "ausência da (suposta) vítima", "vítima não compareceu/intimada não compareceu" → `ausencia_vitima`; testemunha ausente/não localizada → `ausencia_testemunha`; réu ausente → `ausencia_reu`; "não foi conduzido/sem escolta" → `reu_nao_conduzido`; "excesso de pauta/pauta do juízo/suspensa pelo juízo/magistrado" → `pauta_juizo`; "videoconferência/sistema/link" → `problema_tecnico`; senão `outro`.
- Nova data/hora: reusa padrões de data/hora do `audiencia-parser.ts` (`parseAudienciaFromText`).
- **Gate de polaridade**: "realizada", "mantida", "confirmada" sem termo de cancelamento → retorna null. Na dúvida, null.

### 3. Detecção com confirmação (UI)

- `addQuickNote` roda o parser e devolve `deteccao` na resposta, **sem efeito colateral**.
- Banner na nota: "Detectado: redesignação por ausência da vítima, sem nova data — aplicar?" com Aplicar + popover para editar motivo/data antes.
- Notas existentes: ação "Estruturar" no menu da nota roda o parser sob demanda.

### 4. Mutation `audiencias.aplicarEventoAudiencia`

Input: `{ audienciaId, evento, motivo, motivoDetalhe?, novaData?, novaHora?, novoLocal? }`. Funil único para banner, Concluir e ajuste manual.

- **Sem nova data**: status → `redesignada`, `aguardandoNovaData = true`, grava motivo/detalhe; remove evento do Google Calendar (best-effort, fora da transação — padrão atual).
- **Com nova data**: mesmas gravações + chama `aplicarDesignacaoAudiencia` (cria a nova `agendada`, cancela futuras fora do dia, corrige 00:00 — lógica existente, zero duplicação).

### 5. Resolução automática

No fim de `aplicarDesignacaoAudiencia` (funil de toda designação: registro de ciência, pje-import, manual): limpa `aguardandoNovaData` das audiências do processo. Cartório designa → ciência/import → badge some sozinho.

### 6. Fluxo Concluir

Diálogo ganha "A audiência foi realizada?".

- **Não** → motivo (catálogo + texto livre) e "já saiu com nova data?" (sim → data/hora, cria a nova na hora; não → liga flag). Chama `aplicarEventoAudiencia`.
- **Sim** → fluxo atual intacto (`marcarConcluida`: sentenciado / instrução encerrada / outra).

### 7. Ajuste manual

`audiencia-manager-modal` e `event-detail-sheet`: campos editáveis motivo + flag aguardando nova data, junto do status existente.

### 8. Sinalização

- Badge âmbar "⏳ Aguardando nova data — {motivo}" no card da agenda e no painel do processo.
- Audiência com `aguardandoNovaData` **sai do cálculo de `proximaAgendada`** (não é audiência futura válida), mas continua listada com badge.
- Contador/filtro de pendências no topo da agenda.

## Erros e bordas

- Parser nunca aplica nada sozinho; aplicar exige clique.
- Polaridade: texto ambíguo → null (sem banner), nunca redesignação indevida.
- GCal best-effort fora da transação; falha não bloqueia.
- Status sempre minúsculo (bug conhecido de casing).
- Timezone: nova data segue fórmula existente `new Date(\`${data}T${hora}:00-03:00\`)`.

## Testes

- Unitários do parser: com data, sem data, cada motivo do catálogo, negativos de polaridade ("audiência realizada"), anotações não relacionadas.
- `aplicarEventoAudiencia`: ramo sem data (flag + status), ramo com data (delega a `aplicarDesignacaoAudiencia`), resolução da flag na designação seguinte.
