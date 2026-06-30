# Deponent Card — Pins, Timestamps, Skill & Sheet Refinements

**Data:** 2026-06-30  
**Autor:** brainstorm Rodrigo + Claude  
**Branch alvo:** `feat/registros-panel-redesign` (já ativo)  
**Revisão do spec:** 2026-06-30 (pós-review — 3 bloqueantes + 7 menores corrigidos)

---

## Goal

Eliminar o "vácuo" de dados nos cards de depoentes quando a audiência é preparada pela skill, e enriquecer a UX com:
- Deep-link ao **termo de depoimento na delegacia** (PDF da fase policial na página exata)
- **Reprodução posicionada** do depoimento judicial (arquivo já baixado pelo pipeline LifeSize/PJe)
- **Pinos de pontos críticos** — criados automaticamente pela IA durante a análise e manualmente pelo defensor no player, com marcadores visuais na linha do tempo

Além dos refinamentos de sheet identificados em produção (screenshots 30/06).

---

## Escopo

### Parte A — Sheet refinements (5 itens)

**A1 — Texto da denúncia limpo**  
O campo "TERMOS DA EXORDIAL" exibe o PDF bruto: cabeçalho de página, bloco de assinatura eletrônica, URL do PJe, dados do gerador, endereçamento judicial. O interesse é só o parágrafo narrativo dos fatos.

Função `extrairNarrativaFatos(texto: string): string`:
1. Remove linhas que batem com qualquer regex: `Num\. \d+ - Pág\.`, `Assinado eletronicamente`, `https?://`, `Número do documento:`, `Este documento foi gerado`, `\d{2}/\d{2}/\d{4} \d{2}:\d{2}:\d{2}`
2. Remove bloco de cabeçalho judicial (linhas ALL-CAPS de comarca/promotoria/endereçamento), identificado como sequência de linhas onde `line === line.toUpperCase()` e `line.length > 3`, até a primeira linha que não seja ALL-CAPS com ≥80 chars
3. Normaliza: espaços internos colapsados (`\s+` → ` ` dentro de cada linha), quebras ≥3 `\n` → `\n\n`
4. Retorna texto a partir do primeiro parágrafo ≥80 chars que inicia com marcador temporal ou de sujeito, via regex: `/(No dia|Na data|Na madrugada|Na noite|Nas proximidades|Por volta|O denunciado|O acusado|A vítima|Em \d{2}\/\d{2})/i`

Se nenhum marcador for encontrado: retornar o texto inteiro após as remoções dos passos 1–3 (melhor do que nada).

**A2 — Remover card AIJ redundante da aba**  
Dentro do tab "Caso" aparece uma réplica do card "Audiência de Instrução e Julgamento" (descrição + lembretes). O usuário já está dentro da sheet desse evento — o card é redundante. Remover essa seção da aba Caso.

**A3 — Renomear aba "Imputação" → "Caso"**  
Em `areas-mae.ts`: literal `"imputacao"` mantido como AreaMae (evitar quebras); label visível muda de `"Imputação"` para `"Caso"` em `AREA_LABELS` de `area-tabs.tsx`.

**A4 — Nova aba "Intimações"**  
Adicionar `"intimacoes"` à union `AreaMae`. Inserir entre `"imputacao"` e `"depoimentos"` em `AREA_ORDER`.

Mudanças obrigatórias em `areas-mae.ts`:
- Union: `"imputacao" | "intimacoes" | "depoimentos" | "laudos-docs" | "estrategia" | "execucao"`
- `AREA_ORDER`: `["imputacao", "intimacoes", "depoimentos", "laudos-docs", "estrategia", "execucao"]`
- `AREA_LABELS`: adicionar `intimacoes: "Intimações"`
- `SECAO_TO_AREA["intimacao"]`: mudar de `"depoimentos"` → `"intimacoes"`
- Atualizar testes em `areas-mae.test.ts` e `area-tabs.test.tsx` para refletir a nova union e a nova label

