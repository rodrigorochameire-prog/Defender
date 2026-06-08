# Parser de MPU deferidas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Parsear deterministicamente o texto de uma decisão de MPU (Lei 11.340/2006) para identificar as medidas deferidas e gerar dados estruturados que alimentam o monitoramento (esteira VVD).

**Architecture:** Função pura `parseDecisaoMPU` sobre um catálogo canônico (art. 22) → orquestrador transacional `aplicarMedidasMPU` que persiste em nova tabela `medidas_mpu` e move o estado do `processos_vvd`/`historico_mpu` → gatilho no `registros.create` (espelhando o hook de audiência já existente) + query de preview.

**Tech Stack:** TypeScript, Drizzle ORM (Postgres), tRPC, Vitest. Repo: `/Users/rodrigorochameire/Projetos/Defender`, branch `feat/parser-mpu-medidas`.

**Spec:** `docs/superpowers/specs/2026-06-07-parser-mpu-medidas-design.md`

---

## File Structure

- Create `src/lib/mpu/medidas-taxonomia.ts` — enum de códigos, vocabulários fechados, catálogo de gatilhos/extratores.
- Create `src/lib/mpu/parse-decisao.ts` — `parseDecisaoMPU(texto): DecisaoMPUParsed` (pura).
- Create `src/lib/mpu/__tests__/parse-decisao.test.ts` — fixtures + asserts.
- Modify `src/lib/db/schema/vvd.ts` — tabela drizzle `medidasMPU`.
- Create `drizzle/0048_medidas_mpu.sql` — DDL.
- Create `src/lib/mpu/aplicar-medidas-mpu.ts` — orquestrador transacional (recebe `tx`).
- Modify `src/lib/trpc/routers/registros.ts` — hook no `create` + payload `medidasCriadas`.
- Create/Modify `src/lib/trpc/routers/mpu.ts` — query `previewMedidas` (criar router e registrar em `index.ts`).
- Modify `src/components/registros/registro-editor.tsx` — exibir `medidasCriadas` (espelha `audienciaCriada`).

---

## Task 1: Taxonomia canônica

**Files:**
- Create: `src/lib/mpu/medidas-taxonomia.ts`

- [ ] **Step 1: Escrever o módulo de taxonomia**

```ts
// src/lib/mpu/medidas-taxonomia.ts
// Catálogo canônico das medidas protetivas de urgência (Lei 11.340/2006).
// Única fonte de verdade dos códigos, vocabulários e gatilhos de parsing.

export const MEDIDA_MPU = {
  SUSPENSAO_PORTE_ARMA: "SUSPENSAO_PORTE_ARMA",
  AFASTAMENTO_LAR: "AFASTAMENTO_LAR",
  PROIBICAO_APROXIMACAO: "PROIBICAO_APROXIMACAO",
  PROIBICAO_CONTATO: "PROIBICAO_CONTATO",
  PROIBICAO_FREQUENTAR: "PROIBICAO_FREQUENTAR",
  RESTRICAO_VISITAS: "RESTRICAO_VISITAS",
  ALIMENTOS_PROVISORIOS: "ALIMENTOS_PROVISORIOS",
  MONITORACAO_ELETRONICA: "MONITORACAO_ELETRONICA",
  OUTRA: "OUTRA",
} as const;

export type MedidaMpuCodigo = (typeof MEDIDA_MPU)[keyof typeof MEDIDA_MPU];

export type Protegido = "ofendida" | "familiares" | "testemunhas";
export type MeioContato =
  | "telefone"
  | "email"
  | "redes_sociais"
  | "mensagens"
  | "interposta_pessoa";
export type Lugar = "residencia_vitima" | "trabalho_vitima" | "outro";

export interface CatalogoMedida {
  codigo: MedidaMpuCodigo;
  artigo: string;
  rotulo: string;
  /** Regex de gatilho (já aplicada sobre texto normalizado: minúsculo, sem acento). */
  gatilhos: RegExp[];
}

// Ordem importa: itens mais específicos antes do fallback OUTRA.
export const CATALOGO_MEDIDAS: CatalogoMedida[] = [
  {
    codigo: MEDIDA_MPU.SUSPENSAO_PORTE_ARMA,
    artigo: "22, I",
    rotulo: "Suspensão da posse / restrição do porte de armas",
    gatilhos: [/(suspensao|restricao).{0,30}(posse|porte).{0,15}arma/, /entrega.{0,15}arma/],
  },
  {
    codigo: MEDIDA_MPU.AFASTAMENTO_LAR,
    artigo: "22, II",
    rotulo: "Afastamento do lar",
    gatilhos: [/afastamento do (lar|domicilio)/, /afastar-se do (lar|domicilio)/],
  },
  {
    codigo: MEDIDA_MPU.PROIBICAO_APROXIMACAO,
    artigo: "22, III, a",
    rotulo: "Proibição de aproximação",
    gatilhos: [/proibicao de aproximacao/, /proibido.{0,20}aproximar/, /nao.{0,10}aproximar/],
  },
  {
    codigo: MEDIDA_MPU.PROIBICAO_CONTATO,
    artigo: "22, III, b",
    rotulo: "Proibição de contato",
    gatilhos: [/proibicao de contato/, /proibido.{0,20}contato/, /nao.{0,10}contatar/],
  },
  {
    codigo: MEDIDA_MPU.PROIBICAO_FREQUENTAR,
    artigo: "22, III, c",
    rotulo: "Proibição de frequentar lugares",
    gatilhos: [/proibicao de frequentar/, /proibido.{0,20}frequentar/, /nao.{0,10}frequentar/],
  },
  {
    codigo: MEDIDA_MPU.RESTRICAO_VISITAS,
    artigo: "22, IV",
    rotulo: "Restrição/suspensão de visitas aos dependentes",
    gatilhos: [/(restricao|suspensao).{0,20}visita/, /visita.{0,20}dependente/],
  },
  {
    codigo: MEDIDA_MPU.ALIMENTOS_PROVISORIOS,
    artigo: "22, V",
    rotulo: "Alimentos provisórios/provisionais",
    gatilhos: [/alimentos provis(orios|ionais)/, /prestacao de alimentos/],
  },
  {
    codigo: MEDIDA_MPU.MONITORACAO_ELETRONICA,
    artigo: "art. 22",
    rotulo: "Monitoração eletrônica",
    gatilhos: [/monitoracao eletronica/, /tornozeleira/],
  },
];

/** Remove acentos e baixa a caixa — usado em todo matching. */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}
```

