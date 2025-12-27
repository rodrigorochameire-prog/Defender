# ✅ COMO TESTAR O SISTEMA - GUIA SIMPLES

## 🎯 RESPOSTA RÁPIDA

**Você NÃO precisa gerar JWT manualmente!**

O sistema que criamos já faz tudo automaticamente. Siga estes 3 passos:

---

## 📋 PASSO A PASSO SIMPLES

### 1️⃣ Configure o Supabase (15 minutos)

Siga o guia `SUPABASE_QUICK_START.md`:

- [ ] Criar projeto
- [ ] Executar SQL (`supabase-initial-schema.sql`)
- [ ] Criar buckets (pets e documents)
- [ ] Configurar Auth (habilitar Email)
- [ ] Copiar credenciais para `.env.local`

### 2️⃣ Inicie o Servidor (2 minutos)

```bash
# Instalar dependências (se ainda não fez)
pnpm install

# Iniciar servidor
pnpm run dev
```

### 3️⃣ Teste o Login (1 minuto)

1. Abra http://localhost:3000 no navegador
2. Você verá a tela de login/cadastro
3. Clique em **"Criar conta"**
4. Digite:
   - Email: `teste@example.com`
   - Senha: `senha123`
5. Clique em **"Cadastrar"**

**Pronto!** O sistema automaticamente:
- ✅ Cria o usuário no Supabase Auth
- ✅ Gera o JWT automaticamente
- ✅ Sincroniza com a tabela `users` no banco
- ✅ Autentica o usuário

---

## 🔍 VERIFICAR SE FUNCIONOU

### No Supabase Dashboard:

1. **Authentication → Users**:
   - Você deve ver o usuário `teste@example.com`

2. **Table Editor → users**:
   - Você deve ver o usuário com:
     - `email`: `teste@example.com`
     - `auth_id`: Um UUID (ex: `bd614b10-8734-4e03-a8db-91e1d081b62d`)
     - `name`: Nome extraído do email ou "User"

### Na Aplicação:

- Após cadastro, você deve ser redirecionado
- Se aparecer erro, verifique os logs do servidor

---

## ❓ PERGUNTAS FREQUENTES

### "Preciso gerar JWT manualmente?"

**NÃO!** O componente `Auth.tsx` que criamos já faz isso automaticamente quando você:
- Faz signup (cadastro)
- Faz login

O Supabase gerencia os tokens para você.

### "Quando eu precisaria gerar JWT manualmente?"

Apenas se você quiser:
- Testar a API REST diretamente (curl, Postman)
- Debug avançado de autenticação
- Integração com serviços externos

Para o uso normal da aplicação, **não é necessário**.

### "Como obter o token se eu realmente precisar?"

**Método mais fácil**:

1. Faça login na aplicação
2. Abra o DevTools (F12)
3. Vá em **Console** e execute:

```javascript
// O Supabase client está disponível globalmente
// Ou você pode acessar via localStorage
localStorage.getItem('sb-xxxxx-auth-token')
```

Ou use o método descrito em `SUPABASE_TESTING.md`.

---

## 🚨 PROBLEMAS?

### Erro ao fazer cadastro/login

**Verifique**:
1. ✅ `.env.local` está configurado corretamente
2. ✅ `VITE_SUPABASE_URL` está correto
3. ✅ `VITE_SUPABASE_ANON_KEY` está correto
4. ✅ Email provider está habilitado no Supabase
5. ✅ Tabela `users` existe no banco

**Veja os logs do servidor** para mais detalhes do erro.

### Usuário não aparece no banco

**Verifique**:
1. ✅ Tabela `users` tem a coluna `auth_id`
2. ✅ Script SQL foi executado corretamente
3. ✅ `SUPABASE_SERVICE_ROLE_KEY` está no `.env.local`
4. ✅ Servidor está rodando sem erros

---

## 📝 RESUMO

✅ **FAÇA**:
1. Configure Supabase (seguindo `SUPABASE_QUICK_START.md`)
2. Inicie servidor (`pnpm run dev`)
3. Teste login/cadastro na interface web

❌ **NÃO PRECISA**:
- Gerar JWT manualmente
- Usar CLI do Supabase
- Criar Edge Functions
- Fazer login via OTP para testes básicos

---

## 🎉 PRONTO!

Se você conseguiu:
- ✅ Criar uma conta
- ✅ Ver o usuário no Supabase Dashboard
- ✅ Ver o usuário na tabela `users`

**Parabéns! O sistema está funcionando!** 🚀

---

**Dúvidas?** Consulte:
- `SUPABASE_QUICK_START.md` - Configuração rápida
- `SUPABASE_SETUP.md` - Guia completo
- `SUPABASE_TESTING.md` - Testes avançados


