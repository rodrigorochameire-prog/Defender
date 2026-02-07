# CLAUDE.md - Projeto OMBUDS

> Este arquivo aponta para a documentação completa do projeto.

## Estrutura de Contexto para Agentes de IA

```
.claude/
├── RULES.md              # Regras globais (sempre carregado)
├── AGENTS.md             # Documentação do projeto (sempre carregado)
├── commands/             # Skills especializadas (21 skills)
│   │
│   │ # Desenvolvimento
│   ├── commit.md             # /commit - Commits padronizados
│   ├── new-page.md           # /new-page - Criar página
│   ├── new-router.md         # /new-router - Criar router tRPC
│   ├── db-migrate.md         # /db-migrate - Migrações de banco
│   ├── coding-guidelines.md  # /coding-guidelines - Diretrizes Karpathy
│   ├── spec-driven.md        # /spec-driven - Desenvolvimento estruturado
│   ├── tdd.md                # /tdd - Technical Design Document
│   │
│   │ # Qualidade
│   ├── fix-style.md          # /fix-style - Padronizar estilos
│   ├── security-review.md    # /security-review - Auditoria de segurança
│   ├── quality-audit.md      # /quality-audit - Lighthouse/Web Vitals
│   ├── code-review.md        # /code-review - Revisar código
│   │
│   │ # Verificação
│   ├── validate.md           # /validate - Validar implementação
│   ├── debug.md              # /debug - Debugar problemas
│   ├── browser-test.md       # /browser-test - Testar no navegador
│   ├── fix-ci.md             # /fix-ci - Corrigir falhas no CI
│   │
│   │ # Publicação
│   ├── deploy.md             # /deploy - Deploy para Vercel
│   ├── pr-review.md          # /pr-review - Revisão de PR (gh)
│   ├── update-docs.md        # /update-docs - Atualizar documentação
│   │
│   │ # Arquitetura
│   ├── architecture-analysis.md # /architecture-analysis - DDD/Domínios
│   │
│   │ # Ideação
│   └── ideias-defesa.md      # /ideias-defesa - Gerador de ideias
│
├── mcp.json              # Configuração MCP (Supabase)
└── settings.local.json   # Permissões locais
```

## Skills por Linguagem Natural

| Você diz | Skill acionada |
|----------|----------------|
| "testa no browser", "abre a página" | `/browser-test` |
| "valida isso", "tá funcionando?" | `/validate` |
| "debug", "não funciona", "dá erro" | `/debug` |
| "revisa esse código", "tá bom assim?" | `/code-review` |
| "deploy", "publica", "vercel" | `/deploy` |
| "documenta isso", "atualiza a doc" | `/update-docs` |
| "faz commit" | `/commit` |
| "corrige estilo", "padrão defender" | `/fix-style` |
| "ideias", "sugere funcionalidade", "próxima feature" | `/ideias-defesa` |
| "criar TDD", "design doc", "especificação técnica" | `/tdd` |
| "CI falhou", "build quebrou", "GitHub Actions erro" | `/fix-ci` |
| "otimizar query", "performance do banco", "índices" | `supabase-postgres-best-practices` |

## Skills Globais (instaladas via npx skills)

### supabase-postgres-best-practices

Skill oficial do Supabase com **30 regras** de otimização do PostgreSQL.

**Quando usar**: Ao escrever queries SQL, projetar schemas ou otimizar performance do banco.

**Categorias por Prioridade**:

| Prioridade | Categoria | Exemplos de Regras |
|------------|-----------|-------------------|
| 1 - CRITICAL | Query Performance | missing-indexes, composite-indexes, covering-indexes |
| 2 - CRITICAL | Connection Management | pooling, limits, idle-timeout |
| 3 - CRITICAL | Security & RLS | rls-basics, rls-performance, privileges |
| 4 - HIGH | Schema Design | data-types, foreign-key-indexes, partitioning |
| 5 - MEDIUM-HIGH | Concurrency & Locking | deadlock-prevention, short-transactions |
| 6 - MEDIUM | Data Access Patterns | batch-inserts, n-plus-one, pagination |
| 7 - LOW-MEDIUM | Monitoring | explain-analyze, pg-stat-statements |
| 8 - LOW | Advanced Features | full-text-search, jsonb-indexing |

**Localização**: `~/.agents/skills/supabase-postgres-best-practices/`

## Arquivos Principais

| Arquivo | Descrição |
|---------|-----------|
| `.claude/RULES.md` | Regras de código, estilo, segurança e convenções |
| `.claude/AGENTS.md` | Arquitetura, design system, modelo de dados |
| `.claude/commands/` | Workflows especializados (skills) |

## Início Rápido

```bash
# Desenvolvimento
npm run dev

# Build
npm run build

# Banco de dados
npm run db:generate   # Gerar migrations
npm run db:push       # Aplicar migrations
npm run db:studio     # Interface visual
```

## Links Úteis

- **Stack**: Next.js 15, tRPC, Drizzle ORM, PostgreSQL, Tailwind CSS
- **Design**: Padrão "Defender" (zinc neutro + emerald hover)
- **Hospedagem**: Vercel + Supabase

---

Para documentação completa, consulte os arquivos em `.claude/`.
