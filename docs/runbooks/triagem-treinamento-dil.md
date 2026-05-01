# Treinamento — Equipe de Triagem Criminal (Dil)

**Duração:** ~2h (1h teoria + 1h prática)
**Material:** PPT da Juliane + planilha "Triagem Criminal" + acesso Drive

## Bloco 1 — Conceitos (15 min)

1. **Quem somos:** 4 defensores criminais + Dil como apoio dedicado
2. **Áreas e atribuições:**
   - Júri, EP, VVD — Rodrigo e Juliane revezam mês a mês (mês ímpar: Rodrigo Júri+EP / Juliane VVD; mês par: invertido)
   - 1ª Vara Criminal — Cristiane
   - 2ª Vara Criminal — Danilo
3. **Solar ≠ Planilha:** o Solar continua obrigatório (sistema oficial DPE-BA). A planilha "Triagem Criminal" é COMPLEMENTAR e ajuda a equipe a ver em tempo real os atendimentos da Dil.
4. **Atendimento da triagem ≠ demanda do defensor:** atendimentos registrados pela Dil não são ainda demandas dos defensores — são "leads" que o defensor avalia e decide se:
   - Promove a demanda (entra no fluxo de trabalho dele)
   - Resolve na triagem (se resolveu só com documento entregue ou orientação)
   - Devolve à Dil (falta informação)
   - Arquiva / encaminha

## Bloco 2 — Material da Juliane (15 min)

Recapitular os slides principais do PPT:
- **Fluxo penal comum:** Citação → Resposta à acusação (10 dias) → Audiência → Sentença → Recurso
- **Audiência designada:** urgência média (≤7 dias é urgente)
- **Sentença:** alegações finais / memoriais
- **Mandado de prisão em aberto:** URGENTE (marcar no dia, comunicar defensor)
- **Júri art. 422:** 5 dias para arrolar testemunhas
- **Regra de ouro Solar:** cadastro SEMPRE pelo nome do assistido, nunca pelo familiar
- **4 modelos prontos pra entrega:** União Estável, Destit. Advogado, Hipossuficiência, Atestado comparecimento

## Bloco 3 — Planilha Triagem Criminal (30 min)

### As 12 abas

**Operacionais (onde a Dil registra):**
1. **Júri** — atendimentos de processos do Tribunal do Júri
2. **VVD** — Maria da Penha + Vara de Violência Doméstica
3. **EP** — Execução Penal
4. **1ª Crime** — Cristiane
5. **2ª Crime** — Danilo

**Auto-geradas (read-only):**
6. **Hoje** — mostra o que a Dil registrou hoje (QUERY automática)
7. **Pendências** — mostra erros de sync + itens urgentes sem confirmação + sem Solar

**Referência (consulta):**
8. **Escala** — qual defensor está de plantão neste mês
9. **Plenários** — calendário do Júri
10. **Documentos prontos** — catálogo de modelos (aponta pro Drive)
11. **Cheat Sheet** — resumo visual do PPT da Juliane
12. **Stats** — estatísticas mensais (Fase 2)

### Como registrar um atendimento (ordem)

1. **Identificar a área** pelo tipo de caso (consulta Cheat Sheet se dúvida)
2. **Abrir a aba correspondente** (ex: Júri)
3. **Inserir linha nova** (vai pra próxima linha vazia automaticamente)
4. **Preencher nesta ordem:**
   - Assistido (nome completo — obrigatório)
   - Telefone (com WhatsApp, se houver)
   - Compareceu (Próprio / Familiar / Outro — se Familiar, preencher a coluna Nome familiar da aba)
   - Situação processual (dropdown)
   - Nº Processo (se houver — formato CNJ 20 dígitos)
   - Urgência (Não / Mandado prisão / Audiência ≤7d / Pedido expresso)
   - Doc. entregue (Nenhum / União Estável / Destit. Adv / Hipossuficiência / Outro)
   - Demanda (texto livre — "o que o assistido quer")
5. **Aguardar sync:** coluna "Status sync" mostra `✓ #N` (link clicável pro OMBUDS) em segundos
6. **Cadastrar no Solar** (processo institucional)
7. **Copiar protocolo Solar de volta** na coluna "Protocolo Solar" da planilha