- [ ] **Step 2: Verificar que compila (typecheck)**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit -p tsconfig.json 2>&1 | grep medidas-taxonomia || echo "OK: sem erros no módulo"`
Expected: `OK: sem erros no módulo`

- [ ] **Step 3: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/lib/mpu/medidas-taxonomia.ts
git commit -m "feat(mpu): catálogo canônico das medidas protetivas (art. 22)"
```

---

## Task 2: Parser puro — caso canônico (decisão Cacia)

**Files:**
- Create: `src/lib/mpu/parse-decisao.ts`
- Test: `src/lib/mpu/__tests__/parse-decisao.test.ts`

- [ ] **Step 1: Escrever o teste que falha (caso Cacia, 4 medidas com alíneas)**

```ts
// src/lib/mpu/__tests__/parse-decisao.test.ts
import { describe, it, expect } from "vitest";
import { parseDecisaoMPU } from "../parse-decisao";

const DECISAO_CACIA = `Pelo exposto, com fundamento nos artigos 19, 20 e 22 da Lei nº 11.340/2006, DEFIRO o pedido de Medidas Protetivas de Urgência em favor de CACIA SANTOS DE CARVALHO e, por consequência, determino que ADALBERTO MACHADO DE LIMA cumpra, imediatamente, as seguintes obrigações:

a) AFASTAMENTO DO LAR, domicílio ou local de convivência com a ofendida, devendo retirar do imóvel apenas seus bens de uso estritamente pessoal, sob acompanhamento policial, se necessário;

b) PROIBIÇÃO DE APROXIMAÇÃO da ofendida, de seus familiares e das testemunhas, fixando o limite mínimo de 300 (trezentos) metros de distância entre estes e o agressor;

c) PROIBIÇÃO DE CONTATO com a ofendida, seus familiares e testemunhas, por qualquer meio de comunicação, seja por telefone, e-mail, redes sociais, aplicativos de mensagens ou por interposta pessoa;

d) PROIBIÇÃO DE FREQUENTAR o local de residência e o local de trabalho da vítima, a fim de preservar a integridade física e psicológica da ofendida.`;

describe("parseDecisaoMPU — decisão Cacia (4 medidas)", () => {
  const r = parseDecisaoMPU(DECISAO_CACIA);

  it("extrai partes e fundamentos", () => {
    expect(r.ofendida).toBe("CACIA SANTOS DE CARVALHO");
    expect(r.agressor).toBe("ADALBERTO MACHADO DE LIMA");
    expect(r.fundamentos).toEqual(
      expect.arrayContaining(["art. 19", "art. 20", "art. 22"]),
    );
    expect(r.prazoDias).toBeNull();
  });

  it("identifica as 4 medidas pelos códigos", () => {
    expect(r.medidas.map((m) => m.codigo).sort()).toEqual(
      [
        "AFASTAMENTO_LAR",
        "PROIBICAO_APROXIMACAO",
        "PROIBICAO_CONTATO",
        "PROIBICAO_FREQUENTAR",
      ].sort(),
    );
  });

  it("extrai distância de 300m na aproximação", () => {
    const aprox = r.medidas.find((m) => m.codigo === "PROIBICAO_APROXIMACAO");
    expect(aprox?.distanciaMetros).toBe(300);
    expect(aprox?.protegidos).toEqual(
      expect.arrayContaining(["ofendida", "familiares", "testemunhas"]),
    );
  });

  it("extrai meios de contato vedados", () => {
    const contato = r.medidas.find((m) => m.codigo === "PROIBICAO_CONTATO");
    expect(contato?.meios).toEqual(
      expect.arrayContaining([
        "telefone",
        "email",
        "redes_sociais",
        "mensagens",
        "interposta_pessoa",
      ]),
    );
  });

  it("extrai lugares vedados", () => {
    const freq = r.medidas.find((m) => m.codigo === "PROIBICAO_FREQUENTAR");
    expect(freq?.lugares).toEqual(
      expect.arrayContaining(["residencia_vitima", "trabalho_vitima"]),
    );
  });
});
```

