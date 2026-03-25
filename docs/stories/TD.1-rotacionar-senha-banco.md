# Story TD.1: Rotacionar Senha do Banco e Limpar Historico Git

## Status: Draft

## Descricao

Como defensor publico responsavel pelo OMBUDS, eu quero que a senha do banco de dados seja rotacionada e o historico git seja limpo de credenciais expostas, para que nenhuma pessoa com acesso ao repositorio consiga obter acesso direto ao banco de dados de producao.

## Contexto

O Brownfield Discovery identificou que a senha do banco de dados (`[REDACTED]`) esta em plaintext em 8+ arquivos commitados no repositorio (DB-014). Este e o achado mais critico de toda a auditoria — qualquer pessoa com acesso ao repo (atual ou futuro) pode acessar o banco de producao diretamente, expondo dados sensiveis de assistidos (PII protegida pela LGPD).

**Severidade:** CRITICAL
**Debito:** DB-014

## Criterios de Aceitacao

- [ ] Senha do banco de producao rotacionada no painel Supabase
- [ ] Nova senha armazenada EXCLUSIVAMENTE em variaveis de ambiente (Vercel + Railway)
- [ ] Nenhuma senha ou credencial em plaintext em QUALQUER arquivo do repositorio
- [ ] Historico git limpo com BFG Repo-Cleaner — commits antigos nao contem a senha
- [ ] Aplicacao (Next.js + FastAPI) funciona normalmente apos rotacao
- [ ] Documentacao de como rotacionar credenciais no futuro (runbook)

## Tarefas Tecnicas

- [ ] 1. Gerar nova senha forte para o banco (32+ caracteres, alfanumerica + especiais)
- [ ] 2. Rotacionar a senha no painel Supabase (Database Settings)
- [ ] 3. Atualizar a variavel de ambiente `DATABASE_URL` no Vercel
- [ ] 4. Atualizar a variavel de ambiente `DATABASE_URL` no Railway (enrichment engine)
- [ ] 5. Buscar TODOS os arquivos com a senha antiga e substituir por referencia a env var
- [ ] 6. Verificar que `.env` e `.env.local` estao no `.gitignore`
- [ ] 7. Executar BFG Repo-Cleaner para remover a senha do historico git
- [ ] 8. Force push do repositorio limpo (coordenar com @devops)
- [ ] 9. Invalidar caches de CI/CD que possam ter a senha antiga
- [ ] 10. Testar conexao da aplicacao com a nova senha (Next.js + FastAPI)
- [ ] 11. Criar runbook em `docs/runbooks/credential-rotation.md`

## File List

- `scripts/*.sh` — remover credenciais hardcoded
- `docs/*.md` — remover credenciais de documentacao
- `.env.example` — atualizar com placeholders
- `.gitignore` — garantir que `.env*` esta listado
- `docs/runbooks/credential-rotation.md` — novo (runbook)

## Estimativa

2-4 horas

## Dependencias

- Nenhuma — esta e a primeira story a ser executada, IMEDIATAMENTE
- Requer acesso ao painel Supabase (admin)
- Requer acesso ao painel Vercel (env vars)
- Requer acesso ao painel Railway (env vars)
- Force push requer coordenacao com @devops

## Notas

- **URGENCIA MAXIMA**: Esta story deve ser executada ANTES de qualquer outra. A senha exposta e um risco ativo.
- Apos o force push, todos os colaboradores (se houver) precisam re-clonar o repositorio.
- O BFG Repo-Cleaner e preferivel ao `git filter-branch` por ser mais rapido e seguro.
- Comando BFG sugerido: `bfg --replace-text passwords.txt` onde `passwords.txt` contem a senha a ser removida.
- Verificar tambem se a senha aparece em backups, logs ou servicos de CI.
