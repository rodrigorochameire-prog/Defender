# 📋 POLÍTICAS RLS POR BUCKET - PARA CRIAR VIA DASHBOARD

Use este guia para criar as políticas RLS manualmente via Dashboard do Supabase.

**Pré-requisito**: Execute primeiro o arquivo `SQL_APENAS_FUNCOES.sql` no SQL Editor.

---

## 🎯 COMO CRIAR UMA POLÍTICA VIA DASHBOARD

1. Acesse **Storage** → Selecione o bucket
2. Aba **"Policies"** → **"New Policy"**
3. Selecione **"For full customization"**
4. Preencha os campos conforme abaixo
5. Clique em **"Review"** e **"Save policy"**

---

## 📦 BUCKET: pets (PRIVADO)

### Política 1: SELECT
- **Nome**: `pets_select_tutors_and_admins`
- **Allowed operation**: SELECT
- **Target roles**: authenticated
- **USING expression**:
```sql
bucket_id = 'pets' 
AND (
  public.is_admin(auth.uid())
  OR
  public.is_tutor_of_pet(
    auth.uid(),
    public.extract_pet_id_from_path(name)
  )
)
```

### Política 2: INSERT
- **Nome**: `pets_insert_admins_only`
- **Allowed operation**: INSERT
- **Target roles**: authenticated
- **WITH CHECK expression**:
```sql
bucket_id = 'pets' 
AND public.is_admin(auth.uid())
```

### Política 3: UPDATE
- **Nome**: `pets_update_admins_only`
- **Allowed operation**: UPDATE
- **Target roles**: authenticated
- **USING expression**:
```sql
bucket_id = 'pets' 
AND public.is_admin(auth.uid())
```

### Política 4: DELETE
- **Nome**: `pets_delete_admins_only`
- **Allowed operation**: DELETE
- **Target roles**: authenticated
- **USING expression**:
```sql
bucket_id = 'pets' 
AND public.is_admin(auth.uid())
```

---

## 📦 BUCKET: daycare-photos (PRIVADO)

### SELECT
- **Nome**: `daycare_photos_select_tutors_and_admins`
- **USING**:
```sql
bucket_id = 'daycare-photos' 
AND (
  public.is_admin(auth.uid())
  OR
  public.is_tutor_of_pet(
    auth.uid(),
    public.extract_pet_id_from_path(name)
  )
)
```

### INSERT
- **Nome**: `daycare_photos_insert_admins_only`
- **WITH CHECK**:
```sql
bucket_id = 'daycare-photos' 
AND public.is_admin(auth.uid())
```

### UPDATE
- **Nome**: `daycare_photos_update_admins_only`
- **USING**:
```sql
bucket_id = 'daycare-photos' 
AND public.is_admin(auth.uid())
```

### DELETE
- **Nome**: `daycare_photos_delete_admins_only`
- **USING**:
```sql
bucket_id = 'daycare-photos' 
AND public.is_admin(auth.uid())
```

---

## 📦 BUCKET: documents (PRIVADO)

### SELECT
- **Nome**: `documents_select_tutors_and_admins`
- **USING**:
```sql
bucket_id = 'documents' 
AND (
  public.is_admin(auth.uid())
  OR
  public.is_tutor_of_pet(
    auth.uid(),
    public.extract_pet_id_from_path(name)
  )
)
```

### INSERT
- **Nome**: `documents_insert_tutors_and_admins`
- **WITH CHECK**:
```sql
bucket_id = 'documents' 
AND (
  public.is_admin(auth.uid())
  OR
  public.is_tutor_of_pet(
    auth.uid(),
    public.extract_pet_id_from_path(name)
  )
)
```

### UPDATE
- **Nome**: `documents_update_tutors_and_admins`
- **USING**: (mesmo que INSERT)

### DELETE
- **Nome**: `documents_delete_admins_only`
- **USING**:
```sql
bucket_id = 'documents' 
AND public.is_admin(auth.uid())
```

---

## 📦 BUCKET: financial (PRIVADO)

### SELECT
- **Nome**: `financial_select_tutors_and_admins`
- **USING**: (igual a documents SELECT)

### INSERT/UPDATE/DELETE
- **Nome**: `financial_insert_admins_only` / `financial_update_admins_only` / `financial_delete_admins_only`
- **WITH CHECK/USING**:
```sql
bucket_id = 'financial' 
AND public.is_admin(auth.uid())
```

---

## 📦 BUCKET: reports (PRIVADO)

### SELECT
- **Nome**: `reports_select_tutors_and_admins`
- **USING**: (igual a documents SELECT, mas `bucket_id = 'reports'`)

