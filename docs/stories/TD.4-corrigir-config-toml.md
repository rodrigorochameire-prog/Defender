# Story TD.4: Corrigir supabase/config.toml para Projeto Correto

## Status: Draft

## Descricao

Como desenvolvedor do OMBUDS, eu quero que o arquivo `supabase/config.toml` aponte para o projeto OMBUDS correto, para que comandos do Supabase CLI (migrations, seed, db push) operem no projeto certo e nao em um projeto externo.

## Contexto

O arquivo `supabase/config.toml` esta configurado com o `project_id` de outro projeto ("tetecare") em vez do projeto OMBUDS (DB-019). Isso significa que qualquer operacao do Supabase CLI (como `supabase db push`, `supabase migration apply`) pode ser direcionada ao projeto errado, causando corrupcao de dados ou falha silenciosa. E um debito simples mas com potencial de causar danos graves se nao corrigido.

**Severidade:** MEDIUM (mas correcao trivial — incluida na Wave 1)
**Debito:** DB-019

## Criterios de Aceitacao

- [ ] `supabase/config.toml` contem o `project_id` correto do projeto OMBUDS
- [ ] Nenhuma outra referencia ao projeto "tetecare" existe no repositorio
- [ ] `supabase status` (se executavel localmente) retorna informacoes do projeto correto
- [ ] Demais configuracoes no `config.toml` estao coerentes (nome do projeto, region, etc.)

## Tarefas Tecnicas

- [ ] 1. Abrir `supabase/config.toml` e identificar o `project_id` atual
- [ ] 2. Obter o `project_id` correto do painel Supabase (Project Settings > General)
- [ ] 3. Substituir o `project_id` no `config.toml`
- [ ] 4. Verificar se ha outras configuracoes incorretas (nome, region, etc.)
- [ ] 5. Buscar no repositorio por outras referencias ao projeto "tetecare" e corrigir
- [ ] 6. Testar `supabase status` ou equivalente para confirmar apontamento correto

## File List

- `supabase/config.toml` — corrigir `project_id` e configuracoes associadas

## Estimativa

0.5 hora (30 minutos)

## Dependencias

- Nenhuma dependencia tecnica
- Requer conhecimento do `project_id` correto (disponivel no painel Supabase)

## Notas

- Correcao trivial mas importante — impede erros acidentais com o Supabase CLI.
- Aproveitar para revisar todo o conteudo do `config.toml` e garantir consistencia.
- Se o arquivo contiver outras configuracoes de projeto (como linked project), verificar tambem.
