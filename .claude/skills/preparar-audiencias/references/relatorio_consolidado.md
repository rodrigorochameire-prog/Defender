# Relatório consolidado do dia — formato canônico

Documento ÚNICO em PDF (e .docx editável), com **todas** as audiências do dia. Salvo em:

```
/Meu Drive/1 - Defensoria 9ª DP/5 - Operacional/Atendimentos/Pauta de Audiências - <DD mês YYYY>.{pdf,docx}
```

## Identidade visual

- **Timbre DPE-BA** no header (logo com 60% opacidade).
- **Rodapé**: "Defensoria Pública do Estado da Bahia / 7ª Regional da DPE – Camaçari – Bahia."
- **Fonte**: Garamond 12pt no corpo, Arial Narrow 8pt no rodapé.
- **Paleta**: cor primária varia pela atribuição predominante do dia
  - VVD: âmbar (#A16207)
  - Júri: emerald (#047857)
  - Misto: âmbar (default) com chamadas em emerald para Júri

## Estrutura

### 1. Capa / Título

```
PAUTA DE AUDIÊNCIAS — <DD DE MÊS DE YYYY>
<vara > · <comarca > · <fórum>
Defensoria Pública · Defensor <nome> · 7ª Regional
```

### 2. KPIs

Tabela 1×N com indicadores macro:
- Total de audiências
- Agendadas
- Concluídas
- Canceladas
- Com painel de depoentes preenchido (`X/N`)
- Com resumo de defesa (`X/N`)
- Com análise individual gerada (`X/N`)

### 3. Sinóptico (tabela)

```
| Hora | Tipo | Assistido | Autos | Status | Painel |
```

`Painel` = ✓ se tem painel de depoentes preenchido; ⚠ se pendente.

### 4. Detalhamento por audiência

Para **cada** audiência:

#### 4.1 Cabeçalho
```
#<n> · <hora> · <tipo subtipo> — <nome do assistido>
Status: AGENDADA | CONCLUÍDA | CANCELADA
```

#### 4.2 Dados estruturais
```
Autos: <numero>
Classe: <classe>
Vara/Comarca: <vara> · <comarca>
Local: <fórum> · Sala <X>
Assistido: <nome> · <status prisional>
Imputação: <crime principal>
```

#### 4.3 PAINEL DE DEPOENTES (obrigatório — não suprimir nunca)

Tabela canônica:

```
| # | Nome | Tipo | Intimação | Motivo (se NI) | Comparecimento | Já ouvido | Forma | Observação |
```

Quando há 0 depoentes (custódia, qualificação): substituir por linha explícita "Não se aplica — <razão>".

Detalhes em `status_depoentes.md`. **Nunca** apresentar resumo de defesa sem o painel.

#### 4.4 Resumo de defesa

Texto corrido em 2-4 parágrafos. Em MPU, abrir com "Segundo a representação..."; em AP, "Segundo a denúncia...".

#### 4.5 Tese principal

Frase única, em itálico, destacando a tese viável principal.

#### 4.6 Pontos críticos (3-7 bullets)

```
- <ponto 1>
- <ponto 2>
- ...
```

Foco em: contradições, lacunas probatórias, nulidades, prescrição, FNAR incompleto, contemporaneidade, atipicidade.

#### 4.7 Perguntas estratégicas (até 6 por depoente principal)

```
Para a ofendida:
1. ...
2. ...

Para policiais (se aplicável):
1. ...
```

#### 4.8 Orientação ao defendido

2-3 linhas com a postura recomendada para o interrogatório / oitiva.

#### 4.9 Documentos relevantes (links/IDs PJe)

```
- Despacho 23/03/2026 — ID 549898993, Pág. 1
- Manifestação sobre fato novo — ID 550115463, Pág. 1
- Mandado de intimação não cumprido — ID 549535665, Pág. 1
```

### 5. Pendências do dia

Lista clara de itens pendentes, agrupados por audiência:
- Análise individual não gerada → `[Fernando, Diego, Samuel]`
- Painel de depoentes não preenchido → `[#530]`
- Mandados não localizados nos autos → `[#283 - testemunhas X, Y]`
- Documentos chave ausentes → `[#286 - ata da AIJ-1]`

### 6. Pé do relatório

```
Pauta gerada automaticamente em <data hora> a partir do OMBUDS + PJe.
<n> audiências · <m> com análise · <k> pendências.
```

## Anti-padrões (NÃO fazer)

- Apresentar resumo de defesa **sem** o painel de depoentes — sempre os dois juntos.
- Resumir "intimações: ok" sem listar nominalmente cada depoente.
- Suprimir o painel "para encurtar" — o painel é a essência da preparação.
- Misturar Júri e VVD na mesma seção sem separação clara — usar separadores visuais.
- Usar "denúncia" em MPU ou "representação" em AP — manter cada vocabulário no seu rito.
- Citar jurisprudência sem verificação (regra `citacoes-seguras`).

## Geração técnica

```python
# Pipeline:
# 1. Dump JSON da pauta (scripts/01_buscar_pauta.ts)
# 2. Para cada audiência, garantir painel de depoentes em registro_audiencia (scripts/07_popular_ombuds.ts)
# 3. Gerar relatório (scripts/08_gerar_relatorio_consolidado.py)
#    - python-docx para .docx
#    - LibreOffice headless para conversão .docx → .pdf
```

Helper já existente para conversão:

```bash
/Applications/LibreOffice.app/Contents/MacOS/soffice --headless \
  --convert-to pdf --outdir <out_dir> <docx_path>
```

Atenção: o caminho de saída do soffice às vezes resolve para `~/Meu Drive/...` em vez de `~/Library/CloudStorage/.../Meu Drive/...`. Verificar pós-conversão e mover se preciso.
