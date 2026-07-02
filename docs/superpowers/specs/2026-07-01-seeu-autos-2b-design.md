# SEEU Fase 2b — Download de Autos do SEEU (habilita EP no pipeline profundo)

> **Status:** design aprovado (brainstorming 2026-07-01). **Spec build-ready; o build da primitiva de download precisa de UMA passada com o SEEU logado ao vivo** (mapear seletores das "Ações"/esquema de URL do documento). O restante (navegação reusada, staging, wiring, testes puros) é construível sem sessão.
>
> **Build 2026-07-02 (sem sessão ao vivo):** feitos ✅ Task 1 (helpers puros `seeu_autos.py` + 13 testes), ✅ Task 3a (roteamento EP→SEEU no worker `analise_profunda_autos.py`), ✅ estrutura de `baixar_autos_seeu` (navegação reusa a Mesa da 2a) e distribuição multi-PDF. **Live-gated (pendente da sessão):** `_coletar_documentos_disponiveis` e `_baixar_documento` levantam `SeeuAutosLiveGated` até o mapa dos seletores (§4). **Elegibilidade EP na 2c permanece FECHADA** com motivo explícito ("pendente de mapeamento ao vivo") em `isElegivel2c` — o FLIP (mover `EXECUCAO_PENAL` p/ `ATRIB_ELEGIVEIS_2C`) é a última linha, feita após o mapa fechar a primitiva, para não expor um botão que sempre erraria.
> **Contexto:** contrapartida SEEU do `baixar_pdf_autos` do PJe. A Fase 2c (análise profunda) hoje só baixa autos via PJe (Júri/VVD). 2b provê a primitiva de autos do SEEU → **destrava a 2c para Execução Penal**.

## 1. Objetivo

Dado o CNJ de um processo de Execução Penal (demanda EP "cabe peça"), baixar os documentos (autos) do SEEU e deixá-los na pasta do assistido no Drive, para que a lane ai da 2c os analise. Análogo, em papel, ao `baixar_pdf_autos(ctx, autos_url)` do PJe (`varredura_triagem.py`), mas para o SEEU.

### Escopo

| Decisão | Valor |
|---|---|
| Sistema | SEEU (Execução Penal) — via CDP a browser logado (Keycloak), como Fases 1/2a |
| Entrada | CNJ (do processo da demanda EP) |
| Saída | PDFs dos documentos na pasta `<assistido>/Autos/` no Drive |
| Reuso | navegação da 2a (`seeu_expediente.py`: Mesa cache → `visualizacaoProcesso` → timeline "Movimentações") |
| Integração | ramo EP do worker da 2c (`analise_profunda_autos.py`) chama esta primitiva em vez do `baixar_pdf_autos` do PJe |
| Read-only | nunca clica ação que altera estado no SEEU |
| **Live-gated** | mecanismo exato de download do documento (seletores "Ações", URL/`expect_download`) — mapear na 1ª passada ao vivo |

## 2. Arquitetura

```
baixar_autos_seeu(ctx, cnj) -> list[str]:
  1. reusa _ensure_mesa_cache(ctx) + o href visualizacaoProcesso do CNJ (2a)
  2. abre a página do processo (proc_page)
  3. lê a timeline "Movimentações" → coleta os documentos disponíveis (linhas com
     ícone/ação de documento na coluna "Ações")
  4. para cada documento: dispara o download (expect_download) OU resolve a URL do
     doc e baixa; salva em /tmp/seeu_autos_<hash>/<seq>.pdf
  5. retorna a lista de caminhos (ou consolida num PDF único, se preferível)
  (defensivo: documento que falha é logado e pulado; nunca aborta o lote)

wiring na 2c (analise_profunda_autos.py):
  if atribuicao == EXECUCAO_PENAL: pdfs = baixar_autos_seeu(ctx, cnj)
  else (Júri/VVD):                 pdf  = baixar_pdf_autos(ctx, autos_url)   # já existe
  → distribuir p/ <assistido>/Autos/ no Drive → enfileira análise ai (igual hoje)
```

