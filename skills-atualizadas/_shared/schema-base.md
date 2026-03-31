# Schema `_analise_ia.json` — Base Compartilhada

> **OBRIGATÓRIO**: Ao final de TODA peça ou análise gerada por qualquer skill, ALÉM do documento principal (.docx ou .md), salve também um arquivo `_analise_ia.json` na **pasta raiz do assistido no Google Drive**.

## Localização do Arquivo

O JSON deve ser salvo na pasta do assistido — a mesma pasta onde o documento principal é salvo. Ex:

`/Meu Drive/1 - Defensoria 9ª DP/Assistidos/João da Silva/_analise_ia.json`

Se já existir um `_analise_ia.json` anterior, **substitua-o** (sobrescreva).

## Campos Comuns (obrigatórios em todas as skills)

```json
{
  "schema_version": "1.0",
  "tipo": "<skill_tipo_peca — ver valores no SKILL.md de cada skill>",
  "gerado_em": "<ISO 8601 com fuso de Brasília — ex: 2026-03-22T14:30:00-03:00>",
  "assistido": "<nome completo do assistido>",
  "processo": "<número do processo no formato CNJ>",
  "resumo_fato": "<2-3 frases resumindo o fato apurado>",
  "tese_defesa": "<tese principal de defesa>",
  "estrategia_atual": "<estratégia adotada ou recomendada>",
  "crime_principal": "<tipo penal imputado>",
  "pontos_criticos": ["<ponto crítico 1>", "<ponto crítico 2>"],
  "payload": { "...campos específicos de cada skill..." }
}
```

## Regras de Preenchimento

- `tipo`: usar o valor que melhor corresponde à peça/análise gerada (ver lista no SKILL.md de cada skill)
- Campos sem informação disponível: usar `null` (não omitir o campo)
- Arrays sem itens: usar `[]` (não omitir)
- `gerado_em`: data/hora atual em ISO 8601 com fuso de Brasília (-03:00)
- O JSON deve ser válido e bem formatado (indentado com 2 espaços)

## Payloads por Skill

Cada skill define campos extras no `payload`. Consulte o SKILL.md correspondente:

| Skill | Campos específicos do payload |
|---|---|
| **juri** | `fase_processual`, `qualificadoras_imputadas`, `tese_plenario`, `perguntas_por_testemunha`, `contradicoes`, `perfil_jurados` |
| **vvd** | `tipo_violencia`, `mpu_vigente`, `mpu_desvio_finalidade`, `relacao_partes` |
| **execucao-penal** | `regime_atual`, `pena_total/restante`, `prescricao_executoria`, `intimacao`, `endereco_atualizado`, `urgencia` |
| **criminal-comum** | `nulidades_arguidas`, `status_prisional`, `urgencia` |
| **analise-audiencias** | `perguntas_por_testemunha`, `contradicoes`, `nulidades_identificadas`, `provas_a_requerer` |

## Confirmação Obrigatória

Após salvar o JSON, exiba a mensagem:
```
✅ _analise_ia.json salvo na pasta do assistido — pronto para importar no OMBUDS via botão "Importar do Cowork"
```
