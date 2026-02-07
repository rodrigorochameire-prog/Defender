# /db-migrate - Skill para Migrações de Banco

> **Tipo**: Workflow Especializado
> **Execução**: No contexto principal

## Descrição
Gerencia migrações do banco de dados PostgreSQL com Drizzle ORM.

## Comandos Principais

### Gerar Migration
```bash
npm run db:generate
```
Analisa mudanças no schema e gera arquivos de migration.

### Aplicar Migration
```bash
npm run db:push
```
Aplica as migrations pendentes no banco.

### Abrir Studio
```bash
npm run db:studio
```
Interface visual para explorar o banco.

## Fluxo de Criação de Tabela

### 1. Adicionar ao Schema
```typescript
// src/lib/db/schema.ts

export const novaTabelaEnum = pgEnum("nova_tabela_status", [
  "ativo",
  "inativo",
]);

export const novaTabela = pgTable("nova_tabela", {
  // Campos obrigatórios
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
  deletedAt: timestamp("deleted_at"),

  // Campos específicos
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  status: novaTabelaEnum("status").default("ativo"),

  // Relacionamentos
  casoId: integer("caso_id").references(() => casos.id),
  assistidoId: integer("assistido_id").references(() => assistidos.id),
});

// Relacionamentos (Drizzle relations)
export const novaTabelaRelations = relations(novaTabela, ({ one }) => ({
  caso: one(casos, {
    fields: [novaTabela.casoId],
    references: [casos.id],
  }),
  assistido: one(assistidos, {
    fields: [novaTabela.assistidoId],
    references: [assistidos.id],
  }),
}));
```

### 2. Gerar Migration
```bash
npm run db:generate
```

### 3. Verificar Migration Gerada
```bash
ls -la drizzle/
cat drizzle/XXXX_migration.sql
```

### 4. Aplicar Migration
```bash
npm run db:push
```

### 5. Verificar no Studio
```bash
npm run db:studio
```

## Tipos de Dados Comuns

| Tipo | Drizzle | Uso |
|------|---------|-----|
| ID | `serial("id").primaryKey()` | Chave primária |
| Texto | `text("campo")` | Strings longas |
| Varchar | `varchar("campo", { length: 255 })` | Strings curtas |
| Inteiro | `integer("campo")` | Números inteiros |
| Decimal | `numeric("campo", { precision: 10, scale: 2 })` | Valores monetários |
| Boolean | `boolean("campo")` | True/false |
| Data | `date("campo")` | Apenas data |
| Timestamp | `timestamp("campo")` | Data + hora |
| JSON | `jsonb("campo")` | Objetos JSON |
| Enum | `pgEnum` + campo | Valores fixos |

## Padrões Obrigatórios

### Campos Padrão (SEMPRE incluir)
```typescript
id: serial("id").primaryKey(),
createdAt: timestamp("created_at").defaultNow().notNull(),
updatedAt: timestamp("updated_at"),
deletedAt: timestamp("deleted_at"),  // Soft delete
```

### Naming Conventions
- Tabelas: `snake_case` (plural)
- Colunas: `snake_case`
- Enums: `tabela_campo` (ex: `demanda_status`)
- FK: `tabela_id` (ex: `caso_id`)

### Índices
```typescript
// Criar índices para campos frequentemente filtrados
export const novaTabelaIdx = index("nova_tabela_status_idx")
  .on(novaTabela.status);

export const novaTabelaCasoIdx = index("nova_tabela_caso_id_idx")
  .on(novaTabela.casoId);
```

## Troubleshooting

### Erro de Conflito
```bash
# Resetar migrations (CUIDADO - ambiente dev apenas)
rm -rf drizzle/
npm run db:generate
npm run db:push
```

### Verificar Conexão
```bash
# Testar conexão com o banco
npx drizzle-kit check
```

### Rollback Manual
```sql
-- Executar no psql/studio
DROP TABLE IF EXISTS nova_tabela;
DROP TYPE IF EXISTS nova_tabela_status;
```

## Restrições

- **NUNCA** fazer DROP em produção sem backup
- **NUNCA** modificar migrations já aplicadas
- **SEMPRE** testar em ambiente local primeiro
- **SEMPRE** fazer backup antes de migrations grandes
