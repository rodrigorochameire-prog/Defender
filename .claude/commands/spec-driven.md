# /spec-driven - Desenvolvimento Orientado a Especificação

> **Tipo**: Workflow Completo de Desenvolvimento
> **Fonte**: TLC Spec-Driven Development (Tech Leads Club)
> **Uso**: Planejamento e implementação de features complexas

## Descrição

Workflow estruturado para planejar e implementar funcionalidades com precisão. Divide o trabalho em 4 fases com entregas claras.

```
┌──────────┐   ┌──────────┐   ┌─────────┐   ┌───────────────────┐
│ SPECIFY  │ → │  DESIGN  │ → │  TASKS  │ → │ IMPLEMENT+VALIDATE│
└──────────┘   └──────────┘   └─────────┘   └───────────────────┘
```

---

## Estrutura de Arquivos

```
.specs/
├── project/
│   ├── PROJECT.md      # Visão & objetivos
│   ├── ROADMAP.md      # Features & milestones
│   └── STATE.md        # Memória entre sessões
├── codebase/           # Análise de codebase existente
│   ├── STACK.md
│   ├── ARCHITECTURE.md
│   ├── CONVENTIONS.md
│   ├── STRUCTURE.md
│   ├── TESTING.md
│   └── INTEGRATIONS.md
└── features/           # Especificações de features
    └── [feature]/
        ├── spec.md
        ├── design.md
        └── tasks.md
```

---

## Fase 1: SPECIFY (Especificar)

**Trigger:** "especificar feature", "definir requisitos", "spec"

### Template: spec.md

```markdown
# Feature: [Nome da Feature]

## Contexto
Por que essa feature é necessária? Qual problema resolve?

## User Stories

### US-01: [Título]
**Como** [tipo de usuário]
**Quero** [ação]
**Para** [benefício]

#### Critérios de Aceitação
- [ ] CA-01: [critério mensurável]
- [ ] CA-02: [critério mensurável]

### US-02: ...

## Requisitos Não-Funcionais
- Performance: [métricas]
- Segurança: [requisitos]
- Acessibilidade: [nível WCAG]

## Fora do Escopo
- [O que NÃO será implementado]

## Dependências
- Feature X deve estar completa
- API Y deve estar disponível

## Riscos
| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| ... | Alta/Média/Baixa | Alto/Médio/Baixo | ... |
```

### Exemplo OMBUDS

```markdown
# Feature: Filtro Avançado de Demandas

## Contexto
Atualmente os defensores têm dificuldade em encontrar demandas específicas.
O filtro básico por status não é suficiente para a quantidade de dados.

## User Stories

### US-01: Filtrar por Múltiplos Critérios
**Como** defensor
**Quero** filtrar demandas por atribuição, status e período
**Para** encontrar rapidamente as demandas que preciso atender

#### Critérios de Aceitação
- [ ] CA-01: Posso selecionar múltiplas atribuições simultaneamente
- [ ] CA-02: Posso combinar filtros de status e atribuição
- [ ] CA-03: Filtros persistem na URL para compartilhamento
- [ ] CA-04: Resultados atualizam em < 500ms
```

---

## Fase 2: DESIGN (Projetar)

**Trigger:** "design feature", "arquitetura", "design"

### Template: design.md

```markdown
# Design: [Nome da Feature]

## Decisões de Arquitetura

### ADR-01: [Decisão]
**Status:** Proposta | Aceita | Rejeitada
**Contexto:** [Situação que levou à decisão]
**Decisão:** [O que foi decidido]
**Consequências:** [Impactos positivos e negativos]

## Modelo de Dados

### Alterações no Schema
\`\`\`typescript
// Novas tabelas/campos necessários
\`\`\`

### Migrations
\`\`\`sql
-- SQL necessário
\`\`\`

## Componentes

### Novos Componentes
| Componente | Responsabilidade | Props |
|------------|------------------|-------|
| ... | ... | ... |

### Componentes Modificados
| Componente | Mudanças |
|------------|----------|
| ... | ... |

## API / Backend

### Endpoints tRPC
| Procedure | Input | Output |
|-----------|-------|--------|
| ... | ... | ... |

## UI/UX

### Wireframes
[Descrição ou link para wireframes]

### Fluxo de Usuário
1. Usuário acessa...
2. Sistema exibe...
3. Usuário interage...

## Testes

### Unitários
- [ ] Testar componente X
- [ ] Testar função Y

### E2E
- [ ] Fluxo completo de Z
```