Conteúdo da aba: novo componente `IntimacoesSecao` que lista todos os depoentes da audiência com status de intimação (INTIMADO / NÃO INTIMADO / CARTA PRECATÓRIA / DESISTIDA) e expandidor para o teor da certidão de comunicação. Usa `testemunhas.status` e `testemunhas.certidaoComunicacao`.

**A5 — Réu/interrogatório na lista de depoentes**  
Depoentes com `tipo === "INTERROGANDO"` não aparecem na lista atual de `DepoentesSecao` e têm cor neutra no card.

Mudanças necessárias:
1. `tipoTestemunhaEnum` em `src/lib/db/schema/agenda.ts`: adicionar `"INTERROGANDO"` aos valores do enum Drizzle (nova migração ou `ALTER TYPE`)
2. `DepoenteV2` interface em `depoente-card-v2.tsx`: adicionar `"INTERROGANDO"` ao union de `tipo`
3. `ladoOf()` em `depoente-card-v2.tsx`: adicionar caso `d.tipo === "INTERROGANDO" → "defesa"` (antes do fallback `neutro`)
4. `topBarColor` map: adicionar `defesa-interrog` ou usar lógica condicional — o réu usa `bg-emerald-500/70` (mais escuro que `bg-emerald-300/70` das testemunhas de defesa). Implementação: adicionar verificação `d.tipo === "INTERROGANDO"` para retornar a cor escura dentro do ramo `defesa`
5. `DepoentesSecao`: incluir `tipo === "INTERROGANDO"` no bloco Defesa, sempre posicionado por último

---

### Parte B — Deponent card UI

**B1 — Ícones Lucide**  
Substituir emojis inline por ícones Lucide (já importados no arquivo):
- `🏛 DELEGACIA` → `<Building2 className="h-3 w-3 text-neutral-400" /> DELEGACIA`
- `⚖ EM JUÍZO` → `<Scale className="h-3 w-3 text-neutral-400" /> EM JUÍZO`

**B2 — Botão "Abrir termo (IP)"**  
Regra de prioridade para o link do termo:
1. **Prioritário:** se `midia.termoDelegaciaDriveFileId` (novo campo de `getDepoenteMidia`) está presente → `https://drive.google.com/file/d/${id}/view${pagina ? `#page=${pagina}` : ""}`
2. **Fallback:** se não há coluna populada, manter a busca existente via `trpc.drive.sectionsByProcesso` (já funciona para casos onde a skill não rodou ainda)

O botão fica visível em ambos os casos, com o link correto. Nenhuma remoção da lógica existente de `sectionsByProcesso`.

**B3 — TranscriptPlayer com offset de início**  
Nova prop `offsetS?: number` no `TranscriptPlayer`:
1. Exibe badge `"começa em MM:SS"` no cabeçalho EM JUÍZO quando `depoimentoTimestampInicioS` está definido
2. Ao montar (`useEffect` com `[offsetS]`), setar `audioRef.current.currentTime = offsetS` se `offsetS > 0` (sem autoplay)

**B4 — Pinos na linha do tempo e no transcript**

*Estrutura de um pino:*
```typescript
interface Pino {
  id: string;           // uuid gerado no cliente (crypto.randomUUID())
  timestampS: number;
  nota: string;
  fonte: "ia" | "defensor";
  categoria: "contradicao" | "admissao" | "inconsistencia" | "relevante" | "livre";
}
```

*Player — barra de progresso customizada (substituição de `<audio controls>`):*  
Remover `<audio controls>`. Adicionar barra manual composta por:
- `<audio ref={audioRef} preload="metadata" src={src}>` (sem `controls`)
- Linha de controles:
  - Botão play/pause: `audioRef.current.paused ? audioRef.current.play() : audioRef.current.pause()` com ícone `Play`/`Pause` (Lucide, 3×3)
  - Tempo atual `MM:SS / MM:SS` (atualizado via `timeupdate`)
