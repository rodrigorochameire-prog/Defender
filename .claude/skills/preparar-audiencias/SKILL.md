---
name: preparar-audiencias
description: "Pipeline completo de preparação das audiências de um dia. Use SEMPRE que o usuário pedir para 'preparar as audiências de [data]', 'pauta do dia', 'preparar a pauta', 'organizar as audiências de hoje/amanhã/da semana', 'gerar relatório de audiências', 'dossiê do dia'. Funciona para VVD e Júri (detecta automaticamente pela atribuição do processo). Cobre Justificação, Oitiva Especial, AIJ, Audiência de Custódia, Audiência Una, Audiência Preliminar (VVD) e AIJ 1ª fase, Sessão de Plenário, Qualificação, Precatórias (Júri). Encadeia: dedup de eventos → conferência de pastas → scraping PJe (com tratamento de sigilo VVD) → download autos → análise individual via /analise-vvd|/analise-juri → população do OMBUDS com status DETALHADO de depoentes → relatório PDF unificado salvo no Drive."
---

# /preparar-audiencias — Pipeline do Dia de Audiências

Skill orquestradora. Quando o usuário disser **"prepare as audiências do dia X"** (VVD, Júri ou ambos), executa o pipeline completo abaixo, end-to-end, sem precisar de novas instruções.

## REGRA DE OURO — Status dos depoentes

**NUNCA** suprima o status dos depoentes. **Toda** análise individual e o relatório consolidado **devem** conter, para cada depoente arrolado:

| Campo | Valores possíveis |
|---|---|
| Tipo | ofendida · testemunha de acusação · testemunha de defesa · informante · interrogando |
| Intimação | INTIMADO · NÃO INTIMADO · INTIMAÇÃO PENDENTE · DESCONHECIDO |
| Motivo (se não intimado) | não localizado · mandado não cumprido · endereço inválido · em diligência · recusa · ausência de informações |
| Comparecimento | COMPARECEU · NÃO COMPARECEU · PRESENÇA EXIGIDA NÃO VERIFICADA · DISPENSADO · OUVIDO ANTERIORMENTE |
| Já ouvido? | SIM (data/peça) · NÃO |
| Forma | presencial · videoconferência · precatória |
| Observação | qualquer pendência registrada nos autos (e.g., "a ofendida pediu dispensa", "compromisso já tomado", "carta precatória devolvida") |

Esquema completo: ler `references/status_depoentes.md`. Esse painel é **obrigatório** em toda análise e no relatório consolidado.

---

## Pipeline (10 passos)

### 1. Identificar o intervalo
- Padrão: data ÚNICA (e.g., "30/04", "amanhã", "hoje").
- Aceita range ("dias 5 e 6 de maio", "esta semana") — repetir o pipeline por dia.

### 2. Levantar a pauta no OMBUDS
Consultar `audiencias` do dia + `calendar_events` do mesmo dia, juntando por processo:
```sql
SELECT a.*, p.numero_autos, p.atribuicao, p.classe_processual,
       ass.id AS assistido_id, ass.nome AS assistido_nome
FROM audiencias a
LEFT JOIN processos p ON p.id = a.processo_id
LEFT JOIN assistidos ass ON ass.id = a.assistido_id
WHERE DATE(a.data_audiencia) = $1
ORDER BY a.data_audiencia;
```
Script pronto: `scripts/01_buscar_pauta.ts`.

### 3. Detectar e remover duplicatas
- `calendar_events` redundantes (mesmo processo + mesma data) → soft-delete (`deleted_at`).
- `processos` espelho (mesmo `numero_autos`, `assistido` clone) → migrar demandas/registros para o canônico, soft-delete o espelho e o assistido espelho.
- **Sempre em transação** (`scripts/02_dedup.ts`).
- Confirmar plano de migração com o usuário **antes** de soft-delete em massa (>3 itens).

### 4. Verificar pastas no Drive
Para cada assistido, conferir a existência da pasta no diretório correto (por atribuição):