- [ ] **Step 2: Rodar o teste — deve falhar (módulo não existe)**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx vitest run src/lib/mpu/__tests__/parse-decisao.test.ts`
Expected: FAIL — `Cannot find module '../parse-decisao'`.

- [ ] **Step 3: Implementar o parser**

```ts
// src/lib/mpu/parse-decisao.ts
import {
  CATALOGO_MEDIDAS,
  MEDIDA_MPU,
  normalizar,
  type Lugar,
  type MedidaMpuCodigo,
  type MeioContato,
  type Protegido,
} from "./medidas-taxonomia";

export interface MedidaParsed {
  codigo: MedidaMpuCodigo;
  artigo: string;
  literal: string;
  distanciaMetros?: number;
  protegidos?: Protegido[];
  meios?: MeioContato[];
  lugares?: Lugar[];
  valor?: string;
}

export interface DecisaoMPUParsed {
  ofendida: string | null;
  agressor: string | null;
  fundamentos: string[];
  prazoDias: number | null;
  medidas: MedidaParsed[];
}

/** Divide o texto em segmentos: por alíneas (a) b)…) ou incisos (I - II -). */
function segmentar(texto: string): string[] {
  const porAlinea = texto.split(/(?=^\s*[a-z]\)\s)/im).filter((s) => /^\s*[a-z]\)/i.test(s));
  if (porAlinea.length >= 2) return porAlinea;
  const porInciso = texto
    .split(/(?=\b[IVX]{1,4}\s*[-–]\s)/g)
    .filter((s) => /^\s*[IVX]{1,4}\s*[-–]/.test(s));
  if (porInciso.length >= 2) return porInciso;
  return [texto];
}

function extrairProtegidos(norm: string): Protegido[] {
  const out: Protegido[] = [];
  if (/ofendida|vitima/.test(norm)) out.push("ofendida");
  if (/familiar/.test(norm)) out.push("familiares");
  if (/testemunha/.test(norm)) out.push("testemunhas");
  return out;
}

function extrairMeios(norm: string): MeioContato[] {
  const out: MeioContato[] = [];
  if (/telefone|ligac|whatsapp/.test(norm)) out.push("telefone");
  if (/e-?mail/.test(norm)) out.push("email");
  if (/rede(s)? soci/.test(norm)) out.push("redes_sociais");
  if (/mensagem|aplicativo/.test(norm)) out.push("mensagens");
  if (/interposta pessoa|terceiro/.test(norm)) out.push("interposta_pessoa");
  return out;
}

function extrairLugares(norm: string): Lugar[] {
  const out: Lugar[] = [];
  if (/residencia|moradia|casa da (vitima|ofendida)/.test(norm)) out.push("residencia_vitima");
  if (/(local|lugar)? ?de trabalho|emprego/.test(norm)) out.push("trabalho_vitima");
  return out;
}

function extrairDistancia(norm: string): number | undefined {
  const m = norm.match(/(\d{1,4})\s*(?:\([^)]*\)\s*)?met/);
  return m ? parseInt(m[1], 10) : undefined;
}

function enriquecer(codigo: MedidaMpuCodigo, segmentoNorm: string): Partial<MedidaParsed> {
  switch (codigo) {
    case MEDIDA_MPU.PROIBICAO_APROXIMACAO:
      return {
        distanciaMetros: extrairDistancia(segmentoNorm),
        protegidos: extrairProtegidos(segmentoNorm),
      };
    case MEDIDA_MPU.PROIBICAO_CONTATO:
      return {
        meios: extrairMeios(segmentoNorm),
        protegidos: extrairProtegidos(segmentoNorm),
      };
    case MEDIDA_MPU.PROIBICAO_FREQUENTAR:
      return { lugares: extrairLugares(segmentoNorm) };
    default:
      return {};
  }
}

function extrairPartes(texto: string): { ofendida: string | null; agressor: string | null } {
  const ofendida = texto.match(/em favor de\s+([A-ZÀ-Ý][A-ZÀ-Ý\s]+?)\s+e,/);
  const agressor = texto.match(/determino que\s+([A-ZÀ-Ý][A-ZÀ-Ý\s]+?)\s+cumpra/);
  return {
    ofendida: ofendida ? ofendida[1].trim() : null,
    agressor: agressor ? agressor[1].trim() : null,
  };
}

