# OpenClaw Skills — DPE-BA 7ª Regional

Skills para o agente OpenClaw rodando no Mac Mini dedicado.

## Estrutura

```
docs/openclaw-skills/
└── pje-bahia/
    └── SKILL.md    ← skill de acesso ao PJe do TJ-BA
```

## Setup do Mac Mini (após formatar)

### 1. Instalar OpenClaw

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

### 2. Onboarding (API key Anthropic)

```bash
openclaw onboard
# Escolher: Anthropic / Claude
# Informar a ANTHROPIC_API_KEY
```

### 3. Montar Google Drive

- Instalar **Google Drive for Desktop**: https://www.google.com/drive/download/
- Fazer login com a conta `rodrigorochameire@gmail.com`
- Verificar que o Drive está montado em `~/Google Drive/Meu Drive/`
- Criar a pasta: `~/Google Drive/Meu Drive/7ª Regional DPE-BA/Processos PJe/`

### 4. Instalar a skill PJe

```bash
# Clonar o repositório (ou copiar só a pasta da skill)
git clone https://github.com/SEU_USUARIO/Defender.git /tmp/defender

# Copiar skill para o diretório do OpenClaw
cp -r /tmp/defender/docs/openclaw-skills/pje-bahia ~/.openclaw/skills/
```

### 5. Configurar credenciais

Editar `~/.openclaw/openclaw.json`:

```json
{
  "skills": {
    "entries": {
      "pje-bahia": {
        "enabled": true,
        "env": {
          "PJE_CPF": "00000000000",
          "PJE_SENHA": "sua_senha_pje",
          "OMBUDS_WEBHOOK_URL": "https://ombuds.vercel.app"
        }
      }
    }
  }
}
```

### 6. Testar

```bash
openclaw
# Diga: "busca o processo 8000301-52.2023.8.05.0044 no PJe"
```

## Segurança

- O arquivo `openclaw.json` contém credenciais — nunca commitar no git
- O Mac Mini deve ter disco encriptado (FileVault ativado)
- Criar usuário dedicado `openclaw` sem acesso a outros dados pessoais
- Desativar login remoto exceto SSH com chave (sem senha)

## Próximas skills planejadas

- `pje-monitoramento` — verificar novas intimações periodicamente e notificar via iMessage
- `ombuds-sync` — sincronizar metadados do Drive com o OMBUDS via webhook
