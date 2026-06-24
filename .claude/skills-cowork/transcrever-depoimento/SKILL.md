---
name: transcrever-depoimento
description: Transcreve a gravação do DEPOIMENTO de um depoente (testemunha) colhido em juízo (gravado no OMBUDS — microfone da sala ou áudio da videoconferência — e armazenado no Drive do assistido) e grava a transcrição + SEGMENTOS (timestamps) de volta na testemunha. Acionada pelo daemon do Claude Code (claude_code_tasks, skill=transcrever-depoimento).
---

# /transcrever-depoimento — Transcrição (com segmentos) do depoimento de um depoente

Você recebe no prompt: **depoente #N** (id da `testemunhas`), **audioDriveFileId** (id do arquivo no Google Drive), **assistidoId**, **processoId** e a **fonte** do áudio (microfone | sistema). Transcreva em **pt-BR**, **com segmentos por trecho (timestamps)**, e grave o resultado de volta na linha `testemunhas` do depoente.

O daemon roda você via `claude -p --permission-mode auto` no diretório do projeto OMBUDS (`/Users/rodrigorochameire/Projetos/Defender`). Ferramentas disponíveis: `rclone` (remote **`gdrive:`**), `ffmpeg`, `whisper-cli`, `node` + `postgres`.

> Depoimentos são **longos** (10–60 min) e o arquivo pode ser `video/webm` quando a fonte é "sistema" (captura da videoconferência) — o `ffmpeg` extrai a faixa de áudio normalmente.

## Passos

1. **Baixar o áudio do Drive** pelo id (rclone, remote `gdrive:`). ⚠️ o comando é `rclone backend copyid` (não `rclone copyid`):
   ```bash
   mkdir -p /tmp/dep_<N> && rclone backend copyid gdrive: <audioDriveFileId> /tmp/dep_<N>/
   ```
   O arquivo cai em `/tmp/dep_<N>/<nome-original>` (`ls /tmp/dep_<N>/`).

2. **Transcrever COM SEGMENTOS** (wav 16k mono + whisper medium pt). Modelo em **`~/whisper-models/ggml-medium.bin`** (`$HOME/whisper-models/ggml-medium.bin`). O `-vn` ignora a faixa de vídeo quando houver. Emita **JSON** (`-oj`) além do texto, para extrair os timestamps:
   ```bash
   ffmpeg -y -i "/tmp/dep_<N>/<arquivo>" -vn -ar 16000 -ac 1 /tmp/dep_<N>.wav
   whisper-cli -m "$HOME/whisper-models/ggml-medium.bin" -l pt -otxt -oj -of /tmp/dep_<N> /tmp/dep_<N>.wav
   ```
   Resultados: `/tmp/dep_<N>.txt` (texto puro) e `/tmp/dep_<N>.json` (estruturado, com `transcription[]`).

3. **Parsear os segmentos** do JSON do whisper-cli para o formato do OMBUDS — array `[{start,end,text}]` com `start`/`end` em **segundos** (números). O whisper-cli emite cada trecho em `transcription[i].offsets.{from,to}` em **milissegundos** (divida por 1000) e o texto em `transcription[i].text`. Use um script node efêmero:
   ```js
   import fs from 'fs';
   const j = JSON.parse(fs.readFileSync('/tmp/dep_<N>.json', 'utf8'));
   const segments = (j.transcription || []).map((s) => ({
     start: (s.offsets?.from ?? 0) / 1000,
     end:   (s.offsets?.to   ?? 0) / 1000,
     text:  (s.text || '').trim(),
   })).filter((s) => s.text);
   const transcricao = segments.map((s) => s.text).join(' ').trim()
     || fs.readFileSync('/tmp/dep_<N>.txt', 'utf8').trim();
   ```
   > Se o JSON não tiver `offsets` (build antigo do whisper-cli), use `segments`/`chunks` equivalentes; em último caso, caia para o `.txt` puro e grave `depoimento_segments=[]` — a transcrição ainda é útil.

4. **Gravar na testemunha `#N`** via DATABASE_URL do `.env.local` (pooler, `prepare:false, ssl:"require"`). Use um script node efêmero — grave o texto, os segmentos (jsonb) e marque o status:
   ```js
   import fs from 'fs'; import postgres from 'postgres';
   const url = fs.readFileSync('.env.local','utf8').split('\n').find(l=>l.startsWith('DATABASE_URL=')).slice(13).replace(/^"|"$/g,'').trim();
   const sql = postgres(url,{prepare:false,ssl:'require'});
   await sql`
     UPDATE testemunhas SET
       depoimento_transcricao=${transcricao},
       depoimento_segments=${sql.json(segments)}::jsonb,
       depoimento_transcricao_status='completed',
       updated_at=now()
     WHERE id=${N}`;
   await sql.end();
   ```
   ⚠️ **Idempotência**: se `depoimento_transcricao_status` já é `completed` para este depoente, **não** retranscreva — confirme e retorne o JSON ok.

## Saída (OBRIGATÓRIA — o daemon lê um JSON)
Termine a resposta com UM bloco JSON em UMA linha (o daemon extrai `{...}` do stdout):
```
{"ok": true, "depoente": N, "chars": <nº de caracteres da transcrição>, "segmentos": <nº de segmentos>, "transcricao_status": "completed"}
```
Em falha (não baixou / não transcreveu), grave `depoimento_transcricao_status='failed'` na testemunha e termine com:
```
{"ok": false, "depoente": N, "erro": "<motivo curto>"}
```

## Regras
- NUNCA inventar: transcreva o que está no áudio; inaudível → `[inaudível]`.
- Segmentos sempre em **segundos** (float), nunca em ms, no campo `depoimento_segments`.
- Idempotência: se `depoimento_transcricao_status` já é `completed` para este depoente, não retranscreva — confirme e retorne o JSON ok.
- Não vaze segredos no stdout (não imprima a DATABASE_URL).