- Barra de progresso (`<div>` relativa, clicável para seek):
  - Fundo `bg-neutral-200 dark:bg-neutral-700`, altura 4px
  - Preenchimento `bg-emerald-500` proporcional a `currentTime / duration`
  - Click no div: `el.currentTime = (clientX / rect.width) * el.duration`
  - Sobre a barra (`position: absolute`): marcador `|` de 2×8px por pino:
    - `fonte === "ia"` → `bg-amber-400`
    - `fonte === "defensor"` → `bg-emerald-500`
    - Hover: tooltip com `nota` (truncada 60 chars via `title` attr)
    - Click no marcador: `el.currentTime = pino.timestampS; el.play()`

Para casos **sem pinos** (todos os casos atuais), a barra funciona normalmente — play/pause + seek — sem regressão.

*Transcript — botão 📌 por linha:*  
Em cada `<button>` de segmento, adicionar ao hover um `<button type="button">` com ícone `Pin` (Lucide, h-3 w-3). Clicar abre `<Popover>`:
- Textarea "Nota" (2 linhas, max 500 chars)
- Select de categoria
- Botão "Fixar ponto" → `addPino.mutate({ depoenteId, timestampS: s.start, nota, categoria, fonte: "defensor" })`

*Lista de pinos:*  
Seção colapsável "Pontos fixados (N)" após o transcript. Cada item: ícone de categoria, `MM:SS`, nota, botão `×` → `removePino.mutate({ depoenteId, pinoId })`.

---

### Parte C — DB e backend

**C1 — Migração `testemunhas`**

5 novas colunas (nenhuma se sobrepõe a existentes):

```sql
ALTER TABLE testemunhas
  ADD COLUMN termo_delegacia_drive_file_id varchar(100),
  ADD COLUMN termo_delegacia_pagina        integer,
  ADD COLUMN depoimento_timestamp_inicio_s integer,
  ADD COLUMN depoimento_timestamp_fim_s    integer,
  ADD COLUMN pinos                         jsonb NOT NULL DEFAULT '[]'::jsonb;
```

Schema Drizzle correspondente em `src/lib/db/schema/agenda.ts`.

Se `tipoTestemunhaEnum` for um `pgEnum`, adicionar `"INTERROGANDO"` requer:
```sql
ALTER TYPE tipo_testemunha_enum ADD VALUE 'INTERROGANDO';
```
(PostgreSQL não requer recriação do enum para adicionar valores — apenas `ADD VALUE`.)

**C2 — tRPC**

Novas procedures em `audiencias.ts`:

```typescript
addPino: protectedProcedure
  .input(z.object({
    depoenteId: z.number(),
    timestampS: z.number(),
    nota: z.string().max(500),
    categoria: z.enum(["contradicao", "admissao", "inconsistencia", "relevante", "livre"]),
    fonte: z.enum(["ia", "defensor"]),
  }))
  .mutation(async ({ input }) => {
    // Drizzle: sql`pinos = pinos || ${JSON.stringify([{id, ...}])}::jsonb`
    const pino = { id: crypto.randomUUID(), ...input };
    await db.execute(sql`
      UPDATE testemunhas
      SET pinos = pinos || ${JSON.stringify([pino])}::jsonb
      WHERE id = ${input.depoenteId}
    `);
    return pino;
  })

removePino: protectedProcedure
  .input(z.object({ depoenteId: z.number(), pinoId: z.string() }))
  .mutation(async ({ input }) => {
    await db.execute(sql`
      UPDATE testemunhas
      SET pinos = (
        SELECT jsonb_agg(p) FROM jsonb_array_elements(pinos) p
        WHERE p->>'id' != ${input.pinoId}
      )
      WHERE id = ${input.depoenteId}
    `);
  })
```

`getDepoenteMidia` passa a retornar adicionalmente: `pinos`, `termoDelegaciaDriveFileId`, `termoDelegaciaPagina`, `depoimentoTimestampInicioS`.

---

### Parte D — Skill `preparar-audiencias`

**D1 — Substep 5d: bookmark de termos por depoente**

Novo script `scripts/05d_vincular_termos_ip.py`.

