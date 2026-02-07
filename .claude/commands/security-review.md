# /security-review - Revisão de Segurança

> **Tipo**: Workflow Especializado
> **Fonte**: Security Best Practices (Tech Leads Club)
> **Execução**: Sob demanda ou passivamente durante desenvolvimento

## Descrição

Realizar revisões de segurança específicas para Next.js/TypeScript, identificar vulnerabilidades e sugerir correções seguindo boas práticas.

---

## Modos de Operação

### 1. Modo Ativo (Relatório Completo)
Quando solicitado: "revisar segurança", "security audit", "relatório de segurança"

### 2. Modo Passivo (Durante Desenvolvimento)
Detectar vulnerabilidades críticas enquanto desenvolve e alertar o usuário.

### 3. Modo Correção
Após relatório, aplicar correções priorizadas.

---

## Stack OMBUDS - Pontos de Atenção

### Next.js 15 + App Router

```typescript
// ❌ VULNERÁVEL - Exposição de dados em Server Components
export default async function Page() {
  const users = await db.query.usuarios.findMany();
  return <pre>{JSON.stringify(users, null, 2)}</pre>; // Expõe todos os dados
}

// ✅ SEGURO - Seleção específica de campos
export default async function Page() {
  const users = await db.query.usuarios.findMany({
    columns: { id: true, nome: true },
  });
  return <UserList users={users} />;
}
```

### tRPC - Validação de Input

```typescript
// ❌ VULNERÁVEL - Sem validação
export const updateAssistido = publicProcedure
  .mutation(async ({ input }) => {
    // input não validado
    await db.update(assistidos).set(input);
  });

// ✅ SEGURO - Validação com Zod
export const updateAssistido = protectedProcedure
  .input(z.object({
    id: z.number().positive(),
    nome: z.string().min(1).max(255),
    cpf: z.string().length(11).optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    // Verificar permissão
    if (!ctx.session.user.canEdit) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }
    await db.update(assistidos).set(input).where(eq(assistidos.id, input.id));
  });
```

### Drizzle ORM - SQL Injection

```typescript
// ❌ VULNERÁVEL - String interpolation
const result = await db.execute(
  sql`SELECT * FROM assistidos WHERE nome LIKE '%${searchTerm}%'`
);

// ✅ SEGURO - Parâmetros preparados
const result = await db.query.assistidos.findMany({
  where: like(assistidos.nome, `%${searchTerm}%`),
});
```

### Autenticação - NextAuth

```typescript
// ❌ VULNERÁVEL - Callback não validado
callbacks: {
  async redirect({ url }) {
    return url; // Open redirect vulnerability
  }
}

// ✅ SEGURO - Validar origem
callbacks: {
  async redirect({ url, baseUrl }) {
    if (url.startsWith(baseUrl)) return url;
    return baseUrl;
  }
}
```

---

## Checklist de Segurança OMBUDS

### Crítico (Corrigir Imediatamente)

- [ ] **SQL Injection**: Todas queries usam parâmetros preparados (Drizzle ORM)
- [ ] **XSS**: Nenhum `dangerouslySetInnerHTML` sem sanitização
- [ ] **CSRF**: tRPC mutations protegidas por autenticação
- [ ] **Autenticação**: Rotas protegidas verificam sessão
- [ ] **Autorização**: Verificar permissões antes de operações sensíveis

### Alto (Corrigir Antes de Deploy)

- [ ] **Dados Sensíveis**: CPF, RG nunca logados ou expostos em erros
- [ ] **Rate Limiting**: APIs públicas têm limite de requisições
- [ ] **Validação**: Todos inputs validados com Zod
- [ ] **Senhas**: Nunca armazenadas em plain text
- [ ] **Tokens**: JWT com expiração adequada

### Médio (Corrigir em Sprint)

- [ ] **Headers**: CSP, X-Frame-Options configurados
- [ ] **CORS**: Origens permitidas explícitas
- [ ] **Logs**: Dados sensíveis não aparecem em logs
- [ ] **Deps**: `npm audit` sem vulnerabilidades críticas

---

## Formato do Relatório

```markdown
# Relatório de Segurança - OMBUDS

**Data:** YYYY-MM-DD
**Escopo:** [descrição do escopo]

## Resumo Executivo

- **Críticos:** X encontrados
- **Altos:** X encontrados
- **Médios:** X encontrados

## Achados Críticos

### [SEC-001] Título do Problema
- **Arquivo:** `src/path/to/file.ts:123`
- **Tipo:** SQL Injection / XSS / etc
- **Impacto:** [descrição do impacto]
- **Correção:**
\`\`\`typescript
// Código corrigido
\`\`\`

## Achados Altos

### [SEC-002] ...

## Recomendações

1. Prioridade 1: ...
2. Prioridade 2: ...

## Próximos Passos

- [ ] Aplicar correções críticas
- [ ] Executar npm audit
- [ ] Revisar headers de segurança
```

---

## Padrões Seguros OMBUDS

### Server Actions

```typescript
"use server";

import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function deleteAssistido(id: number) {
  // 1. Verificar autenticação
  const session = await auth();
  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  // 2. Verificar permissão
  if (!session.user.canDelete) {
    throw new Error("Sem permissão");
  }

  // 3. Validar input
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("ID inválido");
  }

  // 4. Executar operação
  await db.update(assistidos)
    .set({ deletedAt: new Date() })
    .where(eq(assistidos.id, id));

  // 5. Invalidar cache
  revalidatePath("/admin/assistidos");
}
```

### API Routes

```typescript
// app/api/assistidos/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  nome: z.string().min(1).max(255),
  cpf: z.string().length(11).optional(),
});

export async function POST(request: Request) {
  // 1. Auth
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  // 2. Parse & Validate
  const body = await request.json();
  const result = schema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // 3. Execute
  const assistido = await db.insert(assistidos).values(result.data).returning();

  return NextResponse.json(assistido);
}
```

---

## Comandos de Verificação

```bash
# Verificar dependências vulneráveis
npm audit

# Verificar secrets expostos
grep -r "SUPABASE_URL\|GOOGLE_CLIENT\|DATABASE_URL" src/

# Verificar console.log com dados sensíveis
grep -rn "console.log.*cpf\|console.log.*senha\|console.log.*password" src/

# Verificar dangerouslySetInnerHTML
grep -rn "dangerouslySetInnerHTML" src/
```
