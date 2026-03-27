# /pje-autos-batch - Download em Lote de Autos Digitais

> **Tipo**: Workflow de Scraping Batch
> **Trigger**: "baixar autos em lote", "autos batch", "download processos", "baixar processos da lista"

## O que faz

Dado uma lista de números de processo, baixa os Autos Digitais completos
do PJe e organiza no Google Drive nas pastas dos assistidos.

## Uso com Cowork (interativo)

Diga algo como:
- "Baixa os autos desses processos: 8015405-36.2022, 8009806-14.2025, ..."
- "Pega os autos de todos os processos da planilha Júri - Analisar"
- "Baixa os autos dos processos novos que entraram essa semana"

O Cowork vai:
1. Logar no PJe
2. Para cada processo: Peticionar → buscar → Autos Digitais → Download
3. Esperar na Área de Download
4. Baixar os PDFs
5. Organizar no Drive: `{Assistido}/AP {Número}/AP {Número}.pdf`

## Uso com CLI (automação)

### Preparação
```bash
# Criar lista de processos (um por linha)
cat > ~/Desktop/lista-processos.txt << 'EOF'
8015405-36.2022.8.05.0039
8009806-14.2025.8.05.0039
EOF
```

### Execução (3 etapas)

```bash
# ETAPA 1: Enfileirar no PJe (agent-browser)
# Abrir sessão e logar primeiro:
agent-browser --session pje1 open "https://pje.tjba.jus.br/pje/login.seam"
# (logar via fill)
PJE_SESSION=pje1 bash scripts/pje_download_v4.sh ~/Desktop/lista-processos.txt

# ETAPA 2: Baixar da Área de Download (Playwright)
python3 scripts/pje_area_download.py

# ETAPA 3: Upload ao Drive (curl + OAuth)
bash scripts/pje_upload_drive_curl.sh ~/Desktop/pje-autos-juri
```

## Regras Críticas

| Regra | Motivo |
|-------|--------|
| Relogin a cada 8 processos | JSF ViewState corrompe |
| Reload página entre downloads | iframe fica stale |
| `expect_download` antes do click | Estratégia mais confiável (100%) |
| OAuth para upload (não SA) | Service Account sem storage quota |
| Usar pasta existente do assistido | Evitar duplicatas "(1)" no Finder |
| `ab fill` no login (não eval) | Keycloak rejeita JS direto |

## Limites Conhecidos

- ~40 segundos por processo na Fase 1 (enfileiramento)
- PDFs grandes (183MB+) funcionam via resumable upload
- 3 processos sem Autos Digitais: 8000735, 8006470, 8007013
- S3 URLs expiram em 30 minutos — baixar rápido após "Sucesso"

## Estrutura no Drive

```
Processos - Júri/
├── {Nome Assistido}/           ← usa pasta existente
│   ├── AP {Número}/            ← cria se não existir
│   │   └── AP {Número}.pdf    ← Autos Digitais completos
│   ├── outros docs...          ← intocados
```

## Referência de Tipos de Processo

| Prefixo | Significado |
|---------|-------------|
| AP | Ação Penal de Competência do Júri |
| IP | Inquérito Policial |
| APF | Ação Penal (Flagrante) |
| MPU | Medida Protetiva de Urgência |
| EP | Execução Penal |
| IIM | Incidente de Insanidade Mental |
