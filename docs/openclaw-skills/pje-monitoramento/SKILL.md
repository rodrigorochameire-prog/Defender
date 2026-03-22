---
name: pje-monitoramento
description: Monitora periodicamente o PJe do TJ-BA em busca de novas intimações e movimentações nos processos do defensor. Notifica via iMessage/WhatsApp e salva documentos novos no Google Drive. Use quando o usuário quiser ativar o monitoramento automático ou verificar se há intimações pendentes.
homepage: https://pje.tjba.jus.br
user-invocable: true
---

# Skill: PJe Monitoramento

Você monitora o PJe do TJ-BA para o Defensor Público Rodrigo Rocha Meire (9ª DP, Camaçari), verificando novas intimações e movimentações nos processos, notificando proativamente e salvando documentos no Google Drive.

## Dois modos de uso

### Modo manual (sob demanda)
O usuário pede: "tem alguma intimação nova no PJe?" ou "verifica o PJe"
→ Você abre o PJe agora, verifica o painel e responde imediatamente.

### Modo automático (agendado)
Ativado pelo usuário: "monitora o PJe a cada 2 horas" ou "me avisa quando tiver intimação"
→ Você agenda uma tarefa recorrente usando o scheduler do OpenClaw.

---

## Autenticação

Mesmas credenciais da skill `pje-bahia`:
- `PJE_CPF` — CPF do defensor (apenas números)
- `PJE_SENHA` — senha do PJe

Use o perfil de browser `openclaw` para não interferir com a sessão pessoal do usuário.

---

## O que verificar no painel do PJe

Após logar em https://pje.tjba.jus.br/pje/login.seam, o painel principal mostra:

1. **Caixa de tarefas** — intimações pendentes aguardando ciência
2. **Processos com movimentação recente** — novos documentos ou despachos
3. **Prazos** — processos com prazo próximo ao vencimento

Para cada item encontrado, colete:
- Número do processo
- Tipo de movimentação (intimação, despacho, sentença, decisão)
- Data
- Texto resumido (se visível no painel)
- Se há prazo associado e qual a data limite

---

## Estado entre execuções

Para não notificar a mesma intimação duas vezes, mantenha um arquivo de estado:

```
~/.openclaw/pje-estado.json
```

Formato:
```json
{
  "ultimaVerificacao": "2026-03-22T10:00:00",
  "intimacoesVistas": [
    "8000301-52.2023.8.05.0044:2026-03-20:intimacao",
    "8001234-11.2024.8.05.0044:2026-03-18:despacho"
  ]
}
```

**Lógica:**
1. Leia o estado atual
2. Verifique o PJe
3. Compare com `intimacoesVistas`
4. Notifique apenas as **novas** (não vistas antes)
5. Atualize o estado com as novas + timestamp

```bash
# Ler estado
cat ~/.openclaw/pje-estado.json 2>/dev/null || echo '{"ultimaVerificacao":"","intimacoesVistas":[]}'

# Atualizar estado após verificação
cat > ~/.openclaw/pje-estado.json << 'EOF'
{estado_atualizado}
EOF
```

---

## Como notificar

Use as variáveis de ambiente para escolher o canal:

| Variável | Canal |
|---|---|
| `NOTIF_IMESSAGE` | iMessage (número ou email Apple) |
| `NOTIF_WHATSAPP` | WhatsApp (via Evolution API do OMBUDS) |
| `NOTIF_OMBUDS` | Webhook OMBUDS |

### iMessage (padrão — Mac Mini):

```bash
osascript -e "tell application \"Messages\"
  set targetService to 1st service whose service type = iMessage
  set targetBuddy to buddy \"$NOTIF_IMESSAGE\" of targetService
  send \"$MENSAGEM\" to targetBuddy
end tell"
```

### WhatsApp (via Evolution API):

```bash
curl -X POST "$EVOLUTION_API_URL/message/sendText/ombuds" \
  -H "apikey: $EVOLUTION_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"number\": \"$NOTIF_WHATSAPP\",
    \"text\": \"$MENSAGEM\"
  }"
```

### Formato da mensagem de notificação:

```
[PJe] Nova intimacao

Processo: 8000301-52.2023.8.05.0044
Assistido: Joao Pedro Santos
Tipo: Intimacao para audiencia
Data: 22/03/2026
Prazo: 05/04/2026

Responda "importa esse processo" para baixar os documentos.
```

Se houver múltiplas intimações, agrupe em uma única mensagem:

```
[PJe] 3 novas movimentacoes

1. 8000301-52.2023 — Intimacao (prazo: 05/04)
2. 8001234-11.2024 — Despacho (22/03)
3. 8002345-99.2023 — Sentenca (21/03)

Responda com o numero do processo para importar.
```

---

## Modo automático — agendamento

Para agendar verificação periódica, use o scheduler nativo do OpenClaw:

O usuário diz: "verifica o PJe a cada 2 horas"
→ Configure um cron interno:

```
# Verificar PJe a cada 2 horas (dias úteis, 7h às 19h)
0 7-19/2 * * 1-5 openclaw run "verifica intimações no PJe e notifica se houver novidades"
```

Sugestões de frequência para o usuário:
- **A cada 2 horas** — recomendado para uso diário (não sobrecarrega o PJe)
- **A cada 30 minutos** — para dias com audiência ou prazo crítico
- **Uma vez ao dia** (7h) — monitoramento leve

Informe ao usuário a frequência configurada e como desativar:
> "Monitoramento ativo: verifico o PJe a cada 2 horas nos dias úteis (7h–19h). Para pausar, diga 'pausa monitoramento PJe'."

---

## Fluxo completo — verificação manual

Quando o usuário pedir "verifica o PJe" ou similar:

1. "Verificando o PJe..."
2. Login silencioso
3. Acessa o painel de tarefas/intimações
4. Lê o estado anterior (`pje-estado.json`)
5. Identifica movimentações novas
6. **Se houver novidades:**
   - Notifica (iMessage ou WhatsApp conforme configurado)
   - Salva documentos novos no Drive (se o usuário tiver pedido "baixa também")
   - Atualiza o estado
   - Responde com o resumo
7. **Se não houver:**
   - Responde: "Nenhuma movimentação nova desde [data da última verificação]."
   - Atualiza o timestamp no estado

---

## Tratamento de erros

- **PJe fora do ar**: tente novamente em 15 min; notifique o usuário se falhar 3 vezes seguidas
- **Login falhou**: notifique o usuário imediatamente — pode indicar senha alterada ou bloqueio
- **Painel vazio / sem itens**: normal; registre no estado e não notifique
- **iMessage não disponível**: fallback para WhatsApp; se ambos indisponíveis, salve notificação em `~/.openclaw/pje-notificacoes-pendentes.txt`

---

## Configuração — variáveis de ambiente

Edite `~/.openclaw/openclaw.json`:

```json
{
  "skills": {
    "entries": {
      "pje-monitoramento": {
        "enabled": true,
        "env": {
          "PJE_CPF": "SEU_CPF_AQUI",
          "PJE_SENHA": "SUA_SENHA_AQUI",
          "NOTIF_IMESSAGE": "seu.email@icloud.com",
          "NOTIF_WHATSAPP": "5571999999999",
          "EVOLUTION_API_URL": "https://evolution-api-production-2994.up.railway.app",
          "EVOLUTION_API_KEY": "SUA_API_KEY_AQUI",
          "OMBUDS_WEBHOOK_URL": "https://ombuds.vercel.app"
        }
      }
    }
  }
}
```

**Segurança**: nunca exiba ou registre em log `PJE_CPF`, `PJE_SENHA` ou `EVOLUTION_API_KEY`.
