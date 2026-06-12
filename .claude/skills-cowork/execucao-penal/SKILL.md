---
name: execucao-penal
description: "Gerador de peças jurídicas para a atribuição de EXECUÇÃO PENAL da Defensoria Pública do Estado da Bahia (DPE-BA), 7ª Regional – Camaçari. Use esta skill SEMPRE que o usuário pedir qualquer peça de execução penal: requerimento de autorização para trabalho em comarca diversa, análise de prescrição executória, análise de falta de intimação, requerimento de progressão de regime, pedido de livramento condicional, requerimento de saída temporária, ou qualquer matéria relacionada à LEP (Lei de Execução Penal). Também acione quando o usuário mencionar: 'execução penal', 'LEP', 'pena', 'regime', 'progressão', 'ausência da comarca', 'falta de intimação', 'prescrição executória', 'livramento condicional', 'saída temporária', ou qualquer peça de defesa em execução penal. Gera documentos .docx com cabeçalho e rodapé institucionais da DPE-BA."
---

# Peças Jurídicas — Execução Penal (DPE-BA, 7ª Regional – Camaçari)

Esta skill gera documentos .docx formatados com o padrão institucional da Defensoria Pública para a atribuição de **Execução Penal**. Cada tipo de peça possui um prompt especializado na pasta `references/`.

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

## Identidade Visual da Atribuição Execução Penal

> Referências completas: [`_shared/padrao-relatorio.md`](../_shared/padrao-relatorio.md) e [`_shared/formatacao-dpe-ba.md`](../_shared/formatacao-dpe-ba.md).

### Paleta Execução Penal

| Elemento | Cor | Hex | Uso |
|---|---|---|---|
| **Cor-tema** | Azul escuro | `1E3A8A` | Banner principal, borda esquerda de headings, texto de títulos |
| **Fundo suave** | Azul gelo | `EEF4FF` | Fundo de tabelas de identificação, headings, rodapé |
| **Cor clara** | Azul claro | `93C5FD` | Subtítulo no banner, borda top de subheadings |
| **OMBUDS UI** | Blue-600 | `2563EB` | Badge de atribuição no app web (de `atribuicoes.ts`) |

### Aplicação obrigatória em .docx

1. **Banner**: fundo `1E3A8A`, título branco, subtítulo `93C5FD`
2. **Tabela de identificação**: fundo `EEF4FF`, rótulos cinza, valores bold `1E3A8A`
3. **Headings de seção**: fundo `EEF4FF`, borda esquerda 32pt `1E3A8A`, texto `1E3A8A`
4. **Subheadings**: texto bold `1E3A8A`, borda top `93C5FD`
5. **Termos em destaque** (bold inline): cor `1E3A8A`
6. **Rodapé do relatório**: fundo `EEF4FF`, borda top `1E3A8A`

---

## Fluxo de Trabalho

1. **Identificar o tipo de peça** — Veja a tabela abaixo e pergunte ao usuário se não ficou claro
2. **Consultar identidade visual** — Ler `_shared/padrao-relatorio.md` para cores e estrutura do .docx
3. **Carregar o prompt específico** — Leia o arquivo correspondente em `references/`
4. **Localizar o processo do assistido** (se disponível) — Busque a pasta do assistido em "Processos - Execução Penal" (ver "Pastas de Processos") e leia PDFs e documentos para extrair dados de pena, regime, datas e argumentos
5. **Consultar modelos reais similares** — Busque peças do mesmo tipo em "Petições por assunto" → "10 Execução Penal" (ver "Banco de Modelos") para absorver o padrão argumentativo e estilo do Defensor
6. **Coletar informações complementares** — Se os autos/documentos não forem suficientes, peça dados adicionais ao usuário
7. **Gerar a minuta** — Siga o prompt carregado, baseando-se nos fatos do processo e no estilo dos modelos reais
8. **Gerar o .docx** — Use python-docx (`_shared/formatacao-dpe-ba.md` + `_shared/padrao-relatorio.md` para cores Execução Penal)
9. **Gerar _analise_ia.json** — Salvar JSON estruturado (schema v2.0 — ver `_shared/schema-base.md`)
10. **Salvar na pasta do usuário**

---

## Banco de Modelos Reais (Petições por Assunto)

Peças anteriores do Defensor em execução penal, organizadas por tipo. Use como referência de estilo, tom e estrutura argumentativa.

**Caminho base**: `Meu Drive 2/1 - Defensoria 9ª DP/Petições por assunto (DOC)/`

| Subpasta | Relevância para Execução Penal |
|---|---|
| `10 Execução Penal/` | Peças específicas de execução penal — referência principal |
| `6 HC/` | Habeas Corpus — excesso de prazo, progressão negada indevidamente |
| `2 Apelação/` | Apelações — contra decisões do juízo de execução |
| `8 RESE/` | RESE — contra decisões interlocutórias na execução |
| `Embargos Declaração/` | Embargos de declaração |
| `Impugnações/` | Impugnações diversas na execução |
| `Outras petições/` | Petições intermediárias |

**Como usar**: Liste os .docx da subpasta correspondente. Priorize `10 Execução Penal/` para peças específicas da LEP. Para HC, apelação e RESE no contexto de execução, consulte também as subpastas numeradas correspondentes. Identifique 1-3 modelos similares, leia-os para absorver estilo e argumentação. Adapte ao caso concreto.

---

## Pastas de Processos dos Assistidos

Processos individuais de execução penal com documentos dos asentenciados.

| Atribuição | Caminho da Pasta |
|---|---|
| Execução Penal | `Meu Drive 2/1 - Defensoria 9ª DP/Processos - Execução Penal/` |

Cada subpasta é nomeada com o nome do assistido e pode conter: PDFs dos autos de execução, guias de recolhimento, laudos, atestados, documentos de trabalho, comprovantes de endereço e demais documentos pertinentes à execução.

**Como usar**: Quando o usuário pedir uma peça de execução penal para um assistido específico, busque o nome na pasta. Leia os documentos para extrair dados de pena, regime atual, datas relevantes e fundamentar a peça.

---

## Tipos de Peça Disponíveis

| Tipo de Peça | Arquivo de Referência | Quando Usar |
|---|---|---|
| Autorização para Trabalho em Comarca Diversa | `references/ep_requerimento_ausencia_comarca.md` | Assistido obtém emprego em outra cidade, precisa de autorização para residir/trabalhar fora da comarca |
| Análise de Prescrição Executória | `references/analisar_falta_intimacao_ep.md` | Verificar prescrição da pretensão executória, falta de intimação, atualização de endereço |

> **Nota**: Outras peças de execução penal (progressão de regime, saída temporária, livramento condicional) podem ser geradas seguindo o mesmo padrão, com prompts complementares a serem adicionados conforme necessidade.

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