Lógica:
1. `pdftotext -layout <ip.pdf> /tmp/ip_text.txt`
2. Dividir em páginas via `\f` (form feed); numerar páginas começando em 1
3. Encontrar páginas com padrão `TERMO DE (DEPOIMENTO|OITIVA|DECLARAÇÃO)|AUTO DE QUALIFICAÇÃO E INTERROGATÓRIO` (regex, case-insensitive)
4. Para cada depoente, calcular score de similaridade com `difflib.SequenceMatcher(None, nome_normalizado, texto_inicio_pagina).ratio()` (stdlib Python, zero deps extras); selecionar melhor match se `ratio >= 0.65`
5. Gravar no registro JSON: `depoente.termo_delegacia = { drive_file_id, pagina_inicio }`
6. Popular `versaoDelegacia`: primeiras 3 linhas não-vazias do corpo do termo (após o cabeçalho burocrático, identificado como bloco ALL-CAPS inicial)

**D2 — Step 5c: auto-link de gravação judicial por depoente**

> **IMPORTANTE — Formato do whisper.cpp JSON:**  
> `transcrever_midias.py` usa `whisper-cli` (whisper.cpp). O JSON gerado tem estrutura:
> ```json
> {"transcription": [{"offsets": {"from": 0, "to": 2000}, "text": "..."}]}
> ```
> onde `offsets.from` e `offsets.to` estão em **milissegundos**. A conversão é `timestamp_s = offsets["from"] / 1000`. Não existe chave `segments[].start`.

Após `baixar_midias_lifesize.py` (ou PJe Mídias) gravar o arquivo e obter o Drive file ID:
1. Popular `depoente.gravacao_judicial.drive_file_id` em todos os depoentes da audiência
2. Mapear timestamps por depoente via `_whisper.json`:
   - **Estratégia 1 (preferida):** para cada depoente, buscar `nome.split()[0].lower()` e `nome.split()[-1].lower()` nos segmentos de `transcription[]`; o segmento onde ambas as partes do nome aparecem marca o início (`offsets["from"] / 1000`); o próximo segmento com nome de outro depoente marca o fim
   - **Estratégia 2 (fallback):** ata de audiência com horário por depoente → offset relativo ao início da gravação
   - **Estratégia 3 (último recurso):** duração total dividida proporcionalmente pela ordem art. 400 CPP

**D3 — Step 7: auto-pinos pela IA**

O prompt das análises (`analise-vvd`/`analise-juri`) ganha instrução adicional (adicionada às referências `references/instrucoes_dossie_vvd_agentes.md`):

> "Para cada contradição, admissão ou inconsistência identificada no depoimento, se houver transcrição com timestamps disponível, incluir no campo `pinos_sugeridos` do JSON de saída uma lista de objetos `{ nome_depoente, timestamp_s, nota, categoria }`. O `timestamp_s` deve ser o valor `offsets.from / 1000` do segmento exato do `_whisper.json` onde ocorre o fato."

**D4 — Schema `registro_audiencia` atualizado**

```json
{
  "depoentes": [{
    "nome": "...",
    "tipo": "...",
    "...": "...",
    "termo_delegacia": {
      "drive_file_id": "1abc...",
      "pagina_inicio": 42
    },
    "gravacao_judicial": {
      "drive_file_id": "1xyz...",
      "timestamp_inicio_s": 1234,
      "timestamp_fim_s": 2890
    },
    "pinos_sugeridos": [
      {
        "timestamp_s": 1456,
        "nota": "Contradição: 'não o conhecia' vs. admite convivência anterior",
        "categoria": "contradicao"
      }
    ]
  }]
}
```

**D5 — `popular_ombuds.mjs` atualizado**

Matching JSON → testemunha DB: lookup por `(audiencia_id, LOWER(TRIM(nome)))`. Normalizar ambos os lados com `str.toLowerCase().replace(/\s+/g, ' ').trim()`. Se não houver match exato, tentar `startsWith` com primeiro + último nome (cobre abreviações).

