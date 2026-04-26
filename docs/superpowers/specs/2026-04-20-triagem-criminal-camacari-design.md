# Triagem Criminal Camaçari — Design

**Data:** 2026-04-20
**Autor:** Rodrigo Rocha Meireles (DPE-BA, 9ª DP Camaçari) + Claude
**Contexto:** Reunião dos defensores criminais de Camaçari definiu vinculação de uma servidora da triagem (Dilcélia, "Dil") como apoio aos 4 defensores criminais. Material de treinamento preparado por Juliane (PPT, 17 slides) cobre fluxo penal comum, Júri, encaminhamentos, Solar, documentos prontos e WhatsApp grupo.
**Status:** Draft (aguardando revisão)

---

## 1. Visão geral

### 1.1 Objetivo

Estruturar o trabalho de triagem da Dil de forma que (a) cada atendimento gere um registro estruturado consultável pelos defensores, (b) tarefas operacionais delegáveis sejam transferidas pra ela com ferramental próprio (modelos prontos, planilha guiada, WhatsApp Business), e (c) a inteligência estratégica do OMBUDS receba o input dela sem misturar com a fila de demandas dos defensores.

### 1.2 Atores

- **Dil** — servidora da triagem. Opera Solar (institucional), planilha "Triagem Criminal" (novo), Drive de modelos prontos, WhatsApp Business dedicado.
- **Defensores criminais (4)** — Rodrigo + Juliane (Júri, EP, VVD em revezamento mensal); Cristiane (1ª Vara Criminal); Danilo (2ª Vara Criminal). Operam OMBUDS principalmente.
- **Colaboradoras internas** — Amanda, Emilly, estagiária Taissa. Recebem delegações dos defensores via Cowork.
- **OMBUDS** — fonte de verdade institucional dos casos e da escala.
- **Solar** — sistema oficial DPE-BA. Obrigatório, mas operado em paralelo (não sincronizado).

### 1.3 Decisões de design

| # | Decisão | Por quê |
|---|---|---|
| 1 | Planilha **separada** da planilha OMBUDS atual | Trabalho da Dil é diferente do trabalho do defensor; separar isola complexidade |
| 2 | **Planilha-primeiro** (depois Solar) | Cria registro OMBUDS imediato; Solar vira compliance secundário |
| 3 | **Defensor sugerido por fórmula + override manual** | Automação resolve 80% óbvios; override resolve exceções |
| 4 | **Entrega em 3 camadas** (MVP / Fase 2 / Fase 3) | Spec único cobre tudo; implementação respeita ondas pra não sobrecarregar a Dil |
| 5 | **Atendimentos da triagem ≠ demandas dos defensores** | Atendimentos são "leads"; defensor decide se viram demanda. Tabela separada (`atendimentos_triagem`) preserva integridade da fila de trabalho |
| 6 | **Cowork** (módulo OMBUDS) integrado em pontos cirúrgicos | Coberturas → Escala; Agenda → Plenários; promoção → delegação direta; urgências → Mural |
| 7 | **Bridge Claude Code** opcional pra geração de minutas e análise (Fase 2+) | Reduz fricção em documentos repetitivos; nunca trava UI |

### 1.4 Fluxo macro do atendimento

```
Assistido chega
  → Dil abre planilha "Triagem Criminal" (aba Atendimentos)
  → Insere linha nova (campos guiados)
  → Planilha sugere defensor pela aba Escala + tipo de caso
  → Dil confirma ou faz override (com motivo)
  → [Se urgência marcada → linha vira destacada + post automático no Mural Cowork]
  → Documento de pronta entrega? Imprime do Drive
  → Cadastro Solar (institucional)
  → Cola protocolo Solar de volta na linha
  → Linha vira ATENDIMENTO em OMBUDS (não demanda) → cai na página /triagem do defensor
  → Defensor avalia: Promover (vira demanda) / Resolver / Devolver / Encaminhar / Arquivar
```

---

## 2. Estrutura da planilha

**Spreadsheet:** "Triagem Criminal — DP Camaçari" (Drive compartilhado com Dil + 4 defensores + Amanda/Emilly/Taissa)

### 2.1 Mapa de abas

