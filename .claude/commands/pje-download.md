# /pje-download - Download de Autos Digitais do PJe

> **Tipo**: Workflow de Scraping
> **Trigger**: "baixar autos", "download pje", "autos digitais", "pje download"

## Pipeline Completo (3 etapas)

### Pré-requisitos
- Arquivo com lista de números de processos (um por linha)
- Sessão agent-browser logada no PJe
- Credenciais em `.env.local`: `PJE_CPF`, `PJE_SENHA`

### Etapa 1: Enfileirar (agent-browser)

```bash
# 1. Abrir sessão e logar
agent-browser --session pjeN open "https://pje.tjba.jus.br/pje/login.seam"
# Logar via fill (keystrokes reais):
source .env.local
SNAP=$(agent-browser --session pjeN snapshot -i)
CPF_REF=$(echo "$SNAP" | grep 'textbox "CPF' | sed -n 's/.*ref=\(e[0-9]*\).*/\1/p')
SENHA_REF=$(echo "$SNAP" | grep 'textbox "Senha' | sed -n 's/.*ref=\(e[0-9]*\).*/\1/p')
ENTRAR_REF=$(echo "$SNAP" | grep 'button "Entrar"' | sed -n 's/.*ref=\(e[0-9]*\).*/\1/p')
agent-browser --session pjeN fill "@$CPF_REF" "$PJE_CPF"
agent-browser --session pjeN fill "@$SENHA_REF" "$PJE_SENHA"
agent-browser --session pjeN click "@$ENTRAR_REF"

# 2. Rodar enfileiramento
PJE_SESSION=pjeN bash scripts/pje_download_v4.sh lista-processos.txt
```

**Fluxo interno (por processo, ~40s):**
1. Painel → click `LayoutTable "Peticionar"` → iframe carrega
2. Busca: `iframe.contentDocument` → fill campos → click searchProcessos
3. Click `a[title="Autos Digitais"]` → main page navega para DetalheProcesso
4. Click `"Ícone de download"` → select "Crescente" → click "Download"
5. Confirmação: "será disponibilizado em Área de Download"
6. Volta para Peticionar → próximo processo

**Configs:**
- Relogin a cada 8 processos (`RELOGIN_EVERY=8`)
- Wait 15s após click Autos + 3 retries
- Retry 3x para encontrar ícone de download
- Output: `~/Desktop/pje-autos-{area}/`

### Etapa 2: Baixar (Playwright)

```bash
python3 scripts/pje_area_download.py
```

**Fluxo:**
1. Login persistente (cookies salvos em `~/.pje-playwright-profile`)
2. Navega para Área de Download
3. Para cada processo com status "Sucesso":
   - Reload página (essencial — iframe fica stale)
   - Encontra botão no iframe cross-origin
   - `expect_download` (estratégia primária, 100% sucesso)
   - Fallback: nova aba S3 → curl | redirect S3 → curl
4. Salva em `~/Desktop/pje-autos-{area}/autos-{numero}.pdf`

**Otimizações aplicadas:**
- CDP `Page.javascriptDialogOpening` → aceita confirm() CNJ
- CDP `Target.setAutoAttach` → controla iframes cross-origin
- Resource blocking (imagens/CSS/fonts) → 6.5x mais rápido
- `domcontentloaded` em vez de `networkidle`
- Route interception → força download de PDFs (não viewer)
- Anti-detection: webdriver, plugins, languages

### Etapa 3: Upload ao Drive

```bash
bash scripts/pje_upload_drive_curl.sh ~/Desktop/pje-autos-juri
```

**Fluxo:**
1. OAuth token via refresh token
2. Para cada PDF: encontra/cria pasta do assistido → cria subpasta `AP {numero}`
3. Upload resumable via curl (suporta 183MB+)
4. Verifica duplicatas antes de upload

**Estrutura no Drive:**
```
Processos - {Área}/
├── {Nome Assistido}/
│   └── {TIPO} {Número}/
│       └── {TIPO} {Número}.pdf
```

## Regras Críticas (NÃO violar)

| Regra | Motivo |
|-------|--------|
| agent-browser para Fase 1 | iframe same-origin, JSF onclick funciona |
| Playwright para Fase 2 | iframe cross-origin, CDP aceita dialogs |
| `ab fill` no Keycloak | JS direto (eval) é rejeitado pelo SSO |
| Relogin a cada 8 processos | JSF ViewState corrompe |
| Reload entre downloads | iframe da Área fica stale |
| `expect_download` antes do click | não depois |
| OAuth para upload (não SA) | Service Account sem storage quota |
| `domcontentloaded` não `networkidle` | JSF AJAX polling trava networkidle |

## Solução de Problemas

| Erro | Causa | Fix |
|------|-------|-----|
| "Você demorou muito" | Keycloak expirou | Fill + click rápido, sem delay |
| NOT FOUND em massa | Sessão JSF corrompida | Relogin |
| AUTOS FAIL | Página não navegou | Aumentar wait, retry |
| no_dl_icon | Snapshot antes do render | Retry 3x com sleep |
| NO S3 na Fase 2 | confirm() bloqueou | Usar Playwright com CDP |
| "storageQuotaExceeded" | SA sem quota | Usar OAuth |
| Pastas "(1)" no Drive | Nome duplicado | Usar pasta existente do assistido |

## Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `scripts/pje_download_v4.sh` | Fase 1: enfileirar via agent-browser |
| `scripts/pje_area_download.py` | Fase 2: baixar via Playwright |
| `scripts/pje_upload_drive_curl.sh` | Fase 3: upload via curl + OAuth |
| `scripts/pje_download_full.py` | Pipeline full Playwright (Fase 1 limitada) |
| `scripts/pje_reorganize_drive.sh` | Reorganizar pastas no Drive |
