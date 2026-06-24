#!/usr/bin/env python3
"""Baixa mídias de audiência do Lifesize (playback.lifesize.com) para a pasta do assistido.

Fluxo (verificado 10/06/2026): API cloudpublicvideo -> embed (cookies CloudFront) -> m3u8 -> ffmpeg.
- Header Origin OBRIGATÓRIO na API (senão 403).
- Cookies CloudFront expiram em horas: renovados imediatamente antes de cada download.
- Dedup: pula vídeo já no manifesto OU cujo arquivo de saída já existe.

Uso:
  # a partir de URLs públicas (uma por linha, ou separadas por espaço)
  baixar_midias_lifesize.py --dest "<pasta do assistido>" \
      "https://playback.lifesize.com/#/publicvideo/<ID>?vcpubtoken=<TOKEN>" [--label "AIJ 26-05-2026 - Interrogatorio"] ...

  # varrendo um PDF/txt de autos (extrai todos os links Lifesize das atas)
  baixar_midias_lifesize.py --dest "<pasta>" --scan "<autos>.pdf"

Saída: <dest>/Mídias AIJ/<label|nome>.mp4  +  <dest>/Mídias AIJ/_midias.json (manifesto)
"""
import argparse, json, os, re, subprocess, sys, tempfile, urllib.request, urllib.parse

API = "https://vc-prod.lifesize.com/api/v1/cloud-api/cloudpublicvideo"
ORIGIN = "https://playback.lifesize.com"
UA = "Mozilla/5.0"

def _curl(url, headers=None, cookie_jar=None, out=None):
    cmd = ["curl", "-sk", "-A", UA]
    for k, v in (headers or {}).items():
        cmd += ["-H", f"{k}: {v}"]
    if cookie_jar:
        cmd += ["-c", cookie_jar]
    if out:
        cmd += ["-o", out]
    cmd += [url]
    r = subprocess.run(cmd, capture_output=True, text=True)
    return r.stdout

def parse_links(text):
    """Retorna lista de (id, token) achados em texto (atas)."""
    pat = re.compile(r"publicvideo/([a-f0-9-]{36})\?vcpubtoken=([a-f0-9-]{36})")
    text = re.sub(r"\s+", "", text)  # links em atas de PDF quebram de linha; achatar antes de casar
    seen, out = set(), []
    for m in pat.finditer(text):
        key = m.group(1)
        if key not in seen:
            seen.add(key); out.append((m.group(1), m.group(2)))
    return out

def pdf_to_text(path):
    if path.lower().endswith((".txt", ".md")):
        return open(path, encoding="utf-8", errors="ignore").read()
    txt = path + ".txt"
    subprocess.run(["pdftotext", "-layout", path, txt], check=True)
    return open(txt, encoding="utf-8", errors="ignore").read()

def get_meta(vid, token):
    raw = _curl(f"{API}/{vid}?publictoken={token}",
                headers={"Origin": ORIGIN, "Referer": ORIGIN + "/"})
    try:
        return json.loads(raw)["data"]
    except Exception:
        print(f"  ! API falhou para {vid}: {raw[:120]}", file=sys.stderr)
        return None

def get_cookies_and_m3u8(vid, access_token, jar):
    embed = f"https://vc-prod.lifesize.com/api/v1/cloud-api/embed/{vid}?accesstoken={access_token}"
    html = _curl(embed, headers={"Referer": ORIGIN + "/"}, cookie_jar=jar)
    m = re.search(r"(https://iospriv-vc\.lifesize\.com/\S+?/ios_stream_private\.m3u8)", html)
    cookies = {}
    for line in open(jar, encoding="utf-8", errors="ignore"):
        if "CloudFront" in line:
            parts = line.split("\t")
            cookies[parts[-2]] = parts[-1].strip()
    cookie_hdr = "; ".join(f"{k}={v}" for k, v in cookies.items())
    return (m.group(1) if m else None), cookie_hdr

def variant_720(master_url, cookie_hdr):
    """Lê a master playlist e devolve a URL absoluta da variante 720p (1152)."""
    base = master_url.rsplit("/", 1)[0]
    pl = _curl(master_url, headers={"Referer": "https://vc-prod.lifesize.com/", "Cookie": cookie_hdr})
    cand = re.findall(r"^(?!#).+\.m3u8\s*$", pl, re.M)
    if not cand:
        return None
    best = next((c.strip() for c in cand if "1152" in c), cand[0].strip())
    return f"{base}/{best}"

def download(variant_url, cookie_hdr, out_path):
    cmd = ["ffmpeg", "-y", "-loglevel", "error",
           "-headers", f"Referer: https://vc-prod.lifesize.com/\r\nCookie: {cookie_hdr}\r\n",
           "-i", variant_url, "-c", "copy", "-bsf:a", "aac_adtstoasc", out_path]
    return subprocess.run(cmd).returncode == 0

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("urls", nargs="*", help="URLs públicas do Lifesize")
    ap.add_argument("--dest", required=True, help="pasta do assistido")
    ap.add_argument("--scan", help="PDF/txt de autos para extrair links das atas")
    ap.add_argument("--label", action="append", default=[], help="rótulo p/ cada URL (mesma ordem)")
    args = ap.parse_args()

    media_dir = os.path.join(args.dest, "Mídias AIJ")
    os.makedirs(media_dir, exist_ok=True)
    manifest_path = os.path.join(media_dir, "_midias.json")
    manifest = json.load(open(manifest_path)) if os.path.exists(manifest_path) else {}

    pairs = []
    for i, u in enumerate(args.urls):
        ids = parse_links(u)
        if ids:
            lbl = args.label[i] if i < len(args.label) else None
            pairs.append((*ids[0], lbl))
    if args.scan:
        for vid, tok in parse_links(pdf_to_text(args.scan)):
            pairs.append((vid, tok, None))

    if not pairs:
        print("Nenhum link Lifesize encontrado.", file=sys.stderr); sys.exit(1)

    for vid, tok, label in pairs:
        if vid in manifest and os.path.exists(manifest[vid].get("arquivo", "")):
            print(f"= já baixado: {manifest[vid]['arquivo']}")
            continue
        meta = get_meta(vid, tok)
        if not meta:
            continue
        name = label or re.sub(r'[\\/:*?"<>|]', "-", meta.get("name", vid))[:120]
        out_path = os.path.join(media_dir, f"{name}.mp4")
        if os.path.exists(out_path):
            print(f"= arquivo já existe: {out_path}")
            manifest[vid] = {"arquivo": out_path, "nome_lifesize": meta.get("name"), "origem": "lifesize"}
            continue
        at = meta["iframe"].split("accesstoken=")[1]
        with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as tf:
            jar = tf.name
        master, cookie_hdr = get_cookies_and_m3u8(vid, at, jar)
        os.unlink(jar)
        if not master:
            print(f"  ! sem m3u8 para {vid}", file=sys.stderr); continue
        variant = variant_720(master, cookie_hdr)
        print(f"↓ {name} ...")
        if download(variant, cookie_hdr, out_path):
            manifest[vid] = {"arquivo": out_path, "nome_lifesize": meta.get("name"), "origem": "lifesize"}
            json.dump(manifest, open(manifest_path, "w"), ensure_ascii=False, indent=2)
            print(f"  ✓ {out_path}")
        else:
            print(f"  ! ffmpeg falhou para {vid}", file=sys.stderr)

    print(f"\nManifesto: {manifest_path}")

if __name__ == "__main__":
    main()
