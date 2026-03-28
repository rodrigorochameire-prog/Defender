# OMBUDS Skills Engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evoluir o Command Palette existente para um Skill Engine com matching por linguagem natural, 10 skills internas, chat lateral com histórico por caso, e delegação para Cowork/Manus.

**Architecture:** Skill Registry (arquivos de definição) → Matcher (regex + Gemini Flash fallback) → Executor (navigate/panel/action/delegate). Command Palette existente evolui para consumir o registry. Chat lateral novo como Sheet component.

**Tech Stack:** cmdk (já instalado), shadcn/ui Command/Sheet, tRPC, Gemini Flash (contenção), Drizzle ORM

**Key Discovery:** `src/components/shared/command-palette.tsx` já implementa ⌘K com busca tRPC, recentes e atalhos. Vamos evoluí-lo — não reescrever.

---

## Arquivos

| Arquivo | Ação | Responsabilidade |
|---------|------|------------------|
| `src/lib/skills/types.ts` | Criar | Tipos: Skill, MatchResult, SkillExecution |
| `src/lib/skills/registry.ts` | Criar | Registro de skills + getAll/getById |
| `src/lib/skills/matcher.ts` | Criar | 3 camadas: comando, regex, Gemini Flash |
| `src/lib/skills/executor.ts` | Criar | Executa skill por tipo (navigate/panel/action/delegate) |
| `src/lib/skills/delegate.ts` | Criar | Monta prompt enriquecido + deep link Cowork/Manus |
| `src/lib/skills/skills/prazos-vencendo.ts` | Criar | Skill: prazos vencendo |
| `src/lib/skills/skills/intimacoes-hoje.ts` | Criar | Skill: intimações de hoje |
| `src/lib/skills/skills/briefing.ts` | Criar | Skill: briefing (delegate) |
| `src/lib/skills/skills/status-assistido.ts` | Criar | Skill: ficha do assistido |
| `src/lib/skills/skills/buscar.ts` | Criar | Skill: busca semântica |
| `src/lib/skills/skills/abrir-processo.ts` | Criar | Skill: navegar para processo |
| `src/lib/skills/skills/audiencias-semana.ts` | Criar | Skill: agenda da semana |
| `src/lib/skills/skills/delegar.ts` | Criar | Skill: delegar demanda |
| `src/lib/skills/skills/enviar-whatsapp.ts` | Criar | Skill: abrir WhatsApp |
| `src/lib/skills/skills/mover-atribuicao.ts` | Criar | Skill: mover assistido de área |
| `src/lib/skills/skills/index.ts` | Criar | Export de todas as skills |
| `src/components/shared/command-palette.tsx` | Modificar | Integrar Skill Engine no ⌘K existente |
| `src/components/shared/chat-panel.tsx` | Criar | Chat lateral com histórico por caso |
| `src/components/shared/skill-result.tsx` | Criar | Renderizar resultado de skill no chat |
| `src/hooks/use-chat-panel.ts` | Criar | Estado do chat lateral |
| `src/lib/trpc/routers/skills.ts` | Criar | Router: entity autocomplete + chat history |
| `src/lib/db/schema/core.ts` | Modificar | Tabela chat_history |
| `src/components/layouts/admin-sidebar.tsx` | Modificar | Adicionar toggle do chat |
| `__tests__/skills-matcher.test.ts` | Criar | Testes do matching engine |

---

### Task 1: Tipos e Registry

**Files:**
- Create: `src/lib/skills/types.ts`
- Create: `src/lib/skills/registry.ts`
- Test: `__tests__/skills-matcher.test.ts`

- [ ] **Step 1: Criar types.ts**

```typescript
// src/lib/skills/types.ts
import type { LucideIcon } from "lucide-react";

export type SkillType = "navigate" | "panel" | "action" | "delegate";
export type SkillCategory = "urgente" | "consulta" | "acao" | "analise" | "comunicacao";
export type DelegateTarget = "cowork" | "manus" | "auto";

export interface SkillParam {
  name: string;
  extract: RegExp | "entity";
  required: boolean;
  entityType?: "assistido" | "processo" | "usuario";
}

export interface SkillDelegate {
  target: DelegateTarget;
  promptTemplate: string;
  context?: (params: Record<string, string>) => Promise<string>;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  icon: string;             // lucide icon name (resolved at render)
  triggers: string[];
  triggerPattern?: RegExp;
  params?: SkillParam[];
  type: SkillType;
  route?: string | ((params: Record<string, string>) => string);
  panel?: {
    component: string;
    title: string;
  };
  action?: string;          // tRPC procedure path (e.g., "demandas.delegar")
  delegate?: SkillDelegate;
  category: SkillCategory;
}

export interface MatchResult {
  skill: Skill;
  score: number;
  params: Record<string, string>;
  matchedBy: "command" | "regex" | "gemini";
}

export interface SkillExecution {
  skill: Skill;
  params: Record<string, string>;
  result?: unknown;
  error?: string;
  delegateUrl?: string;
}
```

