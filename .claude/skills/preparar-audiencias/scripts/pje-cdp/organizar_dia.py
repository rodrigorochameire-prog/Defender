#!/usr/bin/env python3
"""
Organiza os autos baixados do staging na pasta do dia + pastas dos assistidos.

- Pasta do dia: 5 - Operacional/Audiências/<ATRIB> - <DD-MM-YYYY>/
  Numeração: principal = ordem da pauta (1, 2, 3...); associados = 1.1, 1.2...
  Nome: "N [VVD] SIGLA <CNJ> - <Nome do Assistido>.pdf"
- Pasta do assistido: 3 - Casos/Processos - VVD (Criminal)/<Nome>/<CNJ>/Autos Digitais - <CNJ>.pdf

Usa: meta.json do staging (classe/partes/associados) + pauta JSON (ordem/assistidos).
Dedup por SHA-256 (não recopia se identico).

Uso: organizar_dia.py --staging DIR --pauta /tmp/pauta-2026-06-11.json --dia 11-06-2026
"""
import argparse, hashlib, json, re, shutil, unicodedata
from pathlib import Path

DRIVE = Path("/Users/rodrigorochameire/Meu Drive/1 - Defensoria 9ª DP")
VVD_BASE = DRIVE / "3 - Casos/Processos - VVD (Criminal)"
AUD_BASE = DRIVE / "5 - Operacional/Audiências"

SIGLAS = [
    (re.compile(r"MPCALHBI", re.I), "MPU-HB"),  # Lei Henry Borel (14.344/2022)
    (re.compile(r"MPU", re.I), "MPU"),
    (re.compile(r"AuPrFl|Flagrante", re.I), "APF"),
    (re.compile(r"PetCrim", re.I), "PET"),
    (re.compile(r"A[çc][ãa]oPenal|APCrim|APOrd|APSum|AP\b", re.I), "AP"),
    (re.compile(r"InqPol|IP\b|Inqu[ée]rito", re.I), "IP"),
    (re.compile(r"TCO|Termo Circunstanciado", re.I), "TCO"),
    (re.compile(r"Carta Precat|CartaPrecat", re.I), "CP"),
]


def sigla(classe: str) -> str:
    for rx, s in SIGLAS:
        if rx.search(classe or ""):
            return s
    return (classe or "PROC")[:12]


def sha(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()[:16]


def title_name(nome: str) -> str:
    # normaliza conectores minusculos
    out = []
    for w in (nome or "").split():
        out.append(w.lower() if w.lower() in ("de", "da", "do", "dos", "das", "e") else w.capitalize())
    return " ".join(out)


def copy_if_new(src: Path, dst: Path):
    if dst.exists() and sha(dst) == sha(src):
        return "ja_existe"
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)
    return "copiado"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--staging", required=True)
    ap.add_argument("--pauta", required=True)
    ap.add_argument("--dia", required=True)  # DD-MM-YYYY
    ap.add_argument("--atrib", default="VVD")
    args = ap.parse_args()

    staging = Path(args.staging).expanduser()
    meta = json.loads((staging / "meta.json").read_text())
    pauta = json.loads(open(args.pauta).read())

    dia_dir = AUD_BASE / f"{args.atrib} - {args.dia}"
    dia_dir.mkdir(parents=True, exist_ok=True)

    # ordem da pauta (sem mutirão, com processo)
    principais = [a for a in pauta["audiencias"]
                  if (a.get("contexto") or "") != "MUTIRAO" and a.get("numero_autos")]

    relatorio = []
    for i, aud in enumerate(principais, start=1):
        cnj = aud["numero_autos"]
        nome = title_name(aud.get("assistido_nome") or "A Identificar")
        rec = meta["processos"].get(cnj, {})
        s = sigla(rec.get("classe", ""))
        src = Path(rec.get("pdf", "")) if rec.get("pdf") else staging / f"autos-{cnj}.pdf"

        linha = {"n": str(i), "cnj": cnj, "sigla": s, "assistido": nome,
                 "horario": aud.get("horario"), "tipo_audiencia": aud.get("tipo")}
        if src.exists():
            dst_dia = dia_dir / f"{i} [{args.atrib}] {s} {cnj} - {nome}.pdf"
            r1 = copy_if_new(src, dst_dia)
            dst_ass = VVD_BASE / nome / cnj / f"Autos Digitais - {cnj}.pdf"
            r2 = copy_if_new(src, dst_ass)
            linha.update({"dia": r1, "assistido_copia": r2})
        else:
            linha["erro"] = "pdf_nao_baixado"
        relatorio.append(linha)

        # associados
        for j, acnj in enumerate(rec.get("associados", []), start=1):
            arec = meta["processos"].get(acnj, {})
            asig = sigla(arec.get("classe", ""))
            asrc = Path(arec.get("pdf", "")) if arec.get("pdf") else staging / f"autos-{acnj}.pdf"
            alinha = {"n": f"{i}.{j}", "cnj": acnj, "sigla": asig, "assistido": nome, "pai": cnj}
            if asrc.exists():
                dst_dia = dia_dir / f"{i}.{j} [{args.atrib}] {asig} {acnj} - {nome}.pdf"
                r1 = copy_if_new(asrc, dst_dia)
                dst_ass = VVD_BASE / nome / acnj / f"Autos Digitais - {acnj}.pdf"
                r2 = copy_if_new(asrc, dst_ass)
                alinha.update({"dia": r1, "assistido_copia": r2})
            else:
                alinha["erro"] = "pdf_nao_baixado"
            relatorio.append(alinha)

    out = staging / "organizacao.json"
    out.write_text(json.dumps(relatorio, ensure_ascii=False, indent=2))
    for l in relatorio:
        print(l.get("n"), l.get("sigla"), l.get("cnj"), "-", l.get("assistido"),
              "|", l.get("dia", l.get("erro")), "/", l.get("assistido_copia", ""))
    print(f"\npasta do dia: {dia_dir}")


if __name__ == "__main__":
    main()