function extrairFundamentos(norm: string): string[] {
  const out = new Set<string>();
  const re = /artigos?\s+([\d,\se]+?)\s+da lei/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(norm))) {
    for (const n of m[1].match(/\d+/g) ?? []) out.add(`art. ${n}`);
  }
  return [...out];
}

function extrairPrazo(norm: string): number | null {
  const m = norm.match(/prazo de\s+(\d+)\s*\(?[^)]*\)?\s*dias/);
  return m ? parseInt(m[1], 10) : null;
}

export function parseDecisaoMPU(texto: string): DecisaoMPUParsed {
  if (!texto || !texto.trim()) {
    return { ofendida: null, agressor: null, fundamentos: [], prazoDias: null, medidas: [] };
  }
  const normFull = normalizar(texto);
  const { ofendida, agressor } = extrairPartes(texto);

  const segmentos = segmentar(texto);
  const porCodigo = new Map<MedidaMpuCodigo, MedidaParsed>();

  for (const seg of segmentos) {
    const segNorm = normalizar(seg);
    for (const cat of CATALOGO_MEDIDAS) {
      if (cat.gatilhos.some((g) => g.test(segNorm)) && !porCodigo.has(cat.codigo)) {
        porCodigo.set(cat.codigo, {
          codigo: cat.codigo,
          artigo: cat.artigo,
          literal: seg.trim().slice(0, 500),
          ...enriquecer(cat.codigo, segNorm),
        });
      }
    }
  }

  // Passo global: pega medidas em texto corrido que a segmentação não isolou.
  for (const cat of CATALOGO_MEDIDAS) {
    if (!porCodigo.has(cat.codigo) && cat.gatilhos.some((g) => g.test(normFull))) {
      porCodigo.set(cat.codigo, {
        codigo: cat.codigo,
        artigo: cat.artigo,
        literal: texto.trim().slice(0, 500),
        ...enriquecer(cat.codigo, normFull),
      });
    }
  }

  return {
    ofendida,
    agressor,
    fundamentos: extrairFundamentos(normFull),
    prazoDias: extrairPrazo(normFull),
    medidas: [...porCodigo.values()],
  };
}
```

- [ ] **Step 4: Rodar o teste — deve passar**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx vitest run src/lib/mpu/__tests__/parse-decisao.test.ts`
Expected: PASS (5 testes verdes).

- [ ] **Step 5: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/lib/mpu/parse-decisao.ts src/lib/mpu/__tests__/parse-decisao.test.ts
git commit -m "feat(mpu): parseDecisaoMPU determinístico (caso canônico)"
```

---

## Task 3: Parser — variações (incisos romanos, corrido, prazo, tornozeleira, indeferimento)

**Files:**
- Test: `src/lib/mpu/__tests__/parse-decisao.test.ts` (acrescentar)

- [ ] **Step 1: Acrescentar os testes de variação ao final do arquivo**

```ts
describe("parseDecisaoMPU — variações", () => {
  it("incisos romanos (I - II -)", () => {
    const t = `DEFIRO as medidas: I - afastamento do lar; II - proibição de aproximação, distância de 200 metros da ofendida.`;
    const r = parseDecisaoMPU(t);
    expect(r.medidas.map((m) => m.codigo).sort()).toEqual(
      ["AFASTAMENTO_LAR", "PROIBICAO_APROXIMACAO"].sort(),
    );
    expect(r.medidas.find((m) => m.codigo === "PROIBICAO_APROXIMACAO")?.distanciaMetros).toBe(200);
  });

  it("texto corrido (sem enumeração)", () => {
    const t = `Defiro a proibição de contato com a vítima por telefone e a proibição de frequentar o seu local de trabalho.`;
    const r = parseDecisaoMPU(t);
    expect(r.medidas.map((m) => m.codigo).sort()).toEqual(
      ["PROIBICAO_CONTATO", "PROIBICAO_FREQUENTAR"].sort(),
    );
  });

  it("captura prazo em dias", () => {
    const t = `Defiro o afastamento do lar pelo prazo de 90 (noventa) dias.`;
    expect(parseDecisaoMPU(t).prazoDias).toBe(90);
  });

  it("tornozeleira + suspensão de porte", () => {
    const t = `Determino a monitoração eletrônica (tornozeleira) e a suspensão do porte de arma de fogo do requerido.`;
    const r = parseDecisaoMPU(t);
    expect(r.medidas.map((m) => m.codigo).sort()).toEqual(
      ["MONITORACAO_ELETRONICA", "SUSPENSAO_PORTE_ARMA"].sort(),
    );
  });

  it("não inventa medidas em texto sem nenhuma", () => {
    const t = `Indefiro o pedido por ausência de elementos. Arquive-se.`;
    expect(parseDecisaoMPU(t).medidas).toEqual([]);
  });
});
```

- [ ] **Step 2: Rodar — observar quais passam/falham**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx vitest run src/lib/mpu/__tests__/parse-decisao.test.ts`
Expected: caso algum falhe, ajustar os gatilhos/extratores em `parse-decisao.ts` ou `medidas-taxonomia.ts` (ex.: regex de distância, separador de incisos) até todos passarem. Não relaxar asserts.

