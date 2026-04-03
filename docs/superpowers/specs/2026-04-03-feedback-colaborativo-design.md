# Feedback Colaborativo — Sistema de Feedback dos Defensores

**Data:** 2026-04-03
**Status:** Aprovado
**Autor:** Rodrigo + Claude

## Motivação

Defensores colegas usam o OMBUDS diariamente e encontram bugs, têm sugestões e dúvidas. Hoje não existe canal estruturado para esse retorno. Feedback é perdido em conversas informais. O sistema precisa capturar isso de forma simples e transformar em ações concretas de desenvolvimento.

## Visão geral

Botão flutuante em todas as páginas do dashboard. O colega escolhe tipo (Bug/Sugestão/Dúvida), escreve em linguagem natural, e envia. O sistema captura contexto técnico automaticamente. Feedbacks são salvos no banco, triados pelo admin numa página dedicada, e exportados para o Jira com um clique.

## Componentes

### 1. FeedbackFAB (botão flutuante)

- Componente client-side renderizado no layout do dashboard
- Ícone `MessageSquarePlus` (Lucide), canto inferior direito
- Posição: `fixed bottom-20 right-4 z-40` (acima do floating-agenda, abaixo do mobile-bottom-nav)
- Ao clicar: abre popover/sheet compacto (não modal, não bloqueia a tela)
- Padrão Defender: zinc neutro, hover emerald

### 2. Formulário de feedback

- **Tipo** (obrigatório): 3 chips selecionáveis — Bug / Sugestão / Dúvida
- **Mensagem** (obrigatório): textarea livre, placeholder "Descreva o que aconteceu ou o que poderia melhorar..."
- **Botão enviar**: desabilitado até tipo + mensagem preenchidos
- **Contexto automático** (capturado silenciosamente):
  - `window.location.pathname` — URL da página
  - `window.innerWidth x window.innerHeight` — viewport
  - `navigator.userAgent` — navegador/OS
  - `Date.now()` — timestamp
  - `userId` — da sessão autenticada
  - Últimos 5 erros do console (via listener `window.onerror` / `window.addEventListener('unhandledrejection')`)

### 3. Tabela `feedbacks` (PostgreSQL)

```sql
CREATE TABLE feedbacks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  tipo VARCHAR(20) NOT NULL, -- 'bug' | 'sugestao' | 'duvida'
  mensagem TEXT NOT NULL,
  pagina TEXT, -- URL pathname
  contexto JSONB, -- { viewport, userAgent, consoleErrors }
  status VARCHAR(20) NOT NULL DEFAULT 'novo', -- 'novo' | 'visto' | 'enviado_jira' | 'descartado'
  jira_ticket_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

Schema Drizzle correspondente no arquivo `src/lib/db/schema/core.ts` (ou arquivo dedicado se core.ts estiver grande demais).

Enum de tipo: `feedbackTipoEnum` = `bug`, `sugestao`, `duvida`
Enum de status: `feedbackStatusEnum` = `novo`, `visto`, `enviado_jira`, `descartado`

### 4. Router tRPC `feedbacks`

Arquivo: `src/lib/trpc/routers/feedbacks.ts`

| Procedure | Auth | Descrição |
|-----------|------|-----------|
| `feedbacks.create` | qualquer usuário autenticado | Cria feedback com tipo, mensagem, contexto |
| `feedbacks.list` | admin only | Lista com filtros (tipo, status), ordenado por createdAt desc |
| `feedbacks.updateStatus` | admin only | Atualiza status (visto, descartado) |
| `feedbacks.exportToJira` | admin only | Cria ticket no Jira, salva jiraTicketId, muda status |

### 5. Página admin `/admin/feedbacks`

- Acessível apenas por role `admin`
- Lista de cards com:
  - Badge colorido por tipo (vermelho=bug, emerald=sugestão, azul=dúvida)
  - Mensagem (truncada, expandível)
  - Página onde foi enviado (link clicável)
  - Nome do colega + data
  - Status atual
- Filtros: por tipo, por status
- Ações por feedback:
  - **Enviar pro Jira**: abre dropdown de prioridade (Baixa/Média/Alta), confirma, cria ticket
  - **Marcar como visto**: muda status
  - **Descartar**: remove do backlog ativo

### 6. Exportação para Jira

Mapeamento de tipo:
- `bug` → ticket tipo `Bug`, label `feedback-usuario`
- `sugestao` → ticket tipo `Story`, label `feedback-usuario`
- `duvida` → ticket tipo `Task`, label `feedback-usuario`

Corpo do ticket:
```
## Feedback de usuário
{mensagem}

## Contexto técnico
- Página: {pagina}
- Viewport: {viewport}
- Navegador: {userAgent}
- Data: {createdAt formatado}
- Erros console: {lista ou "nenhum"}

---
Enviado via OMBUDS Feedback
```

Prioridade: definida pelo admin na hora de enviar (Lowest/Low/Medium/High/Highest).

Após envio: status muda para `enviado_jira`, `jira_ticket_id` é salvo.

## Fluxo UX do colega

1. Vê algo estranho ou tem ideia → clica no botão flutuante
2. Popover abre por cima da página (página continua visível)
3. Escolhe tipo (3 chips), escreve 1-2 frases
4. Clica enviar → toast "Feedback enviado, obrigado!" (sonner) → popover fecha
5. Menos de 15 segundos. Sem cadastro, sem login extra.

## Fluxo do admin

1. Acessa `/admin/feedbacks`
2. Vê lista de feedbacks novos
3. Lê, decide: enviar pro Jira (com prioridade) ou descartar
4. Ticket criado aparece no board do Jira, pronto para ser trabalhado

## Decisões técnicas

- **Sem screenshot automático** no MVP — contexto técnico (URL, viewport, erros) é suficiente. Screenshot pode ser adicionado futuramente.
- **Sem visibilidade para o colega** do status — unidirecional no MVP. Evolui para "Meus feedbacks" quando grupo crescer.
- **Sem notificação push** — admin vê ao acessar a página. Pode adicionar badge no sidebar futuramente.
- **Console errors**: listener leve que guarda últimos 5 erros em memória (não persiste, não impacta performance).

## Fora de escopo

- Feedback anônimo
- Votação/upvote em feedbacks
- Respostas para o colega
- Screenshot automático
- Classificação por IA
- Criação automática de ticket (sempre passa por triagem)
