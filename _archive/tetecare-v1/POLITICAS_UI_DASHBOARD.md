# 📋 POLÍTICAS RLS VIA DASHBOARD - GUIA COMPLETO

## ✅ PRÉ-REQUISITO

Execute primeiro o arquivo `SQL_FUNCOES_OTIMIZADO.sql` no SQL Editor para criar as funções auxiliares.

---

## 🎯 COMO CRIAR POLÍTICAS VIA DASHBOARD

1. Acesse **Storage** no menu lateral do Supabase
2. Clique no bucket desejado
3. Vá na aba **"Policies"**
4. Clique em **"New Policy"**
5. Selecione **"For full customization"**
6. Preencha os campos conforme abaixo
7. Clique em **"Review"** e **"Save policy"**

**Nota**: Use `(SELECT auth.uid())` em vez de `auth.uid()` para melhor performance (sugestão do agente).

---

## 📦 BUCKET: pets (PRIVADO)

### Política 1: SELECT
- **Policy name**: `pets_select_tutors_and_admins`
- **Allowed operation**: `SELECT`
- **Target roles**: `authenticated`
- **USING expression**:
```sql
bucket_id = 'pets' 
AND (
  public.is_admin((SELECT auth.uid()))
  OR
  public.is_tutor_of_pet(
    (SELECT auth.uid()),
    public.extract_pet_id_from_path(name)
  )
)
```

### Política 2: INSERT
- **Policy name**: `pets_insert_admins_only`
- **Allowed operation**: `INSERT`
- **Target roles**: `authenticated`
- **WITH CHECK expression**:
```sql
bucket_id = 'pets' 
AND public.is_admin((SELECT auth.uid()))
```

### Política 3: UPDATE
- **Policy name**: `pets_update_admins_only`
- **Allowed operation**: `UPDATE`
- **Target roles**: `authenticated`
- **USING expression**:
```sql
bucket_id = 'pets' 
AND public.is_admin((SELECT auth.uid()))
```

### Política 4: DELETE
- **Policy name**: `pets_delete_admins_only`
- **Allowed operation**: `DELETE`
- **Target roles**: `authenticated`
- **USING expression**:
```sql
bucket_id = 'pets' 
AND public.is_admin((SELECT auth.uid()))
```

---

## 📦 BUCKET: daycare-photos (PRIVADO)

### SELECT
- **Policy name**: `daycare_photos_select_tutors_and_admins`
- **USING**:
```sql
bucket_id = 'daycare-photos' 
AND (
  public.is_admin((SELECT auth.uid()))
  OR
  public.is_tutor_of_pet(
    (SELECT auth.uid()),
    public.extract_pet_id_from_path(name)
  )
)
```

### INSERT
- **Policy name**: `daycare_photos_insert_admins_only`
- **WITH CHECK**:
```sql
bucket_id = 'daycare-photos' 
AND public.is_admin((SELECT auth.uid()))
```

### UPDATE
- **Policy name**: `daycare_photos_update_admins_only`
- **USING**: (igual ao INSERT, mas usando USING)

### DELETE
- **Policy name**: `daycare_photos_delete_admins_only`
- **USING**: (igual ao INSERT)

---

## 📦 BUCKET: documents (PRIVADO)

### SELECT
- **Policy name**: `documents_select_tutors_and_admins`
- **USING**:
```sql
bucket_id = 'documents' 
AND (
  public.is_admin((SELECT auth.uid()))
  OR
  public.is_tutor_of_pet(
    (SELECT auth.uid()),
    public.extract_pet_id_from_path(name)
  )
)
```

### INSERT
- **Policy name**: `documents_insert_tutors_and_admins`
- **WITH CHECK**: (igual ao SELECT acima)

### UPDATE
- **Policy name**: `documents_update_tutors_and_admins`
- **USING**: (igual ao SELECT acima)

### DELETE
- **Policy name**: `documents_delete_admins_only`
- **USING**:
```sql
bucket_id = 'documents' 
AND public.is_admin((SELECT auth.uid()))
```

---

## 📦 BUCKET: financial (PRIVADO)

### SELECT
- **Policy name**: `financial_select_tutors_and_admins`
- **USING**: (igual a documents SELECT, mas `bucket_id = 'financial'`)

### INSERT/UPDATE/DELETE
- **Policy name**: `financial_insert_admins_only` / `financial_update_admins_only` / `financial_delete_admins_only`
- **WITH CHECK/USING**:
```sql
bucket_id = 'financial' 
AND public.is_admin((SELECT auth.uid()))
```

---

## 📦 BUCKET: reports (PRIVADO)

### SELECT
- **Policy name**: `reports_select_tutors_and_admins`
- **USING**: (igual a documents SELECT, mas `bucket_id = 'reports'`)

### INSERT/UPDATE/DELETE
- **Policy name**: `reports_insert_admins_only` / etc.
- **WITH CHECK/USING**:
```sql
bucket_id = 'reports' 
AND public.is_admin((SELECT auth.uid()))
```