| # | Aba | Quem edita | Função |
|---|---|---|---|
| 1 | **Júri** | Dil | atendimentos da Vara do Júri |
| 2 | **VVD** | Dil | Maria da Penha + Vara de Violência Doméstica |
| 3 | **EP** | Dil | Execução Penal |
| 4 | **1ª Crime** | Dil | Cristiane |
| 5 | **2ª Crime** | Dil | Danilo |
| 6 | Hoje | auto (QUERY) | tudo lançado hoje, sort por hora |
| 7 | Pendências | auto (QUERY) | sync erro + sem Solar + urgência aberta |
| 8 | Escala | sync OMBUDS (cron 06h) | revezamento mensal + férias (lê de Cowork.Coberturas) |
| 9 | Plenários | sync OMBUDS (cron 06h) | calendário do júri (lê de Cowork.Agenda) |
| 10 | Documentos prontos | manual | catálogo c/ links Drive |
| 11 | Cheat Sheet | manual | resumo PPT Juliane |
| 12 | Stats | auto (gráficos) | mensal por defensor / tipo |

### 2.2 Colunas comuns nas 5 abas operacionais (14 colunas)

| # | Coluna | Notas |
|---|---|---|
| 1 | **#TCC** | protocolo interno auto: `TCC-2026-0001` |
| 2 | Data/hora | auto |
| 3 | Nome do assistido | obrigatório (regra Solar do PPT Juliane) |
| 4 | Telefone | um campo único; Dil marca se WhatsApp na obs |
| 5 | Compareceu | dropdown: Próprio / Familiar / Outro |
| 6 | Situação | dropdown contextual à aba |
| 7 | Nº processo | valida CNJ (20 dígitos) |
| 8 | **Defensor sugerido** | fórmula INDEX/MATCH na aba Escala |
| 9 | Defensor atribuído | dropdown, default = col. 8 |
| 10 | Urgência | dropdown: Não / Mandado prisão / Audiência ≤7d / Pedido expresso |
| 11 | Documento entregue | dropdown: Nenhum / União Estável / Destit. Adv / Outro |
| 12 | Demanda | texto livre |
| 13 | Protocolo Solar | preenchido após cadastro Solar |
| 14 | Status sync | auto: ✓ / ⚠ / ❌ + ID OMBUDS clicável |

### 2.3 Colunas específicas por aba

- **Júri** (+2): `Fase do Júri` (Pronúncia / 422 / Plenário designado) · `Data plenário`
- **VVD** (+2): `Pedido` (Medida protetiva / Retirada sigilo / Acompanhamento / Outro) · `Nome da ofendida` (se diferente)
- **EP** (+2): `Regime atual` (Fechado / Semi / Aberto / Provisório) · `Unidade prisional`
- **1ª Crime / 2ª Crime** (+0): núcleo cobre

### 2.4 Mecanismos de organização

1. **Aba "Hoje"** — `=QUERY` consolidado das 5 abas operacionais filtrando por data atual
2. **Aba "Pendências"** — sync ❌ + urgências sem confirmação + sem protocolo Solar há mais de 1 dia
3. **Numeração TCC sequencial** — protocolo interno único; referência rápida no grupo WhatsApp
4. **Validação cruzada** — célula amarela com tooltip se aba/situação inconsistente (ex: Júri + Citação)
5. **Detector de recorrência** — fórmula compara nome+CPF; assistido recorrente fica em itálico azul com link
6. **Color coding consistente com OMBUDS:**
   - Urgência marcada → linha rosa pastel
   - Sync ✓ → célula verde menta
   - Sync ❌ → célula rosa avermelhado
   - Defensor override (col 8 ≠ col 9) → célula amarelo claro
7. **Totalizador no topo de cada aba** (linhas 1-2 congeladas):
   "Hoje: 7 · Esta semana: 32 · Urgentes abertos: 1 · Sem Solar: 2"
8. **Checkboxes opcionais** (cols O, P): `☑ Solar feito` `☑ WhatsApp avisado`
9. **Aba "Stats"** com gráficos: atendimentos/dia por defensor, % com documento de pronto entregue, top 10 demandas por tipo

### 2.5 Formatação visual

- Cabeçalho congelado (linha 1)
- BasicFilter nas 2000 linhas
- Cores pastel iguais às do OMBUDS
- Validações dropdown pra todas as colunas categóricas

---

## 3. Integração OMBUDS

### 3.1 Modelo de dados — `atendimentos_triagem` (tabela nova)

