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
| "melhorar UI", "design", "cores", "tipografia" | `ui-ux-pro-max` |

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

---

### ui-ux-pro-max

Skill de design com **50+ estilos**, **97 paletas**, **57 pares de fontes** e **99 regras de UX**.

**Quando usar**: Ao criar/melhorar componentes visuais, escolher cores, tipografia, ou revisar acessibilidade.

**Conteúdo**:

| Categoria | Quantidade | Exemplos |
|-----------|------------|----------|
| Estilos | 50+ | Minimalism, Bento Grid, Glassmorphism, Dark Mode |
| Paletas | 97 | Government, Legal, SaaS, Healthcare |
| Tipografia | 57 pares | Inter+Fira Code, Poppins+Open Sans |
| UX Guidelines | 99 regras | Acessibilidade, animações, loading states |
| Stacks | 10 | React, Next.js, Tailwind, shadcn/ui |

**Recomendações para Padrão Defender**:

| Aspecto | Recomendação |
|---------|--------------|
| Tipografia | Adicionar `font-mono` para CPF/números de processo |
| Loading | Usar skeletons com `animate-pulse` |
| Interação | Garantir `cursor-pointer` em cards clicáveis |
| Acessibilidade | Implementar `prefers-reduced-motion` |
| Layout | Considerar Bento Grid para dashboard |

**Checklist Pre-Delivery**:

```
[ ] Sem emojis como ícones (usar Lucide)
[ ] cursor-pointer em elementos clicáveis
[ ] Hover com transições suaves (150-300ms)
[ ] Contraste 4.5:1 mínimo (WCAG AA)
[ ] Focus states visíveis para navegação por teclado
[ ] Responsivo: 375px, 768px, 1024px, 1440px
[ ] prefers-reduced-motion respeitado
```

**Localização**: `.agents/skills/ui-ux-pro-max/`

**Comandos**:

```bash
# Gerar design system
python3 .agents/skills/ui-ux-pro-max/scripts/search.py "legal dashboard professional" --design-system -p "OMBUDS"

# Buscar estilos
python3 .agents/skills/ui-ux-pro-max/scripts/search.py "minimalist dark" --domain style

# Buscar tipografia
python3 .agents/skills/ui-ux-pro-max/scripts/search.py "professional readable" --domain typography

# Buscar paletas
python3 .agents/skills/ui-ux-pro-max/scripts/search.py "government legal" --domain color
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
