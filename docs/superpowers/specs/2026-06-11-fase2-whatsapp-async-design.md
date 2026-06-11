# Fase 2 — WhatsApp Chat → Assíncrono via Daemon

**Data:** 2026-06-11 · **Programa:** [Zero API Paga](./2026-06-11-programa-zero-api-paga-overview.md) · **Status:** Desenho (impl. após Fase 1)

## Objetivo

Tirar os 2 call-sites Sonnet de `src/lib/trpc/routers/whatsapp-chat.ts` (respostas de chat em tempo real) e roteá-los pelo daemon. O chat passa de **síncrono** (resposta no mesmo request) para **assíncrono** (usuário vê "digitando…", resposta chega via WhatsApp quando o daemon termina).

## Arquitetura

```
[WhatsApp webhook] --enqueue(skill=whatsapp-reply, priority=10, source=whatsapp,
                            prompt=contexto+mensagens recentes)--> claude_code_tasks
[Daemon Mini] claude -p --> JSON {resposta, ...}
[Subscriber server-side (Inngest/Realtime)] observa task completed
        --> envia resposta pela API do WhatsApp
```

### Decisões

- **Quem envia a resposta:** um **subscriber no app** (não o daemon) — mantém credenciais do WhatsApp no app. Opções: (a) função Inngest disparada por evento na conclusão; (b) endpoint que o daemon chama via webhook ao concluir `source=whatsapp`. **Recomendado (a)** se já houver canal Realtime server-side; senão (b).
- **Contexto da conversa:** o prompt carrega as N últimas mensagens da thread (já disponíveis no router) — o `claude -p` é stateless por tarefa.
- **Prioridade 10** (interativo) — fura fila de lote, mas atrás de nada interativo mais antigo.

## Skill

`whatsapp-reply` (nova): persona de atendimento do gabinete + **FORMATO JSON** `{ resposta: string, encaminhar_humano?: boolean, motivo?: string }`.

## UX

- "digitando…" / indicador de processamento enquanto `pending/processing`.
- Latência esperada: segundos (tempo do `claude -p`). Aceitável para atendimento assíncrono.
- `needs_review`/`failed` → encaminhar para humano (não responder errado).

## Riscos

| Risco | Mitigação |
|---|---|
| Latência alta em pico | cap+prioridade da Fase 1; lote nunca bloqueia chat |
| Resposta errada sem revisão | `encaminhar_humano` + tratamento de `needs_review` |
| Perda de contexto | incluir histórico recente no prompt |
| Mini fora | mensagem fica `pending`; sem resposta automática até voltar (avaliar SLA) |
