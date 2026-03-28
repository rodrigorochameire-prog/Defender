# OMBUDS Skills Engine — Design Spec

**Data:** 2026-03-27
**Status:** Aprovado
**Escopo:** Sub-projeto 1 — Command Bar + Skill Registry + Chat Lateral + 10 Skills Iniciais

---

## Objetivo

Transformar o OMBUDS numa plataforma orquestrada por skills, onde o defensor público interage com linguagem natural e o sistema ativa a funcionalidade certa automaticamente — incluindo delegação para Cowork/Manus quando precisa de IA pesada. Zero custo para 90% das interações.

## Decisões de Design

| Decisão | Escolha |
|---------|---------|
| Ativação | ⌘K para comandos rápidos + chat lateral para interações longas |
| Matching | Híbrido: regex (90%) + Gemini Flash fallback (~$0.001) |
| Delegação IA | Deep link para Cowork/Manus com prompt enriquecido |
| Histórico chat | Por assistido/caso |
| Evolução futura | Migrar para LLM function calling (Abordagem 3) mantendo contenção |

---

## 1. Skill Registry

### Anatomia de uma Skill

```typescript
interface Skill {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;

  // Matching
  triggers: string[];
  triggerPattern?: RegExp;

  // Parâmetros
  params?: {
    name: string;
    extract: RegExp | "entity";
    required: boolean;
  }[];

  // Execução
  type: "navigate" | "panel" | "action" | "delegate";

  // navigate: abre página
  route?: string | ((params: Record<string, string>) => string);

  // panel: abre painel lateral com dados
  panel?: {
    component: string;
    fetchData: (params: Record<string, string>) => Promise<unknown>;
  };

  // action: executa tRPC direto
  action?: (params: Record<string, string>) => Promise<unknown>;

  // delegate: abre Cowork/Manus
  delegate?: {
    target: "cowork" | "manus" | "auto";
    promptTemplate: string;
    context?: (params: Record<string, string>) => Promise<string>;
  };

  category: "urgente" | "consulta" | "acao" | "analise" | "comunicacao";
  requiresAuth?: boolean;
  requiredRole?: string[];
}
```

### Localização dos arquivos

```
src/lib/skills/
├── registry.ts          — registro central + matching engine
├── types.ts             — tipos (Skill, MatchResult, etc.)
├── matcher.ts           — 3 camadas de matching
├── executor.ts          — executa skill por tipo
├── delegate.ts          — monta prompt + abre Cowork/Manus
├── skills/
│   ├── prazos-vencendo.ts
│   ├── intimacoes-hoje.ts
│   ├── briefing.ts
│   ├── status-assistido.ts
│   ├── buscar.ts
│   ├── abrir-processo.ts
│   ├── audiencias-semana.ts
│   ├── delegar.ts
│   ├── enviar-whatsapp.ts
│   └── mover-atribuicao.ts
```

---

## 2. Matching Engine

### 3 Camadas em Cascata

**Camada 1: Comando exato (0ms, grátis)**
- Frase começa com `/` → match direto por `skill.id`
- `/prazos` → prazos-vencendo
- `/briefing Gabriel` → briefing com param "Gabriel"

**Camada 2: Regex/keywords (0ms, grátis)**
- Testa `triggers` e `triggerPattern` de cada skill
- Scoring: 1 ponto por trigger matched
- Score >= 1 → executa skill com maior score
- Extrai parâmetros via `params[].extract` regex

**Camada 3: Gemini Flash (200ms, ~$0.001)**
- Só ativa quando Camadas 1 e 2 retornam score = 0
- Envia lista de skills + frase para Gemini Flash
- Resposta: `{ skillId, params, confidence }`
- Confidence >= 0.7 → executa
- Confidence < 0.7 → mostra sugestões

### Contenção de gastos (Camada 3)
- Cache de queries normalizadas (mesma frase não chama 2x)
- Rate limit: 20 chamadas Gemini/hora por usuário
- Fallback sem API: mostra lista manual de skills
- Métricas: log de uso por camada (otimizar triggers para reduzir Camada 3)

### Autocomplete de entidades
- Ao digitar parâmetro, busca no banco em tempo real (debounce 300ms)
- tRPC query leve: assistidos por nome, processos por número
- Tab para autocompletar

---

## 3. Command Bar (⌘K)

### Ativação
- `⌘K` (Mac) / `Ctrl+K` (Windows) de qualquer página
- Click na barra de busca do header

### Componente
Baseado no `cmdk` (já disponível no shadcn/ui).

