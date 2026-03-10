# WhatsApp Defender — Design Document

**Data:** 2026-03-10
**Status:** Aprovado
**Contexto:** Canal de atendimento ao assistido para a 9DP Camaçari - Defensoria Pública

## Visão Geral

Sistema de WhatsApp integrado ao OMBUDS focado em 3 pilares:
1. **Resposta Eficiente** — Templates inteligentes, respostas rápidas, envio de documentos do Drive
2. **Integração com o Caso** — Seleção de mensagens → salvar no assistido, resumo IA, extração de dados, salvar mídias no Drive
3. **Organização & Visibilidade** — Painel de pendentes, etiquetas, preview de mensagens

**Operador:** Defensor solo (sem fila multi-atendente)
**Backend:** Evolution API v2.3.7 no Railway
**Instância:** `ombuds` (5571 3508-6246 — 9DP Camaçari)

---

## Pilar 1: Resposta Eficiente

### 1.1 Sistema de Templates

**Nova tabela `whatsapp_templates`:**
- `id`, `name` (slug: `consulteprocesso`, `diligenciasfamiliares`, etc.)
- `title` (nome legível)
- `body` (corpo com variáveis entre chaves: `{nome_assistido}`, `{numero_processo}`, `{data_audiencia}`, `{nome_defensor}`)
- `category`: `orientacao`, `solicitacao`, `notificacao`, `encerramento`
- `order` (para ordenação manual)
- `createdAt`, `updatedAt`

**Variáveis dinâmicas** preenchidas automaticamente quando contato vinculado a assistido:
- `{nome_assistido}` — nome do assistido
- `{numero_processo}` — número do processo principal
- `{data_audiencia}` — próxima audiência agendada
- `{nome_defensor}` — nome do defensor logado
- `{vara}` — vara do processo

**Templates iniciais (seed):** Os 6 templates fornecidos pelo usuário:
1. `consulteprocesso` — Orientação para consulta no PJe
2. `diligenciasfamiliares` — Solicitação de provas e testemunhas
3. `422cpp` — Preparação de júri popular (rol de testemunhas)
4. `condenacaoparafamilia` — Orientações pós-condenação
5. `informeatendimento` — Regras de atendimento via WhatsApp
6. `obrigado` — Encerramento/agradecimento

**UI no chat:**
- Botão "Templates" ao lado do campo de mensagem
- Painel lateral com busca por nome/categoria
- Preview com variáveis já substituídas pelo contexto do assistido
- "Inserir" (cola no campo para editar) ou "Enviar direto"

**CRUD de templates:** Página `/admin/whatsapp/templates` para criar, editar, reordenar e excluir.

### 1.2 Respostas Rápidas (atalho `/`)

Digitar `/` no campo de mensagem abre autocomplete:
- `/consulta` → Consulteprocesso
- `/dilig` → Diligenciasfamiliares
- `/juri` → 422CPP
- Filtra conforme digita
- Enter seleciona e insere no campo

### 1.3 Envio de Documentos do Drive

Botão de anexo no chat com opções:
- **Do Drive** → modal com navegação do Google Drive (reutiliza `DriveContentArea` existente), seleciona arquivo, envia via Evolution API
- **Do computador** → upload local (habilitar os botões hoje desabilitados de imagem/documento)

---

## Pilar 2: Integração com o Caso

### 2.1 Identificação do Interlocutor

O contato WhatsApp **não é necessariamente o assistido**. Novo campo no `whatsapp_contacts`:

- `contactRelation`: enum (`proprio`, `familiar`, `testemunha`, `correu`, `outro`)
- `contactRelationDetail`: texto livre ("Mãe do assistido", "Vizinha que presenciou")

Exibido no header do chat e em todas as anotações salvas — sempre claro quem disse o quê e em que qualidade.

### 2.2 Modo Seleção de Mensagens

Botão "Selecionar" no header do chat:
- Checkboxes aparecem em cada mensagem
- Seleciona 1 ou mais mensagens
- Barra de ações flutuante no topo com 4 ações:

