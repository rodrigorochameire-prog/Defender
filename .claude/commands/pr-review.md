# /pr-review - Revisão de Pull Request

> **Tipo**: Workflow Especializado
> **Fonte**: GitHub Address Comments (Tech Leads Club)
> **Execução**: "revisar PR", "address comments", "ver comentários do PR"

## Descrição

Buscar e endereçar comentários de revisão no PR aberto da branch atual usando GitHub CLI.

---

## Pré-requisitos

```bash
# Verificar autenticação
gh auth status

# Se não autenticado
gh auth login
```

---

## Workflow

### 1. Identificar PR Atual

```bash
# Listar PR da branch atual
gh pr list --head $(git branch --show-current)

# Ver detalhes do PR
gh pr view --json number,title,state,reviews,comments
```

### 2. Listar Comentários de Revisão

```bash
# Ver todos os comentários
gh pr view --comments

# Ver reviews com status
gh api repos/{owner}/{repo}/pulls/{number}/reviews
```

### 3. Categorizar Comentários

Após listar os comentários, organize-os:

```markdown
## Comentários do PR #123

### Mudanças Solicitadas (Blocking)

1. **[Arquivo: src/app/page.tsx:42]**
   > "Precisa adicionar tratamento de erro aqui"
   - **Ação:** Adicionar try/catch

2. **[Arquivo: src/lib/db.ts:15]**
   > "Query pode causar N+1"
   - **Ação:** Usar include/with para eager loading

### Sugestões (Non-blocking)

3. **[Arquivo: src/components/button.tsx:8]**
   > "Poderia extrair esse estilo para uma variante"
   - **Ação:** Considerar para refatoração futura

### Perguntas/Discussão

4. **[Geral]**
   > "Por que escolheu essa abordagem?"
   - **Ação:** Responder explicando a decisão
```

### 4. Perguntar ao Usuário

```
Encontrei X comentários no PR:

1. [BLOCKING] Adicionar tratamento de erro (page.tsx:42)
2. [BLOCKING] Corrigir N+1 query (db.ts:15)
3. [SUGESTÃO] Extrair estilo para variante (button.tsx:8)
4. [PERGUNTA] Explicar escolha de abordagem

Quais comentários devo endereçar? (ex: 1,2 ou "todos")
```

### 5. Aplicar Correções

Para cada comentário selecionado:

1. Ler o arquivo mencionado
2. Entender o contexto
3. Aplicar a correção
4. Testar localmente
5. Commitar com referência ao comentário

```bash
# Commit referenciando o comentário
git commit -m "fix: adicionar tratamento de erro

Endereça comentário de revisão no PR #123"
```

### 6. Responder aos Comentários

```bash
# Responder a um comentário específico
gh pr comment --body "Corrigido no commit abc1234"

# Ou via API para threads específicas
gh api repos/{owner}/{repo}/pulls/{number}/comments/{comment_id}/replies \
  -f body="Implementado conforme sugerido!"
```

---

## Comandos Úteis

```bash
# Ver diff do PR
gh pr diff

# Ver checks/CI status
gh pr checks

# Ver arquivos alterados
gh pr view --json files

# Aprovar PR (após correções)
gh pr review --approve

# Solicitar mudanças
gh pr review --request-changes --body "Precisa corrigir X"

# Merge do PR
gh pr merge --squash --delete-branch
```

---

## Boas Práticas

### Ao Endereçar Comentários

1. **Um commit por comentário** - Facilita rastrear mudanças
2. **Referência clara** - Mencionar o comentário no commit
3. **Testar antes de push** - Verificar se não quebrou nada
4. **Responder sempre** - Mesmo que seja "Feito!"

### Ao Responder

```markdown
# ✅ BOM
"Corrigido! Adicionei try/catch e tratamento específico para erros de DB"

# ❌ RUIM
"ok"
"feito"
```

### Quando Discordar

```markdown
# ✅ BOM
"Entendo a preocupação, mas optei por essa abordagem porque:
1. [Razão técnica]
2. [Trade-off considerado]

Se preferir, posso mudar para X. O que acha?"

# ❌ RUIM
"Não concordo"
"Assim está bom"
```

---

## Integração com CI

```bash
# Verificar se CI passou após correções
gh pr checks --watch

# Re-rodar checks específicos
gh workflow run ci.yml
```

---

## Troubleshooting

### Rate Limit

```bash
# Verificar limite
gh api rate_limit

# Se atingido, esperar ou re-autenticar
gh auth refresh
```

### Permissões

```bash
# Se erro de permissão
gh auth login --scopes repo,workflow
```
