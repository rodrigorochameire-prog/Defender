# RULES.md - Regras Globais do Projeto OMBUDS

> **Carregamento**: Sempre presente no contexto do agente principal

## 1. Identidade do Projeto

- **Nome**: OMBUDS (Gabinete Digital para Defensoria Pública)
- **Domínio**: Gestão jurídica criminal - Defensoria Pública da Bahia
- **Stack**: Next.js 15 + tRPC + Drizzle ORM + PostgreSQL + Tailwind CSS

---

## 2. Regras de Estilo de Código

### 2.1 TypeScript
- Sempre usar TypeScript strict mode
- Nunca usar `any` - preferir `unknown` ou tipos genéricos
- Interfaces para props de componentes: `interface FooProps {}`
- Zod para validação de inputs em routers tRPC

### 2.2 Nomenclatura
```typescript
// Arquivos
kebab-case.tsx          // Componentes React
kebab-case.ts           // Utilitários e routers

// Código
PascalCase              // Componentes, interfaces, types
camelCase               // Variáveis, funções, props
SCREAMING_SNAKE_CASE    // Constantes e enums
```

### 2.3 Imports (ordem obrigatória)
```typescript
// 1. React/Next
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// 2. Bibliotecas externas
import { format } from "date-fns";

// 3. Aliases internos (@/)
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";

// 4. Tipos
import type { Processo } from "@/lib/db/schema";
```

---

## 3. Convenções de Projeto

### 3.1 Estrutura de Pastas
```
src/
├── app/                    # App Router (páginas)
├── components/
│   ├── ui/                # Componentes base (Radix)
│   ├── shared/            # Componentes reutilizáveis
│   └── [feature]/         # Componentes por domínio
├── lib/
│   ├── db/                # Schema Drizzle
│   ├── trpc/routers/      # Routers tRPC
│   └── services/          # Integrações externas
└── config/                # Configurações de domínio
```

### 3.2 Componentes
- **NUNCA** criar componentes duplicados
- **SEMPRE** verificar se existe em `/components/shared/` antes de criar
- **SEMPRE** usar componentes do design system

### 3.3 tRPC
```typescript
// Padrão de router
export const exemploRouter = router({
  list: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      limit: z.number().default(20),
    }))
    .query(async ({ ctx, input }) => {
      // Implementação
    }),

  create: protectedProcedure
    .input(exemploSchema)
    .mutation(async ({ ctx, input }) => {
      // Sempre invalidar cache após mutation
    }),
});
```

### 3.4 Mutations (CRÍTICO)
```typescript
// ✅ CORRETO - Chamar mutation E mostrar toast
const mutation = trpc.entidade.update.useMutation({
  onSuccess: () => {
    toast.success("Atualizado!");
    utils.entidade.list.invalidate();
  },
  onError: (error) => {
    toast.error("Erro", { description: error.message });
  },
});

// ❌ ERRADO - Só mostrar toast sem chamar mutation
const handleSave = () => {
  toast.success("Salvo!"); // NÃO PERSISTE NADA!
};
```

---

## 4. Restrições de Segurança

### 4.1 Dados Sensíveis
- **NUNCA** commitar arquivos `.env`, `CREDENCIAIS.md`
- **NUNCA** expor senhas ou tokens em código
- **SEMPRE** usar variáveis de ambiente para credenciais

### 4.2 Git
- **NUNCA** usar `git push --force` em branches compartilhadas
- **NUNCA** usar `git reset --hard` sem confirmação
- **SEMPRE** criar commits atômicos com mensagens descritivas

### 4.3 Banco de Dados
- **NUNCA** fazer DROP TABLE sem backup
- **NUNCA** fazer UPDATE/DELETE sem WHERE
- **SEMPRE** usar soft delete (`deletedAt`)

---

## 5. Padrão de Design "Defender"

### 5.1 Filosofia
> **Minimalismo Institucional**: Cores neutras por padrão, cor apenas com significado semântico.

### 5.2 Paleta de Cores
```typescript
// BASE (usar sempre)
zinc-50/100/200    // Fundos, bordas
zinc-700/800       // Textos (dark mode)
white              // Cards

// PRIMÁRIA (uso restrito)
emerald-500/600    // Ações, hover, estados ativos

// SEMÂNTICAS (apenas quando necessário)
rose               // Erros, urgências
amber              // Avisos
blue               // Informações
```

### 5.3 Componentes Obrigatórios
```tsx
// Stats Cards - SEMPRE usar gradient="zinc"
<KPICardPremium
  title="Total"
  value={123}
  icon={Scale}
  gradient="zinc"     // ← OBRIGATÓRIO
  size="sm"
/>

// Hover - SEMPRE emerald
className="hover:border-emerald-200/50 dark:hover:border-emerald-800/30"
```

### 5.4 Proibições
- ❌ `text-[11px]`, `text-[13px]` (magic numbers)
- ❌ Gradientes coloridos sem significado semântico
- ❌ Badges com cores sólidas (usar outline)
- ❌ Duplicar componentes existentes

---

## 6. Padrão de Commits

```bash
# Formato
<tipo>(<escopo>): <descrição>

# Tipos
feat     # Nova funcionalidade
fix      # Correção de bug
style    # Mudanças visuais/CSS
refactor # Refatoração
docs     # Documentação
chore    # Manutenção

# Exemplos
feat(juri): adicionar cálculo de prazos
fix(agenda): corrigir edição de eventos
style(dashboard): padronizar stats cards
```

---

## 7. Checklist Obrigatório (Pré-Commit)

- [ ] Build passa sem erros (`npm run build`)
- [ ] Componentes usam design system (zinc + emerald)
- [ ] Dark mode funciona
- [ ] Mutations chamam métodos corretos (não só toast)
- [ ] Sem código duplicado
- [ ] Imports organizados
- [ ] Commit message no padrão

---

## 8. Comandos Frequentes

```bash
# Desenvolvimento
npm run dev                    # Servidor local

# Banco de dados
npm run db:generate            # Gerar migrations
npm run db:push                # Aplicar migrations
npm run db:studio              # Drizzle Studio

# Build
npm run build                  # Build produção

# Git
git status                     # Ver alterações
git diff --stat HEAD           # Resumo de mudanças
```

---

**Versão**: 1.0
**Atualizado**: Fevereiro 2026
