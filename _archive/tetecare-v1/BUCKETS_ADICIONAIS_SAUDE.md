# 📦 BUCKETS ADICIONAIS PARA SAÚDE E PRODUTOS

## 🔍 ANÁLISE DO SISTEMA

Baseado no código, identifiquei necessidades adicionais:

### 1. **Registros de Fezes (Stool Monitoring)**
- Tabelas `dailyLogs` e `healthBehaviorLogs` registram fezes
- Atualmente apenas texto (enum: normal, diarreia, constipado, etc.)
- **Potencial**: Fotos de fezes para monitoramento veterinário

### 2. **Documentos de Produtos**
- Vacinas têm `documentUrl` e `documentKey` (certificados)
- Medicamentos podem ter prescrições
- Produtos preventivos podem ter documentos
- **Atualmente**: Usa bucket `documents` genérico

### 3. **Registros de Saúde**
- Logs diários podem ter fotos anexadas
- Eventos de calendário podem ter `photoUrls` e `photoKeys`
- **Potencial**: Fotos específicas para registros de saúde

---

## 💡 BUCKETS ADICIONAIS RECOMENDADOS

### 1. **health-logs** ou **registros-saude** ⭐⭐ (RECOMENDADO)

**Uso**: Fotos e documentos relacionados a registros de saúde diários

**Por quê?**
- Separar registros de saúde de documentos veterinários formais
- Fotos de fezes para monitoramento veterinário
- Fotos de feridas, machucados, comportamentos
- Documentos de exames rápidos

**Configuração sugerida:**
- Público: **NÃO** (privado)
- Política: Tutores do pet + admins
- Estrutura: `health-logs/{petId}/{date}/stool-{id}.jpg` ou `health-logs/{petId}/{date}/exam-{id}.jpg`

**Exemplos de arquivos:**
- Fotos de fezes (para análise veterinária)
- Fotos de feridas/machucados
- Fotos de comportamento anormal
- Documentos de exames rápidos
- Registros visuais de saúde

---

### 2. **products** ou **produtos** ⭐⭐ (RECOMENDADO)

**Uso**: Documentos e fotos de produtos usados (medicamentos, vacinas, preventivos)

**Por quê?**
- Separar documentos de produtos dos documentos veterinários gerais
- Certificados de vacinas
- Prescrições de medicamentos
- Fotos de embalagens de produtos
- Notas fiscais de compra de produtos

**Configuração sugerida:**
- Público: **NÃO** (privado)
- Política: Tutores do pet + admins
- Estrutura: `products/{type}/{productId}/certificado-{id}.pdf`

**Exemplos de arquivos:**
- Certificados de vacinação (já tem campo `documentUrl` em `petVaccinations`)
- Prescrições de medicamentos
- Fotos de embalagens (para referência)
- Notas fiscais de compra
- Instruções de uso de produtos

**Tipos de produtos:**
- `vaccines/` - Certificados de vacinação
- `medications/` - Prescrições e documentos de medicamentos
- `preventives/` - Documentos de antipulgas, vermífugos

---

### 3. **health-evidence** ou **evidencias-saude** ⭐ (OPCIONAL)

**Uso**: Evidências visuais de saúde (mais específico que health-logs)

**Por quê?**
- Fotos de fezes para análise
- Fotos de feridas
- Fotos de comportamento
- Vídeos de comportamentos anormais

**Configuração sugerida:**
- Público: **NÃO** (privado)
- Política: Tutores do pet + admins
- Estrutura: `health-evidence/{petId}/{category}/{date}/foto-{id}.jpg`

**Categorias:**
- `stool/` - Fotos de fezes
- `wounds/` - Fotos de feridas
- `behavior/` - Vídeos/fotos de comportamento
- `symptoms/` - Fotos de sintomas

---

## 📊 COMPARAÇÃO COM BUCKETS EXISTENTES

| Bucket | Uso Específico | Diferenciação |
|--------|----------------|---------------|
| **documents** | Documentos veterinários formais | Certificados, exames, prescrições oficiais |
| **health-logs** | Registros diários com evidências | Fotos de fezes, feridas, comportamentos |
| **products** | Documentos de produtos usados | Certificados de vacina, prescrições, embalagens |
| **daycare-photos** | Fotos do dia a dia na creche | Fotos sociais, atividades |
| **pets** | Fotos gerais do pet | Galeria, fotos de perfil |

---

## 🎯 RECOMENDAÇÃO FINAL

### Criar agora (Alta prioridade):
1. ✅ **products** - Para documentos de produtos (vacinas, medicamentos)
   - Já existe campo `documentUrl` em `petVaccinations`
   - Facilita organização

### Criar depois (Média prioridade):
2. ⭐ **health-logs** - Para registros de saúde com evidências visuais
   - Útil se implementar fotos de fezes
   - Separa registros diários de documentos formais

### Opcional (Baixa prioridade):
3. ⭐ **health-evidence** - Se quiser separar ainda mais as evidências visuais
   - Pode usar `health-logs` para tudo

---

## 📋 ESTRUTURA SUGERIDA

### Bucket "products":
```
products/
  ├── vaccines/
  │   └── {vaccineId}/
  │       └── certificado-{id}.pdf
  ├── medications/
  │   └── {medicationId}/
  │       └── prescricao-{id}.pdf
  └── preventives/
      └── {preventiveId}/
          └── documento-{id}.pdf
```

### Bucket "health-logs":
```
health-logs/
  └── {petId}/
      └── {date}/
          ├── stool-{id}.jpg
          ├── wound-{id}.jpg
          └── behavior-{id}.mp4
```

---

## ✅ CONCLUSÃO

**Recomendação**: Criar o bucket **"products"** agora.

**Motivos**:
- Já existe uso no código (`petVaccinations.documentUrl`)
- Organiza melhor documentos de produtos
- Separa de documentos veterinários gerais

**health-logs** pode ser criado depois, quando implementar fotos de fezes/evidências visuais.


