# Fluxo CDP v2 — preparar audiências (consolidado 09/06/2026, pauta VVD 11/06)

Método validado em produção: **Playwright/Patchright anexado via CDP ao Chromium do usuário já logado no PJe** (vence o 2FA/TOTP sem login programático). Substitui o pipeline v4 (agent-browser) e o Patchright com login próprio.

## 0. Pré-requisito — Chromium com porta de debug

```bash
# Se o Chromium já estiver aberto SEM a porta: fechar e relançar (a sessão PJe SOBREVIVE ao restart)
osascript -e 'quit app "Chromium"'
/Applications/Chromium.app/Contents/MacOS/Chromium --remote-debugging-port=9222 --restore-last-session &
curl -s http://127.0.0.1:9222/json/version   # confere CDP
```
- Conexão: `pw.chromium.connect_over_cdp("http://127.0.0.1:9222")`, usar `browser.contexts[0]` e a aba do painel.
- Se a sessão PJe cair no restart (raro), o usuário loga 1x com TOTP e o fluxo segue.

## 1. Rota canônica por CNJ (vence sigilo VVD)

1. Painel → aba **PETICIONAR** (click no `td` com texto exato) → iframe com busca.
2. Preencher `numeroSequencial/Verificador/Ano/OrgaoJustica` + click `searchProcessos`.
3. Click no link `a[title="Peticionar"]` → **popup** `peticaoPopUp.seam?idProcesso=<ID>&ca=<CA>` → capturar `idProcesso` e `ca`, fechar popup.
4. Abrir `https://pje.tjba.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listProcessoCompletoAdvogado.seam?id=<ID>&ca=<CA>`
   = **viewer completo dos autos** mesmo em segredo de justiça (MPU, Henry Borel etc.).
   - ⚠️ `listProcessoCompleto.seam?ca=` (sem `id=`, e sem "Advogado") NÃO funciona → errorUnexpected/Página não encontrada.
   - ⚠️ O `ca` é de uso quase imediato — usar logo após capturar.
5. Do header do viewer: `CLASSE numero` (linha 1) e `PARTE_ATIVA X PARTE_PASSIVA` (linha 2).
6. **Ícone de menu** → itens: Autos, Audiência, Expedientes, **Associados (N)**, Características...
   - ⚠️ No TJBA, "Associados" quase sempre = 0 mesmo havendo MPU↔AP. **Buscar conexos no OMBUDS** (outros `processos` do mesmo `assistido_id`) e baixá-los como 1.1, 1.2...
   - ⚠️ **OMBUDS também é incompleto** (auditoria 10/06/2026: 8/11 audiências com associado não baixado). A fonte decisiva são os PRÓPRIOS AUTOS: grep de CNJs no pdftotext → capa "Processo referência:", certidão do cartório ("constatei a existência das Medidas Protetivas nº..., Inquéritos Policiais nº... em desfavor do REU") e decisões. Ver SKILL.md § 5b (classificação por contexto, DV check, editais de terceiros).

## 2. Download dos autos (PDF agregado) — DOIS comportamentos

Click **Ícone de download** → diálogo com filtros (Tipo de documento, ID, Período, Cronologia **Crescente**/Decrescente) → selecionar "Crescente" → click botão **DOWNLOAD**:

- **Processos pequenos**: abre NOVA ABA direto no S3 (`tjba-pjedocs-prd-*.s3.sa-east-1.amazonaws.com/<numero>-<ts>-<idusuario>-processo`). Capturar com `ctx.expect_page()`, pegar a URL e baixar com `curl` (a URL S3 é assinada e funciona sem cookies).
- **Processos grandes**: a geração é ASSÍNCRONA → vai para a **Área de Download** (sem aba imediata; `expect_page` estoura timeout). Não é erro — esperar e baixar pela área.

⚠️ Falso positivo clássico: conferir sucesso por `body.innerText` conter "Área de download" NÃO funciona (o menu lateral sempre contém esse texto).

## 3. Área de Download