---

## 📦 BUCKET: products (PRIVADO)

### SELECT/INSERT/UPDATE
- **Policy name**: `products_select_tutors_and_admins` / `products_insert_tutors_and_admins` / `products_update_tutors_and_admins`
- **USING/WITH CHECK**: (igual a documents, mas `bucket_id = 'products'`)

### DELETE
- **Policy name**: `products_delete_admins_only`
- **USING**:
```sql
bucket_id = 'products' 
AND public.is_admin((SELECT auth.uid()))
```

---

## 📦 BUCKET: health-logs (PRIVADO)

### SELECT/INSERT/UPDATE
- **Policy name**: `health_logs_select_tutors_and_admins` / `health_logs_insert_tutors_and_admins` / `health_logs_update_tutors_and_admins`
- **USING/WITH CHECK**: (igual a documents, mas `bucket_id = 'health-logs'`)

### DELETE
- **Policy name**: `health_logs_delete_admins_only`
- **USING**:
```sql
bucket_id = 'health-logs' 
AND public.is_admin((SELECT auth.uid()))
```

---

## 📦 BUCKET: tutors (PRIVADO)

### SELECT/INSERT/UPDATE
- **Policy name**: `tutors_select_own_and_admins` / `tutors_insert_own_and_admins` / `tutors_update_own_and_admins`
- **USING/WITH CHECK**:
```sql
bucket_id = 'tutors' 
AND (
  public.is_admin((SELECT auth.uid()))
  OR
  EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_id = (SELECT auth.uid())
      AND id = public.extract_tutor_id_from_path(name)
  )
)
```

### DELETE
- **Policy name**: `tutors_delete_admins_only`
- **USING**:
```sql
bucket_id = 'tutors' 
AND public.is_admin((SELECT auth.uid()))
```

---

## 📦 BUCKET: staff (PRIVADO)

### SELECT
- **Policy name**: `staff_select_own_and_admins`
- **USING**: (igual a tutors SELECT, mas `bucket_id = 'staff'`)

### INSERT/UPDATE/DELETE
- **Policy name**: `staff_insert_admins_only` / etc.
- **WITH CHECK/USING**:
```sql
bucket_id = 'staff' 
AND public.is_admin((SELECT auth.uid()))
```

---

## 📦 BUCKET: wall (PÚBLICO - autenticados)

### SELECT
- **Policy name**: `wall_select_authenticated`
- **Target roles**: `authenticated`
- **USING**:
```sql
bucket_id = 'wall'
```

### INSERT
- **Policy name**: `wall_insert_authenticated`
- **Target roles**: `authenticated`
- **WITH CHECK**:
```sql
bucket_id = 'wall'
```

### UPDATE
- **Policy name**: `wall_update_authenticated`
- **Target roles**: `authenticated`
- **USING**:
```sql
bucket_id = 'wall' 
AND (
  public.is_admin((SELECT auth.uid()))
  OR
  (metadata->>'owner')::uuid = (SELECT auth.uid())
)
```

### DELETE
- **Policy name**: `wall_delete_authenticated`
- **Target roles**: `authenticated`
- **USING**: (igual ao UPDATE)

---

## 📦 BUCKET: partnerships (PÚBLICO)

### SELECT
- **Policy name**: `partnerships_select_public`
- **Target roles**: `public`
- **USING**:
```sql
bucket_id = 'partnerships'
```

### INSERT/UPDATE/DELETE
- **Policy name**: `partnerships_insert_admins_only` / etc.
- **Target roles**: `authenticated`
- **WITH CHECK/USING**:
```sql
bucket_id = 'partnerships' 
AND public.is_admin((SELECT auth.uid()))
```

---

## 📦 BUCKET: marketing (PÚBLICO)

### SELECT
- **Policy name**: `marketing_select_public`
- **Target roles**: `public`
- **USING**:
```sql
bucket_id = 'marketing'
```

### INSERT/UPDATE/DELETE
- **Policy name**: `marketing_insert_admins_only` / etc.
- **Target roles**: `authenticated`
- **WITH CHECK/USING**:
```sql
bucket_id = 'marketing' 
AND public.is_admin((SELECT auth.uid()))
```

---

## ✅ CHECKLIST

Após criar todas as políticas:

- [ ] 4 funções auxiliares criadas (via SQL Editor)
- [ ] 48 políticas criadas (12 buckets × 4 operações)
- [ ] Todas as políticas usam `(SELECT auth.uid())` para melhor performance
- [ ] RLS habilitado nos buckets (automático)

---

## 🎯 RESUMO

**Total de políticas**: 48 (12 buckets × 4 operações)

**Buckets privados** (9): pets, daycare-photos, documents, financial, reports, products, health-logs, tutors, staff

**Buckets públicos** (3): wall, partnerships, marketing

---

**Dica**: Crie as políticas de um bucket por vez para não se perder. Comece pelos buckets mais importantes (pets, documents, daycare-photos).


