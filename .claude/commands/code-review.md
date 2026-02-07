# /code-review - Revisar Código

> **Tipo**: Workflow de Análise
> **Trigger**: "revisa esse código", "tá bom assim?", "code review"

## Descrição

Analisar código para qualidade, segurança, performance e boas práticas.

---

## Checklist de Revisão

### 1. Correção

- [ ] O código faz o que deveria fazer?
- [ ] Casos de borda estão tratados?
- [ ] Erros são tratados adequadamente?

### 2. Clareza

- [ ] O código é fácil de entender?
- [ ] Nomes de variáveis são descritivos?
- [ ] Há comentários onde necessário?

### 3. Simplicidade

- [ ] É a solução mais simples?
- [ ] Há código duplicado?
- [ ] Há abstrações desnecessárias?

### 4. Segurança

- [ ] Inputs são validados?
- [ ] Dados sensíveis estão protegidos?
- [ ] Autenticação/autorização corretas?

### 5. Performance

- [ ] Há queries N+1?
- [ ] Dados são carregados desnecessariamente?
- [ ] Componentes re-renderizam demais?

### 6. Padrões do Projeto

- [ ] Segue convenções do OMBUDS?
- [ ] Usa padrão Defender (zinc/emerald)?
- [ ] TypeScript tipado corretamente?

---

## Análise por Tipo de Arquivo

### Componentes React (.tsx)

```typescript
// ✅ Verificar
- Props tipadas corretamente
- Hooks usados corretamente
- Memo/useCallback onde necessário
- Acessibilidade (aria, alt, labels)
- Estilo segue padrão Defender

// ❌ Evitar
- useEffect sem cleanup
- Estado desnecessário
- Prop drilling excessivo
- Componentes muito grandes (>200 linhas)
```

### Routers tRPC (.ts)

```typescript
// ✅ Verificar
- Input validado com Zod
- Procedure correto (public/protected)
- Erros tipados (TRPCError)
- Queries otimizadas

// ❌ Evitar
- publicProcedure para dados sensíveis
- Queries sem limite
- Falta de tratamento de erro
```

### Schema Drizzle (.ts)

```typescript
// ✅ Verificar
- Campos obrigatórios corretos
- Relacionamentos definidos
- Índices para campos filtrados
- Soft delete (deletedAt)

// ❌ Evitar
- Campos sem tipo
- FK sem constraint
- Falta de timestamps
```

---

## Formato de Feedback

### Para Problemas

```markdown
**Arquivo:** `src/path/file.tsx`
**Linha:** 42

**Problema:** [Descrição]

**Código atual:**
\`\`\`typescript
// código problemático
\`\`\`

**Sugestão:**
\`\`\`typescript
// código melhorado
\`\`\`

**Motivo:** [Por que a mudança é melhor]
```

### Para Aprovação

```markdown
✅ **Código revisado e aprovado**

**Pontos positivos:**
- Bem tipado
- Segue convenções
- Tratamento de erro adequado

**Sugestões menores (opcionais):**
- Considerar extrair função X
- Comentário poderia ser mais claro
```

---

## Níveis de Severidade

| Nível | Descrição | Ação |
|-------|-----------|------|
| 🔴 Blocker | Bug, segurança, crash | Corrigir antes de merge |
| 🟠 Major | Má prática, performance | Deveria corrigir |
| 🟡 Minor | Estilo, nomenclatura | Pode corrigir depois |
| 🟢 Nitpick | Preferência pessoal | Opcional |

---

## Revisão Rápida

Para mudanças pequenas, verificar apenas:

1. **Compila?** `npm run build`
2. **Faz sentido?** Ler o código
3. **Segue padrão?** Visual check
4. **É seguro?** Sem dados expostos

---

## Anti-Padrões Comuns

### No React

```typescript
// ❌ Evitar
useEffect(() => {
  fetchData();
}, []); // Sem dependências quando deveria ter

// ❌ Evitar
const [data, setData] = useState();
if (loading) setData(newData); // setState no render

// ❌ Evitar
<div onClick={handleClick}> // div clicável sem role
```

### No tRPC

```typescript
// ❌ Evitar
.query(async () => {
  return await db.select().from(tabela); // Sem limite!
});

// ❌ Evitar
.mutation(async ({ input }) => {
  await db.delete(tabela).where(eq(id, input.id)); // Hard delete
});
```

### No TypeScript

```typescript
// ❌ Evitar
const data: any = response;
// @ts-ignore
data.forEach(...)
```

---

## Comandos de Suporte

```bash
# Ver mudanças para revisar
git diff --stat

# Ver arquivo específico
git diff path/to/file.tsx

# Verificar tipos
npx tsc --noEmit

# Verificar lint
npm run lint

# Buscar padrões problemáticos
grep -rn "any\|@ts-ignore\|console.log" src/
```
