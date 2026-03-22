# OpenClaw + OMBUDS + Claude Code + Cowork
## Guia Completo de Integração — Março 2026

---

## A Tríade: quem faz o quê

| Ferramenta | Papel | Quando age | Onde roda |
|-----------|-------|-----------|-----------|
| **Claude Code** | Desenvolvedor | Sob demanda, quando você abre o terminal | Seu Mac principal |
| **OpenClaw** | Operador 24/7 | Automaticamente (cron) ou via Telegram | Mac Mini dedicado |
| **Cowork** | Analista jurídico | Sob demanda, quando você abre o desktop | Seu Mac principal |
| **OMBUDS** | Hub central de dados | Sempre online | Vercel + Supabase |

---

## Como o OpenClaw ajuda na construção do OMBUDS

O OpenClaw **não substitui o Claude Code** para escrever código. Mas ele **potencializa o OMBUDS** de três formas:

### 1. Camada de automação que o OMBUDS sozinho não tem

O OMBUDS é uma aplicação web — ele responde quando alguém acessa. Não tem "vida própria". O OpenClaw dá essa vida:

- **Monitoramento de intimações**: cron job a cada 30 min consulta o PJe/JUDIT e, se detectar movimentação nova, atualiza o OMBUDS via webhook e te avisa no Telegram
- **Verificação de prazos**: toda manhã, consulta o banco do OMBUDS e te manda um resumo: "Hoje vencem 3 prazos: processo X (RA), processo Y (alegações finais), processo Z (recurso)"
- **Health check do sistema**: verifica se o OMBUDS está online, se o Railway está respondendo, se o banco está acessível — e te avisa se algo falhar

### 2. Interface móvel via Telegram

Hoje, para consultar algo no OMBUDS, você precisa abrir o navegador. Com o OpenClaw:

- Manda no Telegram: "status do processo 8000301-52.2023.8.05.0044"
- OpenClaw consulta o Supabase, monta um resumo e te responde no Telegram
- Manda: "baixa os autos do processo X" → OpenClaw dispara o Playwright, faz scraping do PJe, salva no Drive, te avisa quando terminar

### 3. Pipeline de dados que alimenta o OMBUDS

O OpenClaw pode rodar scripts que o Claude Code escreveu:

- Script Python de scraping do PJe → Claude Code escreve → OpenClaw executa periodicamente
- Script de enriquecimento via JUDIT API → Claude Code implementa → OpenClaw roda como cron
- Script de backup do Supabase → Claude Code cria → OpenClaw agenda diariamente

---

## Arquitetura Técnica da Integração

```
┌─────────────────────────────────────────────────────────────────┐
│                        SEU MAC PRINCIPAL                         │
│                                                                  │
│   ┌──────────────┐    ┌──────────────┐                          │
│   │  Claude Code  │    │    Cowork    │                          │
│   │  (desenvolve) │    │  (analisa)   │                          │
│   └──────┬───────┘    └──────┬───────┘                          │
│          │                    │                                   │
│          │ git push           │ lê/escreve                       │
│          ▼                    ▼                                   │
│   ┌──────────────┐    ┌──────────────┐                          │
│   │    GitHub     │    │ Google Drive │◄─────────────────────┐   │
│   └──────┬───────┘    └──────────────┘                       │   │
│          │                                                    │   │
└──────────┼────────────────────────────────────────────────────┼───┘
           │ deploy                                             │
           ▼                                                    │
┌──────────────────┐     ┌──────────────────┐                   │
│   OMBUDS/Vercel  │◄───►│  Supabase (DB)   │                   │
│   (app web)      │     │  (PostgreSQL)    │                   │
└────────┬─────────┘     └────────┬─────────┘                   │
         │                         │                             │
         │ webhook                 │ SQL direto                  │
         ▼                         ▼                             │
┌─────────────────────────────────────────────────────────────┐ │
│                      MAC MINI (24/7)                         │ │
│                                                              │ │
│   ┌──────────────────────────────────────────────────────┐  │ │
│   │                    OPENCLAW                           │  │ │
│   │                                                      │  │ │
│   │  Skills:                                             │  │ │
│   │  ├── pje-monitor     (cron: a cada 30min)           │  │ │
│   │  ├── prazos-alerta   (cron: todo dia 7h)            │  │ │
│   │  ├── processo-status  (via Telegram)                 │  │ │
│   │  ├── importar-autos  (via Telegram)                  │  │ │
│   │  ├── health-check    (cron: a cada 5min)            │  │ │
│   │  └── backup-db       (cron: todo dia 2h)            │  │ │
│   │                                                      │  │ │
│   │  Canais:                                             │  │ │
│   │  ├── Telegram (chat direto com você)                │  │ │
│   │  └── Webhook (recebe eventos do OMBUDS)             │  │ │
│   │                                                      │──┘ │
│   │  Ferramentas:                                        │    │
│   │  ├── Browser (Playwright para PJe)                  │    │
│   │  ├── Exec (scripts Python/Node)                     │    │
│   │  └── HTTP (APIs: JUDIT, DataJud, Supabase)          │    │
│   └──────────────────────────────────────────────────────┘    │
│                                                                │
│   ┌──────────────────────────────────────────────────────┐    │
│   │              Railway (enrichment-engine)              │    │
│   │              (scripts Python pesados)                 │    │
│   └──────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────┘
```