Mapeamento de campos:
- `termo_delegacia.drive_file_id` → `termoDelegaciaDriveFileId`
- `termo_delegacia.pagina_inicio` → `termoDelegaciaPagina`
- `gravacao_judicial.drive_file_id` → `depoimentoAudioDriveFileId` (coluna já existente — unifica)
- `gravacao_judicial.timestamp_inicio_s` → `depoimentoTimestampInicioS`
- `gravacao_judicial.timestamp_fim_s` → `depoimentoTimestampFimS`
- `pinos_sugeridos[]` → **SQL direto** (não HTTP tRPC):
  ```javascript
  // Para cada pino_sugerido:
  await sql`
    UPDATE testemunhas
    SET pinos = pinos || ${JSON.stringify([{ id: crypto.randomUUID(), fonte: 'ia', ...p }])}::jsonb
    WHERE id = ${testemunhaId}
      AND NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(pinos) x
        WHERE (x->>'timestampS')::int = ${p.timestamp_s}
          AND x->>'fonte' = 'ia'
      )
  `
  ```
  O `NOT EXISTS` evita duplicar pinos da IA em re-execuções.

---

## Fora de escopo

- Diarização automática real (pyannote.audio — custo/latência alto; estratégia de nome-no-transcript é suficiente)
- Upload de arquivos de mídia via UI (já existe `VincularAudioPopover`)
- Criação de pinos sem timestamp (só timestamps vinculados à gravação)

---

## Fluxo de dados (skill → DB → UI)

```
preparar-audiencias (skill)
  └─ 5b: baixa IP/APF
  └─ 5c: baixa LifeSize/PJe mídia + transcreve (whisper-cli → _whisper.json)
  └─ 5d: extrai páginas de termos via pdftotext → bookmark por depoente
  └─ 7:  análise IA → pinos_sugeridos com timestamps (offsets.from/1000)
  └─ 8:  popular_ombuds.mjs
        ├─ UPDATE testemunhas SET termoDelegacia*, depoimentoTimestamp* (lookup por audiencia_id+nome)
        └─ INSERT pinos (fonte=ia) via SQL direto (com dedup por timestamp+fonte)

UI (EventDetailSheet > DepoentesSecao > DepoenteCardV2)
  └─ getDepoenteMidia → { pinos, timestamps, termoDelegaciaDriveFileId, ... }
  └─ TranscriptPlayer (offsetS + barra customizada + pinos na timeline)
  └─ addPino / removePino (interação manual do defensor)
```

---

## Tarefas de implementação (ordem sugerida)

1. **DB migration** — 5 novas colunas em `testemunhas`; `ADD VALUE 'INTERROGANDO'` no enum
2. **tRPC** — `addPino`, `removePino` (SQL direto); atualizar `getDepoenteMidia` com 4 novos campos
3. **`extrairNarrativaFatos`** — função TypeScript + testes unitários (casos: PDF sujo real, texto já limpo, sem marcador temporal)
4. **Sheet A1-A5** — denúncia limpa, remover card AIJ, renomear label "Caso", nova aba Intimações (`areas-mae.ts` + `AREA_ORDER` + `SECAO_TO_AREA["intimacao"]` → `"intimacoes"` + `IntimacoesSecao` component + **atualizar `areas-mae.test.ts` e `area-tabs.test.tsx`**), réu na lista (cor escura + `ladoOf` + `DepoenteV2.tipo`)
5. **Card B1-B2** — ícones Lucide; lógica de link (prioridade nova coluna → fallback `sectionsByProcesso`)
6. **`TranscriptPlayer` B3-B4** — prop `offsetS`; substituir `<audio controls>` por barra customizada com play/pause + seek + marcadores de pinos; botão 📌 por linha; lista de pinos colapsável
7. **Skill 5d** — `05d_vincular_termos_ip.py` (pdftotext + difflib + page matching)
8. **Skill 5c enhancement** — mapeamento de timestamps via `_whisper.json` (`offsets.from / 1000`)
9. **Skill 7 + 8** — instrução adicional no prompt de análise + `popular_ombuds.mjs` com novos campos + pinos via SQL direto
