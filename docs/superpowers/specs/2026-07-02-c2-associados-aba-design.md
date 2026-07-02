# Design — C2.2a-v2: Descoberta robusta de processos relacionados (aba + texto, classificada)

**Data:** 2026-07-02
**Autor:** Rodrigo Rocha Meire (via Claude Code)
**Status:** Design aprovado — validado AO VIVO com o usuário. Branch: `feat/c2-associados-aba` (do `main` @ `5a547246`).

---

## 1. Contexto (o que a investigação ao vivo provou)

A fatia 2a (mergeada) descobria processos relacionados **só do texto dos autos**. A investigação ao vivo com o usuário (2026-07-02) provou que isso é **incompleto**:

- **A aba "Associados" do PJe-TJBA É populada** em ações penais recentes (3 de 5 casos: 3, 4, 2 associados). O meu "13/13=0" anterior era **bug do scraper** (lia a página do advogado `...Advogado.seam` e não expandia os accordions).
- A aba tem **4 tipos formais** (accordions RichFaces): **Dependência, Prevenção, Desmembramento, Vinculação Direta** — e traz de graça **classe** (IP/AuPrFl/APri/Júri), **assunto** (Feminicídio/Homicídio), **partes**, **comarca**, **data**, **sigilo**.
- O **texto às vezes PERDE um associado formal** (caso Francisco: `8004943-15` estava na aba mas não no texto). E a aba não pega o que é só **mencionado** (citações). São **complementares**.

**Distinção do usuário (preservar):** "mencionado nos autos" é relevante (manter), mas **não é "associado" no sentido estrito** (formal, da aba). São coisas diferentes, ambas úteis.

## 2. Como ler a aba (RichFaces — descoberto ao vivo)

Página **`listProcessoCompleto.seam?id=&ca=`** (NÃO a `...Advogado.seam`). Sequência validada em `scripts/pje-cdp/diag_associados2.py`:
1. `get_ca(cnj)` (Peticionar) → id/ca → `goto(listProcessoCompleto.seam?id=&ca=)`.
2. Clicar o anchor `#navbar:linkAbaAssociados` (`el.click()` dispara o `A4J.AJAX.Submit`).
3. Esperar o painel ("Número do processo"/"resultados encontrados").
4. Expandir os 4 accordions: headers `.rich-stglpanel-header` (id `toggleProcessosAssociados<Tipo>_header`) — `el.click()` em cada.
5. Ler o `innerText` do painel.

Formato de cada associado no texto do painel (fixtures reais capturados):
```
/VARA DO JÚRI E EXECUÇÕES PENAIS DA COMARCA DE CAMAÇARI
AuPrFl 8003770-53.2025.8.05.0039 - Feminicídio
ALANA FRANCA SANTANA e outros (1) X FRANCISCO LIMA DOS SANTOS OLIVEIRA
Distribuído em: 02/04/2025
	Dependência (Pendente)
```
Sigiloso:
```
8004193-13.2025.8.05.0039
(Este processo é sigiloso e você não tem permissão para visualizá-lo)
	Dependência (Pendente)
```

## 3. Decisões

| Decisão | Escolha |
|---|---|
| Fonte primária | **aba** (formal, classificada, com metadados) |
| Suplemento | **texto** dos autos (2a — mencionados-não-associados) |
| Resultado | **união classificada** — cada item: `{cnj, fonte(aba/texto), tipo, classe, assunto, sigilo, comarca, dv_ok}` |
| Rótulo no dossiê | **"Processos relacionados"** (não "associados" estrito), com tipo/classe/sigilo |
| Núcleo testável | parse do painel + classificação + DV + união = PUROS (fixtures = texto real capturado); a navegação da aba = browser, **live-validated** |
| Onde roda | Fase 2c worker `analise_profunda_autos.py` (browser-lane; já tem `ctx`) |
| Guardado | tudo try/except → degrada (nunca quebra a Fase 2c) |
| Sigilo | associado sigiloso é **listado** (informa a análise) mas marcado 🔒 (2b não baixa) |

## 4. Design (componentes) — em `.claude/skills/analise-profunda-demanda/scripts/`

### 4.1 `parse_associados_panel(panel_text, cnj_principal) -> list[dict]` (PURO, testável)
Divide o texto do painel pelas 4 seções (`Dependência`/`Prevenção`/`Desmembramento`/`Vinculação Direta`); em cada, para cada CNJ (≠ principal): extrai `classe` (token antes do CNJ), `assunto` (após " - "), `sigilo` (regex "sigilos" próximo), `data` ("Distribuído em: …"), `tipo`=label do accordion. Retorna `[{cnj, tipo, classe, assunto, sigilo, comarca}]` (comarca = os 4 dígitos finais do CNJ). Nunca lança.