### INSERT/UPDATE/DELETE
- **Nome**: `reports_insert_admins_only` / etc.
- **WITH CHECK/USING**:
```sql
bucket_id = 'reports' 
AND public.is_admin(auth.uid())
```

---

## 📦 BUCKET: products (PRIVADO)

### SELECT/INSERT/UPDATE
- **Nome**: `products_select_tutors_and_admins` / `products_insert_tutors_and_admins` / `products_update_tutors_and_admins`
- **USING/WITH CHECK**: (igual a documents, mas `bucket_id = 'products'`)

### DELETE
- **Nome**: `products_delete_admins_only`
- **USING**:
```sql
bucket_id = 'products' 
AND public.is_admin(auth.uid())
```

---

## 📦 BUCKET: health-logs (PRIVADO)

### SELECT/INSERT/UPDATE
- **Nome**: `health_logs_select_tutors_and_admins` / `health_logs_insert_tutors_and_admins` / `health_logs_update_tutors_and_admins`
- **USING/WITH CHECK**: (igual a documents, mas `bucket_id = 'health-logs'`)

### DELETE
- **Nome**: `health_logs_delete_admins_only`
- **USING**:
```sql
bucket_id = 'health-logs' 
AND public.is_admin(auth.uid())
```

---

## 📦 BUCKET: tutors (PRIVADO)

### SELECT/INSERT/UPDATE
- **Nome**: `tutors_select_own_and_admins` / `tutors_insert_own_and_admins` / `tutors_update_own_and_admins`
- **USING/WITH CHECK**:
```sql
bucket_id = 'tutors' 
AND (
  public.is_admin(auth.uid())
  OR
  EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_id = auth.uid()
      AND id = public.extract_tutor_id_from_path(name)
  )
)
```

### DELETE
- **Nome**: `tutors_delete_admins_only`
- **USING**:
```sql
bucket_id = 'tutors' 
AND public.is_admin(auth.uid())
```

---

## 📦 BUCKET: staff (PRIVADO)

### SELECT
- **Nome**: `staff_select_own_and_admins`
- **USING**: (igual a tutors SELECT, mas `bucket_id = 'staff'`)

### INSERT/UPDATE/DELETE
- **Nome**: `staff_insert_admins_only` / etc.
- **WITH CHECK/USING**:
```sql
bucket_id = 'staff' 
AND public.is_admin(auth.uid())
```

---

## 📦 BUCKET: wall (PÚBLICO - autenticados)

### SELECT
- **Nome**: `wall_select_authenticated`
- **Target roles**: authenticated
- **USING**:
```sql
bucket_id = 'wall'
```

### INSERT
- **Nome**: `wall_insert_authenticated`
- **Target roles**: authenticated
- **WITH CHECK**:
```sql
bucket_id = 'wall'
```

### UPDATE
- **Nome**: `wall_update_authenticated`
- **Target roles**: authenticated
- **USING**:
```sql
bucket_id = 'wall' 
AND (
  public.is_admin(auth.uid())
  OR
  (metadata->>'owner')::uuid = auth.uid()
)
```

### DELETE
- **Nome**: `wall_delete_authenticated`
- **Target roles**: authenticated
- **USING**: (igual a UPDATE)

---

## 📦 BUCKET: partnerships (PÚBLICO)

### SELECT
- **Nome**: `partnerships_select_public`
- **Target roles**: public
- **USING**:
```sql
bucket_id = 'partnerships'
```

### INSERT/UPDATE/DELETE
- **Nome**: `partnerships_insert_admins_only` / etc.
- **Target roles**: authenticated
- **WITH CHECK/USING**:
```sql
bucket_id = 'partnerships' 
AND public.is_admin(auth.uid())
```

---

## 📦 BUCKET: marketing (PÚBLICO)

### SELECT
- **Nome**: `marketing_select_public`
- **Target roles**: public
- **USING**:
```sql
bucket_id = 'marketing'
```

### INSERT/UPDATE/DELETE
- **Nome**: `marketing_insert_admins_only` / etc.
- **Target roles**: authenticated
- **WITH CHECK/USING**:
```sql
bucket_id = 'marketing' 
AND public.is_admin(auth.uid())
```

---

## ✅ CHECKLIST

Após criar todas as políticas:

- [ ] 4 funções auxiliares criadas (via SQL Editor)
- [ ] 48 políticas criadas (12 buckets × 4 operações)
- [ ] RLS habilitado nos buckets (automático)

---

## 🚀 ALTERNATIVA: Usar Supabase CLI

Se preferir automatizar, use o CLI:

```bash
supabase db execute -f SQL_RLS_FINAL_COMPLETO.sql
```


