# OMBUDS Scaling Spec — Camadas Concêntricas

**Data:** 2026-03-28 (v2 — reescrita)
**Timeline:** Semanas por camada
**Autor:** Rodrigo + Claude
**Status:** Draft → Review

---

## 1. Visão Estratégica — Camadas Concêntricas

A expansão segue um modelo de **núcleo que se expande**, não de expansão simultânea. Cada camada solidifica a anterior antes de avançar:

```
┌─────────────────────────────────────────────────────────────┐
│  CAMADA 5 — Família (Camaçari)          [futuro]            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  CAMADA 4 — Cível (Camaçari)         [futuro]      │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │  CAMADA 3 — Criminal Salvador     [futuro]  │    │    │
│  │  │  ┌─────────────────────────────────────┐    │    │    │
│  │  │  │  CAMADA 2 — Criminal RMS       [depois]  │    │    │
│  │  │  │  ┌─────────────────────────────┐    │    │    │    │
│  │  │  │  │  CAMADA 1 — Varas Criminais │    │    │    │    │
│  │  │  │  │  Camaçari (Danilo+Cristiane)│    │    │    │    │
│  │  │  │  │         [AGORA]             │    │    │    │    │
│  │  │  │  ├─────────────────────────────┤    │    │    │    │
│  │  │  │  │  CAMADA 0 — Fundação        │    │    │    │    │
│  │  │  │  │  (testes, CI, infra)        │    │    │    │    │
│  │  │  │  │         [AGORA]             │    │    │    │    │
│  │  │  │  └─────────────────────────────┘    │    │    │    │
│  │  │  └─────────────────────────────────────┘    │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Usuários da Camada 1 (primeira leva)

| Pessoa | Papel | Área | Vinculação |
|--------|-------|------|------------|
| Danilo | Defensor | Varas Criminais Camaçari | — |
| Cristiane | Defensor | Varas Criminais Camaçari | — |
| Estagiário(a) de Danilo | Estagiário | (supervisor: Danilo) | Danilo |
| Estagiário(a) de Cristiane | Estagiário | (supervisor: Cristiane) | Cristiane |
| Renan | Servidor | Compartilhado (Danilo + Cristiane) | — |

**Total após Camada 1:** 9 users (4 atuais + 5 novos). Todos em Camaçari, todos criminal.

---

## 2. Análise: O que falta para Varas Criminais Comuns

O OMBUDS modela bem o **Júri** (12 tabelas, cockpit, jurados, quesitos) e **VVD** (5 tabelas, medidas protetivas). Mas as **Varas Criminais Comuns** — onde atuam Danilo e Cristiane — têm especificidades que o sistema **não modela**:

### 2.1 Institutos despenalizadores (não existem no OMBUDS)

| Instituto | O que é | Dados necessários |
|-----------|---------|-------------------|
| **ANPP** (Acordo de Não Persecução Penal) | Acordo MP-réu para evitar processo. Art. 28-A CPP | Condições do acordo, prazo, status cumprimento, audiência de homologação |
| **Sursis Processual** (Suspensão Condicional) | Suspensão do processo por 2-4 anos. Art. 89 Lei 9.099 | Condições, período de prova, audiência admonitória, revogação |
| **Transação Penal** | Acordo antes da denúncia. Art. 76 Lei 9.099 | Pena alternativa proposta, status, cumprimento |
| **Composição Civil** | Acordo entre partes (JECRIM) | Valor, partes, homologação |

### 2.2 Delitos e tipificação (genérico demais hoje)

O enrichment atual extrai `crime` como string livre e `artigos` como array. Para Varas Criminais precisa:

| Campo | Hoje | Necessário |
|-------|------|------------|
| Tipo penal | String livre | Enum/tabela estruturada (furto, roubo, tráfico, estelionato, lesão corporal, etc.) |
| Artigo + qualificadoras | Array simples | Estrutura: artigo base + incisos + qualificadoras + causas de aumento/diminuição |
| Pena in abstracto | Não existe | Min/max para cálculo de regime e benefícios |
| Regime inicial | Só em júri | Necessário para todos os delitos |
| Possibilidade de ANPP/sursis | Não existe | Cálculo automático baseado em pena mínima + antecedentes |

### 2.3 Fluxos processuais específicos

| Fluxo | Existe? | Precisa |
|-------|---------|--------|
| Audiência de custódia | Parcial (módulo custódia existe) | Integrar com fluxo de Danilo/Cristiane |
| Liberdade provisória | Não | Tracking de pedidos, decisões, condições |
| Habeas corpus | Não | Registro de impetrações, decisões |
| Audiência de instrução (não-júri) | Parcial | Sem a complexidade de quesitos/jurados |
| Sentença + dosimetria | Não | Registro de pena aplicada, regime, detração |
| Recurso de apelação (não-júri) | Não | Diferente do pós-júri (sem soberania dos veredictos) |

### 2.4 O que JÁ serve para Danilo/Cristiane (reusar)

| Módulo | Utilidade | Ajuste necessário |
|--------|-----------|-------------------|
| Assistidos | Total | Já é genérico criminal |
| Processos | Total | Apenas filtrar por atribuição |
| Demandas/Kanban | Total | Pipeline idêntico |
| Documentos | Total | Genérico |
| Drive | Total | Genérico |
| Calendar/Audiências | Parcial | Sem quesitos/jurados, mas base serve |
| Enrichment de PJe | Parcial | Precisa extrair delitos + institutos |
| Radar Criminal | Total | Genérico para qualquer criminal |
| WhatsApp | Total | Genérico |

---

## 3. Arquitetura — Núcleo Criminal Expandido

### 3.1 Nova atribuição: `CRIMINAL_COMUM`

```typescript
// Expandir atribuicaoEnum
export const atribuicaoEnum = pgEnum("atribuicao", [
  "JURI_CAMACARI",
  "VVD_CAMACARI",
  "EXECUCAO_PENAL",
  "SUBSTITUICAO",
  "SUBSTITUICAO_CIVEL",
  "GRUPO_JURI",
  // NOVO:
  "CRIMINAL_CAMACARI",    // Varas Criminais Comuns Camaçari
]);
```

### 3.2 Novas tabelas: Institutos Despenalizadores

```typescript
// schema/institutos.ts (NOVO)

