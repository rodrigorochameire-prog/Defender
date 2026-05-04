# Reforma MPU — Design (Defender / OMBUDS)

**Data:** 2026-05-04
**Autor da reforma:** Rodrigo Rocha Meire (9ª DP Camaçari)
**Brainstorm:** Claude Opus 4.7

## Contexto

O painel PJe da 9ª DP de Camaçari recebe regularmente intimações de Medidas Protetivas de Urgência (MPU). Em 04/05/2026 detectamos um gap: 40 expedientes no painel PJe, 9 importados ao OMBUDS — **31 MPU fora do sistema**. Investigação revelou três problemas combinados:

1. **Modelagem fraca**: MPU é flag em `processosVvd.mpuAtiva`, mas não tem visibilidade própria em `/demandas`. O usuário não enxerga MPU como categoria de trabalho à parte de VVD geral.
2. **Triagem genérica**: a skill `varredura-triagem` cobre VVD/Júri/EP/Criminal mas não distingue MPU. Heurísticas defensivas específicas (manifestar contra prorrogação, defesa em audiência de justificação, etc.) não existem.
3. **Análise rasa**: nenhum dado estruturado é extraído da MPU — quais medidas, qual relato, qual fase do procedimento. Tudo fica em texto livre, sem permitir filtros, padrões ou relatório agregado.

**Premissa central** (registrada em memória `user_atuacao_mpu`): em Camaçari, o assistido do Rodrigo é **em regra o requerido** (a pessoa demandada a cumprir a MPU), homem ou mulher. Toda a UI, taxonomia e classificação de atos opera sob essa ótica defensiva.

## Decisões arquiteturais

### 1. Modelagem: atribuição derivada (opção A — aprovada)

Enum `atribuicao` **não muda**. MPU é uma "lente" sobre VVD, derivada via helper único:

```ts
// src/lib/mpu.ts
export function isMpu(p: { numero?: string; processoVvd?: { mpuAtiva?: boolean | null; tipoProcesso?: string | null } }): boolean {
  if (p.processoVvd?.tipoProcesso === 'MPU') return true;
  if (p.processoVvd?.mpuAtiva) return true;
  if (p.numero?.startsWith('MPUMP')) return true;  // prefixo PJe
  return false;
}
```

Pros: zero migration, mantém histórico VVD íntegro, fácil reverter, parser/webhook não mudam.

### 2. Tab MPU em `/demandas` (paleta rose)

Tab **🛡 MPU** ao lado de VVD/Júri/EP/Criminal. Filtra `processo.atribuicao = 'VVD_CAMACARI' AND isMpu(processo)`. **Contagem em VVD não inclui MPU** (evita duplicação visual). Card mostra:

- Linha 1: `Assistido (req.)` em destaque + `Requerente` em cinza
- Linha 2: número do processo
- Linha 3: ato + status MPU + vencimento

Filtros exclusivos da aba: Status MPU (Sob restrição / Expirada / Revogada / Modulada / Aguardando), Vencimento próximo, Sem audiência designada.

### 3. Página `/admin/mpu` (rota dedicada)

`/admin/vvd` permanece, agregando VVD **não-MPU**. MPU ganha rota própria com layout clean:

- **Header minimalista** — título + ações (Sincronizar PJe, Análise ↗, Histórico ↗)
- **3 KPIs sob ótica defensiva**:
  - **Sob restrição** (n) — MPU ativa em desfavor do assistido (estado constrangedor)
  - **Prazo de manifestação** (n) — única urgência negativa real (vermelho)
  - **Oportunidades** (n) — MPU expirando, cabe pleitear não-renovação (verde)
- **Pendências prioritárias** — lista única ordenada por prazo, sem agrupamentos
- **Banco completo** — tabela com Assistido (req.) · Requerente · Processo · Status · Vence · Próximo ato · Bairro

Análise (mapa + distribuição) e Histórico (timeline de eventos `historicoMpu`) ficam em rotas separadas: `/admin/mpu/analise` e `/admin/mpu/historico`.

### 4. Análise estruturada por MPU

Cada MPU vira uma ficha de 3 blocos no drawer do processo:

#### Bloco "Decisão"

Em `processos_vvd` (alguns campos já existem, outros novos):

| Campo | Tipo | Origem |
|---|---|---|
| `data_decisao_mpu` | date | regex |
| `medidas_deferidas` | jsonb `[{tipo, parametros}]` | parser bullets + enum |
| `raio_restricao_metros` | int | regex |
| `prazo_mpu_dias` | int | regex |
| `juiz_decisor` | text | regex |

Tipos canônicos de medida (enum dentro do jsonb):
`proibicao_aproximacao` · `restricao_contato` · `afastamento_lar` · `suspensao_visitas` · `restituicao_bens` · `pensao_provisoria` · `tornozeleira` · `outras`

#### Bloco "Relato classificado" — nova tabela `mpu_relatos`

