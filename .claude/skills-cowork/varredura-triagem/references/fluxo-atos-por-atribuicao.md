# Fluxo intimação → ato por atribuição

Mapa de referência para o `classify()` (worker `varredura_triagem.py`) e para a skill IA.
Para cada atribuição: **gatilho típico da intimação** → **ato/peça correspondente** →
**observação de prazo/urgência**.

> Base: fluxo real observado no acervo "Petições por assunto" do defensor (seção "Fonte"
> do spec `2026-06-28-classify-ep-juri-design.md`) + conhecimento jurídico.
> Princípio **No Invention**: só atos confirmados no acervo entram aqui.
>
> Regras de uso:
> - **Normalizar acentos** antes do matching (NFD → ascii, lower).
> - **Primeira regra que casa vence** — listar do mais específico ao mais genérico.
> - O `ato` final DEVE existir em `src/config/atos-por-atribuicao.ts` (sem órfãos).
> - Prazo expresso no documento ("5 dias") vence a presunção da regra.
> - Prazo relativo → data absoluta via expedição + 10 dias corridos (intimação eletrônica).
> - A varredura **não altera `status`** (mantém em triagem); só ajusta `ato` + cria registro.

---

## Execução Penal (EP)

Atos da EP em regra são **diligência** (peça a protocolar) com prazo curto (5 dias úteis,
art. 196 LEP / vista). Ciência pura só quando a decisão é favorável e não pede providência.

| Gatilho típico da intimação | Ato / peça | Prazo / urgência |
|---|---|---|
| Cálculo de pena / atestado de pena com requisito objetivo atingido; vista para progressão | Requerimento de progressão | 5 dias — NORMAL/ALTA |
| Vista para livramento condicional (requisito temporal cumprido) | Livramento condicional | 5 dias — NORMAL |
| Manifestação sobre remição (trabalho/estudo/leitura) ou abate de dias | Remição de pena | 5 dias — NORMAL |
| Decreto de indulto/comutação publicado; vista para enquadramento do apenado | Indulto | 5 dias — NORMAL (atenção à janela do decreto) |
| Pedido/vista de saída temporária (datas comemorativas, visita à família) | Saída temporária | 5 dias — NORMAL (sazonal: antecipar) |
| Pedido/vista de permissão de saída (falecimento, tratamento, ato relevante) | Permissão de saída | URGENTE — fato pontual e datado |
| Vista p/ manifestar contra **reconversão** de pena restritiva em privativa | Manifestação contra reconversão | 5 dias — URGENTE (risca liberdade) |
| Vista p/ manifestar contra **regressão** de regime / falta grave / PAD | Manifestação contra regressão | 5 dias — URGENTE (risca liberdade) |
| Vista p/ impugnar **rescisão/descumprimento de ANPP** | Impugnação à rescisão de ANPP | 5 dias — URGENTE |
| Cumprimento de pena integral / prescrição / extinção da punibilidade | Extinção da punibilidade | 5 dias — favorável; requerer/dar ciência |
| Vista sobre alteração de condições do **SURSIS** (suspensão condicional) | Alteração de condição do SURSIS | 5 dias — NORMAL |
| Pedido/vista de **prisão domiciliar** (saúde, maternidade, ausência de vaga no regime) | Prisão domiciliar | URGENTE (liberdade/saúde) |
| Excesso de prazo na execução / atraso em benefício devido | Relaxamento por excesso de prazo | URGENTE |
| Designação de audiência de **justificação** (apuração de falta grave) | Designação de justificação | NORMAL — agendar audiência |
| Designação de audiência **admonitória** (advertência de condições) | Designação admonitória | NORMAL — agendar audiência |
| Transferência de unidade prisional / remessa dos autos a outra comarca | Transferência de unidade | NORMAL |
| Cumprimento de cláusulas de ANPP (parcelas, serviços, comprovação) | Cumprimento ANPP | conforme cronograma do acordo |
| Decisão desfavorável que comporta recurso de execução | Agravo em Execução | 5 dias — URGENTE (prazo recursal, art. 197 LEP) |
| Decisão sem providência clara / "analisar" | Analisar decisão | NORMAL — triagem manual |

---

## Júri (Tribunal do Júri)

O fluxo do júri gira em torno da decisão de 1ª fase (pronúncia / impronúncia /
desclassificação / absolvição sumária) e da preparação do plenário.

