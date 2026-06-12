---
name: institucional
description: "Gerador de documentos institucionais e petições modelo para a Defensoria Pública do Estado da Bahia (DPE-BA), 7ª Regional – Camaçari. Use esta skill SEMPRE que o usuário pedir documentos administrativos, ofícios, comunicações institucionais, declarações, cartas convite, termos de declaração, manifestações APF para plantão, petições modelo (ciências, cotas), formulários CEPRO, ou qualquer correspondência oficial da Defensoria. Também acione quando o usuário mencionar: 'ofício', 'requisição', 'declaração', 'união estável', 'visita ao presídio', 'plantão', 'APF', 'auto de prisão em flagrante', 'manifestação', 'ciência', 'cota', 'carta convite', 'termo de declaração', 'CEPRO', 'avaliação', 'estágio probatório', 'petição modelo', ou qualquer documento institucional. Possui 54 modelos de petições prontas (ciências, cotas, requerimentos simples) que podem ser usadas diretamente. Gera documentos .docx com cabeçalho e rodapé institucionais da DPE-BA."
---

# Documentos Institucionais (DPE-BA, 7ª Regional – Camaçari)

Esta skill gera documentos .docx formatados com o padrão institucional da Defensoria Pública para comunicações, ofícios, declarações e manifestações. Cada tipo de documento possui um prompt especializado na pasta `references/`.

## Padrões Obrigatórios de Redação

### Preâmbulo
Nome do assistido PRIMEIRO, seguido da Defensoria e fundamento constitucional:
> **[NOME]**, [qualificação], representado pela Defensoria Pública do Estado da Bahia, com fundamento no art. 134 da Constituição da República, por meio do defensor público subscritor, vem respeitosamente perante V. Exa. apresentar o presente **[DOCUMENTO]**, nos termos que seguem:

**Proibido**: "Lei Complementar nº 80/1994", "LC Estadual nº 26/2006", "por intermédio da DEFENSORIA PÚBLICA".

### Paragrafação funcional — cada parágrafo, uma unidade de raciocínio

Evitar megaparágrafos. A regra não é de tamanho, mas de coerência temática: cada parágrafo deve abrir e fechar uma unidade de raciocínio, tema ou abordagem. Quando o texto muda de eixo, abrir novo parágrafo — mesmo que a mudança seja sutil.

**O leitor deve conseguir identificar, ao começar um novo parágrafo, que se inicia um novo tema, raciocínio ou abordagem.**

Cortes naturais mais frequentes:
- **Conceitual** (o que é o instituto / por que existe) → **Jurisprudencial** (o que os tribunais fixaram)
- **Normativo** (o que a lei exige) → **Factual** (o que ocorreu no caso concreto)
- **Descritivo** (o que aconteceu) → **Analítico** (o que isso significa juridicamente)
- **Pedido/fundamento** → **Documentação** → **Fecho**

Megaparágrafos são admissíveis apenas quando os raciocínios são verdadeiramente inseparáveis e a divisão prejudicaria a coesão do documento.

---

## Fluxo de Trabalho

1. **Identificar o tipo de documento** — Veja a tabela abaixo e pergunte ao usuário se não ficou claro
2. **Carregar o prompt específico** — Leia o arquivo correspondente em `references/`
3. **Localizar dados do assistido** (se aplicável) — Busque a pasta do assistido nos diretórios de processos (ver "Pastas de Processos") para extrair dados pessoais, número do processo e informações relevantes
4. **Consultar modelos reais similares** — Busque documentos do mesmo tipo em "Petições por assunto" (ver "Banco de Modelos") para seguir o padrão institucional
5. **Coletar informações complementares** — Se os dados não forem suficientes, peça informações adicionais ao usuário
6. **Gerar a minuta** — Siga o prompt carregado, baseando-se nos dados disponíveis e no estilo dos modelos
7. **Gerar o .docx** — Use python-docx com a formatação institucional (veja seção abaixo)
8. **Salvar na pasta do usuário**

---

## Banco de Modelos e Fontes de Conhecimento

Documentos reais do Defensor organizados por tipo. Use tanto para referência de formatação quanto como base de conhecimento sobre conteúdo, linguagem e fundamentação.

### Ofícios (formatação: Verdana 12pt, data à DIREITA)
**Pasta principal**: `Meu Drive/1 - Defensoria 9ª DP/Expedientes administrativos - Ofícios, cartas convite, termos, rol/Ofícios/`
- Subpastas por ano (2019-2025). **Usar os de 2025 como referência de formatação** (mais recentes)
- **Toda a pasta serve como banco de conhecimento**: tipos de requisição, linguagem, fundamentação legal, destinatários

### Cartas Convite (formatação: Verdana 12pt, título 14pt centralizado)
**Pasta**: `Meu Drive/1 - Defensoria 9ª DP/Expedientes administrativos - Ofícios, cartas convite, termos, rol/Carta convite/`

### Termos de Declaração (formatação: Verdana 12pt)
**Pasta**: `Meu Drive/1 - Defensoria 9ª DP/Expedientes administrativos - Ofícios, cartas convite, termos, rol/Termo de declaração/`

