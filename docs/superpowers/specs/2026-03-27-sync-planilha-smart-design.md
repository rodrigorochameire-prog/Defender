# Sync Inteligente Planilha ↔ OMBUDS

**Data:** 2026-03-27
**Status:** Aprovado
**Problema:** `syncAll()` sobrescreve dados editados manualmente na planilha. Sync não é bidirecional de verdade.

---

## Objetivo

Sincronização bidirecional inteligente entre Google Sheets e banco OMBUDS que:
- Preserva edições de ambos os lados
- Detecta e sinaliza conflitos para resolução manual
- Move demandas entre abas automaticamente (com log)
- Nunca sobrescreve destrutivamente

## Decisões de Design

| Decisão | Escolha |
|---------|---------|
| Direção | Bidirecional |
| Conflitos | Resolução manual (marcação nos dois lados) |
| Onde resolver | Ambos (planilha: célula laranja + comentário; OMBUDS: página /conflitos) |
| Triggers | Híbrido: webhook (real-time) + polling 5min (safety net) |
| Movimentação entre abas | Automática com log |

---

## 1. Modelo de Dados

### Nova tabela: `sync_log`

```sql
CREATE TABLE sync_log (
  id SERIAL PRIMARY KEY,
  demanda_id INT REFERENCES demandas(id),
  campo VARCHAR NOT NULL,           -- "status", "providencias", etc.
  valor_banco TEXT,
  valor_planilha TEXT,
  origem VARCHAR NOT NULL,          -- "BANCO", "PLANILHA", "MOVE"
  banco_updated_at TIMESTAMP,
  planilha_updated_at TIMESTAMP,
  conflito BOOLEAN DEFAULT false,
  resolvido_em TIMESTAMP,
  resolvido_por VARCHAR,            -- "auto" | userId
  resolvido_valor TEXT,             -- valor escolhido na resolução
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Alteração: campo `syncedAt` na tabela `demandas`

```sql
ALTER TABLE demandas ADD COLUMN synced_at TIMESTAMP;
```

Lógica: se `updated_at > synced_at`, o banco foi editado desde o último sync.

### Na planilha: coluna oculta `__lastEdit__`

- Coluna K (oculta): timestamp da última edição da linha
- Apps Script `onEdit()` atualiza automaticamente: `row[K] = new Date().toISOString()`
- Permite saber quando a planilha foi editada sem depender do webhook

---

## 2. Lógica do Sync Inteligente (`syncSmart`)

### Algoritmo principal

```
Para cada demanda no banco (não deletada):
  1. Buscar linha na planilha por __id__
  2. Se não existe na planilha → INSERIR (banco→planilha)
  3. Se existe:
     Para cada campo sincronizável:
       bancoMudou    = demanda.updatedAt > demanda.syncedAt
       planilhaMudou = planilha.__lastEdit__ > demanda.syncedAt

       Só banco mudou       → escrever na planilha
       Só planilha mudou    → escrever no banco
       Ambos, valores iguais → ignorar
       Ambos, valores diff   → CONFLITO → sync_log + marcar célula
       Nenhum mudou         → ignorar

  4. Atualizar demanda.syncedAt = agora

Para cada linha na planilha sem __id__ no banco:
  → Nova demanda criada na planilha → criar no banco
```

### Campos sincronizáveis (bidirecionais)

| Campo | Planilha (col) | Banco (campo) |
|-------|---------------|---------------|
| Status | B | status + substatus |
| Prisão | C | reuPreso |
| Providências | I | providencias |
| Delegado Para | J | delegadoParaId |
| Prazo | H | prazo |

### Campos unidirecionais (banco → planilha)

| Campo | Planilha (col) | Banco (campo) |
|-------|---------------|---------------|
| Assistido | E | assistidoNome |
| Autos | F | numeroAutos |
| Ato | G | ato |
| Data Entrada | D | dataEntrada |

Estes campos só são escritos pelo banco na planilha. Se alguém editar na planilha, o sync ignora (não importa para o banco).

---

## 3. Triggers

### 3.1 Webhook (tempo real, planilha→banco)

**Existente, melhorado.**

```
POST /api/sheets/webhook
Body: { id, campo, valor, editedAt }

Lógica:
  1. Buscar demanda por id
  2. Se demanda.updatedAt > demanda.syncedAt → banco mudou
     2a. Se valor banco == valor webhook → ok, só atualizar syncedAt
     2b. Se valor banco != valor webhook → CONFLITO
  3. Se banco não mudou → aplicar valor da planilha no banco
  4. Atualizar syncedAt
```

### 3.2 Polling (safety net, a cada 5 minutos)

**Novo. Via Inngest cron.**

```
Cron: "*/5 * * * *"

Lógica:
  1. Ler TODAS as linhas da planilha (1 batch request por aba)
  2. Para cada linha com __lastEdit__ > syncedAt da demanda:
     → Processar com mesma lógica do syncSmart
  3. Detectar novas linhas (sem __id__) → criar no banco
  4. Detectar linhas órfãs (demanda deletada no banco) → marcar amarelo