- [ ] **Step 2: Criar registry.ts**

```typescript
// src/lib/skills/registry.ts
import type { Skill } from "./types";

const skills: Map<string, Skill> = new Map();

export function registerSkill(skill: Skill): void {
  skills.set(skill.id, skill);
}

export function getSkill(id: string): Skill | undefined {
  return skills.get(id);
}

export function getAllSkills(): Skill[] {
  return Array.from(skills.values());
}

export function getSkillsByCategory(category: string): Skill[] {
  return getAllSkills().filter(s => s.category === category);
}

export function initializeSkills(): void {
  // Import e register all skills
  // Chamado uma vez no app startup
  const allSkills = require("./skills").default;
  for (const skill of allSkills) {
    registerSkill(skill);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/skills/types.ts src/lib/skills/registry.ts
git commit -m "feat(skills): add skill types and registry"
```

---

### Task 2: Matching Engine

**Files:**
- Create: `src/lib/skills/matcher.ts`
- Create: `__tests__/skills-matcher.test.ts`

- [ ] **Step 1: Escrever testes do matcher**

```typescript
// __tests__/skills-matcher.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { matchSkill, matchByCommand, matchByRegex } from "@/lib/skills/matcher";
import { registerSkill } from "@/lib/skills/registry";

beforeAll(() => {
  registerSkill({
    id: "prazos-vencendo",
    name: "Prazos Vencendo",
    description: "Mostra prazos vencendo",
    icon: "Clock",
    triggers: ["prazos", "vencendo", "prazo urgente"],
    triggerPattern: /praz[oa]s?\s*(venc|urgen|hoje|amanh|semana)/i,
    type: "navigate",
    route: "/prazos?filter=vencendo",
    category: "urgente",
  });
  registerSkill({
    id: "briefing",
    name: "Briefing",
    description: "Briefing do caso",
    icon: "FileText",
    triggers: ["briefing", "resumo do caso", "resumo"],
    params: [{ name: "assistido", extract: /(?:briefing|resumo)\s+(?:do\s+)?(?:caso\s+)?(?:do\s+)?(.+)/i, required: true }],
    type: "delegate",
    category: "analise",
  });
});

describe("matchByCommand", () => {
  it("matcha comando /prazos", () => {
    const result = matchByCommand("/prazos");
    expect(result?.skill.id).toBe("prazos-vencendo");
  });

  it("matcha /briefing com parâmetro", () => {
    const result = matchByCommand("/briefing Gabriel");
    expect(result?.skill.id).toBe("briefing");
    expect(result?.params.assistido).toBe("Gabriel");
  });

  it("retorna null para texto sem /", () => {
    expect(matchByCommand("prazos vencendo")).toBeNull();
  });
});

describe("matchByRegex", () => {
  it("matcha por trigger keyword", () => {
    const result = matchByRegex("quais prazos estão vencendo?");
    expect(result?.skill.id).toBe("prazos-vencendo");
    expect(result?.score).toBeGreaterThanOrEqual(2);
  });

  it("matcha por triggerPattern", () => {
    const result = matchByRegex("prazos de hoje");
    expect(result?.skill.id).toBe("prazos-vencendo");
  });

  it("extrai parâmetro do briefing", () => {
    const result = matchByRegex("briefing do Gabriel");
    expect(result?.skill.id).toBe("briefing");
    expect(result?.params.assistido).toBe("Gabriel");
  });

  it("retorna null quando nada matcha", () => {
    expect(matchByRegex("qual a cor do céu")).toBeNull();
  });
});

describe("matchSkill", () => {
  it("prioriza comando sobre regex", () => {
    const result = matchSkill("/prazos vencendo");
    expect(result?.matchedBy).toBe("command");
  });

  it("usa regex quando não é comando", () => {
    const result = matchSkill("prazos vencendo hoje");
    expect(result?.matchedBy).toBe("regex");
  });
});
```

- [ ] **Step 2: Rodar testes (devem falhar)**

```bash
npx vitest run __tests__/skills-matcher.test.ts
```

- [ ] **Step 3: Implementar matcher.ts**

