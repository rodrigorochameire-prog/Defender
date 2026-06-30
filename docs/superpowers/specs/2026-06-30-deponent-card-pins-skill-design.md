# Deponent Card — Pins, Timestamps, Skill & Sheet Refinements

**Data:** 2026-06-30  
**Autor:** brainstorm Rodrigo + Claude  
**Branch alvo:** `feat/registros-panel-redesign` (já ativo)

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
O campo "TERMOS DA EXORDIAL" exibe o PDF bruto: cabeçalho de página (`Num. 508976743 - Pág. 1`), bloco de assinatura eletrônica, URL do PJe, dados do gerador, endereçamento judicial. O interesse é só o parágrafo narrativo dos fatos ("No dia 07 de maio de 2025, por volta das 23h44min...").

Solução: função `extrairNarrativaFatos(texto: string): string` que:
1. Remove linhas que batem com: `Num\. \d+ - Pág\.`, `Assinado eletronicamente`, `https?://`, `Número do documento:`, `Este documento foi gerado`, datas `\d{2}/\d{2}/\d{4} \d{2}:\d{2}:\d{2}`
2. Remove o cabeçalho judicial (linhas ALL-CAPS de comarca, promotoria, endereçamento) até encontrar parágrafo iniciando com "O MINISTÉRIO PÚBLICO" ou equivalente
3. Normaliza espaços múltiplos e quebras de linha excessivas (≥3 `\n` → `\n\n`; espaços internos colapsados)
4. Retorna o texto a partir do primeiro parágrafo narrativo identificado por heurística: linha ≥80 chars com maiúscula inicial e verbos no passado

**A2 — Remover card AIJ redundante da aba**  
Dentro do tab "Imputação/Caso" aparece uma réplica do card "Audiência de Instrução e Julgamento" (descrição + lembretes). O usuário já está dentro da sheet desse evento — o card é redundante. Remover essa seção da aba.

**A3 — Renomear aba "Imputação" → "Caso"**  
Em `areas-mae.ts`: literal `"imputacao"` mantido como AreaMae (evitar quebras); label visível muda de `"Imputação"` para `"Caso"` no array de tabs de `area-tabs.tsx`.

**A4 — Nova aba "Intimações"**  
Inserir entre "Caso" e "Depoimentos". Conteúdo: lista de todos os depoentes da audiência com coluna de status de intimação (INTIMADO / NÃO INTIMADO / CARTA PRECATÓRIA / DESISTIDA) e expandidor para o teor da certidão de comunicação. Usa os dados já presentes em `testemunhas.status` e `testemunhas.certidaoComunicacao`. Novo valor `"intimacoes"` adicionado a `AreaMae`.

**A5 — Réu/interrogatório na lista de depoentes**  
Depoentes com `tipo === "INTERROGANDO"` não aparecem na lista atual de `DepoentesSecao`. Adicionar ao bloco Defesa, posicionado sempre por último (art. 400 CPP). Cor do top-bar: `bg-emerald-500/70` (mais escuro que o esmeralda claro das testemunhas, que usa `bg-emerald-300/70`). Avatar: `DEFESA` mantido (emerald-700).

---

### Parte B — Deponent card UI

**B1 — Ícones Lucide**  
Substituir emojis `🏛` e `⚖` por ícones Lucide:
- DELEGACIA → `<Building2 className="h-3 w-3 text-neutral-400" />`
- EM JUÍZO → `<Scale className="h-3 w-3 text-neutral-400" />`

**B2 — Botão "Abrir termo (IP)"**  
Atualmente `termoIpHref` só é gerado quando `depoente.versaoDelegacia` ou `termoIp.textoExtraido` são não-nulos. Isso esconde o link quando há o bookmark mas não o texto extraído.

Nova lógica: gerar o href se o campo `termoDelegaciaDriveFileId` (coluna nova — ver Parte C) estiver presente, ignorando os campos de texto. URL: `https://drive.google.com/file/d/${fileId}/view#page=${pagina}` (fallback sem `#page` se pagina for null).

O botão fica sempre visível na seção DELEGACIA quando há `termoDelegaciaDriveFileId`, independente de texto.

**B3 — TranscriptPlayer com offset de início**  
Quando `depoimentoTimestampInicioS` estiver definido (coluna nova), o player deve:
1. Exibir badge "começa em MM:SS" ao lado do cabeçalho EM JUÍZO
2. Ao carregar, posicionar o `<audio>` em `currentTime = depoimentoTimestampInicioS` (sem dar play automático)

