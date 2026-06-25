---
name: criminal-comum
description: "Gerador de peças jurídicas para a atribuição CRIMINAL COMUM da Defensoria Pública do Estado da Bahia (DPE-BA), 7ª Regional – Camaçari. Use esta skill SEMPRE que o usuário pedir qualquer peça de direito penal comum (não VVD, não júri, não execução penal): habeas corpus, requerimento de relaxamento/revogação de prisão preventiva, recurso em sentido estrito (RESE), apelação criminal, alegações finais criminais, resposta à acusação criminal, absolvição sumária, pedido de incidente de insanidade, diligências do art. 422 CPP, petição intermediária ou síntese processual. Também acione quando o usuário mencionar: 'HC', 'habeas', 'relaxamento', 'revogação de prisão', 'RESE', 'apelação criminal', 'alegações finais', 'resposta à acusação', 'RA criminal', 'insanidade', '422 CPP', 'petição intermediária', 'síntese processual', ou qualquer peça de defesa criminal geral. Gera documentos .docx com cabeçalho e rodapé institucionais da DPE-BA."
---

# Peças Jurídicas — Criminal Comum (DPE-BA, 7ª Regional – Camaçari)

Esta skill gera documentos .docx formatados com o padrão institucional da Defensoria Pública para a atribuição de **Criminal Comum**. Cada tipo de peça possui um prompt especializado na pasta `references/`.

## Padrões Obrigatórios de Redação

### Nulidade ≠ Ilegalidade da Prova — distinção obrigatória

São categorias distintas com consequências distintas:

- **Nulidade processual** (arts. 563 e ss. CPP): vício de ato processual (citação, intimação, sentença) → ato deve ser declarado nulo → fenômeno intraprocessual
- **Ilegalidade da prova** (art. 157 CPP + art. 5º, LVI, CF): prova obtida em violação a norma constitucional ou legal → inadmissível, não pode ser valorada → fenômeno extraprocessual

O STJ adotou o termo **"invalidade"** + **"impossibilidade de valoração"** (HC 598.886/SC) — não nulidade.

✅ Usar: "A Defesa suscita a ilegalidade da [prova] e sua inadmissibilidade probatória, com impossibilidade de valoração para qualquer fim decisório (arts. [norma violada] e 157 do CPP)"
❌ Nunca: "A Defesa requer a declaração de nulidade da [prova]"

**Casos frequentes:**
- Reconhecimento sem art. 226 CPP → ilegalidade + inadmissibilidade (não nulidade)
- Busca pessoal sem fundada suspeita (art. 244 CPP) → prova ilegal
- Violação de domicílio (art. 5º, XI, CF) → prova ilícita
- Interceptação sem autorização judicial → prova ilícita

### Reconhecimento irregular — ataca o PROCEDIMENTO, não "a identificação de [nome]"

O art. 226 CPP é o **parâmetro mínimo legal** para reconhecimento com confiabilidade epistêmica. Seus requisitos — (i) prévia descrição; (ii) fileira de pessoas ou fotografias; (iii) lavratura de auto — existem para mitigar o **viés de confirmação**: fenômeno cognitivo pelo qual a mente, diante de opção única ou sugerida, tende a confirmar o apresentado, ainda que a memória seja fragmentada ou contaminada.

**Descumprimento → contaminação → higidez inviabilizada → inadmissibilidade (art. 157 CPP)**

✅ Sujeito correto: "A Defesa suscita a ilegalidade do **procedimento** adotado para fins de identificação..."
❌ Nunca: "A Defesa suscita a ilegalidade da identificação de [NOME]" — o sujeito é o procedimento, não a pessoa

### Paragrafação funcional — cada parágrafo, uma unidade de raciocínio

Evitar megaparágrafos. A regra não é de tamanho, mas de coerência temática: cada parágrafo deve abrir e fechar uma unidade de raciocínio, tema ou abordagem. Quando o texto muda de eixo, abrir novo parágrafo — mesmo que a mudança seja sutil.

**O leitor deve conseguir identificar, ao começar um novo parágrafo, que se inicia um novo tema, raciocínio ou abordagem.**

Cortes naturais mais frequentes em peças jurídicas:
- **Conceitual** (o que é o instituto / por que existe) → **Jurisprudencial** (o que os tribunais fixaram)
- **Normativo** (o que a lei exige) → **Factual** (o que ocorreu no caso concreto)
- **Descritivo** (o que aconteceu) → **Analítico** (o que isso significa juridicamente)
- **Tese** → **Fundamentos** → **Pedido**

Megaparágrafos são admissíveis apenas quando os raciocínios são verdadeiramente inseparáveis e a divisão prejudicaria a coesão do argumento.

---

## Identidade Visual da Atribuição Criminal Comum

> Referências completas: [`_shared/padrao-relatorio.md`](../_shared/padrao-relatorio.md) e [`_shared/formatacao-dpe-ba.md`](../_shared/formatacao-dpe-ba.md).

### Paleta Criminal Comum