```typescript
// src/lib/skills/matcher.ts
import type { MatchResult } from "./types";
import { getAllSkills, getSkill } from "./registry";

/**
 * Camada 1: Comando exato (/skill param)
 */
export function matchByCommand(input: string): MatchResult | null {
  if (!input.startsWith("/")) return null;

  const parts = input.slice(1).split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const rest = parts.slice(1).join(" ").trim();

  const skills = getAllSkills();
  const skill = skills.find(s => s.id === cmd || s.id.startsWith(cmd));
  if (!skill) return null;

  const params: Record<string, string> = {};
  if (rest && skill.params?.[0]) {
    params[skill.params[0].name] = rest;
  }

  return { skill, score: 100, params, matchedBy: "command" };
}

/**
 * Camada 2: Regex/keyword scoring
 */
export function matchByRegex(input: string): MatchResult | null {
  const normalized = input.toLowerCase().trim();
  const skills = getAllSkills();

  let bestMatch: MatchResult | null = null;
  let bestScore = 0;

  for (const skill of skills) {
    let score = 0;

    // Score por triggers
    for (const trigger of skill.triggers) {
      if (normalized.includes(trigger.toLowerCase())) {
        score += 1;
      }
    }

    // Score por triggerPattern
    if (skill.triggerPattern && skill.triggerPattern.test(normalized)) {
      score += 2;
    }

    if (score > bestScore) {
      bestScore = score;

      // Extrair parâmetros
      const params: Record<string, string> = {};
      if (skill.params) {
        for (const p of skill.params) {
          if (p.extract instanceof RegExp) {
            const match = input.match(p.extract);
            if (match?.[1]) {
              params[p.name] = match[1].trim();
            }
          }
        }
      }

      bestMatch = { skill, score, params, matchedBy: "regex" };
    }
  }

  return bestScore >= 1 ? bestMatch : null;
}

/**
 * Camada 3: Gemini Flash (chamado externamente via API)
 * Retorna o payload para enviar ao Gemini, não chama diretamente.
 */
export function buildGeminiPayload(input: string): {
  prompt: string;
  skillList: { id: string; name: string; description: string; triggers: string[] }[];
} {
  const skills = getAllSkills().map(s => ({
    id: s.id,
    name: s.name,
    description: s.description,
    triggers: s.triggers,
  }));

  return {
    prompt: `Dada esta lista de skills: ${JSON.stringify(skills)}, qual skill o usuário quer ativar com: "${input}"? Responda APENAS JSON: {"skillId": "...", "params": {}, "confidence": 0.0-1.0}. Se nenhuma skill se aplica, retorne {"skillId": null, "confidence": 0}.`,
    skillList: skills,
  };
}

/**
 * Match principal: cascata das 3 camadas
 * Camada 3 (Gemini) é async e chamada pelo componente se necessário.
 */
export function matchSkill(input: string): MatchResult | null {
  // Camada 1: comando
  const cmdMatch = matchByCommand(input);
  if (cmdMatch) return cmdMatch;

  // Camada 2: regex
  const regexMatch = matchByRegex(input);
  if (regexMatch) return regexMatch;

  // Camada 3: retorna null, caller decide se chama Gemini
  return null;
}
```

- [ ] **Step 4: Rodar testes (devem passar)**

```bash
npx vitest run __tests__/skills-matcher.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/skills/matcher.ts __tests__/skills-matcher.test.ts
git commit -m "feat(skills): add 3-layer matching engine with tests"
```

---

### Task 3: 10 Skills Iniciais

**Files:**
- Create: `src/lib/skills/skills/prazos-vencendo.ts`
- Create: `src/lib/skills/skills/intimacoes-hoje.ts`
- Create: `src/lib/skills/skills/briefing.ts`
- Create: `src/lib/skills/skills/status-assistido.ts`
- Create: `src/lib/skills/skills/buscar.ts`
- Create: `src/lib/skills/skills/abrir-processo.ts`
- Create: `src/lib/skills/skills/audiencias-semana.ts`
- Create: `src/lib/skills/skills/delegar.ts`
- Create: `src/lib/skills/skills/enviar-whatsapp.ts`
- Create: `src/lib/skills/skills/mover-atribuicao.ts`
- Create: `src/lib/skills/skills/index.ts`

- [ ] **Step 1: Criar todas as 10 skills**

Cada skill é um arquivo com export default de um objeto `Skill`. Criar todos:

`src/lib/skills/skills/prazos-vencendo.ts`:
```typescript
import type { Skill } from "../types";

const skill: Skill = {
  id: "prazos-vencendo",
  name: "Prazos Vencendo",
  description: "Mostra demandas com prazo vencendo hoje, amanhã ou na semana",
  icon: "Clock",
  triggers: ["prazos", "vencendo", "prazo urgente", "prazos de hoje", "prazo amanhã"],
  triggerPattern: /praz[oa]s?\s*(venc|urgen|hoje|amanh[aã]|semana)/i,
  type: "navigate",
  route: "/prazos?filter=vencendo",
  category: "urgente",
};

export default skill;
```

`src/lib/skills/skills/intimacoes-hoje.ts`:
```typescript
import type { Skill } from "../types";

const skill: Skill = {
  id: "intimacoes-hoje",
  name: "Intimações de Hoje",
  description: "Lista intimações e expedientes recebidos hoje",
  icon: "Bell",
  triggers: ["intimações", "intimação", "novas intimações", "intimações de hoje", "expedientes"],
  triggerPattern: /intima[çc][õo]e?s?\s*(hoje|nova|pendente)?/i,
  type: "panel",
  panel: { component: "IntimacoesPainel", title: "Intimações de Hoje" },
  category: "urgente",
};

export default skill;
```

