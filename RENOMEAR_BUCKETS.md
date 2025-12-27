# 🔄 GUIA PARA RENOMEAR BUCKETS NO SUPABASE

## 📋 BUCKETS QUE PRECISAM SER RENOMEADOS

Baseado na imagem, você tem buckets com UUIDs que precisam ser renomeados.

### Buckets com nomes corretos (manter):
- ✅ `documents` (privado)
- ✅ `Pets` (público) - mas deveria ser `pets` (minúsculo)

### Buckets com UUIDs (precisam renomear):
- `eab0463b-2a22-489a-8ea3-473aac825926` (público) → **tutors**
- `a7f5b9d4-cc3a-4226-84eb-38bb14d4a5af` (privado) → **financial**
- `3950052b-3b4d-4822-9d5d-fccf1f18d502` (público) → **daycare-photos**
- `e5b43506-75c9-4091-a2ad-2979f3e5edb9` (público) → **wall**
- `2d7ff142-64cd-4b4d-84af-732f25855161` (público) → **partnerships**
- `e202ccf5-7dbc-4b9b-a498-9cc62749b02b` (privado) → **staff** ou **reports**

---

## ⚠️ IMPORTANTE: SUPABASE NÃO PERMITE RENOMEAR BUCKETS

O Supabase **não permite renomear buckets diretamente**. Você tem duas opções:

### Opção 1: Deletar e Recriar (Recomendado se buckets estão vazios)

1. **Verificar se os buckets estão vazios**:
   - Clique em cada bucket
   - Verifique se há arquivos dentro
   - Se estiver vazio, pode deletar com segurança

2. **Deletar buckets com UUIDs**:
   - Vá em Storage → Clique no bucket
   - Clique em "Delete bucket" ou use o menu
   - Confirme a exclusão

3. **Recriar com nomes corretos**:
   - Use o guia `CRIAR_BUCKETS_COMANDOS.md`
   - Ou crie manualmente no Dashboard

### Opção 2: Manter UUIDs e Usar no Código

Se os buckets já têm arquivos importantes:
- Mantenha os buckets como estão
- Atualize o código para usar os UUIDs
- Ou crie aliases/mapeamentos no código

---

## 🎯 RECOMENDAÇÃO

**Se os buckets estão vazios** (provavelmente estão, já que acabou de criar):
1. Delete todos os buckets com UUIDs
2. Recrie com os nomes corretos usando o Dashboard
3. Isso levará cerca de 2 minutos

**Se os buckets têm arquivos**:
- Mantenha como estão por enquanto
- Migre os arquivos depois (se necessário)
- Ou atualize o código para usar os UUIDs

---

## 📝 NOMES CORRETOS DOS BUCKETS

### Públicos:
- `pets` (renomear `Pets` → `pets`)
- `tutors`
- `daycare-photos`
- `wall`
- `partnerships`
- `marketing`

### Privados:
- `documents` ✅ (já está correto)
- `financial`
- `staff`
- `reports`

---

## 🔧 COMO DELETAR BUCKETS NO DASHBOARD

1. Acesse Supabase Dashboard → Storage
2. Clique no bucket que quer deletar
3. Vá em **Settings** ou use o menu "..." (três pontos)
4. Clique em **"Delete bucket"**
5. Confirme a exclusão
6. Repita para todos os buckets com UUIDs

---

## ✅ APÓS RENOMEAR/RECRIAR

Depois de ter os buckets com nomes corretos:
1. Verifique que todos os 10 buckets existem
2. Confirme que estão públicos/privados corretamente
3. Peça ao agente para configurar políticas RLS (se necessário)

---

## 💡 DICA

Se você não tem certeza qual UUID corresponde a qual bucket:
- Verifique a data de criação (mais recente = criado agora)
- Ou delete todos e recrie na ordem correta
- Use o guia `CRIAR_BUCKETS_COMANDOS.md` para referência