### Layout ao abrir (sem digitar)
```
┌─────────────────────────────────────────────┐
│ 🔍 O que você precisa?                      │
├─────────────────────────────────────────────┤
│ ⚡ URGENTES                                 │
│   🔴 3 prazos vencendo hoje                │
│   🟡 2 intimações novas                    │
│ 📋 RECENTES                                │
│   Briefing Gabriel Gomes                    │
│   Status Adriano Cunha                      │
│ 💡 SUGESTÕES                                │
│   Prazos    Intimações    Audiências        │
└─────────────────────────────────────────────┘
```

### Comportamento
1. Ao abrir: alertas urgentes + recentes + sugestões
2. Ao digitar: filtra skills em tempo real (Camadas 1 e 2)
3. Enter: executa skill selecionada
4. Tab: autocompleta parâmetro
5. Esc: fecha

### Dados urgentes (ao abrir)
- Prazos vencendo hoje/amanhã: `trpc.prazos.vencendo.query()`
- Intimações novas: `trpc.demandas.novas.query()`
- Refetch a cada 5 minutos

---

## 4. Chat Lateral

### Layout
Painel fixo no lado direito, 320px, colapsável. Toggle via ícone no header.

### Contexto por caso
- Carrega contexto do assistido/caso em tela
- Em `/assistidos/264` → chat sobre João Victor Moura Ramos
- Histórico salvo por assistido no banco

### Tabela `chat_history`

```sql
CREATE TABLE chat_history (
  id SERIAL PRIMARY KEY,
  assistido_id INT REFERENCES assistidos(id),
  user_id INT REFERENCES users(id),
  role VARCHAR(20) NOT NULL,        -- "user" | "assistant" | "system"
  content TEXT NOT NULL,
  skill_id VARCHAR(50),             -- skill que foi ativada (null se conversa livre)
  metadata JSONB,                   -- dados extras (resultados, links, etc.)
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Fluxo de mensagens
```
Usuário digita → Matching Engine:

  Se skill interna:
    → Executa, mostra resultado no chat como card interativo
    → Ex: "3 prazos vencendo" [lista clicável com ações]

  Se skill delegate:
    → Mostra "Preparando análise..."
    → Monta prompt com contexto do banco
    → Abre Cowork/Manus via deep link
    → Chat registra: "Enviado para Cowork: análise de autos"

  Se não matcha:
    → Gemini Flash (Camada 3)
    → Se entendeu → executa
    → Se não → "Não entendi. Tente: /prazos, /briefing, /buscar..."
