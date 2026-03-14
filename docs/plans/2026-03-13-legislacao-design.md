# Design: Página de Legislação

> Ferramenta de consulta legislativa com 15 leis, 3 modos de navegação, destaques pessoais, links cruzados automáticos, histórico intertemporal e atualização manual via scraping.

## Legislações Incluídas

| # | Legislação | Referência | Fonte |
|---|---|---|---|
| 1 | Código Penal | DL 2.848/40 | planalto.gov.br |
| 2 | Código de Processo Penal | DL 3.689/41 | planalto.gov.br |
| 3 | Lei de Execução Penal | L 7.210/84 | planalto.gov.br |
| 4 | Lei Maria da Penha | L 11.340/06 | planalto.gov.br |
| 5 | Lei de Drogas | L 11.343/06 | planalto.gov.br |
| 6 | ECA | L 8.069/90 | planalto.gov.br |
| 7 | Lei de Abuso de Autoridade | L 13.869/19 | planalto.gov.br |
| 8 | CF/88 — Título II | CF/88 | planalto.gov.br |
| 9 | Lei das Contravenções Penais | DL 3.688/41 | planalto.gov.br |
| 10 | Estatuto do Desarmamento | L 10.826/03 | planalto.gov.br |
| 11 | Proteção a Testemunhas | L 9.807/99 | planalto.gov.br |
| 12 | Prisão Temporária | L 7.960/89 | planalto.gov.br |
| 13 | Lei Mariana Ferrer | L 14.245/21 | planalto.gov.br |
| 14 | LC da Defensoria Pública | LC 80/94 | planalto.gov.br |
| 15 | LCE Defensoria Bahia | LCE 26/06 | al.ba.gov.br |

## Arquitetura de Dados

### Arquivos estáticos — `src/config/legislacao/`

```
src/config/legislacao/
├── index.ts              # Registry com metadados de todas as leis
├── types.ts              # Tipos compartilhados
├── codigo-penal.json
├── cpp.json
├── lep.json
├── maria-da-penha.json
├── drogas.json
├── eca.json
├── abuso-autoridade.json
├── cf88-titulo2.json
├── contravencoes.json
├── desarmamento.json
├── testemunhas-protegidas.json
├── prisao-temporaria.json
├── mariana-ferrer.json
├── lc80.json
└── lce26-bahia.json
```

### Estrutura de cada JSON

```typescript
type Legislacao = {
  id: string;
  nome: string;
  nomeAbreviado: string; // "CP", "CPP", "LEP"
  referencia: string;    // "Decreto-Lei nº 2.848/1940"
  fonte: string;         // URL do planalto/al.ba
  dataUltimaAtualizacao: string;
  estrutura: NodoEstrutura[];
}

type NodoEstrutura = {
  tipo: "parte" | "livro" | "titulo" | "capitulo" | "secao" | "subsecao";
  nome: string;
  filhos: (NodoEstrutura | Artigo)[];
}

type Artigo = {
  tipo: "artigo";
  id: string;            // "cp:art-121"
  numero: string;        // "121"
  caput: string;
  paragrafos: Dispositivo[];
  incisos: Dispositivo[];
  referencias: string[]; // ["cpp:art-1", "cf88:art-5-xxxix"]
  historico: VersaoArtigo[];
}

type Dispositivo = {
  id: string;
  numero: string;
  texto: string;
  alineas?: Dispositivo[];
  itens?: Dispositivo[];
}

type VersaoArtigo = {
  versao: number;
  texto: string;
  textoAnterior?: string;
  redacaoDadaPor: { lei: string; artigo: string } | null;
  publicadoEm: string;   // data de publicação da lei modificadora
  vigenteDesde: string;   // início da vigência (pode diferir se vacatio)
  vigenteAte: string | null; // null = ainda vigente
}
```

### Tabela Supabase — `legislacao_destaques`

```sql
CREATE TABLE legislacao_destaques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  lei_id TEXT NOT NULL,         -- "codigo-penal"
  artigo_id TEXT NOT NULL,      -- "cp:art-121"
  tipo TEXT NOT NULL,           -- "highlight" | "note" | "favorite"
  conteudo TEXT,                -- texto da nota (null para favoritos)
  cor TEXT DEFAULT 'yellow',    -- "yellow" | "green" | "blue" | "red"
  texto_selecionado TEXT,       -- trecho destacado (para highlights)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_leg_dest_user ON legislacao_destaques(user_id);
CREATE INDEX idx_leg_dest_artigo ON legislacao_destaques(user_id, artigo_id);
```

## Página — `/admin/legislacao`

### Rota e Sidebar

- Path: `/admin/legislacao`
- Sidebar: adicionar ao `TOOLS_NAV` com icon `Scale` e label "Legislação"

### Layout

```
┌──────────────────────────────────────────────────────────┐
│ ⚖️ Legislação                              [📑] [⟳]    │
│                                                          │
│ [🔍 Busca Global] [📖 Por Lei] [🌳 Árvore]             │
│                                                          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │                                                      │ │
│ │          Conteúdo muda conforme modo ativo           │ │
│ │                                                      │ │
│ └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘

[📑] = Painel "Meus Destaques"
[⟳]  = Atualizar legislação
```

### Modo 1 — Busca Global (padrão)

- Campo de busca central, pesquisa em TODAS as leis simultaneamente
- Resultados agrupados por lei com badge colorido (CP, CPP, LEP...)
- Highlight do termo buscado nos resultados
- Filtros: por lei, por tipo de dispositivo (artigo, parágrafo, inciso)
- Click no resultado → abre no Modo 2 (Por Lei) no artigo clicado

### Modo 2 — Por Lei (tabs)

