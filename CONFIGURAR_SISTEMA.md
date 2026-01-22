# Configurar Sistema de Autenticação

O Clerk foi removido! Agora o sistema usa autenticação customizada com JWT.

## Passo 1: Atualizar Código Local

```bash
cd ~/Projetos/Defender
git pull origin main
```

## Passo 2: Adicionar AUTH_SECRET

```bash
./add-auth-secret.sh
```

Ou manualmente:

```bash
# Gerar secret
openssl rand -base64 32

# Adicionar ao .env.local
echo "AUTH_SECRET=<cole_o_secret_aqui>" >> .env.local
```

## Passo 3: Criar Usuário Admin

O sistema já tem páginas de `/register` e `/login`. Você pode:

### Opção A: Registrar via Interface (RECOMENDADO)

1. Inicie o servidor:
```bash
npm run dev
```

2. Acesse: http://localhost:3000/register

3. Preencha:
   - **Nome:** Admin
   - **Email:** seu@email.com
   - **Senha:** Defesa9dp*

4. Após registrar, você será redirecionado automaticamente

### Opção B: Criar via SQL Direto

```sql
INSERT INTO users (name, email, password, role, created_at, updated_at)
VALUES (
  'Admin',
  'admin@defesahub.com',
  -- Senha hash (você precisa gerar via bcrypt)
  '$2a$10$...',
  'admin',
  NOW(),
  NOW()
);
```

## Passo 4: Testar Login

1. Acesse: http://localhost:3000/login

2. Entre com:
   - **Email:** O que você registrou
   - **Senha:** Defesa9dp*

3. Você será redirecionado para o dashboard

## Passo 5: Configurar no Vercel

Adicione ao Vercel:

```bash
AUTH_SECRET=<mesmo_valor_do_local>
```

Via CLI:

```bash
vercel env add AUTH_SECRET
# Cole o valor quando solicitado
# Selecione: Production, Preview, Development
```

Ou via Dashboard:
1. https://vercel.com/dashboard
2. Seu projeto → Settings → Environment Variables
3. Add → `AUTH_SECRET` → Cole o valor → Save
4. Redeploy

## Como Funciona Agora

### Rotas Públicas (sem login)
- `/` - Home
- `/login` - Login
- `/register` - Registro
- `/forgot-password` - Recuperar senha
- `/reset-password` - Resetar senha

### Rotas Protegidas (requer login)
- `/admin/*` - Dashboard admin
- Qualquer outra rota

### Middleware
- Verifica cookie `defesahub_session`
- Se não autenticado → redireciona para `/login`
- Se autenticado → permite acesso

### Sessão
- JWT armazenado em cookie httpOnly
- Duração: 30 dias
- Renovado automaticamente

## Gerenciar Usuários

### Criar Novo Usuário

Via interface `/register` ou SQL:

```sql
INSERT INTO users (name, email, password, role)
VALUES ('Nome', 'email@example.com', 'hash_senha', 'user');
```

### Promover para Admin

```sql
UPDATE users SET role = 'admin' WHERE email = 'email@example.com';
```

### Deletar Usuário

```sql
DELETE FROM users WHERE email = 'email@example.com';
```

## Troubleshooting

### Erro: "AUTH_SECRET não está definida"

Execute `./add-auth-secret.sh` ou adicione manualmente ao `.env.local`

### Erro: "Não autenticado"

1. Limpe cookies do navegador
2. Faça login novamente
3. Verifique se `AUTH_SECRET` está configurado

### Redirecionamento infinito

1. Verifique se o middleware está funcionando
2. Confirme que a rota `/login` está nas rotas públicas
3. Limpe cookies e tente novamente

### Senha não funciona

1. Verifique se o hash está correto no banco
2. Use a página `/register` para criar usuário
3. Confirme que o bcrypt está funcionando

## Próximos Passos

Agora você pode:

1. ✅ Fazer login com usuário/senha
2. ✅ Acessar o dashboard admin
3. ✅ Gerenciar usuários via SQL ou interface
4. 🔜 Criar página de gerenciamento de usuários no admin
5. 🔜 Adicionar recuperação de senha por email

## Diferenças do Clerk

| Antes (Clerk) | Agora (Customizado) |
|---------------|---------------------|
| `/sign-in` | `/login` |
| `/sign-up` | `/register` |
| OAuth social | Email/senha apenas |
| Gerenciado externamente | Controle total |
| Pago após limite | Gratuito sempre |

## Segurança

✅ **Senhas com bcrypt** - Hash seguro  
✅ **JWT com HS256** - Token assinado  
✅ **Cookie httpOnly** - Não acessível via JS  
✅ **Secure em produção** - HTTPS obrigatório  
✅ **SameSite lax** - Proteção CSRF  
✅ **Expiração 30 dias** - Renovação automática  

---

**Tudo pronto!** Execute os passos acima e o sistema estará funcionando. 🚀
