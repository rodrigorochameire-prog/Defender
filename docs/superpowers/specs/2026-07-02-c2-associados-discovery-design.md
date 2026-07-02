# Design — C2.2a: Descoberta de associados (do texto dos autos) + injeção no dossiê

**Data:** 2026-07-02
**Autor:** Rodrigo Rocha Meire (via Claude Code)
**Status:** Design aprovado (modo autônomo — usuário dormindo; defaults documentados)
**Escopo:** Fatia 2a do C2 (associados). Branch: `feat/c2-associados-discovery` (do `main` @ `7d760b93`).

> **REVISÃO IMPORTANTE (pós spec-review):** a primeira versão desta spec ia descobrir associados pelo **menu "Associados (N)"** do PJe. A auditoria do próprio repo (`preparar-audiencias/SKILL.md:69-71`, `references/fluxo_cdp_v2.md:27-28`, lição de 10-11/06/2026) provou que esse menu **quase sempre vem 0** (8 de 11 audiências tinham associados não baixados, e **TODOS estavam declarados DENTRO dos autos principais**). O método **validado** é **extrair os CNJs do texto do PDF dos autos** (capa "Processo referência:", certidões, decisões). Esta spec usa o método validado — que ainda por cima **não precisa de browser** (usa o `pdf_path` que o worker já tem), é mais confiável e mais testável.

---

## 1. Contexto

O 4º pedido pede "baixe os processos (principal e associados)". O worker da Fase 2c baixa só o **principal**. Descobrir os associados pelo menu do PJe é comprovadamente inútil (vem 0 quase sempre); os associados reais estão **citados dentro dos autos principais**.

Esta fatia (**2a**) entrega a parte determinística e de maior valor-por-risco: **extrair os CNJs dos associados do texto dos autos já baixados** e **injetar a lista no dossiê da análise** — a IA passa a *saber* dos conexos. O **download real dos PDFs** dos associados (2b) fica como follow-up.

## 2. Decisões (modo autônomo — defaults)

| Decisão | Escolha | Porquê |
|---|---|---|
| Fonte da descoberta | **texto do PDF dos autos principais** (pdftotext → grep CNJ) | método validado pela auditoria do repo; menu "Associados (N)" é inútil |
| Precisa de browser? | **NÃO** — usa `pdf_path` (arquivo local) já baixado | sem async port, sem navegação, sem risco de sessão fechada |
| O que 2a entrega | extrair CNJs + injetar a LISTA no dossiê | valor testável; isola o download (2b) |
| Persistir os associados? | **NÃO** (nem migração nem coluna) | valor é a injeção no prompt; persistir = follow-up |
| Fonte só PJe (não EP/SEEU) | sim — no ramo PJe, onde há um `pdf_path` único | EP/SEEU (múltiplos PDFs) = follow-up |
| Extração de texto | reusar `vt.extract_pdf_text(pdf_path)` (pdftotext+OCR, nunca levanta — de A) | já existe e nunca quebra |
| Núcleo testável | `extract_cnjs` (regex+dedup+cap) + `associados_from_text` (exclui principal) + `format_dossie(..., associados)` | puros; a única I/O é o pdftotext (subprocess já usado no repo) |
| Cap | `MAX_ASSOCIADOS = 30` | bound de tamanho |

## 3. Mecanismo (reuso do C2.2)

O C2.2 já injeta um "dossiê do assistido" no `prompt` da task `analise-autos`. 2a **adiciona uma seção** `### Processos associados/conexos (citados nos autos)`. Os associados vêm do **texto do PDF** (não do banco), então são passados **para dentro** do `format_dossie` a partir do worker.

## 4. Design (componentes) — em `.claude/skills/analise-profunda-demanda/scripts/analise_profunda_autos.py`

### 4.1 `extract_cnjs(text: str) -> list[str]` (PURO, testável)
```python
CNJ_RE = re.compile(r"\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}")
MAX_ASSOCIADOS = 30
def extract_cnjs(text: str) -> list[str]:
    return sorted(set(CNJ_RE.findall(text or "")))[:MAX_ASSOCIADOS]
```

### 4.2 `associados_from_text(text, cnj_principal) -> list[str]` (PURO, testável)
`extract_cnjs(text)` **menos** o CNJ do processo principal (normalizado — só dígitos, para casar apesar de máscara/pontuação). Retorna a lista de CNJs distintos que NÃO são o principal.
```python
def _cnj_digits(s): return re.sub(r"\D", "", s or "")
def associados_from_text(text: str, cnj_principal: str = "") -> list[str]:
    main = _cnj_digits(cnj_principal)
    return [c for c in extract_cnjs(text) if _cnj_digits(c) != main]
```

### 4.3 `format_dossie(..., associados=None)` — nova seção (PURO)
`format_dossie` ganha param opcional `associados: list | None = None`. Se não-vazio, renderiza (antes do bound total):
```
### Processos associados/conexos (citados nos autos)
- 8000000-00.2026.8.05.0039
- …
```
`None`/vazio → nenhuma seção (comportamento C2.2 intacto).