### Sinalizações visuais

| Cor / sinal | Significado |
|---|---|
| Linha rosa | Urgência marcada |
| Célula verde com `✓` | Sync OK — atendimento chegou no OMBUDS |
| Célula vermelha com `❌` | Sync com erro (passar mouse pra ver motivo) |
| Nome em itálico azul | Assistido recorrente (já atendido antes) |
| Célula amarela em "Defensor atribuído" | Override da sugestão automática |

### Reprocessar erros

Menu **⚡ Triagem → Reprocessar pendências**:
- **Linha atual:** reprocessa apenas a linha onde cursor está
- **Todas as abas:** reprocessa todas as linhas com `❌` em status sync

## Bloco 4 — Drive de modelos (10 min)

**Localização:** `Drive Compartilhado → Defensoria 9ª → Triagem Criminal — DP Camaçari`

**Pasta principal da Dil:** `1. Modelos prontos para entrega/`

4 modelos disponíveis no MVP:
- Declaração de União Estável (esposa quer visitar preso)
- Destituição de Advogado (trocar adv. particular pela DP)
- Declaração de Hipossuficiência (comprovação de baixa renda)
- Atestado de comparecimento à DP (assistido precisa apresentar no trabalho/escola)

**Procedimento de entrega:**
1. Identificar a necessidade (ex: esposa do Sr. João quer visita íntima)
2. Abrir o modelo (duplo clique)
3. **Arquivo → Fazer uma cópia** (para não sobrescrever o modelo)
4. Substituir os `{{placeholders}}` com os dados do caso
5. Imprimir
6. Colher assinatura presencial do assistido/familiar
7. Escanear e salvar em `4. Documentos gerados/[ano]/[mês]/[dia]/` (criar pasta do dia se não existir)
8. **Na planilha**, marcar `Doc. entregue = [modelo]` → o atendimento auto-resolve (Dil não precisa aguardar defensor)

## Bloco 5 — Encaminhamentos especiais (15 min)

| Situação | Ação imediata | Comunicação |
|---|---|---|
| Mandado de prisão em aberto | Marcar urgência "Mandado prisão" | Mandar mensagem no grupo WhatsApp com @defensor |
| Audiência marcada ≤7d | Urgência "Audiência ≤7d" | Só se o defensor ainda não tiver ciência |
| Pedido expresso de defensor específico (ex: "quero falar com Dra. Juliane") | Override no dropdown "Defensor atribuído" + preencher motivo | — |
| Caso sem processo | Registrar em 1ª Crime por convenção | — |
| ANPP (Fase 2) | Apenas registrar, sem montar kit ainda | Defensor decide |

## Bloco 6 — Prática (60 min)

5 cenários simulados:

1. **Esposa do preso quer visita íntima** → modelo União Estável, auto-resolve
2. **Assistido com citação 1ª Vara Crime** → aba 1ª Crime, encaminhar Cristiane
3. **Mãe traz intimação de plenário do filho** → urgente, Júri, conferir Escala pra ver defensor do mês
4. **Mandado de prisão em aberto** → URGENTE, WhatsApp imediato
5. **Assistido que foi atendido mês passado volta com novo problema** → notar itálico azul na planilha (recorrente), registrar nova linha mesmo assim

## Apoio contínuo

- **Grupo WhatsApp dos 4 defensores + Dil** — dúvidas em tempo real
- **Cheat Sheet (aba 11)** — primeira consulta antes de perguntar
- **Pendências (aba 7)** — revisar final do dia; devolutivas do defensor aparecem lá
- **Página /triagem no OMBUDS** — Dil pode abrir pra ver os atendimentos com status atualizado

## Primeiros 15 dias

- **Dias 1-3:** Juliane ou Rodrigo acompanham os atendimentos em tempo real (sentam com a Dil após cada registro)
- **Dia 7:** revisão do que deu certo / errado, ajustes na planilha se necessário
- **Dia 15:** feedback formal → decidir se parte pra Fase 2 (ANPP, WhatsApp Business, modelos expandidos)
