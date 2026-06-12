---
name: estudo-dpe
description: >
  Skill para salvar automaticamente materiais de estudo para o concurso da Defensoria Pública
  da Bahia (DPE-BA) na pasta /Users/rodrigorochameire/Meu Drive/Pessoal/Preparacao Gabriela DPBA.
  Use SEMPRE que o usuário pedir para: 'salvar na pasta de estudos', 'colocar na preparação',
  'salvar para o concurso DPE', 'guardar na pasta da Gabriela', 'salvar material de estudo DPE',
  'colocar no Drive de estudos', 'salvar resumo para o concurso', 'arquivar material de estudo',
  ou qualquer variação de salvar/copiar/arquivar um material de estudo voltado para o concurso da DPE-BA.
  Também acionar automaticamente ao final de qualquer sessão que produza material de estudo
  (resumos, guias, flashcards, mapas mentais, questões, tabelas comparativas) quando o usuário
  indicar que quer guardar ou salvar.
---

# Skill: Salvar Materiais de Estudo DPE

## O que esta skill faz

Salva materiais de estudo para o concurso da DPE-BA em:
1. Converte o arquivo para PDF (se for HTML ou DOCX) usando Playwright/Chromium ou LibreOffice
2. Copia o PDF para a pasta de estudos da Gabriela no Google Drive
3. Confirma com link direto para o arquivo salvo

## Pasta de destino

```
/Users/rodrigorochameire/Meu Drive/Pessoal/Preparacao Gabriela DPBA
```

No ambiente da VM, este caminho aparece como:
```
/sessions/<session-id>/mnt/Preparacao Gabriela DPBA
```

**Importante:** Se a pasta não estiver acessível, usar `request_cowork_directory` com o path
`/Users/rodrigorochameire/Meu Drive/Pessoal/Preparacao Gabriela DPBA` para solicitar acesso.

## Convenção de nomenclatura

```
Tema_Subtema_DPE.pdf
```

### Regras:
- Usar underscores no lugar de espaços
- Sem acentos ou caracteres especiais
- Sufixo `_DPE` para identificar materiais do concurso
- Exemplos:
  - `Funcionalismo_Penal_DPE.pdf`
  - `Teoria_do_Crime_DPE.pdf`
  - `Criminologia_Critica_DPE.pdf`
  - `Direito_Processual_Penal_DPE.pdf`
  - `Garantismo_Ferrajoli_DPE.pdf`

## Como executar

### Passo 1: Identificar o arquivo de origem

O arquivo pode ser:
- `.html` — gerado na sessão atual (em `/sessions/.../mnt/outputs/`)
- `.docx` — documento Word
- `.pdf` — já em PDF (só copiar)

Se não estiver claro, verificar o arquivo mais recente em `/sessions/.../mnt/outputs/`.

### Passo 2: Verificar acesso à pasta de destino

```python
import os
# Buscar a pasta montada
session_id = os.path.basename(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
pasta = f"/sessions/{session_id}/mnt/Preparacao Gabriela DPBA"
# Se não existir, usar request_cowork_directory
```

Usar o script helper que detecta automaticamente:

```bash
python3 /sessions/<session-id>/mnt/.skills/skills/estudo-dpe/scripts/salvar_estudo.py \
  --origem "/caminho/do/arquivo.html" \
  --nome "Funcionalismo_Penal_DPE"
```

### Passo 3: Converter e copiar

O script cuida de:
- Detectar o formato do arquivo de origem
- Converter HTML→PDF via Playwright ou DOCX→PDF via LibreOffice
- Normalizar o nome do arquivo
- Copiar para a pasta de destino
- Retornar o caminho final

### Passo 4: Confirmar ao usuário

Informar com link `computer://` para o arquivo salvo na pasta de estudos.

Exemplo de mensagem:
```
✅ Material salvo na pasta de estudos!
📁 [Funcionalismo_Penal_DPE.pdf](computer:///Users/rodrigorochameire/Meu Drive/Pessoal/Preparacao Gabriela DPBA/Funcionalismo_Penal_DPE.pdf)
```

## Conversão de formatos

### HTML → PDF (preferencial — preserva visual completo)
```python
import asyncio
from playwright.async_api import async_playwright

async def html_to_pdf(html_path, pdf_path):
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto(f"file://{html_path}", wait_until="networkidle")
        await page.pdf(
            path=pdf_path,
            format="A4",
            print_background=True,
            margin={"top": "15mm", "bottom": "15mm", "left": "10mm", "right": "10mm"}
        )
        await browser.close()
```

### DOCX → PDF (via LibreOffice)
```bash
libreoffice --headless --convert-to pdf --outdir /pasta/destino arquivo.docx
```

### PDF → PDF (apenas copiar)
```python
import shutil
shutil.copy2(origem, destino)
```

## Notas importantes

- Se o Playwright não estiver instalado: `pip install playwright --break-system-packages && python3 -m playwright install chromium`
- Se o LibreOffice não estiver disponível para DOCX, usar python-docx + reportlab como fallback
- Sempre verificar se a pasta de destino existe antes de copiar — se não estiver montada, solicitar via `request_cowork_directory`
- O arquivo original em `/outputs/` não é apagado — a skill apenas copia para o Drive
