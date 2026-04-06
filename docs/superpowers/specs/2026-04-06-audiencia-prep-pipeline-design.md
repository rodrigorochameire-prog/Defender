# Audiência Prep Pipeline — Design Spec

**Data:** 2026-04-06
**Escopo:** Melhoria do modal de importação de intimações + Pipeline automatizado de preparação para audiências

---

## Contexto

O fluxo atual de importação de intimações não reconhece designações/redesignações de audiência como ato específico. Quando uma intimação é de ciência de audiência, o defensor precisa manualmente criar o evento na agenda e, separadamente, preparar o caso. Falta um pipeline que, com antecedência de 10 dias, baixe os autos, analise, identifique testemunhas e verifique status de intimação dos depoentes.

---

## Módulo 1: Modal de Importação — Ciência de Audiência

### 1.1 Novos Atos

Adicionar em **todas as atribuições** em `src/config/atos-por-atribuicao.ts`:

- `Ciência designação de audiência`
- `Ciência redesignação de audiência`

**Prioridade:** 85 (entre "Ciência" genérica e "Outro")

### 1.2 Auto-detecção no Parser

Em `src/lib/ato-suggestion.ts`, adicionar regras de detecção para padrões comuns no texto da intimação:

**Padrões de designação:**
- `designa(ção|da|do).*audiência`
- `audiência.*designada para`
- `fica.*designad[ao].*dia`
- `pauta.*audiência`

**Padrões de redesignação:**
- `redesigna(ção|da|do).*audiência`
- `audiência.*redesignada`
- `transferida.*audiência`
- `adiada.*audiência.*nova data`

**Extração automática:**
- Data: regex para padrões `dd/mm/yyyy`, `dd de mês de yyyy`
- Hora: regex para `HH:MM`, `HHhMM`, `HH horas`
- Tipo: inferir da classe judicial / texto (instrução, conciliação, custódia, justificação, júri)

**Confidence:** `high` quando detecta padrão + extrai data/hora; `medium` quando detecta padrão sem data/hora

### 1.3 Campos Inline no Review Table

Quando o ato selecionado é "Ciência designação de audiência" ou "Ciência redesignação de audiência", exibir abaixo da row (similar ao snippet de texto já existente) um mini-formulário:

```
┌─────────────────────────────────────────────────────┐
│ 📅 Audiência                                         │
│                                                       │
│ Data: [____/____/________]  Hora: [____:____]        │
│ Tipo: [▾ Instrução e Julgamento]                     │
│                                                       │
│ ✓ Criar evento na agenda                             │
└─────────────────────────────────────────────────────┘
```

**Campos:**
- **Data** — `DatePicker`, pré-preenchido se extraído do texto
- **Hora** — `TimePicker`, pré-preenchido se extraído
- **Tipo** — `Select` com opções: Instrução e Julgamento, Conciliação, Justificação, Custódia, Admonitória, Júri, Outro
- **Criar evento** — checkbox, marcado por padrão

**Valores pré-preenchidos** vêm da extração automática (1.2). Se não extraídos, campos ficam vazios para preenchimento manual.

### 1.4 Comportamento na Importação

Ao confirmar importação de uma intimação com ato de audiência:

1. **Cria a `demanda`** normalmente (ato, status `7_CIENCIA`, sem prazo)
2. **Cria registro em `audiencias`** com:
   - `processoId` vinculado
   - `assistidoId` vinculado
   - `dataAudiencia` = data/hora informados
   - `tipo` = tipo selecionado
   - `status` = `agendada`
   - `titulo` = auto-gerado: `"{Tipo} — {Assistido}"` (ex: "Instrução e Julgamento — George Ferreira")
3. **Cria `calendarEvent`** com:
   - `eventType` = `audiencia`
   - `eventDate` = data/hora
   - `title` = mesmo título
   - `processoId`, `assistidoId`, `demandaId` vinculados
   - `priority` = `high`
4. **Sincroniza Google Calendar** se integração ativa (via `googleCalendarEventId`)

### 1.5 Dados no PjeReviewRow

Estender a interface `PjeReviewRow`:

```typescript
// Campos de audiência (quando ato = ciência designação/redesignação)
audienciaData?: string;      // ISO date
audienciaHora?: string;      // HH:MM
audienciaTipo?: string;      // tipo da audiência
criarEventoAgenda?: boolean; // default true
```

---

## Módulo 2: Botão "Preparar Audiências"

### 2.1 Localização

O botão aparece em **dois lugares**:

1. **Página de Agenda** — botão proeminente no header, ao lado dos controles de visualização
2. **Dashboard principal** — card/widget mostrando contagem de audiências nos próximos 10 dias com botão de ação

**Visual:**
```
[ 🎯 Preparar Audiências (5 nos próximos 10 dias) ]
```

Cor: emerald (ação principal). Badge com contagem. Desabilitado se não há audiências pendentes.

### 2.2 Fluxo do Botão

Ao clicar, abre um modal/sheet com:

**Fase 1 — Levantamento (instantâneo, consulta banco)**
```
┌──────────────────────────────────────────────────────────┐
│ 🎯 Preparar Audiências — Próximos 10 dias                │
│                                                            │
│ 5 audiências encontradas (07/04 a 16/04)                  │
│                                                            │
│  #  Assistido          Data       Tipo       Status Prep  │
│  1  George Ferreira    08/04 14h  Instrução  ⚠ Sem autos  │
│  2  Jaciara Santos     09/04 09h  Instrução  ⚠ Sem autos  │
│  3  Wellington Gomes   10/04 14h  Júri       ✓ Analisado  │
│  4  Valdemir Santos    12/04 09h  Conciliação ⚠ Sem análise│
│  5  Jorge Araujo       15/04 14h  Instrução  ⚠ Sem autos  │
│                                                            │
│  Status Prep:                                              │
│  ✓ Completo  ⚠ Pendente  ● Parcial                       │
│  (autos + análise + testemunhas verificadas = completo)    │
│                                                            │
│  [ Preparar Todos os Pendentes ]                          │
│                                                            │
│  ⚠ Requer sessão PJe ativa no Chrome                      │
└──────────────────────────────────────────────────────────┘
```

**Status de preparação** por audiência (3 etapas):
- **Autos baixados** — processo tem arquivos no Drive
- **Análise gerada** — `analysisData` populado com depoimentos
- **Testemunhas verificadas** — registros em `testemunhas` com status de intimação atualizado

### 2.3 Pipeline de Preparação

Ao clicar "Preparar Todos os Pendentes", executa sequencialmente por processo (um de cada vez é mais confiável para PJe scraping e processamento Claude Code):

```
Para cada audiência pendente:
  ┌─ Etapa 1: Download dos autos (PJe CDP)
  │  - Navega ao processo no PJe via Chrome CDP
  │  - Baixa todos os documentos do processo
  │  - Requer sessão PJe ativa
  │
  ├─ Etapa 2: Upload para Google Drive
  │  - Envia para pasta do assistido no Drive
  │  - Usa pipeline existente (upload_drive_curl.sh ou API)
  │
  ├─ Etapa 3: Análise via Claude Code (Mac Mini)
  │  - Dispara processamento local via Claude Code (plano Max)
  │  - Mesmo método do batch atual (scripts/batch_juri_cowork.py adaptado)
  │  - Gera analysisData completo com depoimentos
  │  - Popula banco: processos.analysisData, casos.analysisData
  │
  ├─ Etapa 4: Popular testemunhas
  │  - Extrai de analysisData.depoimentos → insere em tabela `testemunhas`
  │  - Nome, tipo (DEFESA/ACUSACAO/VITIMA), papel
  │  - Vincula a audienciaId
  │
  └─ Etapa 5: Verificar intimação dos depoentes
     - Consulta movimentações do processo no PJe
     - Busca padrões: "intimação de testemunha", "certidão de intimação",
       "mandado de intimação cumprido/devolvido"
     - Atualiza testemunhas.status:
       - "Mandado cumprido" / "Intimação realizada" → INTIMADA
       - "Mandado devolvido" / "Não localizada" → NAO_LOCALIZADA
       - Sem movimentação de intimação → ARROLADA (não intimada)
     - Registra em testemunhas.observacoes a movimentação encontrada
```

**Processamento:** Um processo por vez (sequencial). Motivos:
- PJe CDP é frágil com navegação paralela
- Claude Code processa um caso por vez
- Permite feedback de progresso preciso

### 2.4 Progresso em Tempo Real

O modal mostra progresso durante execução:

```
┌──────────────────────────────────────────────────────────┐
│ 🎯 Preparando Audiências...                              │
│                                                            │
│ Processo 2/5: Jaciara Santos                              │
│ [████████████░░░░░░░░] Etapa 3/5 — Analisando com Claude │
│                                                            │
│  ✅ George Ferreira    — Completo (3 testemunhas, 1 ⚠)    │
│  🔄 Jaciara Santos    — Analisando...                     │
│  ⏳ Wellington Gomes   — Aguardando                        │
│  ⏳ Valdemir Santos    — Aguardando                        │
│  ⏳ Jorge Araujo       — Aguardando                        │
│                                                            │
│  [ Pausar ]  [ Cancelar ]                                 │
└──────────────────────────────────────────────────────────┘
```

### 2.5 Dashboard de Resultado

Ao concluir, apresenta resumo:

```
┌──────────────────────────────────────────────────────────┐
│ ✅ Preparação Concluída                                   │
│                                                            │
│ 5 audiências preparadas                                   │
│ 12 testemunhas identificadas                              │
│                                                            │
│ ⚠ ATENÇÃO — 3 testemunhas NÃO intimadas:                 │
│                                                            │
│  • Maria Silva (defesa) — George Ferreira, 08/04          │
│    Status: ARROLADA — sem movimentação de intimação        │
│  • João Pereira (acusação) — Jaciara Santos, 09/04        │
│    Status: NAO_LOCALIZADA — mandado devolvido 25/03       │
│  • Ana Souza (defesa) — Jorge Araujo, 15/04              │
│    Status: ARROLADA — sem movimentação de intimação        │
│                                                            │
│ → Providência sugerida: requerer intimação urgente         │
│                                                            │
│  [ Ver na Agenda ]  [ Fechar ]                            │
└──────────────────────────────────────────────────────────┘
```