**Ampliação da elegibilidade:** hoje `analiseProfunda.criar` (2c) e `isElegivel2c` restringem a Júri/VVD. Com 2b, incluir `EXECUCAO_PENAL` na elegibilidade da 2c (e o worker roteia EP→SEEU). Isso é parte de 2b (o wiring), não de 2c.

## 3. Componentes

| Arquivo | Papel | Build |
|---|---|---|
| `.claude/skills/varredura-triagem/scripts/seeu_autos.py` (novo) | `baixar_autos_seeu(ctx, cnj)` + helpers puros (dedup de docs, nomes) | navegação/estrutura: build-ready; **primitiva de download: live-gated** |
| `seeu_autos.py` testes puros | `test_seeu_autos.py` — dedup, montagem de nomes, roteamento | build-ready |
| `.claude/skills/analise-profunda-demanda/scripts/analise_profunda_autos.py` (modify) | ramo EP → `baixar_autos_seeu`; import read-only | build-ready (o call-site), depende da primitiva |
| `src/lib/trpc/routers/analise-profunda.ts` + helper `isElegivel2c` (modify) | incluir `EXECUCAO_PENAL` na elegibilidade | build-ready |

## 4. A fatia live-gated (o que mapear com o SEEU aberto)

Na timeline "Movimentações" de `visualizacaoProcesso.do` (a 2a já expande o teor via `showDetail`):
- **Coluna "Ações":** quais ícones/links abrem o documento? (`onclick`? `href`? popup?)
- **Download:** o clique dispara `expect_download` (PDF direto) ou abre um viewer/URL (`/seeu/.../documento/...` estilo `/procapi` do PJe)? Há um "baixar autos completos" único?
- **Sigilo/permissão:** algum documento restrito? (EP costuma ser menos sigiloso que VVD.)
- **Paginação/volume:** processos de execução são longos (muitos movimentos) — precisa paginar a timeline?

Com isso mapeado, `baixar_autos_seeu` fecha. **Sem isso, o build da primitiva é chute.** Por isso o build de 2b começa por uma sessão de mapeamento ao vivo (15–20 min navegando 1 processo EP real), e daí segue TDD.

## 5. Erros & robustez

- Documento falha no download → loga, pula, segue (não aborta o lote).
- CNJ não está na Mesa (processo não pendente) → a 2a resolve via Mesa cache; se ausente, erro claro (não inventa).
- Read-only; nunca clica ação de alteração; nunca escreve no SEEU.
- Timeline longa → paginar (mapear ao vivo se há paginação).
- Reusa o gotcha de sessão da 2a/1.5: `ep_only` / não navegar p/ PJe SSO (não destruir a Mesa do SEEU).

## 6. Testes

- **pytest (puro, build-ready agora):** dedup de documentos por (seq/id), montagem de nome de arquivo, o roteamento EP→SEEU (dado atrib EXECUCAO_PENAL, escolhe `baixar_autos_seeu`).
- **Live (após mapear):** rodar `baixar_autos_seeu` num processo EP real → confere PDFs em `/tmp` → distribuídos no Drive → 2c EP roda a análise → `analysisData`.

## 7. Fora de escopo

- Mídia/transcrição (Fase A).
- O rascunho da peça EP (`manifestacao_ep`) — depende de 2b + da Fase B estendida a EP.
- OCR dos autos (a análise ai lê PDF; OCR é outra frente).

## 8. Sequência de build recomendada

1. **Sessão de mapeamento ao vivo** (SEEU logado): mapear a coluna "Ações" + o download (§4). Anotar seletores/URL na memória.
2. **Task 1 (build-ready hoje):** helpers puros de `seeu_autos.py` + testes.
3. **Task 2 (pós-mapa):** `baixar_autos_seeu` (navegação reusa 2a + a primitiva mapeada) + estrutural.
4. **Task 3:** wiring EP no worker da 2c + elegibilidade EP + testes.
5. **Aceite ao vivo:** 1 demanda EP "cabe peça" → autos SEEU no Drive → análise EP → `analysisData`.
