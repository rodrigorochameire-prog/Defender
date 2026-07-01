# Fase 2a — Inteligência da Triagem (resumo de contexto + sinal para o pipeline profundo)

**Data:** 2026-07-01
**Autor:** Rodrigo Rocha Meire (via Claude Code)
**Status:** Design aprovado — pendente spec review
**Contexto maior:** Fase 2 do SEEU/Execução Penal, decomposta em 2a (esta), 2b (baixar autos do SEEU) e 2c (pipeline profundo). Continuação de [[project_seeu_import_pipeline]] (Fase 1, PR #308).

---

## 1. Contexto e motivação

A Fase 1 traz as intimações da Execução Penal (SEEU) para a **triagem** (`5_TRIAGEM`),
ao lado das de Júri/VVD (PJe). Mas uma intimação em triagem, sozinha, é só um cabeçalho
("Manifestação, ANPP, prazo 5 dias"). O defensor precisa de um **resumo de contexto + o
que fazer** para decidir rápido — e, quando o caso exige uma peça relevante (memoriais,
resposta à acusação, apelação, manifestação na EP), de um **gancho** para acionar o
pipeline profundo (baixar autos, análise completa, rascunho).

### O que já existe (não reconstruir)

| Peça | Local | Estado |
|---|---|---|
| `varredura-triagem` | `.claude/skills/varredura-triagem/scripts/varredura_triagem.py` | Lê o expediente **no PJe** (Júri/VVD), classifica (RULES_BASE/MPU/EP → `ato`/`prioridade`/`prazo`), cria `registros`, agenda audiências, e **enfileira** `analise-intimacao` (lane=ai). |
| `analise-intimacao` | `.claude/skills-cowork/analise-intimacao/` | Skill lane=ai (daemon Max) que, por demanda, gera `resumo_objeto`, `o_que_decidido`, `o_que_fazer`, `cabe_recurso`/`recurso_cabivel`/`fundamento`, `ato_sugerido`, `relato_vitima` (MPU), `termos_pronuncia` (Júri) → registro `tipo="analise"` (card próprio). |
| Modelo de dados | `registros` (`agenda.ts`) | `conteudo` (resumo humano), `enrichmentData` jsonb (`suggested_actions[]`, `teses_possiveis[]`, `key_points[]`…), `dossieAtendimento` jsonb, `pontosChave` jsonb. **Não há coluna `resumo` na `demandas`** — o resumo vive no registro. |
| Daemon | `scripts/browser-broker-daemon.mjs` | `SKILL_REGISTRY['varredura-triagem']` (interactive, CLI `--atribuicao/--since/--limit/--modo/--defensor-id/--demanda-ids`). |

### A lacuna

O `varredura_triagem.py` lê o expediente **abrindo o processo no PJe**. Intimações de EP
vivem no **SEEU** — não há como abrir o processo de EP no PJe. Hoje a triagem de EP não
tem o **texto real** do documento que disparou a intimação (só o bloco curto da Mesa,
capturado na Fase 1). Logo, para EP, `analise-intimacao` não teria material para um resumo
útil de "o que foi decidido / o que fazer".

### Achados da inspeção ao vivo do SEEU (2026-07-01)

- `visualizacaoProcesso.do?_tj=<token>` abre o processo (título = CNJ), num **frame único**.
- O **movimento-alvo da intimação** é identificável: link/linha *"Juntar {ATO} referente ao
  movimento - **{TIPO}** ( {data} às {hora} )"* — ex.: *"…referente ao movimento -
  PROFERIDO DESPACHO DE MERO EXPEDIENTE ( 29 de maio de 2026 às 16:01 )"*. O **tipo do
  movimento** já é um sinal forte (despacho de mero expediente ⇒ provável mera ciência).
- O painel de pena aparece **inline** na página do processo: *Início · Término ·
  Livramento Condicional* (datas de regime) — contexto valioso para o resumo de EP.
- A timeline **Movimentações** (com coluna `Seq.`) lista os movimentos/documentos; o teor
  de um documento é lido expandindo/abrindo o movimento (mecanismo exato a fechar no plano
  — ver §7 Risco).

---

## 2. Escopo

### Nesta Fase 2a (in scope)
- **Leitor de expediente do SEEU** (módulo novo dentro de `varredura-triagem`), para
  demandas de atribuição `EXECUCAO_PENAL` em triagem: abre `visualizacaoProcesso`, acha o
  movimento-alvo, lê o teor do documento, captura o painel de pena, e grava `raw_text` no
  registro base — do mesmo jeito que o caminho PJe já faz.
- **Roteamento por atribuição** em `varredura_triagem.py`: EP → leitor SEEU; Júri/VVD/Criminal → leitor PJe (atual).
- **Extensão do `analise-intimacao`**: novos campos `peca_sugerida` e
  `requer_analise_profunda` (o **sinal para o 2c**); consciência de EP (progressão, LC,
  remição, indulto, falta grave, detração, prescrição) para melhorar o resumo.
- **Exibição**: o card `tipo="analise"` mostra o resumo + a peça sugerida. (O botão que
  dispara o 2c é da spec do 2c; o 2a apenas **grava o sinal**.)

### Fora desta Fase (specs próprios)
- **2b** — baixar autos completos do SEEU (todos os documentos).
- **2c** — pipeline profundo: baixar autos (PJe/SEEU) + mídias/áudios + organizar Drive +
  rodar `/analise-*` + rascunhar a peça. Consome o sinal do 2a. Disparo **manual** (o
  defensor revisa o resumo do 2a e aciona).

### Não-objetivos (YAGNI)
- Não baixa autos inteiros nem mídia (só lê **um** documento — o do expediente).
- Não dispara nada automaticamente (human-in-loop; o 2a só marca o sinal).
- Não redesenha o card de análise (reusa o `tipo="analise"` existente).
- Não altera o caminho PJe (Júri/VVD) além do roteamento.

---

## 3. Arquitetura

```
varredura_triagem.py (worker browser-lane, estende)
  │  lista demandas 5_TRIAGEM/URGENTE (todas as atribuições)
  │  para cada demanda:
  ├─ atribuição == EXECUCAO_PENAL ──► [NOVO] leitor SEEU (módulo seeu_expediente.py)
  │                                     visualizacaoProcesso → movimento-alvo → teor + painel pena
  └─ senão ─────────────────────────► leitor PJe (atual)
  │
  ▼ (ambos convergem)
  classify (RULES_EP / RULES_MPU / RULES_BASE) → update_demanda(ato/prioridade/prazo)
  insert_registro (base): conteudo + enrichment_data.raw_text
  enqueue analise-intimacao (lane=ai)  ── daemon Max ──►
        analise-intimacao [ESTENDIDO]: resumo + peca_sugerida + requer_analise_profunda
        → registro tipo="analise" (card) + enrichmentData
```

### 3.1 Fronteiras (unidades)

| Unidade | Faz | Depende de | NÃO faz |
|---|---|---|---|
| `seeu_expediente.py` (novo módulo) | Abre `visualizacaoProcesso(CNJ)` via CDP SEEU, acha o movimento-alvo, lê teor + painel de pena, devolve `{raw_text, movimento_tipo, pena_context}` | Browser CDP com SEEU logado | Baixar autos/mídia; escrever no banco; escrever no SEEU |
| `varredura_triagem.py` (roteamento) | Decide PJe vs SEEU por atribuição; converge para o classify/registro/enqueue já existentes | leitor PJe + leitor SEEU | Duplicar classify/registro |
| `analise-intimacao` (estendido) | Gera resumo + `peca_sugerida` + `requer_analise_profunda` (EP-aware) | `raw_text` do registro | Baixar autos; disparar 2c |
| Card de análise (UI, já existe) | Mostra resumo + peça sugerida | registro `tipo="analise"` | Regra de negócio |

### 3.2 Browser / sessão
Um único browser CDP com **PJe e SEEU logados** simultaneamente (como o worker de import
da Fase 1 já assume). O leitor SEEU acha a aba/janela do SEEU (`"seeu" in url`) ou navega
para `visualizacaoProcesso`. Login manual (Keycloak) — nunca automatizado.

---

## 4. Leitor SEEU (`seeu_expediente.py`)

Entrada: o CNJ do processo da demanda (já em `processos.numero_autos` / capturado na Fase 1)
e, se disponível, o `seq`/assunto da intimação. Passos:

1. Navegar `visualizacaoProcesso.do` para o CNJ (obter o link `_tj` a partir da Mesa, ou
   montar a busca por CNJ). **Read-only.**
2. Extrair o **movimento-alvo**: regex sobre *"referente ao movimento - {TIPO} ( {data} )"*
   → `movimento_tipo` (ex.: "PROFERIDO DESPACHO DE MERO EXPEDIENTE") + data.
3. Localizar esse movimento na timeline **Movimentações** e ler o **teor** do documento
   (texto). Espelha a heurística do leitor PJe (prioridade de título
   `acórdão > sentença > decisão > despacho > …`) quando o alvo não é único.
4. Capturar o **painel de pena** inline (Início / Término / Livramento Condicional; e o que
   estiver disponível: regime, data-base, faltas) como `pena_context`.
5. Devolver `{ raw_text, movimento_tipo, pena_context, doc_titulo }` — o `raw_text` entra em
   `registros.enrichment_data.raw_text` (mesma coluna do caminho PJe), e `movimento_tipo`/
   `pena_context` viram insumo da classificação e do resumo.

**Fallback (se o teor não abrir):** usar `movimento_tipo` + assunto (da Mesa) + `pena_context`
como `raw_text` — já é mais rico que o metadado da Fase 1, e permite um resumo útil.

**Invioláveis:** só leitura de DOM (navegar + ler). Nunca "Juntar", assinar, peticionar.

---

## 5. `analise-intimacao` estendido

Adicionar ao schema do resultado (por item), sem quebrar os consumidores atuais:

| Campo | Tipo | Semântica |
|---|---|---|
| `peca_sugerida` | `memoriais \| resposta_acusacao \| apelacao \| rese \| manifestacao_ep \| contrarrazoes \| null` | A peça relevante que o caso pede; `null` = mera ciência / sem peça. |
| `requer_analise_profunda` | `bool` | `true` quando vale acionar o 2c. Regra determinística: **`requer_analise_profunda == (peca_sugerida != null)`** — mera ciência ⇒ `false`; qualquer peça sugerida ⇒ `true`. (Sem heurística de urgência no 2a; refino de gatilho fica no 2c.) |

**EP-aware:** para `atribuicao_label` de EP, o resumo e o `o_que_fazer` devem falar a
língua da execução — progressão de regime, livramento condicional, remição, indulto/
comutação, falta grave (Súmulas 534/535 STJ), detração, prescrição da PPL — usando o
`pena_context` capturado pelo leitor. O vocabulário canônico de atos de EP guia
`ato_sugerido` (mesma regra "No Invention" já existente).

Gravação: `write_analise.py` estende para persistir `peca_sugerida`/`requer_analise_profunda`
em `registros.enrichmentData` (jsonb), junto de `suggested_actions[]`. O `conteudo` do
registro ganha, no card, uma linha "Cabe peça: {peca_sugerida}" quando houver.

---

## 6. Modelo de dados (sem colunas novas)

- **Resumo humano** → `registros.conteudo` (como hoje).
- **Sinal do 2c + providências** → `registros.enrichmentData`: `{ peca_sugerida,
  requer_analise_profunda, suggested_actions[], … }`.
- **Contexto de pena EP** → `registros.enrichmentData.pena_context` (ou `pontosChave`).
- Registro base do leitor SEEU: mesmo contrato do PJe (`enrichment_data.raw_text`).

---

## 7. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Extração do teor no SEEU (mecanismo de abrir o documento) | Validado que o processo/movimento-alvo é acessível; fechar o mecanismo no plano com probe ao vivo; **fallback** por `movimento_tipo`+assunto+`pena_context` |
| Processo de EP não achável por CNJ no SEEU | Usar o CNJ capturado na Fase 1; se falhar, marcar registro "Definir/abrir manualmente" (não inventa) |
| Sessão SEEU não logada no browser | Fail-loud (mesma mensagem do worker de import: "Abra o SEEU logado") |
| Classificação EP fraca | RULES_EP já existe; ampliar com os atos de execução no plano; `analise-intimacao` EP-aware cobre o resto |
| Rodar em demandas que já foram analisadas | Idempotência já existente (`get_registro_by_titulo`/`registro_exists`); reprocessa só se `raw_text` vazio |

---

## 8. Critérios de aceite (Fase 2a)

- [ ] Para uma demanda de EP em triagem, o leitor SEEU abre o processo, identifica o
      movimento-alvo e grava `raw_text` (teor ou fallback) no registro base — **read-only**.
- [ ] `varredura_triagem.py` roteia EP→SEEU e Júri/VVD→PJe sem regressão no caminho PJe.
- [ ] `analise-intimacao` produz, para EP e não-EP, resumo + `peca_sugerida` +
      `requer_analise_profunda`, gravados no registro `tipo="analise"`.
- [ ] O card de análise mostra o resumo e a peça sugerida; nenhum disparo automático de 2c.
- [ ] Rodar ao vivo em Camaçari: as intimações de EP importadas (Fase 1) ganham resumo útil
      de contexto + o que fazer; mera ciência fica marcada como tal (sem peça).