### Declaração de União Estável (formatação: Verdana 12pt, margens próprias)
**Modelos**: `Meu Drive/1 - Defensoria 9ª DP/Modelo de declaração de União Estável para visita no estabelecimento prisional.docx`

### Petições Modelo — 54 modelos prontos (formatação: Verdana 12pt)
**Pasta**: `Meu Drive/1 - Defensoria 9ª DP/Peticoes modelo/`
- São petições padronizadas que são protocoladas sem alteração ou com mínima edição
- Incluem: ciências (absolvição, sentença, designação, extinção, progressão...), cotas (acesso autos, exclusão PJe), requerimentos simples (atualização endereço)
- Quando o usuário pedir "ciência de [algo]" ou "cota de [algo]", verificar se já existe modelo pronto nesta pasta antes de gerar do zero

### Manifestações APF / Plantão
**Modelos na raiz**: `Meu Drive/1 - Defensoria 9ª DP/Manifestação APF *.docx`
**Pasta de plantão**: `Meu Drive/1 - Defensoria 9ª DP/Plantao/`

### Formulários CEPRO (avaliação de estágio probatório)
**Pasta**: `Meu Drive/1 - Defensoria 9ª DP/CEPRO/`
- Formatação própria: Verdana 12pt, margens laterais maiores, baseado em tabelas

### Petições por assunto (complementar)
**Caminho base**: `Meu Drive/1 - Defensoria 9ª DP/Petições por assunto (DOC)/`

| Subpasta | Relevância |
|---|---|
| `Plantão judiciário/` | Manifestações de plantão |
| `Outras petições/` | Petições diversas e requerimentos |

**Como usar**: Para qualquer tipo de documento, primeiro verifique se já existe modelo pronto na pasta correspondente. Leia 1-3 modelos similares para absorver estilo, formato e conteúdo. Adapte ao caso concreto.

---

## Pastas de Processos dos Assistidos

Quando o documento institucional se refere a um assistido específico (ex: ofício requisitando informações sobre um preso), buscar dados na pasta do caso:

| Atribuição | Caminho da Pasta |
|---|---|
| Criminal Comum | `Meu Drive 2/1 - Defensoria 9ª DP/Processos/` |
| Júri | `Meu Drive 2/1 - Defensoria 9ª DP/Processos - Júri/` |
| VVD | `Meu Drive 2/1 - Defensoria 9ª DP/Processos - VVD/` |
| Execução Penal | `Meu Drive 2/1 - Defensoria 9ª DP/Processos - Execução Penal/` |

---

## Tipos de Documento Disponíveis

| Tipo de Documento | Arquivo de Referência | Quando Usar |
|---|---|---|
| Ofícios e Requisições | `references/oficios.md` | Comunicações oficiais com órgãos públicos, requisições de informações, solicitações institucionais |
| Declaração de União Estável | `references/declaracao_uniao_estavel.md` | Declaração para visitas em presídio, comprovação de relacionamento |
| Manifestação APF (Plantão) | `references/manifestacao_apf_plantao.md` | Peça defensiva para auto de prisão em flagrante em plantão |
| Petições Modelo (Ciências/Cotas) | *Usar modelo pronto da pasta* | Ciências de decisões, designações, extinções; cotas de acesso; requerimentos simples. **Verificar primeiro se já existe modelo em `Peticoes modelo/`** |
| Carta Convite | *Usar modelo pronto da pasta* | Convidar assistido para atendimento na Defensoria |
| Termo de Declaração | *Usar modelo pronto da pasta* | Registrar declarações de assistidos em atendimento |
| Formulário CEPRO | *Usar modelo pronto da pasta* | Avaliação de estágio probatório de servidores |

## Como Usar os Prompts de Referência

Cada arquivo em `references/` contém o prompt completo extraído do Gemini Gem correspondente. Ao gerar um documento:

1. **Leia o arquivo de referência** correspondente ao tipo de documento solicitado
2. **Siga as instruções do prompt** como se fossem suas instruções de trabalho
3. **Adapte com os dados reais** fornecidos pelo usuário
4. **Aplique a formatação DPE-BA** descrita abaixo ao gerar o .docx

## Formatação e Geração de Documentos

A formatação varia por tipo de documento. Todos compartilham: página Letter, logo DPE no header, rodapé "Defensoria Pública do Estado da Bahia / 7ª Regional da DPE – Camaçari – Bahia." em Arial Narrow 8pt com borda superior.

### Fonte padrão: Verdana 12pt para TODOS os tipos

### Diferenças por tipo (mantendo Verdana 12pt):
| Tipo | Recuo 1ª linha | Data | Especificidades |
|---|---|---|---|
| Ofícios | 449580 EMU | Alinhada à **DIREITA** | Espaçamento 1.5, justificado |
| Carta Convite | 449580 EMU | Centralizada | Título "CARTA CONVITE" centralizado negrito 14pt |
| Termo Declaração | — | — | Campos de dados do assistido |
| Declaração UE | — | — | Margens próprias (720090/900430), título 20pt+ |
| Manifestação APF | — | — | Sem recuo, texto corrido |
| Petições Modelo | 449580 EMU | "data na assinatura eletrônica" | Justificado, espaçamento 1.5 |
| CEPRO | — | — | Margens laterais maiores (1080135), baseado em tabelas |