| Elemento | Cor | Hex | Uso |
|---|---|---|---|
| **Cor-tema** | Vermelho escuro | `991B1B` | Banner principal, borda esquerda de headings, texto de títulos |
| **Fundo suave** | Rosa claro | `FFF0F0` | Fundo de tabelas de identificação, headings, rodapé |
| **Cor clara** | Rosa | `FCA5A5` | Subtítulo no banner, borda top de subheadings |
| **OMBUDS UI** | Red-600 | `DC2626` | Badge de atribuição no app web (de `atribuicoes.ts`) |

### Aplicação obrigatória em .docx

1. **Banner**: fundo `991B1B`, título branco, subtítulo `FCA5A5`
2. **Tabela de identificação**: fundo `FFF0F0`, rótulos cinza, valores bold `991B1B`
3. **Headings de seção**: fundo `FFF0F0`, borda esquerda 32pt `991B1B`, texto `991B1B`
4. **Subheadings**: texto bold `991B1B`, borda top `FCA5A5`
5. **Termos em destaque** (bold inline): cor `991B1B`
6. **Rodapé do relatório**: fundo `FFF0F0`, borda top `991B1B`

---

## Fluxo de Trabalho

1. **Identificar o tipo de peça** — Veja a tabela abaixo e pergunte ao usuário se não ficou claro
2. **Consultar identidade visual** — Ler `_shared/padrao-relatorio.md` para cores e estrutura do .docx
3. **Carregar o prompt específico** — Leia o arquivo correspondente em `references/`
4. **Localizar o processo do assistido** (se disponível) — Busque a pasta do assistido nos diretórios de processos (ver "Pastas de Processos") e leia PDFs, transcrições e documentos para extrair fatos, nomes, datas e argumentos do caso
5. **Consultar modelos reais similares** — Busque peças do mesmo tipo em "Petições por assunto" (ver "Banco de Modelos") para absorver o padrão argumentativo e estilo do Defensor
6. **Coletar informações complementares** — Se os autos/documentos não forem suficientes, peça dados adicionais ao usuário
7. **Gerar a minuta** — Siga o prompt carregado, baseando-se nos fatos do processo e no estilo dos modelos reais
8. **Gerar o .docx** — Use python-docx (`_shared/formatacao-dpe-ba.md` + `_shared/padrao-relatorio.md` para cores Criminal Comum)
9. **Gerar _analise_ia.json** — Salvar JSON estruturado (schema v2.0 — ver `_shared/schema-base.md`)
10. **Salvar na pasta do usuário**

---

## Banco de Modelos Reais (Petições por Assunto)

Peças anteriores já produzidas pelo Defensor, organizadas por tipo. Use-as como referência de estilo, tom e estrutura argumentativa ao gerar qualquer peça nova.

**Caminho base**: `~/Library/CloudStorage/GoogleDrive-rodrigorochameire@gmail.com/Meu Drive/1 - Defensoria 9ª DP/4 - Peças/Petições por assunto (DOC)/`

| Tipo de Peça | Subpasta de Modelos |
|---|---|
| Alegações Finais | `1 Alegações Finais/` |
| Apelação Criminal | `2 Apelação/` |
| Contrarrazões de Apelação | `3 Contrarrazões de Apelação/` |
| Contrarrazões de RESE | `4 Contrarrazões de RESE/` |
| Diligências 422 CPP | `5 Diligências 422/` |
| Habeas Corpus | `6 HC/` |
| Prisão e Cautelares | `7 Prisão e cautelares/` |
| RESE | `8 RESE/` |
| Resposta à Acusação | `9 Resposta à acusação/` |
| Embargos de Declaração | `Embargos Declaração/` |
| Impugnações | `Impugnações/` |
| Incidente de Insanidade | `Incidente insanidade e internação/` |
| Nulidades Processuais | `Nulidades processuais/` |
| Defesa Flagrante | `Defesa Flagrante Contraditório diferido/` |

**Como usar**: Liste os .docx da subpasta correspondente ao tipo de peça. Identifique 1-3 modelos com tese ou situação similar ao caso atual. Leia-os para absorver estilo argumentativo, estrutura e linguagem. Adapte ao caso concreto.

---

## Pastas de Processos dos Assistidos

Processos individuais com PDFs dos autos, transcrições de depoimentos, análises e documentos do caso.

| Atribuição | Caminho da Pasta |
|---|---|
| Criminal Comum (geral) | `~/Library/CloudStorage/GoogleDrive-rodrigorochameire@gmail.com/Meu Drive/1 - Defensoria 9ª DP/3 - Casos/Processos/` |
| Substituição Criminal | `~/Library/CloudStorage/GoogleDrive-rodrigorochameire@gmail.com/Meu Drive/1 - Defensoria 9ª DP/3 - Casos/Processos - Substituição criminal/` |

Cada subpasta é nomeada com o nome do assistido e pode conter: PDFs dos autos completos ou partes, transcrições de depoimentos (.md, .mp4), relatórios de análise (.pdf, .md), documentos diversos.

