# TucoCare Pro

Sistema completo de gerenciamento de creche para pets com calendário avançado.

## Erro de Migração? Leia Isto Primeiro

Se você está vendo o erro `Duplicate column name 'linkedResourceType'`:

```bash
# Para Docker
docker-compose build --no-cache
docker-compose up

# Para desenvolvimento local
npm run db:migrate
npm run build
npm start
```

Veja [QUICK_FIX.md](./QUICK_FIX.md) para mais detalhes.

## Novidades

### Calendário com Eventos Multi-Dias

O calendário agora suporta eventos que duram vários dias:

- Crie eventos com data de início e término
- Eventos aparecem em todos os dias da duração
- Validação automática de datas
- Similar ao Google Calendar

### Migrações Seguras

Novos comandos para aplicar migrações sem erros:

```bash
# Recomendado: aplica migrações com verificações
npm run db:migrate

# Script completo com geração segura
npm run db:migrate:safe
```

## Início Rápido

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Banco de Dados

```bash
# Crie o arquivo .env com as credenciais do MySQL
cp .env.example .env

# Crie o banco de dados
mysql -u root -p
CREATE DATABASE tuco_care CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
exit
```

### 3. Aplicar Migrações

```bash
# Use o script seguro (recomendado)
npm run db:migrate:safe
```

### 4. Build e Start

```bash
npm run build
npm start
```

## Comandos Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia servidor de desenvolvimento |
| `npm run build` | Compila o projeto para produção |
| `npm start` | Inicia servidor em produção |
| `npm run db:migrate` | Aplica migrações com verificações |
| `npm run db:migrate:safe` | Script completo de migração segura |
| `npm test` | Executa testes |

## Problemas Comuns

### Erro: "Duplicate column name"

```bash
# Solução rápida
npm run db:migrate
```

Para mais detalhes, consulte [QUICK_FIX.md](./QUICK_FIX.md)

## Documentação

- [QUICK_FIX.md](./QUICK_FIX.md) - Correção rápida para erros de migração
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Guia completo de migrações
- [CALENDAR_IMPROVEMENTS.md](./CALENDAR_IMPROVEMENTS.md) - Detalhes das melhorias

## Funcionalidades

- Gerenciamento de pets
- Calendário avançado com eventos multi-dias
- Sistema de créditos
- Chat integrado
- Notificações WhatsApp
- Relatórios e analytics
- Controle de medicamentos
- Controle de vacinas
- Logs diários
- E muito mais...

## Tecnologias

- React + TypeScript
- Vite
- TailwindCSS
- Drizzle ORM
- MySQL
- Express
- Socket.io
- React Big Calendar

## Estrutura do Projeto

```
tucocare-pro/
├── client/           # Frontend React
├── server/           # Backend Express
├── drizzle/          # Migrações do banco
├── scripts/          # Scripts utilitários
└── docs/             # Documentação
```

## Suporte

Se encontrar problemas:

1. Verifique a documentação em `MIGRATION_GUIDE.md`
2. Use `npm run db:migrate` para problemas de banco
3. Consulte os logs de erro
4. Verifique as variáveis de ambiente no `.env`

## Licença

MIT

# Deploy trigger: Sat Dec 27 15:16:24 -03 2025
