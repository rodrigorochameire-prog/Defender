# RULES.md - Regras Globais do Projeto OMBUDS

> **Carregamento**: Sempre presente no contexto

---

## Roteamento por Tipo de Tarefa

Antes de executar qualquer tarefa, identifique o tipo e consulte os recursos apropriados:

| Tipo de Tarefa | Onde Buscar | Skill |
|----------------|-------------|-------|
| **Criar página** | `AGENTS.md §2` (Arquitetura) + `commands/new-page.md` | `/new-page` |
| **Criar router tRPC** | `AGENTS.md §3` (Modelo de Dados) + `commands/new-router.md` | `/new-router` |
| **Corrigir estilos/UI** | `AGENTS.md §4` (Design System) + `commands/fix-style.md` | `/fix-style` |
| **Migrar banco** | `AGENTS.md §3` + `commands/db-migrate.md` | `/db-migrate` |
| **Fazer commit** | Este arquivo §6 + `commands/commit.md` | `/commit` |
| **Bug em mutation** | Este arquivo §3.4 | - |
| **Bug visual** | `AGENTS.md §4` (Design System) | `/fix-style` |
| **Integração externa** | `AGENTS.md §5` (Integrações) | - |
| **Gerenciar backlog** | `commands/jira.md` | `/jira` |
| **Criar ticket** | `commands/jira.md` | `/jira` |

---

## 1. Identidade do Projeto

```yaml
Nome: OMBUDS
Domínio: Gestão jurídica criminal - Defensoria Pública da Bahia
Stack: Next.js 15 + tRPC + Drizzle ORM + PostgreSQL + Tailwind CSS
```

---

## 2. Regras de Código

### 2.1 TypeScript
- ✅ Strict mode sempre
- ✅ Interfaces para props: `interface FooProps {}`
- ✅ Zod para validação de inputs tRPC
- ❌ Nunca usar `any`

### 2.2 Nomenclatura
```
Arquivos:     kebab-case.tsx / kebab-case.ts
Componentes:  PascalCase
Variáveis:    camelCase
Constantes:   SCREAMING_SNAKE_CASE
```

### 2.3 Imports (ordem)
```typescript
// 1. React/Next
import { useState } from "react";
// 2. Libs externas
import { format } from "date-fns";
// 3. Internos (@/)
import { trpc } from "@/lib/trpc/client";
// 4. Tipos
import type { Processo } from "@/lib/db/schema";
```

---

## 3. Padrões Críticos

### 3.1 Componentes
```
⚠️ ANTES de criar componente:
   → Verificar /components/shared/
   → Verificar /components/ui/
   → NUNCA duplicar
```

### 3.2 Estrutura de Pastas
```
src/app/                    # Páginas (App Router)
src/components/shared/      # Componentes reutilizáveis
src/components/ui/          # Base (Radix/shadcn)
src/lib/trpc/routers/       # APIs tRPC
src/lib/services/           # Integrações externas
src/lib/db/schema.ts        # Schema único do banco
```

### 3.3 tRPC Router
```typescript
// Sempre validar com Zod
// Sempre usar protectedProcedure
// Sempre invalidar cache após mutation
```

### 3.4 Mutations (CRÍTICO - Bug comum)
```typescript
// ❌ ERRADO - Só toast, não persiste
const handleSave = () => {
  toast.success("Salvo!"); // Não chama mutation!
};

// ✅ CORRETO - Chamar mutation
const mutation = trpc.entidade.update.useMutation({
  onSuccess: () => {
    toast.success("Salvo!");
    utils.entidade.list.invalidate();
  },
});
```

---

## 4. Segurança

### 4.1 Dados Sensíveis
- ❌ Nunca commitar `.env`, `CREDENCIAIS.md`
- ❌ Nunca expor tokens em código
- ✅ Sempre usar variáveis de ambiente

### 4.2 Git
- ❌ Nunca `git push --force` em branches compartilhadas
- ❌ Nunca `git reset --hard` sem confirmação
- ✅ Commits atômicos com mensagens descritivas

### 4.3 Banco de Dados
- ❌ Nunca DROP TABLE sem backup
- ❌ Nunca UPDATE/DELETE sem WHERE
- ✅ Sempre usar soft delete (`deletedAt`)

---

## 5. Design "Defender" (Resumo)

> **Regra de ouro**: Cores neutras por padrão, cor apenas com significado semântico.

```typescript
// Stats Cards - SEMPRE zinc
<KPICardPremium gradient="zinc" />

// Hover - SEMPRE emerald
className="hover:border-emerald-200/50"

// Proibido
❌ text-[11px], text-[13px]  // Magic numbers
❌ gradient="blue/rose/amber" // Sem significado
❌ Badges com cores sólidas
```

📖 **Detalhes completos**: Ver `AGENTS.md §4`

---

## 6. Padrão de Commits

```bash
<tipo>(<escopo>): <descrição>

# Tipos
feat     # Nova funcionalidade
fix      # Correção de bug
style    # Mudanças visuais
refactor # Refatoração
docs     # Documentação
chore    # Manutenção
```

📖 **Skill completa**: `/commit`

---

## 7. Checklist Pré-Commit

```bash
[ ] npm run build          # Sem erros
[ ] Design system          # zinc + emerald
[ ] Dark mode              # Funciona
[ ] Mutations              # Chamam métodos corretos
[ ] Sem duplicação         # Código limpo
```

---

## 8. Comandos Rápidos

```bash
npm run dev           # Desenvolvimento
npm run build         # Build produção
npm run db:generate   # Gerar migrations
npm run db:push       # Aplicar migrations
npm run db:studio     # Interface visual
```
