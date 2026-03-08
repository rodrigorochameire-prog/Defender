# Design: Páginas de Recursos e Execução (Pós-Júri)

**Data:** 2026-03-07
**Status:** Aprovado

## Resumo

Duas novas páginas no módulo de Júri para o pós-julgamento:

1. **Recursos** (`/admin/juri/recursos`) — Lista agregada de todas as apelações ativas com acompanhamento de status macro.
2. **Execução** (`/admin/juri/execucao`) — Projeção de marcos da execução penal + handoff para defensores do 2º grau e EP + envio de informações via WhatsApp.

## Decisões de Design

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Estrutura Recursos | Lista agregada (todas sessões) | Visão panorâmica de todos os recursos ativos |
| Granularidade status | Status macro (5 estados) | PJe já tem os detalhes processuais |
| Tipo de recurso | Apenas Apelação | HC e demais são de outros defensores/fases |
| Campos extras | Turma/Câmara TJBA + relator | Mapear padrões de julgamento |
| REsp/RE | Flags + resultado | Registrar se houve, para inteligência |
| Execução | Página de handoff | Outro defensor acompanha a EP |
| Comunicação | Resumo + WhatsApp | Mensagem formatada editável antes de enviar |

## Schema

### Tabela `recursos_juri`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | serial PK | — |
| sessaoJuriId | FK sessoesJuri | Sessão que originou |
| casoId | FK casos | Caso vinculado |
| processoId | FK processos | Processo vinculado |
| reuNome | text | Nome do réu |
| status | enum | interposta → admitida → em_julgamento → julgada → transitada |
| turmaTJBA | text | Ex: "1ª Turma" |
| camaraTJBA | text | Ex: "1ª Câmara Criminal" |
| relator | text | Nome do relator |
| resultadoApelacao | enum | provida · parcialmente_provida · improvida · nao_conhecida |
| houveREsp | boolean | Se houve Recurso Especial |
| resultadoREsp | enum | provido · improvido · nao_conhecido |
| houveRE | boolean | Se houve Recurso Extraordinário |
| resultadoRE | enum | provido · improvido · nao_conhecido |
| dataInterposicao | date | — |
| dataAdmissao | date | nullable |
| dataJulgamento | date | nullable |
| observacoes | text | — |
| createdAt/updatedAt | timestamp | — |

### Tabela `handoff_config`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | serial PK | — |
| comarca | text unique | — |
| defensor2grauInfo | text | Info do defensor do 2º grau |
| defensorEPInfo | text | Info do defensor da execução |
| nucleoEPEndereco | text | Endereço do núcleo |
| nucleoEPTelefone | text | Telefone |
| nucleoEPHorario | text | Horário de atendimento |
| mensagemPersonalizada | text | Texto adicional |

## Componentes

### Recursos Page
- Header com 3 stats inline (ativos, aguardando, taxa êxito)
- Filtros: status, ano
- Lista de cards: réu + processo + stepper status + turma/câmara + resultado júri
- Ações: atualizar status, registrar resultado

### Execução Page
- Seletor de sessão condenada
- Timeline vertical de marcos (progressão, livramento, fim de pena)
- Card "Próximos Passos" (handoff configurável por comarca)
- Botão "Enviar via WhatsApp" (gera mensagem formatada)

## Fluxo de Dados

```
sessoesJuri (condenação) → recursos_juri (apelação)
sessoesJuri + dosimetriaJuri → calcularExecucaoPenal() → timeline marcos
handoff_config (comarca) → card informações
WhatsAppService.sendText() → mensagem para réu/família
```