```

---

## 5. Delegação para Cowork/Manus

### Deep link (prioritário)
```
claude://cowork?prompt={encodedPrompt}
manus://new?prompt={encodedPrompt}
```

### Fallback (se deep link não suportado)
1. Copia prompt enriquecido para clipboard
2. Abre aplicativo via `open -a "Claude"` ou `open -a "Manus"`
3. Toast: "Prompt copiado! Cole no Cowork (⌘V)"

### Montagem do prompt enriquecido

Para cada skill delegate, o `context()` busca dados do banco:
```
1. Dados do assistido (nome, cpf, situação prisional)
2. Dados do processo (número, classe, vara, demandas ativas)
3. Localização no Drive (pasta, documentos)
4. Histórico relevante (últimas movimentações)
5. Monta prompt com template + dados
```

### Configuração (settings do OMBUDS)
```
Ferramenta de IA preferida:
○ Claude Cowork (padrão)
○ Manus Desktop
○ Copiar prompt (manual)
```

Salvo em `user_settings.ai_delegate_tool`.

---

## 6. As 10 Skills Iniciais

### Por prioridade de implementação:

#### 1. prazos-vencendo
- **Tipo:** navigate
- **Triggers:** `prazos`, `vencendo`, `prazo urgente`, `prazos de hoje`
- **Pattern:** `/praz[oa]s?\s*(venc|urgen|hoje|amanh|semana)/i`
- **Ação:** Navega para `/prazos?filter=vencendo`
- **Badge:** Mostra contagem no ⌘K ao abrir

#### 2. intimacoes-hoje
- **Tipo:** panel
- **Triggers:** `intimações`, `intimação`, `novas intimações`, `intimações de hoje`
- **Pattern:** `/intima[çc][õo]e?s?\s*(hoje|nova|pendente)?/i`
- **Ação:** Abre painel com lista de intimações do dia
- **Dados:** `trpc.demandas.list({ dataEntrada: hoje, status: "5_FILA" })`

#### 3. briefing
- **Tipo:** delegate → cowork
- **Triggers:** `briefing`, `resumo do caso`, `resumo`, `analise do caso`
- **Params:** `assistido` (required, extract regex)
- **Prompt:** "Gere um briefing estratégico do caso de {{assistidoNome}}. Processo: {{numeroAutos}}. Classe: {{classeProcessual}}. Documentos em: Drive > {{drivePath}}"
- **Context:** busca assistido + processos + demandas + caminho Drive

#### 4. status-assistido
- **Tipo:** panel
- **Triggers:** `status`, `ficha`, `situação`, `como está`
- **Params:** `assistido` (required)
- **Ação:** Painel com ficha rápida: processos, prazos pendentes, última movimentação, situação prisional, link Drive

#### 5. buscar
- **Tipo:** panel
- **Triggers:** `buscar`, `procurar`, `pesquisar`, `achar`
- **Params:** `termo` (required, tudo após o trigger)
- **Ação:** Busca semântica + full-text em documentos, processos, assistidos
- **Dados:** `trpc.search.hybrid({ query: termo })`

#### 6. abrir-processo
- **Tipo:** navigate
- **Triggers:** `abrir processo`, `abrir`, `ir para processo`
- **Params:** `numero` (required, extract: `/\d{7}-\d{2}\.\d{4}/`)
- **Ação:** Busca processo por número → navega para `/processos/[id]`

#### 7. audiencias-semana
- **Tipo:** panel
- **Triggers:** `audiências`, `audiência`, `agenda`, `pauta`
- **Pattern:** `/audi[eê]ncias?\s*(semana|hoje|amanh)?/i`
- **Ação:** Painel com agenda dos próximos 7 dias
- **Dados:** `trpc.audiencias.proximas({ dias: 7 })`

#### 8. delegar
- **Tipo:** action
- **Triggers:** `delegar`, `atribuir`, `passar para`
- **Params:** `demanda` (id ou descrição), `usuario` (nome)
- **Ação:** `trpc.demandas.delegar({ demandaId, delegadoParaId })` + notifica

#### 9. enviar-whatsapp
- **Tipo:** navigate
- **Triggers:** `whatsapp`, `mandar mensagem`, `enviar whatsapp`
- **Params:** `assistido` (required)
- **Ação:** Busca contato WhatsApp → navega para `/whatsapp/chat?contact=[id]`

#### 10. mover-atribuicao
- **Tipo:** action
- **Triggers:** `mover`, `transferir`, `mudar atribuição`
- **Params:** `assistido` (required), `area` (required: "júri", "vvd", "ep", "substituição")
- **Ação:** Atualiza `assistidos.atribuicaoPrimaria` + move demandas na planilha + log

---

## 7. Arquivos a Criar/Modificar

### Criar
| Arquivo | Responsabilidade |
|---------|------------------|
| `src/lib/skills/types.ts` | Tipos: Skill, MatchResult, SkillParams |
| `src/lib/skills/registry.ts` | Registro central de skills |
| `src/lib/skills/matcher.ts` | Engine de matching (3 camadas) |
| `src/lib/skills/executor.ts` | Executa skill por tipo |
| `src/lib/skills/delegate.ts` | Monta prompt + abre Cowork/Manus |
| `src/lib/skills/skills/*.ts` | 10 skills iniciais |
| `src/components/command-bar.tsx` | ⌘K command palette |
| `src/components/chat-panel.tsx` | Chat lateral |
| `src/components/skill-result-card.tsx` | Card de resultado no chat |
| `src/hooks/use-skills.ts` | Hook React para skills |
| `src/hooks/use-command-bar.ts` | Hook para ⌘K state |
| `src/lib/db/schema/core.ts` | Tabela chat_history (adicionar) |
| `src/lib/trpc/routers/skills.ts` | Router para search de entidades + chat history |
| `__tests__/skills-matcher.test.ts` | Testes do matching engine |

### Modificar
| Arquivo | Mudança |
|---------|---------|
| `src/app/(dashboard)/layout.tsx` | Adicionar CommandBar + ChatPanel |
| `src/components/layouts/admin-sidebar.tsx` | Toggle do chat lateral |

---

## 8. Evolução Futura (Abordagem 3)

Quando o volume de uso justificar, migrar Camada 3 para function calling:

```typescript
// Futuro: cada skill vira uma "tool" do LLM
const tools = skills.map(s => ({
  name: s.id,
  description: s.description,
  parameters: s.params?.map(p => ({ name: p.name, type: "string", required: p.required })),
}));

// LLM decide qual skill ativar
const result = await gemini.generateContent({
  contents: [{ role: "user", parts: [{ text: userMessage }] }],
  tools: [{ functionDeclarations: tools }],
});
```

A estrutura de skills é a mesma — só muda o backend do matching. Contenção: limitar a N chamadas/dia, cache agressivo, fallback para regex.
