# TDD: Sistema de Organização Hierárquica Drive + Assistidos + Processos

> **Data**: 2025-02-09
> **Status**: Em Revisão
> **Autor**: Claude + Rodrigo

---

## 1. Visão Geral

### Objetivo
Criar um sistema integrado que organiza automaticamente documentos no Google Drive seguindo a hierarquia:

```
Atribuição → Assistido (Title Case) → Processo → Documentos
```

### Componentes Principais

| Componente | Descrição |
|------------|-----------|
| **Assistidos** | Cadastro com atribuição primária, tabs de navegação |
| **Processos** | Vinculados a assistidos, herdam/definem atribuição |
| **Drive** | Visão hierárquica completa por atribuição |
| **Jurisprudência** | Banco de teses + IA + visualizações |
| **Distribuição** | OCR + auto-routing de PDFs |

---

## 2. Estrutura de Pastas no Drive

### 2.1 Hierarquia Padronizada

**TODAS** as atribuições seguem a mesma estrutura:

```
📁 [Atribuição] (pasta raiz)
└── 📁 [Nome do Assistido em Title Case]
    └── 📁 [Número do Processo]
        └── 📄 [Documentos]
```

### 2.2 Pastas por Atribuição

| Atribuição | Folder ID | Cor |
|------------|-----------|-----|
| **Júri** | `1_S-2qdqO0n1npNcs0PnoagBM4ZtwKhk-` | 🟢 Emerald |
| **VVD** | `1fN2GiGlNzc61g01ZeBMg9ZBy1hexx0ti` | 🟡 Yellow |
| **EP** | `1-mbwgP3-ygVVjoN9RPTbHwnaicnBAv0q` | 🔵 Blue |
| **Substituição** | `1eNDT0j-5KQkzYXbqK6IBa9sIMT3QFWVU` | 🟣 Purple |

### 2.3 Pastas Especiais

| Pasta | Folder ID | Função |
|-------|-----------|--------|
| **Julgados e Teses** | `1Dvpn1r6b5nZ3bALst9_YEbZHlRDSPw7S` | Jurisprudência |
| **Distribuição** | `1dw8Hfpt_NLtLZ8DYDIcgjauo_xtM1nH4` | Inbox OCR |

### 2.4 Exemplo Concreto

```
📁 Júri (1_S-2qdqO0n1npNcs0PnoagBM4ZtwKhk-)
├── 📁 João da Silva
│   ├── 📁 0000123-45.2024.8.05.0039
│   │   ├── 📄 Denúncia.pdf
│   │   ├── 📄 Resposta à Acusação.pdf
│   │   └── 📄 Alegações Finais.pdf
│   └── 📁 0000456-78.2023.8.05.0039
│       └── 📄 ...
├── 📁 Maria dos Santos
│   └── 📁 0000789-12.2024.8.05.0039
│       └── 📄 ...
└── 📁 Pedro Oliveira Neto
    └── 📁 ...

📁 VVD (1fN2GiGlNzc61g01ZeBMg9ZBy1hexx0ti)
├── 📁 Ana Carolina Souza
│   └── 📁 0001234-56.2024.8.05.0039
│       └── 📄 ...
└── 📁 ...

📁 EP (1-mbwgP3-ygVVjoN9RPTbHwnaicnBAv0q)
├── 📁 Carlos Eduardo Lima
│   └── 📁 0002345-67.2024.8.05.0039
│       └── 📄 ...
└── 📁 ...

📁 Substituição (1eNDT0j-5KQkzYXbqK6IBa9sIMT3QFWVU)
├── 📁 Fernanda Alves Costa
│   └── 📁 0003456-78.2024.8.05.0039
│       └── 📄 ...
└── 📁 ...
```

---

## 3. Formatação de Nomes

### 3.1 Assistidos - Title Case

**Regra**: Nome completo em Title Case (primeira letra maiúscula de cada palavra).

| Entrada | Saída |
|---------|-------|
| `JOÃO DA SILVA` | `João da Silva` |
| `maria dos santos` | `Maria dos Santos` |
| `PEDRO OLIVEIRA NETO` | `Pedro Oliveira Neto` |
| `ANA CAROLINA DE SOUZA` | `Ana Carolina de Souza` |

**Exceções** (partículas em minúsculo):
- `da`, `de`, `do`, `das`, `dos`
- `e`, `ou`

**Função de conversão**:
```typescript
function toTitleCase(name: string): string {
  const particles = ['da', 'de', 'do', 'das', 'dos', 'e', 'ou'];

  return name
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      if (index > 0 && particles.includes(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}
```

### 3.2 Processos - Número Formatado

**Formato CNJ**: `NNNNNNN-DD.AAAA.J.TR.OOOO`

| Campo | Significado |
|-------|-------------|
| `NNNNNNN` | Número sequencial (7 dígitos) |
| `DD` | Dígito verificador (2 dígitos) |
| `AAAA` | Ano de ajuizamento |
| `J` | Segmento do Judiciário (8 = Estadual) |
| `TR` | Tribunal (05 = Bahia) |
| `OOOO` | Origem (0039 = Camaçari) |

**Exemplo**: `0000123-45.2024.8.05.0039`

---

## 4. Detecção de Homonímia

### 4.1 Quando Detectar

Ao criar pasta de assistido ou ao distribuir documento, verificar:

1. **Nome exato igual** → Candidato forte a duplicata
2. **Nome similar** (Levenshtein < 3) → Possível homonímia
3. **Primeiro + último nome iguais** → Alerta

### 4.2 Critérios de Similaridade

