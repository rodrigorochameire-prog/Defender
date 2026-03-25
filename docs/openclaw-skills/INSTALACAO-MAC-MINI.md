# Guia de Instalação — OpenClaw no Mac Mini
## DPE-BA 9ª DP — Agente Jurídico Autônomo

Este guia cobre a instalação completa do OpenClaw num Mac Mini dedicado,
desde a formatação até as skills em funcionamento.

---

## 1. Preparação do Mac Mini

### 1.1 Formatar o Mac Mini (macOS limpo)

1. Reinicie segurando **⌘ + R** para entrar no Recovery Mode
2. Vá em **Utilitário de Disco** → selecione o disco interno → **Apagar**
   - Nome: `Macintosh HD`
   - Formato: `APFS`
3. Volte ao Recovery → **Reinstalar macOS**
4. Siga o assistente de instalação

### 1.2 Configurações iniciais de segurança

Após instalar o macOS:

```
Ajustes de Sistema → Privacidade e Segurança → FileVault → Ativar
```
Guarde a chave de recuperação em local seguro (não no próprio Mac).

```
Ajustes de Sistema → Compartilhamento → desativar TUDO exceto:
  ✓ Acesso Remoto (SSH) — para administração remota do MacBook
```

Crie um usuário dedicado (não use o admin para o dia a dia):
```bash
# No Terminal (como admin):
sudo dscl . -create /Users/openclaw
sudo dscl . -create /Users/openclaw UserShell /bin/zsh
sudo dscl . -create /Users/openclaw RealName "OpenClaw Agent"
sudo dscl . -create /Users/openclaw UniqueID 502
sudo dscl . -create /Users/openclaw PrimaryGroupID 20
sudo dscl . -create /Users/openclaw NFSHomeDirectory /Users/openclaw
sudo dscl . -passwd /Users/openclaw SENHA_FORTE_AQUI
sudo createhomedir -c -u openclaw
```

### 1.3 Acesso remoto via SSH (do MacBook)

No Mac Mini:
```bash
# Gerar chave SSH para o usuário openclaw
sudo -u openclaw ssh-keygen -t ed25519 -C "openclaw@macmini"
```

No MacBook, adicione a chave pública:
```bash
ssh-copy-id openclaw@IP_DO_MAC_MINI
# ou copie manualmente para ~/.ssh/authorized_keys no Mac Mini
```

Teste a conexão:
```bash
ssh openclaw@IP_DO_MAC_MINI
```

---

## 2. Instalar dependências

Conecte via SSH ou abra o Terminal no Mac Mini como usuário `openclaw`.

### 2.1 Homebrew

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Adicione ao PATH (Apple Silicon):
```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
source ~/.zprofile
```

### 2.2 Node.js (versão 22+)

```bash
brew install node@22
echo 'export PATH="/opt/homebrew/opt/node@22/bin:$PATH"' >> ~/.zprofile
source ~/.zprofile
node --version   # deve mostrar v22.x.x
```

### 2.3 Git

```bash
brew install git
git --version
```

---

## 3. Instalar o OpenClaw

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

Após a instalação, rode o onboarding:

```bash
openclaw onboard
```

No assistente:
- **Provedor de modelo**: escolha `Anthropic`
- **API Key**: cole sua `ANTHROPIC_API_KEY`
- **Canal padrão**: `iMessage` (recomendado para Mac Mini)

Verifique que o gateway está rodando:
```bash
openclaw status
# Gateway running on port 18789
```

---

## 4. Instalar o Google Drive for Desktop

1. Baixe em: https://www.google.com/drive/download/
2. Instale e faça login com `rodrigorochameire@gmail.com`
3. Nas configurações do Drive for Desktop:
   - **Modo de streaming**: desative — use **Espelhado** (Mirror)
   - Isso garante que os arquivos fiquem disponíveis offline no Mac Mini
4. Aguarde a sincronização inicial (pode demorar dependendo do volume)
5. Verifique o ponto de montagem:

```bash
ls ~/Meu\ Drive/1\ -\ Defensoria\ 9ª\ DP/
# deve listar: Processos - Júri, Processos - VVD, etc.
```

---

## 5. Instalar as skills

### 5.1 Clonar o repositório Defender

```bash
git clone https://github.com/SEU_USUARIO/Defender.git ~/defender-skills
```

> Se o repositório for privado, configure primeiro uma chave SSH do GitHub:
> ```bash
> ssh-keygen -t ed25519 -C "openclaw@macmini-dpe"
> cat ~/.ssh/id_ed25519.pub
> # Adicione essa chave em github.com → Settings → SSH Keys
> ```

### 5.2 Copiar as skills para o OpenClaw

```bash
mkdir -p ~/.openclaw/skills

cp -r ~/defender-skills/docs/openclaw-skills/pje-bahia          ~/.openclaw/skills/
cp -r ~/defender-skills/docs/openclaw-skills/pje-monitoramento  ~/.openclaw/skills/
cp -r ~/defender-skills/docs/openclaw-skills/pje-recursos-hc    ~/.openclaw/skills/
cp -r ~/defender-skills/docs/openclaw-skills/solar-atendimentos ~/.openclaw/skills/
```

