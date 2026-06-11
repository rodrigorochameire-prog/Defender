#!/usr/bin/env python3
"""Transcreve mídias de audiência (ffmpeg + whisper.cpp medium pt) com timestamps.

- Varre a pasta do assistido (recursivo) por .mp4/.m4a/.mp3/.wav.
- DEDUP: pula mídia que já tem .srt irmão (em Transcrições/ ou ao lado).
- Gera SRT + TXT + JSON em <pasta>/Mídias AIJ/Transcrições/.
- whisper.cpp NÃO faz diarização: os interlocutores são atribuídos depois, por contexto
  (gerar o .md consolidado [mm:ss] INTERLOCUTOR: manualmente — ver references/midias_e_transcricao.md §3).

Uso: transcrever_midias.py "<pasta do assistido>" [--model <caminho ggml>] [--lang pt]
"""
import argparse, os, subprocess, sys, tempfile

MODEL_DEFAULT = os.path.expanduser("~/.cache/whisper-cpp/ggml-medium.bin")
PROMPT = ("Audiência de instrução e julgamento. Juiz, Ministério Público, "
          "Defensoria Pública, testemunha, réu, vítima. Português do Brasil.")
EXTS = (".mp4", ".m4a", ".mp3", ".wav", ".aac", ".mov")

def find_media(root):
    out = []
    for dp, _, files in os.walk(root):
        if os.path.basename(dp) == "Transcrições":
            continue
        for f in files:
            if f.lower().endswith(EXTS) and not f.startswith("._"):
                out.append(os.path.join(dp, f))
    return sorted(out)

def has_transcript(media_path, trans_dir):
    stem = os.path.splitext(os.path.basename(media_path))[0]
    for d in {os.path.dirname(media_path), trans_dir}:
        if os.path.exists(os.path.join(d, stem + ".srt")):
            return True
    return False

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pasta")
    ap.add_argument("--model", default=MODEL_DEFAULT)
    ap.add_argument("--lang", default="pt")
    ap.add_argument("--threads", default="8")
    args = ap.parse_args()

    if not os.path.exists(args.model):
        sys.exit(f"Modelo whisper não encontrado: {args.model}\n"
                 f"Instale: brew install whisper-cpp e baixe ggml-medium.bin")

    trans_dir = os.path.join(args.pasta, "Mídias AIJ", "Transcrições")
    os.makedirs(trans_dir, exist_ok=True)

    medias = find_media(args.pasta)
    if not medias:
        sys.exit("Nenhuma mídia encontrada.")

    for m in medias:
        stem = os.path.splitext(os.path.basename(m))[0]
        if has_transcript(m, trans_dir):
            print(f"= já transcrito: {stem}")
            continue
        print(f"♪ extraindo áudio: {stem}")
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tf:
            wav = tf.name
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", m,
                        "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", wav], check=True)
        print(f"✎ transcrevendo (whisper medium {args.lang}) ...")
        subprocess.run(["whisper-cli", "-m", args.model, "-f", wav, "-l", args.lang,
                        "-t", args.threads, "-osrt", "-otxt", "-oj",
                        "-of", os.path.join(trans_dir, stem), "--prompt", PROMPT], check=True)
        os.unlink(wav)
        print(f"  ✓ {os.path.join(trans_dir, stem)}.srt")

    print(f"\nTranscrições em: {trans_dir}\n"
          f"Próximo passo: montar o .md consolidado [mm:ss] INTERLOCUTOR: por contexto "
          f"(references/midias_e_transcricao.md §3.1) e conferir de ouvido antes de citar.")

if __name__ == "__main__":
    main()
