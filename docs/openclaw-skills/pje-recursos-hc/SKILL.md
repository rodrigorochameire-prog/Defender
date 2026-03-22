---
name: pje-recursos-hc
description: Monitora recursos (RESE, apelação, agravo) e habeas corpus interpostos pelo defensor em 2ª instância (TJBA) e tribunais superiores (STJ, STF). Notifica quando houver pauta de julgamento, decisão, acórdão ou qualquer movimentação nova. Use quando o usuário perguntar sobre recursos, HC, apelações, ou pedir para monitorar casos em grau recursal.
user-invocable: true
---

# Skill: Monitoramento de Recursos e Habeas Corpus

Você monitora recursos e habeas corpus interpostos pelo Defensor Público Rodrigo Rocha Meire (9ª DP, DPE-BA, Camaçari) em tribunais de 2ª instância e superiores, notificando sobre qualquer novidade relevante.

## Tribunais monitorados

| Tribunal | Sistema | URL |
|---|---|---|
| TJBA (2ª instância) | PJe | https://pje2i.tjba.jus.br/pje/login.seam |
| STJ | e-STJ (consulta pública) | https://processo.stj.jus.br/processo/pesquisa/ |
| STF | e-STF (consulta pública) | https://portal.stf.jus.br/processos/ |

## Tipos de processo monitorados

- **RESE** — Recurso em Sentido Estrito (contra pronúncia, rejeição de denúncia, etc.)
- **Apelação Criminal** — contra sentença condenatória
- **Agravo Regimental / Interno** — contra decisão monocrática no TJBA/STJ
- **Habeas Corpus** — impetrado no TJBA, STJ ou STF
- **Embargos de Declaração** — opostos a acórdão
- **Recurso Especial / Extraordinário** — STJ/STF

## Arquivo de controle dos recursos

Mantenha a lista de recursos monitorados em:
```
~/.openclaw/recursos-monitorados.json
```

Formato:
```json
{
  "recursos": [
    {
      "id": "hc-tjba-001",
      "tipo": "Habeas Corpus",
      "tribunal": "TJBA",
      "numero": "8001234-11.2024.8.05.0000",
      "assistido": "João Pedro Santos",
      "assunto": "Excesso de prazo — prisão preventiva",
      "dataInterposicao": "2024-06-10",
      "ultimaMovimentacao": "2024-06-15",
      "ultimoEvento": "Distribuído ao Desembargador Relator",
      "status": "aguardando_julgamento"
    },
    {
      "id": "rese-tjba-002",
      "tipo": "RESE",
      "tribunal": "TJBA",
      "numero": "0002777-06.2012.8.05.0039",
      "assistido": "Adailton Portugal",
      "assunto": "Recurso contra pronúncia",
      "dataInterposicao": "2023-03-20",
      "ultimaMovimentacao": "2023-04-01",
      "ultimoEvento": "Aguardando inclusão em pauta",
      "status": "aguardando_pauta"
    }
  ],
  "ultimaVerificacao": "2026-03-22T10:00:00"
}
```

### Status possíveis:
- `aguardando_distribuicao` — ainda não foi distribuído ao relator
- `aguardando_julgamento` — distribuído, pendente de pauta
- `aguardando_pauta` — incluído em pauta, data não definida
- `pautado` — tem data de julgamento marcada
- `julgado` — acórdão publicado
- `transitado` — trânsito em julgado

---

## Como adicionar um novo recurso ao monitoramento

Quando o usuário disser "monitora esse HC" ou "acompanha esse recurso", colete:
1. Número do processo no tribunal (formato CNJ do TJBA ou número do STJ/STF)
2. Tipo (HC, RESE, Apelação, etc.)
3. Nome do assistido
4. Assunto resumido

Adicione ao `recursos-monitorados.json` e confirme:
> "Adicionado. Vou verificar o processo X no TJBA e te avisar quando houver novidade."

---

## Verificação no TJBA (2ª instância)

O TJBA usa PJe 2ª instância em: https://pje2i.tjba.jus.br/pje/login.seam

Login: mesmas credenciais (`PJE_CPF` + `PJE_SENHA`).

Para cada recurso no TJBA da lista:

1. Acesse o processo pelo número
2. Verifique:
   - Há novos documentos desde `ultimaMovimentacao`?
   - O processo foi incluído em pauta?
   - Há data de julgamento marcada?
   - Saiu decisão/acórdão?
3. Compare com o `ultimoEvento` registrado
4. Se mudou → notifique e atualize o registro

**O que mais importa detectar no TJBA:**
- Inclusão em pauta de julgamento (com data!)
- Decisão monocrática do relator
- Acórdão publicado
- Pedido de vista / adiamento
- Solicitação de informações ao juízo de origem

---

## Verificação no STJ (consulta pública)

URL: https://processo.stj.jus.br/processo/pesquisa/

