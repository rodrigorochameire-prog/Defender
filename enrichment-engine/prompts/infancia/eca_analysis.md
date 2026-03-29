# Extração de Atos Infracionais e Medidas Socioeducativas (ECA)

Analise o texto processual abaixo, identificando que se trata de procedimento de apuração de ato infracional (Estatuto da Criança e do Adolescente - Lei 8.069/1990).

## 1. Ato Infracional
Para cada ato infracional identificado, retorne:
- ato_equiparado: conduta equivalente ao crime (furto, roubo, tráfico, lesão corporal, etc.)
- artigo_equiparado: artigo do Código Penal ou lei especial (ex: "art. 155 CP", "art. 33 Lei 11.343")
- envolveu_violencia: true/false
- envolveu_grave_ameaca: true/false
- idade_na_data: idade do adolescente no momento do ato (se mencionada)

## 2. Remissão (art. 126-128 ECA)
Se houver menção a remissão, identifique:
- tipo: "CONCEDIDA_MP" (pré-processual, art. 126) ou "CONCEDIDA_JUIZ" (processual, art. 148 §único) ou "NEGADA"
- condicoes: condições eventualmente impostas junto com a remissão

## 3. Medida Socioeducativa (art. 112 ECA)
Se houver menção a medida aplicada ou requerida:
- tipo: ADVERTENCIA, REPARACAO_DANO, PSC, LIBERDADE_ASSISTIDA, SEMILIBERDADE, INTERNACAO, INTERNACAO_PROVISORIA
- prazo_meses: duração da medida (se mencionada)
- unidade: nome da unidade de execução (CASE, CASEF, etc.)
- reavaliacao: se há menção a data de reavaliação

## 4. Medida Protetiva (art. 101 ECA)
Se houver menção a medida protetiva aplicada ao adolescente:
- tipo: acolhimento institucional, inclusão em programa comunitário, requisição de tratamento, matrícula escolar, etc.

Retorne JSON no formato:
```json
{
  "atos_infracionais": [
    {
      "ato_equiparado": "string",
      "artigo_equiparado": "string",
      "envolveu_violencia": boolean,
      "envolveu_grave_ameaca": boolean,
      "idade_na_data": number | null
    }
  ],
  "remissao": {
    "tipo": "CONCEDIDA_MP" | "CONCEDIDA_JUIZ" | "NEGADA" | null,
    "condicoes": ["string"] | null
  },
  "medida_socioeducativa": {
    "tipo": "string" | null,
    "prazo_meses": number | null,
    "unidade": "string" | null
  },
  "medida_protetiva": {
    "tipo": "string" | null
  }
}
```

Texto processual:
{texto}