Nova prop `offsetS?: number` no `TranscriptPlayer`.

**B4 — Pinos na linha do tempo e no transcript**

*Estrutura de um pino:*
```typescript
interface Pino {
  id: string;           // uuid gerado localmente
  timestampS: number;
  nota: string;
  fonte: "ia" | "defensor";
  categoria: "contradicao" | "admissao" | "inconsistencia" | "relevante" | "livre";
}
```

*Player — marcadores na timeline:*  
O `<audio controls>` nativo não expõe a barra de progresso. Substituir pelo componente de áudio customizado (sem `controls`; barra manual com `<div>` + `currentTime` via `timeupdate`). Sobre a barra: um `<div>` superposto com `position: absolute` renderiza um marcador `▼` (2×8px) para cada pino:
- fonte=`ia` → `bg-amber-400`
- fonte=`defensor` → `bg-emerald-500`
- Hover: tooltip com `nota` (truncada em 60 chars)
- Click: `audioRef.current.currentTime = pino.timestampS`

*Transcript — botão 📌 por linha:*  
Em cada `<button>` de segmento, adicionar ao hover um `<button type="button" onClick={abrirPopoverPino(s.start)}>` com ícone `Pin` (Lucide, 3×3). Clicar abre um `<Popover>` com:
- Campo texto "Nota" (textarea, 2 linhas)
- Select de categoria (`contradicao`, `admissao`, `inconsistencia`, `relevante`, `livre`)
- Botão "Fixar ponto" → chama `addPino`

*Lista de pinos abaixo do player:*  
Após o transcript, seção colapsável "Pontos fixados (N)" listando todos os pinos em ordem cronológica. Cada item: ícone de categoria, timestamp MM:SS, nota, botão `×` para remover (chama `removePino`).

---

### Parte C — DB e backend

**C1 — Migração `testemunhas`**

Adicionar 5 colunas à tabela `testemunhas`:

```sql
ALTER TABLE testemunhas
  ADD COLUMN termo_delegacia_drive_file_id varchar(100),
  ADD COLUMN termo_delegacia_pagina        integer,
  ADD COLUMN depoimento_timestamp_inicio_s integer,
  ADD COLUMN depoimento_timestamp_fim_s    integer,
  ADD COLUMN pinos                         jsonb DEFAULT '[]';
```

Schema Drizzle correspondente em `src/lib/db/schema/agenda.ts`.

**C2 — tRPC**

Novas procedures em `audiencias.ts`:

```typescript
// Adicionar pino
addPino: protectedProcedure
  .input(z.object({
    depoenteId: z.number(),
    timestampS: z.number(),
    nota: z.string().max(500),
    categoria: z.enum(["contradicao", "admissao", "inconsistencia", "relevante", "livre"]),
    fonte: z.enum(["ia", "defensor"]),
  }))
  .mutation(async ({ input }) => { /* append to pinos jsonb */ })

// Remover pino
removePino: protectedProcedure
  .input(z.object({ depoenteId: z.number(), pinoId: z.string() }))
  .mutation(async ({ input }) => { /* filter pino by id */ })
```

`getDepoenteMidia` passa a retornar também `pinos`, `termoDelegaciaDriveFileId`, `termoDelegaciaPagina`, `depoimentoTimestampInicioS`.

---

### Parte D — Skill `preparar-audiencias`

**D1 — Substep 5d: bookmark de termos por depoente**

Novo script `scripts/05d_vincular_termos_ip.py` executado após o download do processo referência (IP/APF).

Lógica:
1. `pdftotext -layout <ip.pdf> /tmp/ip_text.txt`
2. Encontrar todas as páginas com padrão `TERMO DE (DEPOIMENTO|OITIVA|DECLARAÇÃO)|AUTO DE QUALIFICAÇÃO E INTERROGATÓRIO` → lista `[(pagina, texto_da_pagina)]`
3. Para cada depoente, calcular score de similaridade (Levenshtein) entre `depoente.nome` e o texto do início de cada termo; selecionar melhor match se score ≥ 0.7
4. Gravar no registro JSON: `depoente.termo_delegacia = { drive_file_id: <id do PDF no Drive>, pagina_inicio: N }`
5. Também popular `versaoDelegacia` com um resumo de até 3 linhas do depoimento na delegacia (extraído das primeiras linhas do corpo do termo, após o cabeçalho burocrático)

