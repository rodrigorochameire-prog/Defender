# Migração Necessária: Tipos de Medicamento Customizados

## Problema
Ao tentar adicionar medicamentos customizados, você pode ver o erro:
```
Failed query: insert into `medication_library` (`type`, ...) values ('Especial', ...)
```

Isso ocorre porque a coluna `type` da tabela `medication_library` está definida como ENUM, que só aceita valores específicos.

## Solução
Execute a seguinte migration SQL no seu banco de dados MySQL:

```sql
-- Alterar a coluna type de ENUM para VARCHAR
ALTER TABLE medication_library
MODIFY COLUMN type VARCHAR(100) NOT NULL;
```

## Como Aplicar

### Opção 1: Usando MySQL CLI
```bash
mysql -u seu_usuario -p seu_banco_de_dados < drizzle/0049_medication_type_to_varchar.sql
```

### Opção 2: Usando uma ferramenta GUI (phpMyAdmin, MySQL Workbench, etc.)
1. Conecte-se ao seu banco de dados
2. Execute o comando SQL acima
3. Confirme a alteração

### Opção 3: Via código (se tiver acesso direto ao DB)
```javascript
await db.execute(`
  ALTER TABLE medication_library
  MODIFY COLUMN type VARCHAR(100) NOT NULL;
`);
```

## Após a Migração
Depois de executar a migration, os tutores poderão:
- Criar medicamentos com qualquer tipo (não apenas "preventive", "treatment", "supplement")
- Usar tipos como: "Especial", "Antibiótico", "Anti-inflamatório", "Homeopático", etc.
- Medicamentos customizados são salvos na biblioteca para uso futuro

## Verificação
Para verificar se a migração foi aplicada:
```sql
DESCRIBE medication_library;
```

A coluna `type` deve mostrar `varchar(100)` ao invés de `enum(...)`.