`src/lib/skills/skills/briefing.ts`:
```typescript
import type { Skill } from "../types";

const skill: Skill = {
  id: "briefing",
  name: "Briefing do Caso",
  description: "Gera análise estratégica do caso via Cowork",
  icon: "Brain",
  triggers: ["briefing", "resumo do caso", "resumo", "analise do caso", "análise estratégica"],
  params: [{ name: "assistido", extract: /(?:briefing|resumo|an[aá]lise)\s+(?:do\s+)?(?:caso\s+)?(?:do\s+)?(?:de\s+)?(.+)/i, required: true, entityType: "assistido" }],
  type: "delegate",
  delegate: {
    target: "cowork",
    promptTemplate: `Você é um assistente jurídico da Defensoria Pública de Camaçari.

Gere um briefing estratégico completo do caso:
- Assistido: {{assistidoNome}}
- Processo: {{numeroAutos}}
- Classe: {{classeProcessual}}
- Vara: {{vara}}

Analise: teses defensivas, contradições nos depoimentos, pontos fortes e fracos, próximos passos recomendados.

Documentos estão em: Google Drive > {{drivePath}}`,
  },
  category: "analise",
};

export default skill;
```

`src/lib/skills/skills/status-assistido.ts`:
```typescript
import type { Skill } from "../types";

const skill: Skill = {
  id: "status-assistido",
  name: "Status do Assistido",
  description: "Ficha rápida: processos, prazos, situação prisional",
  icon: "User",
  triggers: ["status", "ficha", "situação", "como está", "dados"],
  params: [{ name: "assistido", extract: /(?:status|ficha|situa[çc][ãa]o|como\s+est[aá])\s+(?:do\s+)?(?:de\s+)?(.+)/i, required: true, entityType: "assistido" }],
  type: "panel",
  panel: { component: "StatusAssistidoPainel", title: "Status do Assistido" },
  category: "consulta",
};

export default skill;
```

`src/lib/skills/skills/buscar.ts`:
```typescript
import type { Skill } from "../types";

const skill: Skill = {
  id: "buscar",
  name: "Buscar",
  description: "Busca em documentos, processos e assistidos",
  icon: "Search",
  triggers: ["buscar", "procurar", "pesquisar", "achar", "encontrar"],
  params: [{ name: "termo", extract: /(?:buscar|procurar|pesquisar|achar|encontrar)\s+(.+)/i, required: true }],
  type: "panel",
  panel: { component: "BuscaPainel", title: "Resultados da Busca" },
  category: "consulta",
};

export default skill;
```

`src/lib/skills/skills/abrir-processo.ts`:
```typescript
import type { Skill } from "../types";

const skill: Skill = {
  id: "abrir-processo",
  name: "Abrir Processo",
  description: "Navega direto para um processo pelo número",
  icon: "ExternalLink",
  triggers: ["abrir processo", "abrir", "ir para processo", "ver processo"],
  params: [{ name: "numero", extract: /(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/i, required: true, entityType: "processo" }],
  type: "navigate",
  route: (params) => `/processos?search=${params.numero}`,
  category: "consulta",
};

export default skill;
```

`src/lib/skills/skills/audiencias-semana.ts`:
```typescript
import type { Skill } from "../types";

const skill: Skill = {
  id: "audiencias-semana",
  name: "Audiências da Semana",
  description: "Agenda de audiências dos próximos 7 dias",
  icon: "Calendar",
  triggers: ["audiências", "audiência", "agenda", "pauta", "audiências da semana"],
  triggerPattern: /audi[eê]ncias?\s*(semana|hoje|amanh[aã]|pr[oó]xim)?/i,
  type: "panel",
  panel: { component: "AudienciasPainel", title: "Audiências da Semana" },
  category: "consulta",
};

export default skill;
```

`src/lib/skills/skills/delegar.ts`:
```typescript
import type { Skill } from "../types";

const skill: Skill = {
  id: "delegar",
  name: "Delegar Demanda",
  description: "Atribui demanda a um estagiário ou servidor",
  icon: "UserPlus",
  triggers: ["delegar", "atribuir", "passar para", "delegar para"],
  params: [
    { name: "demanda", extract: /(?:delegar|atribuir|passar)\s+(?:demanda\s+)?(\d+)/i, required: true },
    { name: "usuario", extract: /(?:para|pra)\s+(.+)/i, required: true, entityType: "usuario" },
  ],
  type: "action",
  action: "demandas.delegar",
  category: "acao",
};

export default skill;
```

`src/lib/skills/skills/enviar-whatsapp.ts`:
```typescript
import type { Skill } from "../types";

const skill: Skill = {
  id: "enviar-whatsapp",
  name: "Enviar WhatsApp",
  description: "Abre conversa WhatsApp com assistido",
  icon: "MessageCircle",
  triggers: ["whatsapp", "mandar mensagem", "enviar whatsapp", "mensagem"],
  params: [{ name: "assistido", extract: /(?:whatsapp|mensagem)\s+(?:para\s+)?(?:do\s+)?(.+)/i, required: true, entityType: "assistido" }],
  type: "navigate",
  route: (params) => `/whatsapp?search=${params.assistido}`,
  category: "comunicacao",
};

export default skill;
```