```
atendimentos_triagem
  id
  tcc_ref              (ex: TCC-2026-0124)
  area                 (Juri / VVD / EP / Crime1 / Crime2)
  defensor_alvo        (quem deve avaliar)
  assistido_nome
  assistido_telefone
  assistido_cpf        (opcional)
  compareceu           (proprio / familiar / outro)
  familiar_nome
  familiar_telefone
  familiar_grau
  processo_cnj         (texto, não FK ainda)
  situacao             (citacao, audiencia_marcada, pronuncia_422, ...)
  urgencia             (boolean)
  urgencia_motivo
  documento_entregue
  demanda_livre        (texto)
  status               (pendente_avaliacao / promovido / resolvido / devolvido / arquivado)
  promovido_para_demanda_id  (FK quando vira demanda)
  delegado_para        (quando promovido com delegação)
  motivo_devolucao
  protocolo_solar
  criado_em
  decidido_em
  decidido_por
  metadata             (jsonb — cowork_output, etc)
```

**Por que separado de `demandas`:**
- Atendimentos da triagem são "caixa de entrada" — ainda não são trabalho efetivo do defensor
- Preserva métricas de produtividade (kanban, prazos) sem inflação artificial
- Permite estatísticas separadas (taxa de promoção, padrões de demandas livres)

### 3.2 UI no OMBUDS

Não vão pro kanban. Em vez disso:

1. **Badge no header**: "🔔 Atendimentos triagem (3 novos)"
2. **Página dedicada `/triagem`**:
   - Cards: TCC-0124 · Júri · 14:30 · "Citação - assistido João Silva" · ⚡ Urgente
   - Filtros: Hoje / Esta semana / Pendentes / Todos
   - Busca por nome/processo
3. **Card lateral no dashboard atual** — top 5 atendimentos pendentes

### 3.3 Ações sobre atendimento

| Ação | Resultado |
|---|---|
| **Promover a demanda** | Cria registro em `demandas` (status `2_ATENDER`), upsert assistido + processo. Atendimento vira `promovido` + link |
| **Promover e delegar** | Mesmo + cria registro em `delegacoes_historico` pra colaboradora interna |
| **Resolver na triagem** | Marca `resolvido`. Útil quando documento entregue resolveu (união estável) ou orientação bastou |
| **Devolver à Dil** | Marca `devolvido` com motivo. Aparece pra Dil na aba "Pendências" da planilha |
| **Encaminhar p/ outro defensor** | Muda `defensor_alvo` |
| **Arquivar** | Marca `arquivado` |

### 3.4 Auto-resolução em casos óbvios

- **Documento entregue + demanda livre vazia ou "só declaração"** → nasce `resolvido`
- **Tipo "Orientação"** sem urgência e sem processo → nasce `resolvido` com nota "Apenas orientação"

### 3.5 Mapeamento Apps Script → endpoint

```
POST /api/triagem/atendimento
  Header: Bearer SHEETS_WEBHOOK_SECRET
  Body: { aba, linha, tcc_ref, payload }
  Response: { ok, atendimentoId, triagemUrl }

POST /api/triagem/atendimento/:id/promover
  Body: { delegar_para?, status_demanda? }

PATCH /api/triagem/atendimento/:id
  Body: { acao: 'resolver'|'devolver'|'arquivar'|'reatribuir', ... }

GET /api/triagem/atendimentos?defensor=X&status=Y
GET /api/cowork/escala?mes=X
```

### 3.6 Status sync na coluna 14

| Estado backend | Coluna 14 da planilha |
|---|---|
| `pendente_avaliacao` | `🟡 Aguardando defensor` |
| `promovido` | `✓ Virou demanda #1234` (link clicável) |
| `resolvido` | `✓ Resolvido na triagem` |
| `devolvido` | `🔄 Devolvido — ver motivo` |
| `arquivado` | `⊗ Arquivado` |
| erro de sync | `❌ Erro: [msg]` |

### 3.7 Sync reverso OMBUDS → planilha

- Status do atendimento atualiza col. 14 (webhook)
- Aba Escala (8): cron diário 06h lê Cowork.Coberturas + regra plantão mensal → reescreve aba
- Aba Plenários (9): cron diário 06h + webhook on-change da Cowork.Agenda → reescreve aba

### 3.8 Tratamento de erros

- **Erro 400 (campo inválido):** col. 14 mostra `⚠ erro: [msg]` — Dil corrige na hora
- **Erro 500/timeout:** col. 14 mostra `❌ retry` — botão menu "Reprocessar pendências"
- **Duplicidade (assistido recorrente):** sucesso mas col. 14 marca `(existente)` — alerta sutil
- Apps Script grava log em aba oculta `_logs_sync`