#### Ação 1: Salvar no Caso
- Se contato vinculado → salva direto como anotação no assistido
- Se não vinculado → pede para vincular primeiro
- Nova tabela `assistido_anotacoes`:
  - `id`, `assistidoId`, `tipo` (`whatsapp_recorte`, `whatsapp_resumo_ia`, `manual`)
  - `conteudo` (texto das mensagens com timestamps e direção)
  - `interlocutor` (nome + relação do contato)
  - `origemContactId` (FK para whatsapp_contacts)
  - `createdById`, `createdAt`

#### Ação 2: Gerar Resumo IA
- Envia mensagens selecionadas para o enrichment engine
- IA gera resumo estruturado: fatos relatados, pedidos, providências necessárias
- Inclui identificação do interlocutor no contexto
- Preview editável antes de salvar
- Salva como anotação tipo `whatsapp_resumo_ia`

#### Ação 3: Extrair Dados
- IA analisa mensagens e identifica: endereço, telefone, relato dos fatos, nomes de testemunhas, datas, locais
- Formulário pré-preenchido com dados extraídos
- Usuário revisa e confirma → atualiza campos do cadastro do assistido

#### Ação 4: Salvar no Drive
- Ativo quando seleção contém mensagens com mídia (PDF, fotos, áudios, vídeos)
- Modal mostra pasta do assistido no Google Drive
- Usuário escolhe subpasta (ou cria nova)
- Confirma → arquivos baixados da Evolution API e enviados ao Drive
- **Não é automático** — sempre passa pela curadoria do defensor
- Registro vinculado ao assistido com referência ao arquivo no Drive

---

## Pilar 3: Organização & Visibilidade

### 3.1 Painel de Pendentes ("Aguardando Resposta")

Seção destacada no topo da lista de conversas:
- Contatos cuja última mensagem é inbound (eles mandaram, defensor não respondeu)
- Ordenado por tempo de espera (mais antigo primeiro)
- Badge com tempo: "há 2h", "há 1 dia", "há 3 dias"
- Ao responder, sai automaticamente

### 3.2 Etiquetas (Tags)

Campo `tags` já existe no schema. Ativar:
- Tags pré-definidas: `urgente`, `aguardando_documento`, `informativo`, `juri`, `execucao`, `diligencia`
- Tags customizáveis
- Dropdown rápido no header do chat ou na lista de conversas
- Filtro por tag na lista

### 3.3 Promoção na Sidebar

WhatsApp sai do menu "Mais" → vai para navegação principal:
- Badge de não lidas visível na sidebar
- Clique leva direto ao chat

### 3.4 Preview de Última Mensagem

Na lista de conversas, mostrar trecho da última mensagem:
- Texto truncado: "Boa tarde, preciso saber sobre..."
- Ícone para mídia: "📎 Documento", "📷 Foto", "🎤 Áudio"

---

## Mudanças no Schema

### Novas tabelas
- `whatsapp_templates` (templates de mensagem)
- `assistido_anotacoes` (anotações vinculadas ao assistido, origem WhatsApp ou manual)

### Alterações em tabelas existentes
- `whatsapp_contacts`: adicionar `contactRelation` (enum) + `contactRelationDetail` (text)
- `whatsapp_contacts`: adicionar `lastMessageContent` (text, truncado) + `lastMessageType` (varchar)

---

## Ordem de Implementação

### Fase 1 — Fundação (Templates + UX Básica)
1. Tabela `whatsapp_templates` + seed dos 6 templates
2. CRUD de templates (`/admin/whatsapp/templates`)
3. Painel de templates no chat + atalho `/`
4. Habilitar envio de imagem/documento do computador
5. Preview de última mensagem na lista de conversas
6. WhatsApp na sidebar principal com badge

### Fase 2 — Integração com o Caso
7. Campo relação do interlocutor no contato
8. Modo seleção de mensagens + ação "Salvar no caso" (tabela `assistido_anotacoes`)
9. Ação "Salvar no Drive" (mídias selecionadas → pasta do assistido)
10. Envio de documentos do Drive no chat

### Fase 3 — IA + Organização
11. Ação "Gerar resumo IA" (enrichment engine)
12. Ação "Extrair dados" (IA → preencher cadastro)
13. Painel "Aguardando resposta"
14. Sistema de etiquetas (tags) com filtro
