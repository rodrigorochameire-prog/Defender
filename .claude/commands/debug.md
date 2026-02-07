# /debug - Debugar Problemas

> **Tipo**: Workflow de Investigação
> **Trigger**: "debug", "por que não funciona?", "dá erro", "não tá funcionando"

## Descrição

Investigar e resolver erros de forma sistemática.

---

## Workflow

### 1. Coletar Informações

**Perguntas iniciais:**
- Qual o erro exato? (mensagem, stack trace)
- Onde ocorre? (arquivo, linha, página)
- Quando começou? (após qual mudança)
- É reproduzível? (sempre ou às vezes)

### 2. Classificar o Erro

| Tipo | Sintomas | Onde olhar |
|------|----------|------------|
| **Build** | `npm run build` falha | Terminal, TypeScript errors |
| **Runtime** | Página quebra | Console do browser |
| **Lógica** | Comportamento errado | Código, dados |
| **Estilo** | Visual incorreto | CSS, Tailwind classes |
| **Dados** | Info errada/faltando | Query, banco, API |

### 3. Investigar por Tipo

#### Erro de Build/TypeScript

```bash
# Ver erros completos
npm run build 2>&1 | head -50

# Verificar tipos
npx tsc --noEmit
```

**Causas comuns:**
- Import faltando
- Tipo incorreto
- Propriedade não existe

#### Erro de Runtime (Browser)

```bash
# Via MCP Chrome
read_console_messages com pattern de erro
```

**Causas comuns:**
- Hydration mismatch
- Undefined/null access
- API não responde

#### Erro de Dados

```sql
-- Verificar no banco
SELECT * FROM tabela WHERE condição LIMIT 5;
```

```typescript
// Log no código
console.log("Debug:", { variavel, outraVariavel });
```

### 4. Padrão de Resolução

```
1. REPRODUZIR
   └─ Confirmar que o erro acontece

2. ISOLAR
   └─ Encontrar a menor parte que causa o erro

3. ENTENDER
   └─ Por que esse código causa o problema?

4. CORRIGIR
   └─ Fazer a mudança mínima necessária

5. VERIFICAR
   └─ O erro sumiu? Não criou outros?
```

---

## Erros Comuns no OMBUDS

### "Cannot read property of undefined"

```typescript
// ❌ Causa
const nome = assistido.endereco.rua; // endereco pode ser null

// ✅ Solução
const nome = assistido.endereco?.rua ?? "Não informado";
```

### "Hydration mismatch"

```typescript
// ❌ Causa - Date no servidor vs cliente
<p>{new Date().toLocaleString()}</p>

// ✅ Solução - Usar em useEffect ou suprimir
const [date, setDate] = useState<string>();
useEffect(() => setDate(new Date().toLocaleString()), []);
```

### "TRPC error: UNAUTHORIZED"

```typescript
// ❌ Causa - Procedure pública acessando sessão
export const getData = publicProcedure.query(({ ctx }) => {
  ctx.session.user; // undefined!
});

// ✅ Solução
export const getData = protectedProcedure.query(({ ctx }) => {
  ctx.session.user; // garantido
});
```

### "Foreign key constraint"

```sql
-- Causa: tentando deletar registro com dependências
DELETE FROM assistidos WHERE id = 1; -- tem casos vinculados!

-- Solução: soft delete ou deletar dependências primeiro
UPDATE assistidos SET deleted_at = NOW() WHERE id = 1;
```

### Filtro não funciona

```typescript
// ❌ Causa - valores não coincidem
options: [{ value: "Criminal Geral" }]  // opção
mapeamento: { "SUBSTITUICAO": "Substituição Criminal" }  // dado

// ✅ Solução - padronizar valores
options: [{ value: "Substituição Criminal" }]
mapeamento: { "SUBSTITUICAO": "Substituição Criminal" }
```

---

## Comandos de Debug

```bash
# TypeScript
npx tsc --noEmit

# Lint
npm run lint

# Verificar imports circulares
npx madge --circular src/

# Logs do Next.js
npm run dev 2>&1 | grep -i error

# Testar query específica
npx drizzle-kit studio
```

---

## Checklist de Debug

- [ ] Li a mensagem de erro completa?
- [ ] Sei em qual arquivo/linha ocorre?
- [ ] Consigo reproduzir o erro?
- [ ] Verifiquei o código relacionado?
- [ ] Testei a correção?
- [ ] A correção não quebrou outra coisa?

---

## Quando Escalar

Se após 15 minutos não encontrar a causa:

1. Descrever o problema claramente
2. Listar o que já foi tentado
3. Compartilhar código/logs relevantes
4. Pedir ajuda específica