```typescript
interface HomonymCheck {
  exactMatch: boolean;       // Nome idêntico
  similarMatch: boolean;     // Levenshtein < 3
  firstLastMatch: boolean;   // Primeiro e último nome iguais
  cpfMatch: boolean;         // CPF igual (definitivo)
}
```

### 4.3 Fluxo de Validação

```
┌─────────────────────┐
│ Novo nome detectado │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Busca por similares │
└──────────┬──────────┘
           │
     ┌─────┴─────┐
     │ Encontrou │
     │ similar?  │
     └─────┬─────┘
           │
    SIM    │    NÃO
     ┌─────┴─────┐
     ▼           ▼
┌─────────┐ ┌─────────┐
│ Modal   │ │ Criar   │
│ Validar │ │ Novo    │
└────┬────┘ └─────────┘
     │
     ▼
┌─────────────────────────────────┐
│ "Encontramos assistidos com    │
│  nomes similares. Este é o     │
│  mesmo assistido?"             │
│                                │
│ ○ João da Silva (CPF: ***.123) │
│   3 processos, Júri            │
│                                │
│ ○ João da Silva (CPF: ***.456) │
│   1 processo, EP               │
│                                │
│ ○ É um NOVO assistido          │
└─────────────────────────────────┘
```

### 4.4 Interface do Modal

```tsx
interface HomonymModalProps {
  newName: string;
  candidates: {
    id: number;
    nome: string;
    cpfPartial: string;    // Últimos 3 dígitos
    processosCount: number;
    atribuicoes: string[];
    photoUrl?: string;
  }[];
  onSelect: (id: number | 'new') => void;
  onCancel: () => void;
}
```

---

## 5. Mudanças no Schema

### 5.1 Tabela `assistidos` - Adicionar Campo

```sql
ALTER TABLE assistidos
ADD COLUMN atribuicao_primaria atribuicao DEFAULT 'SUBSTITUICAO';

-- Enum já existe, reutilizar
-- atribuicao: JURI_CAMACARI, VVD_CAMACARI, EXECUCAO_PENAL, SUBSTITUICAO, etc.
```

**Mapeamento simplificado para pastas**:

| Valor no Banco | Pasta Drive |
|----------------|-------------|
| `JURI_CAMACARI`, `GRUPO_JURI` | Júri |
| `VVD_CAMACARI` | VVD |
| `EXECUCAO_PENAL` | EP |
| `SUBSTITUICAO`, `SUBSTITUICAO_CIVEL` | Substituição |

### 5.2 Tabela `assistidos` - Adicionar Folder ID

```sql
ALTER TABLE assistidos
ADD COLUMN drive_folder_id TEXT;

-- Armazena o ID da pasta do assistido no Drive
-- Exemplo: "1abc123xyz..."
```

### 5.3 Tabela `processos` - Garantir Folder ID

```sql
-- Já existe: drive_folder_id TEXT
-- Confirmar que está sendo usado corretamente
```

### 5.4 Schema Drizzle Atualizado

```typescript
// Em src/lib/db/schema.ts

export const assistidos = pgTable("assistidos", {
  // ... campos existentes ...

  // NOVOS CAMPOS
  atribuicaoPrimaria: atribuicaoEnum("atribuicao_primaria").default("SUBSTITUICAO"),
  driveFolderId: text("drive_folder_id"),
});
```

---

## 6. Páginas e Componentes

### 6.1 Página Assistidos - Tabs por Atribuição

```
/admin/assistidos
├── [Tabs]
│   ├── 🟢 Júri (badge: 45)
│   ├── 🟡 VVD (badge: 32)
│   ├── 🔵 EP (badge: 28)
│   └── 🟣 Substituição (badge: 15)
│
├── [Filtros]
│   ├── Busca por nome/CPF
│   └── Status prisional
│
└── [Lista de Cards]
    └── Card Assistido
        ├── Foto
        ├── Nome (Title Case)
        ├── CPF (masked)
        ├── Status prisional
        ├── Qtd processos
        └── Ações: Ver, Editar, Novo Processo
```

### 6.2 Página Drive - Visão Hierárquica

```
/admin/drive
├── [Seletor Atribuição] (já implementado)
│   ├── 🟢 Júri
│   ├── 🟡 VVD
│   ├── 🔵 EP
│   └── 🟣 Substituição
│
├── [Breadcrumb]
│   └── Júri > João da Silva > 0000123-45.2024
│
├── [Árvore de Pastas]
│   └── Collapsible tree view
│       ├── 📁 João da Silva
│       │   ├── 📁 0000123-45.2024
│       │   └── 📁 0000456-78.2023
│       └── 📁 Maria dos Santos
│
└── [Lista de Arquivos]
    └── Arquivos da pasta selecionada
```

### 6.3 Página Jurisprudência (Nova)

```
/admin/jurisprudencia
├── [Sidebar]
│   └── Árvore de pastas "Julgados e Teses"
│
├── [Área Principal]
│   ├── [Tab: Biblioteca]
│   │   └── Grid de PDFs com preview
│   │
│   ├── [Tab: Chat IA]
│   │   ├── Input de pergunta
│   │   ├── Histórico de mensagens
│   │   └── Citações de fontes
│   │
│   ├── [Tab: Busca]
│   │   ├── Campo de busca semântica
│   │   ├── Filtros (tribunal, data, tema)
│   │   └── Resultados com snippets
│   │
│   └── [Tab: Visualizações]
│       ├── Mapa mental de teses
│       ├── Timeline jurisprudencial
│       └── Diagrama de argumentação
│
└── [Drawer: Jus IA]
    └── Integração com API externa
```

### 6.4 Seção Distribuição (Em Documentos)

