---
name: vvd
description: "Gerador de peças jurídicas VVD/Lei Maria da Penha da DPE-BA, 7ª Regional – Camaçari. Use SEMPRE que o usuário pedir: resposta à acusação VVD, apelação, contrarrazões, alegações finais, revisão/revogação de MPU, análise de caso, atualização de endereço — ou mencionar: 'VVD', 'violência doméstica', 'Lei Maria da Penha', 'medida protetiva', 'MPU', 'paz em casa', 'revogação medida protetiva', 'desvio de finalidade da MPU', 'MPU para fins patrimoniais', 'medida protetiva usada para tomar imóvel', 'disputa possessória com MPU', ou qualquer peça de defesa em violência doméstica. Inclui conhecimento estratégico para casos em que a MPU é instrumentalizada para fins patrimoniais/possessórios. Gera .docx institucional DPE-BA."
---

# Peças Jurídicas — Violência Doméstica & Lei Maria da Penha (DPE-BA, 7ª Regional – Camaçari)

Esta skill gera documentos .docx formatados com o padrão institucional da Defensoria Pública para a atribuição de **Violência Doméstica**, além de **relatórios de análise estratégica** em Markdown.

---

## SKILLS TRANSVERSAIS — CONSULTA OBRIGATÓRIA

**ANTES de redigir qualquer peça ou relatório**, consultar OBRIGATORIAMENTE estas skills:

### 1. linguagem-defensiva
Aplicar em TODA peça processual e relatório:
- "defendido" (NUNCA "acusado", "réu", "agressor", "autor do fato")
- "ofendida" ou "suposta vítima" (quando houver dúvida sobre autoria/materialidade)
- "fato imputado" (NUNCA "crime cometido")
- Modalizadores obrigatórios: "segundo a denúncia", "conforme a acusação pretende"
- "declarou", "relatou", "informou" (NUNCA "confessou", "admitiu")

### 2. citacao-depoimentos
Para TODA citação de depoimento em peças e relatórios:
- **Quem perguntou**: identificar MP, Defesa ou Juíza
- **Espontaneidade**: distinguir declaração espontânea de resposta a pergunta
- **Timestamp**: `(mídia audiovisual, a partir de XXminYYs)`
- **Reiteração**: "questionado(a) novamente pela Defesa sobre..." quando a mesma pergunta é repetida
- **Contexto temporal**: "logo em seguida", "minutos depois"

### 3. citacoes-seguras
Para TODA citação normativa (artigos, súmulas, jurisprudência):
- Verificar súmulas no banco verificado antes de citar
- Buscar jurisprudência antes de incluir
- Marcar com `[VERIFICAR PRECEDENTE]` quando não houver certeza absoluta
- Preferir artigos de lei (verificáveis) a jurisprudência (alucinável)

---

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

O art. 226 CPP é o **parâmetro mínimo legal** para reconhecimento com confiabilidade epistêmica. Seus requisitos existem para mitigar o **viés de confirmação**: fenômeno cognitivo pelo qual a mente, diante de opção única ou sugerida, tende a confirmar o apresentado, ainda que a memória seja fragmentada ou contaminada.

**Descumprimento → contaminação → higidez inviabilizada → inadmissibilidade (art. 157 CPP)**

✅ Sujeito correto: "A Defesa suscita a ilegalidade do **procedimento** adotado para fins de identificação, e a consequente inadmissibilidade probatória do elemento identificatório assim produzido."
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

## Identidade Visual da Atribuição VVD

> Referências completas: [`_shared/padrao-relatorio.md`](../_shared/padrao-relatorio.md) e [`_shared/formatacao-dpe-ba.md`](../_shared/formatacao-dpe-ba.md).

### Paleta VVD / Maria da Penha

