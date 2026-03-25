# Escalabilidade do PJe Scraping — Extensão Chrome

## Contexto

O OMBUDS implementa scraping automatizado de processos no PJe via Playwright + `connect_over_cdp`. Essa solução funciona apenas localmente, pois depende de:

1. Chrome aberto com `--remote-debugging-port=9222`
2. Sessão PJe autenticada (login manual + e-CPF)
3. FastAPI rodando na mesma máquina com acesso à porta CDP

Outros defensores (Juliane, Cristiane, Danilo de Camaçari, e futuros colegas de Simões Filho e Salvador) usam OMBUDS via Vercel — o enrichment-engine hospedado não tem acesso ao Chrome local deles.

## Solução Atual (v1) — Playwright Local

- **Serviço**: `enrichment-engine/services/pje_scraper_service.py`
- **Endpoint**: `POST /enrich/pje-scrape`
- **Conexão**: `playwright.chromium.connect_over_cdp("http://localhost:9222")`
- **Controle de acesso**: Flag `pjeScrapingEnabled` no `userSettings` (JSONB)
- **Trigger**: >= 5 intimações novas no modal de importação PJe
- **Impacto para colegas**: Zero — botão invisível quando flag é `false`

### Fluxo v1

```
1. Defensor abre Chrome com --remote-debugging-port=9222
2. Faz login no PJe (e-CPF) e vai para Intimações
3. Copia texto das intimações → cola no OMBUDS
4. Parser detecta >= 5 novas → botão "Escanear Processos" aparece
5. Click → tRPC mutation → FastAPI → Playwright connect_over_cdp
6. Playwright navega cada processo no Chrome já autenticado
7. Extrai: partes, movimentações, decisões, documentos, relato (VVD)
8. Retorna dados → OMBUDS atualiza cards no kanban
```

## Solução Futura (v2) — Extensão Chrome

### Por que extensão?

A extensão roda **dentro do navegador do defensor** — exatamente onde a sessão PJe está autenticada. Resolve todos os gargalos:

- Sem Playwright necessário
- Sem porta CDP
- Sem problema de autenticação (usa cookies/sessão existentes)
- VVD com segredo de justiça funciona (navegador autorizado)
- Funciona com OMBUDS hospedado no Vercel

### Arquitetura

```
┌─────────────────────────────────────────────────┐
│  Chrome do Defensor                              │
│                                                  │
│  ┌──────────────┐    ┌───────────────────────┐  │
│  │  PJe (aba)   │    │  Extensão OMBUDS      │  │
│  │  sessão ativa │◄──│                        │  │
│  │              │    │  1. Recebe lista de    │  │
│  │              │    │     processos do OMBUDS│  │
│  │              │    │  2. Abre cada processo  │  │
│  │              │    │     em background       │  │
│  │              │    │  3. Extrai dados do DOM │  │
│  │              │    │  4. Envia pra API OMBUDS│  │
│  └──────────────┘    └───────────┬───────────┘  │
└──────────────────────────────────┼───────────────┘
                                   │ HTTPS
                                   ▼
                          ┌─────────────────┐
                          │  OMBUDS (Vercel) │
                          │  API recebe dados│
                          │  enriquecidos    │
                          └─────────────────┘
```

### Estrutura da Extensão

```
ombuds-pje-extension/
├── manifest.json          # Permissões: domínio PJe, tabs, storage
├── background.js          # Service worker: orquestra navegação, recebe comandos
├── content-script.js      # Injeta no PJe: lê DOM, extrai dados
├── popup.html             # UI mínima: status, configuração
└── popup.js               # Lógica do popup
```