```
/admin/documentos
├── [Tabs existentes]
│   ├── Todos
│   ├── Por Processo
│   └── Templates
│
├── [Nova Tab: Distribuição]
│   ├── [Inbox]
│   │   └── Lista de PDFs pendentes
│   │       ├── Miniatura
│   │       ├── Nome arquivo
│   │       ├── Data upload
│   │       └── Status: Pendente/Processando/Erro
│   │
│   ├── [Card de Processamento]
│   │   ├── Preview 1ª página
│   │   ├── Dados extraídos:
│   │   │   ├── Número processo
│   │   │   ├── Órgão julgador
│   │   │   └── Nome assistido
│   │   ├── Match sugerido:
│   │   │   ├── Assistido encontrado (ou criar)
│   │   │   └── Processo encontrado (ou criar)
│   │   └── Ações:
│   │       ├── ✅ Confirmar distribuição
│   │       ├── ✏️ Editar dados
│   │       └── ❌ Rejeitar
│   │
│   └── [Histórico]
│       └── Últimas distribuições realizadas
```

---

## 7. APIs e Routers

### 7.1 Router: `drive` - Novas Funções

```typescript
// src/lib/trpc/routers/drive.ts

export const driveRouter = router({
  // Existentes...

  // NOVAS

  // Listar pastas de assistidos dentro de uma atribuição
  listAssistidoFolders: procedure
    .input(z.object({
      atribuicao: z.enum(['JURI', 'VVD', 'EP', 'SUBSTITUICAO'])
    }))
    .query(async ({ input }) => {
      // Retorna subpastas da pasta da atribuição
    }),

  // Listar pastas de processos dentro de um assistido
  listProcessoFolders: procedure
    .input(z.object({
      assistidoFolderId: z.string()
    }))
    .query(async ({ input }) => {
      // Retorna subpastas da pasta do assistido
    }),

  // Criar pasta para assistido
  createAssistidoFolder: procedure
    .input(z.object({
      atribuicao: z.enum(['JURI', 'VVD', 'EP', 'SUBSTITUICAO']),
      assistidoId: z.number(),
      nome: z.string()  // Já em Title Case
    }))
    .mutation(async ({ input }) => {
      // 1. Criar pasta no Drive dentro da atribuição
      // 2. Atualizar assistido.driveFolderId
      // 3. Retornar folderId
    }),

  // Criar pasta para processo
  createProcessoFolder: procedure
    .input(z.object({
      assistidoFolderId: z.string(),
      processoId: z.number(),
      numeroProcesso: z.string()
    }))
    .mutation(async ({ input }) => {
      // 1. Criar pasta no Drive dentro do assistido
      // 2. Atualizar processo.driveFolderId
      // 3. Retornar folderId
    }),

  // Mover arquivo entre pastas
  moveFile: procedure
    .input(z.object({
      fileId: z.string(),
      fromFolderId: z.string(),
      toFolderId: z.string()
    }))
    .mutation(async ({ input }) => {
      // Usar Drive API para mover
    }),
});
```

### 7.2 Router: `distribuicao` (Novo)

```typescript
// src/lib/trpc/routers/distribuicao.ts

export const distribuicaoRouter = router({

  // Listar PDFs pendentes na pasta Distribuição
  listPending: procedure
    .query(async () => {
      // Listar arquivos da pasta 1dw8Hfpt_NLtLZ8DYDIcgjauo_xtM1nH4
    }),

  // Processar PDF com OCR (Gemini Vision)
  processFile: procedure
    .input(z.object({
      fileId: z.string()
    }))
    .mutation(async ({ input }) => {
      // 1. Baixar PDF do Drive
      // 2. Extrair primeira página como imagem
      // 3. Enviar para Gemini Vision
      // 4. Extrair: número processo, órgão, nome
      // 5. Retornar dados extraídos
    }),

  // Buscar matches para os dados extraídos
  findMatches: procedure
    .input(z.object({
      numeroProcesso: z.string().optional(),
      nomeAssistido: z.string().optional(),
      orgaoJulgador: z.string().optional()
    }))
    .query(async ({ input }) => {
      // 1. Buscar processo por número
      // 2. Buscar assistido por nome (fuzzy)
      // 3. Detectar homonímia
      // 4. Identificar atribuição pelo órgão
      // 5. Retornar candidatos
    }),

  // Confirmar e executar distribuição
  distribute: procedure
    .input(z.object({
      fileId: z.string(),
      assistidoId: z.number(),      // Existente ou recém-criado
      processoId: z.number(),        // Existente ou recém-criado
      atribuicao: z.enum(['JURI', 'VVD', 'EP', 'SUBSTITUICAO']),
      createAssistidoFolder: z.boolean(),
      createProcessoFolder: z.boolean()
    }))
    .mutation(async ({ input }) => {
      // 1. Criar pastas se necessário
      // 2. Mover arquivo para pasta correta
      // 3. Registrar documento no banco
      // 4. Retornar sucesso
    }),
});
```

### 7.3 Router: `jurisprudencia` (Novo)

```typescript
// src/lib/trpc/routers/jurisprudencia.ts

export const jurisprudenciaRouter = router({

  // Listar teses da pasta
  listTeses: procedure
    .input(z.object({
      search: z.string().optional(),
      tribunal: z.string().optional(),
      tema: z.string().optional()
    }))
    .query(async ({ input }) => {
      // Listar PDFs de 1Dvpn1r6b5nZ3bALst9_YEbZHlRDSPw7S
    }),

  // Chat com IA sobre jurisprudência
  chat: procedure
    .input(z.object({
      message: z.string(),
      context: z.array(z.string()).optional()  // IDs de documentos para contexto
    }))
    .mutation(async ({ input }) => {
      // 1. Buscar documentos relevantes
      // 2. Construir prompt com contexto
      // 3. Chamar Gemini
      // 4. Retornar resposta com citações
    }),

  // Busca semântica
  search: procedure
    .input(z.object({
      query: z.string(),
      limit: z.number().default(10)
    }))
    .query(async ({ input }) => {
      // Busca semântica nos documentos
    }),

  // Gerar visualização Excalidraw
  generateVisualization: procedure
    .input(z.object({
      type: z.enum(['mindmap', 'timeline', 'argument']),
      teseIds: z.array(z.string()),
      title: z.string()
    }))
    .mutation(async ({ input }) => {
      // Gerar estrutura Excalidraw
    }),
});
```

