# Resolver TODOs Criticos — UI/Formularios

> Design aprovado em 26/02/2026

## Contexto

28 TODOs no codebase, priorizando 7 de UI/formularios onde botoes nao funcionam.
Abordagem: quick wins primeiro (backend ja existe), depois criar backend novo.

---

## Fase 1 — Quick Wins (Wiring UI a Backend Existente)

### Task 1: Agenda — Editar/Deletar Calendar Events

**Arquivo**: `src/app/(dashboard)/admin/agenda/page.tsx`
**Linhas**: 787, 803

**O que fazer**:
- Linha 787: Chamar `calendarRouter.update` com os dados do evento
- Linha 803: Chamar `calendarRouter.delete` com o ID do evento
- O ID composto tem formato `calendar-{numericId}`, extrair numericId

**Mutations disponiveis**:
- `trpc.calendar.update.useMutation()` — aceita: id, title, description, eventDate, endDate, etc.
- `trpc.calendar.delete.useMutation()` — aceita: { id: number }

**Verificacao**: Criar evento no calendario, editar titulo, deletar, confirmar toast de sucesso.

---

### Task 2: Audiencias + Varas-Criminais — Criar Demanda

**Arquivos**:
- `src/app/(dashboard)/admin/audiencias/page.tsx` (linha 205)
- `src/app/(dashboard)/admin/dashboard/varas-criminais/page.tsx` (linha 183)

**O que fazer**:
- `handleCreateTask`: Chamar `demandasRouter.create` com processoId, assistidoId, ato
- `handleSaveNewDemanda`: Conectar form data ao `demandasRouter.create`
- Ambos precisam de processoId e assistidoId (obrigatorios)

**Mutation disponivel**:
- `trpc.demandas.create.useMutation()` — requer: { processoId, assistidoId, ato }

**Detalhes**:
- Na audiencia: extrair processoId e assistidoId da audiencia selecionada
- No varas-criminais: extrair do formData (verificar se campos existem no form)
- Invalidar queries `demandas.list` e `demandas.count` apos sucesso

**Verificacao**: Clicar "Criar Tarefa" em uma audiencia, confirmar que demanda aparece em /admin/demandas.

---

### Task 3: Avaliacao Juri — Salvar via tRPC

**Arquivo**: `src/app/(dashboard)/admin/juri/avaliacao/[sessaoId]/page.tsx`
**Linha**: 296

**O que fazer**:
- `handleSave`: Substituir setTimeout por chamadas reais:
  1. `avaliacaoJuri.update` com dados gerais (ambiente, interrogatorio, MP, defesa)
  2. Para cada jurado: `avaliacaoJuri.updateJurado` com posicao + dados
  3. Para cada testemunha: `avaliacaoJuri.upsertTestemunha` com dados
- Mostrar progresso (saving state) e toast de sucesso/erro
- Invalidar query da avaliacao apos salvar

**Mutations disponiveis**:
- `trpc.avaliacaoJuri.update.useMutation()`
- `trpc.avaliacaoJuri.updateJurado.useMutation()`
- `trpc.avaliacaoJuri.upsertTestemunha.useMutation()`

**Verificacao**: Preencher avaliacao de juri, salvar, recarregar pagina, confirmar dados persistidos.

---

## Fase 2 — Backend Novo

### Task 4: Settings — Criar Sistema de Configuracoes

**Criar**:
- Tabela `userSettings` no schema (userId, key, value jsonb)
- Router `settingsRouter` com get/save mutations
- Conectar handleSave na pagina settings

### Task 5: User Invitations — Sistema de Convites

**Criar**:
- Tabela `userInvitations` (email, token, invitedBy, expiresAt, status)
- Mutation `users.invite` que gera token + link
- Pagina /register com flow de aceitar convite

### Task 6: Teses — Router CRUD

**Criar**:
- Router `tesasRouter` com CRUD
- Conectar botao "Adicionar Tese" na pagina logica

### Task 7: Processos — DefensorNome

**Alterar**:
- Query em processos/page.tsx: incluir join com defensor para pegar nome real
- Substituir hardcoded "Dr. Rodrigo Rocha" pelo nome do defensor responsavel

---

## Ordem de Execucao

1. Task 1 (Agenda) — ~20min
2. Task 2 (Demandas) — ~30min
3. Task 3 (Juri) — ~30min
4. Task 4 (Settings) — ~45min
5. Task 5 (Invitations) — ~1h
6. Task 6 (Teses) — ~30min
7. Task 7 (DefensorNome) — ~15min
