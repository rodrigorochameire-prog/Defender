# Caso Implícito + Processo Simplificado

> Spec: 2026-04-02
> Status: Aprovado
> Autor: Rodrigo + Claude

## Problema

O OMBUDS tem 3 entidades (Assistido, Processo, Caso) com sobreposição funcional e UX fragmentada:

- **Página de Casos** existe mas está dormente (zero registros, zero uso)
- **Página de Processo** tem 9 tabs, 4 redundantes com a página do Assistido
- Processos vinculados ao mesmo fato (AP + IP + MPU + desmembrados) não têm agrupamento
- `tipoProcesso` é "AP" em 100% dos registros (nunca classificado)
- `isReferencia` é false em 100% dos registros (nunca usado)
- `casoId` é null em 100% dos registros

## Solução

O caso deixa de ser uma página separada e se torna uma **entidade implícita** — criada automaticamente, visível como agrupamento visual nos headers de Assistido e Processo.

A página do Processo é simplificada: foca no que é exclusivo dela (análise IA, delitos, institutos).

## Princípios

1. **O defensor não cria casos** — eles emergem da vinculação de processos
2. **Processo referência não é singular** — desmembramentos geram múltiplas APs referência no mesmo caso
3. **Foco é contextual** — qual processo mostrar primeiro depende da área e da urgência, não de configuração
4. **Assistido vê tudo do caso** — inclusive processos onde não é parte (empréstimo de prova)

---

## 1. Modelo de Dados

### 1.1 Mudanças no Schema

#### `assistidos_processos` — adicionar coluna `ativo`

```sql
ALTER TABLE assistidos_processos ADD COLUMN ativo BOOLEAN NOT NULL DEFAULT true;
COMMENT ON COLUMN assistidos_processos.ativo IS 
  'false = assistido saiu do processo (desmembramento, exclusão), mas mantém vínculo histórico';
```

#### `papel_processo` enum — adicionar valores

```sql
ALTER TYPE papel_processo ADD VALUE 'REQUERIDO';
ALTER TYPE papel_processo ADD VALUE 'EXECUTADO';
ALTER TYPE papel_processo ADD VALUE 'REEDUCANDO';
```

Papéis por área:
- **Júri/Criminal/Substituição**: REU, CORREU
- **VVD**: REU (agressor), REQUERIDO (em MPU)
- **Execução Penal**: EXECUTADO, REEDUCANDO
- Existentes mantidos: VITIMA, TESTEMUNHA, DENUNCIANTE, QUERELANTE, ASSISTENTE

#### `casos` — eliminar `processoReferenciaId`

```sql
ALTER TABLE casos DROP COLUMN processo_referencia_id;
```

Substituído por `processos.isReferencia` (múltiplos por caso permitidos).

#### `assistidos` — eliminar `casoId`

```sql
ALTER TABLE assistidos DROP COLUMN caso_id;
DROP INDEX IF EXISTS assistidos_caso_id_idx;
```

Relação assistido↔caso passa a ser derivada via processos: "assistido X está no caso Y porque tem processos com caso_id = Y".

#### `processos.tipoProcesso` — popular via classificação automática

Campo já existe (`varchar(30) default 'AP'`). Será populado automaticamente. Sem mudança no schema.

#### `processos.isReferencia` — ativar uso

Campo já existe (`boolean default false`). Será marcado como `true` para APs e EPs automaticamente. Sem mudança no schema.

### 1.2 Relações

```
Caso 1───N Processo N───M Assistido (via assistidos_processos)
                │                         │
                ├── tipoProcesso           ├── papel (REU, EXECUTADO...)
                ├── isReferencia           ├── ativo (true/false)
                └── casoId                 └── observacoes
```

### 1.3 Exemplo: Desmembramento

```
caso (id=42, titulo="Homicídio de João")

processos:
  id=100 | autos=0001-2020 | tipo=AP | casoId=42 | isReferencia=true
  id=200 | autos=0002-2022 | tipo=AP | casoId=42 | isReferencia=true
  id=300 | autos=0003-2020 | tipo=IP | casoId=42 | isReferencia=false

assistidos_processos:
  assistidoId=A | processoId=100 | papel=REU | ativo=false | obs="Desmembrado para 0002-2022"
  assistidoId=B | processoId=100 | papel=REU | ativo=true
  assistidoId=A | processoId=200 | papel=REU | ativo=true
  assistidoId=A | processoId=300 | papel=REU | ativo=true
  assistidoId=B | processoId=300 | papel=REU | ativo=true
```

