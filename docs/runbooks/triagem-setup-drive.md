# Setup do Drive — Triagem Criminal Camaçari

Pasta compartilhada com modelos prontos pra entrega, formulários internos e saída diária de documentos gerados.

## Estrutura de pastas

Criar dentro da pasta da 9ª Defensoria (Drive compartilhado):

```
📁 Triagem Criminal — DP Camaçari/
├── 📁 1. Modelos prontos para entrega/
├── 📁 2. Formulários internos/
├── 📁 3. Modelos de petição/
├── 📁 4. Documentos gerados/
│   └── 📁 [ano]/[mês]/[dia]/   ← Apps Script ou skill cria sob demanda
├── 📁 5. Referências/
└── 📁 6. Histórico/
```

## Permissões

- **Dil (Dilcélia):** Editor em pastas 1-4, Visualizador em 5-6
- **Defensores (Rodrigo, Juliane, Cristiane, Danilo):** Editor em todas
- **Amanda, Emilly, Taissa:** Editor em 1-4

Configurar no Drive:
1. Selecionar pasta raiz "Triagem Criminal — DP Camaçari"
2. Clique com botão direito → **Compartilhar**
3. Adicionar pessoas conforme tabela acima
4. Para cada pessoa, escolher nível apropriado

Para restringir Dil a subpastas específicas:
1. Compartilhar raiz como Visualizador com Dil
2. Compartilhar pastas 1-4 separadamente como Editor

## Modelos do MVP (4 arquivos `.docx`)

Todos com placeholders `{{ }}` para serem preenchidos manualmente pela Dil (Fase 2 terá geração automática via skill).

### 1.1 — Declaração de União Estável

**Local:** `1. Modelos prontos para entrega/1.1 Declaração de União Estável.docx`

Adaptar o modelo existente da 9ª DP, garantindo os campos:
- `{{NOME_COMPANHEIRA}}` — nome completo de quem assina
- `{{CPF_COMPANHEIRA}}`
- `{{ENDERECO_COMPANHEIRA}}`
- `{{NOME_PRESO}}`
- `{{CPF_PRESO}}`
- `{{TEMPO_UNIAO}}`
- `{{UNIDADE_PRISIONAL}}` (opcional)

### 1.2 — Destituição de Advogado

**Local:** `1. Modelos prontos para entrega/1.2 Destituição de Advogado.docx`

Campos:
- `{{NOME_ASSISTIDO}}`, `{{CPF}}`, `{{ENDERECO}}`
- `{{NUMERO_PROCESSO}}` (CNJ, com pontuação)
- `{{NOME_ADVOGADO_ANTIGO}}`, `{{OAB_ADVOGADO}}` (ex: "BA 12345")

### 1.3 — Declaração de Hipossuficiência

**Local:** `1. Modelos prontos para entrega/1.3 Declaração de Hipossuficiência.docx`

Padrão DPE-BA:
- `{{NOME_ASSISTIDO}}`, `{{CPF}}`, `{{ENDERECO}}`

### 1.6 — Atestado de comparecimento à DP

**Local:** `1. Modelos prontos para entrega/1.6 Atestado de comparecimento.docx`

Campos:
- `{{NOME_ASSISTIDO}}`, `{{CPF}}`
- `{{DATA_ATENDIMENTO}}`, `{{HORA_INICIO}}`, `{{HORA_FIM}}`
- Assinatura: servidora da triagem + carimbo DP 9ª

## Referências (pasta 5)

Uploadear:
- `5.1 Cheat Sheet Juliane.pptx` — PPT original de treinamento (arquivo `Triagem_Criminal_—_Defensoria_Pública_de_Camaçari.pptx`)
- `5.2 Contatos cartórios + delegacias.xlsx` — lista com telefone, email, horário das Varas Criminais / VVD / Execução Penal / Delegacias de Camaçari
- `5.3 Mapa rede assistência.pdf` — CRAS, CREAS, abrigo, SUS, CAPS (locais de encaminhamento não-jurídico)
- `5.4 Resumo procedimentos.pdf` — fluxo ANPP, fluxo penal comum, fluxo júri (versão resumida do que a Juliane ensinou)

## Verificação

- [ ] Pasta raiz visível para Dil, 4 defensores e 3 colaboradoras
- [ ] 4 modelos uploadados em `1. Modelos prontos para entrega/`
- [ ] Referências em `5. Referências/` (pelo menos o PPT)
- [ ] Pasta `4. Documentos gerados/2026-04/` criada (vazia, será populada por uso real)

## Para Fase 2

Anotar `TRIAGEM_DRIVE_FOLDER_ID` no `.env.local` quando for integrar geração automática de docs:
```
TRIAGEM_DRIVE_FOLDER_ID=<id-da-pasta-raiz>
```

O ID é encontrado na URL da pasta: `https://drive.google.com/drive/folders/<ID-AQUI>`.