`src/lib/skills/skills/mover-atribuicao.ts`:
```typescript
import type { Skill } from "../types";

const skill: Skill = {
  id: "mover-atribuicao",
  name: "Mover Atribuição",
  description: "Move assistido para outra área (Júri, VVD, EP, Substituição)",
  icon: "ArrowRightLeft",
  triggers: ["mover", "transferir", "mudar atribuição", "mover para"],
  params: [
    { name: "assistido", extract: /(?:mover|transferir)\s+(.+?)\s+para/i, required: true, entityType: "assistido" },
    { name: "area", extract: /para\s+(j[úu]ri|vvd|ep|substitui[çc][ãa]o|execu[çc][ãa]o)/i, required: true },
  ],
  type: "action",
  action: "assistidos.moverAtribuicao",
  category: "acao",
};

export default skill;
```

`src/lib/skills/skills/index.ts`:
```typescript
import type { Skill } from "../types";

import prazosVencendo from "./prazos-vencendo";
import intimacoesHoje from "./intimacoes-hoje";
import briefing from "./briefing";
import statusAssistido from "./status-assistido";
import buscar from "./buscar";
import abrirProcesso from "./abrir-processo";
import audienciasSemana from "./audiencias-semana";
import delegar from "./delegar";
import enviarWhatsapp from "./enviar-whatsapp";
import moverAtribuicao from "./mover-atribuicao";

const allSkills: Skill[] = [
  prazosVencendo,
  intimacoesHoje,
  briefing,
  statusAssistido,
  buscar,
  abrirProcesso,
  audienciasSemana,
  delegar,
  enviarWhatsapp,
  moverAtribuicao,
];

export default allSkills;
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/skills/skills/
git commit -m "feat(skills): add 10 initial skills (prazos, intimacoes, briefing, status, buscar, etc.)"
```

---

### Task 4: Executor + Delegate

**Files:**
- Create: `src/lib/skills/executor.ts`
- Create: `src/lib/skills/delegate.ts`

- [ ] **Step 1: Criar delegate.ts**

```typescript
// src/lib/skills/delegate.ts
import type { SkillDelegate } from "./types";

const DELEGATE_URLS: Record<string, string> = {
  cowork: "claude://cowork",
  manus: "manus://new",
};

export function buildDelegateUrl(
  delegate: SkillDelegate,
  params: Record<string, string>,
  context: string,
): string {
  // Substituir {{variáveis}} no template
  let prompt = delegate.promptTemplate;
  for (const [key, value] of Object.entries(params)) {
    prompt = prompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }

  // Adicionar contexto
  if (context) {
    prompt += `\n\nContexto adicional:\n${context}`;
  }

  const baseUrl = DELEGATE_URLS[delegate.target] ?? DELEGATE_URLS.cowork;
  return `${baseUrl}?prompt=${encodeURIComponent(prompt)}`;
}

export function copyPromptToClipboard(prompt: string): void {
  navigator.clipboard.writeText(prompt);
}

export function openDelegateApp(target: string): void {
  if (target === "cowork") {
    window.open("claude://", "_blank");
  } else if (target === "manus") {
    window.open("manus://", "_blank");
  }
}
```

- [ ] **Step 2: Criar executor.ts**

```typescript
// src/lib/skills/executor.ts
import type { Skill, SkillExecution, MatchResult } from "./types";
import { buildDelegateUrl, copyPromptToClipboard } from "./delegate";

export type ExecutionCallback = {
  navigate: (url: string) => void;
  openPanel: (title: string, component: string, params: Record<string, string>) => void;
  showToast: (message: string) => void;
  openDelegate: (url: string, fallbackPrompt: string) => void;
};

export async function executeSkill(
  match: MatchResult,
  callbacks: ExecutionCallback,
  contextFetcher?: (params: Record<string, string>) => Promise<string>,
): Promise<SkillExecution> {
  const { skill, params } = match;

  switch (skill.type) {
    case "navigate": {
      const url = typeof skill.route === "function"
        ? skill.route(params)
        : skill.route ?? "/";
      callbacks.navigate(url);
      return { skill, params };
    }

    case "panel": {
      if (skill.panel) {
        callbacks.openPanel(skill.panel.title, skill.panel.component, params);
      }
      return { skill, params };
    }

    case "action": {
      callbacks.showToast(`Executando: ${skill.name}...`);
      // A ação tRPC é chamada pelo componente que conhece o client
      return { skill, params };
    }

    case "delegate": {
      if (!skill.delegate) {
        return { skill, params, error: "Skill delegate sem configuração" };
      }

      // Buscar contexto enriquecido do banco
      let context = "";
      if (contextFetcher) {
        try {
          context = await contextFetcher(params);
        } catch {
          // Sem contexto, segue com o template base
        }
      }

      const url = buildDelegateUrl(skill.delegate, params, context);
      const prompt = skill.delegate.promptTemplate
        .replace(/\{\{(\w+)\}\}/g, (_, key) => params[key] ?? `{{${key}}}`);

      // Tenta deep link, fallback copia para clipboard
      callbacks.openDelegate(url, prompt + (context ? `\n\n${context}` : ""));

      return { skill, params, delegateUrl: url };
    }

    default:
      return { skill, params, error: `Tipo desconhecido: ${skill.type}` };
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/skills/executor.ts src/lib/skills/delegate.ts
git commit -m "feat(skills): add executor and delegate (Cowork/Manus deep link)"
```

