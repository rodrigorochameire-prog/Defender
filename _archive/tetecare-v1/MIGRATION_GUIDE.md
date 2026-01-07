# Guia de Migração do Banco de Dados

## Sobre o Erro de Coluna Duplicada

Se você encontrou o erro `Duplicate column name 'linkedResourceType'`, este guia explica o problema e como resolvê-lo.

### Entendendo o Problema

O erro ocorre porque:
1. A migração `0050_calendar_auto_integration.sql` adiciona as colunas `linkedResourceType`, `linkedResourceId` e `autoCreated`
2. Quando você executa `npm run db:push`, o Drizzle Kit:
   - Gera novas migrações comparando o schema com o banco
   - Se as colunas já existem no banco mas não estão registradas corretamente, tenta criá-las novamente
   - Isso causa o erro "Duplicate column name"

### Solução RECOMENDADA: Use o Script Seguro

Criamos um script especial que verifica o estado do banco antes de aplicar migrações:

```bash
# Opção 1: Script automático completo (RECOMENDADO)
npm run db:migrate:safe

# Opção 2: Apenas aplicar migrações com verificações
npm run db:migrate
```

O script `db:migrate:safe`:
- Verifica se as colunas já existem no banco
- Se existirem, marca a migração como aplicada
- Aplica apenas as migrações necessárias
- Ignora erros de coluna duplicada

### Solução Alternativa 1: Se as Colunas Já Existem

Se você sabe que as colunas já existem no banco:

```bash
# 1. NÃO execute npm run db:push
# 2. Use o script seguro
npm run db:migrate

# 3. Ou apenas faça o build
npm run build
npm start
```

### Solução Alternativa 2: Para Ambiente de Desenvolvimento Limpo

Se você quer resetar completamente (cuidado: apaga todos os dados):

```bash
# 1. Conecte-se ao MySQL e resete o banco
mysql -u seu_usuario -p
DROP DATABASE tuco_care;
CREATE DATABASE tuco_care;
exit

# 2. Aplique todas as migrações do zero
npm run db:migrate:safe

# 3. Build e start
npm run build
npm start
```

### Verificando o Estado do Banco

Para verificar manualmente se as colunas existem:

```sql
USE tuco_care;  -- ou o nome do seu banco
DESCRIBE calendar_events;
```

Você deve ver estas colunas:
- `linkedResourceType` - ENUM
- `linkedResourceId` - INT
- `autoCreated` - BOOLEAN

### Comandos Disponíveis

| Comando | Descrição | Quando Usar |
|---------|-----------|-------------|
| `npm run db:push` | Gera E aplica migrações (pode causar erro) | Evitar se colunas já existem |
| `npm run db:migrate` | Aplica migrações com verificações | Quando tiver dúvida sobre estado do banco |
| `npm run db:migrate:safe` | Script completo com geração segura | SEMPRE usar em produção |

### Estrutura de Migrações

```
drizzle/
  ├── 0049_medication_type_to_varchar.sql
  ├── 0050_calendar_auto_integration.sql    ← Adiciona linkedResource* e autoCreated
  ├── 0051_add_user_to_changed_by_role.sql
  ├── 0052_fix_duplicate_columns.sql        ← Vazia (marcador histórico)
  └── 0053_fix_calendar_state.sql           ← Vazia (marcador histórico)
```

### Notas Importantes

1. **NUNCA execute `drizzle-kit generate` manualmente** - use os scripts npm
2. As migrações 0052 e 0053 são vazias (apenas marcadores no histórico)
3. A migração 0050 é a que realmente adiciona as colunas necessárias
4. Se você mudou o `schema.ts`, use `npm run db:migrate:safe` para aplicar

### Problemas Comuns

#### Erro: "Duplicate column name"

```bash
# Solução
npm run db:migrate
```

#### Erro: "Table doesn't exist"

```bash
# Você precisa criar o banco primeiro
mysql -u root -p
CREATE DATABASE tuco_care CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
exit

npm run db:migrate:safe
```

#### Erro: "Access denied"

Verifique suas credenciais no arquivo `.env`:
```
DB_HOST=localhost
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_NAME=tuco_care
```

### Workflow Recomendado

#### Para Desenvolvimento

```bash
# 1. Clone o repositório
git clone <repo>
cd tucocare-pro

# 2. Configure o .env
cp .env.example .env
# Edite .env com suas credenciais

# 3. Crie o banco
mysql -u root -p
CREATE DATABASE tuco_care CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
exit

# 4. Aplique migrações
npm run db:migrate:safe

# 5. Build e start
npm run build
npm start
```

#### Para Produção

```bash
# 1. Sempre use o script seguro
npm run db:migrate:safe

# 2. Build
npm run build

# 3. Start
npm start
```

### Suporte

Se ainda tiver problemas:

1. Verifique a versão do Node.js (deve ser 18+)
2. Verifique a conexão com MySQL
3. Verifique as permissões do usuário do banco
4. Execute `npm run db:migrate` para ver logs detalhados
5. Consulte os logs de erro completos

### Referências

- [Drizzle ORM Docs](https://orm.drizzle.team)
- [MySQL Documentation](https://dev.mysql.com/doc/)