---

## Fase 3: TASKS (Tarefas)

**Trigger:** "criar tarefas", "quebrar em tasks", "tasks"

### Template: tasks.md

```markdown
# Tasks: [Nome da Feature]

## Sprint/Milestone: [Identificador]

### Fase 1: Setup & Infraestrutura
| ID | Tarefa | Estimativa | Dependências | Status |
|----|--------|------------|--------------|--------|
| T-01 | Criar migration para X | 1h | - | ⬜ |
| T-02 | Adicionar schema Drizzle | 30min | T-01 | ⬜ |

### Fase 2: Backend
| ID | Tarefa | Estimativa | Dependências | Status |
|----|--------|------------|--------------|--------|
| T-03 | Criar router tRPC | 2h | T-02 | ⬜ |
| T-04 | Implementar validação | 1h | T-03 | ⬜ |

### Fase 3: Frontend
| ID | Tarefa | Estimativa | Dependências | Status |
|----|--------|------------|--------------|--------|
| T-05 | Criar componente Filtro | 3h | T-03 | ⬜ |
| T-06 | Integrar com página | 1h | T-05 | ⬜ |

### Fase 4: Testes & Polish
| ID | Tarefa | Estimativa | Dependências | Status |
|----|--------|------------|--------------|--------|
| T-07 | Testes unitários | 2h | T-06 | ⬜ |
| T-08 | Testes E2E | 2h | T-07 | ⬜ |

## Legendas
- ⬜ Pendente
- 🔄 Em progresso
- ✅ Completo
- ❌ Bloqueado
- ⏸️ Pausado

## Notas de Implementação
[Detalhes importantes para cada task]
```

---

## Fase 4: IMPLEMENT + VALIDATE

**Trigger:** "implementar task T-XX", "validar feature"

### Fluxo de Implementação

```
1. Selecionar task → Marcar 🔄
2. Implementar
3. Testar localmente
4. Commitar (seguindo /commit)
5. Marcar ✅
6. Próxima task
```

### Critérios de Validação

Para cada task:
- [ ] Código compila sem erros
- [ ] TypeScript sem warnings
- [ ] Testes passando
- [ ] Funcionalidade verificada manualmente

Para a feature completa:
- [ ] Todos critérios de aceitação atendidos
- [ ] Performance dentro do esperado
- [ ] Acessibilidade verificada
- [ ] Code review aprovado

---

## STATE.md - Memória Entre Sessões

```markdown
# Estado do Projeto - OMBUDS

## Última Atualização
Data: YYYY-MM-DD HH:MM
Sessão: #XX

## Em Progresso
- [ ] Feature: Filtro Avançado de Demandas
  - Tasks completas: T-01, T-02, T-03
  - Próxima: T-04

## Decisões Recentes
| Data | Decisão | Contexto |
|------|---------|----------|
| ... | ... | ... |

## Blockers
| ID | Descrição | Responsável | Status |
|----|-----------|-------------|--------|
| B-01 | API X indisponível | @dev | Aguardando |

## Contexto para Próxima Sessão
[O que o agente precisa saber para continuar]

## Preferências do Usuário
- Prefere commits granulares
- Usa português para documentação
- Modelo Sonnet para tarefas leves
```

---

## Comandos Rápidos

| Comando | Descrição |
|---------|-----------|
| `especificar [feature]` | Iniciar fase Specify |
| `design [feature]` | Iniciar fase Design |
| `tasks [feature]` | Criar breakdown de tasks |
| `implementar T-XX` | Executar task específica |
| `validar [feature]` | Verificar critérios de aceitação |
| `pausar trabalho` | Salvar estado em STATE.md |
| `retomar trabalho` | Carregar contexto do STATE.md |

---

## Integração com Outras Skills

- **/commit** - Após cada task completa
- **/security-review** - Durante fase Design
- **/quality-audit** - Durante fase Validate
- **/coding-guidelines** - Durante fase Implement