- [ ] **Step 3: Rodar de novo até verde**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx vitest run src/lib/mpu/__tests__/parse-decisao.test.ts`
Expected: PASS (todos).

- [ ] **Step 4: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/lib/mpu/
git commit -m "test(mpu): cobre variações de redação do parser"
```

---

## Task 4: Tabela `medidas_mpu` (migration + schema)

**Files:**
- Create: `drizzle/0048_medidas_mpu.sql`
- Modify: `src/lib/db/schema/vvd.ts`

- [ ] **Step 1: Escrever a migration SQL**

```sql
-- drizzle/0048_medidas_mpu.sql
CREATE TABLE IF NOT EXISTS "medidas_mpu" (
  "id" serial PRIMARY KEY NOT NULL,
  "processo_vvd_id" integer NOT NULL REFERENCES "processos_vvd"("id") ON DELETE CASCADE,
  "codigo" varchar(40) NOT NULL,
  "artigo" varchar(20),
  "distancia_metros" integer,
  "parametros" jsonb,
  "literal" text,
  "data_decisao" date,
  "data_vencimento" date,
  "status" varchar(20) DEFAULT 'ativa',
  "origem" varchar(20) DEFAULT 'parser',
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "medidas_mpu_processo_vvd_id_idx" ON "medidas_mpu" ("processo_vvd_id");
CREATE INDEX IF NOT EXISTS "medidas_mpu_status_idx" ON "medidas_mpu" ("status");
```

- [ ] **Step 2: Adicionar a tabela drizzle ao schema**

Adicionar em `src/lib/db/schema/vvd.ts` logo após o bloco `historicoMPU` (por volta da linha 340, antes das RELAÇÕES). `jsonb` já está importado no topo do arquivo.

```ts
// ==========================================
// MEDIDAS MPU — uma linha por medida deferida (modelo novo)
// Origem 'parser' = derivada do texto da decisão; 'manual' = editada pelo defensor.
// ==========================================
export const medidasMPU = pgTable("medidas_mpu", {
  id: serial("id").primaryKey(),
  processoVvdId: integer("processo_vvd_id")
    .notNull()
    .references(() => processosVVD.id, { onDelete: "cascade" }),
  codigo: varchar("codigo", { length: 40 }).notNull(),
  artigo: varchar("artigo", { length: 20 }),
  distanciaMetros: integer("distancia_metros"),
  parametros: jsonb("parametros").$type<{
    protegidos?: string[];
    meios?: string[];
    lugares?: string[];
    valor?: string;
  }>(),
  literal: text("literal"),
  dataDecisao: date("data_decisao"),
  dataVencimento: date("data_vencimento"),
  status: varchar("status", { length: 20 }).default("ativa"),
  origem: varchar("origem", { length: 20 }).default("parser"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("medidas_mpu_processo_vvd_id_idx").on(table.processoVvdId),
  index("medidas_mpu_status_idx").on(table.status),
]);

export type MedidaMPURow = typeof medidasMPU.$inferSelect;
export type InsertMedidaMPU = typeof medidasMPU.$inferInsert;
```

- [ ] **Step 3: Aplicar a migration no banco de dev**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx drizzle-kit push 2>&1 | tail -15`
Expected: aplica a criação de `medidas_mpu` sem erro (ou confirma "No changes" se já criada via SQL). Se `drizzle-kit push` for interativo, rodar o SQL direto: `psql "$DATABASE_URL" -f drizzle/0048_medidas_mpu.sql`.

- [ ] **Step 4: Verificar typecheck do schema**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit 2>&1 | grep -E "vvd.ts|medidasMPU" || echo "OK"`
Expected: `OK`.

- [ ] **Step 5: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add drizzle/0048_medidas_mpu.sql src/lib/db/schema/vvd.ts
git commit -m "feat(mpu): tabela medidas_mpu (1 linha por medida)"
```

---

## Task 5: Orquestrador `aplicarMedidasMPU` (persist + esteira + histórico)

**Files:**
- Create: `src/lib/mpu/aplicar-medidas-mpu.ts`
- Test: `src/lib/mpu/__tests__/aplicar-medidas-mpu.test.ts`

- [ ] **Step 1: Escrever teste de resumo (função pura auxiliar)**

A persistência usa `tx` (difícil de unit-testar sem banco). Isolar e testar a lógica pura `resumirParaProcessoVVD`, que converte o parse nos campos de `processos_vvd`.

```ts
// src/lib/mpu/__tests__/aplicar-medidas-mpu.test.ts
import { describe, it, expect } from "vitest";
import { resumirParaProcessoVVD } from "../aplicar-medidas-mpu";
import { parseDecisaoMPU } from "../parse-decisao";