### 4.4 `extrair_associados_autos(pdf_path, cnj_principal) -> list[str]` (I/O — pdftotext; nunca levanta)
```python
def extrair_associados_autos(pdf_path, cnj_principal="") -> list[str]:
    try:
        if not pdf_path:
            return []
        texto = vt.extract_pdf_text(pdf_path)   # pdftotext+OCR, nunca levanta (de A)
        return associados_from_text(texto or "", cnj_principal)
    except Exception:
        return []
```
Testável alimentando um `pdf_path` cujo `vt.extract_pdf_text` é monkeypatchado no teste (ou testando `associados_from_text` direto — a lógica real está lá; esta função é só a cola pdftotext).

### 4.5 `build_dossie_assistido(sb, assistido_id, associados=None) -> str`
Ganha o param `associados` (default `None`) e o repassa a `format_dossie`.

### 4.6 Wire no `main_async` (ramo PJe, logo após `baixar_pdf_autos`)
```python
pdf_path = await vt.baixar_pdf_autos(ctx, autos_url)     # já existe (~L399)
...
associados = extrair_associados_autos(pdf_path, cnj)     # NOVO — logo após ter o pdf_path
...
dossie = build_dossie_assistido(sb, row["assistido_id"], associados=associados)
```
`pdf_path` é uma string (arquivo local em /tmp) que **sobrevive ao fechamento do bloco `async with async_playwright`** — a extração pode acontecer dentro ou fora do bloco, sem risco de sessão fechada. EP/SEEU: `associados=[]` (não extrai; múltiplos PDFs = follow-up). Demais args do `build_analise_autos_task` intactos.

## 5. Fluxo de dados
worker baixa o principal (`pdf_path`) → `extrair_associados_autos(pdf_path, cnj)` (pdftotext → CNJs − principal) → `build_dossie_assistido(sb, aid, associados=lista)` → `format_dossie` renderiza "Processos associados/conexos" → `prompt` da `analise-autos` → a IA analisa sabendo dos conexos citados nos autos.

## 6. Tratamento de erro
- `extrair_associados_autos` nunca levanta (try/except → `[]`); `vt.extract_pdf_text` também nunca levanta. Se a extração falhar, o dossiê fica sem a seção; a análise segue igual.
- Sem CNJs nos autos → `[]` → sem seção.

## 7. Testes (TDD)
- **`extract_cnjs` (puro):** extrai/dedup/ordena/cap ≤30; sem CNJ → `[]`; None → `[]`.
- **`associados_from_text` (puro):** exclui o CNJ principal (casando apesar de máscara); mantém os demais; texto com o principal repetido + 2 associados → 2 associados; sem associados → `[]`.
- **`format_dossie(..., associados)` (puro):** com lista → renderiza a seção + CNJs; `None`/`[]` → sem seção; coexiste com as demais seções; entra no bound total.
- **`build_dossie_assistido(sb, aid, associados=[...])`:** com `FakeSB` + associados → dossiê contém a seção; sem associados → sem seção; ainda engole erro do `sb`.
- **`extrair_associados_autos`:** monkeypatch `vt.extract_pdf_text` p/ devolver texto com 2 associados + o principal → retorna os 2; pdftotext levantando → `[]` (engolido).
- `ast.parse` no worker (segue parseável). Testes existentes (`test_gather_dossie`, `test_analise_profunda_helpers`, `test_worker_structure`) verdes.

## 8. Critérios de aceitação
1. `extract_cnjs` + `associados_from_text` puros e testados (dedup/sort/cap/exclui-principal/vazio).
2. `format_dossie` renderiza a seção de associados só quando há lista; sem lista → dossiê idêntico ao C2.2.
3. `extrair_associados_autos` usa `vt.extract_pdf_text`, nunca levanta ([] em erro).
4. `build_dossie_assistido` aceita `associados=` e repassa.
5. Wire só no ramo PJe (usa `pdf_path`), após `baixar_pdf_autos`; EP/SEEU não extrai.
6. Testes existentes verdes; `ast.parse` ok. Sem migração/daemon/skill; sem persistir.

## 9. Deferidos / próximas fatias
- **2b (validação viva):** download real dos PDFs dos associados descobertos (rota Peticionar→idProcesso/ca→fila "Área de Download"→poll) + roteamento no Drive + opcionalmente persistir os associados. (O menu "Associados (N)" NÃO é fonte confiável — usar os CNJs que 2a extrai dos autos.)
- **EP/SEEU:** extrair associados dos múltiplos PDFs do SEEU.
- **Verificação viva** de 2a: rodar a Fase 2c num processo real com associados citados nos autos e conferir a seção no dossiê.
- Outras fatias C2: mídias (PJe Mídias), modal unificado.
