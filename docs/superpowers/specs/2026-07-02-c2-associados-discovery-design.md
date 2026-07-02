# Design — C2.2a: Descoberta de associados + injeção no dossiê da Fase 2c

**Data:** 2026-07-02
**Autor:** Rodrigo Rocha Meire (via Claude Code)
**Status:** Design aprovado (modo autônomo — usuário dormindo; defaults documentados)
**Escopo:** Fatia 2a do C2 (associados). Branch: `feat/c2-associados-discovery` (do `main` @ `7d760b93`).

---

## 1. Contexto

O 4º pedido pede "baixe os processos (principal e associados)". O worker da Fase 2c baixa só o **principal** (via `find_in_panel` no painel de expedientes → `baixar_pdf_autos`). Associados **não têm expediente no painel**, então `find_in_panel` não acha o link deles; o download real deles exige um mecanismo diferente (Peticionar → idProcesso/ca → fila "Área de Download" → poll `fase_b`), que é browser-pesado e **só validável ao vivo** num PJe logado.

**Decomposição:** esta fatia (**2a**) entrega a parte determinística e de maior valor-por-risco: **descobrir os CNJs dos associados** (via o menu "Associados (N)") e **injetar a lista no dossiê da análise** — a IA passa a *saber* dos conexos, mesmo sem baixar os PDFs. O **download real** (2b) fica como follow-up com validação viva.

## 2. Decisões (modo autônomo — defaults)

| Decisão | Escolha | Porquê |
|---|---|---|
| O que 2a entrega | descobrir CNJs dos associados + injetar a LISTA no dossiê | valor testável; isola o download arriscado |
| Persistir os associados? | **NÃO** (nem migração nem coluna) | valor é a injeção no prompt; persistir = follow-up. Evita migração/blast-radius |
| Fonte da descoberta | menu "Associados (N)" (async port do `get_associados`/`open_menu` do `preparar_download.py`) | é o caminho que funciona; sem varredura de capa |
| Só PJe (não EP/SEEU) | sim — descoberta só no ramo PJe do `main_async` | EP vem do SEEU, sem menu Associados |
| Núcleo testável | `extract_cnjs` (regex+dedup+cap) + `format_dossie(..., associados)` | puros; a descoberta-via-browser é inspection-verified + live-deferred (como o `baixar_pdf_autos`) |
| Cap | `MAX_ASSOCIADOS = 30` | bound de tamanho |

## 3. Mecanismo (reuso do C2.2)

O C2.2 já injeta um "dossiê do assistido" no `prompt` da task `analise-autos`. 2a **adiciona uma seção** a esse dossiê: `### Processos associados/conexos`. Os associados vêm do **browser** (não do banco), então são passados **para dentro** do `format_dossie` a partir do worker (separado do fetch de banco).

## 4. Design (componentes) — em `.claude/skills/analise-profunda-demanda/scripts/analise_profunda_autos.py`

### 4.1 `extract_cnjs(text: str) -> list[str]` (PURO, testável)
```python
CNJ_RE = re.compile(r"\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}")
MAX_ASSOCIADOS = 30
def extract_cnjs(text: str) -> list[str]:
    return sorted(set(CNJ_RE.findall(text or "")))[:MAX_ASSOCIADOS]
```

### 4.2 `format_dossie(..., associados=None)` — nova seção (PURO)
`format_dossie` ganha um param opcional `associados: list | None = None`. Se não-vazio, renderiza (antes do bound total):
```
### Processos associados/conexos
- 8000000-00.2026.8.05.0039
- …
```
Se `None`/vazio → nenhuma seção (comportamento atual intacto). Excluir o CNJ do próprio processo principal se aparecer (o worker passa o CNJ principal p/ filtrar) — opcional; simples: dedup só.

### 4.3 `descobrir_associados(page) -> list[str]` (BROWSER — inspection-verified, live-deferred)
Async port de `open_menu` + `get_associados` do `preparar_download.py` (que é sync `patchright.sync_api`; aqui é `await page.evaluate(...)`/`page.keyboard.press`). Abre o menu, lê "Associados (N)"; se N>0, clica, faz diff do `innerText` antes/depois, e retorna `extract_cnjs(novas_linhas)`. **Nunca levanta** — try/except → `[]`. Anti-ciência: só lê o painel/menu; não navega `visualizarExpediente.seam`.

### 4.4 `build_dossie_assistido(sb, assistido_id, associados=None) -> str`
Ganha o param `associados` (default `None`) e o repassa a `format_dossie`. (Não faz browser — os associados chegam prontos do call-site.)

### 4.5 Wire no `main_async` (ramo PJe, após o download principal)
```python
# ramo PJe (não-SEEU), após baixar/distribuir o principal, ainda com `page`:
associados = []
try:
    associados = await descobrir_associados(page)
except Exception:
    associados = []
...
dossie = build_dossie_assistido(sb, row["assistido_id"], associados=associados)
```
EP/SEEU: `associados` fica `[]` (não chama descobrir). Todos os outros args do `build_analise_autos_task` intactos.

## 5. Fluxo de dados
worker baixa o principal → (ramo PJe) `descobrir_associados(page)` → lista de CNJs → `build_dossie_assistido(sb, aid, associados=lista)` → `format_dossie` renderiza a seção "Processos associados/conexos" → vai no `prompt` da `analise-autos` → a IA analisa sabendo dos conexos.

## 6. Tratamento de erro
- `descobrir_associados` nunca levanta (try/except → `[]`); o wire também é try/except → `[]`. Se a descoberta falhar, o dossiê fica sem a seção de associados; a análise segue igual.
- Sem associados (N=0) → `[]` → sem seção.

## 7. Testes (TDD)
- **`extract_cnjs` (puro):** extrai CNJs de texto, dedup, ordena, cap ≤30; texto sem CNJ → `[]`; None → `[]`.
- **`format_dossie(..., associados)` (puro):** com lista → renderiza "### Processos associados/conexos" + os CNJs; `None`/`[]` → sem seção; associados + demais seções coexistem; entra no bound total.
- **`build_dossie_assistido(sb, aid, associados=[...])`:** com `FakeSB` (do teste do C2.2) + associados → dossiê contém a seção; sem associados → sem seção; ainda engole erro do `sb`.
- **Browser (`descobrir_associados`):** inspection-verified (código async espelha o `get_associados` sync) — **verificação viva deferida** (precisa PJe logado com processo multi-associados). `ast.parse` no worker.

## 8. Critérios de aceitação
1. `extract_cnjs` puro e testado (dedup/sort/cap/vazio).
2. `format_dossie` renderiza a seção de associados só quando há lista; sem lista → dossiê idêntico ao C2.2.
3. `build_dossie_assistido` aceita `associados=` e repassa; ainda engole erro.
4. `descobrir_associados` nunca levanta ([] em erro); wire só no ramo PJe; EP/SEEU não chama.
5. Testes existentes (`test_gather_dossie`, `test_analise_profunda_helpers`, `test_worker_structure`) seguem verdes; `ast.parse` ok.
6. Sem migração, sem daemon/skill, sem persistir associados.

## 9. Deferidos / próximas fatias
- **2b (validação viva):** download real dos PDFs dos associados (async port do Peticionar→idProcesso/ca→fila "Área de Download"→poll `fase_b`) + roteamento no Drive (nomear/colocar na pasta do assistido) + opcionalmente persistir os associados.
- **Verificação viva** do `descobrir_associados` (PJe logado).
- Outras fatias C2: mídias (PJe Mídias), modal unificado.
