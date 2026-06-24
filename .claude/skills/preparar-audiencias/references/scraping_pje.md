# Scraping PJe — regras canônicas para a skill /preparar-audiencias

Reaproveita a infraestrutura `enrichment-engine/` (Patchright + login PJe TJBA + downloader). Esta referência consolida as regras que **dão certo** em produção.

## Pré-requisitos

```bash
# venv
/Users/rodrigorochameire/Projetos/Defender/enrichment-engine/.venv/bin/python
# .env com PJE_USER e PJE_PASS

# patchright instalado e config:
patchright install chromium
```

## 1. Login

- Login em `https://pje.tjba.jus.br/pje/login.seam` (1º grau).
- 2º grau: `https://pje2g.tjba.jus.br/pje-2g/login.seam` (mesmo PJe, segunda instância).
- **Same-origin sessions** podem ser navegadas via `agent-browser` (Fase 1).
- **Cross-origin** ou downloads de mídia exigem **Playwright/Patchright direto** (Fase 2) — usar `expect_download` + `Fetch.fulfillRequest` quando o PJe redireciona para CDN.

**Boas práticas (consolidadas)**:
- Relogin a cada 8 downloads consecutivos — sessão cai silenciosamente após N requisições.
- Após cada download, **`page.reload()`** antes do próximo — o PJe deixa estado dirty no DOM.
- Bloquear recursos pesados (imagens, fontes, mídia em background) para acelerar — usar `page.route("**/*", handle)` filtrando por tipo.

## 2. Listar documentos do processo

URL: `https://pje.tjba.jus.br/pje/Processo/ConsultaProcesso/listView.seam?ca=<token>`.

O `ca` token é a chave de acesso. Para processos **públicos**, o token vem direto da listagem de processos. Para processos **sob sigilo** (típico VVD), o token só vem via popup "Peticionar":

```
1. Listar polo passivo (ConsultaProcesso/Documentos/listProcessosCompleto.seam)
2. Localizar o link "Peticionar" do assistido
3. Abrir o popup — extrair o `ca` query param da URL
4. Usar `ca` em listProcessoCompleto.seam para baixar autos
```

Detalhes em `enrichment-engine/scrapers/pje_polo_passivo.py` (memo `reference_pje_polo_passivo_scraping`).

## 3. Listar processos do assistido (busca por CPF)

```
URL: https://pje.tjba.jus.br/pje/Processo/ConsultaProcesso/Decisao/listView.seam
Query: pessoa.cpf=XXXXXXXXXXX (digitos)
```

Retorna a lista de processos do assistido. Para cada, conferir o **status** (ativo/baixado/arquivado/com sigilo). **Sempre** marcar como "ativo" os processos com data recente de movimentação.

## 4. Download de autos digitais (PDF agregado)

```
URL: https://pje.tjba.jus.br/pje/Processo/ConsultaProcesso/Documentos/listAutosDigitais.seam?ca=<token>
```

A página gera um PDF agregado de TODOS os documentos do processo (ou apenas dos públicos, conforme nível de acesso). **Cuidado** com processos enormes — alguns têm > 500 págs. Aplicar timeout grande (`timeout=600s`) na geração.

**Heurística de tamanho**:
- < 50 págs: provável que falte conteúdo — checar se sigilo ainda restringe.
- 50-300 págs: tamanho normal.
- > 300 págs: AIJ avançada ou múltiplas precatórias — alocar tempo para parsing.

## 5. Download de documentos individuais (quando autos agregados não bastam)

```
URL: https://pje.tjba.jus.br/pje/Processo/ConsultaDocumento/listView.seam?x=<doc-token>
```

Cada documento tem seu `x` token. Útil para baixar **apenas** o despacho mais recente, a denúncia, ou uma certidão específica — economiza tempo quando não se precisa do PDF agregado de 500 págs.

## 6. Extração de partes / status / movimentação (sem download)