### 3.9 Enriquecimento opcional (assíncrono, server-side)

Quando Nº processo é informado, OMBUDS dispara em background:
- Scraping PJe (já existe) pra puxar metadados
- Atualiza `processos` com dados ricos
- Se houver intimação pendente no PJe, cria demanda paralela

### 3.10 Segurança

- Apps Script usa `PropertiesService` pra guardar SHEETS_WEBHOOK_SECRET
- Endpoint valida Origin (rejeita se não vier do Apps Script ID conhecido)
- Logs no banco com IP + timestamp

---

## 4. Integração Cowork (módulo OMBUDS)

### 4.1 Mapeamento

| Submódulo Cowork | Como conecta com Triagem | Direção |
|---|---|---|
| **Equipe** | Dil entra como membro com papel "Servidora — Triagem Criminal" | Cowork → Triagem |
| **Coberturas** | Substituições alimentam aba "Escala" da planilha (cron 06h) | Cowork → Planilha |
| **Agenda Equipe** | Plenários + audiências críticas alimentam aba "Plenários" | Cowork → Planilha |
| **Delegações** | "Promover e delegar" cria delegação automaticamente pra Amanda/Emilly/Taissa | Triagem → Cowork |
| **Mural** | Atendimentos urgentes geram post automático com `@defensor` | Triagem → Cowork |
| **Pareceres** | Cheat Sheet pode puxar pareceres marcados como "consulta de triagem" | Cowork → Triagem |

### 4.2 Onde a integração vale a pena

**MVP:**
- Coberturas → Escala (essencial, elimina pergunta "X está hoje?")
- Agenda → Plenários (essencial, Dil enxerga calendário de júri)

**Fase 2:**
- Promover atendimento → Delegação direta (alto valor, reduz cliques)
- Urgências → post no Mural com @defensor (registra institucionalmente, complementa WhatsApp grupo)

### 4.3 Onde NÃO integrar

- Não puxar Dil pra dentro do Cowork como usuária ativa (planilha é o hub dela)
- Não postar TODO atendimento no Mural (só urgências)
- Pareceres como consulta opcional, não fluxo obrigatório

### 4.4 Mudanças técnicas

- 1 endpoint novo: `GET /api/cowork/escala?mes=X` (read)
- Extensão: `POST /api/triagem/atendimento/:id/promover` aceita `delegar_para`
- Trigger automático: `triagem_urgente_to_mural` (background job ao criar atendimento com urgência ≠ Não)

---

## 5. Drive compartilhado + fluxos delegáveis + WhatsApp Business

### 5.1 Estrutura do Drive

Pasta nova dentro da Drive da 9ª DP (separada da Protocolar):

```
📁 Triagem Criminal — DP Camaçari/
├── 📁 1. Modelos prontos para entrega/
│   ├── 1.1 Declaração de União Estável.docx
│   ├── 1.2 Destituição de Advogado.docx
│   ├── 1.3 Declaração de Hipossuficiência.docx
│   ├── 1.4 Procuração para representação.docx
│   ├── 1.5 Termo de aceite ANPP (rascunho informativo).docx
│   └── 1.6 Atestado de comparecimento à DP.docx
├── 📁 2. Formulários internos (preencher e arquivar)/
│   ├── 2.1 Ficha de atendimento manual (se planilha cair).docx
│   ├── 2.2 Termo de coleta de antecedentes.docx
│   └── 2.3 Checklist documentos ANPP.docx
├── 📁 3. Modelos de petição (Dil entrega ao defensor pronto)/
│   ├── 3.1 Pedido de retirada de sigilo VVD.docx
│   ├── 3.2 Pedido de cópia integral de IP/processo.docx
│   └── 3.3 Comunicação de mudança de endereço.docx
├── 📁 4. Documentos gerados (saída diária)/
│   └── 📁 2026-04/
│       └── 📁 21/  ← criada automaticamente, recebe minutas IA do dia
├── 📁 5. Referências/
│   ├── 5.1 Cheat Sheet Juliane (PPT original).pptx
│   ├── 5.2 Lista de contatos cartórios + delegacias.xlsx
│   ├── 5.3 Mapa rede assistência (CRAS, abrigo, SUS).pdf
│   └── 5.4 Resumo procedimentos (ANPP, fluxo penal).pdf
└── 📁 6. Histórico (arquivado)/
```