| Atribuição | Caminho base |
|---|---|
| VVD | `/Meu Drive/1 - Defensoria 9ª DP/3 - Casos/Processos - VVD (Criminal)/` |
| Júri | `/Meu Drive/1 - Defensoria 9ª DP/3 - Casos/Processos - Júri/` |
| Substituição | `/Meu Drive/1 - Defensoria 9ª DP/3 - Casos/Processos - Substituição criminal/` |
| Execução Penal | `/Meu Drive/1 - Defensoria 9ª DP/3 - Casos/Processos - Execução Penal/` |
| Grupo Júri | `/Meu Drive/1 - Defensoria 9ª DP/7 - Júri/Processos - Grupo do juri/` |

Se a pasta **não existe**: criar (`<Nome do Assistido>/<numero_autos>/`). **Nunca** criar pastas de processo no nível raiz da atribuição (sempre dentro do nome do assistido).

### 5. Scraping PJe (autos + processos associados)
**MÉTODO PREFERIDO (v2, validado 09/06/2026): CDP no Chromium logado** — ler `references/fluxo_cdp_v2.md` (relançar Chromium com `--remote-debugging-port=9222`, sessão sobrevive; rota Peticionar → ca → `listProcessoCompletoAdvogado.seam?id=&ca=` vence o sigilo VVD; download via aba S3 ou Área de Download). Scripts em `scripts/pje-cdp/` (espelho do repo Defender `scripts/pje-cdp/`).

Conexos: o menu "Associados (N)" do PJe-TJBA quase sempre vem 0 — buscar os processos do mesmo assistido no OMBUDS e baixar como N.1, N.2...

**5b. Varredura de associados DENTRO dos próprios autos (OBRIGATÓRIO — lição 10/06/2026).** OMBUDS + menu Associados NÃO bastam: na auditoria da pauta de 11/06, 8 de 11 audiências tinham associados não baixados, e TODOS estavam declarados dentro dos autos principais. Após baixar cada principal:
1. `pdftotext` nos autos + `grep -oE '[0-9]{7}-[0-9]{2}\.[0-9]{4}\.8\.05\.[0-9]{4}'` → lista de CNJs citados.
2. Classificar cada CNJ pelo CONTEXTO da citação (grep -B3 -A3):
   - **Capa do PJe "Processo referência: <CNJ>"** = associado formal (IP/APF/MPU de origem da AP) → baixar SEMPRE;
   - **Certidão do cartório** ("consultando o SAJ e o PJE, constatei a existência das Medidas Protetivas nº X, Inquéritos Policiais nº Y... em desfavor do REU") = mapa completo dos feitos do defendido → baixar os EM ANDAMENTO;
   - **Decisões/despachos** citando MPU ou outra AP do defendido → baixar;
   - **Editais/intimações agregadas de TERCEIROS** (conferir as partes! ex.: edital Katia×Anadilson dentro dos autos de Erivelton) → descartar;
   - **Processos cíveis** (divórcio, guarda, alimentos — vara de família) → não baixar pelo fluxo criminal; ANOTAR no dossiê como contexto estratégico;
   - **Antecedentes antigos** (000XXXX de 200X em certidão) → só anotar.
3. **Validar o dígito verificador** de todo CNJ vindo de peça (algoritmo 98 − (N mod 97)): peças contêm typos que viram processo fantasma no OMBUDS (caso 8002424-52 ≠ 8002425-52).
4. Baixar os de 1º grau como N.1, N.2... — **para AIJ, o processo referência (IP/APF) é INDISPENSÁVEL**: os depoimentos da fase de delegacia moram lá; sem ele todo `depoimento_ip` do dossiê fica null e o bloco DELEGACIA do registro fica vazio.
5. Conferir as partes do associado baixado: MPU "em andamento" pode ter OUTRA requerente (ex.: MPU vigente de Marcos era de Juliana; o APF da pauta, de Andriele) — tratar como contexto, não como a MPU do fato da audiência.