export const institutos = pgTable("institutos", {
  id: serial("id").primaryKey(),
  processoId: integer("processo_id").references(() => processos.id).notNull(),
  assistidoId: integer("assistido_id").references(() => assistidos.id).notNull(),
  tipo: varchar("tipo", { length: 30 }).notNull(),
    // "ANPP", "SURSIS_PROCESSUAL", "TRANSACAO_PENAL", "COMPOSICAO_CIVIL"
  status: varchar("status", { length: 30 }).notNull().default("PROPOSTO"),
    // PROPOSTO, ACEITO, HOMOLOGADO, EM_CUMPRIMENTO, CUMPRIDO,
    // DESCUMPRIDO, REVOGADO, RECUSADO, EXTINTO

  // Condições do acordo
  condicoes: jsonb("condicoes").$type<string[]>(),
    // ["prestação pecuniária R$1.000", "prestação de serviços 60h", ...]

  // Prazos
  dataAcordo: date("data_acordo"),
  dataInicio: date("data_inicio"),        // início do período de prova
  dataFim: date("data_fim"),              // fim do período de prova
  prazoMeses: integer("prazo_meses"),     // duração em meses

  // Audiências vinculadas
  audienciaHomologacaoId: integer("audiencia_homologacao_id"),
  audienciaAdmonitoriaId: integer("audiencia_admonitoria_id"),

  // Valores (quando aplicável)
  valorPrestacao: numeric("valor_prestacao"),
  horasServico: integer("horas_servico"),

  // Acompanhamento
  observacoes: text("observacoes"),
  defensorId: integer("defensor_id").references(() => users.id),
  comarcaId: integer("comarca_id").references(() => comarcas.id).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

### 3.3 Tabela de delitos estruturada

```typescript
// schema/delitos.ts (NOVO)

export const delitos = pgTable("delitos", {
  id: serial("id").primaryKey(),
  processoId: integer("processo_id").references(() => processos.id).notNull(),
  assistidoId: integer("assistido_id").references(() => assistidos.id),

  // Tipificação
  tipoDelito: varchar("tipo_delito", { length: 50 }).notNull(),
    // "furto", "roubo", "trafico", "estelionato", "lesao_corporal",
    // "ameaca", "receptacao", "dano", "homicidio_culposo", etc.
  artigoBase: varchar("artigo_base", { length: 30 }).notNull(),
    // "art. 155 CP", "art. 157 CP", "art. 33 Lei 11.343"
  incisos: jsonb("incisos").$type<string[]>(),
  qualificadoras: jsonb("qualificadoras").$type<string[]>(),
  causasAumento: jsonb("causas_aumento").$type<string[]>(),
  causasDiminuicao: jsonb("causas_diminuicao").$type<string[]>(),

  // Penas
  penaMinima: integer("pena_minima_meses"),   // em meses
  penaMaxima: integer("pena_maxima_meses"),   // em meses
  penaAplicada: integer("pena_aplicada_meses"),
  regimeInicial: varchar("regime_inicial", { length: 20 }),
    // "aberto", "semiaberto", "fechado"

  // Benefícios possíveis (calculados)
  cabeAnpp: boolean("cabe_anpp"),             // pena mínima < 4 anos + sem violência
  cabeSursis: boolean("cabe_sursis"),         // pena mínima <= 1 ano
  cabeTransacao: boolean("cabe_transacao"),   // pena máxima <= 2 anos
  cabeSubstituicao: boolean("cabe_substituicao"), // pena <= 4 anos + sem violência

  // Sentença
  dataSentenca: date("data_sentenca"),
  resultadoSentenca: varchar("resultado_sentenca", { length: 30 }),
    // "condenado", "absolvido", "extinta_punibilidade", "desclassificado"

  observacoes: text("observacoes"),
  comarcaId: integer("comarca_id").references(() => comarcas.id).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

### 3.4 Enrichment expandido para Vara Criminal Comum

O enrichment de PJe precisa extrair não só `crime` genérico, mas:

```typescript
// enrichmentData expandido para criminal comum
type CriminalComunEnrichment = {
  // Existente (manter):
  crime: string;
  artigos: string[];
  qualificadoras: string[];
  fase_processual: string;
  reu_preso_detectado: boolean;
  vara: string;

  // NOVO para criminal comum:
  delitos_detectados: Array<{
    tipo: string;          // "furto", "roubo", etc.
    artigo: string;        // "art. 155, §4º, II CP"
    qualificado: boolean;
    pena_minima_meses: number;
    pena_maxima_meses: number;
  }>;
  instituto_possivel: string | null;
    // "ANPP", "SURSIS_PROCESSUAL", "TRANSACAO_PENAL", null
  motivo_instituto: string | null;
    // "Pena mínima de 1 ano, sem violência, cabível ANPP"
  antecedentes_mencionados: boolean;
  concurso_crimes: string | null;
    // "material", "formal", "continuidade_delitiva"
};
```

### 3.5 UI: módulo Vara Criminal Comum

**Não criar páginas novas.** Adaptar as existentes:

| Página existente | Adaptação |
|------------------|-----------|
| `admin/processos/[id]` | Nova aba "Delitos" (lista tipificações estruturadas) |
| `admin/processos/[id]` | Nova aba "Institutos" (ANPP, sursis, transação) |
| `admin/demandas` | Badge "ANPP possível" / "Sursis possível" quando enrichment detecta |
| `admin/assistidos/[id]` | Seção "Benefícios" com cálculo automático por delito |
| `admin/dashboard` | Card "Institutos em andamento" (ANPPs, sursis ativos, prazos) |

### 3.6 Papel do servidor (Renan)

O `defensor-scope.ts` já trata `servidor` como `"all"` (vê todas as demandas). Mas para Renan, que é compartilhado entre Danilo e Cristiane:

**Opção proposta:** Novo papel `servidor_vinculado` que vê apenas os defensores a quem está vinculado.

```typescript
// Em users: campo JSONB para servidores vinculados
defensoresVinculados: jsonb("defensores_vinculados").$type<number[]>(),
  // [danilo_id, cristiane_id]
```

```typescript
// defensor-scope.ts — expandir
case "servidor":
  if (user.defensoresVinculados?.length) {
    return user.defensoresVinculados; // vê só os vinculados
  }
  return "all"; // backward-compatible: servidores sem vínculo veem tudo
```

---

## 4. Fases de Execução — Camada 0 + Camada 1

### Camada 0 — Fundação (3-4 dias)

**Objetivo:** Tornar o sistema seguro para mudanças.

| # | Task | Entregável | Teste |
|---|------|-----------|-------|
| 0.1 | Remover `ignoreBuildErrors: true` + corrigir erros TS | Build limpo | `npm run build` sem flag |
| 0.2 | Setup vitest + testes de scoping | vitest.config.ts + 10 testes | `npm test` passa |
| 0.3 | Setup CI (GitHub Actions: lint + typecheck + test) | `.github/workflows/ci.yml` | Push → CI verde |
| 0.4 | Substituir in-memory cache por Redis (Upstash) | session + rate-limit | Teste: persiste entre cold starts |
| 0.5 | Aumentar pool DB (5→20) + verificar PgBouncer | Config Supabase | Teste: 10 queries concorrentes |

### Camada 1 — Varas Criminais Camaçari (5-6 dias)

**Objetivo:** Danilo, Cristiane, estagiários e Renan usando o sistema.

| # | Task | Entregável | Teste |
|---|------|-----------|-------|
| **Schema** | | | |
| 1.1 | Migration: adicionar `CRIMINAL_CAMACARI` ao atribuicaoEnum | ALTER TYPE | Teste: enum aceita novo valor |
| 1.2 | Migration: criar tabela `institutos` | Drizzle schema + migration | Teste: CRUD de ANPP/sursis |
| 1.3 | Migration: criar tabela `delitos` | Drizzle schema + migration | Teste: CRUD com tipificação |
| 1.4 | Migration: `defensoresVinculados` JSONB em users | Drizzle migration | Teste: Renan vê só Danilo+Cristiane |
| **Scoping** | | | |
| 1.5 | Expandir defensor-scope para servidor vinculado | `defensor-scope.ts` | 5+ testes: Renan filtra corretamente |
| **Backend** | | | |
| 1.6 | tRPC router: `institutosRouter` (CRUD + status transitions) | Novo router | Testes: criar ANPP, mudar status, listar por processo |
| 1.7 | tRPC router: `delitosRouter` (CRUD + cálculo benefícios) | Novo router | Testes: criar delito, calcular cabimento ANPP/sursis |
| 1.8 | Expandir enrichment PJe para detectar delitos + institutos | Prompt + endpoint | Teste: texto PJe → delitos detectados + instituto possível |
| **Frontend** | | | |
| 1.9 | Aba "Delitos" na página de processo | `processos/[id]` | Teste: lista tipificações, calcula benefícios |
| 1.10 | Aba "Institutos" na página de processo | `processos/[id]` | Teste: criar ANPP, acompanhar status |
| 1.11 | Badge "ANPP/Sursis possível" no kanban de demandas | `demandas/` | Teste: badge aparece quando enrichment detecta |
| 1.12 | Card "Institutos em andamento" no dashboard | `admin/dashboard` | Teste: conta ANPPs ativos, sursis em curso |
| **Onboarding** | | | |
| 1.13 | Criar users: Danilo, Cristiane, estagiários, Renan | Script + seed | Teste: login funciona, scoping correto |
| 1.14 | Documentação de onboarding | `docs/onboarding.md` | Review |

---

## 5. Preparação para Camadas Futuras

Cada camada prepara a seguinte sem implementá-la:

### Camada 1 → prepara Camada 2 (Criminal RMS)

O que a Camada 1 já entrega que facilita a expansão para RMS:
- `comarcaId` em todas as tabelas (já existe)
- `comarca-scope.ts` com filtro RMS (já existe)
- `CRIMINAL_CAMACARI` como atribuição separada → padrão para `CRIMINAL_SIMOES_FILHO` etc.
- Tabelas `institutos` e `delitos` com `comarcaId` (genéricas por design)

**O que falta na Camada 2:**
- Seed das novas comarcas (Simões Filho, Lauro de Freitas, etc.)
- Novos valores no atribuicaoEnum
- Onboarding dos defensores
- Configuração Drive/Calendar por comarca

### Camada 2 → prepara Camada 3 (Criminal Salvador)

Salvador é maior e pode ter particularidades:
- Mais varas criminais (1ª, 2ª, 3ª... Vara Criminal)
- Possível necessidade de filtro por vara dentro da comarca
- Volume significativamente maior

**O que considerar na Camada 1:**
- Garantir que o modelo suporta N varas por comarca (campo `vara` já existe em processos)

### Camada 3 → prepara Camada 4 (Cível)

A transição para cível exige:
- `areaEnum` como filtro (já existe, apenas não usado)
- `areas_principais` JSONB em users
- UI condicional por área (sidebar, formulários)
- Enrichment com pipelines separados por domínio

**Decisão: quando implementar o area-scope?**
- **Na Camada 1?** Não. Seria overengineering — todos são criminal.
- **Na Camada 3 (Salvador)?** Talvez, se Salvador tiver defensores multi-área.
- **Na Camada 4 (Cível)?** Sim, obrigatório. É quando o conceito de área jurídica se torna necessário.

### Camada 4 → prepara Camada 5 (Família)

Família é o maior desafio por:
- Volume altíssimo (centenas de processos por defensor)
- Especificidades (guarda, alimentos, divórcio, inventário)
- Menores envolvidos (proteção especial de dados)
- Possível necessidade de módulo próprio (como Júri tem)

**Considerar na Camada 4:**
- Infraestrutura de módulos por área (plugin system leve)
- Performance do banco com volume cível + família

---

## 6. O que NÃO fazer agora

| Tentação | Por que não | Quando |
|----------|------------|--------|
| Criar area-scope.ts | Todos são criminal. Desnecessário até Camada 4 | Camada 4 |
| Sidebar dinâmica por área | Idem | Camada 4 |
| Campos condicionais por área | Idem | Camada 4 |
| Multi-tenancy / organisationId | 9 users em 1 comarca | Nunca (nessa escala) |
| Enrichment cível/família | Não há defensores cíveis | Camada 4/5 |
| Novas comarcas | Primeiro solidificar Camaçari | Camada 2 |
| Microserviços | Complexidade desnecessária | Nunca (nessa escala) |

---

## 7. Riscos e Mitigações

| Risco | Prob. | Impacto | Mitigação |
|-------|-------|---------|-----------|
| TypeScript errors ao remover ignoreBuildErrors | ALTA | Bloqueia Camada 0 | Budget 1 dia extra, @ts-expect-error para não-bloqueantes |
| Danilo/Cristiane não adotam o sistema | ALTA | Expansão morre | Onboarding presencial, começar com demandas (kanban) que é intuitivo |
| ANPP/sursis mal modelados | MÉDIA | Retrabalho | Validar modelo com Danilo/Cristiane antes de implementar |
| Enrichment não detecta delitos com precisão | MÉDIA | IA inútil | Testar com 10+ textos PJe reais antes de habilitar |
| Renan (servidor) precisa de permissões diferentes | BAIXA | Scoping errado | Validar com Renan o que ele precisa ver/fazer |

---

## 8. Métricas de Sucesso — Camada 1

| Métrica | Target |
|---------|--------|
| Build sem `ignoreBuildErrors` | Camada 0 completa |
| Cobertura testes scoping | > 80% |
| Danilo e Cristiane logam e criam demandas | Semana 2 |
| ANPP/Sursis registrados no sistema (vs planilha/caderno) | Semana 3 |
| Enrichment detecta delito + instituto possível | Semana 3 |
| Zero vazamento entre Danilo↔Cristiane (quando desejado) | Teste unitário |
| Renan vê dados de Danilo+Cristiane, não de Rodrigo/Juliane | Teste unitário |

---

## 9. Estimativa — Camadas 0+1

| Fase | Dias | Dependência |
|------|------|-------------|
| Camada 0 — Fundação | 3-4 | Nenhuma |
| Camada 1 — Schema + scoping | 2 | Camada 0 |
| Camada 1 — Backend (routers + enrichment) | 2 | Schema |
| Camada 1 — Frontend (abas + badges + dashboard) | 2 | Backend |
| Camada 1 — Onboarding + testes | 1 | Frontend |
| **Total Camadas 0+1** | **~10-11 dias úteis** | **~2 semanas** |

---

## 10. Jira — Epic SCRUM-67

Stories existentes (SCRUM-68 a SCRUM-82) serão atualizadas para refletir a nova estratégia de camadas concêntricas. Stories de Camada 4/5 (cível/família) serão movidas para icebox.