---

### Task 5: Evoluir Command Palette Existente

**Files:**
- Modify: `src/components/shared/command-palette.tsx`

- [ ] **Step 1: Integrar Skill Engine no Command Palette existente**

Ler o arquivo existente primeiro. As mudanças:

1. Importar o skill engine:
```typescript
import { matchSkill, buildGeminiPayload } from "@/lib/skills/matcher";
import { initializeSkills, getAllSkills } from "@/lib/skills/registry";
import { executeSkill, type ExecutionCallback } from "@/lib/skills/executor";
import type { MatchResult } from "@/lib/skills/types";
```

2. Inicializar skills no mount:
```typescript
useEffect(() => {
  initializeSkills();
}, []);
```

3. Adicionar estado para skill matches:
```typescript
const [skillMatches, setSkillMatches] = useState<MatchResult[]>([]);
```

4. No onChange do search, além da busca existente, rodar skill matching:
```typescript
useEffect(() => {
  if (search.length >= 2) {
    const match = matchSkill(search);
    setSkillMatches(match ? [match] : []);
  } else {
    setSkillMatches([]);
  }
}, [search]);
```

5. Adicionar grupo "Skills" no CommandList, ANTES dos resultados de busca:
```typescript
{skillMatches.length > 0 && (
  <CommandGroup heading="Skills">
    {skillMatches.map(m => (
      <CommandItem
        key={m.skill.id}
        onSelect={() => {
          executeSkill(m, callbacks);
          setOpen(false);
        }}
      >
        <span className="text-sm font-medium">{m.skill.name}</span>
        <span className="text-xs text-muted-foreground ml-2">{m.skill.description}</span>
        {m.matchedBy === "command" && <CommandShortcut>/{m.skill.id}</CommandShortcut>}
      </CommandItem>
    ))}
  </CommandGroup>
)}
```

6. Ao abrir (search vazio), mostrar urgentes e todas as skills como sugestão:
```typescript
{!search && (
  <>
    <CommandGroup heading="Skills Disponíveis">
      {getAllSkills().slice(0, 6).map(s => (
        <CommandItem key={s.id} onSelect={() => { /* ... */ }}>
          <span>{s.name}</span>
          <CommandShortcut>/{s.id}</CommandShortcut>
        </CommandItem>
      ))}
    </CommandGroup>
  </>
)}
```

7. Definir callbacks que usam router do Next.js:
```typescript
const router = useRouter();
const callbacks: ExecutionCallback = {
  navigate: (url) => { router.push(url); setOpen(false); },
  openPanel: (title, component, params) => { /* abre chat lateral */ },
  showToast: (msg) => toast(msg),
  openDelegate: (url, fallback) => {
    try { window.open(url, "_blank"); }
    catch { copyPromptToClipboard(fallback); toast("Prompt copiado para clipboard!"); }
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/shared/command-palette.tsx
git commit -m "feat(skills): integrate skill engine into existing command palette"
```

---

### Task 6: Chat Lateral

**Files:**
- Create: `src/components/shared/chat-panel.tsx`
- Create: `src/hooks/use-chat-panel.ts`
- Create: `src/components/shared/skill-result.tsx`
- Modify: `src/components/layouts/admin-sidebar.tsx`

- [ ] **Step 1: Criar hook use-chat-panel.ts**

```typescript
// src/hooks/use-chat-panel.ts
"use client";

import { create } from "zustand";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  skillId?: string;
  data?: unknown;
  timestamp: Date;
}

interface ChatPanelState {
  isOpen: boolean;
  messages: ChatMessage[];
  assistidoId: number | null;
  assistidoNome: string | null;
  toggle: () => void;
  open: () => void;
  close: () => void;
  addMessage: (msg: Omit<ChatMessage, "id" | "timestamp">) => void;
  setAssistido: (id: number | null, nome: string | null) => void;
  clearMessages: () => void;
}

export const useChatPanel = create<ChatPanelState>((set) => ({
  isOpen: false,
  messages: [],
  assistidoId: null,
  assistidoNome: null,
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  addMessage: (msg) =>
    set((s) => ({
      messages: [...s.messages, {
        ...msg,
        id: crypto.randomUUID(),
        timestamp: new Date(),
      }],
    })),
  setAssistido: (id, nome) => set({ assistidoId: id, assistidoNome: nome, messages: [] }),
  clearMessages: () => set({ messages: [] }),
}));
```

