# Onboarding Tour + Drive Per-User — Spec

**Data:** 2026-03-29
**Prioridade:** Próxima sessão (pré-requisito para onboarding real)
**Status:** Documentado, não implementado

---

## 1. Visão Geral

Dois sistemas interligados:

1. **Tour de primeiro acesso** — Apresentação guiada do app no primeiro login
2. **Drive individual** — Cada defensor vincula seu Google Drive pessoal

O Drive é o coração: dele saem documentos, processos, enrichment. Sem Drive vinculado, o sistema funciona mas perde potência. O tour precisa explicar isso.

---

## 2. Tour de Primeiro Acesso

### Quando ativa
- Após o defensor ativar conta via `/convite/[token]` (auto-login)
- Flag `onboardingCompleted: boolean` no user (default false)
- Se false → redireciona para `/admin/onboarding` ao invés de `/admin/dashboard`

### Estrutura do tour (tela cheia, passo a passo)

```
Passo 1 — Boas-vindas
┌─────────────────────────────────────────────────┐
│                                                 │
│     Bem-vindo ao OMBUDS, [Nome]!               │
│                                                 │
│     Você está na [Comarca] como [Área(s)]      │
│                                                 │
│     Vamos configurar tudo em 3 minutos.        │
│                                                 │
│               [ Começar → ]                     │
│                                                 │
└─────────────────────────────────────────────────┘

Passo 2 — Visão geral do sistema
┌─────────────────────────────────────────────────┐
│                                                 │
│  O OMBUDS organiza sua atuação:                │
│                                                 │
│  📋 Demandas — Suas intimações e prazos        │
│     (kanban visual, arrastar para mudar status) │
│                                                 │
│  👤 Assistidos — Seus assistidos e processos    │
│     (cadastro, documentos, histórico)           │
│                                                 │
│  📅 Agenda — Audiências e compromissos          │
│     (sincroniza com Google Calendar)            │
│                                                 │
│  📁 Drive — Todos os documentos do caso         │
│     (sincroniza com seu Google Drive)           │
│                                                 │
│           [ ← Voltar ]  [ Próximo → ]           │
│                                                 │
└─────────────────────────────────────────────────┘

Passo 3 — Módulos da sua área (dinâmico por areasPrincipais)

Se CRIMINAL:
│  🔴 Criminal — Delitos tipificados, cálculo de │
│     benefícios (ANPP, sursis, transação)        │

Se JURI:
│  🟣 Júri — Cockpit de sessão, jurados,         │
│     quesitos, teses defensivas                  │

Se EP:
│  🟠 Execução Penal — Progressão, cálculo       │

Se VVD:
│  🌹 VVD — Medidas protetivas, MPU              │

Se INFANCIA:
│  🟡 Infância — Atos infracionais, medidas      │
│     socioeducativas, remissão                   │

Se CIVEL/FAMILIA/FAZENDA:
│  🔵 [Área] — Processos e demandas da sua vara  │

Passo 4 — Vincular Google Drive (O MAIS IMPORTANTE)
┌─────────────────────────────────────────────────┐
│                                                 │
│  📁 Vincular seu Google Drive                   │
│                                                 │
│  O Drive é o coração do OMBUDS.                │
│  Documentos, peças, autos — tudo fica          │
│  organizado automaticamente no seu Drive.      │
│                                                 │
│  ⚠️ USE SUA CONTA GOOGLE PESSOAL              │
│  (Gmail). Não use conta funcional/institucional │
│  — elas podem ter restrições de acesso.        │
│                                                 │
│  O que vai acontecer:                          │
│  1. Uma janela do Google abre                  │
│  2. Você autoriza o OMBUDS                     │
│  3. Uma pasta "OMBUDS" é criada no seu Drive   │
│  4. Subpastas por assistido/processo surgem    │
│     automaticamente                             │
│                                                 │
│     [ 🔗 Vincular Google Drive agora ]          │
│                                                 │
│     ou                                          │
│                                                 │
│     [ Fazer depois nas configurações → ]        │
│                                                 │
└─────────────────────────────────────────────────┘

Passo 5 — Vincular Google Sheets (opcional)
┌─────────────────────────────────────────────────┐
│                                                 │
│  📊 Sincronizar com Google Sheets               │
│                                                 │
│  Suas demandas podem ser espelhadas numa        │
│  planilha Google. Edite na planilha e o OMBUDS  │
│  atualiza automaticamente (e vice-versa).      │
│                                                 │
│  Se você já vinculou o Google no passo anterior,│
│  basta clicar:                                  │
│                                                 │
│     [ 📊 Criar minha planilha ]                 │
│                                                 │
│     ou                                          │
│                                                 │
│     [ Pular por agora → ]                       │
│                                                 │
└─────────────────────────────────────────────────┘

Passo 6 — Plano e pagamento
┌─────────────────────────────────────────────────┐
│                                                 │
│  💳 Seu plano                                   │
│                                                 │
│  Plano: [Criminal] — R$ 150/mês               │
│  (ou o que o admin atribuiu)                   │
│                                                 │
│  Pagamento via PIX mensal.                     │
│  Você pode ver e pagar em                      │
│  "Minha Assinatura" no menu.                   │
│                                                 │
│     [ Entendi → ]                               │
│                                                 │
└─────────────────────────────────────────────────┘

Passo 7 — Pronto!
┌─────────────────────────────────────────────────┐
│                                                 │
│  ✅ Tudo configurado!                           │
│                                                 │
│  Dicas rápidas:                                │
│  • Comece cadastrando seu primeiro assistido   │
│  • Ou importe demandas do PJe                  │
│  • Dúvidas? Fale com Rodrigo via WhatsApp      │
│                                                 │
│     [ Ir para o Dashboard → ]                   │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Implementação técnica

```typescript
// users table — novo campo
onboardingCompleted: boolean("onboarding_completed").default(false),

