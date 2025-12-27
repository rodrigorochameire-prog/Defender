# 📋 INSTRUÇÕES PARA EXECUTAR POLÍTICAS RLS

## 🎯 PROBLEMA RESOLVIDO

O agente do Supabase não tem permissões de **owner** para criar políticas RLS na tabela `storage.objects`. 

**Solução**: Execute o script diretamente no SQL Editor do Supabase (onde você tem permissões de owner).

---

## ✅ PASSO A PASSO

### 1. Acessar SQL Editor do Supabase

1. Acesse https://supabase.com/dashboard
2. Selecione seu projeto
3. No menu lateral, clique em **"SQL Editor"**
4. Clique em **"New Query"**

### 2. Executar o Script

1. Abra o arquivo **`SQL_RLS_FINAL_COMPLETO.sql`** neste repositório
2. **Copie TODO o conteúdo** do arquivo
3. **Cole no SQL Editor** do Supabase
4. Clique em **"RUN"** (⚡) ou pressione `Ctrl+Enter` (Windows/Linux) ou `Cmd+Enter` (Mac)
5. Aguarde a execução (pode levar 1-2 minutos)

### 3. Verificar Execução

Após executar, você deve ver a mensagem: **"Success. No rows returned"**

### 4. Validar Políticas Criadas

Execute esta query no SQL Editor para verificar:

```sql
SELECT policyname, cmd, qual
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
ORDER BY policyname;
```

**Resultado esperado**: 48 políticas listadas (12 buckets × 4 operações cada)

---

## 📊 O QUE O SCRIPT FAZ

### Passo 1: Remove Funções Existentes
- `DROP FUNCTION` de todas as funções auxiliares (com CASCADE)

### Passo 2: Cria Funções Auxiliares
- `is_tutor_of_pet()` - Verifica se usuário é tutor de um pet
- `extract_pet_id_from_path()` - Extrai petId do caminho do arquivo
- `is_admin()` - Verifica se usuário é admin
- `extract_tutor_id_from_path()` - Extrai tutorId do caminho

### Passo 3: Habilita RLS
- `ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY`

### Passo 4: Remove Políticas Antigas
- Remove todas as políticas antigas relacionadas aos buckets

### Passo 5: Cria 48 Políticas RLS
- 9 buckets privados × 4 operações = 36 políticas
- 3 buckets públicos × 4 operações = 12 políticas

---

## 🔍 ESTRUTURA DAS POLÍTICAS

### Buckets Privados (acesso apenas aos tutores do pet + admins):
- pets
- daycare-photos
- documents
- financial
- reports
- products
- health-logs
- tutors (próprio tutor + admins)
- staff (próprio colaborador + admins)

### Buckets Públicos:
- wall (autenticados)
- partnerships (público)
- marketing (público)

---

## ⚠️ IMPORTANTE

- **Execute o script completo de uma vez** (ou em blocos se preferir)
- **Não interrompa a execução** no meio
- **Verifique se todas as políticas foram criadas** após a execução
- Se houver erro, verifique:
  - Nomes das colunas (`petId` vs `pet_id`)
  - Tipo de `auth_id` (uuid vs text)
  - Estrutura da tabela `pet_tutors`

---

## 🆘 TROUBLESHOOTING

### Erro: "column does not exist"
- Verifique se as colunas na tabela `pet_tutors` são `petId`/`tutorId` ou `pet_id`/`tutor_id`
- Ajuste o script conforme necessário

### Erro: "function does not exist"
- As funções devem ser criadas antes das políticas
- Execute o script na ordem correta

### Políticas não aparecem
- Verifique se RLS está habilitado: `SELECT * FROM pg_tables WHERE tablename = 'objects' AND rowsecurity = true;`
- Verifique permissões: você precisa ser owner da tabela

---

## ✅ CHECKLIST FINAL

Após executar o script:

- [ ] Todas as 4 funções foram criadas
- [ ] RLS está habilitado em `storage.objects`
- [ ] 48 políticas foram criadas
- [ ] Query de validação retorna 48 linhas
- [ ] Nenhum erro na execução

---

## 📝 PRÓXIMOS PASSOS

Após aplicar as políticas RLS:

1. **Testar acesso** com usuários de teste
2. **Verificar estrutura de pastas** no código (deve ser `{bucket}/{petId}/...`)
3. **Testar upload/download** de arquivos
4. **Validar que tutores só veem seus pets**

---

**Pronto!** O script está completo e pronto para execução. 🚀


