# /update-docs - Atualizar Documentação

> **Tipo**: Workflow de Manutenção
> **Trigger**: "documenta isso", "atualiza agents.md", "atualiza a doc"

## Descrição

Manter a documentação do projeto sincronizada com o código.

---

## Arquivos de Documentação

| Arquivo | Conteúdo | Quando Atualizar |
|---------|----------|------------------|
| `CLAUDE.md` | Índice e estrutura | Nova skill, mudança estrutural |
| `.claude/RULES.md` | Regras de código | Nova convenção, padrão |
| `.claude/AGENTS.md` | Arquitetura, entidades | Novo módulo, mudança de schema |
| `.claude/commands/*.md` | Skills | Nova skill, mudança de workflow |

---

## Triggers de Atualização

### Atualizar AGENTS.md quando:

- [ ] Criar nova tabela no schema
- [ ] Adicionar novo módulo/página
- [ ] Mudar relacionamentos entre entidades
- [ ] Alterar status/enums importantes
- [ ] Adicionar nova integração

### Atualizar RULES.md quando:

- [ ] Estabelecer nova convenção de código
- [ ] Mudar padrão de estilo
- [ ] Adicionar regra de segurança
- [ ] Definir nova estrutura de pastas

### Atualizar CLAUDE.md quando:

- [ ] Adicionar nova skill
- [ ] Mudar estrutura de arquivos .claude/
- [ ] Alterar comandos principais

---

## Template de Atualização

### Para Nova Entidade (AGENTS.md)

```markdown
### [Nome da Entidade]

**Tabela:** `nome_tabela`

**Campos principais:**
- `id` - Identificador
- `campo1` - Descrição
- `campo2` - Descrição

**Relacionamentos:**
- Pertence a: [Entidade pai]
- Possui muitos: [Entidades filhas]

**Status/Enums:**
- `STATUS_A` - Descrição
- `STATUS_B` - Descrição
```

### Para Nova Skill (commands/)

```markdown
# /nome-skill - Título Descritivo

> **Tipo**: [Workflow/Regras/Automação]
> **Trigger**: "frase 1", "frase 2"

## Descrição
O que faz.

## Workflow
1. Passo 1
2. Passo 2

## Comandos
| Comando | Ação |
|---------|------|
| ... | ... |
```

---

## Processo de Atualização

### 1. Identificar Mudanças

```bash
# Ver commits recentes
git log --oneline -10

# Ver arquivos modificados
git diff --name-only HEAD~5
```

### 2. Verificar Impacto

- Mudança afeta schema? → AGENTS.md
- Mudança afeta convenções? → RULES.md
- Nova skill? → commands/ + CLAUDE.md

### 3. Fazer Atualização

- Manter formato consistente
- Usar português
- Ser conciso mas completo
- Incluir exemplos quando útil

### 4. Commitar Documentação

```bash
git add .claude/ CLAUDE.md
git commit -m "docs: atualizar documentação

- Adicionar [nova entidade/skill]
- Atualizar [seção modificada]

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Checklist de Documentação

Antes de finalizar trabalho:

- [ ] AGENTS.md reflete estado atual do schema?
- [ ] RULES.md tem todas as convenções usadas?
- [ ] Skills novas estão documentadas?
- [ ] CLAUDE.md lista todas as skills?
- [ ] Exemplos de código estão corretos?

---

## Sincronização com Código

### Verificar Consistência

```bash
# Listar tabelas no schema
grep -n "pgTable" src/lib/db/schema.ts

# Comparar com documentação
grep -n "Tabela:" .claude/AGENTS.md
```

### Verificar Skills

```bash
# Listar arquivos de skill
ls -la .claude/commands/

# Comparar com CLAUDE.md
grep "commands/" CLAUDE.md
```

---

## Anti-Padrões

❌ **Não fazer:**
- Documentar features não implementadas
- Deixar exemplos desatualizados
- Duplicar informação em múltiplos lugares
- Documentar detalhes de implementação que mudam frequentemente

✅ **Fazer:**
- Documentar decisões arquiteturais
- Manter exemplos funcionais
- Focar em "o quê" e "por quê", não "como"
- Atualizar junto com o código