---

## Módulo 3: Integração Técnica

### 3.1 Backend — Endpoint de Preparação

Novo endpoint tRPC `agenda.prepararAudiencias`:

```typescript
input: {
  audienciaIds?: number[];  // específicas, ou todas pendentes se omitido
  diasAntecedencia?: number; // default 10
}

output: {
  total: number;
  preparados: number;
  erros: Array<{ audienciaId: number; etapa: string; erro: string }>;
  testemunhasAlerta: Array<{
    testemunhaNome: string;
    status: string;
    audienciaId: number;
    assistidoNome: string;
    dataAudiencia: string;
  }>;
}
```

### 3.2 Execução no Mac Mini

O pipeline de análise roda no Mac Mini via Claude Code (plano Max):

- **Trigger:** Endpoint da API do Defender chama o Mac Mini via SSH ou endpoint local
- **Processamento:** Claude Code processa os autos do Drive, gera analysisData
- **Retorno:** Grava direto no Supabase via MCP (método atual `project_claude_code_ombuds_integration`)
- **Alternativa simples:** Script no Mac Mini que é chamado via SSH: `ssh macmini "cd ~/Projetos/Defender && node scripts/prepare-audiencia.mjs --processoId=123"`

### 3.3 PJe CDP — Movimentações

Estender o scraping PJe para extrair movimentações de um processo específico:

**Nova função em `pje-parser.ts`:**
```typescript
interface MovimentacaoPJe {
  data: string;
  descricao: string;
  tipo?: string;
}

function parseMovimentacoes(html: string): MovimentacaoPJe[];
function detectarIntimacaoTestemunha(movimentacoes: MovimentacaoPJe[]): {
  testemunhaNome?: string;
  status: 'INTIMADA' | 'NAO_LOCALIZADA' | 'ARROLADA';
  movimentacao: string;
  data: string;
}[];
```

**Padrões de movimentação para detectar:**
- `Certidão de intimação.*testemunha` → INTIMADA
- `Mandado de intimação.*cumprido` → INTIMADA
- `Mandado.*devolvido` / `não localizado` → NAO_LOCALIZADA
- `Intimação.*testemunha.*realizada` → INTIMADA
- `Carta precatória.*intimação` → CARTA_PRECATORIA

### 3.4 Conexão entre Módulos

```
Modal Importação                    Botão Preparar
     │                                    │
     │ cria audiencia + evento            │ consulta audiencias
     ▼                                    │ próximos 10 dias
  audiencias ◄────────────────────────────┘
     │                                    │
     │                              ┌─────┘
     │                              ▼
     │                     Pipeline (Mac Mini)
     │                     ├─ Download PJe
     │                     ├─ Upload Drive
     │                     ├─ Análise Claude Code
     │                     ├─ Popular testemunhas
     │                     └─ Verificar intimação
     │                              │
     ▼                              ▼
  calendarEvents              testemunhas
  Google Calendar             (com status intimação)
```

---

## Arquivos a Modificar/Criar

### Modificar:
| Arquivo | Mudança |
|---------|---------|
| `src/config/atos-por-atribuicao.ts` | Adicionar 2 novos atos em todas as atribuições |
| `src/lib/ato-suggestion.ts` | Regras de detecção para designação/redesignação |
| `src/lib/pje-parser.ts` | Extração de data/hora de audiência + parse de movimentações |
| `src/components/demandas-premium/pje-review-table.tsx` | Campos inline de audiência quando ato detectado |
| `src/components/demandas-premium/pje-import-modal.tsx` | Lógica de criação de audiencia+evento na importação |
| `src/trpc/routers/demandas.ts` | Incluir criação de audiencia/evento no mutation de importação |
| `src/trpc/routers/agenda.ts` | Novo endpoint `prepararAudiencias` |
| `src/components/agenda/` | Botão "Preparar Audiências" no header |
| `src/app/(dashboard)/admin/page.tsx` | Widget/card no dashboard |

### Criar:
| Arquivo | Propósito |
|---------|-----------|
| `src/components/agenda/preparar-audiencias-modal.tsx` | Modal com levantamento, progresso e resultado |
| `src/components/demandas-premium/audiencia-inline-form.tsx` | Mini-form de data/hora/tipo para o review table |
| `src/lib/preparar-audiencia-pipeline.ts` | Orquestrador das 5 etapas do pipeline |
| `scripts/prepare-audiencia.mjs` | Script para Mac Mini (Claude Code + análise) |

---

## Fora de Escopo

- Automação com cron (futuro — hoje é botão manual)
- Geração automática de peças/requerimentos de intimação
- Notificação push/WhatsApp sobre testemunhas não intimadas
- Edição inline de testemunhas no modal de resultado
