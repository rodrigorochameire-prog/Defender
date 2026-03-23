---
name: pje-mni
description: Acessa o PJe via MNI (Modelo Nacional de Interoperabilidade) usando SOAP/WS-Security com certificado digital A1 via PKCS#11 (SafeNet). Consulta avisos pendentes, processos e documentos programaticamente sem browser. Use quando precisar acessar o PJe por API/webservice em vez de browser.
homepage: https://pje.tjba.jus.br/pje/intercomunicacao?wsdl
user-invocable: true
---

# Skill: PJe MNI (Modelo Nacional de Interoperabilidade)

Acessa o webservice SOAP do PJe do TJ-BA via MNI, autenticando com certificado digital A1 (PKCS#11 / SafeNet) e assinatura WS-Security.

## Vantagens sobre acesso via browser

| Aspecto | Browser (pje-bahia) | MNI (pje-mni) |
|---------|---------------------|----------------|
| Autenticação | CPF + senha | Certificado digital A1 |
| Velocidade | Lento (renderiza HTML) | Rápido (XML direto) |
| Confiabilidade | Sessão expira, DOM muda | API estável |
| Automação | Frágil (scraping) | Robusta (WSDL) |
| Downloads | Um por um via UI | Batch via API |

## Pré-requisitos

### No Mac Mini (arm64):

```bash
# SafeNet Authentication Client 10.9 (arm64 nativo)
# Já instalado — fornece /usr/local/lib/libeTPkcs11.dylib

# Ruby + gems necessárias
brew install ruby
gem install nokogiri     # Canonicalização XML (C14N)
gem install pkcs11       # Acesso ao token PKCS#11
gem install savon        # Cliente SOAP (opcional, para descoberta WSDL)
```

### Certificado digital

- **Titular**: RODRIGO ROCHA MEIRE:04849830404
- **Token**: SafeNet eToken (USB)
- **Driver PKCS#11**: `/usr/local/lib/libeTPkcs11.dylib`
- **Slot**: 0 (padrão)
- **PIN**: variável de ambiente `PKCS11_PIN`

## Operações MNI disponíveis

| Operação | Descrição |
|----------|-----------|
| `consultarAvisosPendentes` | Lista intimações/avisos não lidos |
| `consultarProcesso` | Metadados completos de um processo |
| `consultarTeorComunicacao` | Conteúdo de uma comunicação/intimação |
| `entregarManifestacaoProcessual` | Peticionamento (NÃO USAR — somente leitura!) |

**IMPORTANTE**: Nunca use `entregarManifestacaoProcessual`. O agente tem acesso somente-leitura.

## Endpoint

```
https://pje.tjba.jus.br/pje/intercomunicacao?wsdl
```

## Uso

```bash
# Consultar avisos pendentes
ruby ~/.openclaw/skills/pje-mni/scripts/consulta.rb

# Com PIN explícito (se não estiver em variável de ambiente)
PKCS11_PIN=123456 ruby ~/.openclaw/skills/pje-mni/scripts/consulta.rb
```

## Configuração — variáveis de ambiente

Edite `~/.openclaw/openclaw.json`:

```json
{
  "skills": {
    "entries": {
      "pje-mni": {
        "enabled": true,
        "env": {
          "PKCS11_PIN": "PIN_DO_TOKEN",
          "PKCS11_LIB": "/usr/local/lib/libeTPkcs11.dylib"
        }
      }
    }
  }
}
```

**Segurança**: nunca exiba ou registre em log o PIN do token.
