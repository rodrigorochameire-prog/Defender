# Schema `_analise_ia.json` — Base Compartilhada (v2.0)

> **OBRIGATÓRIO**: Ao final de TODA peça ou análise gerada por qualquer skill, ALÉM do documento principal (.docx ou .md), salve também um arquivo `_analise_ia.json` na **pasta raiz do assistido no Google Drive**.

## Localização do Arquivo

O JSON deve ser salvo na pasta do assistido — a mesma pasta onde o documento principal é salvo. Ex:

`/Meu Drive/1 - Defensoria 9ª DP/Assistidos/João da Silva/_analise_ia.json`

Se já existir um `_analise_ia.json` anterior, **substitua-o** (sobrescreva).

## Schema v2.0 — Estrutura Rica e Aninhada

O schema v2.0 usa objetos aninhados em vez de campos flat. Cada skill define seu schema completo no respectivo SKILL.md. A estrutura base comum a todas as skills:

```json
{
  "schema_version": "2.0",
  "tipo": "<skill_tipo — ver SKILL.md de cada skill>",
  "gerado_em": "<ISO 8601 com fuso de Brasília — ex: 2026-03-22T14:30:00-03:00>",
  "gerado_por": "skill-<nome> (assistente IA) sob supervisão de <defensor> — DPE-BA",

  "assistido": {
    "nome": "<NOME COMPLETO>",
    "cpf": "<CPF>",
    "nascimento": "<YYYY-MM-DD>",
    "idade_atual": 0,
    "situacao_processual": "solto|preso"
  },

  "processo": {
    "numero": "<número CNJ>",
    "juizo": "<vara + comarca>",
    "data_fato": "<YYYY-MM-DD>",
    "tipos_imputados": [
      { "artigo": "<art. X>", "descricao": "<nome do crime>" }
    ]
  },

  "teses_defesa": [
    {
      "ordem": 1,
      "tese": "<nome>",
      "viabilidade": "alta|média-alta|média|baixa",
      "fundamento_legal": ["<art. X>"]
    }
  ],

  "pedido_principal": "<pedido>",
  "pedidos_subsidiarios": ["<pedido 1>"],
  "arquivos_gerados": ["<caminho 1>"]
}
```

Cada skill estende esta base com campos específicos (ofendida, testemunhas, provas, etc.). Consulte o SKILL.md de cada skill para o schema completo.

## Regras de Preenchimento

- Campos sem informação disponível: usar `null` (não omitir o campo)
- Arrays sem itens: usar `[]` (não omitir)
- `gerado_em`: data/hora atual em ISO 8601 com fuso de Brasília (-03:00)
- O JSON deve ser válido e bem formatado (indentado com 2 espaços)
- O campo `prescricao` dentro de `processo` aceita chaves dinâmicas por artigo (ex: `"art_129_9"`, `"art_147"`)

## Confirmação Obrigatória

Após salvar o JSON, exiba a mensagem:
```
✅ _analise_ia.json salvo na pasta do assistido — pronto para importar no OMBUDS via botão "Importar do Cowork"
```
