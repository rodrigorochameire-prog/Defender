# Tipos de Peças Processuais — DPE-BA

Este arquivo contém a estrutura e prompts pré-definidos para cada tipo de peça processual comumente elaborada pela Defensoria Pública.

## Índice

1. Requerimento de Revogação de Prisão Preventiva
2. Requerimento de Liberdade Provisória
3. Habeas Corpus
4. Resposta à Acusação (art. 396-A, CPP)
5. Alegações Finais
6. Recurso em Sentido Estrito
7. Apelação Criminal
8. Manifestação / Petição Simples
9. Ofício / Requisição

---

## 1. Requerimento de Revogação de Prisão Preventiva

**Quando usar**: Assistido preso preventivamente, quando os pressupostos do art. 312 do CPP não mais subsistem.

**Estrutura**:
- Endereçamento (Vara/Comarca)
- Epígrafe (nº dos autos)
- Qualificação do assistido + nome da peça (inline)
- I – Síntese Fática (fatos do caso, circunstâncias da prisão)
- II – Inexistência de Fuga / Vida Regular
- III – Contexto de Violência Doméstica (se aplicável)
- IV – Ausência dos Pressupostos do Art. 312 do CPP
- V – Julgamento com Perspectiva de Gênero (se aplicável, Resolução CNJ 492/2023)
- VI – Proteção à Criança / Prisão Domiciliar (se aplicável, HC 143.641/STF)
- VII – Suficiência de Medidas Cautelares Diversas (art. 319, CPP)
- VIII – Documentos que Instruem o Requerimento
- IX – Dos Pedidos
- Fecho, Data, Assinatura

**Prompt sugerido**:
```
Preciso de um requerimento de revogação de prisão preventiva para [NOME],
preso(a) nos autos nº [NÚMERO], na [VARA/COMARCA].

Dados do assistido: [qualificação completa]
Fatos: [descrever circunstâncias da prisão e do caso]
Contexto: [violência doméstica? filhos menores? emprego?]
Documentos disponíveis: [listar]
```

---

## 2. Requerimento de Liberdade Provisória

**Quando usar**: Assistido preso em flagrante, pedindo liberdade com ou sem fiança.

**Estrutura**:
- Endereçamento
- Epígrafe
- Qualificação + nome da peça (inline)
- I – Dos Fatos
- II – Da Primariedade e Bons Antecedentes
- III – Da Ausência dos Requisitos da Prisão Preventiva
- IV – Da Possibilidade de Aplicação de Medidas Cautelares Diversas
- V – Dos Pedidos
- Fecho, Data, Assinatura

**Prompt sugerido**:
```
Preciso de um pedido de liberdade provisória para [NOME],
preso(a) em flagrante nos autos nº [NÚMERO], na [VARA/COMARCA].

Dados do assistido: [qualificação]
Fatos: [circunstâncias do flagrante]
Antecedentes: [primário? reincidente?]
Vínculos: [residência fixa? emprego? família?]
```

---

## 3. Habeas Corpus

**Quando usar**: Coação ilegal à liberdade de locomoção, excesso de prazo, falta de fundamentação.

**Estrutura**:
- Endereçamento (Tribunal de Justiça da Bahia)
- Qualificação do paciente + autoridade coatora
- I – Dos Fatos e da Coação Ilegal
- II – Do Direito (fundamentos legais e jurisprudenciais)
- III – Da Liminar (se urgente)
- IV – Dos Pedidos
- Fecho, Data, Assinatura

**Prompt sugerido**:
```
Preciso de um habeas corpus para [NOME], preso(a) nos autos nº [NÚMERO].
Autoridade coatora: [Juiz/Vara]
Motivo: [excesso de prazo / falta de fundamentação / ilegalidade]
Fatos: [descrever a coação]
```

---

## 4. Resposta à Acusação (art. 396-A, CPP)

**Quando usar**: Após o recebimento da denúncia, apresentar defesa preliminar.

**Estrutura**:
- Endereçamento
- Epígrafe
- Qualificação + "vem apresentar RESPOSTA À ACUSAÇÃO"
- I – Breve Síntese da Acusação
- II – Das Preliminares (se houver: inépcia, ilegitimidade, etc.)
- III – Do Mérito (teses de defesa)
- IV – Dos Pedidos (absolvição sumária ou designação de AIJ)
- V – Das Provas (rol de testemunhas, até 8)
- Fecho, Data, Assinatura

