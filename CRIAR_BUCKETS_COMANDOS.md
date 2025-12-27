# 📦 COMANDOS PARA CRIAR BUCKETS DE STORAGE

## 🎯 OPÇÃO RECOMENDADA: Usar Supabase CLI

### Pré-requisitos
1. Instalar Supabase CLI: https://supabase.com/docs/guides/cli
2. Fazer login: `supabase login`
3. Linkar projeto: `supabase link --project-ref seu-project-ref`

### Comandos para Executar

#### Buckets Públicos:
```bash
supabase storage create-bucket pets --public
supabase storage create-bucket tutors --public
supabase storage create-bucket daycare-photos --public
supabase storage create-bucket wall --public
supabase storage create-bucket partnerships --public
supabase storage create-bucket marketing --public
```

#### Buckets Privados:
```bash
supabase storage create-bucket documents
supabase storage create-bucket financial
supabase storage create-bucket staff
supabase storage create-bucket reports
```

---

## 🔧 OPÇÃO ALTERNATIVA: Usar cURL (API REST)

### Configurar Variáveis
```bash
export SUPABASE_URL="https://siwapjqndevuwsluncnr.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="sua_service_role_key_aqui"
```

### Comandos cURL

#### Buckets Públicos:
```bash
# pets
curl -X POST "$SUPABASE_URL/storage/v1/bucket" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"pets","public":true}'

# tutors
curl -X POST "$SUPABASE_URL/storage/v1/bucket" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"tutors","public":true}'

# daycare-photos
curl -X POST "$SUPABASE_URL/storage/v1/bucket" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"daycare-photos","public":true}'

# wall
curl -X POST "$SUPABASE_URL/storage/v1/bucket" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"wall","public":true}'

# partnerships
curl -X POST "$SUPABASE_URL/storage/v1/bucket" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"partnerships","public":true}'

# marketing
curl -X POST "$SUPABASE_URL/storage/v1/bucket" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"marketing","public":true}'
```

#### Buckets Privados:
```bash
# documents
curl -X POST "$SUPABASE_URL/storage/v1/bucket" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"documents","public":false}'

# financial
curl -X POST "$SUPABASE_URL/storage/v1/bucket" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"financial","public":false}'

# staff
curl -X POST "$SUPABASE_URL/storage/v1/bucket" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"staff","public":false}'

# reports
curl -X POST "$SUPABASE_URL/storage/v1/bucket" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"reports","public":false}'
```

---

## 📋 OPÇÃO MAIS SIMPLES: Dashboard do Supabase

1. Acesse https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Storage**
4. Clique em **"New bucket"**
5. Para cada bucket:
   - Digite o nome
   - Marque/desmarque "Public bucket" conforme a lista abaixo
   - Clique em **"Create bucket"**

### Lista de Buckets:

**Públicos** (marque "Public bucket"):
- wall (mural social)
- partnerships (parcerias/marketing)
- marketing (marketing institucional)

**Privados** (NÃO marque "Public bucket"):
- pets (fotos de pets - apenas tutores do pet + admins)
- tutors (fotos de tutores - apenas próprio tutor + admins)
- daycare-photos (fotos da creche - apenas tutores do pet + admins)
- documents (documentos - apenas tutores do pet + admins)
- financial (financeiro - apenas tutores do pet + admins)
- staff (colaboradores - apenas próprio colaborador + admins)
- reports (relatórios - apenas tutores do pet + admins)
- products (produtos - apenas tutores do pet + admins)
- health-logs (registros de saúde - apenas tutores do pet + admins)

---

## ✅ VALIDAÇÃO

Após criar os buckets, verifique:

1. **Listar buckets criados**:
   ```bash
   supabase storage list
   ```

2. **Ou via Dashboard**: Storage → Verificar se todos os buckets aparecem na lista

3. **Verificar permissões**: Cada bucket deve ter as políticas RLS configuradas (o agente pode ajudar com isso depois)

---

## 🎯 RECOMENDAÇÃO

**Use a Opção do Dashboard** (mais simples):
- Não precisa instalar CLI
- Não precisa expor service_role_key
- Interface visual e fácil
- Leva cerca de 5 minutos

Depois de criar os buckets, você pode pedir ao agente para configurar as políticas RLS.

---

## 📝 PRÓXIMOS PASSOS

Após criar os buckets:
1. Configurar políticas RLS (pode pedir ao agente)
2. Testar upload de arquivos
3. Verificar permissões de acesso