Verifique se foram reconhecidas:
```bash
openclaw skills list
# deve mostrar: pje-bahia, pje-monitoramento, pje-recursos-hc, solar-atendimentos
```

---

## 6. Configurar credenciais

**ATENÇÃO**: Este arquivo contém senhas. Nunca faça commit nem compartilhe.

```bash
nano ~/.openclaw/openclaw.json
```

Cole e preencha:

```json
{
  "model": {
    "provider": "anthropic",
    "name": "claude-sonnet-4-6"
  },
  "heartbeat": {
    "every": "0m",
    "isolatedSession": true,
    "lightContext": true
  },
  "thinking": {
    "type": "disabled"
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "anthropic/claude-sonnet-4-6",
        "fallbacks": ["anthropic/claude-haiku-4-5"]
      },
      "bootstrapMaxChars": 8000,
      "bootstrapTotalMaxChars": 80000
    }
  },
  "channels": {
    "imessage": {
      "enabled": true,
      "address": "SEU_EMAIL_ICLOUD@icloud.com"
    }
  },
  "skills": {
    "entries": {
      "pje-bahia": {
        "enabled": true,
        "env": {
          "PJE_CPF": "00000000000",
          "PJE_SENHA": "SUA_SENHA_PJE",
          "OMBUDS_WEBHOOK_URL": "https://ombuds.vercel.app"
        }
      },
      "pje-monitoramento": {
        "enabled": true,
        "env": {
          "PJE_CPF": "00000000000",
          "PJE_SENHA": "SUA_SENHA_PJE",
          "NOTIF_IMESSAGE": "SEU_EMAIL_ICLOUD@icloud.com",
          "NOTIF_WHATSAPP": "5571999999999",
          "EVOLUTION_API_URL": "https://evolution-api-production-2994.up.railway.app",
          "EVOLUTION_API_KEY": "SUA_API_KEY_EVOLUTION"
        }
      },
      "pje-recursos-hc": {
        "enabled": true,
        "env": {
          "PJE_CPF": "00000000000",
          "PJE_SENHA": "SUA_SENHA_PJE",
          "NOTIF_IMESSAGE": "SEU_EMAIL_ICLOUD@icloud.com",
          "NOTIF_WHATSAPP": "5571999999999",
          "EVOLUTION_API_URL": "https://evolution-api-production-2994.up.railway.app",
          "EVOLUTION_API_KEY": "SUA_API_KEY_EVOLUTION"
        }
      },
      "solar-atendimentos": {
        "enabled": true,
        "env": {
          "SOLAR_LOGIN": "rodrigo.meire",
          "SOLAR_SENHA": "SUA_SENHA_SOLAR",
          "NOTIF_IMESSAGE": "SEU_EMAIL_ICLOUD@icloud.com",
          "NOTIF_WHATSAPP": "5571999999999",
          "EVOLUTION_API_URL": "https://evolution-api-production-2994.up.railway.app",
          "EVOLUTION_API_KEY": "SUA_API_KEY_EVOLUTION"
        }
      }
    }
  }
}
```

Proteja o arquivo:
```bash
chmod 600 ~/.openclaw/openclaw.json
```

---

## 7. Configurar o iMessage

Para o OpenClaw enviar mensagens via iMessage do Mac Mini:

1. No Mac Mini, abra o app **Mensagens**
2. Faça login com seu Apple ID (`rodrigorochameire@gmail.com` ou ID Apple pessoal)
3. Ative iMessage: Mensagens → Ajustes → iMessage → ativar
4. Teste manualmente: envie uma mensagem para si mesmo
5. Confirme que o endereço em `NOTIF_IMESSAGE` no `openclaw.json` é o mesmo Apple ID

---

## 8. Rodar o OpenClaw como serviço permanente

Para que o OpenClaw inicie automaticamente e fique rodando 24h:

```bash
# Criar o arquivo de serviço launchd
cat > ~/Library/LaunchAgents/ai.openclaw.gateway.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>ai.openclaw.gateway</string>
  <key>ProgramArguments</key>
  <array>
    <string>/opt/homebrew/bin/openclaw</string>
    <string>start</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>/Users/openclaw/.openclaw/logs/gateway.log</string>
  <key>StandardErrorPath</key>
  <string>/Users/openclaw/.openclaw/logs/gateway-error.log</string>
</dict>
</plist>
EOF

# Criar pasta de logs
mkdir -p ~/.openclaw/logs

# Ativar o serviço
launchctl load ~/Library/LaunchAgents/ai.openclaw.gateway.plist
launchctl start ai.openclaw.gateway

# Verificar status
launchctl list | grep openclaw
```

---

## 9. Teste final

Com tudo instalado, teste cada skill via iMessage ou direto no terminal:

```bash
# Teste via CLI
openclaw chat "qual é minha agenda de atendimentos hoje no Solar?"
openclaw chat "tem alguma intimação nova no PJe?"
openclaw chat "verifica os recursos e HCs pendentes"
```

Via iMessage: envie as mesmas mensagens para o número/email do Mac Mini.

---

## 10. Manutenção

