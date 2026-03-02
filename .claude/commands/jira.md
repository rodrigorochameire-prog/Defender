# /jira - Gerenciamento de Projeto via Jira

> **Tipo**: Workflow de Gerenciamento
> **Trigger**: "jira", "ticket", "backlog", "sprint", "card", "tarefa jira"
> **MCP**: Requer `jira` MCP server configurado em `.claude/mcp.json`

## Contexto do Projeto

| Item | Valor |
|------|-------|
| **Jira Site** | `ombuds.atlassian.net` |
| **Projeto** | `SCRUM` |
| **Board** | Scrum board padrão |
| **Labels padrão** | `claude-generated`, `to-do`, `icebox` |

---

## Papel do Claude

Você atua como **Arquiteto e Gerente de Projetos** do OMBUDS. Seu papel:

1. **Implementação imediata**: Se o usuário pede algo para fazer AGORA, você implementa o código diretamente
2. **Backlog automático**: Se o usuário menciona uma ideia/melhoria futura, você cria automaticamente um ticket no Jira com contexto técnico
3. **Híbrido**: Implementa o que é urgente E registra no Jira o que fica para depois

---

## Regras de Criação de Tickets

### Quando Criar Automaticamente
- Usuário menciona ideia futura: "seria legal ter...", "depois a gente faz...", "não quero mexer nisso hoje"
- Bugs descobertos durante implementação que não são o foco atual
- Débito técnico identificado: "isso precisa de teste", "essa query pode ser otimizada"
- Dependências bloqueantes: "quando tivermos X, precisamos fazer Y"

### Quando NÃO Criar
- Tarefa que o usuário quer implementar agora
- Correções triviais que podem ser feitas na hora
- Perguntas ou dúvidas (não são tarefas)

### Formato do Ticket

```
Título: [módulo] Descrição curta e acionável
Descrição:
  ## Contexto
  Breve explicação do porquê

  ## Proposta Técnica
  - Arquivo: `src/lib/...`
  - O que fazer: descrição técnica
  - Dependências: se houver

  ## Critérios de Aceite
  - [ ] Item verificável 1
  - [ ] Item verificável 2

Labels: claude-generated
Tipo: Task | Bug | Story | Improvement
Prioridade: Highest | High | Medium | Low | Lowest
```

### Labels Padrão

| Label | Uso |
|-------|-----|
| `claude-generated` | SEMPRE adicionar em tickets criados pelo Claude |
| `to-do` | Validado pelo usuário, pronto para sprint |
| `icebox` | Ideia especulativa, pode ou não ser feita |
| `tech-debt` | Débito técnico identificado |
| `bug` | Bug encontrado durante desenvolvimento |

---

## Comandos Disponíveis

### Consultar
```
"lista o backlog do SCRUM"
"o que tem pendente no sprint?"
"busca tickets sobre transcrição"
"mostra issues com label claude-generated"
```

### Criar
```
"cria um ticket para melhorar o dashboard"
"registra no Jira que precisamos de testes unitários no auth"
"anota no backlog: integrar OCR com Mistral"
```

### Atualizar
```
"marca o SCRUM-15 como done"
"atualiza o SCRUM-8 com o que descobrimos"
"move SCRUM-20 para In Progress"
```

---

## Fluxo de Trabalho

### 1. Início de Sessão
Ao começar uma sessão de desenvolvimento:
- Verificar sprint ativo: issues em "In Progress" e "To Do"
- Informar brevemente o que tem pendente
- Perguntar ao usuário o foco da sessão

### 2. Durante Desenvolvimento
- Se descobrir bug → criar ticket com label `bug` + `claude-generated`
- Se identificar débito técnico → ticket com `tech-debt` + `claude-generated`
- Se usuário mencionar ideia futura → ticket com `icebox` + `claude-generated`
- Se completar uma tarefa do Jira → atualizar status para "Done"

### 3. Fim de Sessão
- Atualizar tickets que foram trabalhados
- Criar tickets para itens pendentes descobertos
- Resumir o que foi feito e o que ficou no backlog

---

## Exemplos Práticos

### Exemplo 1: Implementação + Backlog
```
User: "Corrige o bug de login. Depois, seria legal ter 2FA."
Claude:
  1. Implementa o fix do login (código)
  2. Cria ticket: "[auth] Implementar autenticação 2FA"
     Labels: claude-generated, icebox
```

### Exemplo 2: Descoberta Durante Dev
```
User: "Implementa a busca de processos"
Claude:
  1. Implementa busca
  2. Descobre que a query é O(n²)
  3. Cria ticket: "[performance] Otimizar query de busca de processos"
     Labels: claude-generated, tech-debt
```

### Exemplo 3: Consulta
```
User: "O que tem pendente para o módulo de ofícios?"
Claude: Lista tickets do Jira filtrados por componente/label
```

---

## JQL Queries Úteis

| Consulta | JQL |
|----------|-----|
| Backlog completo | `project = SCRUM ORDER BY priority DESC` |
| Sprint atual | `project = SCRUM AND sprint in openSprints()` |
| Criados pelo Claude | `project = SCRUM AND labels = "claude-generated"` |
| Icebox | `project = SCRUM AND labels = "icebox"` |
| Tech debt | `project = SCRUM AND labels = "tech-debt"` |
| Bugs abertos | `project = SCRUM AND type = Bug AND status != Done` |
| Por módulo | `project = SCRUM AND text ~ "drive"` |

---

## Integração com Outras Skills

| Situação | Skill Jira + Skill X |
|----------|---------------------|
| Implementou feature | `/jira` atualiza ticket → `/commit` commita |
| Bug encontrado | `/debug` investiga → `/jira` cria ticket se não resolve agora |
| Ideia durante brainstorm | `brainstorming` explora → `/jira` registra decisões |
| Code review | `/code-review` → `/jira` cria tickets para issues encontradas |
| Deploy | `/deploy` → `/jira` marca tickets como "Done" |