Para peças processuais (HC, RESE, apelação etc.), a formatação está na skill **dpe-ba-pecas** (Verdana 12pt). Use `scripts/gerar_docx.py` como base e adapte o recuo/especificidades conforme o tipo acima.

## Regras de Formatação dos Ofícios

Ao gerar ofícios, seguir obrigatoriamente estas regras (consolidadas a partir de revisão do Defensor):

### Estrutura do ofício:
1. **Número**: "Ofício nº XX/AAAA – 9ºDP – Camaçari" — verificar numeração sequencial na pasta de ofícios do ano corrente
2. *(1 linha em branco)*
3. **Data**: "Camaçari/BA, DD de mês de AAAA" — alinhada à **DIREITA**
4. *(2 linhas em branco)*
5. **Destinatário**: nome do órgão/pessoa em negrito, endereço abaixo
6. *(1 linha em branco)*
7. **Assunto**: "Assunto:" em negrito + descrição
8. *(1 linha em branco — NÃO colocar 2 linhas entre assunto e vocativo)*
9. **Vocativo**: "Prezado(a) Diretor(a)," / "Ilmo. Sr.," etc.
10. *(1 linha em branco)*
11. **Corpo**: parágrafos justificados com recuo 1ª linha (449580 EMU), espaçamento 1.5
12. **Fecho**: "Manifesto os protestos de estima e consideração."
13. **Data repetida no fecho**
14. *(2 linhas em branco)*
15. **Assinatura**: centralizada — APENAS "Rodrigo Rocha Meire" (negrito) + "Defensor Público" (negrito). **NÃO incluir** "9º Distrito de Defensoria Pública" ou similar — não existe essa nomenclatura.

### Nomenclatura do arquivo:
`Ofício nº XX-AAAA - [Destinatário ou Assunto resumido].docx`

## Importante

- Sempre usar **python-docx** (não a biblioteca npm)
- Data gerada automaticamente em português (ex: "10 de março de 2026")
- Salvar na pasta do usuário ou na pasta do assistido (se vinculado a um caso)


---

## Linguagem Estratégica da Defesa

A escolha das palavras numa minuta não é neutra — ela pode reforçar ou desconstruir a narrativa acusatória. Como Defensoria Pública, a peça deve ser tecnicamente rigorosa e, ao mesmo tempo, evitar termos que implicitamente aceitem a versão da acusação. Aplique este critério em todas as minutas.

### Evite "vítima" para se referir ao ofendido

A palavra "vítima" pressupõe que um crime ocorreu e que aquela pessoa o sofreu — premissa que a defesa contesta. Use alternativas neutras ou factuais:

| Em vez de | Prefira |
|-----------|---------|
| "a vítima foi hospitalizada" | "Fulano foi hospitalizado" (nome próprio) |
| "a vítima declarou" | "o ofendido declarou" / "Fulano declarou" |
| "a vítima faleceu" | "o ofendido veio a óbito" / "Fulano faleceu" |
| "os familiares da vítima" | "os familiares do falecido" / "familiares de Fulano" |

**Exceção importante**: quando o próprio assistido é a pessoa ofendida num processo distinto (ex.: registros de violência doméstica sofrida), "vítima" é favorável à defesa e deve ser mantido. Também é apropriado dizer que o assistido é "vítima de violência doméstica" em peças de VVD/criminal, mas prefira a terminologia oficial da Lei Maria da Penha: **"em situação de violência doméstica"** (art. 5º, Lei nº 11.340/2006).

### Outras escolhas linguísticas que importam

- **"supostamente"** e **"alegadamente"**: use ao narrar os fatos da denúncia — "o fato supostamente ocorrido em..."; "a conduta alegadamente praticada..."
- **"fato apurado"** ou **"fato narrado na denúncia"**: prefira a "crime" quando a autoria ou tipicidade está em disputa
- **"o assistido"** / **"a requerente"** / **"o acusado"**: corretos e neutros; evite expressões que antecipem julgamento
- **"o ofendido"**: tecnicamente adequado quando a lei processual assim o designa; não carrega a carga emocional de "vítima"
- **Verbos no condicional**: ao descrever fatos da acusação, prefira "teria praticado", "teria dito", "teria agredido"

### Raciocínio por trás dessa diretriz

O objetivo não é negar a realidade dos fatos, mas garantir que a minuta da Defensoria não construa, inadvertidamente, a narrativa da acusação. O juiz lê a peça da defesa e deve perceber, desde as primeiras linhas, que há uma perspectiva própria — técnica, respeitosa e distinta. Essa disciplina linguística é parte da estratégia defensiva, não mero preciosismo.