### Atualizar as skills (quando houver mudanças no repositório):

```bash
cd ~/defender-skills && git pull
cp -r docs/openclaw-skills/pje-bahia          ~/.openclaw/skills/
cp -r docs/openclaw-skills/pje-monitoramento  ~/.openclaw/skills/
cp -r docs/openclaw-skills/pje-recursos-hc    ~/.openclaw/skills/
cp -r docs/openclaw-skills/solar-atendimentos ~/.openclaw/skills/
openclaw restart
```

### Ver logs em tempo real:

```bash
tail -f ~/.openclaw/logs/gateway.log
```

### Reiniciar o OpenClaw:

```bash
openclaw restart
# ou via launchctl:
launchctl stop ai.openclaw.gateway
launchctl start ai.openclaw.gateway
```

### Verificar se está rodando (do MacBook via SSH):

```bash
ssh openclaw@IP_DO_MAC_MINI "openclaw status"
```

---

## 11. Integração com Claude Code (MacBook)

Para que o Claude Code no MacBook possa acionar o OpenClaw no Mac Mini:

### 11.1 SSH Tunnel (rede local ou Tailscale)

```bash
# No MacBook, abra um túnel para o gateway do OpenClaw no Mac Mini:
ssh -N -L 18789:127.0.0.1:18789 openclaw@IP_DO_MAC_MINI
```

Ou instale Tailscale em ambas as máquinas para acesso sempre-ativo sem gerenciar túneis.

### 11.2 Instalar o MCP Bridge (openclaw-mcp)

No MacBook, instale o servidor MCP que conecta Claude Code ao OpenClaw:

```bash
npm install -g @freema/openclaw-mcp
```

### 11.3 Configurar no Claude Code

Adicione ao `.claude/mcp.json` do projeto Defender:

```json
{
  "mcpServers": {
    "openclaw": {
      "command": "npx",
      "args": ["@freema/openclaw-mcp"],
      "env": {
        "OPENCLAW_BASE_URL": "http://127.0.0.1:18789",
        "OPENCLAW_GATEWAY_TOKEN": "SEU_TOKEN_GATEWAY",
        "OPENCLAW_AGENT_ID": "main"
      }
    }
  }
}
```

### 11.4 Uso no Claude Code

Com o MCP configurado, o Claude Code pode:
- Enviar comandos ao OpenClaw: "verifica o PJe", "qual a agenda do Solar?"
- Acionar skills remotamente: pje-bahia, pje-monitoramento, etc.
- Verificar status do agente no Mac Mini

### 11.5 Segurança

- O gateway do OpenClaw NUNCA deve ser exposto à internet
- Use sempre SSH tunnel ou Tailscale
- O token do gateway deve ter `chmod 600` no arquivo de config
- Quem tem acesso ao gateway controla tudo que o agente pode fazer

---

## 12. Otimização de Custos

### Config otimizada (já aplicada no openclaw.json acima)

| Parâmetro | Valor | Economia |
|-----------|-------|----------|
| Modelo padrão | Sonnet 4.6 (não Opus) | ~80% por chamada |
| Fallback | Haiku 4.5 | ~95% por chamada |
| Heartbeat | Desativado (`"0m"`) | ~$30-100/mês |
| Thinking | Desabilitado | 10-50x menos tokens |
| Bootstrap | 8K/80K (era 20K/150K) | ~40% menos contexto |
| Crons | 1x/dia (não a cada 30min) | ~90% menos chamadas |

### Custo estimado mensal

| Cenário | Custo |
|---------|-------|
| Opus para tudo + cron agressivo | $200-500+ |
| **Config otimizada (atual)** | **$10-30** |

### Limites de gasto (OBRIGATÓRIO)

1. Acesse console.anthropic.com → Settings → Limits
2. Defina cap mensal: $50 (recomendado)
3. Configure alerta em 75% ($37.50)
4. Use API key separada para o OpenClaw (diferente do Claude Code)

### Monitoramento

```bash
# Ver uso de ontem
openclaw usage --yesterday

# Ver uso detalhado
openclaw usage --full
```

---

## Resumo — checklist de instalação

```
[ ] macOS reinstalado do zero
[ ] FileVault ativado
[ ] Usuário `openclaw` criado
[ ] SSH configurado (acesso do MacBook)
[ ] Homebrew instalado
[ ] Node.js 22+ instalado
[ ] OpenClaw instalado e onboarding concluído
[ ] Google Drive for Desktop instalado e sincronizado
[ ] Pasta ~/Meu Drive/1 - Defensoria 9ª DP/ acessível
[ ] Skills copiadas para ~/.openclaw/skills/
[ ] openclaw.json configurado com credenciais
[ ] chmod 600 ~/.openclaw/openclaw.json
[ ] iMessage configurado e testado
[ ] Serviço launchd ativo (openclaw roda no boot)
[ ] Teste final: agenda, PJe e recursos respondendo
[ ] SSH tunnel ou Tailscale configurado para Claude Code
[ ] MCP bridge (openclaw-mcp) instalado no MacBook
[ ] .claude/mcp.json atualizado com openclaw
[ ] Limites de gasto configurados na Anthropic Console
```
