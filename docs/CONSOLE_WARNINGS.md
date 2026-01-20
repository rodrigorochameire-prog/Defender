# Avisos do Console - Explicação

## Visão Geral

Este documento explica os avisos e mensagens que podem aparecer no console do navegador durante o desenvolvimento.

## Erros de Banco de Dados

### Erro: "column workspace_id does not exist"

```
column "workspace_id" does not exist
```

**Causa:** A migration de workspaces não foi aplicada ao banco de dados.

**Solução:** Execute a migration `20260120_fix_workspace_columns.sql` no SQL Editor do Supabase:

1. Acesse o painel do Supabase
2. Vá para **SQL Editor**
3. Copie e cole o conteúdo de `supabase/migrations/20260120_fix_workspace_columns.sql`
4. Execute o script

Alternativamente, execute todas as migrations pendentes:

```bash
# Via script local (requer DATABASE_URL configurada)
node scripts/run-migration.mjs
```

## Avisos CSS (Firefox)

Os seguintes avisos CSS são **normais e inofensivos**:

### Propriedades com Prefixos Vendor

```
Propriedade desconhecida '-moz-text-align-last'. Declaração descartada.
Propriedade desconhecida '-moz-column-gap'. Declaração descartada.
Propriedade desconhecida '-moz-columns'. Declaração descartada.
```

**Explicação:** Esses avisos aparecem porque o `autoprefixer` (configurado no `postcss.config.js`) adiciona automaticamente prefixos vendor para garantir compatibilidade entre navegadores. O Firefox pode não reconhecer algumas propriedades com prefixo `-webkit-*` ou vice-versa.

**Ação necessária:** Nenhuma. É comportamento esperado.

### Propriedades de Impressão

```
Propriedade desconhecida 'widows'. Declaração descartada.
Propriedade desconhecida 'orphans'. Declaração descartada.
```

**Explicação:** Essas são propriedades CSS para controle de paginação em impressão/PDF. Alguns navegadores não suportam completamente.

**Ação necessária:** Nenhuma. Não afeta a renderização web.

### Pseudo-classes Específicas

```
Pseudo-classe ou pseudo-elemento '-moz-focus-inner' desconhecido.
```

**Explicação:** CSS de reset/normalização pode incluir seletores específicos de navegadores.

**Ação necessária:** Nenhuma.

### Erros de Parsing

```
Erro ao analisar o valor de 'text-size-adjust'. Declaração descartada.
Erro ao analisar o valor de 'font-feature-settings'. Declaração descartada.
```

**Explicação:** Algumas propriedades CSS experimentais ou valores específicos podem não ser reconhecidos por todos os navegadores.

**Ação necessária:** Nenhuma. O navegador ignora e continua funcionando.

## Aviso do Clerk

```
Clerk has been loaded with development keys.
```

**Explicação:** Normal em ambiente de desenvolvimento. O Clerk usa chaves diferentes para desenvolvimento e produção.

**Ação necessária:** Em produção, use as chaves de produção do Clerk configuradas em `.env.production`.

## Aviso de Cookie Cloudflare

```
O cookie "__cf_bm" será rejeitado em breve por ser estrangeiro e não ter o atributo "Partitioned".
```

**Explicação:** Este é um cookie de segurança do Cloudflare (usado pelo Clerk). O aviso é sobre futuras políticas de cookies de terceiros.

**Ação necessária:** Nenhuma ação do desenvolvedor é necessária. O Cloudflare/Clerk atualizará quando necessário.

## Origem dos Avisos CSS

Os avisos CSS geralmente vêm de:

1. **Google Fonts (Inter/Inter_Tight)** - CSS otimizado para performance
2. **Clerk SDK** - Estilos do componente de autenticação
3. **Tailwind CSS + Autoprefixer** - Prefixos para compatibilidade
4. **Bibliotecas Radix UI** - Componentes com estilos inline

## Resumo

| Tipo de Aviso | Severidade | Ação |
|---------------|------------|------|
| Prefixos vendor obsoletos | Baixa | Ignorar |
| Propriedades de impressão | Baixa | Ignorar |
| Clerk development keys | Info | Normal em dev |
| Cookie Cloudflare | Info | Ignorar |

**Todos esses avisos são inofensivos e não afetam o funcionamento da aplicação.**