Assistido A vê: processo 200 (ativo, foco), processo 100 (desmembrado, cinza), IP 300, **e** processo 100 do B (mesmo caso).
Assistido B vê: processo 100 (ativo, foco), IP 300, **e** processo 200 do A (mesmo caso).

---

## 2. Classificação Automática de tipoProcesso

### 2.1 Função `classifyTipoProcesso`

Localização: `src/lib/utils/processo-classification.ts`

```typescript
const CLASSE_TO_TIPO: Record<string, string> = {
  // Ações Penais
  "Ação Penal": "AP",
  "Ação Penal - Procedimento Ordinário": "AP",
  "Ação Penal - Procedimento do Júri": "AP",
  "Ação Penal - Procedimento Sumário": "AP",
  "Ação Penal - Procedimento Sumaríssimo": "AP",
  
  // Inquéritos
  "Inquérito Policial": "IP",
  "Auto de Prisão em Flagrante": "APF",
  
  // Medidas
  "Medidas Protetivas de Urgência": "MPU",
  "Medida Cautelar": "CAUTELAR",
  "Medida Cautelar Inominada": "CAUTELAR",
  "Prisão Preventiva": "PPP",
  "Produção Antecipada de Provas": "PAP",
  
  // Execução
  "Execução Penal": "EP",
  "Execução da Pena": "EP",
  "Execução de ANPP": "EANPP",
  "Acordo de Não Persecução Penal": "EANPP",
  
  // Recursos
  "Habeas Corpus": "HC",
  "Recurso em Sentido Estrito": "RESE",
  "Apelação Criminal": "APELACAO",
};
```

Se match exato falha, busca parcial (ex: classe contém "Medidas Protetivas" → MPU).
Se tudo falha, mantém "AP" como default.

### 2.2 Quando executar

- Ao importar processo do PJe (scraper)
- Ao enriquecer via DataJud
- Ao cadastrar manualmente (se classeProcessual preenchida)
- Migration one-shot para processos existentes com classeProcessual preenchida

---

## 3. Foco Contextual

### 3.1 Função `getProcessosFocados`

Localização: `src/lib/utils/processo-focus.ts`

Recebe lista de processos do caso + atribuição, retorna ordenada por relevância.

Regras de prioridade (em ordem):
1. Processo com audiência futura mais próxima → sobe
2. `ativo = true` para o assistido em questão → acima de `ativo = false`
3. `isReferencia = true` → acima de não-referência
4. Hierarquia por tipo dentro da área:

```
JURI_CAMACARI:   AP > IP > APF > PPP > CAUTELAR > HC
VVD_CAMACARI:    AP > MPU > IP > APF > PAP > CAUTELAR
EXECUCAO_PENAL:  EP > EANPP > AP > AGRAVO > HC
SUBSTITUICAO:    AP > MPU > IP > APF > CAUTELAR > PAP > HC
```

### 3.2 Uso

- Na página do Assistido: ordena processos dentro de cada caso
- Na página do Processo: ordena chips de processos irmãos no header

Função pura, sem side effects, sem persistência. Cálculo em runtime.

---

## 4. Página do Processo (Simplificada)

### 4.1 Tabs

De 9 para 4-6 (conforme área):

| Tab | Sempre | Condição |
|-----|--------|----------|
| **Análise** | Sim | — |
| **Delitos** | — | área criminal (Júri, Criminal, VVD, EP) |
| **Institutos** | — | área criminal |
| **Atos Infracionais** | — | área Infância |
| **Medidas** | — | área Infância |

Tabs **removidas**: Demandas, Agenda, Documentos, Vinculados.

### 4.2 Header