---

## 8. Identificação de Atribuição por Órgão

### 8.1 Mapeamento de Órgãos

```typescript
const ORGAO_TO_ATRIBUICAO: Record<string, 'JURI' | 'VVD' | 'EP' | 'SUBSTITUICAO'> = {
  // JÚRI
  '1ª Vara do Júri': 'JURI',
  'Vara do Júri': 'JURI',
  'Tribunal do Júri': 'JURI',

  // VVD
  'VVDFCM': 'VVD',
  'Vara de Violência Doméstica': 'VVD',
  'Juizado de Violência Doméstica': 'VVD',

  // EP
  'VEP': 'EP',
  'Vara de Execuções Penais': 'EP',
  'Vara de Execução Penal': 'EP',

  // SUBSTITUIÇÃO (default)
  'Vara Criminal': 'SUBSTITUICAO',
  '1ª Vara Criminal': 'SUBSTITUICAO',
  '2ª Vara Criminal': 'SUBSTITUICAO',
};

function identificarAtribuicao(orgao: string): 'JURI' | 'VVD' | 'EP' | 'SUBSTITUICAO' {
  const orgaoNormalizado = orgao.toLowerCase().trim();

  if (orgaoNormalizado.includes('júri') || orgaoNormalizado.includes('juri')) {
    return 'JURI';
  }
  if (orgaoNormalizado.includes('violência') || orgaoNormalizado.includes('vvd') || orgaoNormalizado.includes('doméstic')) {
    return 'VVD';
  }
  if (orgaoNormalizado.includes('execuç') || orgaoNormalizado.includes('vep')) {
    return 'EP';
  }

  return 'SUBSTITUICAO';
}
```

---

## 9. Extração de Dados (Baseado no n8n)

### 9.1 Padrões Reais de Documentos PJe

Analisando exemplos reais do PJe/TJBA, identificamos os seguintes padrões:

#### Campos Comuns em Todos os Tipos

| Campo | Padrão | Exemplo |
|-------|--------|---------|
| **Número** | `Número: X.XXXXXXX-XX.XXXX.X.XX.XXXX` | `8000819-86.2025.8.05.0039` |
| **Classe** | `Classe: [TEXTO]` | `INQUÉRITO POLICIAL`, `AÇÃO PENAL DE COMPETÊNCIA DO JÚRI` |
| **Órgão julgador** | `Órgão julgador: [TEXTO]` | `VARA DO JÚRI E EXECUÇÕES PENAIS DA COMARCA DE CAMAÇARI` |
| **Assuntos** | `Assuntos: [TEXTO]` | `Homicídio Qualificado` |

#### Padrões de Partes por Tipo de Processo

| Tipo Processo | Padrão de Parte | Exemplo |
|---------------|-----------------|---------|
| **IP (Inquérito)** | `NOME (INVESTIGADO)` | `JOSE WILLIANS DE JESUS DOS SANTOS (INVESTIGADO)` |
| **Ação Penal Júri** | `NOME (REU)` | `KASSIO KAILAN BARRETO DE ARAUJO (REU)` |
| **Execução Penal** | `Tipo: Promovido` + `Nome: NOME` | `EDINEI SOUZA DOS SANTOS` |
| **MPU (VVD)** | `NOME (REQUERIDO)` | `RICARDO GUTEMBERG OLIVEIRA BARBOSA JUNIOR (REQUERIDO)` |
| **Ação Penal VVD** | `NOME (REU)` | `MARCOS MOTA DE SOUZA (REU)` |
| **Substituição** | `NOME (REU)` | `JURANDI MARTINS TEIXEIRA (REU)` |

#### Órgãos Julgadores por Atribuição

| Atribuição | Padrões de Órgão |
|------------|------------------|
| **JÚRI** | `VARA DO JÚRI E EXECUÇÕES PENAIS DA COMARCA DE CAMAÇARI` |
| **VVD** | `VARA DE VIOLÊNCIA DOMÉSTICA FAM CONTRA A MULHER DE CAMAÇARI` |
| **EP** | `Vara do Júri e Execuções Penais de Camaçari` (mesmo órgão do Júri) |
| **SUBSTITUIÇÃO** | `VARA CRIMINAL DE [OUTRA COMARCA]` (ex: `VARA CRIMINAL DE CANDEIAS`) |

### 9.2 Extração via Regex (Baseado em Exemplos Reais)

