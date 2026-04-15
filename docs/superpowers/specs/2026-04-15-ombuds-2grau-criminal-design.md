# OMBUDS 2º Grau Criminal — Design

**Data:** 2026-04-15
**Autor:** Rodrigo Rocha Meire
**Defensor-alvo:** Maurício Saporito (mausaporito@yahoo.com.br)
**Jurisdição:** TJBA — Câmaras Criminais (2º grau)
**Sistema processual:** PJe 2º grau (`pje2g.tjba.jus.br`), **não** e-SAJ

## Objetivo

Adaptar o OMBUDS para atender defensor público criminal de 2º grau, entregando diferencial real sobre o fluxo recursal (pauta, kanban, dossiê de recurso, memoriais).

## Escopo (Caminho B aprovado)

MVP com diferencial médio: novo enum + rotas adaptadas + scraping PJe 2º grau + dossiê `/analise-recurso`. Itens de "Caminho C" (gerador automático de sustentação oral, alerta push 48h) ficam para sprint seguinte.

## §1 — Modelo de dados

### Enums (`src/lib/db/schema/enums.ts`)

- `areaEnum`: adicionar `CRIMINAL_2_GRAU`.
- `atribuicaoEnum`: adicionar `CRIMINAL_2_GRAU_SALVADOR` (Câmaras Criminais TJBA).
- `nucleoEnum`: adicionar `SEGUNDA_INSTANCIA`.

### Tabela `processo`

Novos campos (nullable, só populados quando `area = CRIMINAL_2_GRAU`):

| Campo | Tipo | Descrição |
|---|---|---|
| `classeRecursal` | enum (`APELACAO`, `AGRAVO_EXECUCAO`, `RESE`, `HC`, `EMBARGOS`, `REVISAO_CRIMINAL`, `CORREICAO_PARCIAL`) | Classe do recurso |
| `camara` | text | Ex.: "1ª Câmara Criminal" |
| `relator` | text | Nome do desembargador relator |
| `dataDistribuicao` | date | |
| `dataConclusao` | date | Data do último "conclusos ao relator" |
| `dataPauta` | date | Data da sessão de julgamento |
| `dataJulgamento` | date | Data efetiva do julgamento |
| `resultadoJulgamento` | enum (`PROVIDO`, `IMPROVIDO`, `PARCIAL`, `NAO_CONHECIDO`, `DILIGENCIA`, `PREJUDICADO`) | |
| `acordaoRecorridoNumero` | text | Nº do processo de 1º grau de origem |

### Migration

Arquivo: `drizzle/NNNN_add_2grau_criminal.sql`. Backfill: nenhum (apenas amplia opções).

## §2 — Rota e UI

### Rota principal

`/segundo-grau` (Next.js App Router). Visível no sidebar **apenas** para usuários cujo `hasArea` inclui `CRIMINAL_2_GRAU`.

### Sub-abas

1. **Dashboard** — KPIs seguindo Padrão Defender v2 (paleta **indigo**):
   - Total em tramitação
   - Pautados próximos 7 dias
   - Conclusos há +30 dias (alerta: virou prescrição iminente?)
   - Julgados no mês (com breakdown provido/improvido)
   - Prazos recursais abertos

2. **Kanban recursal** — colunas:
   `Distribuído → Concluso ao Relator → Pautado → Julgado → Trânsito em Julgado`
   Card: classe, câmara, relator, assistido, badge de urgência (prazo < 48h).

3. **Pauta de julgamento** — calendário + lista:
   - Próximas 48h (crítico — sustentação oral)
   - Próximos 7 dias (médio)
   - Próximos 30 dias (planejamento)
   - Badge "sustentação preparada" (se dossiê `/analise-recurso` já gerado).

4. **Processos** — tabela filtrável: câmara, relator, classe recursal, resultado, período.

### Detalhe do processo

`/segundo-grau/[id]` reusa layout redesenhado de `/processo` (5 abas + 6 subabas). Adiciona aba **"Recurso"** com:

- Acórdão/sentença recorrida (resumo + link)
- Tese principal da defesa
- Pedido recursal
- Contrarrazões recebidas (texto + upload)
- Status de pauta/julgamento
- Histórico de movimentações recursais filtrado

## §3 — Scraping PJe 2º grau

### Reaproveitamento

