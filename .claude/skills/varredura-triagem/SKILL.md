---
name: varredura-triagem
description: "Varredura de demandas em triagem (5_TRIAGEM/URGENTE) no OMBUDS — para cada intimação importada do PJe, lê o conteúdo do expediente, classifica fase processual + motivo + ato a praticar, atualiza o ato da demanda e cria registro tipo Ciência/Anotação/Diligência. Se há designação ou redesignação de audiência, agenda automaticamente em Audiências + GCal. NÃO altera status (mantém em triagem). Use quando o usuário pedir: 'varredura na triagem', 'analise as intimações importadas', 'classifique os atos das demandas em triagem', 'faça scraping dos expedientes', 'fase processual + ato das demandas'. Atribuições: VVD, Júri, EP, Criminal Geral."
---

# Varredura da Triagem — Pipeline OMBUDS × PJe

Esta skill **complementa** o cron de import (`/api/cron/pje-import`). O import só captura metadados do painel (tipo do documento, processo, prazo). A **varredura** abre cada expediente, lê o conteúdo, classifica e materializa o `ato` da demanda + registra o que precisa ser feito.

> **Princípio:** após a varredura, qualquer demanda em triagem deve ter (a) `ato` preciso, (b) registro tipo `ciencia`/`anotacao`/`diligencia` resumindo o que foi lido e o que vem a seguir, e (c) — se cabível — audiência criada e sincronizada com o GCal.

---

## Quando usar

Triggers (linguagem natural do Rodrigo):
- "varredura na triagem"
- "analise as intimações importadas"
- "classifique os atos das demandas em triagem"
- "faça scraping dos expedientes"
- "fase processual + ato das demandas"
- "verifique o kanban de triagem da [VVD/Júri/EP/Criminal]"

NÃO usar quando o usuário só quer **importar** (isso é o cron) ou quando quer **gerar peça** (isso é o skill da atribuição).

---

## Pipeline (5 etapas)

### 1. Listar demandas-alvo

```
GET /rest/v1/demandas
  ?select=id,ato,assistido_id,processo_id,enrichment_data,pje_documento_id,
          processos!inner(numero_autos,atribuicao,vara,classe_processual),
          assistidos!inner(nome)
  &status=in.(5_TRIAGEM,URGENTE)
  &defensor_id=eq.<DEFENSOR_ID>
  &deleted_at=is.null
  &processos.atribuicao=eq.<ATRIBUICAO>     # opcional: VVD_CAMACARI, JURI_CAMACARI, etc.
  &created_at=gte.<DATA>                    # opcional: só varrer recentes
  &order=data_expedicao.desc
```

Atribuições suportadas:
- `JURI_CAMACARI`
- `VVD_CAMACARI`
- `CRIMINAL_CAMACARI`
- `EXECUCAO_PENAL`

### 2. Para cada demanda — abrir expediente no PJe

**Opção A (preferida): Playwright headless via `enrichment-engine/.venv` (patchright)**

```python
# scripts/varredura_triagem.py — completo na pasta da skill
from patchright.async_api import async_playwright

# Login
await page.goto("https://pje.tjba.jus.br/pje/login.seam", wait_until="domcontentloaded")
await page.fill("input[name=username]", PJE_CPF)
await page.fill("input[name=password]", PJE_SENHA)
await page.click("input[type=submit]")
await page.wait_for_url(re.compile(r"advogado\.seam"), timeout=30000)

# Buscar doc por número (pje_documento_id)
await page.goto("https://pje.tjba.jus.br/pje/Processo/ConsultaDocumento/listView.seam")
await page.evaluate("""(id) => {
  const inp = document.querySelector('input[name="pesquisaProcessoDocumentoForm:numeroDocumento:numeroDocumentoinputDecoration:numeroDocumentoinput"]');
  inp.value = id;
  document.querySelector('input[id="pesquisaProcessoDocumentoForm:botaoPesquisar"]').click();
}""", pje_documento_id)
```

**Opção B (fallback): pelo número do processo + navegação no painel**

Se `pje_documento_id` é `NULL` (import antigo), navegar via painel:
1. EXPEDIENTES tab → "Apenas pendentes de ciência" → "CAMAÇARI N" → Vara
2. Localizar linha pela coluna "Processo" (regex no nº dos autos)
3. Clicar em `a[title="Autos Digitais"]` (popup)
4. Na timeline, achar o doc mais recente que faça sentido

### 3. Ler conteúdo

```python
# Ordem de tentativa
content = await page.evaluate("""() => {
  const fhtml = document.getElementById('frameHtml');
  if (fhtml) return {tipo: 'html', text: fhtml.contentDocument?.body?.innerText};
  const fbin = document.getElementById('frameBinario');
  if (fbin) return {tipo: 'pdf', src: fbin.src};
  return {tipo: 'inline', text: document.body.innerText};
}""")
```