```sql
CREATE TABLE mpu_relatos (
  id BIGSERIAL PRIMARY KEY,
  processo_id BIGINT NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
  relato_texto TEXT,                    -- citação literal da representação
  tipos_violencia TEXT[],               -- {fisica, psicologica, moral, sexual, patrimonial}
  relacao TEXT,                         -- {conjuge, ex_conjuge, namorado, ...}
  gatilhos TEXT[],                      -- {ciumes, separacao, drogas, ...}
  provas_mencionadas TEXT[],            -- {bo, testemunhas, fotos, audios, ...}
  gravidade TEXT,                       -- {leve, moderada, grave}
  extraido_em TIMESTAMPTZ DEFAULT now(),
  extracao_modelo TEXT,                 -- "regex" | "haiku-4.5" | etc
  UNIQUE(processo_id)
);
```

Tipos de violência seguem **art. 7º Lei 11.340/2006**.

#### Bloco "Procedimento"

Em `processos_vvd`:

| Campo | Tipo | Valores |
|---|---|---|
| `fase_procedimento` | text enum | `representacao_inicial` · `decisao_liminar` · `audiencia_designada` · `audiencia_realizada` · `manifestacao_pendente` · `recurso` · `descumprimento_apurado` · `expirada` · `revogada` |
| `motivo_ultima_intimacao` | text enum | `ciencia_decisao_mpu` · `ciencia_audiencia` · `manifestar_renovacao` · `manifestar_modulacao` · `manifestar_revogacao` · `manifestar_laudo` · `manifestar_descumprimento` · `ciencia_modulacao` · `intimacao_generica` |

#### Taxonomia viva — nova tabela `mpu_taxonomia`

```sql
CREATE TABLE mpu_taxonomia (
  id BIGSERIAL PRIMARY KEY,
  categoria TEXT NOT NULL,        -- gatilho | violencia | medida | relacao
  termo TEXT NOT NULL,
  contagem INT NOT NULL DEFAULT 0,
  primeiro_visto_em TIMESTAMPTZ DEFAULT now(),
  ultimo_visto_em TIMESTAMPTZ DEFAULT now(),
  aprovado BOOLEAN DEFAULT false, -- consolidação manual
  variantes TEXT[],               -- ["ciumes", "ciume", "ciuminho"]
  UNIQUE(categoria, termo)
);
```

Cresce com cada extração; revisão periódica consolida variações.

### 5. Pipeline de extração (3 fases)

| Fase | Tecnologia | Cobre |
|---|---|---|
| **1 — Determinístico** | regex em Python (skill `varredura-triagem/scripts/`) | data, medidas, raio, prazo, juiz, motivo intimação, fase |
| **2 — Interpretativo** | Claude Haiku 4.5 com prompt JSON estruturado | relato, tipos violência, relação, gatilhos, provas, gravidade |
| **3 — Acumulativo** | agregação SQL + revisão | taxonomia viva alimenta prompts da Fase 2 nas próximas rodadas |

Modelo do prompt da Fase 2 (rascunho):

```
Você está analisando uma MPU sob a ótica da defesa do REQUERIDO.

Texto da decisão e/ou representação:
{texto}

Taxonomia atual:
- Tipos de violência (Lei 11.340 art. 7º): {lista}
- Gatilhos identificados até agora: {lista}
- Tipos de prova: {lista}

Retorne JSON estrito:
{
  "relato_literal": "...",
  "tipos_violencia": [...],
  "relacao": "...",
  "gatilhos": [...],
  "provas_mencionadas": [...],
  "gravidade": "leve|moderada|grave",
  "termos_novos": { "categoria": ["termo"] }  // termos não cobertos pela taxonomia
}
```

### 6. Triagem MPU — heurísticas defensivas

10 padrões mapeados na skill `varredura-triagem/references/heuristicas-mpu.md`:

| Padrão (regex no título/texto) | Ato | Prioridade | Prazo |
|---|---|---|---|
| audiência de justificação designada | Defesa em audiência de justificação | URGENTE | até 5d antes |
| decisão deferindo MPU | Analisar viabilidade de agravo | NORMAL | 15d |
| pedido de prorrogação/renovação | Manifestar contra prorrogação | URGENTE | 5d |
| pedido de revogação (pela requerente/MP) | Acompanhar pedido de revogação | BAIXA | — |
| notícia de descumprimento (24-A) | Defesa criminal — descumprimento | URGENTE | 5d |
| laudo psicossocial | Manifestar sobre laudo | NORMAL | 10d |
| modulação de raio/medida | Manifestar sobre modulação | NORMAL | 10d |
| tornozeleira/monitoramento | Contestar imposição | URGENTE | 5d |
| vencimento próximo (proativo) | Pleitear não-renovação | BAIXA | até venc. |
| TOMAR CIÊNCIA genérico | Ciência + revisão manual | BAIXA | — |

Atos novos em `src/config/atos-por-atribuicao.ts`:

