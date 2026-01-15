# Guia de Configuração do Google Cloud Platform

Este guia explica como configurar a integração do DefensorHub com o Google Drive e Google Calendar.

## Visão Geral

As integrações permitem:
- **Google Drive**: Criar pastas automaticamente para cada processo
- **Google Calendar**: Criar eventos de prazos, audiências e júris

## Passo 1: Criar Projeto no Google Cloud

1. Acesse o [Google Cloud Console](https://console.cloud.google.com)
2. Clique em **Selecionar projeto** > **Novo projeto**
3. Nome: `DefensorHub`
4. Clique em **Criar**

## Passo 2: Ativar as APIs

1. No menu lateral, vá em **APIs e Serviços** > **Biblioteca**
2. Busque e ative:
   - **Google Drive API**
   - **Google Calendar API**
   - **Google Docs API** (opcional, para templates)

## Passo 3: Configurar Tela de Consentimento OAuth

1. Vá em **APIs e Serviços** > **Tela de consentimento OAuth**
2. Selecione **Interno** (se for G Suite) ou **Externo**
3. Preencha:
   - Nome do app: `DefensorHub`
   - E-mail de suporte: seu e-mail
   - E-mails do desenvolvedor: seu e-mail
4. Clique em **Salvar e continuar**
5. Em **Escopos**, adicione:
   - `https://www.googleapis.com/auth/drive.file`
   - `https://www.googleapis.com/auth/calendar`
6. Clique em **Salvar e continuar**

## Passo 4: Criar Credenciais OAuth 2.0

1. Vá em **APIs e Serviços** > **Credenciais**
2. Clique em **Criar credenciais** > **ID do cliente OAuth**
3. Tipo de aplicativo: **Aplicativo da Web**
4. Nome: `DefensorHub Web`
5. URIs de redirecionamento autorizados:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://defensor-hub.vercel.app/api/auth/callback/google`
6. Clique em **Criar**
7. **Anote o Client ID e Client Secret**

## Passo 5: Obter Refresh Token

O refresh token permite que o sistema acesse sua conta sem pedir login toda vez.

### Opção A: Usando o OAuth Playground (Recomendado)

1. Acesse o [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. Clique no ícone de engrenagem (⚙️) no canto superior direito
3. Marque **Use your own OAuth credentials**
4. Cole o **Client ID** e **Client Secret**
5. Feche as configurações
6. No painel esquerdo, selecione:
   - **Drive API v3** > `https://www.googleapis.com/auth/drive.file`
   - **Calendar API v3** > `https://www.googleapis.com/auth/calendar`
7. Clique em **Authorize APIs**
8. Faça login com sua conta Google
9. Clique em **Exchange authorization code for tokens**
10. **Copie o Refresh Token**

### Opção B: Via Script (Avançado)

```bash
# Instalar ferramenta
npm install -g google-auth-cli

# Executar autenticação
google-auth --client-id=SEU_CLIENT_ID --client-secret=SEU_CLIENT_SECRET \
  --scope="https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/calendar"
```

## Passo 6: Configurar Pasta Raiz no Drive

1. Acesse o [Google Drive](https://drive.google.com)
2. Crie uma pasta chamada `DefensorHub` (ou o nome que preferir)
3. Dentro dela, crie subpastas por área:
   - `Júri`
   - `Execução Penal`
   - `Violência Doméstica`
   - `Substituição`
4. Copie o ID da pasta principal:
   - Abra a pasta
   - Na URL: `https://drive.google.com/drive/folders/[ESTE_É_O_ID]`
   - Copie apenas o ID

## Passo 7: Configurar Variáveis de Ambiente

No arquivo `.env.local`, adicione:

```env
# Google Cloud
GOOGLE_CLIENT_ID="seu-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="seu-client-secret"
GOOGLE_REFRESH_TOKEN="seu-refresh-token"

# Google Drive
GOOGLE_DRIVE_ROOT_FOLDER_ID="id-da-pasta-raiz"

# Google Calendar (use 'primary' para o calendário principal)
GOOGLE_CALENDAR_ID="primary"
```

## Passo 8: Testar a Integração

Após configurar, reinicie o servidor:

```bash
npm run dev
```

Ao criar um novo processo, o sistema automaticamente:
1. Criará uma pasta no Drive
2. Salvará o link da pasta no registro do processo

Ao criar um novo prazo, o sistema:
1. Criará um evento no calendário
2. Configurará lembretes automáticos

## Estrutura de Pastas Criadas

Quando um processo é criado, a estrutura será:

```
DefensorHub/
├── Júri/
│   └── Diego Bonfim - 8012906-74.2025.8.05.0039/
│       ├── 01 - Documentos Pessoais/
│       ├── 02 - Peças Protocoladas/
│       ├── 03 - Decisões e Sentenças/
│       ├── 04 - Audiências/
│       └── 05 - Outros/
├── Execução Penal/
│   └── ...
└── ...
```

## Cores dos Eventos no Calendário

| Cor | Significado |
|-----|-------------|
| 🔴 Vermelho | Réu preso (prioridade máxima) |
| 🟠 Laranja | Prazo urgente |
| 🔵 Azul | Audiência |
| 🟣 Roxo | Sessão do Júri |
| 🟢 Verde | Evento padrão |

## Troubleshooting

### Erro: "Invalid grant"
- O refresh token expirou ou foi revogado
- Gere um novo refresh token seguindo o Passo 5

### Erro: "Quota exceeded"
- Você atingiu o limite de requisições
- Aguarde alguns minutos e tente novamente

### Pasta não é criada
- Verifique se a API do Drive está ativada
- Verifique se o refresh token tem o escopo correto

### Evento não aparece no calendário
- Verifique se a API do Calendar está ativada
- Verifique se o GOOGLE_CALENDAR_ID está correto

## Segurança

⚠️ **Importante**:
- Nunca compartilhe o `client_secret` ou `refresh_token`
- Essas credenciais dão acesso à sua conta Google
- Em produção, use variáveis de ambiente seguras (Vercel, etc.)
