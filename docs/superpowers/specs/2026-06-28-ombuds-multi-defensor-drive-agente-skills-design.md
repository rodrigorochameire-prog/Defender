# OMBUDS Multi-Defensor — Drive, Agente Local e Marketplace de Skills

> **Design doc (spec)** · 2026-06-28 · autor: Rodrigo Rocha Meire + Claude Code
> Status: **aprovado em brainstorming**, pendente de revisão de spec e plano de implementação.

## 1. Objetivo

Hoje o OMBUDS funciona em pleno potencial para **um único defensor** (Rodrigo, 9ª DP Camaçari): integração com o Google Drive, daemon de IA rodando na assinatura Claude Max, skills de análise e scraping do PJe. O objetivo deste trabalho é **abrir esse mesmo potencial para outros defensores da DPE-BA** (escala alvo: dezenas, regional/estadual), de modo que cada um possa:

1. **Vincular o próprio Google Drive** e ter o OMBUDS operando sobre as pastas dos seus assistidos como opera com o Rodrigo hoje.
2. **Rodar IA sem custo de API**, cada um com a **própria assinatura Claude Max**, através de um **agente local** que se une às skills do Claude Code que o defensor já tem.
3. **Enxergar os assistidos certos** — primeiro os da sua atuação, depois (sob demanda) os de toda a instituição, para gerar inteligência cruzada.
4. **Trocar skills** com outros defensores através de um marketplace curado.

## 2. Princípios e decisões de arquitetura

| # | Decisão | Justificativa |
|---|---------|---------------|
| D1 | **App na nuvem compartilhado + agente local enxuto** | OMBUDS já está publicado (`ombuds.vercel.app`) como app multiusuário com roles. Cada defensor loga com a própria conta; localmente só instala daemon + skills + Claude Code. Um banco só, fácil de atualizar. |
| D2 | **Cada defensor roda o próprio daemon, na própria Max** | Mantém o *cost firewall* (zero API paga) e funde o daemon às skills do Claude Code do defensor. OMBUDS roteia tarefas por defensor. |
| D3 | **Agente é um cliente HTTP autenticado (Approach A)** — nunca toca o Supabase direto | Em dezenas de máquinas, **não** se pode distribuir a `service_role` key. Cada agente usa um **token por defensor**; a nuvem aplica todo o escopo. Revogável, auditável, desacoplado do schema. |
| D4 | **Instalador de 1 comando** (`curl … | bash`) | Onboarding autoexplicativo para colegas não necessariamente técnicos; skills caem em `~/.claude/skills/` namespaced, convivendo com as do defensor. |
| D5 | **Drive compartilhável via grupos** | 7ª e 9ª DP Camaçari continuam usando o Drive do Rodrigo. Dois defensores podem apontar para o mesmo Drive. |
| D6 | **Visibilidade de assistidos derivada da atuação judicial real**, materializada | Sem grupos manuais: o vínculo nasce automaticamente do compartilhamento de varas/comarcas, com override para exceções. |
| D7 | **Marketplace de skills em camadas** (curado + comunidade), visibilidade Privada/Unidade/Institucional | Skills executam código; precisa de modelo de confiança explícito sem virar gargalo. |

## 3. Estado atual (o que já existe vs. o que está cravado no Rodrigo)

**Já é multi-defensor-ready:**
- Tokens OAuth por usuário: `user_google_tokens`, `users.driveFolderId`, `users.googleLinked`.
- `createUserDriveStructure(userId)` cria pasta raiz por usuário (`OMBUDS — {nome} — {comarca}`).
- Escopo de demandas por defensor: `src/lib/trpc/defensor-scope.ts`.

**Cravado no Rodrigo (precisa de-hardcode):**
- `ATRIBUICAO_FOLDER_IDS` em `src/lib/utils/text-extraction.ts` → pastas da "9ª DP".
- `src/app/api/analyze/route.ts` → `ATRIBUICAO_CONFIG[...].drivePath` literais + `process.env.HOME ?? "/Users/rodrigorochameire"`.
- `src/components/demandas-premium/pje-import-modal.tsx:83` → `DRIVE_BASE_PATH` (mount macOS do Rodrigo).
- `scripts/claude-code-daemon.mjs` → roda numa máquina só (M4), com `SUPABASE_SERVICE_ROLE_KEY`.
- `scripts/m4-bootstrap.mjs` → marker `~/.ombuds-daemon-host`, launchd dedicado a uma máquina.

