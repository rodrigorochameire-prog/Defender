# CLAUDE.md - Projeto OMBUDS

> Este arquivo aponta para a documentação completa do projeto.

## Estrutura de Contexto para Agentes de IA

```
.claude/
├── RULES.md              # Regras globais (sempre carregado)
├── AGENTS.md             # Documentação do projeto (sempre carregado)
├── commands/             # Skills especializadas (19 skills)
│   │
│   │ # Desenvolvimento
│   ├── commit.md             # /commit - Commits padronizados
│   ├── new-page.md           # /new-page - Criar página
│   ├── new-router.md         # /new-router - Criar router tRPC
│   ├── db-migrate.md         # /db-migrate - Migrações de banco
│   ├── coding-guidelines.md  # /coding-guidelines - Diretrizes Karpathy
│   ├── spec-driven.md        # /spec-driven - Desenvolvimento estruturado
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