- [ ] **Step 2: Criar skill-result.tsx**

```typescript
// src/components/shared/skill-result.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import Link from "next/link";

interface SkillResultProps {
  skillName: string;
  type: string;
  data?: unknown;
  route?: string;
  delegateUrl?: string;
}

export function SkillResult({ skillName, type, data, route, delegateUrl }: SkillResultProps) {
  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Badge variant="default" className="text-xs">{skillName}</Badge>
        <span className="text-xs text-muted-foreground">{type}</span>
      </div>

      {route && (
        <Link href={route}>
          <Button size="sm" variant="outline" className="gap-1">
            <ExternalLink className="h-3 w-3" /> Abrir
          </Button>
        </Link>
      )}

      {delegateUrl && (
        <p className="text-xs text-muted-foreground">Enviado para Cowork</p>
      )}

      {data && typeof data === "object" && (
        <pre className="text-xs bg-zinc-100 dark:bg-zinc-800 p-2 rounded overflow-auto max-h-40">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Criar chat-panel.tsx**

```typescript
// src/components/shared/chat-panel.tsx
"use client";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, X, MessageSquare } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useChatPanel } from "@/hooks/use-chat-panel";
import { matchSkill } from "@/lib/skills/matcher";
import { executeSkill, type ExecutionCallback } from "@/lib/skills/executor";
import { initializeSkills } from "@/lib/skills/registry";
import { SkillResult } from "./skill-result";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function ChatPanel() {
  const { isOpen, close, messages, addMessage, assistidoNome } = useChatPanel();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => { initializeSkills(); }, []);
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const callbacks: ExecutionCallback = {
    navigate: (url) => { router.push(url); },
    openPanel: (title, _component, params) => {
      addMessage({ role: "assistant", content: `Abrindo: ${title}`, data: params });
    },
    showToast: (msg) => toast(msg),
    openDelegate: (url, fallback) => {
      try { window.open(url, "_blank"); }
      catch { navigator.clipboard.writeText(fallback); toast("Prompt copiado!"); }
    },
  };

  async function handleSend() {
    if (!input.trim()) return;
    const text = input.trim();
    setInput("");

    addMessage({ role: "user", content: text });

    const match = matchSkill(text);
    if (match) {
      const result = await executeSkill(match, callbacks);
      addMessage({
        role: "assistant",
        content: `Executando: ${match.skill.name}`,
        skillId: match.skill.id,
        data: result,
      });
    } else {
      addMessage({
        role: "assistant",
        content: "Não entendi. Tente: /prazos, /briefing, /buscar, /status",
      });
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
      <SheetContent side="right" className="w-80 p-0 flex flex-col">
        {/* Header */}
        <div className="p-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="font-medium text-sm">Assistente OMBUDS</span>
          </div>
          {assistidoNome && (
            <Badge variant="default" className="text-xs truncate max-w-[120px]">
              {assistidoNome}
            </Badge>
          )}
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-3">
          <div className="space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className={msg.role === "user" ? "text-right" : ""}>
                <div className={`inline-block rounded-lg px-3 py-2 text-sm max-w-[90%] ${
                  msg.role === "user"
                    ? "bg-emerald-600 text-white"
                    : "bg-zinc-100 dark:bg-zinc-800"
                }`}>
                  {msg.content}
                </div>
                {msg.data && (
                  <div className="mt-1">
                    <SkillResult
                      skillName={msg.skillId ?? ""}
                      type={(msg.data as any)?.skill?.type ?? ""}
                      route={(msg.data as any)?.skill?.route}
                      delegateUrl={(msg.data as any)?.delegateUrl}
                    />
                  </div>
                )}
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-3 border-t flex gap-2">
          <input
            className="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-md px-3 py-2 text-sm outline-none"
            placeholder="O que você precisa?"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <Button size="icon" variant="ghost" onClick={handleSend}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 4: Adicionar ChatPanel e toggle no sidebar**

Em `src/components/layouts/admin-sidebar.tsx`, adicionar:

Import:
```typescript
import { ChatPanel } from "@/components/shared/chat-panel";
import { useChatPanel } from "@/hooks/use-chat-panel";
import { MessageSquare } from "lucide-react";
```

Junto aos outros controles do header (ThemeToggle, Notifications):
```typescript
<Button variant="ghost" size="icon" onClick={() => useChatPanel.getState().toggle()}>
  <MessageSquare className="h-4 w-4" />
</Button>
```

No final do JSX, antes do `</SidebarProvider>`:
```typescript
<ChatPanel />
```

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-chat-panel.ts src/components/shared/chat-panel.tsx src/components/shared/skill-result.tsx src/components/layouts/admin-sidebar.tsx
git commit -m "feat(skills): add chat lateral panel with skill execution"
```

---

### Task 7: Schema chat_history + tRPC Router

**Files:**
- Modify: `src/lib/db/schema/core.ts`
- Create: `src/lib/trpc/routers/skills.ts`
- Modify: `src/lib/trpc/routers/index.ts`

- [ ] **Step 1: Adicionar tabela chat_history**

Em `src/lib/db/schema/core.ts`, adicionar ao final:

```typescript
// ==========================================
// CHAT HISTORY (Skills)
// ==========================================

export const chatHistory = pgTable("chat_history", {
  id: serial("id").primaryKey(),
  assistidoId: integer("assistido_id").references(() => assistidos.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id),
  role: varchar("role", { length: 20 }).notNull(),
  content: text("content").notNull(),
  skillId: varchar("skill_id", { length: 50 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

- [ ] **Step 2: Gerar migration**

```bash
npm run db:generate && npm run db:push
```

- [ ] **Step 3: Criar tRPC router**

```typescript
// src/lib/trpc/routers/skills.ts
import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { chatHistory, assistidos, processos } from "@/lib/db/schema";
import { eq, ilike, desc, and } from "drizzle-orm";

export const skillsRouter = router({
  // Autocomplete de entidades para parâmetros de skills
  autocomplete: protectedProcedure
    .input(z.object({
      type: z.enum(["assistido", "processo", "usuario"]),
      query: z.string().min(2),
      limit: z.number().default(5),
    }))
    .query(async ({ input }) => {
      if (input.type === "assistido") {
        return db.query.assistidos.findMany({
          where: ilike(assistidos.nome, `%${input.query}%`),
          columns: { id: true, nome: true, atribuicaoPrimaria: true },
          limit: input.limit,
        });
      }
      if (input.type === "processo") {
        return db.query.processos.findMany({
          where: ilike(processos.numeroAutos, `%${input.query}%`),
          columns: { id: true, numeroAutos: true, atribuicao: true },
          limit: input.limit,
        });
      }
      return [];
    }),

  // Chat history por assistido
  chatHistory: protectedProcedure
    .input(z.object({ assistidoId: z.number() }))
    .query(async ({ input }) => {
      return db.select()
        .from(chatHistory)
        .where(eq(chatHistory.assistidoId, input.assistidoId))
        .orderBy(desc(chatHistory.createdAt))
        .limit(50);
    }),

  // Salvar mensagem no chat
  saveMessage: protectedProcedure
    .input(z.object({
      assistidoId: z.number().nullable(),
      role: z.string(),
      content: z.string(),
      skillId: z.string().nullable().optional(),
      metadata: z.any().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await db.insert(chatHistory).values({
        assistidoId: input.assistidoId,
        userId: ctx.user.id,
        role: input.role,
        content: input.content,
        skillId: input.skillId,
        metadata: input.metadata,
      });
    }),
});
```

- [ ] **Step 4: Registrar no root router**

Em `src/lib/trpc/routers/index.ts`:
```typescript
import { skillsRouter } from "./skills";
// Adicionar: skills: skillsRouter,
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/schema/core.ts src/lib/trpc/routers/skills.ts src/lib/trpc/routers/index.ts drizzle/
git commit -m "feat(skills): add chat_history schema and skills tRPC router"
```

---

### Task 8: Integração Final + Testes

**Files:**
- Modify: various (integração)

- [ ] **Step 1: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules\|schema.old" | head -20
```

- [ ] **Step 2: Rodar testes**

```bash
npx vitest run __tests__/skills-matcher.test.ts
```

- [ ] **Step 3: Build**

```bash
npm run build 2>&1 | tail -10
```

- [ ] **Step 4: Testar no dev server**

```bash
npm run dev
# Abrir localhost:3000
# Testar:
# 1. ⌘K → digitar "prazos" → deve mostrar skill "Prazos Vencendo"
# 2. ⌘K → digitar "/briefing Gabriel" → deve abrir Cowork
# 3. Chat lateral → digitar "status Adriano" → deve mostrar painel
```

- [ ] **Step 5: Commit final**

```bash
git add -A
git commit -m "feat(skills): OMBUDS Skills Engine — command bar + chat lateral + 10 skills + Cowork delegation"
```

---

## Ordem de Execução

| Task | Dependência | Pode paralelizar |
|------|-------------|------------------|
| Task 1 (Types + Registry) | Nenhuma | — |
| Task 2 (Matcher) | Task 1 | Task 3 |
| Task 3 (10 Skills) | Task 1 | Task 2 |
| Task 4 (Executor + Delegate) | Task 1 | Task 2, 3 |
| Task 5 (Command Palette) | Task 2, 3, 4 | Task 6 |
| Task 6 (Chat Lateral) | Task 4 | Task 5 |
| Task 7 (Schema + tRPC) | Nenhuma | Tasks 1-4 |
| Task 8 (Integração) | Todas | — |