- URL: `https://pje.tjba.jus.br/pje/AreaDeDownload/listView.seam`; a tabela vive num **iframe cross-origin** (`pje-frontend-1g.tjba.jus.br/#/area-download`) cuja URL às vezes vem **vazia** no Playwright → localizar o frame **pelo conteúdo** (`innerText` contém "Situação" e "Expiração"), com retry até 60s.
- Cada linha: Processo | Documento | Expiração | **Situação** (Sucesso/Processando) | botão.
- Click no botão da ÚLTIMA linha "Sucesso" do CNJ → abre aba S3 → capturar URL → `curl`.
- API REST por trás (alternativa): `GET /pje/seam/resource/rest/pje-legacy/pjedocs-api/v1/downloadService/recuperarDownloadsDisponiveis?idUsuario=<id>&...` (chamada de dentro do iframe; parâmetros exatos a mapear).

## 4. Scripts prontos (repo Defender, `scripts/pje-cdp/`)

| Script | Função |
|---|---|
| `preparar_download.py --fase A` | enfileira por CNJ: busca → ca → viewer → metadados (classe/partes/associados) → diálogo de download; grava `meta.json` (resume-safe) |
| `fase_c2.py` | download direto robusto (confirma diálogo aberto, expect_page 300s, varre abas S3 órfãs) |
| `fase_d_area.py` | baixa da Área de Download (frame por conteúdo, rounds até Sucesso) |
| `organizar_dia.py` | staging → pasta do dia numerada + cópia p/ pasta do assistido (SHA-256 dedup) |
| `gerar_dossie_vvd.py` | JSON do dossiê → DOCX amber Padrão Defender (depois soffice → PDF) |
| `popular_ombuds.mjs` | registros JSON → `audiencias.registro_audiencia`/`resumo_defesa` + `analises_cowork` (⚠️ pooler Supabase exige `prepare:false`) |
| `popular_analysis_data.mjs` | registros JSON → **`processos.analysis_data`** (formato-app + chave `.dossie` v2) + `analysis_status='completed'` — **OBRIGATÓRIO**: o painel lateral da agenda (event-detail-sheet) lê SÓ `analysis_data` (seções Análise IA/Imputação/Dossiê); `registro_audiencia`/`analises_cowork` alimentam outras telas (Registro). Sem este passo o painel mostra "Nenhuma análise IA executada" |

Sequência típica: `fase A (principais) → conexos via OMBUDS → fase A (conexos) → curl das abas S3 abertas → fase_d_area p/ resto → organizar_dia → dossiês (agentes paralelos c/ references/instrucoes_dossie_vvd_agentes.md) → popular_ombuds + popular_analysis_data`.

## 5. Estrutura de pastas (novo padrão do dia — 2026-06-09)

```
5 - Operacional/Audiências/<ATRIB> - <DD-MM-YYYY>/
├── 1 [VVD] MPU <CNJ> - <Assistido>.pdf          ← principal da 1ª audiência (ordem da pauta)
├── 2 [VVD] APF <CNJ> - <Assistido>.pdf
├── 2.1 [VVD] AP <CNJ> - <Assistido>.pdf         ← conexos = N.1, N.2...
├── ...
├── 1 DOSSIÊ [VVD] - <Assistido>.pdf             ← dossiê de cada audiência
└── ...
```
Siglas por classe PJe: MPUMPCrim→MPU · MPCALHBI→MPU-HB (Lei Henry Borel 14.344/22) · AuPrFl→APF · APOrd/APSum→AP · PetCrim→PET · CumSen→CumSen · InqPol→IP.

**Cópia para o assistido ANTES do dossiê** (`3 - Casos/Processos - VVD (Criminal)/<Nome>/<CNJ>/Autos Digitais - <CNJ>.pdf`) — o dossiê é gerado lendo TODOS os documentos da pasta do assistido (atendimentos, transcrições, peças), não só os autos.

## 6. Dossiês por agentes paralelos

- 1 agente por audiência, instruções em `references/instrucoes_dossie_vvd_agentes.md` (saídas: MD + JSON estruturado + DOCX/PDF amber + registro OMBUDS).
- PDFs escaneados: pdftotext vem vazio → ler o PDF visualmente página a página.
- Tripla validação antes de popular: depoentes com motivo se não intimado; tese principal preenchida; na dúvida de intimação = DESCONHECIDO.