## 4. Modelo de dados (mudanças)

### 4.1 `users` (alterações)
- `comarca` / `unidade` (text) — unidade da DP, dirige nomenclatura de pastas e defaults.
- `driveGroupId` (FK → `drive_groups`) — grupo de Drive ao qual pertence (default: o próprio).

### 4.2 `drive_groups` (nova)
Possui o mapa de pastas por atribuição (substitui o `ATRIBUICAO_FOLDER_IDS` global).
```
id            serial pk
ownerUserId   integer fk users(id)
label         text                 -- ex.: "9ª DP Camaçari"
atribuicaoFolders jsonb            -- { JURI: "<folderId>", VVD: "...", EP: "...", ... }
createdAt     timestamp
```
- Grupo do Rodrigo aponta para as pastas existentes de `1 - Defensoria 9ª DP/`.
- 7ª DP: `users.driveGroupId` = grupo do Rodrigo (sem duplicar pastas).
- Defensor novo: ganha grupo próprio, provisionado com a própria árvore.

### 4.3 `judicial_units` (nova)
Lista canônica de varas/comarcas. `{ id, comarca, vara, label }`.

### 4.4 `defensor_unidades` (nova)
Em quais unidades judiciais cada defensor atua. **Auto-populada** a partir dos processos (cada processo tem vara/comarca → o defensor atua ali) + add/remove manual.
```
userId          integer fk users(id)
judicialUnitId  integer fk judicial_units(id)
origem          text         -- 'auto' | 'manual'
createdAt       timestamp
pk (userId, judicialUnitId)
```

### 4.5 `unidade_membership` (materializada)
Cache do conjunto de defensores que compartilham ≥1 unidade comigo (Nível 1). Materialized view ou tabela atualizada no import de processos + agendada. Permite filtrar assistidos contra um conjunto pré-computado em vez de join N-a-N ao vivo.

### 4.6 `agent_tokens` (nova)
```
id          serial pk
userId      integer fk users(id)
tokenHash   text          -- guardamos só o hash; segredo exibido 1x
label       text
lastUsedAt  timestamp
revokedAt   timestamp     -- revogar = matar a máquina na hora
createdAt   timestamp
```

### 4.7 `agent_heartbeats` (nova)
```
userId       integer fk users(id)
hostname     text
agentVersion text
lastSeenAt   timestamp
status       text     -- online | idle | offline
claudeMaxOk  boolean  -- claude -p autenticou?
pk (userId, hostname)
```

### 4.8 `claude_code_tasks` (alteração)
- `assignedDefensorId` (integer, nullable) — qual daemon roda a tarefa. Default = defensor do `createdBy`. Daemon reivindica `WHERE assignedDefensorId = <eu> AND status='pending'`.

### 4.9 `drive_files` / `drive_sync_folders` (alteração)
- `userId` — escopo por defensor (hoje não têm).

### 4.10 `skills_registry` (nova — Fase 5)
```
id            serial pk
slug          text unique
nome          text
descricao     text
autorUserId   integer fk users(id)
atribuicaoTags jsonb
versao        text
changelog     text
visibilidade  text      -- 'privada' | 'unidade' | 'institucional'
tier          text      -- 'oficial' | 'curada' | 'comunidade'
aprovadoPor   integer fk users(id)  -- null até curadoria aprovar (tier curada)
bundleUrl     text      -- zip no storage
instalacoes   integer default 0
avaliacao     numeric
createdAt     timestamp
updatedAt     timestamp
```

## 5. Fases de entrega

Cada fase é entregável de forma independente e agrega valor isolada.

### Fase 1 — Drive multi-tenant (de-hardcode)
**Entrega:** todo defensor vincula o próprio Drive e tem as pastas funcionando (operações na nuvem, via token por usuário). Ainda sem daemon.

