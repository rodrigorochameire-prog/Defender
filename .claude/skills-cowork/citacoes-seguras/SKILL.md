---
name: citacoes-seguras
description: >
  Proteção contra alucinação de citações jurídicas na DPE-BA.
  Use SEMPRE que for incluir súmulas, jurisprudência, acórdãos, artigos de lei ou
  qualquer citação normativa em peças da Defensoria.
  Contém banco de súmulas verificadas e protocolos obrigatórios para busca de
  jurisprudência e texto legal antes de citar qualquer coisa.
  Acionar ANTES de redigir qualquer trecho que mencione súmula, acórdão,
  artigo de lei ou entendimento jurisprudencial — mesmo que pareça simples.
  Consultar também quando qualquer outra skill (execucao-penal, criminal-comum,
  juri, vvd, dpe-ba-pecas) for gerar peças que contenham citações.
---

# Citações Jurídicas Seguras — Regras e Banco Verificado

## Por que esta skill existe

Uma citação errada em peça protocolada é mais grave do que uma peça enxuta sem citação.
O erro mais comum é inventar um número de súmula plausível que, na realidade, trata de
outro assunto — ou parafrasear um artigo de lei de memória com redação levemente errada.
Esta skill impõe um protocolo que elimina esse risco.

---

## Regra de Ouro

> **Se não encontrou na fonte, não cita.**
> Use o marcador de verificação e deixe o Defensor pesquisar.

---

## Protocolo obrigatório — três tipos de citação

### 1. Artigos de lei (CP, CPP, LEP, Lei de Drogas, LMP, LCP etc.)

**Fluxo:**
1. Consulte primeiro o arquivo de referência correspondente em `references/leis/`.
2. Se o artigo estiver lá → cite com a redação exata do arquivo.
3. Se não estiver → **busque no Planalto** antes de citar:
   - URL padrão: `https://www.planalto.gov.br/ccivil_03/...`
   - Use WebFetch para recuperar o texto atualizado.
   - Se a busca falhar → use o marcador `[ART. XX — VERIFICAR REDAÇÃO ATUAL NO PLANALTO]`.

> ⚠️ Nunca escreva o texto de um artigo de memória. Leis são emendadas
> frequentemente (ex: art. 112 LEP foi radicalmente alterado pelo Pacote
> Anticrime em 2019). Redação desatualizada em peça é erro grave.

---

### 2. Súmulas (STJ, STF, Vinculantes)

**Fluxo:**
1. Consulte o banco verificado em `references/sumulas-verificadas.md`.
2. Se a súmula estiver lá → cite com o enunciado exato.
3. Se não estiver → **não cite de memória**.
   Use: `[VERIFICAR SÚMULA APLICÁVEL — PESQUISAR STJ/STF]`
4. Se quiser confirmar uma súmula antes de adicionar ao banco:
   - STJ: `https://www.stj.jus.br/docs_internet/VerbetesTesaurus.pdf` ou busca no site
   - STF: `https://portal.stf.jus.br/jurisprudencia/sumariosumulas.asp`

> ⚠️ Nunca deduza o conteúdo de uma súmula pelo número. Súmula 9/STJ,
> por exemplo, trata de prisão provisória para apelar — não de certidão de
> óbito. O número não indica o tema.

---

### 3. Jurisprudência (acórdãos, decisões, teses, repetitivos)

**Fluxo:**
1. **Nunca cite acórdão, REsp, HC, ARE ou qualquer decisão de memória.**
2. Antes de incluir qualquer referência jurisprudencial, busque na fonte oficial:
   - **STJ:** `https://jurisprudencia.stj.jus.br`
   - **STF:** `https://jurisprudencia.stf.jus.br`
   - **JusBrasil:** `https://www.jusbrasil.com.br/jurisprudencia` (aceito como fonte verificável)
   - **TJBA:** `https://jurisprudencia.tjba.jus.br`
3. Use WebSearch ou WebFetch para recuperar a ementa/trecho exato.
4. Cite sempre com: tribunal, número do processo, data e relator.
5. Se a busca não retornar resultado confiável → use o marcador:
   `[VERIFICAR PRECEDENTE — INSERIR REFERÊNCIA APÓS PESQUISA NO STJ/STF]`

> ⚠️ Números de processos inventados são facilmente checados pelo MP e pelo Juiz.
> Uma referência falsa desacredita toda a peça.

---

## Marcadores padronizados

| Situação | Marcador a usar |
|---|---|
| Artigo de lei não verificado | `[ART. XX — VERIFICAR REDAÇÃO ATUAL NO PLANALTO]` |
| Súmula aplicável incerta | `[VERIFICAR SÚMULA APLICÁVEL — PESQUISAR STJ/STF]` |
| Acórdão ou precedente específico | `[VERIFICAR PRECEDENTE — INSERIR REFERÊNCIA APÓS PESQUISA]` |
| Tese repetitiva / repercussão geral | `[VERIFICAR TEMA STJ/STF APLICÁVEL]` |

---

## Arquivos de referência disponíveis

- `references/sumulas-verificadas.md` — Banco de súmulas verificadas (STJ, STF, Vinculantes)
- `references/hc-execucao-penal.md` — **Jurisprudência verificada para HC em execução penal**: indulto (Decreto 12.338/2024), detração (Tema 1.277/STJ), regressão cautelar (Tema 1.347/STJ), cabimento; alertas de citações não verificadas e estrutura padrão DPE-BA. Leia este arquivo ao gerar HC em execução penal.
- `references/leis/codigo-penal.md` — Artigos do CP verificados e atualizados
- `references/leis/cpp.md` — Artigos do CPP verificados
- `references/leis/lep.md` — Artigos da LEP verificados (incluindo alterações pós-Pacote Anticrime)
- `references/leis/lei-drogas.md` — Lei 11.343/2006 — artigos principais
- `references/leis/lmp.md` — Lei 11.340/2006 (Maria da Penha) — artigos principais
- `references/leis/crimes-hediondos.md` — Lei 8.072/1990 — artigos principais

> Para cada peça gerada: leia o arquivo da lei mais relevante antes de citar
> qualquer artigo. Não confie na memória — confie no arquivo.