```typescript
interface ExtractedData {
  numeroProcesso: string | null;
  orgaoJulgador: string | null;
  classeDemanda: string | null;
  assuntos: string | null;
  assistidos: string[];  // Pode ter múltiplos réus/investigados
}

function extractFromPdfText(text: string): ExtractedData {
  let numeroProcesso: string | null = null;
  let orgaoJulgador: string | null = null;
  let classeDemanda: string | null = null;
  let assuntos: string | null = null;
  const assistidos: string[] = [];

  // 1. Extrai número do processo
  // Padrão: "Número: 8000819-86.2025.8.05.0039"
  const matchNumero = text.match(/Número:\s*([\d\-.]+)/i);
  if (matchNumero) {
    numeroProcesso = matchNumero[1].trim();
  }

  // 2. Extrai classe da demanda
  // Padrão: "Classe: AÇÃO PENAL DE COMPETÊNCIA DO JÚRI"
  const matchClasse = text.match(/Classe:\s*([^\n]+)/i);
  if (matchClasse) {
    classeDemanda = matchClasse[1].trim();
  }

  // 3. Extrai órgão julgador
  // Padrão: "Órgão julgador: VARA DO JÚRI E EXECUÇÕES PENAIS..."
  const matchOrgao = text.match(/Órgão julgador:\s*([^\n]+)/i);
  if (matchOrgao) {
    orgaoJulgador = matchOrgao[1].trim();
  }

  // 4. Extrai assuntos
  // Padrão: "Assuntos: Homicídio Qualificado"
  const matchAssuntos = text.match(/Assuntos:\s*([^\n]+)/i);
  if (matchAssuntos) {
    assuntos = matchAssuntos[1].trim();
  }

  // 5. Extrai réus/investigados/requeridos
  // Padrões: "NOME (REU)", "NOME (INVESTIGADO)", "NOME (REQUERIDO)", "NOME (CUSTODIADO)"
  const regexPartes = /([A-ZÇÃÉÍÓÚÂÊÎÔÛÀÈÌÒÙÄËÏÖÜ\s]+)\s*\((RÉU|REU|INVESTIGADO|CUSTODIADO|REQUERIDO|PROMOVIDO)\)/gi;
  let matchParte;
  while ((matchParte = regexPartes.exec(text)) !== null) {
    const nome = matchParte[1].trim();
    // Ignora palavras-chave falsas
    const ignorar = ['VISTOS', 'MINISTÉRIO PÚBLICO', 'DEFENSORIA', 'PODER JUDICIÁRIO'];
    if (!ignorar.some(i => nome.includes(i)) && nome.length > 3) {
      assistidos.push(nome);
    }
  }

  // 6. Fallback para Execução Penal (formato diferente)
  // Padrão: "Tipo: Promovido" seguido de "Nome: EDINEI SOUZA DOS SANTOS"
  if (assistidos.length === 0) {
    const matchPromovido = text.match(/Tipo:\s*Promovido[\s\S]*?Nome:\s*([A-ZÇÃÉÍÓÚÂÊÎÔÛÀÈÌÒÙÄËÏÖÜ\s]+)/i);
    if (matchPromovido) {
      assistidos.push(matchPromovido[1].trim());
    }
  }

  return { numeroProcesso, orgaoJulgador, classeDemanda, assuntos, assistidos };
}
```

### 9.2 Conversão para Title Case (do n8n)

```typescript
function toTitleCase(name: string): string {
  const preps = ['de', 'da', 'do', 'dos', 'das', 'e'];

  return name
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      // Preposições em minúsculo, exceto no início
      if (preps.includes(word) && index !== 0) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

// Exemplos:
// "JOÃO DA SILVA" → "João da Silva"
// "MARIA DOS SANTOS" → "Maria dos Santos"
// "PEDRO DE OLIVEIRA NETO" → "Pedro de Oliveira Neto"
```

### 9.3 Identificação de Atribuição (Baseado em Exemplos Reais)

```typescript
interface AtribuicaoResult {
  atribuicao: 'JURI' | 'VVD' | 'EP' | 'SUBSTITUICAO';
  confianca: number;  // 0-100
  motivo: string;
}

function identificarAtribuicao(
  orgaoJulgador: string,
  classeDemanda?: string,
  assuntos?: string
): AtribuicaoResult {
  const orgao = orgaoJulgador.toLowerCase();
  const classe = (classeDemanda || '').toLowerCase();
  const assunto = (assuntos || '').toLowerCase();

  // 1. VVD - Violência Doméstica de Camaçari
  // Órgão: "VARA DE VIOLÊNCIA DOMÉSTICA FAM CONTRA A MULHER DE CAMAÇARI"
  if (orgao.includes('violência doméstica') && orgao.includes('camaçari')) {
    return { atribuicao: 'VVD', confianca: 100, motivo: 'Vara VVD Camaçari' };
  }

  // 2. JÚRI vs EP - Mesmo órgão, diferenciar pela classe/assunto
  // Órgão: "VARA DO JÚRI E EXECUÇÕES PENAIS DA COMARCA DE CAMAÇARI"
  if (orgao.includes('júri') && orgao.includes('execuções penais') && orgao.includes('camaçari')) {
    // EP: classe "Execução da Pena" ou "Pena Privativa de Liberdade"
    if (classe.includes('execução') || assunto.includes('pena privativa')) {
      return { atribuicao: 'EP', confianca: 95, motivo: 'Vara Mista - Classe de Execução' };
    }
    // JÚRI: classe "Ação Penal de Competência do Júri" ou "Inquérito Policial" com homicídio
    if (classe.includes('júri') || classe.includes('inquérito') || assunto.includes('homicídio')) {
      return { atribuicao: 'JURI', confianca: 95, motivo: 'Vara Mista - Classe de Júri/IP' };
    }
    // Se não conseguiu diferenciar, assume JURI por estar na vara do júri
    return { atribuicao: 'JURI', confianca: 70, motivo: 'Vara Mista - Assumindo Júri' };
  }

  // 3. SUBSTITUIÇÃO - Vara Criminal de outra comarca
  // Órgão: "VARA CRIMINAL DE CANDEIAS", "VARA CRIMINAL DE DIAS D'ÁVILA", etc.
  if (orgao.includes('vara criminal') && !orgao.includes('camaçari')) {
    return { atribuicao: 'SUBSTITUICAO', confianca: 100, motivo: 'Vara Criminal fora de Camaçari' };
  }

  // 4. EP genérico
  if (orgao.includes('execução penal') || orgao.includes('vep')) {
    return { atribuicao: 'EP', confianca: 90, motivo: 'Vara de Execução Penal' };
  }

  // 5. VVD genérico (outras comarcas)
  if (orgao.includes('violência') || orgao.includes('maria da penha')) {
    return { atribuicao: 'VVD', confianca: 85, motivo: 'Vara VVD (outra comarca)' };
  }

  // 6. JÚRI genérico
  if (orgao.includes('júri') || orgao.includes('juri')) {
    return { atribuicao: 'JURI', confianca: 85, motivo: 'Vara do Júri (outra comarca)' };
  }

  // 7. Default: Substituição
  return { atribuicao: 'SUBSTITUICAO', confianca: 50, motivo: 'Não identificado - assumindo Substituição' };
}
```

