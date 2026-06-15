---
name: transcrever-atendimento
description: Transcreve o áudio de um atendimento da Defensoria (gravado no OMBUDS e armazenado no Drive do assistido) e grava a transcrição + resumo de volta no registro. Acionada pelo daemon do Claude Code (claude_code_tasks, skill=transcrever-atendimento).
---

# /transcrever-atendimento — Transcrição de áudio de atendimento

Você recebe no prompt: **registro #N**, **audioDriveFileId** (id do arquivo no Google Drive), **assistidoId** e, quando houver, **processoId**. Transcreva o áudio em **pt-BR** e grave o resultado de volta no banco.

O daemon roda você via `claude -p --permission-mode auto` no diretório do projeto OMBUDS (`/Users/rodrigorochameire/Projetos/Defender`). Ferramentas disponíveis no ambiente: `rclone` (remote **`gdrive:`**), `ffmpeg`, `whisper-cli`, `node` + `postgres`.

## Passos

1. **Baixar o áudio do Drive** pelo id (rclone, remote `gdrive:` já configurado). ⚠️ o comando é `rclone backend copyid` (não `rclone copyid`):
   ```bash
   mkdir -p /tmp/atd_<N> && rclone backend copyid gdrive: <audioDriveFileId> /tmp/atd_<N>/
   ```
   O arquivo cai em `/tmp/atd_<N>/<nome-original>` (`ls /tmp/atd_<N>/`).

2. **Transcrever** (wav 16k mono + whisper medium pt). Modelo em **`~/whisper-models/ggml-medium.bin`** (`$HOME/whisper-models/ggml-medium.bin`):
   ```bash
   ffmpeg -y -i "/tmp/atd_<N>/<arquivo>" -ar 16000 -ac 1 /tmp/atd_<N>.wav
   whisper-cli -m "$HOME/whisper-models/ggml-medium.bin" -l pt -otxt -of /tmp/atd_<N> /tmp/atd_<N>.wav
   ```
   Resultado: `/tmp/atd_<N>.txt`.

3. **Resumir**: 3-6 linhas — demanda do assistido, fatos relevantes, encaminhamentos. Linguagem defensiva (assistido = defendido/requerido; "ofendida"/"suposta vítima").

4. **Gravar no registro `#N`** via DATABASE_URL do `.env.local` (pooler, `prepare:false, ssl:"require"`). Use um script node efêmero:
   ```js
   import fs from 'fs'; import postgres from 'postgres';
   const url = fs.readFileSync('.env.local','utf8').split('\n').find(l=>l.startsWith('DATABASE_URL=')).slice(13).replace(/^"|"$/g,'').trim();
   const sql = postgres(url,{prepare:false,ssl:'require'});
   await sql`UPDATE registros SET transcricao=${TRANSC}, transcricao_resumo=${RESUMO}, transcricao_status='completed', updated_at=now() WHERE id=${N}`;
   await sql.end();
   ```

## Saída (OBRIGATÓRIA — o daemon lê um JSON)
Termine a resposta com UM bloco JSON em UMA linha (o daemon extrai `{...}` do stdout):
```
{"ok": true, "registro": N, "chars": <nº de caracteres da transcrição>, "transcricao_status": "completed"}
```
Em falha (não baixou / não transcreveu), grave `transcricao_status='failed'` no registro e termine com:
```
{"ok": false, "registro": N, "erro": "<motivo curto>"}
```

## Regras
- NUNCA inventar: transcreva o que está no áudio; inaudível → `[inaudível]`.
- Idempotência: se `transcricao_status` já é `completed` para este registro, não retranscreva — confirme e retorne o JSON ok.
- Não vaze segredos no stdout (não imprima a DATABASE_URL).