**Fallback PDF**: se `tipo === 'pdf'`, marcar `ato='Analisar decisão'` + criar registro
`tipo='diligencia'` com link pro PDF no PJe (revisão manual obrigatória).

**Termo-wrapper**: se conteúdo `< 150 chars` e menciona `ID NNNNNNN`, clicar o
link aninhado com esse ID e ler o conteúdo real.

**Relogin a cada 8 docs** para evitar JSF ViewState corruption.

### 4. Classificar (heurísticas)

Ver `references/heuristicas-classificacao.md` para a tabela completa. Resumo:

| Conteúdo do doc | ato (`atos-por-atribuicao.ts`) | prioridade | tipo de registro |
|---|---|---|---|
| "designo audiência de instrução" / "AIJ" / "designada audiência" | Ciência designação de audiência | NORMAL | ciencia + agendar |
| "redesigno audiência" / "fica redesignada" | Ciência redesignação de audiência | NORMAL | ciencia + reagendar |
| "Sessão de Julgamento pelo Tribunal do Júri" | Ciência sessão de julgamento | ALTA | ciencia + agendar |
| "DESIGNADA audiência de JUSTIFICAÇÃO" | Ciência designação de audiência | NORMAL | ciencia + agendar (tipo=Justificação) |
| "fica nomeada a Defensoria" + "apresente a resposta à acusação" | Resposta à Acusação | URGENTE (10 dias) | diligencia |
| "Vistas à DPE ... resposta à acusação" | Resposta à Acusação | URGENTE | diligencia |
| "prazo sucessivo de 05 dias ... alegações finais" | Alegações finais | URGENTE | diligencia |
| "intimada a apresentar memoriais" | Memoriais | URGENTE | diligencia |
| "deixo de conhecer" / "formular em autos próprios" | Cumprir despacho | URGENTE | diligencia |
| "manifeste-se sobre o laudo" | Manifestação sobre laudo | NORMAL | diligencia |
| "manifeste-se sobre o requerimento de revogação de MPU" | Manifestação sobre MPU | NORMAL | diligencia |
| "SENTENÇA" + "ABSOLVO" | Ciência absolvição | NORMAL | ciencia |
| "SENTENÇA" + "CONDENO" | Ciência condenação | NORMAL | ciencia |
| "SENTENÇA" + "IMPRONUNCIO" | Ciência da impronúncia | NORMAL | ciencia |
| "SENTENÇA" + sentença genérica | Analisar sentença | URGENTE (5 dias) | diligencia |
| "ACÓRDÃO" + "improvido" / "desprovido" | Ciência acórdão | NORMAL | ciencia |
| "ACÓRDÃO" + necessita ação | Analisar acórdão | URGENTE | diligencia |
| "DECISÃO" durante instrução | Analisar decisão | NORMAL | diligencia |
| "ARQUIVADO DEFINITIVAMENTE" + DPE já deu ciência | Ciência | — (status=CONCLUIDO) | ciencia |
| "processo sigiloso... sem visibilidade" (Peticionar) | Outro | — (status=7_SEM_ATUACAO) | anotacao |
| Réu com advogado particular, renúncia indeferida | Ciência | BAIXA | anotacao |

**Regras de decisão** (em ordem):
1. Se há `audiência designada/redesignada` → ato de ciência + criar audiência (etapa 5).
2. Se há `prazo expresso para defesa/recurso/resposta` → ato corresponde, prioridade `URGENTE`.
3. Se é `sentença/acórdão` com resultado claro (absolvição, condenação, etc.) → ato de ciência específica.
4. Se é `decisão interlocutória` que não dispensa ação → `Analisar decisão` (urgente).
5. Caso contrário → manter `Ciência` genérica + `revisao_pendente=true`.

### 5. Atualizar banco + criar registro + agendar audiência

**a) Atualizar demanda** — APENAS `ato`, `tipo_ato` (≤50 chars), `prioridade`, `prazo`. Não mexer em `status`.

```
PATCH /rest/v1/demandas?id=eq.<ID>
{
  "ato": "Resposta à Acusação",
  "tipo_ato": "Defesa preliminar",
  "prioridade": "ALTA",
  "prazo": "2026-05-14",     // null para ciências
  "revisao_pendente": false
}
```

**b) Criar registro**

```
POST /rest/v1/registros
{
  "assistido_id": <aid>,
  "processo_id": <pid>,
  "demanda_id": <did>,
  "data_registro": "<now>",
  "tipo": "ciencia" | "diligencia" | "anotacao",
  "titulo": "Ciência de designação de audiência" | "Apresentar resposta à acusação",
  "conteudo": "Resumo do que foi lido + próximos passos. Cite trechos relevantes do doc.",
  "status": "agendado",
  "autor_id": 1
}
```