| Elemento | Cor | Hex | Uso |
|---|---|---|---|
| **Cor-tema** | Amber escuro | `92400E` | Banner principal, borda esquerda de headings, texto de títulos |
| **Fundo suave** | Creme claro | `FFFBEB` | Fundo de tabelas de identificação, headings, rodapé |
| **Cor clara** | Amarelo | `FCD34D` | Subtítulo no banner, borda top de subheadings |
| **OMBUDS UI** | Yellow-600 | `CA8A04` | Badge de atribuição no app web (de `atribuicoes.ts`) |

### Aplicação obrigatória em .docx (relatórios e análises)

1. **Banner**: fundo `92400E`, título branco, subtítulo `FCD34D`
2. **Tabela de identificação**: fundo `FFFBEB`, rótulos cinza, valores bold `92400E`
3. **Headings de seção**: fundo `FFFBEB`, borda esquerda 32pt `92400E`, texto `92400E`
4. **Subheadings**: texto bold `92400E`, borda top `FCD34D`
5. **Termos em destaque** (bold inline): cor `92400E`
6. **Rodapé do relatório**: fundo `FFFBEB`, borda top `92400E`

### Aplicação em .md (relatórios markdown)

- Título: `# VVD — Análise Estratégica — [NOME DO DEFENDIDO]`
- Subtítulo: `**Dossiê Estratégico de Defesa — [Tipo de Audiência/Peça]**`

---

## Fluxo de Trabalho

1. **Consultar skills transversais** — Ler linguagem-defensiva, citacao-depoimentos e citacoes-seguras
2. **Consultar identidade visual** — Ler `_shared/padrao-relatorio.md` para cores e estrutura do .docx
3. **Identificar o tipo de peça/análise** — Veja a tabela abaixo e pergunte ao usuário se não ficou claro
4. **Carregar o prompt específico** — Leia o arquivo correspondente em `references/`
5. **Localizar o processo do assistido** — Busque a pasta do assistido em "Processos - VVD" e leia PDFs, transcrições e documentos
6. **Consultar modelos reais similares** — Busque peças do mesmo tipo em "Petições por assunto" → "11 Violência Doméstica"
7. **Coletar informações complementares** — Se os autos não forem suficientes, peça dados ao usuário
8. **Gerar a minuta/relatório** — Siga o prompt carregado, aplicando TODAS as skills transversais
9. **Gerar o .docx** — Use python-docx com formatação institucional (consultar `_shared/formatacao-dpe-ba.md` + `_shared/padrao-relatorio.md` para cores VVD)
10. **Gerar _analise_ia.json** — Para análises, salvar o JSON estruturado (schema v2.0)
11. **Salvar na pasta do usuário**

---

## Banco de Modelos Reais (Petições por Assunto)

Peças anteriores do Defensor em violência doméstica, organizadas por tipo. Use como referência de estilo, tom e estrutura argumentativa.

**Caminho base**: `Meu Drive 2/1 - Defensoria 9ª DP/Petições por assunto (DOC)/`

| Subpasta | Relevância para VVD |
|---|---|
| `11 Violência Doméstica/` | Peças específicas de VVD (Lei Maria da Penha) — referência principal |
| `1 Alegações Finais/` | Alegações finais — base para AF em casos de VVD |
| `2 Apelação/` | Apelações criminais — base para apelação VVD |
| `3 Contrarrazões de Apelação/` | Contrarrazões quando o MP apela |
| `4 Contrarrazões de RESE/` | Contrarrazões de RESE em VVD |
| `6 HC/` | Habeas Corpus — defendidos presos em VVD |
| `7 Prisão e cautelares/` | Revogação/relaxamento de preventiva em VVD |
| `8 RESE/` | Recurso em Sentido Estrito |
| `9 Resposta à acusação/` | RA — defesa inicial em VVD |
| `Embargos Declaração/` | Embargos de declaração |
| `Nulidades processuais/` | Nulidades em casos de VVD |

**Como usar**: Liste os .docx da subpasta correspondente. Priorize `11 Violência Doméstica/`. Identifique 1-3 modelos similares, leia-os para absorver estilo e argumentação. Adapte ao caso concreto.

---

## Pastas de Processos dos Assistidos