---

## Skills OpenClaw para o OMBUDS — Desenho Detalhado

### Skill 1: pje-monitor (monitoramento de intimações)

```yaml
---
name: pje-monitor
description: Monitora movimentações no PJe para processos cadastrados no OMBUDS. Consulta a API JUDIT ou faz scraping direto quando necessário.
---

# PJe Monitor

## Quando executar
Cron job a cada 30 minutos durante horário comercial (7h-20h).

## Workflow
1. Consultar Supabase: SELECT numero_processo FROM processos WHERE ativo = true
2. Para cada processo, consultar JUDIT API (ou DataJud como fallback)
3. Comparar últimas movimentações com as já registradas no OMBUDS
4. Se houver movimentação nova:
   a. Atualizar o processo no Supabase (INSERT na tabela movimentacoes)
   b. Enviar mensagem no Telegram: "Nova movimentação no processo {numero}: {descricao}"
   c. Se for intimação: destacar com urgência e calcular prazo

## Ferramentas necessárias
- HTTP requests (JUDIT API ou Supabase REST)
- Bash/Node para processamento de dados

## Guardrails
- Máximo 50 processos por execução (rate limiting)
- Se JUDIT falhar, tentar DataJud como fallback
- Não tentar scraping automático sem confirmação
```

**Cron job correspondente:**
```bash
openclaw cron add \
  --name "PJe Monitor" \
  --cron "*/30 7-20 * * 1-5" \
  --tz "America/Bahia" \
  --session isolated \
  --message "Execute o skill pje-monitor: consulte os processos ativos no OMBUDS e verifique novas movimentações." \
  --announce \
  --channel telegram \
  --to "telegram:<seu_chat_id>"
```

### Skill 2: prazos-alerta (resumo matinal de prazos)

```yaml
---
name: prazos-alerta
description: Todo dia às 7h, consulta o OMBUDS e envia resumo de prazos do dia e da semana no Telegram.
---

# Alertas de Prazo

## Workflow
1. Consultar Supabase: SELECT * FROM processos WHERE prazo_final BETWEEN hoje AND hoje+7
2. Organizar por urgência: hoje > amanhã > esta semana
3. Para cada processo com prazo, incluir: número, tipo de peça pendente, assistido
4. Formatar mensagem clara e enviar no Telegram

## Formato da mensagem
"Bom dia, Rodrigo! Aqui está seu resumo:

HOJE (urgente):
- Proc. 8000301-52.2023: RA criminal (João Silva)
- Proc. 8000455-11.2024: Alegações finais VVD (Maria Santos)

ESTA SEMANA:
- Proc. 8000122-33.2023: Apelação (vence quinta)

Total: 2 prazos hoje, 1 esta semana."
```

**Cron:**
```bash
openclaw cron add \
  --name "Prazos Matinal" \
  --cron "0 7 * * 1-5" \
  --tz "America/Bahia" \
  --session isolated \
  --message "Execute o skill prazos-alerta." \
  --announce \
  --channel telegram \
  --to "telegram:<seu_chat_id>"
```

### Skill 3: processo-status (consulta via Telegram)

