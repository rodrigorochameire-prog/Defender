# Correção Rápida - Erro de Coluna Duplicada

## Problema

Você está recebendo este erro:
```
Duplicate column name 'linkedResourceType'
```

## Solução Rápida

Execute este comando:

```bash
npm run db:migrate
```

Ou, se preferir o script completo com mais verificações:

```bash
npm run db:migrate:safe
```

## O que esses comandos fazem?

1. Verificam se as colunas já existem no banco de dados
2. Se existirem, marcam a migração como aplicada (sem tentar criar novamente)
3. Aplicam apenas as migrações necessárias
4. Ignoram erros de coluna duplicada

## Depois da Migração

```bash
npm run build
npm start
```

## Mais Detalhes

Para entender melhor o problema e ver outras soluções, leia o [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md).