Critério de pronto do passo 5: nenhum dossiê de AIJ sem a fase de delegacia lida; nenhuma justificação sem a decisão concessiva e o rol vigente das MPU.

Método legado (Patchright com login próprio — quebrado pelo 2FA) em `references/scraping_pje.md`.

### 5c. Mídias das audiências + transcrição (qualquer atribuição)
Ler `references/midias_e_transcricao.md`. Após baixar os autos, **varrer as atas** dos processos da pauta em busca dos links de mídia ("gravada em sistema audiovisual" + URL), **baixar para a pasta do assistido** e **transcrever** — assim a análise/dossiê cita a prova oral real (com timestamp), não só parafraseia o IP.
1. **Dedup primeiro**: se a pasta (incl. `Mídias AIJ/`) já tem a mídia/transcrição da audiência, não rebaixar nem retranscrever (manifesto `Mídias AIJ/_midias.json`).
2. **Lifesize** (ex.: VVD Camaçari "Sala 3"): `scripts/baixar_midias_lifesize.py --dest "<pasta>" --scan "<autos>.pdf"` (ou passando as URLs). Método: API `cloudpublicvideo` (header **Origin** obrigatório) → `embed` (cookies CloudFront, expiram em horas) → m3u8 720p → ffmpeg. **PJe Mídias/CNJ** (júri e outras varas): método próprio (login CPF+senha; `audiencia/visualizar?id=` → URL assinada), ver memória `project_juri_nailton_10jun2026`.
3. **Transcrever**: `scripts/transcrever_midias.py "<pasta>"` (ffmpeg + whisper-cli medium pt → SRT/TXT/JSON em `Mídias AIJ/Transcrições/`; pula o que já tem `.srt`). whisper **não** diariza: montar o `.md` consolidado `[mm:ss] INTERLOCUTOR:` por contexto e **conferir de ouvido** antes de citar literal (`conferencia-depoimentos` + `citacao-depoimentos`).

**5d. Vincular termos do IP (05d_vincular_termos_ip.py)**
Para cada depoente, busca no PDF do IP/APF a página onde o seu termo de
depoimento/declaração começa (usa `pdftotext` + correspondência de nome via
`difflib`, threshold 0.65). Popula `depoentes[].termo_delegacia = {drive_file_id, pagina_inicio}`
no registro, habilitando o botão "ver termo (IP)" no sheet do OMBUDS.

Requer: `pdftotext` e `pdfinfo` instalados (`brew install poppler`).
Se o IP/APF não existir para o processo, skipa sem erro.

### 6. Inferência de tipo de audiência
Detectar subtipo automaticamente pela classe processual + tipo gravado:
- Ler `references/tipos_audiencia_vvd.md` (Justificação, Oitiva Especial, AIJ, Custódia, Una, Preliminar).
- Ler `references/tipos_audiencia_juri.md` (AIJ 1ª fase, Plenário, Qualificação, Precatória).

Cada subtipo tem **rito próprio** e **objeto distinto** — a análise muda em função disso (justificação só decide manutenção/revisão de MPU; AIJ é instrução completa; plenário é mérito etc.).

### 7. Análise individual (skills /analise-vvd | /analise-juri)

**Organização do dia (padrão 2026-06-09)**: antes das análises, rodar `scripts/pje-cdp/organizar_dia.py` — monta `5 - Operacional/Audiências/<ATRIB> - <DD-MM-YYYY>/` com numeração da pauta (`1`, `1.1`, `2`...) no formato `N [VVD] SIGLA <CNJ> - <Assistido>.pdf` e copia os autos para a pasta de cada assistido. O dossiê de cada audiência usa TODOS os documentos da pasta do assistido e a cópia final do PDF do dossiê vai para a pasta do dia (`N DOSSIÊ [VVD] - <Assistido>.pdf`). Análises por agentes paralelos: `references/instrucoes_dossie_vvd_agentes.md` + `scripts/pje-cdp/gerar_dossie_vvd.py`.


