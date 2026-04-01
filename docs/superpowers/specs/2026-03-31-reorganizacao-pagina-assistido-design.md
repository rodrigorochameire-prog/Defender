# Design: Reorganização da Página de Assistido

> Spec gerada em 31/03/2026 — validada via brainstorming colaborativo

---

## 1. Contexto e Motivação

A página de assistido acumula 7+ botões de ação (Cowork, Sonnet, Exportar, Importar, Analisar Autos, Gerar Peça, Feedback Estagiário) com fluxos fragmentados: clipboard manual, worker Python, API paga, importação do Drive. O defensor fica perdido.

**Objetivo:** simplificar para 2 botões, unificar o motor de análise via `claude -p` ($0), criar uma aba de Análise rica que reflita a profundidade das skills jurídicas, e permitir que tudo funcione tanto em local quanto em produção (via bridge Supabase Realtime → Mac Mini).

---

## 2. Decisões de Design

### 2.1 Barra de Ações — de 7+ para 2

| Botão | Estilo | Função |
|-------|--------|--------|
| **Analisar** | emerald, principal | Dispara `claude -p` via bridge → resultado na aba Análise |
| **Promptório** | zinc/secondary | Modal: seletor de tipo + campo de texto + copiar prompt |

**Removidos:** Cowork, Sonnet (custo desnecessário), Exportar (o `claude -p` já gera PDF/Markdown no Drive), Importar (auto-import fecha o ciclo), 3 botões de clipboard avulsos (absorvidos pelo Promptório).

### 2.2 Promptório (Modal)

- Dropdown para selecionar tipo de instrução: Analisar Autos, Gerar Peça, Feedback Estagiário, Preparar Audiência, Análise Júri
- Campo de texto opcional para personalizar a instrução (ex: "Foque nas contradições do depoimento da vítima")
- Botão "Copiar" copia prompt montado com contexto do caso (nome, processo, vara, atribuição)
- Uso: quando o defensor quer rodar manualmente no Claude Code com controle total

### 2.3 Abas da Página

| Aba | Conteúdo | Status |
|-----|----------|--------|
| Visão Geral | Dados pessoais, status prisional, Solar | Existe |
| Processos | Lista de processos com hierarquia caso→processos | Refatorar |
| **Análise** | Briefing estratégico rico, por caso/processo referência | **Nova** |
| **Investigação Defensiva** | Linhas de investigação, testemunhas a buscar, OSINT, provas a produzir | **Renomear** (ex-Inteligência) |
| Demandas | Intimações, prazos | Existe |
| Audiências | Datas, preparação | Existe |

### 2.4 Progresso da Análise

- Botão muda para "Analisando..." com spinner ao disparar
- Texto curto abaixo atualiza a etapa: "Lendo autos...", "Analisando depoimentos...", "Identificando teses...", "Gerando relatório..."
- Etapa atualizada via campo `etapa` na tabela `claude_code_tasks`, frontend escuta via Supabase Realtime
- Ao concluir: toast "Análise concluída" + aba Análise atualiza automaticamente

---

## 3. Arquitetura: Bridge Vercel ↔ Mac Mini

### 3.1 Fluxo

```
Qualquer dispositivo (Vercel, celular, outro PC)
  → Clica "Analisar"
  → INSERT claude_code_tasks (status: pending)
  → Supabase Realtime notifica Mac Mini
  → Daemon local recebe task
  → Busca arquivos do Drive via API (usando driveFolderId do caso)
  → Roda claude -p com skill + contexto
  → Atualiza etapa periodicamente
  → Ao concluir: salva resultado no banco + gera PDF/Markdown no Drive
  → Supabase Realtime notifica frontend
  → Aba Análise atualiza
```

### 3.2 Tabela `claude_code_tasks`

