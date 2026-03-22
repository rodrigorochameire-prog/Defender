---
name: solar-atendimentos
description: Verifica no Solar DPEBA os atendimentos agendados para o defensor, listando datas, horários, assistidos e tipos de atendimento. Notifica sobre atendimentos do dia e do dia seguinte. Use quando o usuário perguntar sobre agenda, atendimentos marcados, pauta do dia ou quiser saber o que tem agendado.
user-invocable: true
---

# Skill: Solar — Atendimentos Agendados

Você acessa o Solar DPEBA para verificar a agenda de atendimentos do Defensor Público Rodrigo Rocha Meire (9ª DP, Camaçari).

## Atenção — características do Solar

O Solar é um SPA em **AngularJS 1.x**. Isso significa:
- **Nunca use `networkidle`** para aguardar carregamento — a página nunca atinge esse estado
- Use sempre `domcontentloaded` + `wait_for_timeout` de 2–3 segundos após cada navegação
- Interações com campos devem atualizar o modelo Angular via `scope.$apply()`, não via digitação direta
- A sessão expira com frequência — esteja preparado para relogar

## Autenticação no Solar

URL: https://solar.defensoria.ba.def.br

Credenciais via variáveis de ambiente:
- `SOLAR_LOGIN` — login institucional (ex: rodrigo.meire)
- `SOLAR_SENHA` — senha do Solar

### Processo de login:

1. Acesse https://solar.defensoria.ba.def.br no browser (perfil: `openclaw`)
2. Aguarde 3 segundos após carregar (AngularJS)
3. Preencha o campo de usuário e senha
4. Clique em "Entrar"
5. Aguarde mais 3 segundos para o painel carregar

Se aparecer modal de "sessão já ativa", feche e continue.

## Onde ficam os atendimentos agendados

Após logar, navegue para a agenda de atendimentos:

1. Menu lateral → **Atendimento** → **Agenda**
   ou acesse diretamente: `https://solar.defensoria.ba.def.br/atendimento/agenda`

2. A agenda mostra os atendimentos por data. Verifique:
   - **Hoje** — atendimentos do dia atual
   - **Amanhã** — atendimentos do próximo dia útil
   - **Semana** — visão semanal se disponível

## O que extrair de cada atendimento

Para cada atendimento na agenda, colete:

```
- Data e horário
- Nome do assistido
- Tipo de atendimento (inicial, retorno, plantão, audiência)
- Situação (agendado, confirmado, cancelado)
- Observações (se houver)
- Número de processo vinculado (se houver)
```

## Verificação de novos agendamentos

Mantenha estado em `~/.openclaw/solar-agenda-estado.json`:

```json
{
  "ultimaVerificacao": "2026-03-22T10:00:00",
  "atendimentosVistos": [
    "2026-03-25T09:00:joao-pedro-santos",
    "2026-03-25T10:30:maria-aparecida"
  ]
}
```

Notifique apenas atendimentos **novos** (não vistos antes) ou **alterados** (horário/status mudou).

## Notificações

### Resumo diário (toda manhã às 7h30):

```
[Solar] Agenda de hoje — 22/03/2026 (domingo)

Sem atendimentos agendados para hoje.

Amanha (seg 23/03):
- 09h00 — João Pedro Santos (retorno)
- 10h30 — Maria Aparecida da Silva (inicial)
- 14h00 — Carlos Eduardo Ramos (audiencia — 1a Vara Criminal)
- 15h30 — [2 atendimentos restantes]
```

### Novo atendimento agendado:

```
[Solar] Novo atendimento agendado

Data: 25/03/2026 — 09h00
Assistido: Ana Carolina dos Santos
Tipo: Atendimento inicial
Observacao: Violência doméstica — medida protetiva urgente
```

### Lembrete (1 hora antes):

```
[Solar] Lembrete — daqui 1 hora

09h00 — João Pedro Santos (retorno)
Processo: 8000301-52.2023.8.05.0044
```

## Verificação manual sob demanda

Quando o usuário perguntar "o que tenho hoje?", "tem atendimento amanhã?" ou similar:

1. Acesse o Solar
2. Extraia os atendimentos do período pedido
3. Responda diretamente, sem salvar estado:

```
Hoje (22/03 — domingo): sem atendimentos.

Amanha (23/03):
09h00 — Joao Pedro Santos (retorno)
10h30 — Maria Aparecida (inicial)
14h00 — Carlos Eduardo (audiencia)
Total: 3 atendimentos
```

## Agendamento das verificações

Configure no OpenClaw:

```
# Resumo diário às 7h30 (dias úteis)
30 7 * * 1-5 openclaw run "verifica atendimentos do dia no Solar e me manda o resumo"

# Lembrete 1h antes do primeiro atendimento
# (disparado dinamicamente após o resumo matinal)

# Verificação de novos agendamentos: 2x ao dia
0 12,17 * * 1-5 openclaw run "verifica se há novos atendimentos agendados no Solar"
```

## Integração com outros sistemas

Quando um atendimento tiver processo vinculado:
- Consulte o PJe pelo número (skill `pje-bahia`) para trazer contexto atualizado antes do atendimento
- Inclua no lembrete: últimas movimentações, próximo prazo

Exemplo de lembrete enriquecido:
```
[Solar] Lembrete — daqui 1 hora

09h00 — Joao Pedro Santos
Processo: 8000301-52.2023.8.05.0044

Contexto PJe (atualizado agora):
- Última movimentação: Intimação expedida (20/03)
- Prazo: 05/04/2026
- Status: Aguardando resposta da defesa
```

## Tratamento de erros

- **Solar fora do ar**: comum — tente 3 vezes com intervalo de 2 min antes de desistir
- **Sessão expirada**: relogar automaticamente
- **Agenda vazia**: pode ser feriado ou fim de semana — informe normalmente
- **AngularJS não carregou**: aguarde mais 5 segundos e tente novamente; se falhar, informe o usuário

## Configuração — variáveis de ambiente

Em `~/.openclaw/openclaw.json`:

```json
{
  "skills": {
    "entries": {
      "solar-atendimentos": {
        "enabled": true,
        "env": {
          "SOLAR_LOGIN": "rodrigo.meire",
          "SOLAR_SENHA": "SUA_SENHA_SOLAR",
          "NOTIF_IMESSAGE": "seu.email@icloud.com",
          "NOTIF_WHATSAPP": "5571999999999",
          "EVOLUTION_API_URL": "https://evolution-api-production-2994.up.railway.app",
          "EVOLUTION_API_KEY": "SUA_API_KEY_AQUI"
        }
      }
    }
  }
}
```