- Tabs horizontais scrolláveis com as 15 leis
- Scroll contínuo dos artigos com tipografia jurídica
- Busca local (filtra dentro da lei selecionada)
- Recuos corretos: caput, §, inciso (I, II), alínea (a, b), item (1, 2)
- Sticky header com nome da lei + busca local

### Modo 3 — Árvore

- Sidebar esquerda (250px) com árvore colapsável
  - Parte → Título → Capítulo → Seção → Artigo
- Conteúdo do artigo selecionado à direita
- Breadcrumb: CP > Parte Especial > Título I > Cap. I > Art. 121
- Navegação prev/next entre artigos

## Funcionalidades de Interação

### Destaques e Notas

- **Selecionar texto** → Popover com 4 cores de destaque + "Anotar"
- **Favoritar artigo** → Estrela no canto do artigo
- **Anotar** → Textarea vinculada ao artigo, salva no Supabase
- **Copiar referência** → Formato jurídico: "Art. 121, §1º, do CP"
- Destaques persistem via Supabase por usuário

### Links Cruzados Automáticos

- Referências internas detectadas no texto (ex: "art. 26" → link clicável)
- Referências entre leis (ex: CPP cita CP → badge com nome da lei destino)
- Tooltip com preview do artigo referenciado ao hover
- Estilo: sublinhado emerald com badge da lei

### Painel "Meus Destaques"

- Sheet lateral direita (acionado pelo ícone 📑)
- Lista todos: favoritos, destaques (por cor), notas
- Filtro por lei e por cor
- Click → navega direto ao artigo
- Exportar como texto

## Histórico Intertemporal

### Timeline Visual (por artigo)

```
┌──────────────────────────────────────────────────┐
│ Art. 171 - Estelionato                           │
│                                                  │
│ ⏱ Histórico de alterações          [Ver timeline]│
│                                                  │
│  ●─────────●──────────●──────────●  hoje         │
│  1940      2003       2019       2021            │
│  Original  L10.741    L13.964    L14.155         │
│            (Idoso)    (Pacote    (Estel.         │
│                       Anticrime)  digital)       │
│                                                  │
│ ┌─ Redação atual (desde 28/05/2021) ──────────┐ │
│ │ Obter, para si ou para outrem, vantagem...   │ │
│ └──────────────────────────────────────────────┘ │
│                                                  │
│ ┌─ Redação anterior (01/01/1942 → 27/05/2021) ┐ │
│ │ Obter, para si ou para outrem, vantagem...   │ │
│ └──────────────────────────────────────────────┘ │
│                                                  │
│ 📅 "Qual era a redação em:" [__/__/____] [Ver]  │
└──────────────────────────────────────────────────┘
```

### Funcionalidades

- **Timeline clicável** — Cada ponto mostra lei modificadora, data publicação e vigência
- **"Qual era a redação em:"** — Datepicker mostra versão vigente na data do fato (tempus regit actum)
- **Diff entre versões** — Seleciona duas versões, vê lado a lado (vermelho/verde)
- **Badge de lei modificadora** — Link para a lei que alterou + artigo específico
- **Indicador de vacatio legis** — Quando publicação ≠ vigência, mostra período

## Atualização Manual

### Fluxo

1. Botão [⟳] → Modal de seleção de lei(s)
2. Clica "Buscar atualizações"
3. Edge Function (`legislacao-update`) faz:
   - Fetch da "versão compilada" (texto vigente) do planalto.gov.br / al.ba.gov.br
   - Fetch da "versão completa" (com notas de alteração) → alimenta `historico[]`
   - Parse da estrutura HTML em JSON
   - Compara com JSON atual
   - Retorna diff
4. Modal de revisão mostra cada alteração individualmente:
   - Artigos NOVOS (verde)
   - Artigos MODIFICADOS (diff vermelho/verde)
   - Artigos REVOGADOS (vermelho)
   - Lei que originou cada alteração
5. Revisão individual: aceitar/rejeitar cada alteração
6. Confirmar → API route salva JSON atualizado

### Edge Function — `legislacao-update`

- Input: `lei_id` (ex: "codigo-penal")
- Faz fetch do HTML do planalto.gov.br (URL mapeada por lei)
- Parse com regex/DOM para extrair artigos estruturados
- Extrai notas de alteração da "versão completa" para histórico
- Output: JSON no formato `Legislacao` + array de diffs

## Componentes

```
src/components/legislacao/
├── legislacao-search.tsx        # Modo busca global
├── legislacao-tabs.tsx          # Modo por lei (tabs)
├── legislacao-tree.tsx          # Modo árvore (sidebar)
├── artigo-renderer.tsx          # Renderiza artigo com tipografia jurídica
├── artigo-timeline.tsx          # Timeline de histórico intertemporal
├── artigo-diff.tsx              # Diff entre versões (vermelho/verde)
├── highlight-popover.tsx        # Popover de destaque/anotação
├── cross-reference-link.tsx     # Link cruzado com tooltip
├── meus-destaques-sheet.tsx     # Painel lateral de destaques
├── atualizar-modal.tsx          # Modal de atualização com diff
└── data-vigente-picker.tsx      # "Qual era a redação em:"
```

## Router tRPC

```
src/lib/trpc/routers/legislacao.ts
├── destaques.list        # Lista destaques do usuário
├── destaques.create      # Cria destaque/nota/favorito
├── destaques.update      # Atualiza nota
├── destaques.delete      # Remove destaque
├── atualizar.check       # Chama Edge Function, retorna diff
├── atualizar.apply       # Aplica atualizações aceitas
```

## Fora de Escopo (v2)

- Integração com demandas/processos ("art. 121 usado em 3 demandas")
- Súmulas vinculantes e orientações
- Comparador de legislação estadual vs federal
- Modo offline com Service Worker
