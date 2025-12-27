# 🧪 TESTANDO O SUPABASE - GUIA SIMPLIFICADO

## ❌ O QUE VOCÊ **NÃO PRECISA** FAZER

Você **NÃO precisa** gerar JWT manualmente para testar o sistema básico!

O Supabase gerencia os tokens automaticamente quando você:
- Faz signup (cadastro)
- Faz login
- Usa o componente Auth que criamos

---

## ✅ O QUE VOCÊ **REALMENTE PRECISA** FAZER

### 1. Configurar o Supabase (já feito ou em andamento)

- [x] Criar projeto
- [x] Executar SQL inicial (tabela users)
- [x] Criar buckets de storage
- [x] Configurar Auth
- [x] Copiar credenciais para `.env.local`

### 2. Testar o Sistema (Método Simples)

#### Opção A: Testar via Interface Web (Recomendado)

1. **Iniciar o servidor**:
   ```bash
   pnpm install
   pnpm run dev
   ```

2. **Acessar a aplicação**:
   - Abra http://localhost:3000
   - Você verá o componente de login/cadastro

3. **Criar uma conta de teste**:
   - Clique em "Criar conta"
   - Digite um email (ex: `teste@example.com`)
   - Digite uma senha
   - Clique em "Cadastrar"

4. **Verificar email** (se configurado):
   - O Supabase enviará um email de confirmação
   - Clique no link para confirmar (ou use o modo de desenvolvimento)

5. **Fazer login**:
   - Use o email e senha que você criou
   - O sistema automaticamente:
     - Autentica com Supabase
     - Gera o JWT automaticamente
     - Sincroniza o usuário no banco
     - Redireciona para a aplicação

#### Opção B: Testar via Supabase Dashboard

1. **Criar usuário manualmente**:
   - Vá em **Authentication** → **Users**
   - Clique em **"Add user"** → **"Create new user"**
   - Preencha:
     - Email: `teste@example.com`
     - Password: `senha123`
   - Clique em **"Create user"**

2. **Verificar no banco**:
   - Vá em **Table Editor** → **users**
   - Você deve ver o usuário criado com `auth_id` preenchido

3. **Fazer login na aplicação**:
   - Use o email e senha que você criou
   - O sistema sincronizará automaticamente

---

## 🔍 VERIFICAR SE ESTÁ FUNCIONANDO

### Checklist de Verificação

1. **Banco de Dados**:
   - [ ] Tabela `users` existe (Table Editor)
   - [ ] Pode ver a estrutura da tabela

2. **Authentication**:
   - [ ] Email provider está habilitado
   - [ ] URLs configuradas (localhost:3000)
   - [ ] Pode criar usuário via Dashboard

3. **Storage**:
   - [ ] Bucket `pets` existe e é público
   - [ ] Bucket `documents` existe e é privado

4. **Aplicação**:
   - [ ] Servidor inicia sem erros
   - [ ] Componente Auth aparece na tela
   - [ ] Pode criar conta
   - [ ] Pode fazer login

---

## 🚨 PROBLEMAS COMUNS

### Erro: "Invalid API key"

**Causa**: Credenciais incorretas no `.env.local`

**Solução**:
1. Vá em **Settings** → **API** no Supabase
2. Recopie as chaves:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Verifique se não há espaços extras
4. Reinicie o servidor

### Erro: "Database connection failed"

**Causa**: `DATABASE_URL` incorreta ou senha errada

**Solução**:
1. Vá em **Settings** → **Database** no Supabase
2. Copie a **Connection string** (URI)
3. Substitua `[YOUR-PASSWORD]` pela senha real do banco
4. Atualize no `.env.local`
5. Reinicie o servidor

### Erro: "User not found after sync"

**Causa**: Tabela `users` não existe ou `auth_id` não está sendo salvo

**Solução**:
1. Verifique se executou o script SQL (`supabase-initial-schema.sql`)
2. Verifique se a tabela `users` tem a coluna `auth_id`
3. Verifique os logs do servidor para mais detalhes

### Erro: "Bucket not found"

**Causa**: Buckets não foram criados

**Solução**:
1. Vá em **Storage** no Supabase
2. Crie os buckets `pets` e `documents`
3. Configure `pets` como público
4. Configure `documents` como privado

---

## 💡 QUANDO VOCÊ **REALMENTE** PRECISA GERAR JWT MANUALMENTE?

Você só precisa gerar JWT manualmente se:

1. **Testar APIs diretamente** (curl, Postman, etc.)
2. **Testar RLS Policies** (Row Level Security)
3. **Debug avançado** de autenticação
4. **Integração com serviços externos**

Para o uso normal da aplicação, **NÃO é necessário**!

---

## 🧪 TESTAR API DIRETAMENTE (Opcional)

Se você realmente quiser testar a API diretamente com um token:

### Método 1: Obter Token do Browser (Mais Fácil)

1. Faça login na aplicação (http://localhost:3000)
2. Abra o **DevTools** (F12)
3. Vá em **Application** → **Local Storage**
4. Procure por chaves do Supabase (geralmente começam com `sb-`)
5. Encontre o token de acesso (access_token)
6. Use esse token em suas chamadas:

```bash
curl -H "Authorization: Bearer SEU_TOKEN_AQUI" \
     https://siwapjqndevuwsluncnr.supabase.co/rest/v1/users
```

### Método 2: Usar Supabase Client no Console do Browser

1. Faça login na aplicação
2. Abra o **Console** do DevTools (F12)
3. Execute:

```javascript
// O token está armazenado na sessão do Supabase
const { data: { session } } = await supabase.auth.getSession();
console.log('Token:', session?.access_token);
```

---

## 📝 RESUMO

✅ **FAÇA**:
- Configure o Supabase (projeto, SQL, storage, auth)
- Teste via interface web (signup/login)
- Verifique se usuários aparecem no banco

❌ **NÃO PRECISA**:
- Gerar JWT manualmente
- Usar CLI do Supabase
- Criar Edge Functions
- Fazer login via OTP para testes básicos

---

## 🎯 PRÓXIMOS PASSOS

1. **Configure o Supabase** seguindo `SUPABASE_QUICK_START.md`
2. **Inicie o servidor**: `pnpm run dev`
3. **Teste o login**: Acesse http://localhost:3000
4. **Verifique o banco**: Veja se o usuário foi criado

Se tudo funcionar, você está pronto! 🎉

---

**Dúvidas?** Verifique os logs do servidor ou consulte a documentação do Supabase.