const DECISAO = `DEFIRO em favor de MARIA cumpra JOAO: a) afastamento do lar; b) proibição de aproximação, mínimo de 300 metros da ofendida. Pelo prazo de 180 dias.`;

describe("resumirParaProcessoVVD", () => {
  it("deriva os campos da esteira a partir do parse", () => {
    const parsed = parseDecisaoMPU(DECISAO);
    const res = resumirParaProcessoVVD(parsed, "2026-06-01");
    expect(res.mpuAtiva).toBe(true);
    expect(res.faseProcedimento).toBe("decisao_liminar");
    expect(res.motivoUltimaIntimacao).toBe("ciencia_decisao_mpu");
    expect(res.distanciaMinima).toBe(300);
    expect(res.prazoMpuDias).toBe(180);
    expect(res.dataDecisaoMPU).toBe("2026-06-01");
    expect(res.dataVencimentoMPU).toBe("2026-11-28"); // 2026-06-01 + 180 dias
  });
});
```

- [ ] **Step 2: Rodar — deve falhar (módulo não existe)**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx vitest run src/lib/mpu/__tests__/aplicar-medidas-mpu.test.ts`
Expected: FAIL — `Cannot find module '../aplicar-medidas-mpu'`.

- [ ] **Step 3: Implementar o orquestrador**

```ts
// src/lib/mpu/aplicar-medidas-mpu.ts
import { eq, and } from "drizzle-orm";
import { processos } from "@/lib/db/schema/core";
import { processosVVD, historicoMPU, medidasMPU } from "@/lib/db/schema/vvd";
import { FASE_PROCEDIMENTO, MOTIVO_INTIMACAO } from "@/lib/mpu-constants";
import { parseDecisaoMPU, type DecisaoMPUParsed } from "./parse-decisao";

export interface ResumoProcessoVVD {
  mpuAtiva: true;
  faseProcedimento: string;
  motivoUltimaIntimacao: string;
  distanciaMinima: number | null;
  prazoMpuDias: number | null;
  dataDecisaoMPU: string | null;
  dataVencimentoMPU: string | null;
}

function addDias(isoDate: string, dias: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Converte o parse nos campos da esteira de `processos_vvd`. Pura. */
export function resumirParaProcessoVVD(
  parsed: DecisaoMPUParsed,
  dataDecisaoISO: string | null,
): ResumoProcessoVVD {
  const distancias = parsed.medidas
    .map((m) => m.distanciaMetros)
    .filter((d): d is number => typeof d === "number");
  const distanciaMinima = distancias.length ? Math.max(...distancias) : null;
  const dataVencimentoMPU =
    parsed.prazoDias && dataDecisaoISO ? addDias(dataDecisaoISO, parsed.prazoDias) : null;
  return {
    mpuAtiva: true,
    faseProcedimento: FASE_PROCEDIMENTO.DECISAO_LIMINAR,
    motivoUltimaIntimacao: MOTIVO_INTIMACAO.CIENCIA_DECISAO_MPU,
    distanciaMinima,
    prazoMpuDias: parsed.prazoDias,
    dataDecisaoMPU: dataDecisaoISO,
    dataVencimentoMPU,
  };
}

export interface MedidaCriada {
  codigo: string;
  artigo: string;
  distanciaMetros: number | null;
}

/**
 * Orquestra parse → persist medidas + esteira + histórico, dentro de uma transação.
 * `tx` é o handle transacional do drizzle (mesmo tipo de db). Retorna as medidas
 * gravadas (vazio se não houver processo_vvd correspondente ou nenhuma medida).
 */
export async function aplicarMedidasMPU(
  tx: typeof import("@/lib/db").db,
  params: { processoId: number; conteudo: string; dataDecisaoISO: string | null },
): Promise<MedidaCriada[]> {
  const parsed = parseDecisaoMPU(params.conteudo);
  if (parsed.medidas.length === 0) return [];

  // Resolve processo_vvd por CNJ.
  const [proc] = await tx
    .select({ numero: processos.numeroAutos })
    .from(processos)
    .where(eq(processos.id, params.processoId))
    .limit(1);
  if (!proc?.numero) return [];

  const [pvvd] = await tx
    .select({ id: processosVVD.id })
    .from(processosVVD)
    .where(eq(processosVVD.numeroAutos, proc.numero))
    .limit(1);
  if (!pvvd) return [];

  // Idempotência: remove apenas as medidas derivadas pelo parser.
  await tx
    .delete(medidasMPU)
    .where(and(eq(medidasMPU.processoVvdId, pvvd.id), eq(medidasMPU.origem, "parser")));

  const rows: MedidaCriada[] = [];
  for (const m of parsed.medidas) {
    await tx.insert(medidasMPU).values({
      processoVvdId: pvvd.id,
      codigo: m.codigo,
      artigo: m.artigo,
      distanciaMetros: m.distanciaMetros ?? null,
      parametros: {
        protegidos: m.protegidos,
        meios: m.meios,
        lugares: m.lugares,
        valor: m.valor,
      },
      literal: m.literal,
      dataDecisao: params.dataDecisaoISO,
      dataVencimento:
        parsed.prazoDias && params.dataDecisaoISO
          ? addDias(params.dataDecisaoISO, parsed.prazoDias)
          : null,
      status: "ativa",
      origem: "parser",
    });
    rows.push({
      codigo: m.codigo,
      artigo: m.artigo,
      distanciaMetros: m.distanciaMetros ?? null,
    });
  }

  // Move a esteira no processo_vvd.
  const resumo = resumirParaProcessoVVD(parsed, params.dataDecisaoISO);
  await tx
    .update(processosVVD)
    .set({
      mpuAtiva: resumo.mpuAtiva,
      dataDecisaoMPU: resumo.dataDecisaoMPU,
      dataVencimentoMPU: resumo.dataVencimentoMPU,
      distanciaMinima: resumo.distanciaMinima,
      prazoMpuDias: resumo.prazoMpuDias,
      faseProcedimento: resumo.faseProcedimento,
      motivoUltimaIntimacao: resumo.motivoUltimaIntimacao,
    })
    .where(eq(processosVVD.id, pvvd.id));

  // Evento de histórico.
  await tx.insert(historicoMPU).values({
    processoVVDId: pvvd.id,
    tipoEvento: "concessao",
    dataEvento: params.dataDecisaoISO ?? new Date().toISOString().slice(0, 10),
    descricao: `Concessão de ${rows.length} medida(s) protetiva(s) (parser).`,
    medidasVigentes: rows.map((r) => r.codigo).join(", "),
    novaDistancia: resumo.distanciaMinima,
    novaDataVencimento: resumo.dataVencimentoMPU,
  });

  return rows;
}
```

