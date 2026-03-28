# Extração de Delitos e Institutos Despenalizadores

Analise o texto processual abaixo e extraia:

## 1. Delitos
Para cada delito identificado, retorne:
- tipo: nome do delito (furto, roubo, tráfico, estelionato, lesão corporal, ameaça, receptação, dano, etc.)
- artigo: artigo completo com parágrafos e incisos (ex: "art. 155, §4º, II, CP")
- qualificado: true/false
- pena_minima_meses: pena mínima em meses (baseada no artigo)
- pena_maxima_meses: pena máxima em meses (baseada no artigo)
- envolveu_violencia: true/false (se o tipo penal envolve violência ou grave ameaça à pessoa)

## 2. Instituto Despenalizador Possível
Baseado nos delitos detectados, determine se cabe:
- ANPP: se pena mínima < 4 anos E sem violência/grave ameaça (art. 28-A CPP)
- SURSIS_PROCESSUAL: se pena mínima <= 1 ano (art. 89 Lei 9.099)
- TRANSACAO_PENAL: se pena máxima <= 2 anos (art. 76 Lei 9.099)
- Retorne null se nenhum instituto é cabível

## 3. Concurso de Crimes
Se houver múltiplos delitos, identifique:
- material: crimes independentes, penas somadas
- formal: uma ação, múltiplos resultados
- continuidade_delitiva: mesmas condições de tempo/lugar/modo

Retorne JSON no formato:
```json
{
  "delitos_detectados": [
    {
      "tipo": "string",
      "artigo": "string",
      "qualificado": boolean,
      "pena_minima_meses": number,
      "pena_maxima_meses": number,
      "envolveu_violencia": boolean
    }
  ],
  "instituto_possivel": "ANPP" | "SURSIS_PROCESSUAL" | "TRANSACAO_PENAL" | null,
  "motivo_instituto": "string explicando por que cabe ou não",
  "concurso_crimes": "material" | "formal" | "continuidade_delitiva" | null
}
```

Texto processual:
{texto}