### 4.2 `cnj_dv_ok(cnj) -> bool` (PURO) — dígito verificador CNJ (mod-97).

### 4.3 `classificar_relacionado(item) -> item` (PURO) — anexa flags:
- `dv_ok` (via cnj_dv_ok).
- `grau`: `2ª inst` se OOOO=0000; `outra corte` se não `.8.05.`; senão `1º grau`.
- `baixavel`: `True` se `dv_ok` e não `sigilo` e grau `1º grau` (heurística p/ 2b).

### 4.4 `merge_relacionados(aba, texto_cnjs, cnj_principal) -> list[dict]` (PURO)
União: começa da aba (fonte primária, com metadados); adiciona os CNJs do texto que não estão na aba como `{cnj, fonte:'texto', tipo:'citado', classe:'', ...}`; dedup por dígitos; DV+classificação em todos; ordena (aba antes de texto, baixáveis antes). Exclui o principal.

### 4.5 `read_associados_aba(ctx, cnj) -> list[dict]` (BROWSER — live-validated; nunca lança)
Porta a lógica validada do `diag_associados2.py`: nova página → `get_ca` → `listProcessoCompleto.seam` → click `navbar:linkAbaAssociados` → expande os 4 accordions → pega o innerText → `parse_associados_panel`. try/except → `[]`. Fecha a página no fim.

### 4.6 `format_dossie(..., relacionados=None)` — nova seção classificada
Renderiza (se houver): `### Processos relacionados citados/associados`:
```
- [Dependência/AuPrFl] 8003770-53.2025.8.05.0039 — Feminicídio (1º grau)
- [Dependência] 8004193-13.2025.8.05.0039 — 🔒 sigiloso
- [citado] 0000811-91.2023.2.00.0805 — citação normativa (fora de 1º grau)
```
(Substitui a seção crua de "associados" da 2a por esta classificada.)

### 4.7 Wire no `main_async` (ramo PJe, após o download)
```python
relacionados = []
try:
    aba = read_associados_aba(ctx, cnj)                 # browser
    texto = extrair_associados_autos(pdf_path, cnj)     # 2a (já existe)
    relacionados = merge_relacionados(aba, texto, cnj)
except Exception:
    relacionados = []
...
dossie = build_dossie_assistido(sb, row["assistido_id"], relacionados=relacionados)
```
(EP/SEEU: `relacionados=[]`.)

## 5. Tratamento de erro
- Cada função browser/parse em try/except → `[]`. A Fase 2c nunca quebra. Se a aba falhar, cai só no texto; se ambos falharem, dossiê sem a seção.

## 6. Testes (TDD)
- **`parse_associados_panel` (fixtures = texto REAL capturado):** o painel do Francisco (3 em Dependência, 1 sigiloso) e do Edimilson (Dependência IP + Prevenção APri + Desmembramento Júri) → asserta cnj/tipo/classe/assunto/sigilo corretos; painel vazio ("0 resultados") → `[]`.
- **`cnj_dv_ok`:** CNJs válidos (os reais) → True; um com DD trocado → False.
- **`classificar_relacionado`:** OOOO=0000 → grau 2ª inst, baixavel False; `.2.00.` → outra corte; 1º grau não-sigiloso DV-ok → baixavel True.
- **`merge_relacionados`:** aba+texto com overlap → dedup; item só-no-texto → fonte 'texto'/'citado'; principal excluído.
- **`format_dossie(..., relacionados)`:** renderiza a seção classificada; None → sem seção; testes 2a existentes seguem verdes.
- **`read_associados_aba`:** browser — **live-validated** (já rodamos ao vivo em 5 casos); inspection + `ast.parse`.

## 7. Critérios de aceitação
1. `parse_associados_panel` puro, testado com fixtures reais (Francisco/Edimilson) — cnj/tipo/classe/sigilo corretos.
2. DV + classificação + merge puros e testados (dedup, grau, baixavel, exclui principal).
3. `read_associados_aba` porta a lógica validada; nunca lança.
4. `format_dossie` renderiza a seção "Processos relacionados" classificada; None → sem seção; 2a intacto.
5. Wire guardado no ramo PJe; EP/SEEU não chama; nunca quebra a Fase 2c.
6. Testes existentes verdes; `ast.parse` ok. Sem migração/daemon/skill.

## 8. Deferidos
- **2b:** baixar os `baixavel=True` (não-sigilosos, 1º grau) via o fluxo de download (fila Área de Download) + roteamento no Drive.
- Verificação viva end-to-end da Fase 2c com a aba integrada (a leitura da aba já foi validada isolada).
- Polir o parser de partes/data (não essencial p/ o dossiê).