- [ ] **Step 4: Rodar o teste — deve passar**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx vitest run src/lib/mpu/__tests__/aplicar-medidas-mpu.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/lib/mpu/aplicar-medidas-mpu.ts src/lib/mpu/__tests__/aplicar-medidas-mpu.test.ts
git commit -m "feat(mpu): orquestrador aplicarMedidasMPU (persist + esteira + histórico)"
```

---

## Task 6: Query de preview `mpu.previewMedidas`

**Files:**
- Create: `src/lib/trpc/routers/mpu.ts`
- Modify: `src/lib/trpc/routers/index.ts`

- [ ] **Step 1: Criar o router de preview**

```ts
// src/lib/trpc/routers/mpu.ts
import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { parseDecisaoMPU } from "@/lib/mpu/parse-decisao";

export const mpuRouter = router({
  // Dry-run: extrai as medidas do texto SEM persistir. Usado no preview do editor.
  previewMedidas: protectedProcedure
    .input(z.object({ texto: z.string().min(1).max(20000) }))
    .query(({ input }) => parseDecisaoMPU(input.texto)),
});
```

- [ ] **Step 2: Registrar no appRouter**

Em `src/lib/trpc/routers/index.ts`, importar e adicionar `mpu: mpuRouter`. Localizar a lista de routers:

Run: `cd /Users/rodrigorochameire/Projetos/Defender && grep -n "Router," src/lib/trpc/routers/index.ts | head`

Adicionar o import junto aos demais (`import { mpuRouter } from "./mpu";`) e a chave `mpu: mpuRouter,` dentro do `router({ ... })`.

- [ ] **Step 3: Typecheck**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit 2>&1 | grep -E "routers/mpu|routers/index" || echo "OK"`
Expected: `OK`.

- [ ] **Step 4: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/lib/trpc/routers/mpu.ts src/lib/trpc/routers/index.ts
git commit -m "feat(mpu): query previewMedidas (dry-run do parser)"
```

---

## Task 7: Gatilho no `registros.create`

**Files:**
- Modify: `src/lib/trpc/routers/registros.ts`

- [ ] **Step 1: Importar o orquestrador**

No topo de `src/lib/trpc/routers/registros.ts`, junto aos imports existentes:

```ts
import { aplicarMedidasMPU, type MedidaCriada } from "@/lib/mpu/aplicar-medidas-mpu";
```

- [ ] **Step 2: Acrescentar o hook após o bloco de ciência (audiência)**

Dentro de `create`, na transação, logo **após** o bloco `// 3. Side-effect de ciência` (que termina em `}` antes de `return { registro, audienciaCriada };`), inserir:

```ts
        // 4. Side-effect de ciência: medidas protetivas no texto da decisão →
        //    persiste medidas estruturadas e move a esteira (dedupe por origem=parser).
        let medidasCriadas: MedidaCriada[] = [];
        if (input.tipo === "ciencia" && input.processoId) {
          medidasCriadas = await aplicarMedidasMPU(tx, {
            processoId: input.processoId,
            conteudo: input.conteudo,
            dataDecisaoISO: input.dataRegistro.toISOString().slice(0, 10),
          });
        }
```