| Gatilho típico da intimação | Ato / peça | Prazo / urgência |
|---|---|---|
| **Pronúncia** preclusa / transitada → abertura da fase do art. 422 CPP; intimação p/ requerer diligências e arrolar testemunhas de plenário | Diligências do 422 | 5 dias — ALTA (define a prova do plenário) |
| Intimação p/ apresentar **rol de testemunhas de plenário** / preparar plenário | Diligências do 422 | 5 dias — ALTA |
| Decisão de **pronúncia** (sem fase 422 ainda aberta) | Ciência da pronúncia | ALTA — ciência; avaliar RESE (5 dias) se cabível |
| Decisão de **impronúncia** (favorável ao réu) | Ciência da impronúncia | ALTA — favorável; **não** recorrer da própria impronúncia. Só contrarrazões se o MP agravar/recorrer |
| Decisão de **desclassificação** (sai da competência do júri) | Ciência desclassificação | ALTA |
| Absolvição sumária (art. 415 CPP) | Ciência absolvição | favorável — ciência |
| **Sessão de plenário designada** | Ciência sessão de julgamento | ALTA — agendar audiência (JURI); disparar preparação |
| Intimação p/ dispensa de interrogatório / manifestação pré-plenário | (conforme conteúdo) | conforme prazo do despacho |
| MP recorre da impronúncia/sentença → vista p/ contrarrazões | Contrarrazões | prazo recursal — ALTA |

> Regra de ouro do júri no classify: impronúncia → **Ciência da impronúncia** (favorável).
> Nunca forçar RESE para o réu na impronúncia.

---

## VVD (Violência Doméstica — Criminal)

Fluxo criminal comum sob a Lei Maria da Penha: instrução, sentença e incidentes de MPU.

| Gatilho típico da intimação | Ato / peça | Prazo / urgência |
|---|---|---|
| Defensoria nomeada / vista p/ apresentar resposta | Resposta à Acusação | 10 dias — URGENTE |
| AIJ (instrução e julgamento) **designada** | Ciência designação de audiência | NORMAL — agendar (INSTRUCAO) |
| AIJ **redesignada** | Ciência redesignação de audiência | NORMAL — reagendar (INSTRUCAO) |
| Audiência de **justificação** de MPU designada | Ciência designação de audiência | NORMAL — agendar (JUSTIFICACAO) |
| Prazo p/ alegações finais / memoriais (encerrada a instrução) | Alegações finais / Memoriais | 5 dias — URGENTE |
| Vista p/ manifestar sobre laudo (lesões, psicossocial) | Manifestação sobre laudo | 5 dias — NORMAL |
| Vista sobre revogação/modulação de **MPU** (medida protetiva) | Manifestação sobre MPU | 5 dias — NORMAL |
| Habilitação / vista do IP para acompanhamento | (Habilitação / vista IP) | conforme despacho |
| **Sentença absolutória** | Ciência absolvição | favorável — ciência |
| **Sentença condenatória** | Ciência condenação | ALTA — avaliar apelação (5 dias) |
| Sentença sem leitura clara | Analisar sentença | 5 dias — URGENTE |
| Acórdão improvido/desprovido | Ciência acórdão | NORMAL |
| Acórdão genérico | Analisar acórdão | 15 dias — avaliar recurso |
| Despacho ordinatório / providência simples | Cumprir despacho | URGENTE conforme conteúdo |

---

## Fallback (qualquer atribuição)

| Gatilho | Ato | Observação |
|---|---|---|
| PDF binário / frame sem texto extraível | Analisar decisão | revisão manual pendente |
| Conteúdo curto / sem match | Ciência | mantém default; revisão pendente |
| Arquivamento definitivo | Ciência | BAIXA — favorável |
| Sigiloso sem visibilidade / peticionar fora dos autos | Outro | sem atuação na demanda |

---

## Notas de cruzamento com o config

- Atos canônicos vivem em `src/config/atos-por-atribuicao.ts`; o `ATO_PRIORITY`
  ordena urgência. Todo ato citado aqui deve existir lá (Unidade 2 do spec).
- A tabela de regex executável fica em `heuristicas-classificacao.md` (e no código
  do worker em `RULES_EP` / `RULES_JURI` / `RULES_BASE`). Este arquivo é o **mapa
  conceitual**; aquele é a **implementação**.
- Regras EP só disparam quando `"EXECUCAO_PENAL" in atribuicao`; regras de júri
  quando a atribuição é Júri; caso contrário, cai em RULES_BASE (VVD/genérico).