- "Manifestar contra prorrogação"
- "Defesa em audiência de justificação"
- "Manifestar sobre laudo psicossocial"
- "Pleitear não-renovação"
- "Defesa criminal — descumprimento (art. 24-A)"
- "Contestar imposição de tornozeleira"
- "Manifestar sobre modulação"

Skill `varredura-triagem` ganha:
- flag `is_mpu` em `classify(text, titulo, is_mpu=False)` — quando `True`, usa `RULES_MPU` antes de `RULES_BASE`
- arquivo novo `references/heuristicas-mpu.md`
- seção em `SKILL.md`: "Bugs/contornos" — sigilo polo passivo VVD, token `ca`, prefixo `MPUMP*`

### 7. Importação das 31 MPU pendentes

Script único de import em massa, executado uma vez:

1. Para cada `docId` no painel: abre autos via `autosUrl`, lê timeline, captura `best_titulo` + texto da decisão
2. Extrai partes via popup Peticionar (token `ca`) → `listProcessoCompleto.seam` (skill `pje_polo_passivo_scraping` referida na memória)
3. Identifica **requerido** entre as partes (heurística por `tipoParte` + DPE como representante)
4. Inserts/upserts:
   - `assistidos` (requerido, deduplicado por CPF/nome+nascimento)
   - `processos` (numero, atribuicao=`VVD_CAMACARI`)
   - `processos_vvd` (mpu_ativa=true, tipo_processo='MPU', data_decisao_mpu, tipos_mpu, data_vencimento_mpu, fase_procedimento, motivo_ultima_intimacao)
   - `partes_vvd` (requerido + requerente)
   - `demandas` (status=`5_TRIAGEM`, defensor_id=1, pje_documento_id)
5. Aplica `classify(text, titulo, is_mpu=True)` → preenche `ato`, `prioridade`, `prazo`
6. Cria `registros` (anotação ou diligência conforme prioridade)
7. Se há audiência designada → cria evento em agenda automaticamente (calendar Júri/VVD)
8. Roda Fase 2 (LLM) sobre cada relato → popula `mpu_relatos`
9. Relatório final: 31 docs · X importados · Y manual-review (com motivo)

## Sub-planos (ordem de implementação)

Cada sub-plano é independente o suficiente para virar seu próprio plano de implementação:

| # | Plano | Depende de | Esforço |
|---|---|---|---|
| 1 | **Schema + helper isMpu** | — | S |
| 2 | **Triagem MPU (skill + atos)** | 1 | S |
| 3 | **Import das 31 MPU pendentes** | 1, 2 | M |
| 4 | **Tab MPU em /demandas** | 1 | S |
| 5 | **Página /admin/mpu** | 1, 4 | M |
| 6 | **Análise estruturada (ficha + LLM)** | 1, 3 | L |

S = pequeno (~1 sessão), M = médio (1-2 sessões), L = grande (2-3 sessões).

A reforma pode ser entregue incrementalmente: planos 1+2+3 já resolvem o problema operacional imediato (importar as 31 + triá-las). 4 e 5 são UI. 6 é o ganho analítico de longo prazo.

## Não-objetivos (YAGNI)

- **Migration de dados** para enum `MPU_CAMACARI` separado (rejeitado em favor da opção A — atribuição derivada).
- **Análise preditiva / risco do agressor** — fora de escopo desta reforma. Pode virar projeto separado se houver dados suficientes na taxonomia.
- **Integração com Polícia Civil / DEAM** — fora de escopo.
- **Notificações automáticas para a requerente** — Defensoria atende o requerido; comunicação com requerente não é dever do usuário.
- **Dashboard agregado por defensor (multi-tenant)** — esta reforma assume defensor único (Rodrigo). Multi-tenant pode ser feito depois.

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Sigilo de polo passivo bloqueia leitura das partes | Usar token `ca` via popup Peticionar (skill `pje_polo_passivo_scraping`, já validada) |
| LLM extrai relato com viés ou alucinação | Sempre guardar `relato_texto` literal; chips são derivados, com `extracao_modelo` registrado para auditoria. Revisão humana antes de gerar peça |
| Requerido não identificado entre as partes | Demanda fica com `assistido_id` apontando placeholder "⚠ A identificar — <cnj>" (padrão já existente em memória `project_assistido_placeholder`); painel `/admin/assistidos/pendentes` lista para resolução manual |
| Múltiplos requeridos | Tabela `partes_vvd` aceita múltiplos com `tipoParte='requerido'`; UI mostra o primeiro vinculado à DPE-BA, com badge "+N" quando há mais |
| Rotas `/admin/mpu/analise` e `/admin/mpu/historico` ficarem subutilizadas | Implementar só após o plano 5 mostrar uso real dos KPIs/lista; se ninguém clica em "Análise ↗", não construir |

## Histórico

| Data | Evento |
|---|---|
| 2026-05-04 | Brainstorm inicial; design aprovado em 6 sub-planos. Memória `user_atuacao_mpu` criada. |
