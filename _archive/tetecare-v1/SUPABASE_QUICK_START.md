# ⚡ CONFIGURAÇÃO RÁPIDA DO SUPABASE

Guia rápido passo a passo para configurar o Supabase em 15 minutos.

---

## 🎯 CHECKLIST RÁPIDO

- [ ] Criar projeto no Supabase
- [ ] Executar script SQL inicial
- [ ] Criar buckets de Storage
- [ ] Configurar Authentication
- [ ] Copiar credenciais para `.env.local`

---

## 📝 PASSO A PASSO

### 1️⃣ Criar Projeto (2min)

1. Acesse https://supabase.com/dashboard
2. Clique em **"New Project"**
3. Preencha:
   - **Name**: `tete-house-hub`
   - **Password**: Crie uma senha forte e ANOTE!
   - **Region**: `South America (São Paulo)`
4. Clique em **"Create new project"**
5. Aguarde 2-3 minutos

---

### 2️⃣ Executar SQL (3min)

1. No menu lateral, clique em **"SQL Editor"**
2. Clique em **"New query"**
3. Abra o arquivo `supabase-initial-schema.sql` do projeto
4. Copie TODO o conteúdo
5. Cole no SQL Editor
6. Clique em **"RUN"** (⚡) ou `Ctrl+Enter`
7. Verifique: deve aparecer "Success. No rows returned"

---

### 3️⃣ Criar Storage Buckets (3min)

1. Menu lateral → **"Storage"**
2. Clique em **"New bucket"**
   - **Name**: `pets`
   - **Public**: ✅ SIM
   - Clique em **"Create bucket"**
3. Clique novamente em **"New bucket"**
   - **Name**: `documents`
   - **Public**: ❌ NÃO
   - Clique em **"Create bucket"**

---

### 4️⃣ Configurar Auth (2min)

1. Menu lateral → **"Authentication"** → **"URL Configuration"**
2. Configure:
   - **Site URL**: `http://localhost:3000`
   - **Redirect URLs**: `http://localhost:3000/**`
3. Verifique que **"Email"** está habilitado em **"Providers"**

---

### 5️⃣ Copiar Credenciais (2min)

1. Menu lateral → **"Settings"** → **"API"**
2. Copie:
   - ✅ **Project URL** → já está no `.env.local`
   - ✅ **anon public key** → já está no `.env.local`
   - ✅ **service_role key** → já está no `.env.local`

3. Menu lateral → **"Settings"** → **"Database"**
4. Em **"Connection string"**, selecione aba **"URI"**
5. Copie a string e substitua `[YOUR-PASSWORD]` pela senha que você criou
6. Atualize `DATABASE_URL` no `.env.local`

Exemplo:
```
DATABASE_URL=postgresql://postgres:SUA_SENHA_AQUI@db.siwapjqndevuwsluncnr.supabase.co:5432/postgres
```

---

### 6️⃣ Verificar (1min)

1. **Table Editor** → Verifique se a tabela `users` existe
2. **Storage** → Verifique se os buckets `pets` e `documents` existem
3. **Authentication** → Verifique se Email está habilitado

---

## ✅ PRONTO!

Agora você pode:

```bash
# Instalar dependências
pnpm install

# Iniciar servidor
pnpm run dev
```

Acesse http://localhost:3000 e teste o login!

---

## 🆘 PROBLEMAS?

### Erro: "Invalid API key"
- Verifique se copiou as chaves corretas do Dashboard
- Certifique-se que não há espaços extras

### Erro: "Database connection failed"
- Verifique se a senha na `DATABASE_URL` está correta
- Certifique-se que substituiu `[YOUR-PASSWORD]` pela senha real

### Erro: "Bucket not found"
- Verifique se criou os buckets `pets` e `documents`
- Certifique-se que os nomes estão exatamente como no código

---

## 📚 DOCUMENTAÇÃO COMPLETA

Para mais detalhes, consulte: `SUPABASE_SETUP.md`

---

**🎉 Boa sorte!**


