# Configuração do WhatsApp Business API (Meta)

Este guia explica como configurar a integração com o WhatsApp Business API oficial da Meta.

## Vantagens da API Oficial

- ✅ **Funciona com Vercel** - 100% serverless, sem servidor dedicado
- ✅ **Oficial e Confiável** - Suportado diretamente pela Meta
- ✅ **Gratuito para começar** - 1.000 conversas/mês grátis
- ✅ **Templates aprovados** - Mensagens proativas sem bloqueio
- ✅ **Alta disponibilidade** - SLA da Meta

## Pré-requisitos

1. Conta no Facebook Business Manager
2. Número de telefone que não está registrado no WhatsApp pessoal
3. Acesso ao Meta for Developers

## Passo a Passo

### 1. Criar App no Meta for Developers

1. Acesse [developers.facebook.com](https://developers.facebook.com)
2. Clique em **"Criar App"**
3. Selecione **"Empresa"** como tipo de app
4. Dê um nome (ex: "TeteCare WhatsApp")
5. Selecione sua conta Business

### 2. Adicionar Produto WhatsApp

1. No painel do app, clique em **"Adicionar Produtos"**
2. Encontre **"WhatsApp"** e clique em **"Configurar"**
3. Siga o assistente de configuração

### 3. Configurar Número de Teste

Para desenvolvimento, você pode usar o número de teste gratuito:

1. Vá em **WhatsApp > API Setup**
2. Use o número de teste fornecido
3. Adicione números para receber mensagens em **"To"**

### 4. Obter Credenciais

Na página **WhatsApp > API Setup**, copie:

| Campo | Variável de Ambiente |
|-------|---------------------|
| Temporary access token | `WHATSAPP_ACCESS_TOKEN` |
| Phone number ID | `WHATSAPP_PHONE_NUMBER_ID` |
| WhatsApp Business Account ID | `WHATSAPP_BUSINESS_ACCOUNT_ID` |

### 5. Configurar no Vercel

1. Acesse seu projeto no [Vercel Dashboard](https://vercel.com)
2. Vá em **Settings > Environment Variables**
3. Adicione as variáveis:

```
WHATSAPP_ACCESS_TOKEN=EAAxxxxx...
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_BUSINESS_ACCOUNT_ID=123456789012345
```

4. Clique em **Save**
5. Faça um novo deploy (ou aguarde o próximo push)

## Token de Acesso Permanente

O token temporário expira em 24h. Para produção, crie um token permanente:

1. Vá em **Configurações do App > Básico**
2. Anote o **App ID** e **App Secret**
3. Vá em **Business Settings > System Users**
4. Crie um System User com permissão de Admin
5. Gere um token com as permissões:
   - `whatsapp_business_management`
   - `whatsapp_business_messaging`

## Criar Templates de Mensagem

Templates são obrigatórios para mensagens proativas (fora da janela de 24h):

1. Vá em **WhatsApp > Message Templates**
2. Clique em **Create Template**
3. Preencha:
   - **Name**: `tetecare_pet_checkin`
   - **Category**: `UTILITY`
   - **Language**: `Portuguese (BR)`
   - **Body**: 
     ```
     Olá {{1}}! 🐾

     O(a) {{2}} acabou de fazer check-in na TeteCare!

     Qualquer novidade, entraremos em contato.
     ```
4. Envie para aprovação (pode levar até 24h)

### Templates Sugeridos para TeteCare

| Nome | Categoria | Uso |
|------|-----------|-----|
| `tetecare_pet_checkin` | UTILITY | Check-in do pet |
| `tetecare_pet_checkout` | UTILITY | Check-out do pet |
| `tetecare_vaccine_reminder` | UTILITY | Lembrete de vacina |
| `tetecare_booking_confirmation` | UTILITY | Confirmação de reserva |
| `tetecare_booking_reminder` | UTILITY | Lembrete de reserva |
| `tetecare_daily_update` | MARKETING | Atualização do mural |

## Webhooks (Opcional)

Para receber mensagens e status de entrega:

1. Vá em **WhatsApp > Configuration**
2. Configure a **Callback URL**: `https://seu-app.vercel.app/api/whatsapp/webhook`
3. Defina o **Verify Token**: mesmo valor de `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
4. Selecione os eventos:
   - `messages`
   - `message_status`

## Limites e Preços

### Tier Gratuito
- 1.000 conversas/mês grátis
- Conversas iniciadas pelo usuário: grátis
- Conversas iniciadas por você: contam no limite

### Preços (Brasil)
- Utility: ~R$ 0,15/conversa
- Marketing: ~R$ 0,35/conversa
- Authentication: ~R$ 0,12/conversa

## Troubleshooting

### Erro: "Message failed to send"
- Verifique se o número está no formato correto (55DDDNUMERO)
- Confirme que o token não expirou
- Verifique se o número está na lista de teste (em desenvolvimento)

### Erro: "Template not found"
- Aguarde aprovação do template (até 24h)
- Verifique o nome exato do template
- Confirme o idioma (pt_BR)

### Erro: "Outside 24h window"
- Use templates para mensagens proativas
- Mensagens de texto só funcionam em resposta (24h)

## Links Úteis

- [Documentação Oficial](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [API Reference](https://developers.facebook.com/docs/whatsapp/cloud-api/reference)
- [Templates Guide](https://developers.facebook.com/docs/whatsapp/message-templates)
- [Webhooks Guide](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks)
- [Pricing](https://developers.facebook.com/docs/whatsapp/pricing)
