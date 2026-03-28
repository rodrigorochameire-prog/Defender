# /alinhar-skills-cowork - Alinhar Skills ao Schema _analise_ia.json

> **Tipo**: Checklist para Cowork
> **Trigger**: "alinhar skills", "formato json", "schema analise"

## Objetivo

Garantir que TODAS as skills que geram análises salvem `_analise_ia.json` no formato que o enrichment engine do OMBUDS entende. Quando alinhadas, o resultado aparece automaticamente na interface do OMBUDS.

## Schema Padrão `_analise_ia.json`

```json
{
  "_metadata": {
    "schema_version": "1.0",
    "tipo": "juri|vvd|ep|criminal|institucional",
    "gerado_em": "2026-03-28T10:30:00.000Z",
    "assistido": "Nome Completo",
    "processo": "8013165-06.2024.8.05.0039",
    "model": "claude-sonnet-4-6",
    "source": "skill_name"
  },
  "pessoas": [
    { "nome": "Nome", "tipo": "REU|TESTEMUNHA|VITIMA|FAMILIAR|PERITO", "papel": "descrição", "preso": true|false|null }
  ],
  "cronologia": [
    { "data": "2026-03-28", "evento": "descrição", "fonte": "documento de referência" }
  ],
  "acusacoes": [
    { "crime": "Homicídio Qualificado", "artigos": ["121 §2º CP"], "qualificadoras": ["motivo torpe"], "vitima": "Nome" }
  ],
  "depoimentos": [
    {
      "nome": "Nome da testemunha",
      "tipo": "testemunha|familiar|perito|vitima",
      "resumo": "resumo do depoimento",
      "favoravel_defesa": true|false|null,
      "contradicoes": ["contradição 1", "contradição 2"],
      "perguntas_sugeridas": ["pergunta 1", "pergunta 2"]
    }
  ],
  "laudos": {
    "presentes": ["Laudo necroscópico", "Laudo pericial"],
    "ausentes": ["Laudo toxicológico"],
    "problemas": ["Laudo sem assinatura do perito"]
  },
  "nulidades": [
    { "tipo": "processual|prova_ilicita", "descricao": "descrição", "severidade": "alta|media|baixa", "fundamentacao": "art. X do CPP" }
  ],
  "teses": {
    "principal": "Tese principal da defesa",
    "subsidiarias": ["Tese subsidiária 1", "Tese subsidiária 2"]
  },
  "matriz_guerra": [
    { "ponto": "descrição", "tipo": "forte|fraco", "categoria": "prova|testemunha|pericia|procedimento" }
  ],
  "radar_liberdade": {
    "status": "PRESO|SOLTO|MONITORADO",
    "detalhes": "descrição da situação",
    "urgencia": "ALTA|MEDIA|BAIXA"
  },
  "saneamento": {
    "pendencias": ["Ciência de decisão", "Resposta à acusação — prazo 15/04"],
    "status": "PENDENTE|EM_DIA|CRITICO"
  },
  "resumo_fatos": "Resumo de 3-5 frases dos fatos do caso",
  "inconsistencias": ["inconsistência 1", "inconsistência 2"],
  "achados_chave": ["achado 1", "achado 2"],
  "recomendacoes": ["recomendação 1", "recomendação 2"],
  "resumo": "Resumo geral (pode ser igual ao resumo_fatos)",
  "osint": {}
}
```

## Onde salvar

```
Google Drive/
├── 1 - Defensoria 9ª DP/
│   └── Processos - {Área}/
│       └── {Nome Assistido}/
│           └── {TIPO} {Número}/
│               ├── _analise_ia.json  ← AQUI
│               ├── Relatório - {Assistido}.pdf
│               └── Relatório - {Assistido}.md
```

## Checklist por Skill

### Skills que DEVEM gerar _analise_ia.json:

- [ ] **analise-audiencias** — já gera (verificar se segue schema acima)
- [ ] **juri** — adicionar geração de json com campos de júri (quesitos, perspectiva plenária)
- [ ] **vvd** — adicionar geração de json com campos de VVD (medidas protetivas, risco)
- [ ] **execucao-penal** — adicionar geração de json com campos de EP (regime, progressão)
- [ ] **criminal-comum** — adicionar geração de json

### Skills que NÃO precisam de json (só docx/pdf):

- dpe-ba-pecas (skill-mãe de formatação)
- criminal-comum (quando gera peça, não análise)
- institucional (ofícios, declarações)
- protocolar, numeracao-oficios, docx-to-pdf (utilitários)
- docx, pdf, xlsx, pptx (processamento de documentos)

## Campos por Tipo de Atribuição

### Júri (tipo: "juri")
Todos os campos + campos extras:
- `teses.principal` e `teses.subsidiarias` (obrigatório)
- `matriz_guerra` (obrigatório)
- `depoimentos[].perguntas_sugeridas` (obrigatório)
- `depoimentos[].contradicoes` (obrigatório)

### VVD (tipo: "vvd")
Campos base + campos extras:
- `medidas_protetivas`: lista de medidas vigentes
- `risco_reincidencia`: alto/medio/baixo
- `historico_agressoes`: timeline de agressões

### EP (tipo: "ep")
Campos base + campos extras:
- `regime_atual`: fechado/semiaberto/aberto
- `data_progressao`: data prevista para progressão
- `calculos_pena`: objeto com cálculos

### Criminal Comum (tipo: "criminal")
Campos base (sem extras)

## Como o OMBUDS processa

1. Drive Sync detecta `_analise_ia.json` novo
2. Inngest dispara `cowork/import-analysis`
3. Enrichment normaliza (aceita variações)
4. Salva em: `analises_cowork` + `processos.analysis_data` + `assistidos.analysis_data`
5. Atualiza: `testemunhas.perguntas_sugeridas` + `depoimentos_analise` (contradições)
6. OMBUDS exibe no AnalysisPanel (aba Inteligência do processo)

## Validação

Após gerar o json, verificar:
1. `_metadata.schema_version` = "1.0"
2. `_metadata.tipo` está preenchido
3. `_metadata.assistido` e `_metadata.processo` estão corretos
4. `resumo_fatos` não está vazio
5. `pessoas` tem pelo menos o réu
6. Arquivo salvo na pasta correta do Drive
