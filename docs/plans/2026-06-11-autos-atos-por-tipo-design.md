# Autos inteligentes + Atos por tipo no sheet/modal — Design

**Data:** 2026-06-11
**Branch:** `feat/autos-atos-por-tipo`
**Contexto:** No sheet da audiência (e da demanda) a aba **Autos** vem vazia quando o processo não tem `drive_files` vinculados — embora o assistido tenha os PDFs na pasta dele (confirmado: 12+ audiências nessa situação; vários processos sem `drive_folder_id`). Além disso, o OMBUDS já fatia os autos por tipo de ato em `drive_document_sections` (1.091 seções, 22 processos, **16 deles VVD**) e expõe isso numa página separada (`/admin/processos/[id]/sistematizacao`, `SectionsViewer`), mas **não** onde o defensor trabalha (sheet/modal de registro).

## Objetivo

1. **Autos nunca vazios** + vínculo inteligente: casar os PDFs do assistido com o processo da audiência/demanda e exibi-los agrupados por relevância.
2. **Atos por tipo** (denúncia, depoimentos de delegacia, laudos, ata de audiência, depoimentos em juízo…) expostos no próprio sheet/modal, com clique abrindo o PDF inline **na página do ato**.

Entrega em 2 fases independentes; cada uma com valor próprio.

---

## Fase 1 — Autos inteligentes (match + agrupamento + auto-vínculo)

### Camada de match — `src/lib/match-autos.ts` (puro, testável)
- `extrairCNJ(nome: string): string | null` — extrai CNJ do nome do arquivo (regex `\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}`), normaliza dígitos.
- `classificarAutos({ files, processoCNJ, correlacionadosCNJ })` → particiona os PDFs em **3 grupos**:
  1. **Deste processo** — `extrairCNJ(nome) === processoCNJ` (ou já com `processo_id` deste processo). Confiança alta.
  2. **Correlacionados** — `extrairCNJ(nome) ∈ correlacionadosCNJ` (CNJ de processo que compartilha o mesmo `casoId`; conexos do caso: IP/APF/MPU de origem, desmembrados). **Não** são antecedentes.
  3. **Outros do assistido** — demais PDFs (CNJ diferente sem caso comum, ou sem CNJ no nome). Antecedentes/não relacionados.
- Função pura: entra lista + CNJs, sai `{ desteProcesso, correlacionados: {cnj, classe?, files}[], outros }`. Sem I/O.

### Procedure tRPC — `drive.autosDoProcesso({ processoId, assistidoId })`
- Lê `processos` (numeroAutos, casoId), os **irmãos do caso** (`processos where casoId = base.casoId and id != base.id` → CNJs correlacionados + classe), e os PDFs do assistido (`filesByAssistido`).
- Aplica `classificarAutos`.
- **Auto-vínculo silencioso, só confiança alta:** para os de "Deste processo" ainda sem `processo_id`, faz `UPDATE drive_files SET processo_id = base.id`; se `processos.drive_folder_id` for nulo, define a partir da pasta desses arquivos. Idempotente e reversível (não apaga nada; só associa). **Nunca** vincula correlacionados/outros a este processo.
- Retorna `{ desteProcesso[], correlacionados[], outros[] }` (cada file com driveFileId, name, mimeType, webViewLink, fileSize, enrichmentStatus + CNJ detectado).

### UI — `DocumentosBlock` (agenda) e Recursos do `DemandaQuickPreview`
- Aba **Autos** consome `autosDoProcesso` em vez de `filesByProcesso` cru.
- Render em 3 seções (sub-abas internas ou grupos colapsáveis, topo→base):
  1. **Deste processo** (default aberto).
  2. **Correlacionados** — cada item com badge do CNJ/classe (ex.: "IP 8006774-35.2024", "MPU …").
  3. **Outros do assistido** — colapsado por padrão.
- Cada arquivo abre no visualizador inline já existente (`DocumentPreviewDialog`/proxy).
- Estado vazio real (nem o assistido tem PDF): CTA mantém o `DropZone` atual ("arraste") + nota de baixar do PJe (fora de escopo desta entrega).

---

## Fase 2 — Aba "Atos" (sistematização por tipo) + deep-link

