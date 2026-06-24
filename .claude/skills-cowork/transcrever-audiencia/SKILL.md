---
name: transcrever-audiencia
description: Transcreve a gravação de uma audiência da Defensoria (gravada no OMBUDS — microfone da sala ou áudio da videoconferência — e armazenada no Drive do assistido) e grava a transcrição + resumo de volta na audiência. Acionada pelo daemon do Claude Code (claude_code_tasks, skill=transcrever-audiencia).
---

# /transcrever-audiencia — Transcrição de gravação de audiência

Você recebe no prompt: **audiência #N**, **audioDriveFileId** (id do arquivo no Google Drive), **assistidoId**, **processoId** e a **fonte** do áudio (microfone | sistema). Transcreva em **pt-BR** e grave o resultado de volta no banco.

O daemon roda você via `claude -p --permission-mode auto` no diretório do projeto OMBUDS (`/Users/rodrigorochameire/Projetos/Defender`). Ferramentas disponíveis: `rclone` (remote **`gdrive:`**), `ffmpeg`, `whisper-cli`, `node` + `postgres`.

> Audiências são **longas** (15–60 min) e o arquivo pode ser `video/webm` quando a fonte é "sistema" (captura da videoconferência) — o `ffmpeg` extrai a faixa de áudio normalmente.

## Passos

1. **Baixar o áudio do Drive** pelo id (rclone, remote `gdrive:`). ⚠️ o comando é `rclone backend copyid` (não `rclone copyid`):
   ```bash
   mkdir -p /tmp/aud_<N> && rclone backend copyid gdrive: <audioDriveFileId> /tmp/aud_<N>/
   ```
   O arquivo cai em `/tmp/aud_<N>/<nome-original>` (`ls /tmp/aud_<N>/`).

2. **Transcrever** (wav 16k mono + whisper medium pt). Modelo em **`~/whisper-models/ggml-medium.bin`** (`$HOME/whisper-models/ggml-medium.bin`). O `-vn` ignora a faixa de vídeo quando houver:
   ```bash
   ffmpeg -y -i "/tmp/aud_<N>/<arquivo>" -vn -ar 16000 -ac 1 /tmp/aud_<N>.wav
   whisper-cli -m "$HOME/whisper-models/ggml-medium.bin" -l pt -otxt -of /tmp/aud_<N> /tmp/aud_<N>.wav
   ```
   Resultado: `/tmp/aud_<N>.txt`.

3. **Resumir**: 4-8 linhas — tipo da audiência, partes presentes/ausentes, o que foi decidido (ex.: manutenção/revisão/revogação de MPU; depoimentos colhidos), e providências para a defesa. Linguagem defensiva (assistido = defendido/requerido; "ofendida"/"suposta vítima").

4. **Estruturar a ata** a partir da transcrição (fatia 2). Monte um objeto `ata` no formato que o OMBUDS já renderiza, **sem inventar** — só o que está claramente no áudio:
   ```json
   {
     "resultado": "realizada|suspensa|redesignada|nao_realizada",
     "data_realizada": "YYYY-MM-DD ou null",
     "hora_realizada": "HH:MM ou null",
     "ouvidos":   [{ "nome": "...", "papel": "vítima|testemunha|réu|informante|null" }],
     "ausencias": [{ "nome": "...", "papel": "...|null", "motivo": "...|null" }],
     "origem": "gravacao",
     "parseado_em": "<ISO agora>"
   }
   ```
   Para justificação (MPU), `resultado` reflete a decisão sobre as medidas (mantidas/revistas/revogadas → `realizada`). Em dúvida sobre um campo, deixe `null`/array vazio. Produza também uma **minuta curta da defesa** (3-6 linhas, 1ª pessoa do defensor): tese sustentada na audiência e próximos passos.

5. **Gravar na audiência `#N`** via DATABASE_URL do `.env.local` (pooler, `prepare:false, ssl:"require"`). Use um script node efêmero. ⚠️ **Não sobrescreva** uma ata oficial já existente (`ata` vinda do parser de texto colado): só grave `ata` quando ela estiver `NULL` ou com `origem='gravacao'`. Idem para `resumo_defesa` (só preencha se vazio):
   ```js
   import fs from 'fs'; import postgres from 'postgres';
   const url = fs.readFileSync('.env.local','utf8').split('\n').find(l=>l.startsWith('DATABASE_URL=')).slice(13).replace(/^"|"$/g,'').trim();
   const sql = postgres(url,{prepare:false,ssl:'require'});
   await sql`
     UPDATE audiencias SET
       transcricao=${TRANSC},
       transcricao_resumo=${RESUMO},
       transcricao_status='completed',
       ata = CASE WHEN ata IS NULL OR ata->>'origem'='gravacao' THEN ${sql.json(ATA)}::jsonb ELSE ata END,
       resumo_defesa = COALESCE(NULLIF(resumo_defesa, ''), ${MINUTA_DEFESA}),
       updated_at=now()
     WHERE id=${N}`;
   await sql.end();
   ```

## Saída (OBRIGATÓRIA — o daemon lê um JSON)
Termine a resposta com UM bloco JSON em UMA linha (o daemon extrai `{...}` do stdout):
```
{"ok": true, "audiencia": N, "chars": <nº de caracteres da transcrição>, "transcricao_status": "completed"}
```
Em falha (não baixou / não transcreveu), grave `transcricao_status='failed'` na audiência e termine com:
```
{"ok": false, "audiencia": N, "erro": "<motivo curto>"}
```

## Regras
- NUNCA inventar: transcreva o que está no áudio; inaudível → `[inaudível]`.
- Idempotência: se `transcricao_status` já é `completed` para esta audiência, não retranscreva — confirme e retorne o JSON ok.
- Não vaze segredos no stdout (não imprima a DATABASE_URL).
