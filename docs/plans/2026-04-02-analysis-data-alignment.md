# Plano: Alinhamento Dossiê Defender → Banco → Interface

> Data: 02/04/2026
> Contexto: O Padrão Defender v2 gera dossiês com ~25 campos ricos, mas o schema `analysis_data`
> no banco e a interface só aproveitam ~5. A interface (AnaliseHub) já tem componentes prontos
> para dados ricos, mas não recebe esses dados porque o schema intermediário é limitado.

---

## Diagnóstico: 3 camadas

```
DOSSIÊ (.docx/.pdf)          BANCO (analysis_data JSONB)        INTERFACE (AnaliseHub)
25+ campos ricos        →    ~8 campos genéricos           →    8 sub-tabs (parcialmente vazias)
```

### A boa notícia
A interface (AnaliseHub) já aceita:
- `pessoas[]` com qualificação, status intimação, favorável à defesa
- `depoimentos[]` com fase policial, judicial, contradições, credibilidade, perguntas sugeridas
- `cronologia[]` com data, evento, fonte
- `teses` com principal + subsidiárias
- `nulidades[]` com severidade + fundamentação
- `matrizGuerra[]` (pontos fortes/fracos)
- `inventarioProvas[]`, `laudos[]`, `mapaDocumental[]`
- `imputacoes[]` com artigo, pena, qualificadoras, atenuantes
- `alertas[]`, `checklistTatico[]`, `orientacaoAssistido`
- `perguntasEstrategicas[]` por testemunha
- `radarLiberdade` (urgência)
- `calculoPena`, `mpu`, `contextoRelacional`

**O gargalo é o schema `analysis_data` no banco** — campo JSONB sem tipagem suficiente.

---

## Plano de Execução

### ETAPA 1: Expandir o schema `analysis_data` (banco)

O campo `analysis_data` é JSONB — não precisa de migration SQL. Basta expandir a tipagem TypeScript.

**Arquivo**: `src/lib/db/schema/core.ts`

Novo type para `processos.analysisData`:

```typescript
analysisData: jsonb("analysis_data").$type<AnalysisDataV2>()

interface AnalysisDataV2 {
  // === VERSÃO / META ===
  schemaVersion: "2.0";
  atribuicao: string;           // JURI_CAMACARI, VVD_CAMACARI, etc.
  faseProcessual: string;       // "instrucao", "ra", "plenario", "pronuncia", "execucao", "justificacao"
  geradoEm: string;             // ISO date
  versaoModelo?: string;

  // === PARTE I: VISÃO GERAL ===
  resumo: string;                       // Resumo executivo (3 parágrafos)
  crimePrincipal: string;               // "Art. 129, §13, CP"
  estrategia: string;                   // Linha de defesa em 1 parágrafo
  narrativaDefensiva?: string;          // "A história" da defesa

  kpis: {
    // KPIs dinâmicos — variam por atribuição/fase
    items: Array<{ label: string; valor: string | number; destaque?: boolean }>;
  };

  contatos?: Array<{ papel: string; nome: string; telefone?: string; email?: string }>;
  prazos?: Array<{ descricao: string; data: string; status: "pendente" | "vencido" | "cumprido" }>;

  // === PARTE II: O CASO ===
  pessoas: Array<{
    nome: string;
    tipo: "REU" | "VITIMA" | "TESTEMUNHA" | "FAMILIAR" | "PERITO" | "POLICIAL" | "OUTRO";
    papel: string;
    cpf?: string;
    dataNascimento?: string;
    idade?: number;
    profissao?: string;
    endereco?: string;
    telefone?: string;
    antecedentes?: string;
    relacaoFatos?: string;
    preso?: boolean;
    unidadePrisional?: string;
    statusIntimacao?: "intimado" | "em_curso" | "frustrada" | "sem_diligencia" | "dispensado";
    dataIntimacao?: string;
    delegacia?: boolean;
    juizo?: boolean;
    favoravelDefesa?: boolean | null;
    perguntasSugeridas?: string[];
  }>;

  imputacoes?: Array<{
    crime: string;
    artigo: string;
    penaAbstrata?: string;
    qualificadoras?: string[];
    agravantes?: string[];
    atenuantes?: string[];
    favoravelDefesa?: boolean | null;
    observacao?: string;
  }>;

  cronologia: Array<{
    data: string;
    evento: string;
    tipo?: "flagrante" | "processual" | "favoravel" | "neutro" | "audiencia";
    fonte?: string;
  }>;

  // === VVD-específico ===
  medidasProtetivas?: Array<{ medida: string; desde: string; status: string }>;
  posturaOfendida?: { delegacia?: string; custodia?: string; seguranca?: string; audiencia?: string };
  contextoRelacional?: { duracao?: string; filhos?: string; separados?: boolean; disputas?: string };

  // === EP-específico ===
  execucao?: {
    penaAplicada?: string;
    regimeAtual?: string;
    beneficiosPendentes?: string[];
    detracaoDias?: number;
    proximaProgressao?: string;
  };

  // === Júri-específico ===
  ritoBifasico?: { faseAtual?: string; quesitosPropostos?: string[]; observacoes?: string };
  preparacaoPlenario?: { roteiro?: string; replicas?: string; treplicas?: string };

  // === PARTE III: PROVA ===
  depoimentos: Array<{
    nome: string;
    tipo: "testemunha" | "familiar" | "perito" | "vitima" | "policial";
    resumo: string;
    fasePolicial?: string;
    faseJudicial?: string;
    impactoAcusacao?: string;
    impactoDefesa?: string;
    credibilidade?: string;
    favoravelDefesa: boolean | null;
    contradicoes: Array<{ delegacia?: string; juizo?: string; contradicao?: string }>;
    perguntasSugeridas?: string[];
    trechosRelevantes?: string[];
  }>;

  inventarioProvas?: Array<{
    descricao: string;
    tipo?: "documental" | "testemunhal" | "pericial" | "material";
    status: "presente" | "ausente" | "incerto" | "pendente";
    relevancia?: "alta" | "media" | "baixa";
    favoravelDefesa?: boolean | null;
    observacao?: string;
  }>;

  laudos?: Array<{
    tipo: string;
    perito?: string;
    data?: string;
    conclusao: string;
    pontosChave?: string[];
    favoravelDefesa?: boolean | null;
  }>;

  fragilidades: Array<{
    descricao: string;
    severidade: "critico" | "alto" | "medio";
    detalhe?: string;
  }>;

  // === PARTE IV: ESTRATÉGIA ===
  teses: {
    principal: string;
    subsidiarias: string[];
    detalhadas?: Array<{
      nome: string;
      fundamento: string;
      elementos: string;
      riscos: string;
      viabilidade: "alta" | "media" | "baixa";
    }>;
  };

  nulidades: Array<{
    tipo: string;
    descricao: string;
    severidade: "alta" | "media" | "baixa";
    fundamentacao?: string;
  }>;

  matrizGuerra: Array<{
    ponto: string;
    tipo: "forte" | "fraco";
    categoria?: string;
  }>;

  dosimetria?: {
    penaBase?: string;
    atenuantes?: string[];
    agravantes?: string[];
    regime?: string;
    substituicao?: string;
    sursis?: string;
    detracaoDias?: number;
    penaFinalEstimada?: string;
  };

  riscos?: Array<{
    descricao: string;
    probabilidade: "alta" | "media" | "baixa";
    impacto: "alto" | "medio" | "baixo";
    mitigacao: string;
  }>;

  // === PARTE V: AUDIÊNCIA ===
  perguntasEstrategicas?: Array<{
    testemunha: string;
    perguntas: Array<{ pergunta: string; objetivo?: string }>;
  }>;

  orientacaoAssistido?: string;
  requerimentosOrais?: string[];
  protocoloDia?: string[];

  // === PARTE VI: CENÁRIOS ===
  cenarios?: Array<{
    tipo: "absolvicao" | "condenacao" | "desclassificacao" | "outro";
    descricao: string;
    providencias: string[];
  }>;

  // === PARTE VII: PROVIDÊNCIAS ===
  providencias?: {
    urgentes: Array<{ item: string; concluido: boolean }>;
    audiencia: Array<{ item: string; concluido: boolean }>;
    pos: Array<{ item: string; concluido: boolean }>;
  };

  // === LEGADO (manter compatibilidade) ===
  achadosChave?: string[];
  recomendacoes?: string[];
  inconsistencias?: string[];
  radarLiberdade?: { status: string; detalhes: string; urgencia: string };
  saneamento?: { pendencias: string[]; status: string };
  alertas?: Array<{ tipo: string; texto: string }>;
  checklistTatico?: string[];
}
```

### ETAPA 2: Atualizar o prompt do /api/analyze

O `/api/analyze` precisa instruir o worker a gravar no formato `AnalysisDataV2`.
Adicionar no prompt a estrutura JSON esperada com exemplos.

### ETAPA 3: Atualizar o AnaliseHub e sub-componentes

Os componentes já aceitam a maioria dos campos. Ajustes pontuais:

| Componente | O que adicionar |
|---|---|
| `analise-resumo.tsx` | KPIs dinâmicos (items[]) em vez de fixos. Narrativa defensiva. Prazos. |
| `analise-partes.tsx` | Contexto relacional. MPUs vigentes. Postura da ofendida (VVD). |
| `analise-depoimentos.tsx` | Já aceita fase_policial/judicial, credibilidade, trechos. OK. |
| `analise-timeline.tsx` | Adicionar tipo do evento (cor). Já funciona com {data, evento}. |
| `analise-teses.tsx` | Adicionar viabilidade visual (■□). Dosimetria. Matriz de riscos. |
| `analise-provas.tsx` | Inventário com status (✔/❌/⚠️/❓). Já aceita. OK. |
| `analise-imputacoes.tsx` | Já aceita imputações com artigo/pena. OK. |
| **NOVO: analise-audiencia.tsx** | Sub-tab para: perguntas, orientação, protocolo, requerimentos |
| **NOVO: analise-cenarios.tsx** | Sub-tab para: cenários + providências com checklist |

### ETAPA 4: Alinhar _analise_ia.json

O schema do JSON salvo na pasta do Drive deve espelhar `AnalysisDataV2`.

---

## Especificidade por Atribuição e Fase

### O que muda por atribuição

| Campo | Júri | VVD | EP | Criminal |
|---|---|---|---|---|
| `medidasProtetivas` | — | ✅ Obrigatório | — | Opcional |
| `posturaOfendida` | — | ✅ Obrigatório | — | — |
| `contextoRelacional` | — | ✅ Obrigatório | — | — |
| `ritoBifasico` | ✅ Obrigatório | — | — | — |
| `preparacaoPlenario` | ✅ Se plenário | — | — | — |
| `execucao` | — | — | ✅ Obrigatório | — |
| `dosimetria` | ✅ | ✅ | ✅ (detração) | ✅ |
| `riscos` (matriz 2D) | ✅ | ✅ | ✅ | ✅ |
| `perguntasEstrategicas` | ✅ | ✅ | — | ✅ |
| `cenarios` | ✅ (por quesito) | ✅ | ✅ (benefícios) | ✅ |

### O que muda por fase processual

| Campo | Flagrante/Custódia | RA | Instrução | Pronúncia | Plenário | Execução |
|---|---|---|---|---|---|---|
| `radarLiberdade` | ✅ Urgente | — | — | — | — | — |
| `depoimentos` (fase policial) | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `depoimentos` (fase judicial) | — | — | ✅ | ✅ | ✅ | — |
| `perguntasEstrategicas` | — | — | ✅ | — | ✅ | — |
| `orientacaoAssistido` | ✅ (custódia) | — | ✅ | — | ✅ | — |
| `ritoBifasico` | — | — | — | ✅ | — | — |
| `preparacaoPlenario` | — | — | — | — | ✅ | — |
| `dosimetria` | — | — | ✅ | — | ✅ | ✅ |
| `execucao` | — | — | — | — | — | ✅ |
| `medidasProtetivas` (VVD) | ✅ | ✅ | ✅ | — | — | — |
| `cenarios` | ✅ (converter prisão?) | — | ✅ | ✅ | ✅ | ✅ |

### Campos que NUNCA devem ser gerados quando não aplicáveis

- `preparacaoPlenario` em caso que não é Júri
- `execucao` em caso que não é EP
- `medidasProtetivas` em caso Criminal Comum sem VD
- `depoimentos.faseJudicial` se ainda não houve instrução
- `dosimetria` em fase de flagrante (não faz sentido projetar pena)
- `perguntasEstrategicas` em EP (não há audiência de instrução)

---

## Sub-tabs da interface por contexto

A AnaliseHub deve mostrar/ocultar sub-tabs conforme o conteúdo:

| Sub-tab | Quando mostrar |
|---|---|
| Resumo | Sempre |
| Partes | Sempre (se pessoas[].length > 0) |
| Depoimentos | Se depoimentos[].length > 0 |
| Timeline | Se cronologia[].length > 0 |
| Teses | Se teses existe |
| Provas | Se inventarioProvas ou laudos existem |
| Acusação | Se imputacoes ou ritoBifasico existem |
| Mapa | Se locais[].length > 0 |
| **Audiência** (NOVO) | Se perguntasEstrategicas ou orientacaoAssistido existem |
| **Cenários** (NOVO) | Se cenarios ou providencias existem |

---

## Prioridade de implementação

1. **Expandir tipagem** `AnalysisDataV2` no schema (sem migration SQL — é JSONB)
2. **Atualizar prompt** do `/api/analyze` para gravar no formato v2
3. **Criar 2 componentes** novos: `analise-audiencia.tsx` e `analise-cenarios.tsx`
4. **Atualizar** `analise-resumo.tsx` (KPIs dinâmicos, narrativa)
5. **Atualizar** `analise-teses.tsx` (viabilidade visual, dosimetria, riscos)
6. **Atualizar** `analise-hub.tsx` (novas sub-tabs)
7. **Alinhar** `_analise_ia.json` schema com v2

Estimativa: ~8-10 arquivos tocados, sem SQL migration.
