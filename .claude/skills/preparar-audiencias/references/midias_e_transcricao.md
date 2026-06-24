# Mídias de audiência e transcrição — módulo canônico

Fonte única para **(1) colher as mídias das audiências** das atas, **(2) baixá-las para a pasta do assistido** e **(3) transcrevê-las** com timestamps e interlocutores. Usado por `preparar-audiencias`, `juri` (relatório e preparação 422), `analise-audiencias` e qualquer fluxo que precise da prova oral. **Sempre dedup**: não baixar nem transcrever o que já está na pasta.

Validado em 10/06/2026 (caso André Luiz Silva Cerqueira, VVD — AIJ 26/05/2026 no Lifesize).

---

## 0. Regra de ouro — dedup antes de tudo

Antes de baixar/transcrever, **varrer a pasta do assistido** (e subpastas `Mídias AIJ/`, `Autos/`, etc.):
- Mídia já presente: arquivo `.mp4`/`.m4a`/`.mp3` cujo nome casa com a audiência → **não rebaixar**.
- Transcrição já presente: `.srt`/`.txt`/`.md` irmão da mídia → **não retranscrever**.
- O script `baixar_midias_lifesize.py` grava um manifesto `Mídias/_midias.json` com os IDs já baixados; `transcrever_midias.py` pula mídia que já tem `.srt`. Confiar no manifesto, mas conferir o diretório (arquivos podem ter sido movidos à mão).

---

## 1. Onde estão os links das mídias (varredura das atas)

As mídias ficam fora do PDF dos autos; o link mora **na ata de cada audiência** ("A audiência foi gravada em sistema audiovisual, estando o link disponível no PJe Mídias" + URL). Para mapear a instrução inteira de um assistido, varrer **todas as atas**:

```bash
pdftotext -layout "<autos>.pdf" /tmp/autos.txt
# Lifesize (varas que usam Lifesize, ex.: VVD Camaçari "Sala 3"):
grep -oE 'playback\.lifesize\.com/#/publicvideo/[a-f0-9-]+\?vcpubtoken=[a-f0-9-]+' /tmp/autos.txt | sort -u
# PJe Mídias / CNJ:
grep -oiE 'midias\.pje\.jus\.br[^ ]*|pje *mídias|audiencia/visualizar\?id=[0-9]+' /tmp/autos.txt | sort -u
# Atas (para saber a que audiência cada link pertence):
grep -niE 'ata da audiência|aos .* dias do mês|gravada em sistema audiovisual' /tmp/autos.txt
```

Há, em regra, **uma mídia por audiência realizada** (instrução pode ter várias datas: a fase de delegacia não tem mídia; cada AIJ/continuação tem a sua). Casar cada link com a data/conteúdo da ata (testemunha X, interrogatório, etc.) para nomear corretamente.

> Atenção: nem toda vara usa Lifesize. Júri e muitas varas usam **PJe Mídias/CNJ** (`midias.pje.jus.br`) — método próprio (login CPF+senha; cada `audiencia/visualizar?id=` entrega URL assinada do storage; baixar direto). Ver memória `project_juri_nailton_10jun2026` (22 mídias baixadas por essa via).

---

## 2. Download Lifesize (método verificado)

O player do Lifesize é uma SPA; a mídia está atrás de **CloudFront com cookies assinados**. Fluxo: **API `cloudpublicvideo` → `embed` (Set-Cookie CloudFront) → `m3u8` → ffmpeg**.

```
GET https://vc-prod.lifesize.com/api/v1/cloud-api/cloudpublicvideo/{ID}?publictoken={TOKEN}
    Header OBRIGATÓRIO: Origin: https://playback.lifesize.com   ← sem ele, 403 "CORS request with origin not None allowed"
    → JSON com .data.iframe = .../embed/{ID}?accesstoken={AT}

GET .../api/v1/cloud-api/embed/{ID}?accesstoken={AT}   (com cookie jar -c)
    → Set-Cookie: CloudFront-Policy / CloudFront-Signature / CloudFront-Key-Pair-Id (Path = pasta da gravação)
    → HTML com flowplayer src = https://iospriv-vc.lifesize.com/.../ios_stream_private.m3u8
```

Master playlist tem variantes `mainfeed_pip_1152_iosfeed/...-1152-...m3u8` (720p) e `..._512_...` (480p). Baixar **720p**:

```bash
ffmpeg -y -headers "Referer: https://vc-prod.lifesize.com/"$'\r\n'"Cookie: $COOKIE"$'\r\n' \
  -i "<base>/mainfeed_pip_1152_iosfeed/<prefix>-1152-ios_private.m3u8" \
  -c copy -bsf:a aac_adtstoasc "<pasta assistido>/AIJ <DD-MM-AAAA> - <descrição>.mp4"
```