| Atribuição | Caminho da Pasta |
|---|---|
| VVD | `Meu Drive 2/1 - Defensoria 9ª DP/Processos - VVD/` |

Relatórios VVD: `Meu Drive 2/1 - Defensoria 9ª DP/vvd_reports_final/` e `Meu Drive 2/1 - Defensoria 9ª DP/Relatórios (VVD)/`

---

## Tipos de Peça e Análise Disponíveis

### Peças Processuais (.docx)

| Tipo de Peça | Arquivo de Referência | Quando Usar |
|---|---|---|
| Resposta à Acusação (VVD) | `references/vvd_ra.md` | Contra denúncia/acusação em violência doméstica |
| Alegações Finais (VVD) | `references/vvd_alegacoes_finais.md` | Memoriais após instrução — **VERSÃO APRIMORADA** com skills transversais integradas |
| Apelação (VVD básica) | `references/vvd_apelacao.md` | Recurso contra sentença condenatória |
| Apelação (VVD aprimorada) | `references/vvd_apelacao_aprimorado.md` | Versão detalhada e fundamentada |
| Contrarrazões à Apelação | `references/vvd_contrarrazoes_apelacao.md` | Resposta às razões de apelação do MP |
| Contrarrazões a RESE | `references/vvd_contrarrazoes_rese.md` | Resposta a RESE em VVD |
| Contrarrazões a Embargos | `references/vvd_contrarrazoes_embargos_declaracao.md` | Resposta aos embargos |
| Revogação de MPU | `references/vvd_requerimento_revogacao_mpu.md` | Petição para revogar medida protetiva |
| Atualização de Endereço | `references/rq_atualizacao_endereco_vvd.md` | Atualizar endereço processual |
| Cota de Juntada de Áudios | `references/vvd_cota_juntada_audios.md` | Juntar mídias audiovisuais |

### Relatórios de Análise Estratégica (.md → .docx)

| Tipo de Análise | Arquivo de Referência | Quando Usar |
|---|---|---|
| Análise para Audiência | `references/vvd_analise_para_audiencia.md` | Dossiê estratégico completo pré-audiência — **VERSÃO APRIMORADA** com painel de depoentes, tabela comparativa, perguntas estratégicas e avaliação de risco |
| Análise para Justificação | `references/vvd_analise_audiencia_justificacao.md` | Análise focada em audiência de justificação de MPU |
| Análise para RA | `references/vvd_analise_para_ra.md` | Análise para estruturar resposta à acusação |

---

## Particularidades da VVD (Lei Maria da Penha)

- **Juízo**: "VARA DA JUSTIÇA PELA PAZ EM CASA" (quando aplicável)
- **Qualificação**: Defensoria Pública do Estado da Bahia, com dispensa de mandato e prerrogativas funcionais (arts. 396 e 396-A do CPP)
- **Contexto de Violência**: Considerar vulnerabilidade, ciclo de violência, trauma — SEM minimizar a violência, mas garantindo presunção de inocência
- **Teses Frequentes**: Enunciado 50 do FONAVID (autonomia da vítima), Convenção de Belém do Pará, retratação (art. 16 Lei 11.340/06)
- **Medidas Protetivas**: Atenção a revogação, atualização e desvio de finalidade da MPU
- **Desvio de Finalidade da MPU**: Quando a medida protetiva é instrumentalizada para fins patrimoniais/possessórios — disputa de imóvel, tentativa de afastar o defendido do lar para tomar posse. Argumentar que a MPU tem finalidade protetiva, não patrimonial
- **Contexto Relacional**: Disputas de guarda, pensão, patrimônio como possível motivação para denúncia

---

## Formatação e Geração de Documentos

A formatação institucional DPE-BA (margens, fonte Verdana 12pt, espaçamento 1.5, cabeçalho "paz em casa", rodapé, assinatura) está definida na skill **dpe-ba-pecas**. Consulte-a para gerar o .docx.