E alterar o retorno da transação de `return { registro, audienciaCriada };` para:

```ts
        return { registro, audienciaCriada, medidasCriadas };
```

E o retorno final da mutation de `return { ...created.registro, audienciaCriada: created.audienciaCriada };` para:

```ts
      return {
        ...created.registro,
        audienciaCriada: created.audienciaCriada,
        medidasCriadas: created.medidasCriadas,
      };
```

> Nota: `aplicarMedidasMPU` recebe `tx` (handle da transação `withTransaction`). Confirme que `withTransaction` expõe o mesmo tipo do `db`; o parâmetro foi tipado como `typeof db` em Task 5.

- [ ] **Step 3: Typecheck**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit 2>&1 | grep "registros.ts" || echo "OK"`
Expected: `OK`. Se houver erro de tipo em `tx`, ajustar a assinatura de `aplicarMedidasMPU` para aceitar o tipo do callback de `withTransaction` (ver `src/lib/db`).

- [ ] **Step 4: Rodar a suíte de mpu (regressão)**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx vitest run src/lib/mpu/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/lib/trpc/routers/registros.ts
git commit -m "feat(mpu): dispara extração de medidas no save da Ciência de MPU"
```

---

## Task 8: Exibir `medidasCriadas` no editor de registro

**Files:**
- Modify: `src/components/registros/registro-editor.tsx`

- [ ] **Step 1: Localizar o tratamento de `audienciaCriada`**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && grep -n "audienciaCriada" src/components/registros/registro-editor.tsx`
Expected: linhas onde a resposta do `create` é lida e exibida (toast/painel).

- [ ] **Step 2: Espelhar para `medidasCriadas`**

Imediatamente após o ponto onde `audienciaCriada` é consumido (mesmo `onSuccess`/bloco de resposta), acrescentar a exibição das medidas. Exemplo (adaptar ao mecanismo de toast já usado no arquivo — `toast(...)` ou estado local; usar o MESMO que `audienciaCriada` usa):

```tsx
        if (res.medidasCriadas && res.medidasCriadas.length > 0) {
          toast.success(
            `${res.medidasCriadas.length} medida(s) protetiva(s) detectada(s): ` +
              res.medidasCriadas
                .map((m) =>
                  m.distanciaMetros ? `${m.codigo} (${m.distanciaMetros}m)` : m.codigo,
                )
                .join(", "),
          );
        }
```

> Se o arquivo usa um painel inline em vez de toast para `audienciaCriada`, replicar nesse mesmo painel. Não introduzir um mecanismo novo de feedback.

- [ ] **Step 3: Typecheck + build do componente**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit 2>&1 | grep "registro-editor" || echo "OK"`
Expected: `OK`.

- [ ] **Step 4: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/components/registros/registro-editor.tsx
git commit -m "feat(mpu): exibe medidas detectadas ao salvar Ciência de MPU"
```

---

## Task 9: Verificação ponta a ponta

**Files:** nenhum (verificação).

- [ ] **Step 1: Suíte completa de mpu**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx vitest run src/lib/mpu/`
Expected: PASS (todos).

- [ ] **Step 2: Typecheck global**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit 2>&1 | tail -20`
Expected: sem erros novos relacionados a `mpu/`, `registros.ts`, `vvd.ts`.

- [ ] **Step 3: Smoke manual (opcional, com banco de dev)**

Criar um registro `tipo='ciencia'` num processo MPU existente colando a decisão Cacia; confirmar via SQL:

Run: `psql "$DATABASE_URL" -c "SELECT codigo, distancia_metros, parametros FROM medidas_mpu ORDER BY id DESC LIMIT 5;"`
Expected: 4 linhas (AFASTAMENTO_LAR, PROIBICAO_APROXIMACAO 300, PROIBICAO_CONTATO, PROIBICAO_FREQUENTAR) e `processos_vvd.mpu_ativa = true` / `fase_procedimento = 'decisao_liminar'` no processo.

- [ ] **Step 4: Atualizar o índice de memória (opcional)**

Registrar a feature em `MEMORY.md` como referência de monitoramento MPU, ligando a `[[project_acompanhamento_mpu_andre_gomma]]`.

---

## Notas de execução

- **CI:** lembrar que o CI do GH Actions falha por `pnpm-lock` ausente; o check real é o Vercel preview (ver memória `ci_main_pnpm_bug`).
- **Entrega:** ao final, usar `superpowers:finishing-a-development-branch` para decidir merge/PR.
- **Risco residual:** decisões com redação muito atípica podem escapar do parser determinístico; o catálogo `medidas-taxonomia.ts` é o ponto único para acrescentar gatilhos conforme aparecerem (taxonomia viva).