```sql
CREATE TABLE claude_code_tasks (
  id SERIAL PRIMARY KEY,
  assistido_id INTEGER NOT NULL REFERENCES assistidos(id),
  processo_id INTEGER REFERENCES processos(id),
  caso_id INTEGER REFERENCES casos(id),
  skill TEXT NOT NULL,
  prompt TEXT NOT NULL,
  instrucao_adicional TEXT,          -- texto do Promptório (se veio de lá)
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | processing | completed | failed
  etapa TEXT,                        -- "Lendo autos...", "Identificando teses..."
  resultado JSONB,                   -- análise estruturada completa
  erro TEXT,                         -- mensagem de erro (se falhou)
  created_by INTEGER NOT NULL REFERENCES users(id),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.3 Daemon Local (Node.js, ~80 linhas)

- Roda no Mac Mini via launchd (inicia com o sistema, reinicia em crash)
- Conecta no Supabase Realtime, escuta INSERT em `claude_code_tasks`
- Ao reconectar, busca todas as tasks `pending` (catch-up)
- Para cada task:
  1. Lock otimista: `UPDATE SET status='processing' WHERE id=X AND status='pending' RETURNING *`
  2. Busca `driveFolderId` do caso no banco
  3. Baixa arquivos da pasta via Google Drive API → `/tmp/claude-task-{id}/`
  4. Resolve caminho absoluto do `claude` (cache no startup via `which claude`)
  5. Spawna: `claude -p --system-prompt-file <skill> --add-dir /tmp/claude-task-{id}/ '<prompt>'`
  6. Monitora stdout, atualiza `etapa` no banco a cada 30s
  7. Timeout: 10 minutos, mata processo se ultrapassar
  8. Parseia resultado (JSON do stdout)
  9. Salva `resultado` no banco, marca `status='completed'`
  10. Gera PDF + Markdown no Drive (via Drive API, na pasta do caso)
  11. Limpa `/tmp/claude-task-{id}/`
- Se falhar: marca `status='failed'`, salva `erro`

### 3.4 Proteções

| Problema | Solução |
|----------|---------|
| Mac Mini offline | Tasks ficam `pending`, processam ao reconectar. Frontend mostra "Aguardando processamento" |
| Conexão Realtime cai | Reconnect automático + catch-up de tasks pendentes |
| `claude -p` trava | Timeout 10min + kill. Heartbeat: se `etapa` não atualiza por 2min, frontend avisa |
| Task duplicada (2x clique) | Verifica se já existe `pending`/`processing` para mesmo `caso_id`. Se sim, retorna existente |
| Dois daemons simultâneos | Lock otimista no UPDATE impede que dois peguem a mesma task |
| Output malformado | Parser em 3 camadas: JSON.parse direto → regex extração → salva raw + status `needs_review` |
| Drive não acessível | Verifica existência da pasta antes de disparar. Erro claro se não encontrar |
| Claude CLI não instalado | Health check no startup (`which claude`). Se ausente, log de erro e rejeita tasks |
| Produção sem CLI | Botão "Analisar" funciona normalmente (cria task no banco). Se Mac Mini não estiver online, mostra "Aguardando processamento — computador de análise precisa estar online" |

---

## 4. Modelo de Dados — Hierarquia de Processos

### 4.1 Nova tabela `casos`

```sql
CREATE TABLE casos (
  id SERIAL PRIMARY KEY,
  assistido_id INTEGER NOT NULL REFERENCES assistidos(id) ON DELETE CASCADE,
  processo_referencia_id INTEGER REFERENCES processos(id),  -- a AP principal
  drive_folder_id TEXT,              -- pasta deste caso no Drive
  foco TEXT,                         -- "Homicídio qualificado", "Tráfico"
  narrativa_denuncia TEXT,           -- resumo da denúncia do MP
  analysis_data JSONB,               -- análise rica (schema seção 5)
  analysis_status VARCHAR(20),       -- pending | completed | failed
  analyzed_at TIMESTAMPTZ,
  analysis_version INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 4.2 Alterações na tabela `processos`

```sql
ALTER TABLE processos
  ADD COLUMN tipo_processo VARCHAR(30) DEFAULT 'AP',
  -- valores: AP, IP, APF, CARTA_PRECATORIA, EXECUCAO, RECURSO, OUTRO
  ADD COLUMN is_referencia BOOLEAN DEFAULT false,
  ADD CONSTRAINT fk_caso FOREIGN KEY (caso_id) REFERENCES casos(id);
```

### 4.3 Classificação Progressiva de Processos

Os processos são classificados por múltiplas fontes, em ordem de confiança:

| Fonte | Quando | O que classifica |
|-------|--------|-----------------|
| **Cadastro manual** | Defensor cria processo | Marca tipo e caso. Dado mais confiável |
| **Importação PJe** | Scraping de intimações/pauta | Classe processual → tipo (AP, IP). Metadados associam ao caso |
| **Nomes de arquivo no Drive** | Ao vincular pasta | Número dos autos no nome do PDF → match com processo. Prefixo de tipo se presente |
| **Claude Code (análise)** | Durante processamento | Lê autos, infere hierarquia pelo conteúdo. Sugere agrupamento |
| **Confirmação manual** | Quando há dúvida | Interface mostra sugestão do Claude, defensor confirma ou ajusta |

---

## 5. Schema de Análise Rica (`analysis_data` do caso)

### Bloco 1: O Caso

```typescript
caso: {
  resumoFato: string;                    // narrativa do que aconteceu (todas as fontes)
  narrativaDenuncia: string;             // versão do MP
  narrativaDefensiva: string;            // versão que a defesa pode construir
  cronologia: Array<{
    data: string;
    evento: string;
    fonte: string;                       // "IP", "testemunha X", "laudo"
    relevancia: string;
  }>;
  fatosRelacionados: Array<{
    descricao: string;
    conexaoComCaso: string;
    fonte: string;
  }>;
}
```

### Bloco 2: Pessoas

```typescript
pessoas: {
  perfilReu: {
    historico: string;                   // contexto social, familiar
    contextoSocial: string;
    antecedentes: Array<{processo: string, crime: string, resultado: string}>;
    condicoesAtenuantes: string[];
    versaoDosFatos: string;              // o que o réu diz que aconteceu
  };
  perfilVitima: {
    relacaoComReu: string;
    historico: string;
    comportamentoRelatado: string;       // o que dizem sobre a vítima
    credibilidade: string;
  };
  depoentes: Array<{
    nome: string;
    tipo: "ACUSACAO" | "DEFESA" | "INFORMANTE" | "VITIMA" | "PERITO";
    statusIntimacao: "INTIMADO" | "NAO_INTIMADO" | "DESISTIDO" | "PENDENTE" | "FALECIDO" | "NAO_LOCALIZADO";
    perfil: string;                      // quem é essa pessoa, relação com o caso
    versaoDelegacia: string;
    versaoJuizo: string;
    contradicoes: string[];
    pontosFortes: string[];              // o que favorece a defesa
    pontosFracos: string[];              // o que desfavorece
    perguntasSugeridas: string[];
    credibilidade: string;              // avaliação da confiabilidade
  }>;
  informantes: Array<{                   // informativos de investigação, relatórios policiais
    fonte: string;
    conteudo: string;
    confiabilidade: string;
    informacoesRelevantes: string[];
    conexaoComCaso: string;
  }>;
}
```

### Bloco 3: Provas

```typescript
provas: {
  elementosInquisitoriais: Array<{       // produzidos na fase policial
    tipo: string;
    descricao: string;
    origem: string;
    peso: "alto" | "medio" | "baixo";
    contestavel: boolean;
    argumento: string;                   // por que/como contestar
  }>;
  elementosProbatorios: Array<{          // produzidos em juízo
    tipo: string;
    descricao: string;
    origem: string;
    peso: "alto" | "medio" | "baixo";
    favoravel: boolean;
    contestavel: boolean;
  }>;
  provasPericiais: Array<{
    tipo: string;                        // "laudo cadavérico", "exame toxicológico"
    perito: string;
    conclusao: string;
    pontoCritico: string;               // onde a defesa pode questionar
    contestacao: string;                 // argumento técnico contra
  }>;
  provasDocumentais: Array<{
    documento: string;
    conteudo: string;
    relevancia: string;
    favoravel: boolean;
  }>;
  informativosInvestigacao: Array<{
    fonte: string;                       // "RO", "informativo policial", "relatório DRACO"
    dataApuracao: string;
    conteudo: string;
    informacoesRelevantes: string[];
    credibilidade: string;
  }>;
  possibilidadesProbatorias: Array<{     // o que a defesa ainda pode requerer
    diligencia: string;
    objetivo: string;
    fundamento: string;
    urgencia: "alta" | "media" | "baixa";
  }>;
}
```

### Bloco 4: Estratégia

```typescript
estrategia: {
  tesePrincipal: {
    tese: string;
    fundamentoFatico: string;
    fundamentoJuridico: string;
    elementosQueCorroboram: string[];    // provas/depoimentos que sustentam
  };
  tesesSubsidiarias: Array<{
    tese: string;
    fundamento: string;
    quandoUsar: string;                  // em que cenário priorizar esta
  }>;
  nulidades: Array<{
    tipo: string;
    descricao: string;
    severidade: "alta" | "media" | "baixa";
    fundamentacao: string;
  }>;
  qualificadoras: Array<{
    tipo: string;
    imputada: boolean;
    contestavel: boolean;
    argumento: string;
  }>;
  pontosFortes: {
    defesa: Array<{ponto: string; elementos: string[]}>;    // o que temos a favor + quais provas/depoimentos sustentam
    acusacao: Array<{ponto: string; elementos: string[]}>;   // o que o MP tem de sólido
  };
  pontosFracos: {
    defesa: Array<{ponto: string; mitigacao: string}>;       // onde estamos vulneráveis + como contornar
    acusacao: Array<{ponto: string; comoExplorar: string}>;  // onde a acusação é frágil + como atacar
  };
  matrizGuerra: Array<{
    fato: string;
    versaoAcusacao: string;
    versaoDefesa: string;
    elementosDeProva: string[];
    contradicoes: string[];
  }>;
}
```

### Bloco 5: Operacional

```typescript
operacional: {
  quesitos: Array<{                     // se júri
    texto: string;
    estrategia: string;
  }>;
  orientacaoAoAssistido: string;        // postura, interrogatório
  informacoesAtendimento: Array<{
    data: string;
    conteudo: string;
    relevanciaParaCaso: string;
  }>;
  pontosCriticos: Array<{
    ponto: string;
    risco: string;
    mitigacao: string;
  }>;
}
```

### Metadados

```typescript
_metadata: {
  analisadoEm: string;                  // ISO 8601
  skill: string;                        // qual skill gerou
  versaoSchema: "2.0";
  documentosAnalisados: Array<{nome: string, tipo: string}>;
  modeloUtilizado: string;
}
```

### Mapeamento Skills → Blocos

| Skill | Blocos que alimenta |
|-------|-------------------|
| **analise-audiencias** | Pessoas (depoentes, contradições, perguntas), Provas (possibilidades, nulidades), Operacional (orientação) |
| **juri** | Estratégia (matriz guerra, qualificadoras, teses plenário), Operacional (quesitos, orientação), Caso (narrativas) |
| **criminal-comum** | Estratégia (teses, nulidades), Operacional (urgência), Pessoas (perfil réu) |
| **vvd** | Caso (tipo violência, MPU), Pessoas (perfis, relação), Estratégia (teses) |
| **execucao-penal** | Caso (regime, pena, prescrição), Provas (documentais, intimação), Operacional |
| **citacao-depoimentos** | Pessoas (versões), Provas (elementos probatórios) — citações seguras |
| **linguagem-defensiva** | Permeia todo o relatório — tom estratégico adequado |

---

## 6. Aba Análise — Apresentação

### Layout por caso

A aba mostra seletor de caso (quando o assistido tem múltiplas APs):

```
┌──────────────────────────────────────────────────────────┐
│  [0501234-56.2024 · Homicídio Qualif.]  [0507890-12.2023 · Tráfico]  │
│                                                                       │
│  Processos associados: IP 0501234-56.2024, APF 0509999-00.2024       │
│  Analisado em 28/03/2026 · 12 documentos · via analise-audiencias     │
└──────────────────────────────────────────────────────────┘
```

### Navegação por blocos

Cada bloco é uma seção colapsável. O conteúdo é **estratégico e contextualizado** — não é um formulário de campos, é um briefing que conecta elementos entre si, correlaciona informações de atendimentos com provas, e apresenta tudo na perspectiva do trabalho da defesa.

```
◉ O Caso ─────────────────────────────────────────
  Resumo narrativo fluido contextualizando o fato (todas as fontes)

  ▸ Versão da acusação (o que o MP sustenta, com quais elementos)
  ▸ Versão defensiva (construída a partir dos elementos disponíveis)
  ▸ O que o assistido relata nos atendimentos (correlacionado com provas)
  ▸ Cronologia contextualizada [12 eventos] — cada evento com fonte e relevância
  ▸ Fatos relacionados [3] — contexto que impacta o caso (ameaças prévias, histórico)

◉ Pessoas ─────────────────────────────────────────
  👤 Réu: perfil social, histórico, antecedentes, condições atenuantes,
          versão dos fatos, o que relatou nos atendimentos
  👤 Vítima: perfil, relação com réu, comportamento relatado,
             credibilidade, histórico relevante

  👥 Depoentes [6]
  ┌──────────────────────────────────────────────┐
  │ Maria Silva · ACUSAÇÃO · ✅ INTIMADA          │
  │ Perfil: vizinha, presenciou parte do evento   │
  │ Contradição: disse X na delegacia, Y em juízo│
  │ Forte: mudou versão · Fraco: única testemunha│
  │ Credibilidade: baixa (contradições graves)    │
  │ ▸ 4 perguntas sugeridas                      │
  ├──────────────────────────────────────────────┤
  │ João Santos · DEFESA · ⚠️ PENDENTE           │
  │ Versão consistente entre fases               │
  │ ▸ 3 perguntas sugeridas                      │
  └──────────────────────────────────────────────┘

  🔍 Informantes [2] — relatórios policiais, informativos de investigação
  ┌──────────────────────────────────────────────┐
  │ Informativo DRACO 15/01/2024                  │
  │ Conteúdo: apuração sobre dinâmica do evento   │
  │ Informações relevantes: [3 pontos]            │
  │ Confiabilidade: média (fonte indireta)        │
  └──────────────────────────────────────────────┘

◉ Provas ──────────────────────────────────────────
  Organizadas por tipo, com indicação de favorabilidade à defesa.

  📋 Periciais [2]
  ┌──────────────────────────────────────────────┐
  │ ▌ Laudo cadavérico — Dr. Silva                │
  │   Conclusão: ferimentos compatíveis com...    │
  │   Ponto crítico: não descarta legítima defesa │
  │   Contestação: direção dos disparos...        │
  ├──────────────────────────────────────────────┤
  │ ▌ Exame corpo de delito do réu                │
  │   Conclusão: ferimento cortante no braço dir. │
  │   Ponto crítico: corrobora versão da defesa   │
  └──────────────────────────────────────────────┘
  (▌ verde = favorável, ▌ vermelho = desfavorável)

  📄 Documentais [5]
  Prints, registros, documentos — cada um com relevância e favorabilidade

  🔍 Informativos de investigação [3]
  ROs, relatórios DRACO, apurações — com credibilidade avaliada

  ⚡ O que falta produzir [4 diligências]
  ┌──────────────────────────────────────────────┐
  │ Oitiva de testemunha presencial (José Carlos) │
  │ Objetivo: confirmar ameaças prévias           │
  │ Fundamento: art. 400 CPP                      │
  │ Urgência: ALTA                                │
  └──────────────────────────────────────────────┘

◉ Estratégia ──────────────────────────────────────
  A estratégia é apresentada CONECTADA com os elementos de prova,
  não como tese isolada. Cada tese aponta quais provas/depoimentos
  a sustentam e quais a enfraquecem.

  ┌─ TESE PRINCIPAL ──────────────────────────────┐
  │ Legítima defesa putativa                       │
  │ Fático: vítima portava faca (laudo), ameaças   │
  │   prévias (testemunha José), ferimento no réu  │
  │ Jurídico: art. 25 c/c art. 20 §1º CP          │
  │ Corrobora: atendimento 15/01 — relato do réu  │
  │   consistente com versão de José Carlos        │
  │ Enfraquece: depoimento de Maria (se mantiver)  │
  └──────────────────────────────────────────────┘

  ▸ Pontos fortes da defesa [5] — o que temos a favor, consolidado
  ▸ Pontos fracos da defesa [3] — onde estamos vulneráveis + como mitigar
  ▸ Pontos fortes da acusação [4] — o que o MP tem de mais sólido
  ▸ Pontos fracos da acusação [3] — onde a acusação é frágil + como explorar
  ▸ Teses subsidiárias [2] — cada uma com cenário de uso
  ▸ Nulidades [3] — com severidade e fundamentação
  ▸ Qualificadoras contestáveis [1] — argumento contra cada
  ▸ Matriz de guerra [tabela interativa]
      Fato × Versão acusação × Versão defesa × Provas × Contradições
      (cada linha é um campo de batalha do caso)

◉ Preparação ──────────────────────────────────────
  Seção operacional: o que o defensor precisa FAZER antes da audiência/júri.

  📝 Orientação ao assistido — postura, o que dizer/não dizer, pontos do interrogatório
  🎯 Quesitos sugeridos [se júri] — cada quesito com estratégia de argumentação
  📋 Informações dos atendimentos [4]
     Cada atendimento com: data, conteúdo, e como se conecta com o caso
     (ex: "em 20/01 relatou ameaças 3 dias antes — corrobora testemunha José")
  ⚠️ Pontos críticos [3]
     Alertas para o defensor: riscos identificados + como mitigar
     (ex: "se Maria mantiver versão de juízo, pedir acareação com José")
```

### Características da apresentação

- **Narrativo, não tabular**: cada bloco conta uma parte da história
- **Colapsável**: defensor expande o que interessa, não precisa ler tudo
- **Interconectado**: elementos de prova linkam com depoentes que os mencionaram
- **Status visual**: badges de intimação (✅ intimado, ⚠️ pendente, ❌ não localizado)
- **Favorabilidade**: provas e depoimentos indicam se favorecem ou não a defesa
- **Acionável**: cada bloco de "possibilidades probatórias" ou "perguntas sugeridas" é diretamente útil na audiência

---

## 6.1 Diretrizes UX/UI — Padrão Defender v2

> Mockup de referência: `.superpowers/brainstorm/46061-1775009528/content/ux-redesign.html`

### Princípios de design

1. **Redução de carga cognitiva** — O defensor chega na página com pressa (audiência amanhã, prazo vencendo). Cada elemento deve justificar sua existência. Menos botões, menos cores, menos decisões.

2. **Hierarquia por relevância** — O que importa mais fica maior e mais visível. O resumo narrativo (texto fluido) vem antes das tabelas. A tese principal tem destaque visual (card emerald com fundo sutil). Detalhes ficam colapsados até serem necessários.

3. **Informação progressiva** — Nível 1: visão geral (blocos colapsados com contagens). Nível 2: conteúdo narrativo (expande bloco). Nível 3: detalhes (expande sub-seção). O defensor decide a profundidade.

4. **Ação imediata, não exploração** — Os dois botões (Analisar + Promptório) são ações, não menus. O resultado da análise é apresentado pronto para uso, não como dado bruto para interpretar.

### Layout geral da página

Tudo dentro de um card único (`bg-white dark:bg-zinc-900 border rounded-2xl`). Estrutura vertical:
1. Header (identidade + ações)
2. Filtro de caso (processo referência)
3. Drive bar (colapsável)
4. Summary cards (2 colunas)
5. Tabs + conteúdo

### Header do assistido

- Avatar `48px rounded-xl bg-zinc-900 dark:bg-white` com iniciais — padrão Defender invertido
- **Preso**: dot vermelho `12px` no canto superior direito do avatar (como notificação). Sem badge textual.
- Nome em `font-serif text-xl font-semibold`
- Metadados em linha: chip de atribuição (emerald) + separador + CPF mono + separador + vara
- Stats bar abaixo: N processos, N demandas, N audiências, N arquivos — `text-xs text-zinc-400`
- **Analisar**: `bg-zinc-900 dark:bg-emerald-600 text-white rounded-xl` com dot emerald. Peso visual dominante.
- **Promptório**: outline neutro, discreto
- Padding generoso: `32px horizontal, 28px top`

### Filtro de caso (processo referência) — NOVO

Substitui o antigo card de "Processos" no overview. Aparece abaixo do header, acima do Drive.

- Pills horizontais, cada uma representando um caso (processo referência + associados)
- Cada pill mostra:
  - **Dot colorido** (emerald, amber, rose) — âncora visual rápida
  - **Tipo**: "Ação Penal" em `text-[10px] uppercase text-zinc-400`
  - **Descrição do caso**: "Homicídio qualificado — Sessão do Júri" em `text-sm font-medium`
  - **Número + associados**: `font-mono text-[10px] text-zinc-400` — "8003969-75... · 3 associados"
- Active: `border-zinc-900 dark:border-zinc-400` (destaque por borda, sem cor)
- Inactive: `border-zinc-200 dark:border-zinc-800`
- Ao selecionar um caso, **tudo abaixo filtra**: audiências, demandas, Drive, análise
- Quando só 1 caso: filtro não aparece
- Padding: `20px 36px`

### Drive bar — colapsável, primário

- Integrada no card principal, entre o filtro de caso e o summary
- Linha única: ícone pasta + dot sync (verde/amber/vermelho) + "N arquivos · sync Xmin" + arquivo recente
- Botão "Abrir" à direita + chevron de expandir
- Expandida: lista de arquivos, fila de processamento, ações
- `border-top: 1px solid border/50` — sutil
- Hover: `bg-zinc-50 dark:bg-zinc-800/30`

### Summary cards — 2 colunas, neutros

- Grid 2 colunas (era 4 cards, depois 3, agora 2): **Próxima Audiência** + **Demanda Crítica**
- Card neutro: `bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 rounded-xl`
- **Cor apenas no ícone e label**: ícone com background colorido sutil (amber: `bg-amber-50 text-amber-700`, rose: `bg-rose-50 text-rose-700`). Sem borda colorida, sem tint no card, sem linha lateral/inferior.
- Label do card na cor semântica: amber para audiência, rose para demanda
- Valor principal: `text-lg font-semibold`
- Texto secundário: `text-sm text-zinc-500`
- Padding: `22px 20px`
- Hover: lift sutil `translateY(-1px)` + shadow

### Sistema de tabs

- Tabs neutros (sem emerald no ativo)
- Active: `text-zinc-900 dark:text-zinc-100 border-b-2 border-zinc-900 dark:border-zinc-100 font-medium`
- Inactive: `text-zinc-400`
- Contadores em pills: ativo `bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900`, inativo `bg-zinc-100 dark:bg-zinc-800 text-zinc-400`
- Ordem: Processos → Análise → Demandas → Audiências → Drive → Mídias → Ofícios → Investigação
- Scroll horizontal em mobile
- Font: `text-sm`, padding `14px 16px`

### Seletor de caso (dentro da aba Análise)

Reutiliza o mesmo filtro de caso do topo. Na aba Análise, os blocos de conteúdo mudam conforme o caso selecionado. Não precisa de seletor duplicado.

### Blocos de análise

- Card `bg-zinc-900 border-zinc-800 rounded-xl` com hover sutil (`hover:border-zinc-700`)
- Header do bloco: ícone em circle colorido (emerald=caso, violet=pessoas, amber=provas, blue=estratégia, rose=preparação) + título + contagem
- Chevron indica estado aberto/fechado com `transition-transform duration-200`
- Corpo do bloco usa Accordion do Radix (já existe no projeto)
- Sub-seções são linhas clicáveis com chevron + label + count — não cards pesados

### Cards de depoentes

- Background `bg-[#0f0f11]` (um nível mais escuro que o bloco) — profundidade sutil
- Header: nome + tags (tipo: acusação/defesa em pills coloridos, status de intimação em pill outline)
- Contradição destacada em `text-amber-400` — chama atenção naturalmente
- Linha de pontos fortes/fracos em `text-zinc-600` — contexto sem poluir
- Link "N perguntas sugeridas" em `text-emerald-500` — ação clara, colapsado por padrão

### Destaque da tese principal

- Card especial com `bg-gradient(emerald 5% → 2%)` + `border-emerald-500/15`
- Label "TESE PRINCIPAL" em `text-emerald-500 uppercase tracking-wider text-xs`
- Texto da tese em `text-base font-medium` — maior que o body padrão
- Fundamento fático e jurídico abaixo em `text-zinc-500 text-sm`

### Estado de análise em andamento

- Botão "Analisar" muda para estado inline (não modal, não bloqueia a página)
- Layout: `spinner (emerald) + "Analisando..." + etapa atual (text-emerald-500)`
- Background `bg-zinc-900 border-zinc-800 rounded-lg` — discreto, não alarma
- O defensor pode navegar em outras abas enquanto a análise roda
- Ao concluir: toast com "Análise concluída — Ver resultados" + aba Análise atualiza

### Modal Promptório

- Overlay com `backdrop-blur-sm` — foco no modal sem perder contexto
- Card `bg-zinc-900 border-zinc-800 rounded-xl` — consistente com o sistema
- Header com título + subtítulo explicativo
- Select e textarea com `bg-[#0f0f11]` (nível mais escuro) — inputs se distinguem
- Footer com botões alinhados à direita: Cancelar (outline) + Copiar (emerald)
- Toast pós-cópia: "Prompt copiado — cole no Claude Code" com duração de 5s

### Responsividade

| Breakpoint | Adaptação |
|-----------|-----------|
| `< 640px` (mobile) | Header empilha (nome acima, botões abaixo). Tabs scrollam. Blocos full-width. Depoentes em coluna. |
| `640-1024px` (tablet) | Grid de perfis (réu/vítima) em 2 colunas. Case selector scrollável. |
| `> 1024px` (desktop) | Layout padrão. Provas em grid 2-3 colunas por favorabilidade. |

### Transições e micro-interações

- Cards: `transition-all duration-200` — hover lift (`-translate-y-px`) + border lighten
- Blocos abrir/fechar: `animate-accordion-down/up` (já configurado no Tailwind)
- Botão Analisar: hover com `shadow-lg shadow-emerald-500/20` — glow sutil
- Toast de conclusão: slide-in de baixo com `animate-in slide-in-from-bottom-2`
- Spinner: `border-top-color: emerald-500`, `animation: spin 0.8s linear infinite`

### Acessibilidade

- Todos os botões com `cursor-pointer` e `focus-visible:ring-2 ring-emerald-500`
- Blocos colapsáveis com `aria-expanded` e `aria-controls`
- Badges de status com texto (não só cor) — "Intimada" em texto, não só ✅
- Contraste WCAG AA em todos os textos (verificar `text-zinc-500` sobre `bg-zinc-900`)
- Tab order lógico: header → botões → tabs → conteúdo

### Checklist de qualidade visual (por componente)

```
[ ] Lucide icons — sem emojis na interface (emojis só em dados narrativos)
[ ] gradient="zinc" em todos os KPI/stat cards
[ ] Hover emerald em elementos interativos
[ ] font-serif para títulos de página, font-sans para UI
[ ] font-mono para números de processo, CPF, datas
[ ] Sem magic numbers tipográficos (text-[11px], text-[13px])
[ ] Dark mode funcional em todos os estados
[ ] Loading skeletons nos blocos antes dos dados carregarem
[ ] Empty states com ícone + mensagem + ação (ex: "Nenhuma análise — Clique em Analisar")
[ ] Hover states em todos os elementos clicáveis
[ ] Transition duration entre 150-300ms
```

---

## 7. Artefatos no Drive

O `claude -p` gera na pasta do caso:

| Arquivo | Formato | Conteúdo |
|---------|---------|----------|
| `Relatório de Análise - {Assistido} - {data}.pdf` | PDF | Relatório completo formatado (cabeçalho DPE-BA) |
| `Relatório de Análise - {Assistido} - {data}.md` | Markdown | Mesmo conteúdo em markdown (para re-análise futura) |

Não gera JSON no Drive. O resultado estruturado vai direto pro banco via `resultado` JSONB na tabela `claude_code_tasks`, e de lá para `analysis_data` na tabela `casos`.

---

## 8. Vinculação Drive ↔ Assistido

### Estrutura de pastas

```
Drive do defensor/
  └── Processos - Júri/
       └── Adenilson Santos Silva/           ← pasta do assistido (driveFolderId em assistidos)
            ├── AP 0501234-56.2024/          ← subpasta do caso (driveFolderId em casos)
            │    ├── Denúncia.pdf
            │    ├── IP 0501234-56.2024.pdf
            │    ├── APF 0509999-00.2024.pdf
            │    └── Relatório de Análise - Adenilson - 2026-03-28.pdf
            └── AP 0507890-12.2023/
                 ├── Denúncia.pdf
                 └── ...
```

### Identificação de arquivos

Os PDFs do Drive são associados aos processos por:

1. **Número dos autos no nome do arquivo** (mais comum) — regex match com processos cadastrados
2. **Prefixo de tipo** se presente (ex: "IP 050...", "APF 050...") — classifica tipoProcesso
3. **Metadados da importação PJe/pauta** — associação direta por número
4. **Análise do Claude Code** — lê conteúdo do PDF, identifica a qual processo pertence
5. **Associação manual** — interface permite vincular arquivo a processo quando há dúvida

---

## 9. Detecção do Claude CLI

```typescript
// No startup do daemon e da API route (uma vez):
import { execSync } from "child_process";

const CLAUDE_BIN: string | null = (() => {
  try {
    return execSync("which claude", { encoding: "utf-8" }).trim();
  } catch {
    return null;
  }
})();
```

- Se `CLAUDE_BIN` é null no daemon → log de erro, não processa tasks
- Na API route (Vercel): não precisa do CLI — só cria a task no banco
- No frontend: botão "Analisar" sempre funciona (cria task). Se Mac Mini estiver offline, mostra "Aguardando processamento"

---

## 10. Escopo de Implementação

### Fase 1 — Infraestrutura (sem mudança visual)
- Criar tabela `casos`
- Criar tabela `claude_code_tasks`
- Adicionar campos `tipo_processo`, `is_referencia` em processos
- Adicionar FK real `caso_id → casos.id`
- Migrar dados existentes (criar caso default para cada assistido que tem processos)
- Criar daemon local com Supabase Realtime

### Fase 2 — Barra de ações
- Remover botões: Cowork, Sonnet, Exportar, Importar, 3 clipboards
- Implementar botão "Analisar" (cria task no banco)
- Implementar modal "Promptório"
- Polling/Realtime no frontend para status da task

### Fase 3 — Aba Análise
- Nova aba com seletor de caso
- Renderização dos 5 blocos (Caso, Pessoas, Provas, Estratégia, Operacional)
- Seções colapsáveis, badges de status, favorabilidade
- Indicador de processo referência + associados

### Fase 4 — Classificação progressiva
- Associação automática de arquivos do Drive por número dos autos
- Inferência de tipoProcesso na importação PJe
- Sugestão de agrupamento pelo Claude Code durante análise
- Interface de confirmação manual

### Fase 5 — Renomear e ajustar
- Renomear aba Inteligência → Investigação Defensiva
- Mover conteúdo de investigação (OSINT, linhas de investigação) para nova aba
- Ajustar routers tRPC e referências

---

## 11. Fora de Escopo

- API paga como fallback (removido por decisão — só `claude -p`)
- Worker Python (substituído pelo daemon Node.js)
- JSON na pasta do Drive (removido — resultado vai direto pro banco)
- Botão Sonnet (custo desnecessário)
- Integração com Claude Desktop (substituída por bridge Supabase)

---

## 12. Riscos Residuais

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Mac Mini desligado quando defensor precisa | Baixa (fica ligado 24/7) | Tasks acumulam | Fila persiste, processa ao voltar |
| Internet do Mac Mini cai | Média | Tasks acumulam até reconexão | Catch-up automático de pendentes |
| Claude CLI atualiza e muda comportamento | Baixa | Output pode quebrar parser | Schema validation + fallback para raw |
| Supabase Realtime tem latência | Rara | Delay de ~1-3s | Aceitável — análise leva minutos |
| Assinatura Claude Max expira | Baixa | Tasks falham | Health check no daemon detecta e alerta |
| Pasta do Drive sem permissão | Média | Análise não lê autos | Verificação prévia + erro claro |