### UI — nova aba **"Atos"** no `DocumentosBlock` (ao lado de Autos | Assistido) e bloco equivalente no `DemandaQuickPreview`
- Reusa **`SectionsViewer`** (já agrupa por tipo/tier, filtra por tipo, agrupa por depoente) alimentado por `sectionsByProcesso(processoId)`.
- Lista os atos por tipo: Denúncia, Depoimentos (delegacia) por depoente, Laudos (lesões/arma/…), Boletim, Relatório policial, Ata de audiência, Depoimentos em juízo, Decisões, Alegações, 422, HC…
- **Clique no ato → abre o PDF inline na página** via `DocumentPreviewDialog`/`AutosPreviewPane` apontando `…/api/drive/proxy?fileId=<id>#page=<paginaInicio>` (proxy é same-origin; o viewer nativo respeita `#page`). O Drive `/preview` não suporta `#page` confiável → quando a fonte for "Drive", abrir na 1ª página.
- Sem seções para o processo: botão **"Sistematizar"** dispara o enrichment existente (Inngest); estado "sistematizando…". Processos já sistematizados (16 VVD) aparecem na hora.

### Deep-link à página
- `DocumentPreviewDialog`/`AutosPreviewPane` aceitam `initialPage?: number`; quando fonte = proxy, montam `src` com `#page=N`.

### "Expandir à esquerda" (doca não-modal, sheet continua ativo)
Hoje o expandir abre o `DocumentPreviewDialog` como **overlay que tapa tudo** — o sheet fica inacessível. Acrescentar um modo **doca à esquerda**: ao expandir (do "Ver autos", da aba Autos ou de um ato), o **próprio sheet alarga** (ex.: `w-[1040px]` → `w-[96vw]`) e o corpo vira um split **[PDF à esquerda | conteúdo do sheet à direita]**. Não é um segundo modal: é a mesma superfície do sheet, então **o manuseio do sheet permanece ativo** (abas, registro, anotações) enquanto se lê o PDF ao lado.
- Estado no sheet: `docaAutos: { fileId, page? } | null`. Quando setado, `SheetContent` aplica a largura expandida e renderiza `AutosPreviewPane` (proxy, `#page`) numa coluna à esquerda; conteúdo normal à direita; botão para recolher.
- O **"Expandir à esquerda" passa a ser o expandir primário** a partir do sheet; **"Tela cheia"** (overlay) continua disponível como opção (para quem quer o PDF dominando a tela).
- Reusa `AutosPreviewPane` (já tem toolbar App/Drive, baixar, etc.). Vale para `event-detail-sheet` (agenda) e `DemandaQuickPreview` (demanda).

---

## Reuso x Novo

**Reusa:** `SectionsViewer`/`SectionCard`/`SectionDetailSheet`, `DocumentPreviewDialog`, `AutosPreviewPane`, `sectionsByProcesso`, `filesByAssistido`, enrichment (Inngest), `processos.casoId`.
**Novo:** `lib/match-autos.ts` (+ testes vitest), `drive.autosDoProcesso` (tRPC + auto-vínculo), aba "Atos" nos dois sheets, sub-grupos da aba Autos, `initialPage`/`#page` no visualizador.

**Fora de escopo:** baixar autos do PJe (fluxo 2FA/CDP do `preparar-audiencias`); o `fracionar-autos` (Python) segue como ferramenta de CLI/análise — no OMBUDS a fonte é `drive_document_sections`, sem duplicar PDF.

## Tratamento de erros
- `autosDoProcesso` sem `casoId`: correlacionados = []; só "Deste processo" + "Outros".
- Auto-vínculo: envolto em try/catch; falha não quebra a listagem (retorna os grupos mesmo sem persistir).
- Drive desconectado / proxy falha: mantém o estado atual do `DocumentosBlock` ("Google Drive não conectado").
- `#page` inválido: viewer abre na 1ª página.

## Testes
- `match-autos.test.ts` (vitest, happy-dom não necessário — puro): CNJ no nome, CNJ deste processo, CNJ correlacionado, sem CNJ, ruído. Casos reais (Erivelton, Francisco) como fixtures de nome.
- Asserção de partição (cada arquivo em exatamente 1 grupo).
- Verificação manual no browser (sessão mintada) — sheet da audiência de um dos 12 casos: Autos deixa de ser vazio; aba Atos lista por tipo; clique abre na página.

## Decomposição de implementação
- **Plano 1 (Fase 1):** match-autos + autosDoProcesso + auto-vínculo + UI dos 3 grupos. Resolve o "Autos vazio".
- **Plano 2 (Fase 2):** aba "Atos" + deep-link + botão Sistematizar.
