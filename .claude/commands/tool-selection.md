---
name: tool-selection
description: Diretrizes para escolha de ferramentas - quando usar CLI/DB vs Browser automation
---

# Seleção de Ferramentas - CLI vs Browser

## Regra de Ouro

> **Para operações de backend/dados, usar CLI, scripts ou acesso direto ao banco é muito mais eficiente que automatizar o browser. O MCP Chrome é melhor para testar UX ou quando realmente precisamos interagir com a interface como usuário.**

## Quando Usar Cada Abordagem

### ✅ CLI / Scripts / Database Direto

Use quando a tarefa envolver:

| Operação | Ferramenta Recomendada |
|----------|----------------------|
| Inserir/atualizar dados | `node -e` com pg, Drizzle, ou SQL direto |
| Configurar variáveis de ambiente | `vercel env add`, `echo >> .env` |
| Deploy | `vercel --prod`, `npm run build` |
| Migrações de banco | `npm run db:push`, `npm run db:migrate` |
| Testar APIs | `curl`, `httpie` |
| Git operations | `git`, `gh` CLI |
| Verificar logs | `vercel logs`, `tail -f` |

**Vantagens:**
- ⚡ 10-50x mais rápido
- 🎯 Resultado determinístico
- 📝 Fácil de reproduzir
- 🔄 Pode ser automatizado

### ✅ MCP Chrome / Browser Automation

Use **apenas** quando precisar:

| Cenário | Justificativa |
|---------|---------------|
| Testar fluxo de usuário (UX) | Ver como usuário real experimenta |
| Verificar UI/layout | Screenshots, responsividade |
| Debugar problemas visuais | Inspecionar elementos, console |
| Autenticação OAuth visual | Fluxos que exigem interação humana |
| Demonstrar funcionalidade | Gravar GIFs, mostrar ao usuário |

**Evitar para:**
- ❌ CRUD de dados
- ❌ Configurações de ambiente
- ❌ Deploy
- ❌ Qualquer coisa que tenha CLI disponível

## Exemplo Prático

### ❌ Ruim: Registrar pasta via browser
```
1. Abrir página (2s)
2. Clicar botão (1s)
3. Preencher form (5s)
4. Clicar submit (1s)
5. Aguardar resposta (5-30s, pode dar timeout)
6. Verificar resultado (2s)
Total: 15-40 segundos + risco de falha
```

### ✅ Bom: Registrar pasta via SQL
```javascript
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query(\`INSERT INTO table VALUES (...)\`);
"
// Total: 1-2 segundos, sempre funciona
```

## Checklist Antes de Usar Browser

Antes de usar MCP Chrome, pergunte-se:

1. [ ] Existe um CLI para isso? (vercel, gh, npm, etc.)
2. [ ] Posso fazer via API/curl?
3. [ ] Posso acessar o banco diretamente?
4. [ ] O usuário precisa VER a interação?

Se respondeu "sim" para 1, 2 ou 3, **não use browser**.
Se respondeu "sim" para 4, **use browser**.

## Conexão Rápida ao Banco

```bash
# Via node (sempre disponível)
node -e "
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'sua-connection-string',
  ssl: { rejectUnauthorized: false }
});
// seu código aqui
"
```

## Referência de CLIs Úteis

| Tarefa | Comando |
|--------|---------|
| Deploy Vercel | `vercel --prod --yes` |
| Env var Vercel | `echo "valor" \| vercel env add NOME production --force` |
| Logs Vercel | `vercel logs --follow` |
| PR GitHub | `gh pr create --title "..." --body "..."` |
| Issues GitHub | `gh issue list`, `gh issue view` |
| Build local | `npm run build` |
| DB Studio | `npm run db:studio` |
