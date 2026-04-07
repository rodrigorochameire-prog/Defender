# Formatação Institucional DPE-BA — Referência Compartilhada

## Formatação Institucional Obrigatória (PADRÃO DPE-BA)

### Página e Margens
- Tamanho: A4 (11906 x 16838 twips)
- Margem superior: 2552 twips (~4.5cm)
- Margem inferior: 1134 twips (2cm)
- Margem esquerda: 1418 twips (2.5cm)
- Margem direita: 1134 twips (2cm)
- Header distance: 567 twips / Footer distance: 567 twips

### Fonte e Corpo do Texto
- **Corpo**: Garamond, 12pt, justificado, recuo 1ª linha 720 twips, espaçamento 1.5, espaço após 10pt
- **Rodapé**: Arial Narrow, 8pt
- **Títulos de seção**: justificado, negrito, sem recuo, linha em branco real antes, espaço após 6pt

### Endereçamento e Epígrafe
- Endereçamento: justificado, negrito, sem recuo, espaço após 0pt + 2 linhas em branco
- Epígrafe: justificado, negrito, sem recuo, espaço após 20pt + 2 linhas em branco

### Qualificação + Nome da Peça
- No mesmo parágrafo (inline), com recuo de 1ª linha
- Nome do assistido em negrito, nome da peça em negrito

### Fecho e Assinatura — **EXCLUSIVO para peças processuais formais**
- "Nesses termos, pede deferimento." — parágrafo normal com recuo
- Data: justificado com recuo (NÃO centralizado), formato "DD de mês de YYYY"
- Assinatura: centralizado, negrito, "Rodrigo Rocha Meire" / "Defensor Público"

> ⚠️ Relatórios analíticos (dossiês, análises, varreduras) NÃO levam assinatura. São documentos internos de trabalho. Encerram com **Rodapé do Relatório**.

### Cabeçalho e Rodapé
- Header: logo `assets/dpe_logo.png` centralizada, 1.777 x 1.101 inches, opacidade 60%
- Footer: borda superior 4pt, centralizado, Arial Narrow 8pt, "Defensoria Pública do Estado da Bahia" / "7ª Regional da DPE – Camaçari – Bahia."

## Como Gerar o Documento

Usar **python-docx** (Python). O script base está em `scripts/gerar_docx.py`.

Instalar: `pip install python-docx Pillow numpy --break-system-packages`

### Pré-processamento da Logo (opacidade 60%)

```python
from PIL import Image
import numpy as np
img = Image.open("assets/dpe_logo.png").convert("RGBA")
arr = np.array(img, dtype=np.float64)
opacity = 0.60
white = np.full_like(arr[:,:,:3], 255.0)
arr[:,:,:3] = arr[:,:,:3] * opacity + white * (1 - opacity)
arr[:,:,3] = 255
result = Image.fromarray(arr.astype(np.uint8)).convert("RGB")
result.save("dpe_logo_faded.png")
```

## Importante
- Sempre usar **python-docx** (não a biblioteca npm)
- Data gerada automaticamente em português (ex: "10 de março de 2026")
- **Peças processuais**: `[Tipo da Peça] - [Nome do Assistido].docx`
- **Análises**: `[Tipo de Análise] - [Nome do Assistido] - [Data].md` (ou .docx se solicitado)
- Salvar na pasta do usuário