**Permissões:**
- Dil — Editor em pastas 1-4, Visualizador em 5-6
- 4 defensores — Editor em todas
- Amanda/Emilly/Taissa — Editor em 1-4

**Convenções:**
- Modelos têm placeholders explícitos: `{{NOME_ASSISTIDO}}`, `{{CPF}}`, `{{NOME_ESPOSA}}`, `{{UNIDADE_PRISIONAL}}`
- Skill `dpe-ba-triagem-docs` (Fase 2) gera versão preenchida puxando da linha da planilha
- Versionamento: arquivos modelo viram read-only após validação pelo defensor responsável

### 5.2 Catálogo de fluxos delegáveis

| # | Fluxo | Fase | Dil faz | Defensor faz |
|---|---|---|---|---|
| 1 | **União estável** (esposa quer visitar preso) | MVP | Imprime modelo, colhe assinatura, escaneia, envia ao defensor | Apenas confere e arquiva |
| 2 | **Destituição de advogado** | MVP | Imprime modelo, colhe assinatura, junta dados do antigo | Confere, peticiona |
| 3 | **Declaração de hipossuficiência** | MVP | Imprime, assina, entrega — fim | Nada (auto-resolução) |
| 4 | **Atestado de comparecimento à DP** | MVP | Emite e assina | Nada |
| 5 | **Andamento processual simples** | MVP | Consulta PJe, imprime última movimentação, entrega | Nada se for óbvio |
| 6 | **Cópia integral de processo** (não-sigiloso) | MVP | Baixa do PJe, envia por email/WhatsApp | Nada |
| 7 | **Confirmação de audiência designada** (lembrete) | MVP | Liga/manda WhatsApp 1 dia antes confirmando | Nada |
| 8 | **Coleta de antecedentes** (certidão criminal) | MVP | Solicita ao assistido / consulta SAJ | Usa pra elaborar peça |
| 9 | **Comunicação à família** (preso recém-detido) | Fase 2 | Liga/escreve familiar informando situação + data atendimento | Nada |
| 10 | **Pedido de transferência de presídio** | Fase 2 | Coleta justificativa, dados família, redige minuta IA | Revisa e peticiona |
| 11 | **Cesta básica / encaminhamento rede** | Fase 2 | Encaminha pra CRAS/abrigo (lista pronta) | Nada |
| 12 | **Carta de visita íntima** | Fase 2 | Modelo + colhe assinatura | Confere |
| 13 | **Retirada de sigilo VVD** *(cartório acordo)* | Fase 2 | Solicita ao cartório direto, junta resposta na planilha | Apenas se cartório negar |
| 14 | **Triagem ANPP** *(elegibilidade + kit)* | Fase 2 | Coleta antecedentes + checklist + dados pessoais → entrega "kit" pro defensor | Negocia, redige, audiência |
| 15 | **Encaminhamento IML / Defensoria DH** (alegação tortura) | Fase 2 | Coleta narrativa, agenda perícia, encaminha | Acompanha |
| 16 | **Pedido de cópia de IP** | Fase 3 | Solicita à delegacia direto (modelo) | Confere |
| 17 | **Acompanhamento de cumprimento de alvará** | Fase 3 | Consulta SEAP, confirma soltura | Aciona se não cumpriu |
| 18 | **Renovação de medida protetiva VVD** | Fase 3 | Lembrete 30 dias antes, contata ofendida, agenda | Peticiona |

Total: **18 fluxos** — 8 MVP, 7 Fase 2, 3 Fase 3.

### 5.3 Fluxo aprofundado: ANPP (Acordo de Não Persecução Penal)

**Dil faz (kit ANPP):**
1. Identifica elegibilidade preliminar (planilha tem coluna "Tipo = ANPP" → checklist abre):
   - Pena máxima ≤ 4 anos? *(consulta tabela CP)*
   - Crime sem violência ou grave ameaça?
   - Réu primário sem ANPP nos últimos 5 anos? *(consulta SAJ)*
   - Está confessando? *(pergunta direta)*
2. Se passa nos 4 → entrega **folha informativa** (Drive 1.5)
3. Coleta documentos:
   - RG, CPF, comprovante residência, comprovante renda/desemprego
   - Antecedentes criminais
   - Termo de aceite preliminar (assina rascunho)