**Como usar**: Quando o usuário pedir uma minuta para um assistido específico (ex: "faça o HC do João Silva"), busque o nome na pasta de processos. Se encontrar, leia os PDFs e transcrições para extrair fatos da denúncia, depoimentos, laudos periciais, decisões e informações para fundamentar a peça.

---

## Tipos de Peça Disponíveis

| Tipo de Peça | Arquivo de Referência | Quando Usar |
|---|---|---|
| Habeas Corpus | `references/habeas_corpus.md` | Coação ilegal, prisão sem fundamentação |
| HC por excesso prazal | `references/habeas_corpus_excesso_prazal.md` | Especificamente para excesso de prazo na prisão |
| Revogação/Relaxamento de prisão | `references/requerimento_relaxamento_revogacao.md` | Prisão preventiva sem pressupostos do art. 312 CPP |
| Recurso em Sentido Estrito | `references/recurso_em_sentido_estrito.md` | Contra decisão interlocutória |
| Apelação Criminal | `references/apelacao_criminal.md` | Contra sentença condenatória criminal comum |
| Alegações Finais (criminal) | `references/alegacoes_finais_criminal.md` | Memoriais após instrução criminal |
| Alegações Finais (aprimorado) | `references/alegacoes_finais_aprimorado.md` | Versão mais detalhada de alegações finais |
| Resposta à Acusação (Criminal) | `references/resposta_acusacao_criminal.md` | RA versão completa com análise estratégica |
| Resposta à Acusação (básica) | `references/resposta_acusacao_basica.md` | RA versão simplificada |
| Insanidade / Incidente / Quesitos | `references/insanidade_incidente_quesitos.md` | Pedido de incidente de insanidade mental |
| Petição intermediária | `references/peticao_intermediaria.md` | Petições diversas durante o processo |
| Síntese processual | `references/sintese_processual.md` | Resumo/síntese do processo |

> **Nota**: Peças específicas do Tribunal do Júri (apelação pós-júri, alegações finais do júri, diligências do 422 CPP, absolvição sumária) estão na skill **juri**.

## Como Usar os Prompts de Referência

Cada arquivo em `references/` contém o prompt completo extraído do Gemini Gem correspondente. Ao gerar uma peça:

1. **Leia o arquivo de referência** correspondente ao tipo de peça solicitado
2. **Siga as instruções do prompt** como se fossem suas instruções de trabalho
3. **Adapte com os dados reais** fornecidos pelo usuário
4. **Aplique a formatação DPE-BA** descrita abaixo ao gerar o .docx

## Formatação e Geração de Documentos

A formatação institucional DPE-BA (margens, fonte, cabeçalho, rodapé, assinatura) está definida na skill **dpe-ba-pecas**. Consulte-a para gerar o .docx com `scripts/gerar_docx.py`.

## Importante

- Sempre usar **python-docx** (não a biblioteca npm)
- Data gerada automaticamente em português (ex: "10 de março de 2026")
- Nome do arquivo: `[Tipo da Peça] - [Nome do Assistido].docx`
- Salvar na pasta do usuário


---

## Output Estruturado — _analise_ia.json

**SEMPRE ao final de cada análise**, além de salvar o `.md` / `.docx`, salvar o arquivo `_analise_ia.json` na **mesma pasta raiz do assistido no Drive** com o seguinte schema:

```json
{
  "schema_version": "1.0",
  "tipo": "<audiencia_criminal|audiencia_sumariante|juri|vvd|execucao_penal|ra>",
  "gerado_em": "<ISO 8601>",
  "assistido": "<nome completo>",
  "processo": "<número dos autos>",
  "resumo_fato": "<síntese do fato em 2-3 frases>",
  "tese_defesa": "<tese principal identificada>",
  "estrategia_atual": "<estratégia recomendada>",
  "crime_principal": "<tipo penal principal>",
  "pontos_criticos": ["<ponto 1>", "<ponto 2>"],
  "payload": {
    "perguntas_por_testemunha": [
      { "nome": "<nome>", "tipo": "ACUSACAO|DEFESA", "perguntas": ["<p1>", "<p2>"] }
    ],
    "contradicoes": [
      { "testemunha": "<nome>", "delegacia": "<versão>", "juizo": "<versão>", "contradicao": "<descrição>" }
    ],
    "orientacao_ao_assistido": "<orientação para o interrogatório>"
  }
}
```

**Instrução de salvamento:**
1. Gere o JSON com os campos preenchidos da análise atual
2. Salve como `_analise_ia.json` na pasta raiz do assistido (substituindo se já existir)
3. Informe ao final: "✅ `_analise_ia.json` salvo — pronto para importar no OMBUDS via botão 'Importar do Cowork'"

**Campos do payload variam por tipo:**
- `audiencia_criminal` / `audiencia_sumariante`: `perguntas_por_testemunha`, `contradicoes`, `orientacao_ao_assistido`
- `juri`: adicionar `perspectiva_plenaria`, `quesitos_criticos`
- `vvd`: adicionar `medidas_protetivas_vigentes`, `historico_violencia`
- `execucao_penal`: adicionar `beneficios_pendentes`, `datas_criticas`