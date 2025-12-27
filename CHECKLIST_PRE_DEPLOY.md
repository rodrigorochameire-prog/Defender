# ✅ Checklist Pré-Deploy - TeteCareHub

## 🔍 Verificações Necessárias Antes do Deploy

### 1. Supabase Configuration ✅

- [x] Database criado e configurado
- [x] Auth configurado (email/password)
- [x] Storage buckets criados
- [x] RLS policies aplicadas
- [ ] **Auth URLs atualizadas** (fazer após deploy)
- [ ] **Email SMTP configurado** (para produção)

### 2. Environment Variables

- [x] `.env.local` criado localmente
- [ ] **Variáveis configuradas na plataforma de deploy**
- [ ] **Verificar que todas as variáveis estão presentes**

### 3. Código

- [ ] **Remover dependências do Manus** (se não usar)
- [ ] **Verificar imports do Supabase**
- [ ] **Testar build localmente:** `pnpm build`
- [ ] **Verificar que não há erros de TypeScript:** `pnpm check`

### 4. Database

- [x] Migrations aplicadas
- [x] Tabelas criadas
- [ ] **Primeiro admin criado** (via Supabase Dashboard ou SQL)

### 5. Storage

- [x] Buckets criados
- [x] RLS policies aplicadas
- [ ] **CORS configurado** (se necessário para uploads diretos)

---

## 🚨 Ações Necessárias ANTES do Deploy

### 1. Remover/Adaptar Dependências do Manus

Se você não vai usar Manus OAuth, precisa:

**a) Verificar imports:**
```bash
# Procurar por referências ao Manus
grep -r "manus" client/src server/
```

**b) Remover ou adaptar:**
- `vite-plugin-manus-runtime` do `vite.config.ts`
- Referências ao Manus no código
- Ou manter se for usar

### 2. Testar Build Localmente

```bash
# Instalar dependências
pnpm install

# Testar build
pnpm build

# Verificar erros TypeScript
pnpm check
```

### 3. Criar Primeiro Admin

**Via SQL no Supabase:**
```sql
-- Encontrar seu usuário
SELECT id, email, role FROM public.users WHERE email = 'seu@email.com';

-- Tornar admin
UPDATE public.users SET role = 'admin' WHERE email = 'seu@email.com';
```

**Ou via Supabase Dashboard:**
- Table Editor → `users`
- Encontrar seu usuário
- Editar campo `role` para `admin`

---

## 📋 Variáveis de Ambiente para Deploy

Copie estas variáveis para a plataforma de deploy:

```bash
# Supabase
VITE_SUPABASE_URL=https://siwapjqndevuwsluncnr.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Database
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.siwapjqndevuwsluncnr.supabase.co:5432/postgres

# App
NODE_ENV=production
VITE_APP_ID=tete-house-hub
JWT_SECRET=qualquer_string_aleatoria_aqui
PORT=3000
```

**⚠️ IMPORTANTE:** 
- Substitua `[PASSWORD]` pela senha real do banco
- Use `SUPABASE_SERVICE_ROLE_KEY` apenas no backend (não exponha no frontend)
- Gere um `JWT_SECRET` seguro para produção

---

## 🧪 Testar Localmente Antes

```bash
# 1. Instalar dependências
pnpm install

# 2. Verificar .env.local
cat .env.local

# 3. Testar build
pnpm build

# 4. Testar servidor local
pnpm start

# 5. Abrir http://localhost:3000
# 6. Testar login/cadastro
# 7. Testar funcionalidades básicas
```

---

## ✅ Status Atual

### ✅ Já Configurado:
- Supabase Database
- Supabase Auth
- Supabase Storage
- RLS Policies
- Variáveis de ambiente locais

### ⚠️ Precisa Fazer:
- [ ] Testar build localmente
- [ ] Remover/adaptar dependências do Manus (se não usar)
- [ ] Criar primeiro admin
- [ ] Escolher plataforma de deploy
- [ ] Configurar variáveis na plataforma
- [ ] Fazer deploy
- [ ] Atualizar URLs do Supabase Auth
- [ ] Testar em produção

---

## 🚀 Próximo Passo

**Escolha uma plataforma de deploy e siga o guia:**
- `GUIA_DEPLOY_SUPABASE.md` - Guia completo de deploy

**Recomendação:** Comece com **Vercel** (mais fácil) ou **Railway** (full-stack)


