# /commit - Skill de Commit Automatizado

> **Tipo**: Workflow Especializado
> **Execução**: No contexto principal (sem delegação)

## Descrição
Cria commits padronizados seguindo as convenções do projeto OMBUDS.

## Instruções

### 1. Verificar Status
```bash
git status
git diff --stat HEAD
```

### 2. Analisar Mudanças
- Identificar arquivos modificados
- Categorizar por tipo de mudança
- Determinar escopo (feature, componente, página)

### 3. Formato do Commit
```
<tipo>(<escopo>): <descrição>

[corpo opcional - máx 72 chars por linha]

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

### 4. Tipos Permitidos
| Tipo | Uso |
|------|-----|
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `style` | Mudanças visuais/CSS |
| `refactor` | Refatoração de código |
| `docs` | Documentação |
| `chore` | Manutenção |
| `perf` | Performance |
| `test` | Testes |

### 5. Exemplos
```bash
feat(juri): adicionar cálculo automático de prazos
fix(agenda): corrigir edição de eventos do calendário
style(dashboard): padronizar stats cards ao padrão Defender
refactor(demandas): extrair lógica de filtros para hook
docs: atualizar AGENTS.md com nova arquitetura
```

### 6. Executar Commit
```bash
git add <arquivos específicos>
git commit -m "$(cat <<'EOF'
<tipo>(<escopo>): <descrição>

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

### 7. Verificar e Push (se solicitado)
```bash
git log --oneline -1
git push origin <branch>
```

## Restrições
- NUNCA usar `git add .` ou `git add -A`
- NUNCA fazer commit de arquivos sensíveis (.env, credenciais)
- NUNCA usar --force em push
- SEMPRE verificar build antes de push importante
