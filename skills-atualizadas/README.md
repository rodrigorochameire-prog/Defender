# Skills da Defensoria — Índice

## Estrutura

```
skills-atualizadas/
├── _shared/                  # Conteúdo compartilhado
│   ├── formatacao-dpe-ba.md  # Margens, fontes, cabeçalho, python-docx
│   ├── linguagem-estrategica.md  # Diretrizes linguísticas da defesa
│   ├── padrao-relatorio.md   # Design visual de relatórios
│   └── schema-base.md        # Schema JSON base para _analise_ia.json
├── juri/                     # Tribunal do Júri (12 refs)
├── vvd/                      # Violência Doméstica (13 refs)
├── execucao-penal/           # Execução Penal (5 refs)
├── criminal-comum/           # Criminal Comum (12 refs)
├── analise-audiencias/       # Análise de Audiências (7 refs)
├── citacao-depoimentos/      # Citação de Depoimentos
├── dpe-ba-pecas/             # Peças Processuais Genéricas
└── institucional/            # Documentos Institucionais
```

## Como funciona

1. **SKILL.md** define tipos de peça, fluxo de trabalho e payload JSON específico
2. **references/** contém os prompts completos (extraídos dos Gemini Gems)
3. **_shared/** contém formatação DPE-BA, linguagem estratégica, padrão de relatório e schema base
4. O Cowork Worker (`scripts/cowork_worker.py`) carrega SKILL.md + references para montar o prompt

## Paleta de Cores

| Atribuição | Cor-tema | Hex |
|---|---|---|
| Tribunal do Júri | Verde | `1A5C36` |
| VVD / Maria da Penha | Marrom | `92400E` |
| Execução Penal | Azul | `1E3A8A` |
| Criminal Comum | Vermelho | `991B1B` |
| APF / Plantão | Cinza | `374151` |
