# Schema canônico — `audiencias.registro_audiencia` (JSONB)

A coluna `registro_audiencia` armazena o estado estruturado da preparação. Uma vez populada, alimenta tanto a UI do OMBUDS quanto o relatório consolidado.

## Schema (JSON)

```json
{
  "schema_version": "2.0",
  "subtipo_audiencia": "justificacao|aij|oitiva_especial|custodia|preliminar|una|conciliacao|aij_primeira_fase|plenario|qualificacao|precatoria",

  "depoentes": [
    {
      "nome": "string",
      "tipo": "ofendida|testemunha_acusacao|testemunha_defesa|informante|interrogando|vitima_indireta|perito|assistente_tecnico",
      "intimacao": "intimado|nao_intimado|pendente|dispensada|desconhecido",
      "motivo_nao_intimacao": "nao_localizado|mandado_nao_cumprido|endereco_invalido|em_diligencia|recusa_recebimento|precatoria_devolvida|precatoria_pendente|mandado_nao_emitido|falta_de_informacoes|null",
      "comparecimento": "compareceu|nao_compareceu|nao_verificado|dispensada|ouvido_anteriormente|substituida|contraditada",
      "ja_ouvido": {
        "sim": true,
        "data": "YYYY-MM-DD",
        "peca": "AIJ-1|precatoria|sumario|...",
        "id_pje": "string",
        "fl": 0,
        "resumo_breve": "string (2-3 linhas)",
        "necessidade_reinquirir": false
      },
      "forma": "presencial|videoconferencia|precatoria|escuta_especial|domiciliar",
      "observacao": "string (livre)",
      "termo_delegacia": {
        "drive_file_id": "string",
        "pagina_inicio": "number"
      },
      "pinos_sugeridos": [
        {
          "timestamp_s": "number",
          "nota": "string",
          "categoria": "string"
        }
      ]
    }
  ],

  "imputacao": {
    "principal": "art. X do CP c/c Lei Y/Z",
    "subsidiaria": "...",
    "qualificadoras": ["...", "..."],
    "agravantes": ["...", "..."],
    "atenuantes": ["...", "..."]
  },

  "tese_defesa": {
    "principal": "string (frase forte, única)",
    "subsidiaria": "string"
  },

  "pontos_criticos": [
    "string (3-7 itens)"
  ],

  "perguntas_estrategicas": {
    "ofendida": ["...", "..."],
    "testemunhas_acusacao": ["...", "..."],
    "testemunhas_defesa": ["...", "..."],
    "policiais": ["...", "..."],
    "interrogando": ["...", "..."]
  },

  "orientacao_assistido": "string (2-3 linhas — postura, ênfases, riscos)",

  "documentos_relevantes": [
    {
      "id_pje": "string",
      "fl": 0,
      "data": "YYYY-MM-DD",
      "tipo": "Despacho|Manifestação|Mandado|Decisão|Petição|Certidão",
      "descricao": "string"
    }
  ],

  "pendencias": [
    "string (lacunas que ainda precisam ser preenchidas)"
  ],

  "metadata": {
    "gerado_em": "ISO8601",
    "gerado_por": "skill:preparar-audiencias",
    "versao_skill": "1.0",
    "fonte_dados": "ombuds+pje+drive"
  }
}
```

## Campos `depoentes[]` — Documentação detalhada

### `termo_delegacia` (object|null)
- **Tipo**: `{drive_file_id: string, pagina_inicio: int}` ou null
- **Descrição**: Drive file ID do IP/APF e página onde o termo do depoente começa. Populado por `05d_vincular_termos_ip.py`.
- **Uso**: Habilita o botão "ver termo (IP)" no sheet do OMBUDS. Um clique navega para o PDF no Drive + PDF reader abre na página inicial do depoimento.
- **Exemplo**: `{"drive_file_id": "1abc2def3ghi4jkl5mno6pqr", "pagina_inicio": 42}`

### `pinos_sugeridos` (array)
- **Tipo**: array of `{timestamp_s: number, nota: string, categoria: string}`
- **Descrição**: Pinos sugeridos pela IA (stub — populado quando spec D3 for implementado). O loader (`vincular_testemunhas.mjs`) converte para o formato `Pino` do DB injetando `id` (UUID) e `fonte: "IA"`.
- **Uso**: Marca instantes críticos do vídeo de depoimento (refutação, pergunta estratégica acertada, etc.) para análise posterior.
- **Exemplo**: `[{"timestamp_s": 1234, "nota": "Refutação do álibi", "categoria": "defesa"}]`

## Migração de dados existentes

Na primeira execução para um processo já cadastrado:

1. **Se** `registro_audiencia` é nulo → criar do zero a partir da análise + autos.
2. **Se** `registro_audiencia` existe mas com `schema_version < 2.0` → migrar (preservar campos existentes, completar lacunas).
3. **Se** `resumo_defesa` (TEXT) existe mas `registro_audiencia` é nulo → preservar `resumo_defesa` como narrativa, e gerar o JSON estruturado independentemente.

## Validações obrigatórias antes de salvar

```python
def validar_registro(r: dict) -> list[str]:
    erros = []
    if not r.get("depoentes"):
        # Permitido apenas em custódia/qualificação
        if r.get("subtipo_audiencia") not in ("custodia", "qualificacao"):
            erros.append("depoentes ausente — obrigatório fora de custódia/qualificação")
    for d in r.get("depoentes", []):
        if d.get("intimacao") == "nao_intimado" and not d.get("motivo_nao_intimacao"):
            erros.append(f"depoente '{d.get('nome')}' nao_intimado sem motivo")
        if d.get("ja_ouvido", {}).get("sim") and not d["ja_ouvido"].get("data"):
            erros.append(f"depoente '{d.get('nome')}' ja_ouvido sem data")
    if not r.get("tese_defesa", {}).get("principal"):
        erros.append("tese_defesa.principal vazia")
    return erros
```

## Mapeamento `registro_audiencia` ↔ relatório consolidado

| Campo JSON | Onde aparece no PDF |
|---|---|
| `depoentes[]` | Painel de Depoentes (§4.3) |
| `imputacao.principal` | Cabeçalho · linha "Imputação" |
| `tese_defesa.principal` | §4.5 (itálico) |
| `pontos_criticos` | §4.6 (bullets) |
| `perguntas_estrategicas` | §4.7 (organizado por destinatário) |
| `orientacao_assistido` | §4.8 |
| `documentos_relevantes` | §4.9 |
| `pendencias` | §5 (consolidado do dia) |

## Retrocompatibilidade

`audiencias.resumo_defesa` (coluna TEXT) continua sendo o "resumo narrativo" — texto corrido, 2-4 parágrafos. Este campo é alimentado em paralelo ao JSON estruturado, e é o que aparece em telas legadas que ainda não consomem o JSON.

Regra: o JSON é a fonte de verdade; o TEXT é uma view derivada. Quando o JSON for atualizado, o TEXT é regerado a partir dele (concatenação: imputação → tese → pontos críticos), preservando o resumo de defesa redigido manualmente quando houver.

## Loaders

| Script | Target | Writes |
|--------|--------|--------|
| `scripts/pje-cdp/popular_ombuds.mjs` | `audiencias.registro_audiencia` | Full registro JSONB blob |
| `scripts/pje-cdp/vincular_testemunhas.mjs` | `testemunhas` rows (matched by `audiencia_id + nome`) | `termo_delegacia_drive_file_id`, `termo_delegacia_pagina`, `depoimento_timestamp_inicio_s`, `depoimento_timestamp_fim_s`, `pinos` (JSONB append with dedup) |
