# /pje-audiencias - Varredura de Pauta de Audiências do PJe

> **Tipo**: Workflow de Automação (CLI + CDP)
> **Trigger**: "pauta de audiências", "audiências da semana", "varredura audiências", "audiências pje"

## O que faz

Acessa o PJe TJBA via Playwright+CDP, extrai a pauta de audiências
da atribuição do mês (escala), e popula o OMBUDS (assistidos, processos,
audiências). Suporta paginação completa via slider RichFaces.

## Pré-requisitos

1. **Chromium com CDP** (porta 9222):
   ```bash
   pkill -9 Chromium; sleep 1; /Applications/Chromium.app/Contents/MacOS/Chromium --remote-debugging-port=9222 &
   ```
2. **Login no PJe** com e-CPF (manual)
3. **Playwright instalado**: `pip3 install playwright`

## Fluxo Automatizado

### Fase 1: Scraping da Pauta

```bash
python3 scripts/orchestrators/pje-pauta-scraper.py \
    --jurisdicao "CAMAÇARI" \
    --orgao-value 887 \
    --data-de "01/04/2026" \
    --data-ate "30/04/2026" \
    --output /tmp/pje-pauta.json
```

**Órgãos julgadores conhecidos (Camaçari):**

| Órgão | Value | Descrição |
|-------|-------|-----------|
| VVD | 887 | Vara de Violência Doméstica |
| Júri | (verificar) | Vara do Tribunal do Júri |
| Criminal | (verificar) | Varas Criminais |

**Técnica de paginação:**
- Usa `.rich-inslider-inc-horizontal` (seta do slider RichFaces)
- `scroll_into_view_if_needed()` antes do click (ESSENCIAL)
- Espera slider value mudar + 2s para DOM atualizar
- NÃO funciona: dispatchEvent, A4J.AJAX.Submit manual, input.value direto

### Fase 2: População do OMBUDS

```bash
npx tsx scripts/orchestrators/orq-audiencias.ts --from-file /tmp/pje-pauta.json
```

Ou diretamente via Supabase REST (como testado):
- Find or create assistido (fuzzy match >= 85%)
- Find or create processo (com workspace_id, assistido_id, area)
- Find or create audiência (dedup por processo_id + data_audiencia)

**Campos obrigatórios na tabela processos:**
- `workspace_id: 1` (NÃO pode ser null)
- `assistido_id` (NÃO pode ser null)
- `numero_autos`, `vara`, `atribuicao`

### Fase 3: Download de Autos (OBRIGATÓRIO para briefing completo)

O relatório de análise/briefing depende dos autos do processo (PDFs) para:
- Análise IA de depoimentos, provas, teses
- Identificação de contradições
- Sugestão de perguntas
- Formatação por atribuição (VVD, Júri, Criminal)

```bash
# Lista de processos para download (referência + associados)
cat /tmp/pje-processos-download.txt

# Fase 3a: Enfileirar no PJe (requer agent-browser)
PJE_SESSION=pje8 bash scripts/pje_download_v4.sh /tmp/pje-processos-download.txt
# ~40s/processo — para 52 processos ≈ 35 min

# Fase 3b: Baixar PDFs da Área de Download
python3 scripts/pje_area_download.py

# Fase 3c: Upload ao Drive/OneDrive
bash scripts/pje_upload_drive_curl.sh ~/Desktop/pje-autos-vvd
```

**Priorização:** baixar primeiro os processos da próxima semana, depois o restante.

### Fase 4: Análise IA (após download dos autos)

Dispara o enrichment engine para cada processo com autos no Drive:
- Extração de texto dos PDFs (OCR se necessário)
- Análise completa: resumo, depoentes, teses, contradições, checklist
- Resultado salvo em `analise_ia` do caso/processo

```bash
# Via tRPC (requer app rodando)
# Para cada processo com autos:
curl -X POST http://localhost:3001/api/trpc/analise.criarTask \
  -H "Content-Type: application/json" \
  -d '{"json":{"assistidoId":123,"processoId":456,"skill":"analise-completa"}}'
```

### Fase 5: Relatório de Briefing (com análise completa)

Gera relatório detalhado formatado por atribuição com:
- **Cabeçalho:** audiências da semana agrupadas por dia
- **Por audiência de instrução:**
  - Resumo executivo do caso
  - Narrativa defensiva
  - Painel de depoentes (delegacia vs juízo)
  - Perguntas sugeridas por depoente
  - Teses aplicáveis
  - Alertas operacionais (intimações pendentes, contradições)
  - Checklist tático
- **Justificações:** processo + situação + providência necessária
- Salva em `~/Desktop/briefing-{atribuicao}-{datas}.md`

**IMPORTANTE:** O briefing completo depende dos autos terem sido baixados e analisados (Fases 3-4). Sem os autos, gera apenas tabela resumo básica.

## Regras Importantes

### PJe JSF — O que funciona e o que NÃO funciona

| Operação | Funciona | NÃO funciona |
|----------|----------|-------------|
| Filtro jurisdição | `select_option(sel, label="CAMAÇARI")` | JS `sel.value = x` |
| Filtro órgão | `select_option(sel, value="887")` | JS `dispatchEvent` |
| Filtro datas | `fill(input, "01/04/2026")` (Playwright nativo) | JS `input.value = x` |
| Pesquisar | `click('input[value="Pesquisar"]')` | `form.submit()` |
| Paginação | `locator('.rich-inslider-inc-horizontal').click()` | JS click, dispatchEvent, A4J.AJAX.Submit |
| Navegação | `evaluate('a.click()')` no link "Pauta de audiência" | URL direta |

### Deduplicação

- **Assistido**: fuzzy match por nome (normalize NFD + word overlap >= 85%)
- **Processo**: match exato por `numero_autos`
- **Audiência**: match por `processo_id + data_audiencia` (ISO)

### Atribuição por mês (escala)

Consultar `escalas_atribuicao` para saber qual defensor está em qual vara:
```sql
SELECT * FROM escalas_atribuicao
WHERE mes = 4 AND ano = 2026 AND ativo = true;
```

## Exemplo Completo (testado 05/04/2026)

```bash
# 1. Abrir Chromium com CDP
pkill -9 Chromium; sleep 1
/Applications/Chromium.app/Contents/MacOS/Chromium --remote-debugging-port=9222 &

# 2. Login no PJe (manual com e-CPF)

# 3. Scraping — 55 audiências VVD abril
python3 scripts/orchestrators/pje-pauta-scraper.py \
    --jurisdicao "CAMAÇARI" --orgao-value 887 \
    --data-de "01/04/2026" --data-ate "30/04/2026"

# 4. Popular OMBUDS (via Node.js script)
# → 53 audiências designadas importadas
# → 8 processos novos criados
# → 7 assistidos novos criados
# → Deduplicação automática

# 5. Relatório de briefing gerado em ~/Desktop/
```

## Manutenção

- **Órgão julgador values** mudam se o PJe atualizar. Verificar com:
  ```javascript
  [...document.querySelector('[id*=orgaoJulgador]').options].map(o => o.value + ' = ' + o.text)
  ```
- **Slider IDs** (j_id487, j_id488) são dinâmicos — o script usa class selectors
- **ViewState** expira após ~30 min sem atividade