```
URL: https://pje.tjba.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listView.seam?ca=<token>
```

Renderiza a página de detalhes — partes, advogados, movimentação. Útil para popular `processos.partes`, `processos.atribuicao`, etc. **sem** baixar o PDF agregado.

## 7. Mandados / certidões

```
URL: https://pje.tjba.jus.br/pje/Processo/ConsultaProcesso/Documentos/listView.seam?ca=<token>
```

Filtrar por **tipo de documento** = "Mandado", "Certidão". A certidão do OJ é a fonte primária do **status de intimação**:

```
"Cumprido positivamente" → INTIMADO
"Frustrado, não localizado" → NÃO INTIMADO + motivo: nao_localizado
"Frustrado, endereço inválido" → NÃO INTIMADO + motivo: endereco_invalido
"Em diligência" → INTIMAÇÃO PENDENTE
```

Mapear para o vocabulário controlado de `status_depoentes.md`.

## 8. Sigilo VVD — regra específica

Processos com classe `MPU`, `JUSTIFICAÇÃO PELA PAZ EM CASA` ou outros sob Lei 11.340 frequentemente são marcados com **segredo de justiça**. O PJe esconde o `ca` token na listagem padrão.

**Solução** (consolidada em produção):

1. Acessar como Defensoria (vinculado por habilitação).
2. Na consulta de polo passivo (`listProcessosCompleto.seam`), localizar o processo.
3. Clicar em **"Peticionar"** — abre popup com `ca` token na URL.
4. Usar esse `ca` para baixar os autos.

**Nunca** tentar acessar processos sigilosos pela rota pública — falha silenciosamente e o PJe registra acesso inválido.

## 9. Detecção de duplicata antes de subir ao Drive

Antes de enviar PDF ao Drive, calcular SHA-256 e comparar com nome do arquivo já existente:

```python
def hash_file(path: Path) -> str:
    import hashlib
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()[:16]
```

Se o hash do novo PDF == hash do já existente → não re-enviar. Apenas registrar no log.

## 10. Erros comuns e tratamento

| Erro | Causa | Tratamento |
|---|---|---|
| 403 / "acesso negado" | Sessão expirada ou processo sigiloso sem `ca` | Relogin → tentar via Peticionar |
| Página em branco | JS do PJe não carregou | `page.wait_for_load_state("domcontentloaded", timeout=20s)` |
| PDF zerado (0 KB) | Geração assíncrona ainda incompleta | Retentar após 30s |
| "Sessão de outro usuário" | Login concorrente derrubou a sessão | Relogin (única opção) |
| Download não dispara | Browser sem `accept_downloads` | Sempre instanciar `context = browser.new_context(accept_downloads=True)` |

## Estrutura de diretórios alvo no Drive

```
/Meu Drive/1 - Defensoria 9ª DP/
└── Processos - VVD (Criminal)/
    └── <Nome do Assistido>/
        └── <numero_autos>/
            ├── Autos Digitais - <numero_autos>.pdf
            ├── Documentos relevantes/
            │   ├── <YYYY-MM-DD>-Despacho-<id-pje>.pdf
            │   ├── <YYYY-MM-DD>-Mandado-<id-pje>.pdf
            │   └── ...
            └── Análises/
                └── <YYYY-MM-DD>-<tipo-audiencia>.{pdf,md,json}
```

## Como invocar a partir da skill /preparar-audiencias

```python
from enrichment_engine.scrapers.pje_login import PJeSession
from enrichment_engine.scrapers.pje_autos import baixar_autos_digitais
from enrichment_engine.scrapers.pje_polo_passivo import obter_ca_token_via_peticionar

with PJeSession() as session:
    for processo in lista_processos:
        # processo público
        ca = processo.ca_token or obter_ca_token_via_peticionar(session, processo)
        baixar_autos_digitais(session, processo, ca, target_dir)
```