**D2 — Step 5c: auto-link de gravação judicial por depoente**

Após `baixar_midias_lifesize.py` (ou PJe Mídias) gravar o arquivo e obter o Drive file ID:
1. Para cada depoente da audiência, popular `depoente.gravacao_judicial = { drive_file_id: <id> }`
2. Mapear timestamps por depoente via whisper JSON (arquivo `_whisper.json` gerado por `transcrever_midias.py`):
   - Estratégia 1 (preferida): buscar o nome do depoente nos segmentos → primeiro segmento com nome = `timestamp_inicio_s`; próxima ocorrência de outro depoente = `timestamp_fim_s`
   - Estratégia 2 (fallback): ata de audiência tem horário por depoente → mapear para offset relativo ao início da gravação
   - Estratégia 3 (último recurso): dividir a duração proporcionalmente pela ordem art. 400 CPP

**D3 — Step 7: auto-pinos pela IA**

O prompt das análises (`analise-vvd`/`analise-juri`) ganha instrução adicional:

> "Para cada contradição, admissão ou inconsistência identificada no depoimento, se houver timestamp no JSON do Whisper, incluir no campo `pinos_sugeridos` uma lista de objetos `{ nome_depoente, timestamp_s, nota, categoria }`. Citar o timestamp exato do segmento onde ocorre."

O script `popular_ombuds.mjs` lê `pinos_sugeridos` da análise e chama `addPino` com `fonte: "ia"` para cada um.

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

Mapear os novos campos do registro JSON para as colunas novas da tabela `testemunhas`:
- `termo_delegacia.drive_file_id` → `termoDelegaciaDriveFileId`
- `termo_delegacia.pagina_inicio` → `termoDelegaciaPagina`
- `gravacao_judicial.drive_file_id` → `depoimentoAudioDriveFileId` (campo já existente — unificar)
- `gravacao_judicial.timestamp_inicio_s` → `depoimentoTimestampInicioS`
- `gravacao_judicial.timestamp_fim_s` → `depoimentoTimestampFimS`
- `pinos_sugeridos[]` → chamadas à API `addPino` com `fonte: "ia"`

---

## Fora de escopo

- Diarização automática real (requereria pyannote.audio com modelo speaker-diarization — custo/latência alto; a estratégia de nome-no-transcript é suficiente para 90% dos casos)
- Upload de arquivos de mídia via UI (já existe `VincularAudioPopover`)
- Criação de pinos a partir de texto (sem timestamp) — só timestamps vinculados à gravação

---

## Fluxo de dados (skill → DB → UI)

```
preparar-audiencias (skill)
  └─ 5b: baixa IP/APF
  └─ 5c: baixa LifeSize/PJe mídia + transcreve (whisper)
  └─ 5d: extrai páginas de termos → bookmark por depoente
  └─ 7:  análise IA → pinos_sugeridos com timestamps
  └─ 8:  popular_ombuds.mjs
        ├─ UPDATE testemunhas SET termoDelegacia*, depoimentoTimestamp*
        └─ INSERT pinos (fonte=ia) via addPino

UI (EventDetailSheet > DepoentesSecao > DepoenteCardV2)
  └─ getDepoenteMidia → { pinos, timestamps, termoDelegaciaDriveFileId, ... }
  └─ TranscriptPlayer (com offsetS + pinos na timeline)
  └─ addPino / removePino (interação manual)
```

---

## Tarefas de implementação (ordem sugerida)

1. **DB migration** — 5 novas colunas em `testemunhas`
2. **tRPC** — `addPino`, `removePino`; atualizar `getDepoenteMidia`
3. **`extrairNarrativaFatos`** — função + testes unitários
4. **Sheet A1-A5** — denúncia limpa, remover card AIJ, renomear aba, nova aba Intimações, réu na lista
5. **Card B1-B2** — ícones Lucide + botão termo IP sempre visível
6. **`TranscriptPlayer` B3-B4** — offset de início + barra manual + pinos na timeline + botão 📌 + lista de pinos
7. **Skill 5d** — `05d_vincular_termos_ip.py`
8. **Skill 5c enhancement** — mapeamento de timestamps via whisper JSON
9. **Skill 7 + 8** — auto-pinos IA + `popular_ombuds.mjs` com novos campos