### Regras
- Sempre usar **python-docx** (não biblioteca npm)
- Data em português por extenso (ex: "10 de março de 2026")
- Nome do arquivo: `[Tipo da Peça] - [Nome do Assistido].docx`
- Para análises: gerar primeiro em Markdown (.md), depois .docx sob demanda
- Salvar na pasta do usuário

---

## Output Estruturado — _analise_ia.json

**SEMPRE ao final de cada análise**, salvar `_analise_ia.json` na pasta raiz do assistido.

Schema v2.0 — estrutura rica e aninhada:

```json
{
  "schema_version": "2.0",
  "tipo": "vvd",
  "gerado_em": "<ISO 8601>",
  "gerado_por": "skill-vvd (assistente IA) sob supervisão de <defensor> — DPE-BA",

  "assistido": {
    "nome": "<NOME COMPLETO>",
    "cpf": "<CPF>",
    "rg": "<RG>",
    "nascimento": "<YYYY-MM-DD>",
    "idade_atual": 0,
    "filiacao": { "mae": "<nome>", "pai": "<nome ou null>" },
    "raca_cor": "<autodeclarada>",
    "estado_civil": "<estado>",
    "profissao": "<profissão>",
    "escolaridade": "<escolaridade>",
    "endereco": "<endereço completo>",
    "telefones": ["<tel1>", "<tel2 (obs)>"],
    "situacao_processual": "solto|preso",
    "monitoramento_eletronico": false,
    "monitoramento_desde": "<YYYY-MM-DD ou null>",
    "intimado_para_aij": false,
    "data_intimacao": "<YYYY-MM-DD ou null>"
  },

  "processo": {
    "numero": "<número da ação penal>",
    "classe": "<classe processual>",
    "ip_origem": "<número IP/APF + delegacia>",
    "juizo": "<vara + comarca>",
    "juiz": "<nome>",
    "promotor": "<nome + promotoria>",
    "defensor_publico": "<nome>",
    "data_fato": "<YYYY-MM-DD>",
    "data_denuncia": "<YYYY-MM-DD>",
    "data_recebimento_denuncia": "<YYYY-MM-DD>",
    "tipos_imputados": [
      {
        "artigo": "<art. X, §Y, CP>",
        "descricao": "<nome do crime>",
        "pena_min_meses": 0,
        "pena_max_meses": 0
      }
    ],
    "contexto_legal": "<Lei 11.340/06, art. 7º etc.>",
    "crime_hediondo": false,
    "audiencia_marcada": {
      "data": "<YYYY-MM-DD>",
      "hora": "<HH:MM>",
      "tipo": "<tipo de audiência>",
      "modalidade": "presencial|híbrida|videoconferência",
      "link": "<URL ou null>"
    },
    "audiencias_anteriores_suspensas": [
      { "data": "<YYYY-MM-DD>", "motivo": "<razão da suspensão>" }
    ],
    "prescricao": {
      "<artigo_1>": {
        "prazo_anos": 0,
        "vencimento_estimado": "<YYYY-MM-DD>",
        "risco": "baixo|médio|alto",
        "fundamento": "<art. 109, X, CP>"
      }
    }
  },

  "ofendida": {
    "nome": "<NOME COMPLETO>",
    "cpf": "<CPF>",
    "nascimento": "<YYYY-MM-DD>",
    "idade_atual": 0,
    "idade_data_fato": 0,
    "raca_cor": "<autodeclarada>",
    "estado_civil": "<estado>",
    "profissao": "<profissão>",
    "filiacao_mae": "<nome>",
    "endereco": "<endereço>",
    "telefone": "<telefone>",
    "intimada_para_aij": false,
    "tentativas_intimacao_frustradas": 0,
    "dependencia_financeira_alegada": false,
    "comparecimento_audiencias": [
      { "data": "<YYYY-MM-DD>", "presente": false }
    ]
  },

  "medidas_protetivas_vigentes": {
    "pedido_formulado": false,
    "numero_pedido": "<número ou null>",
    "medidas_solicitadas": ["<medida 1>", "<medida 2>"],
    "decisao_juntada_aos_autos": false,
    "vigencia_atual_confirmada": "<status ou 'indeterminada'>"
  },

  "historico_violencia": {
    "ip_anteriores": [
      {
        "numero": "<número>",
        "delegacia": "<delegacia>",
        "infracoes": "<artigos>",
        "vitima": "<nome>"
      }
    ],
    "ap_em_andamento_outra_vitima": "<número ou null>",
    "registro_anterior_relatado": "<descrição ou null>",
    "agressao_durante_gravidez": "<sim/não/não informado>",
    "filhos_presenciaram_violencia": "<sim/não/não informado>",
    "fatos_no_caso_atual": "<síntese do fato em 2-3 frases>"
  },

  "dinamica_relacional": {
    "tipo_uniao": "<convivência marital|namoro|ex-companheiros|etc.>",
    "duracao_relacionamento": "<descrição>",
    "estavam_juntos_no_fato": false,
    "filhos_em_comum": 0,
    "imovel_comum": "<endereço ou null>",
    "disputa_patrimonial_paralela": false,
    "disputa_guarda_paralela": "<descrição ou null>",
    "motivacoes_extrajuridicas_identificadas": ["<motivo 1>"]
  },

  "testemunhas_acusacao": [
    {
      "nome": "<nome>",
      "vinculo": "<relação com o caso>",
      "presencial": false,
      "tipo_prova": "<hearsay|apresentação|direta>",
      "depoimento_judicial_prestado": false,
      "intimado_aij": false,
      "vies_potencial": "<descrição>",
      "obs_critica": "<observação estratégica>"
    }
  ],

  "testemunhas_defesa": [
    {
      "nome": "<nome>",
      "vinculo_caso": "<relação com o caso>",
      "presencial_dos_fatos": false,
      "valor_estrategico": "<por que é relevante>",
      "ouvido_em_fase_policial": false,
      "estrategia": "<arrolar oralmente / já arrolado / dispensar>"
    }
  ],

  "provas_materiais": [
    {
      "tipo": "<laudo_lesoes|laudo_conjuncao|auto_apreensao|print|etc.>",
      "numero": "<número do laudo>",
      "constatacao": "<o que foi constatado>",
      "elemento_critico": "<ponto favorável ou desfavorável à defesa>"
    }
  ],

  "teses_defesa": [
    {
      "ordem": 1,
      "tese": "<nome da tese>",
      "viabilidade": "alta|média-alta|média|baixa",
      "fundamento_legal": ["<art. X>", "<art. Y>"],
      "elementos_favoraveis": ["<elemento 1>", "<elemento 2>"],
      "observacao": "<nota estratégica opcional>"
    }
  ],

  "vulnerabilidades_acusacao": [
    "<vulnerabilidade 1>",
    "<vulnerabilidade 2>"
  ],

  "pedido_principal": "<pedido principal da defesa>",
  "pedidos_subsidiarios": [
    "<pedido subsidiário 1>",
    "<pedido subsidiário 2>"
  ],

  "pendencias_diligencia_pre_aij": [
    "<pendência 1>",
    "<pendência 2>"
  ],

  "avaliacao_de_risco": [
    {
      "risco": "<cenário>",
      "probabilidade": "alta|média-alta|média|baixa",
      "impacto": "alto|médio|baixo|favorável"
    }
  ],

  "arquivos_gerados": [
    "<caminho do relatório .md>",
    "<caminho do _analise_ia.json>"
  ]
}
```

**Notas sobre o schema v2.0:**
- Campos `null` são aceitos quando a informação não consta nos autos
- Arrays podem estar vazios `[]` se não houver dados
- O campo `prescricao` dentro de `processo` aceita chaves dinâmicas por artigo (ex: `"art_129_9"`, `"art_147"`)
- `provas_materiais` é opcional — incluir apenas quando houver laudos/apreensões relevantes
- `testemunhas_defesa` pode estar vazio se não houver testemunhas arroladas

Informar ao final: "✅ `_analise_ia.json` salvo — pronto para importar no OMBUDS via botão 'Importar do Cowork'"