```

### 3.3 Push do OMBUDS (banco→planilha)

**Existente, melhorado.**

```
Quando demanda é criada/editada no app:
  1. Antes de escrever na planilha, ler linha atual
  2. Se planilha.__lastEdit__ > demanda.syncedAt → planilha mudou
     2a. Se valores iguais → ok, escrever
     2b. Se valores diferentes → CONFLITO (não sobrescrever!)
  3. Se planilha não mudou → escrever normalmente
  4. Atualizar syncedAt
```

---

## 4. Resolução de Conflitos

### Na planilha

- Célula em conflito: fundo **laranja** (`#FFE0B2`)
- Comentário automático na célula:
  ```
  ⚠️ Conflito de sincronização
  OMBUDS diz: "{valor_banco}"
  Planilha diz: "{valor_planilha}"
  Resolva em: ombuds.vercel.app/conflitos
  ```
- Ao resolver → remove fundo e comentário

### No OMBUDS

**Indicador global:**
- Badge no sidebar: "N conflitos" (vermelho)
- Visível em qualquer página

**Página `/conflitos`:**
- Lista todos os sync_log com conflito=true e resolvidoEm=null
- Para cada conflito:
  - Mostra: assistido, processo, campo, valor planilha, valor banco
  - Botões: [Aceitar Planilha] [Aceitar OMBUDS] [Editar valor]
- Ao resolver:
  - Atualiza banco e/ou planilha com valor escolhido
  - Registra resolvidoEm, resolvidoPor, resolvidoValor
  - Remove marcação laranja da planilha

---

## 5. Movimentação entre Abas

### Trigger

Quando `processo.atribuicao` muda no banco (ex: SUBSTITUICAO → JURI_CAMACARI).

### Fluxo

```
1. Para cada demanda do processo:
   a. Ler linha completa da aba antiga (preservar TODOS os campos)
   b. Remover linha da aba antiga
   c. Inserir na aba nova com dados preservados
   d. Registrar em sync_log:
      { tipo: "MOVE", campo: "atribuicao",
        valorBanco: "Júri", valorPlanilha: "Substituição criminal",
        origem: "BANCO" }
```

### Log no OMBUDS

Visível na página do assistido/demanda:
```
27/03 01:45 — Movido de "Substituição" → "Júri" (atribuição corrigida)
```

---

## 6. Remoção do `syncAll` Destrutivo

O `syncAll()` atual será **removido** e substituído por `syncSmart()`.

Nenhuma função poderá apagar e reescrever a planilha inteira. Todas as operações são incrementais:

| Função | O que faz |
|--------|-----------|
| `syncSmart()` | Compara e atualiza só o que mudou |
| `pushDemanda()` | Atualiza 1 linha (com check de conflito) |
| `moveDemanda()` | Move 1 linha entre abas (preserva dados) |
| `removeDemanda()` | Remove 1 linha |
| `resolveConflict()` | Resolve 1 conflito |

---

## 7. Apps Script (planilha)

### `onEdit(e)` — existente, melhorado

```javascript
function onEdit(e) {
  const sheet = e.source.getActiveSheet();
  const row = e.range.getRow();

  // Atualizar __lastEdit__ (col K)
  sheet.getRange(row, 11).setValue(new Date().toISOString());

  // Disparar webhook (existente)
  const id = sheet.getRange(row, 1).getValue();
  const campo = HEADERS[e.range.getColumn() - 1];
  const valor = e.value;

  UrlFetchApp.fetch(WEBHOOK_URL, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + SECRET },
    payload: JSON.stringify({ id, campo, valor, editedAt: new Date().toISOString() }),
  });
}
```

---

## 8. Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/lib/db/schema/core.ts` | Adicionar tabela sync_log, campo syncedAt em demandas |
| `src/lib/db/migrations/` | Migration para sync_log + syncedAt |
| `src/lib/services/google-sheets.ts` | Substituir syncAll por syncSmart, melhorar pushDemanda |
| `src/lib/services/sync-engine.ts` | **Novo** — lógica central do sync inteligente |
| `src/lib/inngest/functions.ts` | Adicionar cron de polling 5min |
| `src/app/api/sheets/webhook/route.ts` | Melhorar com detecção de conflito |
| `src/app/(app)/conflitos/page.tsx` | **Nova** — página de resolução de conflitos |
| `src/lib/trpc/routers/sync.ts` | **Novo** — router para listar/resolver conflitos |
| `src/components/sidebar.tsx` | Adicionar badge de conflitos |
| Apps Script (na planilha) | Atualizar onEdit para __lastEdit__ |

---

## 9. Proteções

- **Nunca reescrever planilha inteira** — todas as operações são por linha
- **Nunca sobrescrever sem checar** — sempre comparar timestamps antes
- **Conflitos são visíveis** — nunca perdidos silenciosamente
- **Log completo** — toda operação de sync registrada em sync_log
- **Safety net** — polling pega o que webhook perdeu