### 9.4 Exemplos de Identificação

| Órgão Julgador | Classe | Assuntos | Resultado |
|----------------|--------|----------|-----------|
| `VARA DO JÚRI E EXECUÇÕES PENAIS DA COMARCA DE CAMAÇARI` | `INQUÉRITO POLICIAL` | `Homicídio Qualificado` | **JURI** (95%) |
| `VARA DO JÚRI E EXECUÇÕES PENAIS DA COMARCA DE CAMAÇARI` | `AÇÃO PENAL DE COMPETÊNCIA DO JÚRI` | `Homicídio Qualificado` | **JURI** (95%) |
| `VARA DO JÚRI E EXECUÇÕES PENAIS DA COMARCA DE CAMAÇARI` | `Execução da Pena` | `Pena Privativa de Liberdade` | **EP** (95%) |
| `VARA DE VIOLÊNCIA DOMÉSTICA FAM CONTRA A MULHER DE CAMAÇARI` | `MEDIDAS PROTETIVAS DE URGÊNCIA` | `Violência Doméstica` | **VVD** (100%) |
| `VARA DE VIOLÊNCIA DOMÉSTICA FAM CONTRA A MULHER DE CAMAÇARI` | `AÇÃO PENAL - PROCEDIMENTO ORDINÁRIO` | `Violência Doméstica` | **VVD** (100%) |
| `VARA CRIMINAL DE CANDEIAS` | `PROCEDIMENTO ESPECIAL DA LEI ANTITÓXICOS` | `Tráfico de Drogas` | **SUBSTITUIÇÃO** (100%) |

### 9.5 Tratamento de Múltiplos Réus

Processos podem ter múltiplos réus/investigados. Exemplo real:

```
KASSIO KAILAN BARRETO DE ARAUJO (REU)
GREGORIO NASCIMENTO BARBOSA (REU)
JOSE FERNANDES TELES DA SILVA (REU)
```

**IMPORTANTE**: Nem todos os réus são assistidos pela Defensoria Pública. A Defensoria pode representar apenas 1, 2 ou todos os réus de um processo.

**Estratégia: Seleção Manual de Assistidos**

Quando múltiplos réus são detectados, o sistema deve:

1. **Listar todos os réus encontrados** no documento
2. **Solicitar seleção** de quais são assistidos pela Defensoria
3. **Criar pasta/registro** apenas para os assistidos selecionados

**Fluxo de UI**:

```
┌─────────────────────────────────────────────────────────────────┐
│  Múltiplos réus detectados neste processo                       │
│                                                                  │
│  Selecione quais são assistidos pela Defensoria Pública:        │
│                                                                  │
│  ☑️ KASSIO KAILAN BARRETO DE ARAUJO                             │
│  ☐ GREGORIO NASCIMENTO BARBOSA                                  │
│  ☑️ JOSE FERNANDES TELES DA SILVA                               │
│                                                                  │
│  [ ] Selecionar todos                                           │
│                                                                  │
│  [Cancelar]                              [Confirmar Seleção]    │
└─────────────────────────────────────────────────────────────────┘
```

**Cenários de Distribuição**:

| Cenário | Ação |
|---------|------|
| **1 assistido selecionado** | Criar pasta única com nome do assistido |
| **2+ assistidos do mesmo processo** | Criar pasta para cada assistido + vincular ao mesmo processo |
| **Nenhum selecionado** | Mover para pasta "Não Distribuído" para revisão manual |

**Implementação**:

```typescript
interface DistribuicaoMultiplosReus {
  // Réus detectados no documento
  reusDetectados: string[];

  // Réus selecionados como assistidos (após seleção do usuário)
  assistidosSelecionados: {
    nome: string;
    assistidoId?: number;   // Se já existe no banco
    criarNovo?: boolean;    // Se precisa criar
  }[];

  // Processo é compartilhado entre todos os assistidos selecionados
  processoId: number;
  numeroProcesso: string;
}

// Cada assistido selecionado terá:
// - Sua própria pasta no Drive (Atribuição/NomeAssistido)
// - Subpasta do processo (compartilhada via link ou duplicada)
// - Vínculo na tabela processos_assistidos (N:N)
```

**Estrutura de Pastas para Múltiplos Assistidos**:

```
📁 Júri
├── 📁 Kassio Kailan Barreto de Araujo
│   └── 📁 8004980-08.2026.8.05.0039
│       └── 📄 Denúncia.pdf
│
└── 📁 Jose Fernandes Teles da Silva
    └── 📁 8004980-08.2026.8.05.0039  ← Mesmo processo!
        └── 📄 Denúncia.pdf           ← Cópia ou atalho
```

**Nota**: Documentos compartilhados podem ser:
- **Copiados** para cada pasta (mais espaço, mais seguro)
- **Atalhos do Drive** apontando para arquivo único (menos espaço)

