---
name: transcrever-atendimento
description: Transcreve o áudio de um atendimento da Defensoria (gravado no OMBUDS e armazenado no Drive do assistido) e grava a transcrição + resumo de volta no registro. Acionada pelo daemon do Claude Code a partir de uma task claude_code_tasks (skill=transcrever-atendimento).
---

# /transcrever-atendimento — Transcrição de áudio de atendimento

Você recebe, no prompt, os dados de UM atendimento: **registro #N**, **audioDriveFileId** (arquivo de áudio no Google Drive, na pasta do assistido), **assistidoId** e, quando houver, **processoId**. Sua tarefa é transcrever o áudio em **pt-BR** e gravar o resultado de volta no banco.

## Passos

1. **Baixar o áudio do Drive.** Use o `audioDriveFileId` informado. Caminhos possíveis (use o que estiver disponível no ambiente do worker, nesta ordem):
   - `rclone copyid <remote>: <audioDriveFileId> /tmp/` (se houver remote rclone do Drive configurado);
   - a API do Drive via `curl` com token (`https://www.googleapis.com/drive/v3/files/<id>?alt=media`);
   - o `audio_url` (webViewLink) do registro como fallback de inspeção.
   Salve em `/tmp/atendimento_<N>.<ext>`.

2. **Transcrever.** Converta para wav 16k e rode whisper-cli (modelo medium, pt):
   ```bash
   ffmpeg -y -i /tmp/atendimento_<N>.<ext> -ar 16000 -ac 1 /tmp/atendimento_<N>.wav
   whisper-cli -m <modelo medium> -l pt -otxt -of /tmp/atendimento_<N> /tmp/atendimento_<N>.wav
   ```
   (espelha `preparar-audiencias/scripts/transcrever_midias.py`). O resultado é `/tmp/atendimento_<N>.txt`.

3. **Resumir.** Produza um resumo curto (3-6 linhas) do atendimento a partir da transcrição: demanda do assistido, fatos relevantes, encaminhamentos. Linguagem neutra/defensiva.

4. **Gravar de volta no registro `#N`** (use `DATABASE_URL` do `.env.local`/`.env.production.local`, pooler com `prepare:false ssl:require`; ou o Supabase MCP):
   ```sql
   UPDATE registros
   SET transcricao = $1, transcricao_resumo = $2, transcricao_status = 'completed', updated_at = now()
   WHERE id = $N;
   ```
   Se falhar a transcrição, marque `transcricao_status = 'failed'` e descreva o erro no campo de erro da task.

## Regras
- NUNCA inventar conteúdo: transcreva o que está no áudio. Trechos inaudíveis → `[inaudível]`.
- Linguagem defensiva no resumo (assistido = defendido/requerido conforme a atribuição; "ofendida"/"suposta vítima").
- Idempotência: se `transcricao_status` já é `completed` para o mesmo áudio, não retranscreva (apenas confirme).
- Mensagem final: 3 linhas — registro, status, nº de caracteres da transcrição.