**Caveats:**
- Cookies expiram em **horas** (campo `DateLessThan/AWS:EpochTime` na Policy). **Renovar imediatamente antes de baixar**; se der `MissingKey`/403 no m3u8, refazer passos 1–2.
- **Cada vídeo tem cookies próprios** (Path restrito à sua pasta). Refazer o par embed→cookies por vídeo.
- `id` e `vcpubtoken` saem da URL pública da ata (`#/publicvideo/{id}?vcpubtoken={token}`).
- Tudo automatizado em `scripts/baixar_midias_lifesize.py` (renova cookies, dedup, manifesto).

---

## 3. Transcrição (ffmpeg + whisper-cli)

Não há serviço externo: usar **whisper.cpp local**.

```bash
# áudio 16kHz mono
ffmpeg -y -i "<midia>.mp4" -vn -ac 1 -ar 16000 -c:a pcm_s16le "/tmp/<midia>.wav"
# transcrição (modelo medium, português, SRT+TXT+JSON)
whisper-cli -m ~/.cache/whisper-cpp/ggml-medium.bin -f "/tmp/<midia>.wav" -l pt -t 8 \
  -osrt -otxt -oj -of "<pasta>/Transcrições/<midia>" \
  --prompt "Audiência de instrução e julgamento. Juiz, Ministério Público, Defensoria Pública, testemunha, réu, vítima. Português do Brasil."
```

- Modelo **medium** é o piso aceitável em pt-BR; o prompt inicial enviesa o vocabulário forense e reduz erro em nomes/termos.
- whisper dá **timestamps**, **não** faz diarização (`--diarize` é só estéreo por canal; `--tdrz` exige modelo tinydiarize). → **Interlocutores são atribuídos por contexto** (vocativos, dinâmica pergunta/resposta, papéis: Juíza conduz, MP/Defesa inquirem, depoente responde).
- Automatizado em `scripts/transcrever_midias.py` (varre a pasta, pula o que já tem `.srt`).

### 3.1 Saída para uso jurídico

Gerar, além do SRT, um **transcrito limpo em .md** com `[mm:ss] INTERLOCUTOR:` e uma síntese por depoente — é o que `conferencia-depoimentos` e as peças consomem. Modelo de cabeçalho:

```markdown
# Transcrição da AIJ — <data> (<sala/forma>)
**Processo / Defendido / Juíza / Fonte / Método**
> Aviso de fidelidade: transcrição automática tem imprecisões (nomes próprios, trechos sobrepostos);
> interlocutores atribuídos por contexto. CONFERIR DE OUVIDO antes de citar aspas literais (skill conferencia-depoimentos).
## ARQUIVO N — <depoente/ato> (≈Xmin)
- **[mm:ss] JUÍZA:** ...
- **[mm:ss] DEFESA:** ...
- **[mm:ss] DEPOENTE:** ...
> Síntese: <o que importa para a defesa>
```

### 3.2 Disciplina de citação (obrigatória)

Aplicar `citacao-depoimentos`: identificar **quem perguntou** (MP/Defesa/Juíza), distinguir **espontâneo vs. resposta**, marcar **reiteração**, e inserir timestamp `(mídia audiovisual, a partir de XXminYYs)`. **Nunca** citar aspas literais sem conferência auditiva — whisper erra nomes e pode trocar palavras decisivas.

---

## 4. Convenção de nomes e pastas

Na pasta do assistido:
- Mídias: `Mídias AIJ/` (ou `Mídias/`) → `AIJ <DD-MM-AAAA> - <depoente ou ato>.mp4`.
- Transcrições: `Mídias AIJ/Transcrições/` → mesmo nome, `.srt`/`.txt`; e um `.md` consolidado por audiência.
- Manifesto: `Mídias/_midias.json` (IDs Lifesize/PJe baixados, com data e origem).

---

## 5. Quando rodar

- **preparar-audiencias** (passo 5c): ao preparar o dia, após baixar os autos, varrer as atas dos processos da pauta, baixar as mídias faltantes e transcrever — assim a análise/dossiê já cita a prova oral real.
- **juri** (relatório estratégico e preparação 422) e **analise-audiencias**: ANTES de analisar, conferir se a pasta já tem mídias/transcrições; se faltar, rodar este módulo (dedup). Com a instrução transcrita, a análise cita depoimentos com timestamp em vez de só parafrasear o IP.
- **relatório processual / varrer um processo**: para um assistido, varrer todas as atas → baixar todas as mídias → transcrever toda a instrução feita até então.