### 9.7 Prompt para OCR (Gemini Vision) - Fallback

Quando a extração por regex falha (PDFs escaneados/imagem), usar Gemini Vision:

```typescript
const OCR_PROMPT = `
Analise esta primeira página de documento jurídico e extraia as seguintes informações:

1. **Número do Processo**: No formato CNJ (NNNNNNN-DD.AAAA.J.TR.OOOO)
   Exemplo: 0000123-45.2024.8.05.0039

2. **Órgão Julgador**: Vara, Juízo ou Tribunal
   Exemplos: "1ª Vara do Júri de Camaçari", "VVDFCM", "VEP"

3. **Nome do Assistido/Réu**: Nome completo da pessoa assistida
   Geralmente aparece como "Réu:", "Acusado:", "Executado:", etc.

Retorne APENAS um JSON no formato:
{
  "numeroProcesso": "string ou null",
  "orgaoJulgador": "string ou null",
  "nomeAssistido": "string ou null",
  "tipoDocumento": "string",
  "confianca": {
    "numeroProcesso": 0-100,
    "orgaoJulgador": 0-100,
    "nomeAssistido": 0-100
  }
}

Se não conseguir extrair algum campo, retorne null para esse campo.
O campo "tipoDocumento" deve indicar se é: "denúncia", "sentença", "intimação", "ofício", etc.
O campo "confianca" indica de 0 a 100 a certeza da extração.
`;
```

---

## 10. Fluxo de Distribuição (Baseado no n8n)

### 10.1 Diagrama do Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FLUXO DE DISTRIBUIÇÃO                                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│  Pasta Inbox     │  Poll a cada 5 minutos (ou trigger manual)
│  (Distribuição)  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Download PDF    │  Baixa o arquivo do Drive
│  (Drive API)     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Extrair Texto   │  Extrai texto das 3 primeiras páginas
│  (pdf-parse)     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Regex Extract   │  Extrai: número, órgão, assistido
│  (JavaScript)    │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                          IDENTIFICAR ATRIBUIÇÃO                           │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐        │
│   │ VVD + Camaçari? │   │ JÚRI + Camaçari?│   │ Criminal s/     │        │
│   │       SIM       │   │       SIM       │   │ Camaçari? SIM   │        │
│   └────────┬────────┘   └────────┬────────┘   └────────┬────────┘        │
│            │                     │                     │                  │
│            ▼                     ▼                     ▼                  │
│   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐        │
│   │   Pasta: VVD    │   │  Pasta: Júri    │   │ Pasta: Subst.   │        │
│   │ 1fN2GiGl...     │   │ 1_S-2qdq...     │   │ 1eNDT0j...      │        │
│   └────────┬────────┘   └────────┬────────┘   └────────┬────────┘        │
│            │                     │                     │                  │
└────────────┼─────────────────────┼─────────────────────┼──────────────────┘
             │                     │                     │
             └──────────────────┬──┴─────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                           BUSCAR PASTA ASSISTIDO                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   Nome em Title Case: "João da Silva"                                     │
│                                                                           │
│   ┌─────────────────────────────────────────────────────────────────┐    │
│   │  Search files and folders                                        │    │
│   │  queryString: "João da Silva"                                    │    │
│   │  folderId: [pasta da atribuição]                                 │    │
│   │  whatToSearch: "folders"                                         │    │
│   └────────────────────────────────┬────────────────────────────────┘    │
│                                    │                                      │
│              ┌─────────────────────┴─────────────────────┐               │
│              │                                           │               │
│              ▼                                           ▼               │
│   ┌─────────────────────┐                   ┌─────────────────────┐      │
│   │   PASTA EXISTE      │                   │  PASTA NÃO EXISTE   │      │
│   │   (json.id != null) │                   │  (json.id == null)  │      │
│   └──────────┬──────────┘                   └──────────┬──────────┘      │
│              │                                         │                 │
│              ▼                                         ▼                 │
│   ┌─────────────────────┐                   ┌─────────────────────┐      │
│   │   Move file         │                   │  Create folder      │      │
│   │   para pasta        │                   │  com nome assistido │      │
│   │   existente         │                   └──────────┬──────────┘      │
│   └─────────────────────┘                              │                 │
│                                                        ▼                 │
│                                             ┌─────────────────────┐      │
│                                             │   Move file         │      │
│                                             │   para nova pasta   │      │
│                                             └─────────────────────┘      │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### 10.2 APIs do Drive Utilizadas

| Operação | Endpoint | Parâmetros |
|----------|----------|------------|
| **List files** | `GET /drive/v3/files` | `q='folderId' in parents` |
| **Download** | `GET /drive/v3/files/{fileId}?alt=media` | - |
| **Search folders** | `GET /drive/v3/files` | `q=name contains 'X' and mimeType='folder'` |
| **Create folder** | `POST /drive/v3/files` | `{name, mimeType: 'folder', parents: [folderId]}` |
| **Move file** | `PATCH /drive/v3/files/{fileId}` | `addParents={newFolder}&removeParents={oldFolder}` |

### 10.3 Configuração do Polling