4. Cria atendimento na planilha aba 1ª/2ª Crime com tipo "ANPP"
5. Sistema gera notificação especial: "📎 Kit ANPP completo — TCC-0124"

**Defensor faz:** revisa elegibilidade jurídica, negocia com MP, redige petição final, acompanha homologação.

**Ganho:** o que normalmente leva 2-3 atendimentos vira 1 atendimento + envio do kit pronto.

### 5.4 Fluxo aprofundado: Retirada de sigilo VVD

**Acordo prévio necessário** (Rodrigo + Juliane fazem):
- Reunião com escrivão da VVD
- Termo formal: servidora autorizada Dilcélia pode peticionar retirada de sigilo, com confirmação por email do defensor
- Email institucional dedicado: `triagem.criminal.camacari@defensoria.ba.def.br`

**Operacional:**
1. Atendimento VVD chega → Dil identifica que assistida quer extrair cópia integral
2. Coluna "Pedido = Retirada de sigilo" na aba VVD
3. Botão "Gerar petição" → skill `dpe-ba-triagem-docs` preenche minuta
4. Petição vai pro cartório VVD via email institucional (Dil envia)
5. Cartório responde com extração — Dil baixa, salva em `4. Documentos gerados/`, link na linha
6. Atendimento marca como `resolvido`

**Defensor entra apenas se:** cartório negar, sigilo for parcial, ofendida quiser orientação adicional.

### 5.5 WhatsApp Business — chip dedicado

**Configuração:**
- Chip novo em nome da DP (Vivo Empresarial sugerido)
- WhatsApp Business no aparelho dedicado da triagem
- Foto perfil oficial DPE-BA, descrição: "Defensoria Pública Camaçari — Triagem Criminal | Atendimento Seg-Sex 8-17h"
- Mensagem automática de boas-vindas com menu

**Operações Dil pelo WhatsApp:**

| Operação | Como |
|---|---|
| Confirmação de audiência (1 dia antes) | Lista da planilha aba 9 → envia template |
| Andamento processo | Recebe nº → consulta PJe → responde texto + print |
| Cópia de processo | Envia PDF baixado |
| Recebimento de documentos | Assistido envia foto RG/comprovante → Dil salva no Drive |
| Agendamento | Marca atendimento, confirma data |
| Lembrete de prazo do defensor | Defensor pede via OMBUDS → Dil envia 2 dias antes |

**Integração com OMBUDS:**
- Coluna "Telefone" da planilha vira clicável (`https://wa.me/55719xxx`)
- Botão no card do atendimento "Enviar lembrete WhatsApp" → abre template
- Histórico não sincronizado (LGPD + peso) — apenas link de "Última mensagem em DD/MM"

**LGPD:**
- Mensagem de primeiro contato informa: "Comunicação oficial da DP-BA. Suas informações são tratadas conforme LGPD"
- Não enviar documento sigiloso sem confirmação de identidade
- Não tratar de mérito de defesa por WhatsApp

**Regras pra Dil:**
- Não opina sobre estratégia
- Não confirma data de prisão/soltura sem checar com defensor
- Em dúvida → encaminha pro defensor
- Mensagens fora do horário ficam pra próximo dia útil (auto-resposta)

**Custo:** chip + plano corporativo Vivo ~R$80-120/mês.

---

## 6. Roadmap de implementação (3 camadas)

### MVP (semanas 1-2) — "Lançar com a Dil"

- Spreadsheet "Triagem Criminal" criada com 12 abas (5 operacionais, 2 auto, 5 referência)
- Apps Script implementado (onEdit + menu manual + reprocessar pendências)
- Tabela `atendimentos_triagem` criada
- Endpoint `POST /api/triagem/atendimento` implementado
- Página `/triagem` em OMBUDS (lista + ações Promover/Resolver/Devolver/Arquivar)
- Badge no header + card lateral no dashboard
- Drive estrutura criada com modelos 1.1, 1.2, 1.3, 1.6
- Cron diário Cowork.Coberturas → Escala
- Cron diário Cowork.Agenda → Plenários
- Treinamento da Dil (1 dia)

### Fase 2 (semanas 3-6) — "Aprofundar"

