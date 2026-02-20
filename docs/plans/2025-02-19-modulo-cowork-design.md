# Design: Modulo Cowork — Trabalho em Equipe

> Data: 2025-02-19
> Status: Aprovado
> Autor: Dr. Rodrigo + Claude (brainstorming)

## Contexto

Equipe da Defensoria Publica:

| Pessoa | Papel | Atribuicao |
|--------|-------|------------|
| Dr. Rodrigo | Defensor | Juri, EP, VVD (varas compartilhadas) |
| Dra. Juliane | Defensora | Juri, EP, VVD (mesmas varas) |
| Amanda | Analista/Servidora | 1o atendimento VVD, registro, minutas VVD/Juri/EP |
| Emilly | Estagiaria (Rodrigo) | Elaboracao de minutas, atividades delegadas |
| Taissa | Estagiaria (Juliane) | Elaboracao de minutas, atividades delegadas |

### Dores identificadas
1. Perder rastreio de delegacoes (nao sabe se estagiaria fez a minuta)
2. Amanda fora do sistema (atendimentos VVD no Drive)
3. Cobertura informal com Juliane (WhatsApp)
4. Falta de workflow estruturado (delegar -> revisar -> protocolar)

### Fluxo real de minutas
Defensor delega -> Estagiaria elabora -> Avisa defensor -> Defensor revisa -> Protocola

---

## 6 Features

### Prioridade de implementacao

1. **Pedido de Trabalho** (resolve rastreio + workflow)
2. **Transferencia de Caso** (resolve cobertura)
3. **Pedido de Parecer** (resolve consultas rapidas)
4. **Painel da Amanda** (resolve integracao)
5. **Acompanhar Caso** (complementa visibilidade)
6. **Mural de Equipe** (nice to have)

---

## Feature 1: Pedido de Trabalho

Evolucao da delegacao generica para pedidos tipados com workflow.

### Tipos de pedido

| Tipo | Icone | Destinatario tipico | Workflow |
|------|-------|---------------------|----------|
| Minuta | FileEdit | Emilly, Taissa | Solicitado -> Em elaboracao -> Aguardando revisao -> Revisado -> Protocolado |
| Atendimento | UserCheck | Amanda | Solicitado -> Realizado -> Registrado |
| Diligencia | Search | Emilly, Taissa, Amanda | Solicitado -> Em andamento -> Concluido |
| Analise | BookOpen | Amanda, Juliane | Solicitado -> Em analise -> Parecer emitido |
| Outro | MoreHorizontal | Qualquer | Solicitado -> Em andamento -> Concluido |

### Campos

- Tipo (obrigatorio): select dos 5 tipos
- Assistido (obrigatorio): busca
- Processo (opcional): dropdown dos processos do assistido
- Destinatario (obrigatorio): membro da equipe
- Descricao/Instrucoes (obrigatorio): textarea contextual
- Prazo (opcional): data
- Prioridade (default Normal): Baixa / Normal / Urgente
- Orientacoes (novo): texto livre para referencias

### Impacto banco

Tabela `delegacoesHistorico`:
- + coluna `tipo` varchar(20): 'minuta', 'atendimento', 'diligencia', 'analise', 'outro'
- + coluna `orientacoes` text
- Expandir status para: 'aguardando_revisao', 'revisado', 'protocolado'

---

## Feature 2: Transferencia de Caso

### Modo 1: Cobertura Temporaria

Usa tabela `afastamentos` existente.

- Tipo: Ferias / Licenca / Capacitacao / Outro
- Periodo: data inicio -> data fim
- Substituto: select de defensores
- Acesso: demandas check / equipe check
- Preview: mostra quantas demandas/audiencias/juris serao cobertos
- Reversao automatica ao fim do periodo

### Modo 2: Transferencia Permanente

- Assistido ou Processo (busca)
- Para quem: select de defensores
- Motivo (obrigatorio)
- Transferir demandas ativas: checkbox
- Atualiza `defensorId` em batch
- Historico preservado no log

