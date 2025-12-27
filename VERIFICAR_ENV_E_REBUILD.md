# 🔧 Verificar .env e Rebuild

## 🎯 Problema

O erro persiste porque o código verifica as variáveis no nível do módulo, antes do dotenv carregar completamente.

**Solução aplicada:** Código modificado para inicialização lazy (só verifica quando realmente usa).

---

## 🚀 Passos

### 1. Verificar se .env existe e tem conteúdo

Execute no terminal:

```bash
# Verificar se .env existe
ls -la .env

# Ver conteúdo (primeiras linhas)
head -5 .env
```

**Verificar se contém:**
- `VITE_SUPABASE_URL=...`
- `SUPABASE_SERVICE_ROLE_KEY=...`
- `DATABASE_URL=...`

### 2. Rebuild (CRÍTICO)

O código foi modificado, precisa rebuild:

```bash
pnpm build
```

### 3. Testar

```bash
pnpm start
```

---

## 🐛 Se Ainda Não Funcionar

Verifique se as variáveis estão corretas no `.env`:

```bash
# Ver todas as variáveis do Supabase
grep SUPABASE .env
```

**Deve mostrar:**
```
VITE_SUPABASE_URL=https://siwapjqndevuwsluncnr.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## ✅ Mudança Aplicada

O código agora:
- ✅ Não verifica variáveis no nível do módulo
- ✅ Verifica apenas quando realmente precisa usar
- ✅ Mensagem de erro mais informativa

---

**🚀 Execute: `pnpm build && pnpm start`**