```typescript
// Opção 1: Cron job no servidor (recomendado para Vercel)
// Usar Vercel Cron ou API route com proteção

// Opção 2: Trigger manual via UI
// Botão "Processar novos arquivos" na página de Distribuição

// Opção 3: Webhook do Drive (mais complexo, requer domínio verificado)

const POLLING_CONFIG = {
  interval: 5 * 60 * 1000,  // 5 minutos
  folderId: '1dw8Hfpt_NLtLZ8DYDIcgjauo_xtM1nH4',
  maxFilesPerBatch: 10,
};

---

## 11. Plano de Implementação

### Fase 1: Schema e Migração (30min)
- [ ] Adicionar `atribuicaoPrimaria` a `assistidos`
- [ ] Adicionar `driveFolderId` a `assistidos`
- [ ] Rodar migração
- [ ] Atualizar tipos TypeScript

### Fase 2: Funções Utilitárias (30min)
- [ ] Implementar `toTitleCase()` com preposições
- [ ] Implementar `extractFromPdfText()` com regex do n8n
- [ ] Implementar `identificarAtribuicao()` com lógica Camaçari
- [ ] Criar `src/lib/utils/text-extraction.ts`

### Fase 3: Drive API - Operações Básicas (1h)
- [ ] Criar pasta no Drive (`createFolder`)
- [ ] Buscar pasta por nome (`searchFolder`)
- [ ] Mover arquivo (`moveFile`)
- [ ] Listar subpastas (`listSubfolders`)
- [ ] Criar `src/lib/google/drive-operations.ts`

### Fase 4: Assistidos com Tabs (1h)
- [ ] Criar componente de Tabs por atribuição
- [ ] Atualizar query para filtrar por atribuição
- [ ] Adicionar seletor de atribuição no formulário
- [ ] Auto-criar pasta no Drive ao salvar assistido

### Fase 5: Drive Hierárquico (1.5h)
- [ ] Implementar árvore de navegação (collapsible)
- [ ] Criar breadcrumb de navegação
- [ ] Vincular criação de processo → pasta Drive
- [ ] Mostrar contagem de arquivos por pasta

### Fase 6: Detecção de Homonímia (1h)
- [ ] Criar função de busca por similares (Levenshtein)
- [ ] Implementar modal de validação
- [ ] Integrar no fluxo de criação
- [ ] Integrar no fluxo de distribuição

### Fase 7: Distribuição - Backend (2h)
- [ ] Criar router `distribuicao`
- [ ] Implementar listagem da pasta inbox
- [ ] Implementar download + extração de texto (pdf-parse)
- [ ] Implementar extração via regex (padrão n8n)
- [ ] Fallback: Gemini Vision para OCR
- [ ] Implementar lógica de identificação de atribuição

### Fase 8: Distribuição - Frontend (1.5h)
- [ ] Criar UI de inbox (lista de PDFs pendentes)
- [ ] Card de preview com dados extraídos
- [ ] Busca/match de assistido e processo
- [ ] Botões: Confirmar, Editar, Rejeitar
- [ ] Histórico de distribuições

### Fase 9: Distribuição - Automação (1h)
- [ ] Implementar movimentação de arquivos no Drive
- [ ] Criar pastas automaticamente se necessário
- [ ] Registrar documento no banco
- [ ] Cron job / trigger manual para processar novos

### Fase 10: Jurisprudência (2h)
- [ ] Criar router `jurisprudencia`
- [ ] Criar página básica com listagem da pasta
- [ ] Implementar busca por nome/conteúdo
- [ ] Visualizador PDF inline

### Fase 11: Jurisprudência IA (2h)
- [ ] Implementar chat com Gemini
- [ ] Contexto: documentos da pasta
- [ ] Citações de fontes
- [ ] Histórico de conversas

### Fase 12: Visualizações (1h)
- [ ] Integrar skill Excalidraw
- [ ] Mapa mental de teses
- [ ] Timeline jurisprudencial

### Fase 13: Testes e Refinamentos (1h)
- [ ] Testar fluxo completo de distribuição
- [ ] Testar edge cases (nomes parecidos, PDFs sem dados)
- [ ] Documentar APIs

---

## 12. Variáveis de Ambiente Necessárias

```env
# Já configuradas
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REFRESH_TOKEN=...
GOOGLE_AI_API_KEY=...

# Pastas principais
GOOGLE_DRIVE_FOLDER_JURI=1_S-2qdqO0n1npNcs0PnoagBM4ZtwKhk-
GOOGLE_DRIVE_FOLDER_VVD=1fN2GiGlNzc61g01ZeBMg9ZBy1hexx0ti
GOOGLE_DRIVE_FOLDER_EP=1-mbwgP3-ygVVjoN9RPTbHwnaicnBAv0q
GOOGLE_DRIVE_FOLDER_SUBSTITUICAO=1eNDT0j-5KQkzYXbqK6IBa9sIMT3QFWVU

# Pastas especiais (NOVAS)
GOOGLE_DRIVE_FOLDER_JURISPRUDENCIA=1Dvpn1r6b5nZ3bALst9_YEbZHlRDSPw7S
GOOGLE_DRIVE_FOLDER_DISTRIBUICAO=1dw8Hfpt_NLtLZ8DYDIcgjauo_xtM1nH4
```

---

## 13. Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| OCR falha em documentos mal escaneados | Permitir edição manual dos dados |
| Homonímia não detectada | CPF como fallback definitivo |
| Quota do Drive API | Implementar rate limiting |
| Pasta já existe | Verificar antes de criar |
| Documento duplicado | Verificar hash antes de mover |

---

## 14. Métricas de Sucesso

- [ ] 100% dos assistidos têm atribuição primária
- [ ] 100% dos assistidos ativos têm pasta no Drive
- [ ] 100% dos processos ativos têm pasta no Drive
- [ ] Taxa de acerto OCR > 90%
- [ ] Taxa de matching automático > 80%
- [ ] Tempo médio de distribuição < 10s

---

## Aprovação

- [ ] Rodrigo aprovou estrutura de pastas
- [ ] Rodrigo aprovou fluxo de homonímia
- [ ] Rodrigo aprovou formato Title Case
- [ ] Rodrigo aprovou prioridade de implementação