Planejador (não-LLM) pronto: `scripts/06_planejar_analises.py <DIA>` produz `/tmp/plano-analises-<DIA>.json` com:
- Subtipo detectado (custodia · justificacao · aij · oitiva_especial · plenario · etc.)
- Skill alvo (analise-vvd | analise-juri) e referência exata por subtipo
- PDF dos autos a ler (de `pasta-do-assistido/<numero>/Autos Digitais - <numero>.pdf`)
- Diretório de saída e prefixo do nome (`<DIA>-<subtipo>`)
- `skip:true` quando já há análise ≤ 30 dias OU audiência cancelada
- `instrucao_orchestrator`: prompt pronto para invocar a skill por audiência

**Execução das análises** é responsabilidade do orchestrator (skill master): para cada item `skip:false` do plano, invocar a skill apontada (`analise-vvd` ou `analise-juri`) com a `reference` correspondente, lendo o PDF e gravando tripla saída no `output_dir`.

Após todas geradas, montar `/tmp/registros-<DIA>.json` (formato em `references/schema_registro_audiencia.md`) e seguir para o passo 8.

Padrões obrigatórios para cada análise:
- 7 partes do Padrão Defender v2 (KPIs, paleta por atribuição, citações reais, Verdana 11pt).
- **Tripla saída**: PDF (paleta da atribuição) + MD + JSON (`_analise_ia.json`).
- Salvar em `<pasta-do-assistido>/Análises/<YYYY-MM-DD>-<subtipo>.{pdf,md,json}`.

### 8. População do OMBUDS
Atualizar `audiencias.registro_audiencia` (JSON) e `audiencias.resumo_defesa` (TEXT). Schema do JSON em `references/schema_registro_audiencia.md`:
```json
{
  "depoentes": [
    {
      "nome": "...",
      "tipo": "ofendida|testemunha_acusacao|testemunha_defesa|informante|interrogando",
      "intimacao": "intimado|nao_intimado|pendente|desconhecido",
      "motivo_nao_intimacao": "nao_localizado|mandado_nao_cumprido|...",
      "comparecimento": "compareceu|nao_compareceu|nao_verificado|dispensado|ouvido_anteriormente",
      "ja_ouvido": { "sim": true, "data": "2025-06-16", "peca": "AIJ-1" } | null,
      "forma": "presencial|videoconferencia|precatoria",
      "observacao": "..."
    }
  ],
  "imputacao": "art. 129 §13 CP c/c art. 7º I Lei 11.340/06",
  "tese_defesa": "...",
  "pontos_criticos": ["...", "..."],
  "perguntas_estrategicas": { "ofendida": ["..."], "policiais": ["..."] },
  "orientacao_assistido": "...",
  "documentos_relevantes": [{ "id": "550115463", "fl": 1, "descricao": "..." }]
}
```
Script: `scripts/pje-cdp/popular_ombuds.mjs` (pooler Supabase exige `prepare:false`; o legado `scripts/07_popular_ombuds.ts` trava). Também atualiza `analises_cowork` com a nova análise gerada.

### 9. Relatório consolidado do dia (PDF único)
- Formato em `references/relatorio_consolidado.md`.
- Capa com KPIs (total · agendadas · concluídas · canceladas · com resumo · com painel de depoentes).
- Sumário (sinóptico em tabela).
- Detalhamento por audiência: cabeçalho, status, dados estruturais, **Painel de Depoentes (obrigatório, em tabela)**, resumo de defesa, imputação, tese, pontos críticos, perguntas estratégicas, orientação ao defendido.
- Pendências: lista de audiências com lacunas (sem análise, sem painel de depoentes, sem documentos).
- Salvar em `/Meu Drive/1 - Defensoria 9ª DP/5 - Operacional/Atendimentos/Pauta de Audiências - <DD mês YYYY>.pdf` + `.docx`.
- Script: `scripts/08_gerar_relatorio_consolidado.py`.