Não requer login — consulta pública via browser.

Para cada processo no STJ:
1. Acesse a URL de busca
2. Pesquise pelo número (ex: HC 123456 / SP)
3. Extraia:
   - Relator atual
   - Última movimentação (data + descrição)
   - Se há data de julgamento na pauta
   - Se há acórdão disponível

**O que mais importa no STJ:**
- Pedido de informações deferido → juízo terá prazo para responder
- Liminar concedida ou negada
- Inclusão na pauta da Turma
- Acórdão publicado

---

## Verificação no STF (consulta pública)

URL: https://portal.stf.jus.br/processos/

Não requer login — consulta pública.

Para cada processo no STF:
1. Busque pelo número (ex: HC 123456 / BA)
2. Extraia relator, situação, últimas movimentações, pauta

**O que mais importa no STF:**
- Distribuição a Ministro relator
- Liminar
- Pauta do plenário ou turma
- Repercussão geral reconhecida/negada

---

## Eventos que geram notificação imediata

Alguns eventos são urgentes e devem ser notificados imediatamente, independente do horário:

| Evento | Urgência | Motivo |
|---|---|---|
| Julgamento pautado (com data) | ALTA | Pode precisar de sustentação oral |
| Liminar concedida | ALTA | Soltar o assistido ou cumprir determinação |
| Liminar negada | MÉDIA | Informar a família / avaliar novo remédio |
| Pedido de informações ao juízo | MÉDIA | Acompanhar resposta do juízo de origem |
| Acórdão publicado | MÉDIA | Verificar resultado, prazo para embargos |
| Pedido de vista | BAIXA | Adiamento — atualizar expectativa |

---

## Formato das notificações

### Notificação urgente (pauta ou liminar):
```
[URGENTE] HC 8001234 — TJBA

Joao Pedro Santos
Excesso de prazo — prisao preventiva

PAUTADO PARA JULGAMENTO: 28/03/2026 (sexta)
Turma: 1a Camara Criminal
Relator: Des. Nome do Relator

Considere sustentacao oral — prazo para inscricao: 24/03/2026
```

### Notificação normal:
```
[Recursos] Novidade — HC 8001234 TJBA

Assistido: Joao Pedro Santos
Evento: Pedido de informacoes deferido
Data: 22/03/2026

O juizo de origem tem 10 dias para responder.
Acompanhe a resposta do juizo.
```

### Relatório periódico (sem novidades):
```
[Recursos] Verificacao concluida — 22/03/2026 10h

Monitorados: 8 recursos/HCs
Sem novidades desde a ultima verificacao.

Pendentes de julgamento:
- HC 8001234 (TJBA) — Joao Pedro Santos
- RESE 0002777 (TJBA) — Adailton Portugal
- HC 99.999 (STJ) — Maria da Silva
```

---

## Frequência recomendada

| Situação | Frequência |
|---|---|
| Monitoramento padrão | 2x ao dia (9h e 16h) |
| Recurso pautado para breve | A cada 2 horas |
| HC com liminar pendente | A cada hora |

Configure no OpenClaw:
```
# 2x ao dia — dias úteis
0 9,16 * * 1-5 openclaw run "verifica recursos e HCs e notifica se houver novidades"
```

---

## Relatório semanal

Toda segunda-feira às 8h, gere um relatório completo:

```
[Recursos] Relatorio semanal — 24/03/2026

AGUARDANDO JULGAMENTO (3):
1. HC 8001234 TJBA — Joao Pedro Santos
   Excesso de prazo | Interposto: 10/06/2024 | 285 dias pendente
   Ultimo evento: Incluido em pauta (sem data)

2. RESE 0002777 TJBA — Adailton Portugal
   Contra pronuncia | Interposto: 20/03/2023 | 731 dias pendente
   Ultimo evento: Aguardando relator

3. HC 99.999 STJ — Maria da Silva
   Regime fechado indevido | Interposto: 15/01/2026 | 66 dias pendente
   Ultimo evento: Pedido de informacoes ao juizo

JULGADOS NA SEMANA (1):
- Apelacao 8003312 TJBA — Jeferson da Cruz
  Resultado: PROVIDO em parte — pena reduzida
  Acórdão disponivel no Drive: Processos - Júri/Jeferson da Cruz/
```

---

## Integração com a skill pje-bahia

Quando um recurso for julgado com acórdão disponível:
1. Baixe automaticamente o acórdão usando a skill `pje-bahia`
2. Salve na pasta do assistido no Drive
3. Notifique o usuário com o resultado

---

## Configuração — variáveis de ambiente

Em `~/.openclaw/openclaw.json`:

```json
{
  "skills": {
    "entries": {
      "pje-recursos-hc": {
        "enabled": true,
        "env": {
          "PJE_CPF": "SEU_CPF_AQUI",
          "PJE_SENHA": "SUA_SENHA_AQUI",
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
