# 📦 BUCKETS: DOCUMENTS, FOTOS E MURAL - ANÁLISE COMPLETA

## 🔍 O QUE É O BUCKET "documents"

### Uso atual (baseado no schema):
O bucket **"documents"** é usado para **documentos veterinários dos pets**:

- ✅ **Carteira de vacinação** (`vaccination_card`)
- ✅ **Documentos veterinários** (`veterinary_document`)
- ✅ **Exames** (`exam`)
- ✅ **Certificados** (`certificate`)
- ✅ **Prescrições** (`prescription`)
- ✅ **Outros** (`other`)

**Características:**
- Privado (apenas tutores do pet e admins podem ver)
- Vinculado a um `petId` específico
- Upload feito por admins ou tutores

---

## 📸 SISTEMA DE FOTOS NO CÓDIGO

### O que já existe:

1. **Tabela `petPhotos`** - Galeria de fotos dos pets
   - Fotos gerais do pet
   - Com comentários e reações
   - Timeline por data

2. **Tabela `wallPosts`** - Mural interativo
   - Posts com fotos/vídeos
   - Pode ser geral ou específico para um pet
   - Sistema de comentários e reações
   - Tipo: `general`, `tutor`, `pet`

3. **Campo `photoUrl` na tabela `pets`** - Foto de perfil do pet

---

## 💡 BUCKETS RECOMENDADOS PARA FOTOS

### 1. **daycare-photos** ou **creche-fotos** ⭐⭐⭐ (MUITO RECOMENDADO)

**Uso**: Fotos tiradas na creche compartilhadas com tutores específicos

**Por quê?**
- Diferente da galeria geral (`petPhotos`)
- Foco em comunicação creche ↔ tutor
- Fotos do dia a dia na creche
- Pode ser usado em notificações/WhatsApp

**Configuração sugerida:**
- Público: **SIM** (para tutores acessarem facilmente)
- Política: 
  - SELECT: Tutores do pet específico + admins
  - INSERT: Apenas admins (creche faz upload)
- Estrutura: `daycare-photos/{petId}/{date}/foto-{id}.jpg`

**Exemplos:**
- Fotos do pet brincando na creche
- Fotos durante atividades
- Fotos para enviar via WhatsApp
- Fotos do check-in/check-out

---

### 2. **wall** ou **mural** ⭐⭐⭐ (MUITO RECOMENDADO)

**Uso**: Fotos e vídeos do mural interativo (wall posts)

**Por quê?**
- Sistema de mural já existe no código (`wallPosts`)
- Posts podem ter múltiplas mídias (`mediaUrls`, `mediaKeys`)
- Separação clara do resto das fotos
- Facilita gerenciamento de conteúdo social

**Configuração sugerida:**
- Público: **SIM** (para mural ser acessível)
- Política:
  - SELECT: Público ou autenticados (depende do `targetType` do post)
  - INSERT: Admins e tutores podem criar posts
- Estrutura: `wall/posts/{postId}/media-{id}.jpg`

**Exemplos:**
- Fotos compartilhadas no mural
- Vídeos de atividades
- Posts gerais da creche
- Posts específicos para tutores

---

### 3. **gallery** ou **galeria** ⭐ (OPCIONAL)

**Uso**: Galeria geral de fotos dos pets (`petPhotos`)

**Por quê?**
- Já existe tabela `petPhotos` no banco
- Pode usar o bucket "pets" existente
- Ou criar bucket separado para organização

**Configuração sugerida:**
- Público: **SIM**
- Política: Tutores do pet + admins
- Estrutura: `gallery/{petId}/{date}/photo-{id}.jpg`

**Nota**: Pode usar o bucket "pets" existente com estrutura de pastas.

---

## 📊 ESTRUTURA RECOMENDADA DE BUCKETS

### Buckets Essenciais:
1. ✅ **pets** - Fotos de perfil e galeria geral
2. ✅ **documents** - Documentos veterinários (já configurado)
3. ⭐ **daycare-photos** - Fotos da creche para tutores (NOVO)
4. ⭐ **wall** - Mural interativo (NOVO)

### Buckets Adicionais (já discutidos):
5. **tutors** - Fotos de perfil de tutores
6. **financial** - Comprovantes financeiros
7. **staff** - Documentos de colaboradores
8. **reports** - Relatórios em PDF

---

## 🎯 DIFERENÇA ENTRE OS BUCKETS DE FOTOS

| Bucket | Uso | Quem vê | Quem faz upload |
|--------|-----|---------|-----------------|
| **pets** | Fotos gerais do pet, galeria | Tutores do pet + admins | Admins e tutores |
| **daycare-photos** | Fotos do dia a dia na creche | Tutores do pet + admins | Apenas admins (creche) |
| **wall** | Posts do mural (social) | Público ou autenticados | Admins e tutores |
| **gallery** | Galeria organizada (opcional) | Tutores do pet + admins | Admins e tutores |

---

## 💡 RECOMENDAÇÃO FINAL

### Criar agora:
1. ✅ **pets** (já configurado)
2. ✅ **documents** (já configurado)
3. ⭐ **daycare-photos** - Para comunicação creche ↔ tutor
4. ⭐ **wall** - Para o mural interativo

### Estrutura sugerida:
```
pets/
  └── {petId}/
      └── profile.jpg (foto de perfil)

documents/
  └── {petId}/
      └── vacina.pdf (documentos veterinários)

daycare-photos/  (NOVO)
  └── {petId}/
      └── {date}/
          └── foto-{id}.jpg (fotos do dia na creche)

wall/  (NOVO)
  └── posts/
      └── {postId}/
          └── media-{id}.jpg (fotos/vídeos do mural)
```

---

## ✅ CONCLUSÃO

**Resposta às suas perguntas:**

1. **"documents" diz respeito a o quê?"**
   - Documentos veterinários dos pets (vacinas, exames, prescrições)

2. **"Bucket específico para fotos dos pets na creche?"**
   - ✅ SIM! Criar **"daycare-photos"** para comunicação creche ↔ tutor

3. **"Mural geral?"**
   - ✅ SIM! Criar **"wall"** para o sistema de mural interativo

**Ação recomendada**: Criar os buckets **"daycare-photos"** e **"wall"** agora!


