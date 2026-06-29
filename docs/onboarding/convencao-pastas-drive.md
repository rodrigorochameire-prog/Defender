# Convenção de Organização das Pastas do Drive no OMBUDS

## Introdução

Quando você vincula sua conta do Google Drive ao OMBUDS, o sistema cria automaticamente uma estrutura de pastas padronizada. Este documento explica como as pastas são organizadas e como você deve usá-las para que o OMBUDS funcione corretamente.

## Estrutura Esperada

### Pasta Raiz

Ao vincularem sua conta, o OMBUDS cria uma pasta raiz com o seguinte nome:

```
OMBUDS — [Seu Nome] — [Nome da Comarca]
```

**Exemplo:** `OMBUDS — Maria Silva — 9ª DP (Salvador)`

Esta pasta contém:
- **Subpastas de atribuição** (conforme suas atribuições jurídicas)
- **Pasta "Modelos"** (para templates e documentos padrão)

### Subpastas de Atribuição

Dentro da pasta raiz, o OMBUDS provisiona automaticamente as seguintes subpastas, de acordo com sua atribuição:

| Atribuição | Nome da Pasta | Uso |
|-----------|---------------|-----|
| **Júri** | `Processos - Júri` | Processos no tribunal do júri |
| **VVD Criminal** | `Processos - VVD (Criminal)` | Violência Doméstica contra a Mulher (autos criminais) |
| **Execução Penal** | `Processos - Execução Penal` | Execução de pena e progressão |
| **Substituição** | `Processos - Substituição` | Substituição de pena por medida cautelar |
| **Grupo do Júri** | `Processos - Grupo do Júri` | Coordenação de casos de júri coletivos |
| **Criminal Comum** | `Processos` | Processos criminais gerais |
| **Modelos** | `Modelos` | Templates de peças processuais, documentos padrão |

> **Nota:** Se você atua em mais de uma comarca (ex.: 7ª + 9ª DP), defensores que compartilham atuação podem compartilhar o mesmo grupo de pastas Drive.

## Organização por Assistido

Dentro de cada pasta de atribuição, crie **uma pasta por assistido**. Use o formato:

```
[CPF] - Nome Completo (ou [NOME] - Nome Completo se não houver CPF)
```

**Exemplo:**
```
123.456.789-01 - João Silva Oliveira
```

Isso permite que o OMBUDS localize rapidamente os casos vinculados a cada pessoa.

## Convenção de Nomes de Arquivo

Documentos dentro da pasta do assistido devem seguir este padrão:

```
[Unidade] Tipo - Fundamento Sucinto - Nome Do Assistido (Sufixo).ext
```

**Componentes:**
- **[Unidade]**: Sigla da unidade (ex.: `[7DP]`, `[9DP]`)
- **Tipo**: Tipo de documento (ex.: `Denúncia`, `Apelação`, `HC`, `Mandado`)
- **Fundamento Sucinto**: Resumo do argumento jurídico (ex.: `Inépcia da Denúncia`, `Dosimetria Excessiva`)
- **Nome do Assistido**: Nome completo ou abreviado da pessoa
- **Sufixo**: Identificador opcional (ex.: `v1`, `final`, `assinado`)
- **Extensão**: `.docx`, `.pdf`, etc.

### Exemplos

```
[9DP] Apelação - Dosimetria Excessiva - João Silva (assinado).docx
[7DP] HC - Erro de Pessoa - Maria Santos (v2).pdf
[9DP] Denúncia - Inépcia - Carlos Mendes (final).docx
[Centro] Ofício - Requisição de Documentação - Paula Costa (enviado).pdf
```

> **Importante:** Use Title Case (primeira letra de cada palavra em maiúscula) e evite acentos nos nomes de arquivo quando possível.

## Como Funciona com o OMBUDS

1. **Provisionamento**: Quando você vincula seu Drive, o OMBUDS cria a estrutura de pastas e guarda os IDs internos de cada pasta no banco de dados.

2. **Resolver de Atribuições**: Quando você inicia uma análise ou sincronização, o OMBUDS usa o "resolver" (`resolveAtribuicaoFolder`) para localizar a pasta correta de acordo com sua atribuição.

3. **Operações Automáticas**: Análises jurídicas, relatórios e sincronizações operam sobre as pastas e documentos organizados nesta estrutura.

4. **Compartilhamento de Casos**: Se você trabalha com colegas na mesma atribuição (ex.: ambos na 9ª DP), o grupo de Drive garante que todos vocês acessem as mesmas pastas.

## Exemplo Completo de Árvore de Pastas

```
OMBUDS — João Defensor — 9ª DP (Salvador)
│
├── Processos - Júri
│   ├── 123.456.789-01 - Paulo Silva Oliveira
│   │   ├── [9DP] Denúncia - Homicídio Doloso - Paulo Silva (v1).docx
│   │   ├── [9DP] Tese - Legítima Defesa - Paulo Silva (final).docx
│   │   └── [9DP] Relatório - Análise Estratégica - Paulo Silva.pdf
│   │
│   └── 987.654.321-10 - Maria Santos Costa
│       ├── [9DP] Apelação - Nulidade de Julgamento - Maria Santos (assinado).docx
│       └── [9DP] Memorial - Jurisprudência - Maria Santos.pdf
│
├── Processos - VVD (Criminal)
│   └── 111.222.333-44 - Ana Clara Ferreira
│       ├── [9DP] Denúncia - VDM - Ana Clara (v1).docx
│       ├── [9DP] Parecer Psicossocial - Ana Clara.pdf
│       └── [9DP] Ofício - Medida Protetiva - Ana Clara (enviado).docx
│
├── Processos - Execução Penal
│   └── 555.666.777-88 - Roberto Alves
│       ├── [9DP] Petição - Progressão de Regime - Roberto Alves.docx
│       └── [9DP] Documentação - Comprovante de Estudo - Roberto Alves.pdf
│
├── Processos
│   └── 444.333.222-11 - Felipe Pereira
│       └── [9DP] Recurso em Sentido Estrito - Erro de Pessoa - Felipe Pereira (final).docx
│
└── Modelos
    ├── Denúncia Modelo VDM.docx
    ├── Apelação Modelo Criminal.docx
    └── Template Relatório Análise.pdf
```

## Boas Práticas

- **Mantenha a estrutura limpa**: Crie pastas de assistidos apenas quando efetivamente precisar organizar documentos.
- **Siga a convenção de nomes**: Isso facilita a busca automática do OMBUDS.
- **Use subpastas com moderação**: Não crie subpastas dentro de pastas de assistidos; coloque todos os documentos diretamente ali.
- **Atualize documentos com versões**: Use sufixos como `v1`, `v2`, `final` para rastrear mudanças.

## Próximos Passos

Após organizar seu Drive conforme esta convenção, você pode:
- Usar o OMBUDS para gerar análises jurídicas automáticas sobre seus casos.
- Sincronizar dados com outros sistemas (ex.: Solar, SIGA).
- Compartilhar pastas com colegas de mesma atribuição.

Dúvidas? Consulte o suporte do OMBUDS ou a documentação técnica em `.claude/rules/`.
