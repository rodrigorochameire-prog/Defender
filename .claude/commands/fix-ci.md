# /fix-ci - Corrigir Falhas no CI

> **Tipo**: Workflow de Debug
> **Fonte**: Tech Leads Club - gh-fix-ci
> **Trigger**: "CI falhou", "build quebrou", "PR check failed", "GitHub Actions erro"

## Descrição

Diagnosticar e corrigir falhas em checks do GitHub Actions no PR atual.

---

## Pré-requisitos

```bash
# Verificar autenticação GitHub CLI
gh auth status

# Se não autenticado
gh auth login
```

---

## Workflow

### 1. Identificar PR Atual

```bash
# Ver PR da branch atual
gh pr view --json number,title,state,url

# Listar checks do PR
gh pr checks
```

### 2. Identificar Checks com Falha

```bash
# Ver status detalhado dos checks
gh pr checks --json name,state,conclusion,link

# Filtrar apenas falhas
gh pr checks | grep -E "fail|error"
```

### 3. Analisar Logs do GitHub Actions

```bash
# Listar runs recentes
gh run list --limit 5

# Ver detalhes de uma run específica
gh run view <run_id>

# Ver logs completos
gh run view <run_id> --log

# Ver logs de um job específico
gh run view <run_id> --log --job <job_id>
```

### 4. Categorizar o Erro

| Tipo de Erro | Sintomas | Ação |
|--------------|----------|------|
| **Build** | `npm run build` falhou | Verificar TypeScript, imports |
| **Lint** | ESLint errors | Rodar `npm run lint --fix` |
| **Testes** | Jest/Vitest failed | Verificar teste específico |
| **Types** | TypeScript errors | Corrigir tipos |
| **Deps** | Module not found | Verificar package.json |

### 5. Reproduzir Localmente

```bash
# Rodar os mesmos comandos do CI
npm ci
npm run build
npm run lint
npm run test
npm run typecheck
```

### 6. Corrigir e Verificar

1. Identificar arquivo/linha do erro
2. Aplicar correção
3. Testar localmente
4. Commitar com mensagem clara

```bash
git add <arquivos>
git commit -m "fix: corrigir erro de build/lint/teste

Resolve falha no CI: [descrição breve]"
```

### 7. Verificar Novo Status

```bash
# Push e aguardar checks
git push

# Monitorar status
gh pr checks --watch
```

---

## Erros Comuns no OMBUDS

### Build Errors

```bash
# TypeScript não compila
npm run build

# Erro típico:
# Type 'X' is not assignable to type 'Y'
```

**Solução**: Verificar tipos, imports, e inferências.

### Lint Errors

```bash
# ESLint encontrou problemas
npm run lint

# Corrigir automaticamente
npm run lint --fix
```

**Erros comuns**:
- `'variable' is defined but never used`
- `Missing return type`
- `Unexpected any`

### Type Errors

```bash
# Verificar tipos sem build
npx tsc --noEmit
```

**Erros comuns**:
- Props incorretas em componentes
- Tipos de retorno incompatíveis
- Imports de tipos faltando

### Dependências

```bash
# Limpar e reinstalar
rm -rf node_modules package-lock.json
npm install
```

---

## Scripts de Diagnóstico

### Verificação Rápida

```bash
# Rodar tudo que o CI roda
npm ci && npm run build && npm run lint && npm run typecheck
```

### Encontrar Arquivos com Problema

```bash
# Buscar erros de tipo em arquivo específico
npx tsc --noEmit 2>&1 | grep "error TS"

# Buscar problemas de lint
npx eslint src/ --format compact
```

### Comparar com Main

```bash
# Ver diferenças que podem ter causado o erro
git diff main...HEAD --name-only

# Ver mudanças em arquivo específico
git diff main...HEAD -- src/path/to/file.tsx
```

---

## Fluxo de Debug Estruturado

```
1. IDENTIFICAR
   └── gh pr checks
   └── gh run view <id> --log

2. CATEGORIZAR
   └── Build? Lint? Test? Types?

3. REPRODUZIR
   └── npm run build (ou comando específico)

4. LOCALIZAR
   └── Qual arquivo? Qual linha?

5. CORRIGIR
   └── Aplicar fix

6. VERIFICAR
   └── Rodar comando localmente

7. COMMITAR
   └── git commit -m "fix: ..."

8. CONFIRMAR
   └── gh pr checks --watch
```

---

## Integração com Outras Skills

| Situação | Skill |
|----------|-------|
| Após corrigir | `/commit` para commitar |
| Código complexo | `/code-review` para revisar |
| Muitos erros | `/debug` para investigar |
| Pronto para merge | `/pr-review` |

---

## Comandos Rápidos

| Comando | Descrição |
|---------|-----------|
| `CI falhou` | Inicia diagnóstico |
| `ver logs do CI` | Mostra logs do GitHub Actions |
| `por que o build quebrou` | Analisa erro específico |
| `corrigir lint` | Roda lint --fix |

---

## Troubleshooting

### Erro: "Resource not accessible by integration"

```bash
# Verificar permissões do token
gh auth status

# Re-autenticar com escopos corretos
gh auth login --scopes repo,workflow
```

### Erro: Cache do CI

```bash
# Às vezes o cache está desatualizado
# Verificar se .github/workflows usa cache

# Forçar rebuild sem cache (via UI do GitHub)
# Actions → Run workflow → "Re-run all jobs"
```

### Erro: Versão do Node

```bash
# Verificar versão local vs CI
node --version

# Garantir que está usando mesma versão
# Ver .nvmrc ou .node-version se existir
```