- Skill `dpe-ba-triagem-docs` (geração minutas)
- Botão "Promover e delegar" (integração Cowork.Delegações)
- Trigger automático urgência → Mural Cowork
- Acordo VVD → cartório (formal, externo ao código)
- Email institucional `triagem.criminal.camacari@defensoria.ba.def.br`
- Modelos Drive 3.1, 3.2, 3.3 (petições)
- Folha informativa ANPP (5.4) + checklist (2.3)
- Chip WhatsApp Business + setup
- Templates WhatsApp (confirmação audiência, andamento, lembrete)
- Sugestão CNJ via Cowork bridge (Claude Code)

### Fase 3 (mês 2+) — "Inteligência e expansão"

- Aba "Stats" com gráficos
- Cruzamento atendimentos x demandas (taxa de promoção, padrões)
- Triagem de prioridade IA no `/triagem`
- ANPP — análise automática de viabilidade via Claude Code
- Detecção de urgência oculta na demanda livre
- Pareceres puxados no Cheat Sheet
- Fluxos 16, 17, 18 implementados
- Renovação medida protetiva VVD com lembretes automáticos

---

## 7. Não-objetivos (escopo explicitamente fora)

- **Não substituir Solar.** Solar continua sendo o sistema oficial; planilha não tenta sincronizar com ele.
- **Não substituir grupo WhatsApp dos defensores.** Mural Cowork é complementar pra registro institucional, não pra conversa rápida.
- **Não dar à Dil acesso ao kanban dos defensores.** Ela vê só `/triagem` (atendimentos próprios) + planilha.
- **Não automatizar decisões jurídicas.** Cowork (Claude Code) ajuda em rascunhos e análise; defensor sempre decide.
- **Não tratar atendimentos de outras áreas (cível, infância, etc.) na mesma planilha.** Spec é exclusivo de criminal.

---

## 8. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Dil sobrecarrega nas primeiras semanas | Camada MVP intencionalmente enxuta; Fase 2 só após 2-3 semanas de uso real |
| Resistência dos defensores ("mais uma ferramenta") | Atendimentos não inflam o kanban; UI é página separada (`/triagem`); badge avisa só quando há novidade |
| LGPD WhatsApp | Mensagem inicial com aviso; auditoria periódica; não tratar mérito |
| Cartório VVD não aceita acordo | Plano B: Dil prepara petição, defensor assina e envia (perde 1 etapa de ganho mas mantém estrutura) |
| Volume alto de atendimentos sem virar demanda | Auto-resolução em casos óbvios + filtro "Resolvidos hoje" pra Dil ter feedback de produtividade |
| Apps Script falha (cota Google) | Aba `_logs_sync` + endpoint reprocessar + alerta visual em col. 14 |

---

## 9. Métricas de sucesso

Após 2 meses de operação:

- ≥ 80% dos atendimentos da Dil são processados em OMBUDS no mesmo dia
- ≥ 50% dos atendimentos com documento entregue resolvem na triagem (sem virar demanda)
- ≤ 10% dos atendimentos voltam como "devolvido por falta de info"
- Dil consegue identificar defensor correto sem perguntar no WhatsApp em ≥ 90% dos casos
- ≥ 3 documentos por dia gerados via skill `dpe-ba-triagem-docs` (Fase 2)
- 0 incidentes LGPD com WhatsApp Business
- Tempo médio entre atendimento Dil e atendimento defensor ≤ 3 dias úteis

---

## 10. Decisões pendentes (validar antes de implementar)

1. Nome final do produto interno ("Triagem Criminal", "TCC", outro?)
2. Se "Orientação geral sem processo" cai em 1ª Crime por convenção, ou tem aba própria
3. Se Stats entra no MVP ou só na Fase 2
4. Operadora do chip WhatsApp Business
5. Confirmar disponibilidade institucional do email `triagem.criminal.camacari@defensoria.ba.def.br` (criar via DPE-BA)
6. Quem treina a Dil (Rodrigo? Juliane? Ambos?)
7. Acordo formal com cartório VVD (Fase 2 pré-requisito)

---

## Apêndice A — Material de referência

- **PPT Juliane:** "Triagem_Criminal_—_Defensoria_Pública_de_Camaçari.pptx" (17 slides, copiar pra Drive 5.1)
- **Reunião:** definidos 4 defensores criminais + Dil como apoio dedicado
- **Esquema de revezamento:** Rodrigo Júri+EP / Juliane VVD; mês seguinte invertido. Plenários divididos um a um. Férias e licenças via Cowork.Coberturas.
- **Cartório VVD:** acordo a formalizar pra Dil ter acesso direto a sigilos.
