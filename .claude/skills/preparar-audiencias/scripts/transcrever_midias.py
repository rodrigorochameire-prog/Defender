#!/usr/bin/env python3
"""Transcreve mídias de audiência (ffmpeg + whisper.cpp medium pt) com timestamps.

- Varre a pasta do assistido (recursivo) por .mp4/.m4a/.mp3/.wav.
- DEDUP: pula mídia que já tem .srt irmão (em Transcrições/ ou ao lado).
- Gera SRT + TXT + JSON em <pasta>/Mídias AIJ/Transcrições/.
- whisper.cpp NÃO faz diarização: os interlocutores são atribuídos depois, por contexto
  (gerar o .md consolidado [mm:ss] INTERLOCUTOR: manualmente — ver references/midias_e_transcricao.md §3).
- Com --registro: detecta timestamps por depoente a partir da transcrição whisper JSON.

Uso: transcrever_midias.py "<pasta do assistido>" [--model <caminho ggml>] [--lang pt] [--registro <path>]
"""
import argparse, os, subprocess, sys, tempfile, json as _json, difflib, re as _re

MODEL_DEFAULT = os.path.expanduser("~/.cache/whisper-cpp/ggml-medium.bin")
PROMPT = ("Audiência de instrução e julgamento. Juiz, Ministério Público, "
          "Defensoria Pública, testemunha, réu, vítima. Português do Brasil.")
EXTS = (".mp4", ".m4a", ".mp3", ".wav", ".aac", ".mov")

_NAME_NOISE = _re.compile(r"\b(de|da|do|dos|das|e|a|o)\b", _re.IGNORECASE)

def _norm(s: str) -> str:
    return _NAME_NOISE.sub("", s.lower()).strip()

def detectar_timestamps_depoentes(
    transcription_segments: list,
    depoentes: list,
    threshold: float = 0.65,
) -> dict:
    """
    Returns {nome: {timestamp_inicio_s, timestamp_fim_s}} for each deponent
    found in the whisper.cpp transcription segments.
    offsets in the JSON are in milliseconds — divide by 1000 for seconds.
    """
    results = {}
    for dep in depoentes:
        nome = dep.get("nome", "")
        if not nome:
            continue
        nome_norm = _norm(nome)
        primeiro = None
        ultimo = None
        for seg in transcription_segments:
            text_norm = _norm(seg.get("text", ""))
            ratio = difflib.SequenceMatcher(None, nome_norm, text_norm).ratio()
            if ratio >= threshold or nome_norm in text_norm:
                ts_s = seg["offsets"]["from"] / 1000.0
                te_s = seg["offsets"]["to"] / 1000.0
                if primeiro is None:
                    primeiro = ts_s
                ultimo = te_s
        if primeiro is not None:
            results[nome] = {
                "timestamp_inicio_s": int(primeiro),  # spec field name
                "timestamp_fim_s": int(ultimo),        # spec field name
            }
    return results

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
    if "--test" in sys.argv:
        _test()
        sys.exit(0)

    ap = argparse.ArgumentParser()
    ap.add_argument("pasta")
    ap.add_argument("--model", default=MODEL_DEFAULT)
    ap.add_argument("--lang", default="pt")
    ap.add_argument("--threads", default="8")
    ap.add_argument("--registro", default=None,
                    help="Path to registro_audiencia.json — enables per-deponent timestamp detection")
    args = ap.parse_args()

    registro = None
    registro_path = None
    if args.registro:
        registro_path = args.registro
        registro = _json.loads(open(registro_path).read())

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

        # Detect per-deponent timestamps if registro was provided
        if registro is not None:
            json_out = os.path.join(trans_dir, stem + ".json")
            if os.path.exists(json_out):
                transcription_data = _json.loads(open(json_out).read())
                segments = transcription_data.get("transcription", [])
                depoentes = registro.get("depoentes", [])
                timestamps = detectar_timestamps_depoentes(segments, depoentes)
                for dep in depoentes:
                    nome = dep.get("nome", "")
                    if nome in timestamps:
                        gj = dep.setdefault("gravacao_judicial", {})
                        gj.update(timestamps[nome])
                        print(f"  ⏱ {nome}: {timestamps[nome]['timestamp_inicio_s']}s → {timestamps[nome]['timestamp_fim_s']}s")
                    else:
                        print(f"  – {nome}: timestamps não detectados")
                open(registro_path, "w").write(_json.dumps(registro, ensure_ascii=False, indent=2))

    print(f"\nTranscrições em: {trans_dir}\n"
          f"Próximo passo: montar o .md consolidado [mm:ss] INTERLOCUTOR: por contexto "
          f"(references/midias_e_transcricao.md §3.1) e conferir de ouvido antes de citar.")

def _test():
    segs = [
        {"offsets": {"from": 0, "to": 2000}, "text": "bom dia"},
        {"offsets": {"from": 2000, "to": 15000}, "text": "Maria Santos afirmou que estava em casa"},
        {"offsets": {"from": 15000, "to": 20000}, "text": "e saiu às 22h"},
        {"offsets": {"from": 30000, "to": 35000}, "text": "João Silva por sua vez disse que"},
    ]
    deps = [{"nome": "Maria Santos"}, {"nome": "João Silva"}, {"nome": "Fulano Inexistente"}]
    r = detectar_timestamps_depoentes(segs, deps)
    assert r.get("Maria Santos") == {"timestamp_inicio_s": 2, "timestamp_fim_s": 15}, r
    assert r.get("João Silva") == {"timestamp_inicio_s": 30, "timestamp_fim_s": 35}, r
    assert "Fulano Inexistente" not in r
    print("OK: timestamp detection works")

if __name__ == "__main__":
    main()