// Após ativar conta (/convite), redirecionar para /admin/onboarding se !onboardingCompleted
// /admin/onboarding é uma página full-screen (sem sidebar) com stepper

// Componente: OnboardingWizard
// - useState para step atual (1-7)
// - Cada step é um componente
// - Step 3 é dinâmico (renderiza baseado em areasPrincipais)
// - Step 4 chama /api/google/auth com state={userId, returnTo="/admin/onboarding?step=5"}
// - Step 5 chama a criação de planilha (se implementado)
// - Step 7 marca onboardingCompleted=true e redireciona para dashboard
```

---

## 3. Google Drive Per-User

### Modelo atual (Rodrigo + Juliane)
- Token global em `google_tokens` (email do Rodrigo)
- Todas as pastas no Drive do Rodrigo
- Juliane acessa via compartilhamento

**Manter assim para Rodrigo (id=1) e Juliane (id=4).**

### Modelo novo (todos os outros)
- Cada defensor faz OAuth do Google → token salvo vinculado ao userId
- Sistema cria pasta raiz "OMBUDS" no Drive do defensor
- Subpastas automáticas:
  ```
  OMBUDS/
  ├── [Nome Assistido 1]/
  │   ├── [Nº Processo]/
  │   │   ├── peças/
  │   │   ├── autos/
  │   │   └── documentos/
  │   └── geral/
  ├── [Nome Assistido 2]/
  │   └── ...
  └── Modelos/
  ```

### Alterações necessárias

#### 3.1 Tabela `user_google_tokens` (mesma do spec sheets)

```sql
CREATE TABLE user_google_tokens (
  id SERIAL PRIMARY KEY,
  user_id integer NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  email text NOT NULL,
  refresh_token text NOT NULL,
  access_token text,
  expires_at timestamptz,
  scopes text[], -- ['drive', 'sheets', 'calendar']
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### 3.2 Modificar OAuth callback

- Receber `userId` via state parameter
- Salvar em `user_google_tokens` (per-user) em vez de `google_tokens` (global)
- Manter `google_tokens` global como fallback para Rodrigo/Juliane

#### 3.3 Modificar Google Drive service

`src/lib/services/google-drive.ts` precisa:
- Receber `userId` como parâmetro
- Buscar token em `user_google_tokens` para esse user
- Fallback para token global se user é Rodrigo (id=1) ou Juliane (id=4)

```typescript
async function getDriveClient(userId: number) {
  // Para Rodrigo e Juliane → token global (já funciona)
  if (userId === 1 || userId === 4) {
    return getGlobalDriveClient();
  }

  // Para todos os outros → token per-user
  const userToken = await db.query.userGoogleTokens.findFirst({
    where: eq(userGoogleTokens.userId, userId),
  });

  if (!userToken) throw new Error("Google Drive não vinculado");

  return createDriveClient(userToken.refreshToken);
}
```

#### 3.4 Criação automática de pasta raiz

Quando defensor vincula Google pela primeira vez:

```typescript
async function createUserDriveStructure(userId: number) {
  const drive = await getDriveClient(userId);
  const user = await getUser(userId);

  // Criar pasta raiz
  const rootFolder = await drive.files.create({
    requestBody: {
      name: `OMBUDS — ${user.name}`,
      mimeType: 'application/vnd.google-apps.folder',
    },
  });

  // Criar subpasta Modelos
  await drive.files.create({
    requestBody: {
      name: 'Modelos',
      mimeType: 'application/vnd.google-apps.folder',
      parents: [rootFolder.data.id],
    },
  });

  // Salvar ID da pasta raiz no user
  await db.update(users).set({
    driveFolderId: rootFolder.data.id,
  }).where(eq(users.id, userId));

  return rootFolder;
}
```

#### 3.5 Campo no user

```sql
ALTER TABLE users ADD COLUMN drive_folder_id varchar(100);
ALTER TABLE users ADD COLUMN google_linked boolean DEFAULT false;
```

### Mensagem importante para o defensor

```
⚠️ USE SUA CONTA GOOGLE PESSOAL (@gmail.com)

Contas institucionais (@defensoria.ba.gov.br) geralmente têm
restrições de armazenamento e acesso que impedem o OMBUDS de
criar pastas e documentos.

Sua conta pessoal garante:
✅ Armazenamento do Google Drive (15GB gratuitos)
✅ Acesso de qualquer dispositivo
✅ Controle total sobre seus documentos
✅ Backup automático

Os documentos são SEUS. O OMBUDS apenas organiza as pastas.
Você pode acessar tudo diretamente pelo Google Drive.
```

---

## 4. Dependências entre os dois sistemas

```
Convite → Ativa conta → Auto-login
  ↓
Onboarding Tour (se !onboardingCompleted)
  ↓
Step 1-3: Boas-vindas + visão geral + módulos
  ↓
Step 4: Vincular Google Drive (OAuth per-user)
  → Cria pasta raiz no Drive do defensor
  ↓
Step 5: Criar planilha Sheets (reutiliza OAuth)
  → Cria planilha com abas por área
  ↓
Step 6-7: Plano + pronto
  → onboardingCompleted = true
  → Redireciona para dashboard
```

## 5. Estimativa

| Task | Tempo |
|------|-------|
| Campo `onboardingCompleted` + `driveFolderId` + `googleLinked` em users | 10min |
| Tabela `user_google_tokens` | 10min |
| Modificar OAuth (per-user via state) | 30min |
| Modificar Google Drive service (per-user + fallback global) | 45min |
| Criação automática de pasta raiz + estrutura | 30min |
| Página `/admin/onboarding` (wizard 7 steps) | 1.5h |
| Step 3 dinâmico por área | 20min |
| Step 4 integração OAuth inline | 30min |
| Step 5 criação de planilha | 30min |
| Redirect pós-ativação para onboarding | 15min |
| Testes | 30min |
| **Total** | **~5.5h** |

## 6. Não fazer agora

- Google Calendar per-user (futuro — hoje só Camaçari usa)
- Migração de pastas existentes (Rodrigo/Juliane mantêm Drive atual)
- Compartilhamento de Drive entre defensores da mesma comarca
- Upload de comprovante de pagamento via Drive
