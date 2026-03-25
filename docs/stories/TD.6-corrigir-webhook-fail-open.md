# Story TD.6: Corrigir Webhook Drive Fail-Open

## Status: Draft

## Descricao

Como desenvolvedor do OMBUDS, eu quero que o webhook do Google Drive valide corretamente o secret de autenticacao e rejeite requisicoes sem credenciais validas, para que atacantes nao possam injetar eventos falsos no sistema de sincronizacao de documentos.

## Contexto

O webhook do Google Drive esta configurado com um fallback `""` (string vazia) para o secret de autenticacao (INFRA-002). Quando a variavel de ambiente com o secret nao esta definida, o fallback faz com que a validacao do webhook efetivamente nao exista — qualquer requisicao e aceita como legitima. Isso permite injecao de eventos falsos de sincronizacao, potencialmente corrompendo o estado de documentos no Drive ou disparando processamentos indevidos.

**Severidade:** MEDIUM (mas correcao rapida — incluida na Wave 1)
**Debito:** INFRA-002

## Criterios de Aceitacao

- [ ] Webhook do Drive rejeita requisicoes sem secret valido (HTTP 401 ou 403)
- [ ] Aplicacao falha com erro claro se a variavel de ambiente do webhook secret nao estiver definida (fail-closed)
- [ ] Requisicoes legitimas do Google Drive continuam sendo processadas normalmente
- [ ] Log de rejeicao para requisicoes invalidas (para monitoramento)

## Tarefas Tecnicas

- [ ] 1. Localizar o handler do webhook do Google Drive no codigo Next.js (provavelmente em `src/app/api/` ou `pages/api/`)
- [ ] 2. Identificar o fallback `""` na leitura do secret de autenticacao
- [ ] 3. Substituir fallback `""` por validacao que lanca erro se env var ausente
- [ ] 4. Garantir que a comparacao do secret usa timing-safe comparison (`crypto.timingSafeEqual` ou equivalente)
- [ ] 5. Retornar HTTP 401/403 para requisicoes sem secret valido
- [ ] 6. Adicionar log de warning para requisicoes rejeitadas
- [ ] 7. Verificar que a variavel de ambiente do webhook secret esta configurada no Vercel
- [ ] 8. Testar com requisicao valida (secret correto) — deve processar
- [ ] 9. Testar com requisicao invalida (sem secret ou secret errado) — deve rejeitar

## File List

- `src/app/api/webhooks/drive/route.ts` (ou path equivalente) — corrigir fail-open
- Vercel env vars — verificar que webhook secret esta configurado

## Estimativa

1 hora

## Dependencias

- Nenhuma dependencia tecnica
- Requer que a variavel de ambiente do webhook secret esteja configurada no Vercel
- Requer que o secret esteja configurado no Google Cloud Console (webhook subscription)

## Notas

- O padrao fail-open e extremamente perigoso em webhooks — qualquer pessoa que descubra a URL do endpoint pode injetar eventos.
- Usar `crypto.timingSafeEqual` para comparacao de secrets previne timing attacks:
  ```typescript
  import { timingSafeEqual } from 'crypto';

  const secret = process.env.DRIVE_WEBHOOK_SECRET;
  if (!secret) throw new Error('DRIVE_WEBHOOK_SECRET is required');

  const provided = req.headers.get('x-webhook-secret');
  if (!provided || !timingSafeEqual(Buffer.from(secret), Buffer.from(provided))) {
    return new Response('Unauthorized', { status: 401 });
  }
  ```
- Verificar tambem se ha outros webhooks no sistema com o mesmo padrao fail-open (ex: Inngest, Stripe, etc.).
- Esta correcao e independente e pode ser feita em paralelo com qualquer outra story da Wave 1.