**c) Se há audiência → criar e sincronizar GCal**

```
POST /rest/v1/audiencias
{
  "processo_id": <pid>,
  "assistido_id": <aid>,
  "workspace_id": 1,
  "defensor_id": 1,
  "data_audiencia": "2026-06-15T14:00:00-03:00",
  "horario": "14:00",
  "titulo": "Audiência de instrução — Vara X",
  "status": "agendada",
  "tipo": "INSTRUCAO" | "JURI" | "JUSTIFICACAO" | "ESPECIALIZADA",
  "local": "<vara>",
  "sala": "<sala>",
  "descricao": "<resumo da designação>"
}
```

Checar duplicatas:
```
GET /rest/v1/audiencias?processo_id=eq.<pid>&data_audiencia=gte.<dia>T00:00:00&data_audiencia=lt.<dia>T23:59:59
```

GCal: usar MCP `mcp__claude_ai_Google_Calendar__create_event` com calendar ID por
vara (ver `references/google-calendar-ids.md`). Salvar `id` retornado em
`audiencias.google_calendar_event_id`.

---

## Output padrão (relatório)

Ao final, imprimir:

```
=== Varredura — VVD_CAMACARI — 2026-05-04 ===

Total processadas: 10 (10 ok, 0 erro)

Atos atualizados:
  Ciência designação de audiência ... 3
  Resposta à Acusação ............... 2 (URGENTES)
  Manifestação sobre MPU ............ 1
  Analisar sentença ................. 1
  Ciência ........................... 3 (mantidas)

Audiências criadas: 3
  - Maria Silva (8001234-...) — 2026-05-20 09:00 — INSTRUCAO ✓ GCal
  - João ...     (8002345-...) — 2026-06-03 14:00 — JUSTIFICACAO ✓ GCal

Pendentes de revisão manual: 1
  - 928 (Leandro Oliveira) — sigiloso, sem visibilidade DPE

Erros: nenhum.
```

---

## Modos de execução

### Modo 1 — `direct` (preferido)

Roda fim-a-fim no Claude Code, com Playwright via `.venv` do enrichment-engine.
Não precisa de browser aberto.

```bash
cd /Users/rodrigorochameire/Projetos/Defender/enrichment-engine
source .venv/bin/activate
python3 scripts/varredura_triagem.py --atribuicao VVD_CAMACARI --since 2026-05-03
```

### Modo 2 — `assisted`

Quando o PJe está com problema (CAPTCHA, manutenção, sigiloso), o Claude Code
gera o JSON de "demandas a varrer" com URLs diretas e o usuário cola os textos
de cada doc num input. O script classifica e grava.

### Modo 3 — `manual-review`

Não tenta scraping. Para cada demanda em triagem, cria um registro tipo
`diligencia` com link direto pros autos no PJe e marca `revisao_pendente=true`.
Usado quando há indisponibilidade ou quando o usuário quer revisar manualmente.

---

## Bugs conhecidos e contornos

| Bug | Contorno |
|---|---|
| `tipo_ato` VARCHAR(50) — texto longo trunca | Usar labels curtos sempre |
| Status volta para `5_TRIAGEM` após PATCH | Verificar trigger; se persistir, PATCH duplo |
| Assistidos `⚠ A identificar` (imports antigos) | Renomear ao descobrir nome real no doc |
| Duplicatas (2 demandas mesmo processo) | Soft-delete (`deleted_at = now()`) a mais antiga |
| Comet/Edge expõem CDP mas bloqueiam Playwright | Usar Chromium do `patchright` (já no .venv) |
| Login direto via `requests` funciona, mas `nd=ID` retorna form vazio | Usar Playwright + `pesquisaProcessoDocumentoForm` |

---

## Skills relacionadas (consulta cruzada)

- `vvd`, `juri`, `criminal-comum`, `execucao-penal` — peças geradas a partir do `ato`
- `analise-audiencias` — após audiência criada, prepara minuta da peça
- `dpe-ba-pecas` — padrões obrigatórios de redação dos registros e peças

---

## Histórico

- **v1 (2026-04-23)**: pipeline manual documentado em memória
- **v2 (2026-05-04)**: formalizado como skill, integrado ao OMBUDS, atos
  ampliados (`Cumprir despacho`, `Manifestação sobre laudo/MPU`, `Analisar
  decisão/sentença/acórdão`, `Ciência sessão de julgamento`, `Memoriais`).
  Modo `manual-review` adicionado pra rodadas sem PJe vivo.