- **Resolver de pastas:** introduzir `resolveAtribuicaoFolder(user, atribuicao)` que lê `user.driveGroup.atribuicaoFolders[atribuicao]` (criando sob demanda). Reescrever todos os leitores:
  - `text-extraction.ts` — remover `ATRIBUICAO_FOLDER_IDS`; callers passam `user`.
  - `api/analyze/route.ts` — remover literais `drivePath` e o fallback de `HOME`; a rota da nuvem deixa de assumir diretório local (caminhos locais são responsabilidade do agente, Fase 4).
  - `pje-import-modal.tsx:83` — remover `DRIVE_BASE_PATH` do código da nuvem (vira config do agente).
- **Grupos de Drive:** `drive_groups` + `users.driveGroupId`. Grupo do Rodrigo = pastas atuais. 7ª DP aponta para o do Rodrigo.
- **Provisionamento:** estender `createUserDriveStructure(userId)` para criar as subpastas por atribuição na raiz `OMBUDS — {nome} — {comarca}` e gravar os IDs em `drive_groups.atribuicaoFolders`. Idempotente.
- **Onboarding (UI):** card "Conectar Google Drive" → OAuth (`/api/google/callback?userId=…`) → provisiona → mostra a árvore criada.
- **Convenção + verificador de Drive:** documento da convenção de pastas (baseada na organização que já funciona) + `ombuds-agent check-drive` (implementado na Fase 4) que confere e sugere correções.

### Fase 2 — Visibilidade / escopo de assistidos (2 níveis)
**Entrega:** cada defensor vê primeiro os assistidos da sua atuação; consulta institucional cruzada sob demanda.

- `judicial_units`, `defensor_unidades` (auto-derivada de processos + manual), `unidade_membership` (materializada).
- **Nível 1 — Minha atuação (default):** assistidos/casos nas unidades onde atuo, **incluindo colegas que compartilham minhas unidades** (7ª+9ª veem o mesmo conjunto).
- **Nível 2 — Institucional (sob demanda):** qualquer assistido/caso da DPE em outras unidades — pesquisável e **referenciado cruzado** (ao abrir um assistido, OMBUDS mostra "também atendido em: 2ª DP Eunápolis", revelando antecedentes e outros processos). Badge "outra unidade".
- **Demandas** seguem **privadas por defensor** (sem mudança em `defensor-scope.ts`); isto muda só a *descoberta* de assistidos/casos.
- **Transparência + override:** UI mostra "Sua atuação: [varas] · Compartilha Nível 1 com: [colegas]"; defensor/admin pode add/remover unidade ou fixar/excluir colega (exceções).
- **Drive vs. visibilidade:** por regra coincidem (mesmo overlap de unidades), mas `driveGroupId` é editável à parte para exceções.

### Fase 3 — Agent API + daemon (Approach A)
**Entrega:** fundação de segurança para dezenas de daemons.

- **Emissão de token:** UI "Meu Agente" → "Gerar token" → grava `tokenHash`; segredo (`ombuds_agent_sk_…`) exibido **uma vez**. Revogar = `revokedAt`.
- **Quatro endpoints autenticados** (`Authorization: Bearer <token>` → resolve um `userId`, tudo escopado):
  - `POST /api/agent/claim` — reivindica atomicamente a próxima tarefa `pending` com `assignedDefensorId = eu` (o optimistic-lock `UPDATE … WHERE status='pending'` vai para o servidor). Retorna task + skill + prompt.
  - `POST /api/agent/tasks/:id/progress` — atualiza `etapa` (UI ao vivo).
  - `POST /api/agent/tasks/:id/result` — envia `resultado`/`erro`, marca `completed`/`failed`. Rejeita se a tarefa não for do defensor do token.
  - `POST /api/agent/heartbeat` — `{ hostname, agentVersion, claudeMaxOk }` → upsert em `agent_heartbeats`.
- **Refactor do daemon:** `claude-code-daemon.mjs` abandona o cliente `service_role` e vira cliente HTTP dos quatro endpoints. **Nenhuma credencial de banco sai da nuvem.** Mantém cost-firewall, semáforo de concorrência e zombie-reaper — operando sobre tarefas vindas do `/claim`. (Realtime push pode voltar depois como otimização; polling do `/claim` a cada N s é a baseline robusta.)

