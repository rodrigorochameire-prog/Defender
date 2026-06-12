---
name: numeracao-oficios
description: "Verificador automático de numeração de ofícios da DPE-BA. Use esta skill SEMPRE que for criar um novo ofício, para encontrar o próximo número disponível. Também acione quando o usuário perguntar 'qual o próximo número de ofício?', 'que número usar no ofício?', 'verificar numeração', ou quando qualquer skill for gerar um ofício institucional. Varre a pasta do usuário e retorna o número correto a usar, evitando duplicatas."
---

# Verificador de Numeração de Ofícios — DPE-BA

Use esta skill **antes de criar qualquer ofício**, para garantir que o número usado é o correto e não duplica um já existente na pasta.

## Como usar

Sempre que for gerar um ofício (por qualquer skill), execute este script antes de definir o número:

```bash
python3 -c "
import os, re

# Pasta do usuário — ajustar para a pasta do assistido no caso concreto
pasta = '/caminho/para/a/pasta/do/assistido'

# Buscar todos os arquivos com padrão: Ofício nº XX-AAAA
numeros = []
for f in os.listdir(pasta):
    match = re.search(r'[Oo]f[ií]cio\s+n[oº°]?\s*(\d+)', f, re.IGNORECASE)
    if match:
        numeros.append(int(match.group(1)))

if numeros:
    ultimo = max(numeros)
    proximo = ultimo + 1
    print(f'Último ofício encontrado: nº {ultimo:02d}')
    print(f'Próximo número a usar:    nº {proximo:02d}')
else:
    print('Nenhum ofício numerado encontrado. Usar nº 01.')
    proximo = 1
"
```

## O que o script faz

- Varre todos os arquivos da pasta do usuário
- Identifica arquivos com padrão `Ofício nº XX` (qualquer variação de acento ou maiúscula)
- Retorna o maior número encontrado e o próximo disponível
- Se não encontrar nenhum, sugere começar do 01

## Nome do arquivo a gerar

Após obter o número, nomeie o arquivo no padrão:

```
Ofício nº {XX}-{ANO} - {Destinatário} - {Assistido}.docx
```

Exemplo: `Ofício nº 11-2026 - DEAM Camaçari - Fulano de Tal.docx`

## Importante

- Rodar **antes** de definir o número do ofício no corpo do documento
- O número interno do ofício (no cabeçalho da peça) deve coincidir com o nome do arquivo
- Em caso de dúvida, sempre prefira verificar a pasta do que presumir o número