### Impacto banco

- `afastamentos` ja existe, so precisa de UI
- `compartilhamentos` ja existe para transicao
- Novo procedure `transferirCaso` no router

---

## Feature 3: Pedido de Parecer

Consulta rapida vinculada ao caso, sem transferencia de responsabilidade.

### Fluxo

Defensor abre caso -> Pedir parecer -> Seleciona colega -> Escreve pergunta -> Colega responde -> Resposta vinculada ao caso

### Diferenca do Pedido de Trabalho

- Pedido de Trabalho = "faca algo" (acao, prazo, entrega)
- Pedido de Parecer = "me diga algo" (opiniao, consultivo)

### Campos

- Assistido/Processo (contexto)
- Para quem (qualquer membro, inclusive defensores)
- Pergunta (textarea)
- Urgencia: Normal / Urgente

### Resposta

- Parecer (textarea)
- Referencias (opcional)

### Status: Solicitado -> Respondido -> Lido

### Impacto banco

Nova tabela `pareceres`:
```
id, solicitanteId, respondedorId,
assistidoId?, processoId?,
pergunta, resposta,
status ('solicitado'|'respondido'|'lido'),
urgencia ('normal'|'urgente'),
dataSolicitacao, dataResposta,
workspaceId, createdAt
```

---

## Feature 4: Painel da Amanda

Dashboard adaptada para role `servidor` com foco VVD.

### Secoes

1. Meus Pedidos (delegacoes recebidas) no topo
2. Registro Rapido simplificado (foco atendimento VVD)
3. Historico do dia (registros feitos hoje)

### Implementacao

- Condicional no dashboard: `role === "servidor"`
- Usa `minhasDelegacoes` existente
- Registro Rapido usa `demandas.create` com tipo "atendimento"
- Auto-vincula ao defensor responsavel via `defensorId` do assistido

### Impacto banco: Zero alteracoes

---

## Feature 5: Acompanhar Caso (Watch)

Botao "Acompanhar" para seguir caso alheio e receber notificacoes.

### Notificacoes geradas

- Nova demanda criada
- Prazo vencendo
- Audiencia marcada
- Status alterado

### Implementacao

Usa tabela `compartilhamentos` existente:
- entidadeTipo: "caso" | "processo" | "assistido"
- compartilhadoComId: profissionalId
- motivo: "Acompanhamento"
- dataFim: null (permanente ate cancelar)

### Impacto banco: Zero alteracoes

---

## Feature 6: Mural de Equipe

Feed de notas/avisos vinculados (ou nao) a casos.

### Tipos de nota

- Aviso geral (sem vinculo)
- Nota sobre caso (vinculada a assistido/processo)
- Mencao (@membro) gera notificacao

### Campos

- Mensagem (textarea)
- Vincular a (opcional): buscar assistido/processo
- Mencionar (opcional): selecionar membros
- Fixar (checkbox): nota fica no topo

### Impacto banco

Nova tabela `muralNotas`:
```
id, autorId, mensagem,
assistidoId?, processoId?,
fixado boolean,
mencionados integer[],
workspaceId, createdAt
```

---

## Resumo de Impacto

### Novas tabelas

| Tabela | Feature |
|--------|---------|
| `pareceres` | Pedido de Parecer |
| `muralNotas` | Mural de Equipe |

### Tabelas modificadas

| Tabela | Mudanca |
|--------|---------|
| `delegacoesHistorico` | + tipo, + orientacoes, novos status |

### Tabelas reutilizadas (sem mudanca)

| Tabela | Feature |
|--------|---------|
| `afastamentos` | Transferencia temporaria |
| `compartilhamentos` | Acompanhar Caso |

### Dashboard Cowork (4 atalhos reais)

```
[Pedir Trabalho] [Parecer] [Cobrir Colega] [Mural]
```
