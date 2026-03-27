# /pje-intimacoes - Baixar e Organizar Intimações do PJe

> **Tipo**: Workflow de Scraping (Cowork ou CLI)
> **Trigger**: "intimações", "baixar intimações", "importar intimações", "pje intimações"

## O que faz

Acessa o PJe TJBA, captura as intimações pendentes do Painel do Defensor,
e organiza no Google Drive nas pastas dos assistidos.

## Fluxo para Cowork (interativo/visual)

### 1. Login no PJe
- Abrir `https://pje.tjba.jus.br/pje/login.seam`
- Preencher CPF e Senha (estão em `.env.local`: `PJE_CPF`, `PJE_SENHA`)
- Clicar Entrar

### 2. Capturar Intimações
- No Painel do Defensor, aba **EXPEDIENTES**
- Cada intimação mostra: Processo | Tipo | Prazo | Conteúdo
- Para cada intimação:
  1. Anotar: número do processo, tipo do ato, prazo, conteúdo resumido
  2. Clicar para abrir o documento da intimação
  3. Salvar/baixar o PDF do documento

### 3. Organizar no Drive
- Para cada intimação baixada:
  1. Identificar o assistido pelo número do processo (consultar no banco OMBUDS)
  2. Navegar para `Processos - Júri/{Nome Assistido}/AP {Número}/`
  3. Upload do PDF com nome: `Intimação - {Data} - {Tipo}.pdf`

### 4. Registrar no OMBUDS (opcional)
- Se o processo já existe no OMBUDS, registrar a intimação via tRPC
- Dados: processoId, tipo do ato, prazo, conteúdo, status="pendente"

## Fluxo para CLI (automação)

```bash
# Fase 1: Capturar intimações via agent-browser
PJE_SESSION=pjeN bash scripts/pje_intimacoes.sh

# Fase 2: Importar no banco
env $(grep -v '^#' .env.local | xargs) npx tsx scripts/pje_import_intimacoes.ts

# Fase 3: Upload dos PDFs ao Drive
bash scripts/pje_upload_drive_curl.sh ~/Desktop/pje-intimacoes/
```

## Estrutura no Drive

```
Processos - {Área}/
├── {Nome Assistido}/
│   └── {TIPO} {Número}/
│       ├── AP {Número}.pdf              ← Autos Digitais
│       ├── Intimação - 2026-03-27 - Citação.pdf
│       ├── Intimação - 2026-03-28 - Despacho.pdf
│       └── ...
```

## Credenciais

| Variável | Arquivo |
|----------|---------|
| `PJE_CPF` | `.env.local` |
| `PJE_SENHA` | `.env.local` |
| `GOOGLE_CLIENT_ID` | `.env.local` |
| `GOOGLE_CLIENT_SECRET` | `.env.local` |
| `GOOGLE_REFRESH_TOKEN` | `.env.local` |

## Folder IDs do Drive

| Área | ID |
|------|-----|
| Júri | `1_S-2qdqO0n1npNcs0PnoagBM4ZtwKhk-` |
| VVD | `1fN2GiGlNzc61g01ZeBMg9ZBy1hexx0ti` |
| EP | `1-mbwgP3-ygVVjoN9RPTbHwnaicnBAv0q` |
| Substituição | `1eNDT0j-5KQkzYXbqK6IBa9sIMT3QFWVU` |

## Dicas para Cowork
- Pode pedir: "baixa as intimações de hoje e coloca nas pastas do drive"
- Pode pedir: "quais intimações estão pendentes no PJe?"
- Pode pedir: "organiza as intimações da semana no drive"
- O Cowork pode navegar visualmente no PJe e capturar dados em tempo real