### 10. Notificações
- Resumir ao usuário no chat: itens populados, pendências, link do PDF.
- Oferecer abrir PDF (`open <path>`).

---

## Pré-requisitos

| Item | Como verificar |
|---|---|
| Banco OMBUDS acessível | `.env.local` com `DATABASE_URL` (Supabase) |
| Credenciais PJe TJBA | `enrichment-engine/.env` com `PJE_USER`/`PJE_PASS` |
| Patchright instalado | `enrichment-engine/.venv/bin/python -c "import patchright; print(patchright.__version__)"` |
| Logo DPE-BA | `.claude/skills-cowork/vvd/assets/dpe_logo.png` ou `analise-audiencias/assets/dpe_logo.png` |
| python-docx + pillow + numpy | `pip3 install --break-system-packages python-docx pillow numpy pypdf` |
| LibreOffice (docx→pdf) | `/Applications/LibreOffice.app/Contents/MacOS/soffice --version` |

---

## Skills transversais (consulta obrigatória ANTES de redigir)

1. **`linguagem-defensiva`** — "defendido" (nunca "réu/agressor"), "ofendida" ou "suposta vítima", "fato imputado" (nunca "crime cometido"), modalizadores ("segundo a denúncia" / "segundo a representação registrada no BO"), verbos neutros ("declarou/relatou/informou", nunca "confessou/admitiu").
2. **`citacao-depoimentos`** — Quem perguntou (MP/Defesa/Juíza), espontaneidade, timestamp `(mídia, a partir de XXminYYs)`, reiteração, contexto temporal.
3. **`citacoes-seguras`** — Verificar súmulas e jurisprudência antes de citar (STJ/STF/TJBA verificáveis); em caso de dúvida, marcar `[VERIFICAR PRECEDENTE]`.
4. **`estilo-pecas`** — Anti-IA: cortar hedging cerimonial, prefaciações, paralelismo tríplice, marcadores (i)(ii)(iii) embutidos.
5. **`padrao-defender-relatorios`** — KPIs, paleta por atribuição (VVD=amber, Júri=emerald, EP=blue), Verdana 11pt, checklist 25 items.

---

## Cuidados

- **Nunca** chamar a ofendida de "vítima" sem qualificador (em caso de mérito disputado, "suposta vítima" ou "ofendida").
- **Nunca** usar "denúncia" em processos de MPU (usar "representação registrada no BO" ou "petição inicial das medidas protetivas").
- Em audiência de Justificação, NÃO se faz instrução: a oitiva da ofendida e do requerido visa só a (re)avaliação da MPU — perguntas estratégicas devem refletir esse escopo restrito.
- Em audiência de Custódia, examinar legalidade do APF, requisitos do art. 312 CPP e cogitar liberdade provisória/MPU em substituição à preventiva.
- Em audiência de Júri (plenário), o foco é tese e perfil de jurados — análise diferente da AIJ 1ª fase.
- **Sigilo VVD**: ler `references/scraping_pje.md` § "Polo passivo via Peticionar".

---

## Bugs conhecidos — parser de pauta PJe (OMBUDS)

Armadilhas do parser que converte o texto colado da pauta em eventos
(`src/components/agenda/pje-agenda-import-modal.tsx` + importação no servidor
`audiencias.ts → importBatch`). Corrigidas no branch `fix/pauta-import-parser`
(commits `5343e95e` + `923f920d`). Se reaparecerem, conferir esta tabela antes de debugar do zero:

| Sintoma | Causa | Correção |
|---|---|---|
| Data do card aparece 1 dia antes (25/05 → 24/05) | `new Date("2026-05-25")` lê data-only como **UTC**; em BRT (−03) recua um dia | Formatar a string direto: `data.split("-").reverse().join("/")`. Nunca `new Date()` em data sem hora. A gravação no banco já usa offset `-03:00` e está correta. |
| Réu com "E" grudado ("E Anderson") ou nome "Civilmente Como ..." | Regex de réus com flag `/i` anula a guarda de inicial maiúscula → conectores minúsculos ("e", "civilmente", "como") viram início de nome | Remover a flag `/i` (nomes e marcadores "(REU)" são sempre maiúsculos no PJe) + strip defensivo `^e\s+`. |
| 1º réu some e o título usa o 2º | O texto colado **quebra tokens no meio** (CPF "915-\n09"): o grupo do CPF para na quebra e o "(REU)" deixa de estar colado, descartando o réu | Normalizar antes de casar o regex: `txt.replace(/\s+/g," ").replace(/(\d)\s*-\s*(\d)/g,"$1-$2")`. |
| Toda "redesignada" vira "designada"/confirmada | `mapearSituacao` testava "designada" antes de "redesignada" — e **"redesignada" CONTÉM "designada"** (idem "não-realizada" ⊃ "realizada") | Reordenar do mais específico ao mais genérico: cancelada → não-realizada → redesignada → realizada → designada. |
| Situação não captada em linha longa (vários réus) | Situação buscada numa janela de 500 chars a partir da data; em linhas longas a coluna "Situação" fica além | Buscar na **linha inteira** do evento (da data atual até a próxima data). |
| Sessão do Júri aparece com selo de outra atribuição (ex.: VVD) | No `importBatch`, ao reencontrar processo **já existente** o backfill só preenchia classe/vara — nunca corrigia `atribuicao`/`area` | Corrigir `atribuicao`/`area` a partir da pauta (fonte autoritativa da vara), pulando o fallback genérico `SUBSTITUICAO`. |

**Regra geral:** a pauta colada do PJe quebra linhas no meio de tokens e usa MAIÚSCULAS. Todo regex de extração deve **normalizar quebras de linha primeiro** e **não depender de minúsculas** para ancorar. Reimportar a mesma pauta atualiza os registros existentes (dedup por processo + data/hora) — corrige status, nomes e atribuição de uma vez.

---

## Acionamento automático

A skill é ativada SEM precisar digitar `/preparar-audiencias` quando o usuário usar qualquer destas formulações:
- "prepara as audiências de hoje/amanhã/[data]"
- "prepare a pauta de [data]"
- "organiza as audiências [intervalo]"
- "monta o dossiê do dia"
- "relatório consolidado das audiências de [data]"
- "preparar a pauta da semana"
- "audiências da semana"

## Histórico

| Data | Caso | Lição |
|---|---|---|
| 2026-06-10 | André Luiz Silva Cerqueira (VVD), AIJ 26/05 no Lifesize | Módulo canônico de mídias + transcrição (references/midias_e_transcricao.md + scripts/baixar_midias_lifesize.py + transcrever_midias.py). Varrer atas, baixar mídias para a pasta do assistido e transcrever, sempre com dedup (manifesto Mídias AIJ/_midias.json). Lifesize: API cloudpublicvideo com header Origin obrigatório (senão 403) → embed (cookies CloudFront, expiram em horas) → m3u8 720p → ffmpeg. Transcrição ffmpeg+whisper-cli medium pt (sem diarização: interlocutor por contexto; conferir de ouvido antes de citar). Novo passo 5c; ponteiros em juri (relatório/422) e analise-audiencias. Também serve para relatório processual (varrer toda a instrução de um assistido). |
| 2026-06-10 | Auditoria de associados, pauta VVD 11/06 | Passo 5b: varredura de associados DENTRO dos próprios autos (capa Processo referência, certidões do cartório, decisões), pdftotext + grep de CNJ + validação do dígito verificador (typo cria processo fantasma: 8002424-52 ≠ 8002425-52). OMBUDS e menu Associados não bastam. AIJ sem a fase de delegacia lida = dossiê incompleto. |
