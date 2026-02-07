# /validate - Validar Implementação

> **Tipo**: Workflow de Verificação
> **Trigger**: "valida isso", "tá funcionando?", "verifica se tá certo"

## Descrição

Verificar se a implementação está correta em múltiplos níveis.

---

## Checklist de Validação

### Nível 1: Código Compila

```bash
# TypeScript sem erros
npx tsc --noEmit

# Build passa
npm run build
```

**Se falhar:**
- Ler erro de TypeScript
- Corrigir tipos/imports
- Revalidar

### Nível 2: Lint Passa

```bash
# ESLint
npm run lint

# Prettier (se configurado)
npx prettier --check "src/**/*.{ts,tsx}"
```

**Se falhar:**
- Aplicar correções sugeridas
- `npm run lint -- --fix`

### Nível 3: Testes Passam

```bash
# Testes unitários
npm test

# Testes específicos
npm test -- --grep "nome do teste"
```

**Se falhar:**
- Verificar se teste está correto
- Ou corrigir implementação

### Nível 4: Funciona no Browser

1. Abrir página no navegador
2. Verificar renderização
3. Testar interações
4. Checar console (sem erros)

### Nível 5: Dados Corretos

```sql
-- Verificar no banco se necessário
SELECT * FROM tabela ORDER BY created_at DESC LIMIT 5;
```

---

## Validação por Tipo de Mudança

### Novo Componente

| Check | Comando/Ação |
|-------|--------------|
| Renderiza | Abrir página que usa |
| Props tipadas | `tsc --noEmit` |
| Estilo correto | Visual check (padrão Defender) |
| Responsivo | Redimensionar janela |
| Acessível | Tab navigation funciona |

### Nova Rota tRPC

| Check | Comando/Ação |
|-------|--------------|
| TypeScript OK | `tsc --noEmit` |
| Validação Zod | Testar input inválido |
| Autenticação | Testar sem login |
| Retorno correto | Verificar dados |

### Mudança no Schema

| Check | Comando/Ação |
|-------|--------------|
| Migration gerada | `npm run db:generate` |
| Migration aplicada | `npm run db:push` |
| Dados preservados | Query no studio |
| App funciona | Testar CRUD |

### Correção de Bug

| Check | Comando/Ação |
|-------|--------------|
| Bug corrigido | Reproduzir cenário original |
| Sem regressão | Testar fluxos relacionados |
| Build passa | `npm run build` |

---

## Relatório de Validação

```markdown
## Validação: [Nome da Feature/Correção]

**Data:** YYYY-MM-DD
**Branch:** cranky-liskov

### Resultados

| Check | Status |
|-------|--------|
| TypeScript | ✅ |
| Lint | ✅ |
| Build | ✅ |
| Testes | ⚠️ 1 skip |
| Browser | ✅ |
| Dados | ✅ |

### Notas
- Teste X pulado porque [razão]
- Verificado manualmente [cenário]

### Pronto para Commit?
✅ Sim / ❌ Não (pendências: ...)
```

---

## Validação Rápida (Fast Path)

Para mudanças pequenas:

```bash
# One-liner
npm run build && echo "✅ Pronto para commit"
```

---

## Validação Completa (Antes de PR)

```bash
# Script completo
npm run lint && \
npm run build && \
npm test && \
echo "✅ Validação completa - OK para PR"
```

---

## Quando Pular Validação?

**Nunca pular build.** Mas pode simplificar para:

| Tipo de Mudança | Validação Mínima |
|-----------------|------------------|
| Só documentação | Nenhuma |
| Só comentários | `tsc --noEmit` |
| Typo em texto | Build |
| Estilo/CSS | Build + visual |
| Lógica/código | Build + teste manual |
| Schema/dados | Tudo |