## 7. Armadilhas registradas

| Sintoma | Causa | Correção |
|---|---|---|
| `listProcessoCompleto.seam?ca=` → errorUnexpected | falta `id=` e sufixo "Advogado" | usar `listProcessoCompletoAdvogado.seam?id=&ca=` |
| expect_page timeout no DOWNLOAD | geração assíncrona (processo grande) | baixar depois pela Área de Download |
| iframe da Área "não carrega" | URL do OOPIF vem vazia | achar frame pelo conteúdo (Situação/Expiração) |
| Confirmação falsa de enfileiramento | menu lateral contém "Área de download" | verificar a Área em si, nunca o body do viewer |
| CNJ não encontrado no Peticionar | processo arquivado/baixado ou nº inexistente | conferir PDF antigo na pasta do assistido; flagar nº no OMBUDS |
| `postgres()` trava no script | pooler Supabase 6543 + prepared statements | `postgres(url, {prepare:false, ssl:"require"})` |
| AP "completa" mas com 17–42 págs | AP distribuída a partir de IP/APF apartado: o agregado só traz denúncia+certidões | baixar o "Processo referência" da capa — os depoimentos de delegacia moram lá (sem isso, `depoimento_ip` = null em todo o dossiê) |
| Processo fantasma no OMBUDS | CNJ com typo dentro de peça (ex.: 8002424-52 ≠ 8002425-52) importado como processo real | validar dígito verificador (98 − N mod 97) antes de criar/baixar |
| Associado "do caso" que é de terceiros | edital/intimação agregada de outro casal dentro dos autos | conferir as PARTES no contexto da citação antes de baixar |
| MPU "em andamento" de outra ofendida | certidão lista MPU vigente, mas a requerente não é a ofendida do fato da pauta | conferir partes no viewer; usar como contexto/antecedente, não como a MPU do fato |
| Fase A "queued" mas o PDF nunca aparece na Área; viewer mostra classe="Abrir"/partes vazias | **defensor NÃO habilitado no associado** — o viewer responde "Sem permissão para acessar a página" (idem `listProcessoCompleto.seam`); o clique de download é falso positivo | detectar "Sem permissão" no body logo após abrir o viewer e marcar `inacessivel_sem_habilitacao`; registrar pendência no dossiê ("solicitar habilitação no PJe ou vista em audiência") — NÃO insistir em rounds da Área |


## 8. Adaptação por tipo de audiência (amarração — PR #131)

Fonte única: `src/lib/agenda/tipos-audiencia.ts` (catálogo) → `detectarSubtipo(tipo, classe, atribuição)` → `SUBTIPO_CONFIG` (registro-audiencia/subtipo-audiencia.ts) → consumido pelo sheet (banner do rito) e pelo modal de registro (abas/lembretes).

Subtipos e dinâmica:
- **justificacao** (VVD/MPU, art. 19 §1º): reavaliar manutenção/revisão/revogação das MPU; NÃO é instrução. Sem "denúncia".
- **justificacao_ep** (EP): falta disciplinar/descumprimento; evitar regressão/perda de remição; PAD+contraditório (Súm. 533 STJ). Desambiguada da VVD pela ATRIBUIÇÃO.
- **admonitoria** (EP): início de cumprimento/condições; sem aba Depoentes.
- **pap**: produção antecipada de provas — instrução completa, pode ser a única chance de inquirir (Súm. 455 STJ).
- **anpp**: confissão+condições; sem aba Depoentes; cumprido extingue punibilidade e cessa cautelares.
- **aij**: instrução completa (ordem art. 400) — a referência.
- **plenario**: sessão do Júri → banner DIRECIONA ao Cockpit (`/admin/juri/cockpit`), não usa a preparação padrão.

Flags no config: `instrucaoCompleta` (aij/pap/plenario) e `direcionaCockpit` (plenario). Ao classificar a pauta no OMBUDS, o tipo gravado em `audiencias.tipo` + atribuição do processo já bastam para o subtipo resolver em todo o app.
