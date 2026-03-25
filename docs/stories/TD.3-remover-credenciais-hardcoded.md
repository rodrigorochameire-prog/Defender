# Story TD.3: Remover Credenciais Hardcoded do Client Supabase

## Status: Draft

## Descricao

Como desenvolvedor do OMBUDS, eu quero que as credenciais do Supabase (URL e anon key) sejam lidas exclusivamente de variaveis de ambiente, para que seja possivel rotacionar credenciais sem precisar alterar codigo e fazer deploy.

## Contexto

As credenciais do Supabase (URL do projeto e anon key) estao hardcoded no codigo-fonte do client Supabase (DB-004). Isso impede rotacao de chaves sem alteracao de codigo, expoe credenciais a qualquer pessoa com acesso ao repositorio, e viola o principio de separacao entre configuracao e codigo. Combinado com DB-014 (senha no repo), forma uma cadeia de seguranca critica.

**Severidade:** CRITICAL
**Debito:** DB-004

## Criterios de Aceitacao

- [ ] Nenhuma credencial Supabase (URL, anon key, service role key) hardcoded em arquivos `.ts`/`.tsx`/`.js`
- [ ] Client Supabase le credenciais de `process.env.NEXT_PUBLIC_SUPABASE_URL` e `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Aplicacao falha com erro claro e descritivo se variaveis de ambiente estiverem ausentes (fail hard)
- [ ] `.env.example` atualizado com todas as variaveis necessarias e valores placeholder
- [ ] Aplicacao funciona normalmente em dev (`.env.local`) e producao (Vercel env vars)

## Tarefas Tecnicas

- [ ] 1. Localizar TODOS os arquivos com credenciais Supabase hardcoded (`grep` por URL do projeto e anon key)
- [ ] 2. Substituir valores hardcoded por leitura de `process.env`
- [ ] 3. Adicionar validacao de env vars no ponto de inicializacao do client — throw Error se ausentes
- [ ] 4. Atualizar `.env.example` com placeholders descritivos
- [ ] 5. Verificar que `.env.local` esta no `.gitignore`
- [ ] 6. Verificar variaveis de ambiente no Vercel (ja configuradas ou precisam ser adicionadas)
- [ ] 7. Testar aplicacao em ambiente local
- [ ] 8. Testar build (`npm run build`) — confirmar que nao ha imports quebrados

## File List

- `src/lib/supabase/client.ts` (ou equivalente) — remover hardcoded, ler de env
- `src/lib/supabase/server.ts` (se existir) — idem
- `.env.example` — atualizar com placeholders
- Qualquer outro arquivo com credenciais Supabase hardcoded

## Estimativa

2 horas

## Dependencias

- TD.1 (rotacao de senha) deve ser feita primeiro — a rotacao de senha pode afetar a connection string
- Variaveis de ambiente devem estar configuradas no Vercel antes do deploy

## Notas

- A anon key do Supabase e "publica" por design (exposta no client), mas ainda assim deve vir de env vars para permitir rotacao e separar ambientes (dev/staging/prod).
- A service role key NUNCA deve ser exposta no client-side — verificar que so e usada em server-side.
- Padrao recomendado para validacao:
  ```typescript
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL is required');
  ```