**Prompt sugerido**:
```
Preciso de uma resposta à acusação para [NOME],
denunciado(a) nos autos nº [NÚMERO], pela prática do art. [ARTIGO] do CP.

Fatos da denúncia: [resumo]
Teses de defesa: [legítima defesa? atipicidade? falta de provas?]
Testemunhas: [listar com qualificação]
```

---

## 5. Alegações Finais (Memoriais)

**Quando usar**: Após a instrução, na fase de alegações finais escritas.

**Estrutura**:
- Endereçamento
- Epígrafe
- Qualificação + "vem apresentar ALEGAÇÕES FINAIS"
- I – Síntese dos Fatos
- II – Da Prova Produzida (análise da instrução)
- III – Das Teses de Defesa
- IV – Da Dosimetria (subsidiariamente)
- V – Dos Pedidos
- Fecho, Data, Assinatura

**Prompt sugerido**:
```
Preciso de alegações finais para [NOME],
nos autos nº [NÚMERO], acusado(a) de [CRIME].

Resumo da instrução: [o que as testemunhas disseram]
Teses: [legítima defesa? insuficiência de provas? desclassificação?]
Circunstâncias favoráveis: [primariedade, bons antecedentes, etc.]
```

---

## 6. Recurso em Sentido Estrito (RESE)

**Quando usar**: Contra decisão interlocutória (art. 581, CPP), como pronúncia, rejeição de denúncia, etc.

**Estrutura**:
- Endereçamento
- Epígrafe
- Interposição (peça de rosto)
- Razões Recursais:
  - I – Dos Fatos
  - II – Do Cabimento (art. 581, inciso específico)
  - III – Das Razões de Reforma
  - IV – Dos Pedidos
- Fecho, Data, Assinatura

---

## 7. Apelação Criminal

**Quando usar**: Contra sentença condenatória ou absolutória imprópria.

**Estrutura**:
- Interposição (peça de rosto ao juízo a quo)
- Razões de Apelação (ao Tribunal):
  - I – Dos Fatos e da Sentença Recorrida
  - II – Das Preliminares (se houver nulidades)
  - III – Do Mérito
  - IV – Da Dosimetria (subsidiariamente)
  - V – Dos Pedidos
- Fecho, Data, Assinatura

---

## 8. Manifestação / Petição Simples

**Quando usar**: Comunicações gerais ao juízo, pedidos de prazo, juntada de documentos, etc.

**Estrutura**:
- Endereçamento
- Epígrafe
- Qualificação breve + objeto da manifestação
- Corpo (exposição e pedido)
- Fecho, Data, Assinatura

**Prompt sugerido**:
```
Preciso de uma petição simples nos autos nº [NÚMERO] para [OBJETIVO].
Ex: juntada de documentos, pedido de prazo, informação ao juízo, etc.
```

---

## 9. Ofício / Requisição

**Quando usar**: Comunicação institucional a órgãos externos (secretarias, delegacias, presídios, etc.).

**Estrutura**:
- Cabeçalho institucional (sem endereçamento judicial)
- "OFÍCIO Nº [NÚMERO]/2026 – DPE/7ª Regional"
- Destinatário
- Corpo com a requisição/informação
- Fecho, Data, Assinatura

**Prompt sugerido**:
```
Preciso de um ofício da DPE para [DESTINATÁRIO]
requisitando [O QUE] sobre [ASSISTIDO/CASO].
```

---

## Dicas para o Usuário

Para agilizar a criação de qualquer peça, forneça ao Claude:

1. **Tipo da peça** — qual documento precisa
2. **Dados do assistido** — nome completo, qualificação, RG, CPF
3. **Número dos autos** — número do processo
4. **Vara e Comarca** — onde tramita
5. **Fatos relevantes** — resumo do caso
6. **Documentos disponíveis** — o que pode anexar como prova
7. **Teses de defesa** — qual a linha argumentativa

Quanto mais informação fornecer, melhor será a peça gerada.