#### manifest.json (v3)
```json
{
  "manifest_version": 3,
  "name": "OMBUDS - PJe Scanner",
  "version": "1.0.0",
  "permissions": ["tabs", "activeTab", "storage"],
  "host_permissions": ["https://pje.tjba.jus.br/*", "https://pje1g.tjba.jus.br/*"],
  "background": { "service_worker": "background.js" },
  "content_scripts": [{
    "matches": ["https://pje.tjba.jus.br/*", "https://pje1g.tjba.jus.br/*"],
    "js": ["content-script.js"]
  }]
}
```

### Fluxo v2

1. Defensor cola intimações no OMBUDS → 5+ novas detectadas
2. OMBUDS mostra botão "Escanear Processos"
3. Click → OMBUDS envia lista de processos para a extensão
   - Via `chrome.runtime.sendMessage` (se extensão detectada)
   - Ou via polling de endpoint dedicado na API
4. Extensão navega cada processo no PJe (background tabs)
5. `content-script.js` extrai dados do DOM (mesma lógica do Playwright)
6. Extensão faz POST para API do OMBUDS com dados enriquecidos
7. OMBUDS atualiza cards no kanban

### Comunicação OMBUDS ↔ Extensão

Duas opções:

| Método | Prós | Contras |
|--------|------|---------|
| **chrome.runtime.sendMessage** | Tempo real, bidirecional | Precisa detectar extensão instalada |
| **Polling de endpoint** | Funciona sem detecção | Delay de polling, mais requests |

Recomendação: usar `chrome.runtime.sendMessage` com fallback para polling.

### Detecção da extensão no OMBUDS

```typescript
// No frontend, verificar se extensão está instalada
const EXTENSION_ID = "ombuds-pje-scanner-id";

async function isExtensionInstalled(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!chrome?.runtime?.sendMessage) {
      resolve(false);
      return;
    }
    chrome.runtime.sendMessage(EXTENSION_ID, { type: "ping" }, (response) => {
      resolve(response?.type === "pong");
    });
  });
}
```

## Distribuição

| Fase | Método | Público | Notas |
|------|--------|---------|-------|
| Beta | Arquivo `.crx` direto | 5-10 defensores | Modo desenvolvedor no Chrome |
| Produção | Chrome Web Store | Qualquer defensor | Review do Google, $5 taxa única |

Para 5-10 defensores, o `.crx` é suficiente. Instrução: abrir `chrome://extensions`, ativar modo desenvolvedor, arrastar o `.crx`.

## Reaproveitamento de Código

A lógica de extração do `pje_scraper_service.py` (seletores, parsing do DOM) é **diretamente portável** para o `content-script.js`:

| Playwright (v1) | Extensão (v2) |
|-----------------|---------------|
| `page.evaluate(() => { ... })` | `content-script.js` (executa no contexto da página) |
| `page.query_selector('a:has-text(...)')` | `document.querySelector('a:has-text(...)')` |
| `page.goto(url)` | `chrome.tabs.update(tabId, { url })` |
| `page.wait_for_timeout(2000)` | `await new Promise(r => setTimeout(r, 2000))` |

O corpo do JavaScript de extração (partes, movimentações, documentos) é **idêntico**.

## Considerações

- **Rate limiting**: Manter delay de 2s entre navegações (configurável)
- **Sessão expirada**: Extensão deve detectar redirect para login e notificar o defensor
- **Progresso**: Extensão envia progresso em tempo real via mensagem
- **VVD**: Relato da vítima precisa de tratamento especial (dados sensíveis — não logar)
- **Segurança**: API key do OMBUDS armazenada na extensão via `chrome.storage.sync`

## Roadmap

| Fase | O que | Quando |
|------|-------|--------|
| **v1** | Playwright local (flag por usuário) | Implementado (2026-03-25) |
| **v1.1** | Calibrar seletores com PJe-BA real | Próxima sessão |
| **v1.2** | Telegram bot para notificações | Após v1.1 estável |
| **v2** | Extensão Chrome (todos defensores) | Quando 5+ usuários ativos precisarem |
| **v3** | Telegram bot integrado à extensão | Após v2 estável |
