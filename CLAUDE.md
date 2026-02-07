# CLAUDE.md - Projeto OMBUDS

> Este arquivo aponta para a documentação completa do projeto.

## Estrutura de Contexto para Agentes de IA

```
.claude/
├── RULES.md              # Regras globais (sempre carregado)
├── AGENTS.md             # Documentação do projeto (sempre carregado)
├── commands/             # Skills especializadas
│   ├── commit.md         # /commit - Commits padronizados
│   ├── new-page.md       # /new-page - Criar página
│   ├── new-router.md     # /new-router - Criar router tRPC
│   ├── fix-style.md      # /fix-style - Padronizar estilos
│   ├── db-migrate.md     # /db-migrate - Migrações de banco
│   ├── coding-guidelines.md  # /coding-guidelines - Diretrizes Karpathy
│   ├── security-review.md    # /security-review - Auditoria de segurança
│   ├── quality-audit.md      # /quality-audit - Lighthouse/Web Vitals
│   ├── pr-review.md          # /pr-review - Revisão de PR (gh)
│   └── spec-driven.md        # /spec-driven - Desenvolvimento estruturado
├── mcp.json              # Configuração MCP (Supabase)
└── settings.local.json   # Permissões locais
```

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