```yaml
---
name: processo-status
description: Quando o usuário perguntar sobre um processo pelo número, consulta o OMBUDS e retorna um resumo completo.
---

# Status de Processo

## Trigger
Mensagem no Telegram contendo número de processo (formato CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO)

## Workflow
1. Extrair número do processo da mensagem
2. Consultar Supabase: SELECT * FROM processos WHERE numero_processo = ?
3. Se encontrado: montar resumo com dados do OMBUDS
4. Se não encontrado no OMBUDS: consultar DataJud para dados básicos
5. Retornar resumo formatado

## Formato
"Processo: 8000301-52.2023.8.05.0044
Assistido: João da Silva
Classe: Ação Penal
Vara: 1ª Vara Criminal de Camaçari
Última movimentação: Juntada de petição (15/03/2026)
Próximo prazo: RA até 22/03/2026
Status no OMBUDS: Em andamento"
```

### Skill 4: importar-autos (download do PJe via Telegram)

```yaml
---
name: importar-autos
description: Baixa os autos completos de um processo do PJe e salva no Google Drive, na pasta do assistido.
---

# Importar Autos do PJe

## Trigger
Mensagem no Telegram: "baixa os autos do processo X" ou "importar processo X"

## Workflow
1. Extrair número do processo
2. Abrir browser controlado (Playwright/CDP)
3. Navegar até o PJe: https://pje.tjba.jus.br
4. Fazer login com credenciais armazenadas (CPF + senha)
5. Buscar o processo pelo número
6. Navegar pelos autos e baixar todos os PDFs
7. Organizar na pasta do Google Drive: /Meu Drive/1 - Defensoria 9ª DP/{assistido}/{processo}/
8. Notificar no Telegram: "Autos baixados com sucesso. X documentos salvos em [link da pasta]"

## Guardrails
- Confirmar com o usuário antes de iniciar (pode demorar)
- Timeout de 10 minutos por processo
- Se login falhar, notificar e não tentar novamente automaticamente
- Delays humanos entre ações (2-5 segundos) para evitar detecção
```

### Skill 5: health-check (monitoramento do sistema)

```yaml
---
name: health-check
description: Verifica se OMBUDS, Railway e Supabase estão funcionando. Alerta no Telegram se algo falhar.
---

# Health Check

## Workflow
1. GET https://ombuds.vercel.app/api/health → esperar 200
2. GET https://enrichment-engine.railway.app/health → esperar 200
3. Consultar Supabase: SELECT 1 → esperar resposta em < 5s
4. Se algum falhar: alerta no Telegram com detalhes
5. Se todos OK: silêncio (só reporta problemas)

## Cron
A cada 5 minutos, 24/7.
```

### Skill 6: webhook-receiver (recebe eventos do OMBUDS)

```yaml
---
name: webhook-receiver
description: Recebe webhooks do OMBUDS quando eventos importantes acontecem (novo processo cadastrado, prazo atualizado, etc.)
---

# Webhook Receiver

## Configuração
Endpoint: POST /hooks/ombuds-event
Token: configurado no OMBUDS e no OpenClaw

## Eventos suportados
- novo_processo: "Novo processo cadastrado: {numero}. Deseja que eu busque dados no DataJud?"
- prazo_atualizado: "Prazo atualizado no processo {numero}: {tipo_prazo} até {data}"
- audiencia_agendada: "Audiência agendada: {numero}, {data}, {vara}"

## Workflow
1. Receber payload do webhook
2. Identificar tipo de evento
3. Formatar mensagem e enviar no Telegram
4. Se for novo_processo: automaticamente consultar DataJud para enriquecimento
```

---

## Fluxo Completo: do cadastro à peça pronta

```
1. Defensor cadastra processo no OMBUDS (web)
   │
   ▼
2. OMBUDS dispara webhook → OpenClaw (Mac Mini)
   │
   ▼
3. OpenClaw automaticamente:
   ├── Consulta DataJud → enriquece metadados no OMBUDS
   ├── Consulta JUDIT → busca movimentações detalhadas
   ├── Baixa documentos do PJe → salva no Drive
   └── Notifica no Telegram: "Processo importado com sucesso"
   │
   ▼
4. Defensor abre Cowork no Mac principal
   ├── Acessa pasta do processo no Drive
   ├── Skill analisa-audiencias: analisa os documentos baixados
   ├── Skill criminal-comum/vvd/juri: gera a peça necessária
   └── Skill protocolar: salva na pasta Protocolar
   │
   ▼
5. OpenClaw detecta prazo se aproximando
   └── Alerta no Telegram: "Prazo de RA vence amanhã!"
```