```
┌──────────────────────────────────────────────────────────────┐
│ ← AP 0002-2022.8.05.0039              Júri    [Analisar] [⋮]│
│   Vara do Júri de Camaçari · Camaçari                       │
│   👤 Agnaldo C. Santos (réu)                                 │
│                                                               │
│ ┌─ Caso: Homicídio de João ────────────────────────────────┐ │
│ │ AP 0001-2020 (réu: B)  ·  IP 0003-2020     3 dem · 2 aud│ │
│ └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

- Glass bar com processos irmãos do caso (clicáveis)
- Stats do processo atual (demandas, audiências, arquivos)
- Assistidos com papel entre parênteses
- Processos onde assistido é `ativo=false` aparecem em opacidade reduzida

---

## 5. Página do Assistido (Ajustes)

### 5.1 Header — Caso(s) no glass bar

Substitui o glass bar atual (que mostra 1 processo) por card(s) de caso:

**Assistido com 1 caso:**
```
┌─ Caso: Homicídio de João ────────────────────────────────┐
│ ● AP 0002-2022 (ativo)  ● IP 0003-2020                   │
│ ○ AP 0001-2020 (desmembrado)                              │
│   3 dem · 2 aud · 5 arq                                   │
└──────────────────────────────────────────────────────────┘
```

**Assistido com múltiplos casos (raro):**
Cada caso é um glass card separado, empilhados.

- **●** processo onde é parte ativa
- **○** processo do mesmo caso onde não é parte (ou `ativo=false`)
- Click em chip → navega para página do Processo
- Stats são do assistido (não do caso)

### 5.2 Tabs

De 10 para 7:

| Tab | Mudança |
|-----|---------|
| ~~Processos~~ | **Eliminada** — absorvida pelos chips do caso no header |
| Demandas | **Agrupar por processo** — subheading com número do processo |
| Audiências | **Agrupar por processo** — idem |
| Análise | **Simplificar** — resumo da `analysis_data` do processo em foco + link "Ver completo" → Processo |
| Drive | Manter como está |
| Mídias | Manter como está |
| Ofícios | Manter como está |
| Investigação | Manter (mover para overflow se pouco usado) |
| Timeline | Overflow (já é) |
| Radar | Overflow (já é) |

### 5.3 Query para processos do caso

```sql
-- Processos diretos do assistido
SELECT p.*, ap.papel, ap.ativo, ap.observacoes
FROM processos p
JOIN assistidos_processos ap ON ap.processo_id = p.id
WHERE ap.assistido_id = :assistidoId AND p.deleted_at IS NULL;

-- Processos do mesmo caso (de outros assistidos)
SELECT DISTINCT p.*, null as papel, null as ativo, 'mesmo caso' as observacoes
FROM processos p
WHERE p.caso_id IN (
  SELECT DISTINCT p2.caso_id FROM processos p2
  JOIN assistidos_processos ap2 ON ap2.processo_id = p2.id
  WHERE ap2.assistido_id = :assistidoId AND p2.caso_id IS NOT NULL
)
AND p.id NOT IN (
  SELECT processo_id FROM assistidos_processos WHERE assistido_id = :assistidoId
)
AND p.deleted_at IS NULL;
```

---

## 6. Auto-criação de Caso

### 6.1 Trigger: vincular 2o processo ao assistido

Quando um processo é vinculado a um assistido que já tem outro processo **na mesma área**:

1. Se nenhum dos processos tem `casoId` → criar caso automaticamente, atribuir a ambos
2. Se o existente já tem `casoId` → mostrar dialog: "Mesmo caso que {título}? [Sim] [Não, caso diferente]"
3. **Sim** → atribuir mesmo `casoId` ao novo processo
4. **Não** → criar caso novo

### 6.2 Título automático do caso

`"{classeProcessual} - {nomeAssistido}"` (ex: "Ação Penal - Agnaldo Carlos dos Santos")

Editável inline depois, se quiser renomear para "Homicídio de João".

### 6.3 isReferencia automático

Ao atribuir `casoId` a um processo:
- Se `tipoProcesso` é AP ou EP → `isReferencia = true`
- Todos os outros → `isReferencia = false`

### 6.4 Para assistido com 1 processo (primeiro cadastro)

Caso é criado silenciosamente. Título auto-gerado. O assistido nem percebe — só aparece no header se tiver 2+ processos.

---

## 7. Eliminação da Página `/admin/casos`

- Remover rota `/admin/casos`, `/admin/casos/novo`, `/admin/casos/[id]`
- Remover link no sidebar/menu
- Manter tabela `casos` e todas as tabelas filhas (personas, fatos, teses) — continuam sendo populadas pelo worker IA
- Manter tRPC router `casos` — usado internamente para criar/atualizar casos

---

## 8. Fora de Escopo

- Popular personas/fatos/teses automaticamente via worker IA (futuro)
- Importação de processos vinculados/apensados do PJe
- Edição inline de título do caso (v2)
- Gestão de co-réus que não são assistidos
- Merge/split de casos
- Migração de dados existentes (processos sem casoId continuam funcionando sem agrupamento)