Reusa totalmente o pipeline existente:

- `scripts/v4.sh` — enfileiramento
- `scripts/pje_area_download.py` — download
- `scripts/upload_drive_curl.sh` — upload Drive
- Patchright + agent-browser (Fase 1 same-origin) + Playwright (Fase 2 cross-origin)
- LaunchAgent no Mac Mini worker (cron 2x/dia)

### Novo módulo

`scripts/pje_2grau_scraper.py` herda do scraper 1º grau, sobrescreve:

- **URL base:** `https://pje2g.tjba.jus.br/pje/Painel/painel_usuario/listView.seam`
- **Seletores de acórdão:** extrai `classeRecursal`, `camara`, `relator`, `dataDistribuicao`, `dataConclusao`.
- **Parser de movimentações recursais:** detecta "Incluído em pauta", "Retirado de pauta", "Julgado", "Acórdão disponibilizado", "Trânsito em julgado" e popula os campos novos de `processo`.

### Enriquecimento de importação

Quando movimentação for **"incluído em pauta"**:

- Gera `Intimacao` com `urgencia=ALTA`.
- `prazo = dataPauta - 48h` (janela pra preparar sustentação oral).
- Tipo de ato: `PAUTA_JULGAMENTO_2G`.

### Dedup

Respeita a regra existente: última edição vence, status manual nunca sobrescrito por reimportação.

## §4 — Diferencial

### Skill `/analise-recurso`

Novo comando em `~/.claude/commands/analise-recurso.md`. Dossiê estratégico recursal seguindo Padrão Defender v2:

- **Paleta:** indigo (distinta de emerald/amber/blue/slate).
- **Entrada:** pasta do assistido + número do processo 2º grau.
- **Saída:** `.docx` Verdana 11pt, 7 partes, KPIs adaptados ao recurso:
  1. Resumo do acórdão/sentença recorrida
  2. Teses da defesa × fundamentos do recorrido
  3. Precedentes vinculantes aplicáveis (STF/STJ — regra de jurisprudência verificável)
  4. Pedido recursal
  5. Roteiro de sustentação oral (3–5 min, bullet points + tempo)
  6. Pontos fracos antecipados da acusação em contrarrazões
  7. Checklist de preparo (prazo pauta, memoriais, petição de sustentação)

### Skill `/peca-recurso`

Gera memorial, contrarrazões, razões de apelação, minuta de HC originário. Garamond 12pt, timbre DPE-BA. Tom: respeito ao juízo a quo, assertividade e objetividade (feedback já registrado em memória).

### Convite do Maurício

1. Aplicar migration §1.
2. Rodar script `scripts/invite-user.ts` (a criar) com:
   ```
   nome: Maurício Saporito
   email: mausaporito@yahoo.com.br
   comarca: Salvador
   nucleo: SEGUNDA_INSTANCIA
   atribuicao: CRIMINAL_2_GRAU_SALVADOR
   area: CRIMINAL_2_GRAU
   ```
3. Devolver URL `https://ombuds.vercel.app/register?convite={token}` pro Rodrigo encaminhar.

## Não-escopo (sprint seguinte)

- Push notification 48h antes da pauta.
- Geração automática de sustentação oral a partir do acórdão recorrido.
- Integração com áudios das sessões de julgamento TJBA.
- Controle de prescrição recursal automatizado.
- Planilha de status ↔ sync bidirecional pra 2º grau.

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Seletores PJe 2º grau diferentes dos de 1º grau | Fase de descoberta: executar scraper manualmente em 5 processos conhecidos antes do batch |
| Maurício usa outras câmaras além das criminais | Confirmar com ele no primeiro login; enum aceita novas câmaras via migration rápida |
| Convite provisório em VARAS_CRIMINAIS antes do schema estar pronto | Gerar convite **depois** da migration §1 aplicada — evita retrabalho |

## Ordem de implementação

1. Migration §1 (schema + enums).
2. Script `invite-user.ts` + **gerar convite do Maurício** (entrega imediata).
3. Rota `/segundo-grau` com dashboard + tabela Processos (MVP navegável).
4. Scraper PJe 2º grau adaptado (`pje_2grau_scraper.py`).
5. Kanban + Pauta de julgamento.
6. Skill `/analise-recurso`.
7. Skill `/peca-recurso`.