---

## Plano de Instalação do OpenClaw no Mac Mini

### Pré-requisitos
- Mac Mini com macOS atualizado
- Node.js 24 instalado
- Conta Telegram com bot criado (via @BotFather)
- Chave de API do Claude/OpenAI configurada

### Passo a passo

```bash
# 1. Instalar OpenClaw
npm install -g openclaw@latest

# 2. Instalar como daemon (inicia automaticamente no boot)
openclaw onboard --install-daemon

# 3. Configurar para não dormir
# System Settings > Energy > Prevent automatic sleeping: On
# System Settings > Energy > Restart after power failure: On

# 4. Configurar Telegram
# Criar bot via @BotFather → obter token
# Adicionar ao settings do OpenClaw:
openclaw config set channels.telegram.token "SEU_BOT_TOKEN"

# 5. Configurar variáveis de ambiente
export SUPABASE_URL="https://seu-projeto.supabase.co"
export SUPABASE_KEY="sua-service-key"
export JUDIT_API_KEY="sua-chave-judit"
export ANTHROPIC_API_KEY="sua-chave-claude"

# 6. Criar pasta de skills
mkdir -p ~/.openclaw/skills/pje-monitor
mkdir -p ~/.openclaw/skills/prazos-alerta
mkdir -p ~/.openclaw/skills/processo-status
mkdir -p ~/.openclaw/skills/importar-autos
mkdir -p ~/.openclaw/skills/health-check

# 7. Copiar os SKILL.md para cada pasta (conteúdo acima)

# 8. Verificar skills carregados
openclaw skills list

# 9. Configurar cron jobs
# (usar os comandos openclaw cron add listados acima)

# 10. Configurar webhooks
# No settings.json do OpenClaw:
# hooks.enabled = true
# hooks.token = "token-seguro"

# 11. Configurar o OMBUDS para enviar webhooks ao OpenClaw
# No código do OMBUDS (Claude Code faz isso):
# Quando novo processo é cadastrado → POST http://mac-mini-ip:18789/hooks/agent
```

### Acesso remoto (Tailscale recomendado)

```bash
# Instalar Tailscale no Mac Mini e no Mac principal
# Isso cria uma rede privada entre suas máquinas
# O OpenClaw fica acessível via tailscale-ip:18789
# Sem precisar abrir portas no roteador
```

---

## O que o Claude Code precisa construir no OMBUDS

Para que a integração com OpenClaw funcione, o Claude Code precisa implementar no OMBUDS:

1. **Endpoint de webhook outbound**: quando um processo é cadastrado/atualizado, OMBUDS faz POST para o OpenClaw
2. **API REST pública para consulta**: endpoint que o OpenClaw possa chamar para obter dados de processos
3. **Tabela de movimentações**: para o OpenClaw gravar novas movimentações detectadas
4. **Campo de credenciais PJe por usuário**: CPF + senha criptografados no banco
5. **Tabela de prazos**: com campos data_prazo, tipo_prazo, processo_id — para o skill prazos-alerta consultar

---

## Cronograma sugerido

| Semana | O que fazer | Quem faz |
|--------|------------|----------|
| 1 | Instalar OpenClaw no Mac Mini + configurar Telegram | Você (com guia acima) |
| 1 | Testar JUDIT API com processos reais | OpenClaw (skill manual via Telegram) |
| 2 | Criar skill processo-status (consulta Supabase) | Claude Code escreve o SKILL.md |
| 2 | Criar skill health-check | Claude Code escreve o SKILL.md |
| 3 | Implementar webhook outbound no OMBUDS | Claude Code no codebase |
| 3 | Criar skill pje-monitor (com JUDIT API) | Claude Code escreve o SKILL.md |
| 4 | Criar skill prazos-alerta | Claude Code escreve o SKILL.md |
| 5-6 | Criar skill importar-autos (Playwright + PJe) | Claude Code escreve o SKILL.md |
| 7-8 | Testes e ajustes de toda a integração | Você + Claude Code + OpenClaw |

---

*Documento gerado em 22/03/2026*
