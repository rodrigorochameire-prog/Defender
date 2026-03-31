# Padrão Tipológico de Relatório — Referência Compartilhada

> Relatórios analíticos (dossiês, análises, varreduras) são documentos **internos de trabalho**. **NÃO levam assinatura de Defensor.** A assinatura formal é exclusiva de peças processuais. Relatórios encerram com **Rodapé do Relatório**.

## Paleta de Cores por Atribuição

| Atribuição | Cor-tema (hex) | Fundo suave | Cor clara (sutil) |
|---|---|---|---|
| Tribunal do Júri | `1A5C36` | `EAF5EE` | `A8D5B5` |
| VVD / Maria da Penha | `92400E` | `FFFBEB` | `FCD34D` |
| Execução Penal | `1E3A8A` | `EEF4FF` | `93C5FD` |
| Criminal Comum | `991B1B` | `FFF0F0` | `FCA5A5` |
| APF / Plantão | `374151` | `F1F5F9` | `94A3B8` |

## Estrutura Visual Obrigatória

### 1. Banner principal
- Tabela 1 coluna, fundo na **cor-tema** da atribuição
- **Linha 1**: Verdana 13pt, bold, branco, centralizado — ex: `⚖  DOSSIÊ ESTRATÉGICO DE DEFESA`
- **Linha 2** (mesma célula): Verdana 9pt, **cor clara**, centralizado — fase processual · atribuição · DPE-BA

### 2. Tabela de identificação (4 colunas)
- Colunas: PROCESSO | FASE/AUDIÊNCIA | VARA / JUÍZO | GERADO EM
- Fundo **suave** da cor-tema; rótulos em 7pt cinza; valores em bold 8.5pt na cor-tema

### 3. Barra de progresso processual (quando aplicável)
- Fases sequenciais do processo com a fase atual destacada na cor-tema

### 4. Headings de seção
- Tabela 1 coluna, fundo **suave**, borda esquerda 32pt na **cor-tema**
- Verdana 10pt, bold, cor-tema, indent 240 twips, space_before/after 7pt

### 5. Subheadings
- Verdana 9.5pt, bold, cor-tema
- Borda top suave (cor clara) via XML pBdr
- space_before 12pt

### 6. Corpo de texto
- `add_para`: Verdana 9pt, cor `#2D3748`, alinhado à esquerda, space_after 5pt
- `add_bullet`: marcador `·  `, indent 320 twips / first-line -160 twips, Verdana 9pt
- `add_mixed`: mistura bold/regular no mesmo parágrafo (bold em cor-tema)
- `add_quote`: 8.5pt itálico, indentado, cor `#4A5C6A`

### 7. Cards de alerta (quando aplicável)
- Borda esquerda contextual:
  - Vermelho `7F1D1D` — risco crítico
  - Âmbar `92400E` — atenção
  - Verde `1A5C36` — ok

### 8. Separadores entre subseções
- Via borda inferior do parágrafo (XML `pBdr/bottom`) — **NÃO usar traços de texto**
- Cor: `D1D5DB` · sz: 4 · single

### 9. Rodapé do Relatório (obrigatório — substitui assinatura)
- Tabela 1 coluna, fundo **suave** da cor-tema, borda superior na **cor-tema**
- **Linha 1** (bold, 7.5pt, cor-tema): `[TIPO DO DOSSIÊ]  ·  [NÚMERO DO PROCESSO]  ·  [Nome do Assistido]`
- **Linha 2** (itálico, 7pt, cor suave): `Elaborado em [DATA]  ·  Documento de uso exclusivo interno  ·  Defensoria Pública do Estado da Bahia  ·  Não constitui peça processual`

## Hierarquia Tipológica Resumida

```
BANNER (cor-tema escura)
  → TABELA 4 COLUNAS (fundo suave)
    → BARRA DE PROGRESSO (fase atual em cor-tema)
      → HEADING (fundo suave + borda esquerda cor-tema)
        → subheading (bold 9.5pt cor-tema + borda top suave)
          → add_para · add_bullet · add_mixed · add_quote
          → build_alert_box (borda esquerda contextual)
      → SEPARADOR (borda inferior D1D5DB via pBdr)
RODAPÉ DO RELATÓRIO (fundo suave + borda top — SEM assinatura)
```