### Fase 4 — Instalador + skills + heartbeat + admin
**Entrega:** colega instala em 1 comando e você acompanha a frota.

- **Instalador 1 comando** (`curl -fsSL https://ombuds.vercel.app/install.sh | bash`):
  1. Detecta SO (começa por **macOS**; Windows/Linux como evolução futura).
  2. Verifica/instala Node + Claude Code CLI.
  3. Pede o token + detecta o mount do Google Drive na máquina.
  4. Instala skills em `~/.claude/skills/ombuds-*` (namespaced, sem colidir com as do defensor).
  5. Grava `~/.ombuds-agent/config.json` (token, URL da API, caminho do Drive).
  6. Cria launchd `com.ombuds.agent` (sobe no login, auto-restart).
  7. `claude login` (Max do defensor) + valida com `claude -p` de teste.
- **Atualização:** `ombuds-agent update` re-puxa daemon + skills de uma URL de release, versionado; heartbeat reporta `agentVersion` → nuvem avisa desatualizados.
- **Onboarding (UI "Meu Agente"):** checklist — (1) Conectar Drive ✓, (2) Confirmar atuação (auto, editável), (3) Gerar token + copiar comando, (4) Status do agente (online/offline, última batida, versão, `claudeMaxOk`).
- **Admin (sua visão):** tabela de todos os defensores — Drive linkado? grupo/atuação, agente online? versão, tarefas na fila.
- `ombuds-agent check-drive` — verificador da convenção de pastas da Fase 1.

### Fase 5 — Marketplace de skills
**Entrega:** troca de skills entre defensores, em camadas.

- **Dois tipos:** **oficiais OMBUDS** (core — análise via Drive, import PJe via CDP/Playwright/Chromium, varredura de triagem; versionadas, auto-atualizadas, imutáveis pelo defensor) e **comunidade** (feitas por defensores, opt-in).
- **Registro** (`skills_registry`) + bundle no storage, tudo pela API autenticada.
- **Curadoria em camadas:** catálogo **Oficial/Curado** (aprovado por você, com selo) + área **Comunidade** ("instale por sua conta", com autoria/changelog/versão visíveis).
- **Visibilidade por skill:** Privada / Unidade / Institucional (casa com os grupos da Fase 2).
- **Fluxos:** `ombuds-agent publish <pasta>` / botão "Publicar"; página "Catálogo de Skills" → filtrar → "Instalar" → `ombuds-agent sync` baixa para `~/.claude/skills/`; versionado, removível.
- **Segurança:** skills executam código → tier + autoria + aprovação na camada curada; aviso explícito na comunidade.

## 6. Segurança (transversal)

- **Sem `service_role` em máquina cliente** — único choke point é a API autenticada (D3).
- **Token por defensor, hasheado, revogável, com `lastUsedAt`** para auditoria.
- **Escopo no servidor** — todo endpoint resolve o `userId` do token e filtra; daemon nunca vê tarefa/dado de outro defensor.
- **Marketplace** — código de terceiros executa na máquina de quem instala; mitigado por curadoria em camadas, autoria e visibilidade.

## 7. Rollout

1. Implementar Fases 1→5 em ordem (cada uma shippable).
2. **Validar com uma 2ª conta/máquina** (um único colega, p.ex. 7ª DP) antes do rollout regional.
3. Expandir para dezenas com onboarding autoexplicativo + dashboard admin.

## 8. Fora de escopo (YAGNI por enquanto)

- Suporte a Windows/Linux no instalador (só macOS na primeira entrega).
- Daemon central de fallback (todos rodam local).
- API paga/metered (mantém-se o modelo Max por defensor).
- Realtime push no agente (polling autenticado é a baseline).

## 9. Itens em aberto / a lapidar

- Critério fino de "atuação" para auto-derivar `defensor_unidades` (todos os processos? só ativos? por atribuição?).
- Frequência de refresh da `unidade_membership`.
- Política de avaliação/rating e moderação no marketplace.
- Estratégia de versionamento e rollback de skills oficiais.
