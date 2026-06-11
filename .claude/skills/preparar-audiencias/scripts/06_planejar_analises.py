#!/usr/bin/env python3
"""
Planejador de análises individuais.

Não roda LLM — emite um plano JSON com instruções por audiência:
  - Detecta subtipo (justificacao, aij, oitiva_especial, custodia, plenario, etc.)
  - Identifica skill+reference adequados
  - Aponta o PDF dos autos a ser lido
  - Lista o output esperado (caminho do .pdf/.md/.json)
  - Indica quando JÁ existe análise recente (skip)

O orchestrator (skill /preparar-audiencias) consome o plano e invoca a skill
de análise correspondente para cada item, na ordem de prioridade.

Uso:
  python3 .claude/skills-cowork/preparar-audiencias/scripts/06_planejar_analises.py 2026-05-05

Output: /tmp/plano-analises-<DIA>.json
"""
import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

# Mapeamento subtipo → reference de análise
REFS_VVD = {
    "justificacao": "vvd/references/vvd_analise_audiencia_justificacao.md",
    "aij": "vvd/references/vvd_analise_para_audiencia.md",
    "oitiva_especial": "vvd/references/vvd_analise_para_audiencia.md",
    "custodia": "analise-audiencias/references/analise_auto_prisao_flagrante.md",
    "preliminar": "vvd/references/vvd_analise_para_audiencia.md",
    "una": "vvd/references/vvd_analise_para_audiencia.md",
    "conciliacao": None,  # ato curto, sem dossiê
}
REFS_JURI = {
    "aij_primeira_fase": "analise-audiencias/references/analise_audiencia_sumariante.md",
    "plenario": "analise-audiencias/references/analise_plenario_juri.md",  # pode não existir → fallback
    "qualificacao": None,
    "precatoria": "analise-audiencias/references/analise_audiencia_criminal.md",
}
REFS_FALLBACK = "analise-audiencias/references/analise_audiencia_criminal.md"

PALETA = {
    "VVD_CAMACARI": "amber",
    "JURI_CAMACARI": "emerald",
    "GRUPO_JURI": "emerald",
    "EXECUCAO_PENAL": "blue",
}


def detectar_subtipo_vvd(tipo: str, classe: str) -> str:
    t = (tipo or "").upper()
    c = (classe or "").upper()
    if "FLAGRANTE" in c or "APF" in c:
        return "custodia"
    if "JUSTIFICA" in t:
        return "justificacao"
    if "INSTRUÇÃO" in t or "INSTRUCAO" in t or "AIJ" in t:
        return "aij"
    if "ESPECIAL" in t or "DEPOIMENTO ESPECIAL" in t:
        return "oitiva_especial"
    if "PRELIMINAR" in t:
        return "preliminar"
    if re.search(r"\bUNA\b", t):
        return "una"
    if "CONCILIA" in t:
        return "conciliacao"
    return "indefinido"


def detectar_subtipo_juri(tipo: str, classe: str) -> str:
    t = (tipo or "").upper()
    c = (classe or "").upper()
    if "PLEN" in t or "JULGAMENTO PELO JÚRI" in t or "SESSÃO" in t:
        return "plenario"
    if "INSTRUÇÃO" in t or "INSTRUCAO" in t or "AIJ" in t or "SUMÁRIO" in t:
        return "aij_primeira_fase"
    if "QUALIFICA" in t or "IDENTIFICAÇÃO" in t:
        return "qualificacao"
    if "PRECATÓRIA" in t or "PRECATORIA" in t:
        return "precatoria"
    return "indefinido"


def is_juri(atribuicao: str) -> bool:
    return atribuicao in ("JURI_CAMACARI", "GRUPO_JURI")


def find_pdf_autos(pasta_assistido: str | None, numero_autos: str) -> str | None:
    if not pasta_assistido:
        return None
    pasta = Path(pasta_assistido) / numero_autos
    if not pasta.exists():
        return None
    canonical = pasta / f"Autos Digitais - {numero_autos}.pdf"
    if canonical.exists():
        return str(canonical)
    pdfs = sorted(pasta.glob("*.pdf"), key=lambda p: p.stat().st_size, reverse=True)
    return str(pdfs[0]) if pdfs else None


def already_has_analise(audiencia_id: int, pauta: dict) -> dict | None:
    for a in pauta["audiencias"]:
        if a["id"] == audiencia_id:
            an = a.get("analise") or {}
            if an.get("id") and an.get("updated_at"):
                ts = an["updated_at"]
                # análise ainda fresca (< 30 dias)
                try:
                    dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                    age_days = (datetime.now(timezone.utc) - dt).days
                    if age_days < 30:
                        return an
                except Exception:
                    pass
    return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("dia")
    parser.add_argument("--force", action="store_true",
                        help="Re-planejar mesmo se já existir análise recente")
    args = parser.parse_args()

    pauta = json.loads(Path(f"/tmp/pauta-{args.dia}.json").read_text())
    pastas_path = Path(f"/tmp/pastas-{args.dia}.json")
    pastas = json.loads(pastas_path.read_text()) if pastas_path.exists() else []
    pastas_by_id = {p["id"]: p for p in pastas}

    plano = []
    for a in pauta["audiencias"]:
        if a.get("status") == "cancelada":
            plano.append({
                "audiencia_id": a["id"],
                "skip": True,
                "motivo": "cancelada",
                "assistido": a.get("assistido_nome"),
                "numero_autos": a.get("numero_autos"),
            })
            continue

        atribuicao = a.get("atribuicao") or "?"
        tipo = a.get("tipo") or ""
        classe = a.get("classe_processual") or ""

        if is_juri(atribuicao):
            subtipo = detectar_subtipo_juri(tipo, classe)
            ref = REFS_JURI.get(subtipo) or REFS_FALLBACK
            skill = "analise-juri"
        else:
            subtipo = detectar_subtipo_vvd(tipo, classe)
            ref = REFS_VVD.get(subtipo) or REFS_FALLBACK
            skill = "analise-vvd"

        skip = False
        motivo = None
        existente = None
        if not args.force:
            existente = already_has_analise(a["id"], pauta)
            if existente:
                skip = True
                motivo = f"análise recente (#{existente.get('id')}, {existente.get('updated_at', '')[:10]})"

        info_pasta = pastas_by_id.get(a["id"], {})
        pdf_autos = find_pdf_autos(info_pasta.get("pasta_assistido"), a.get("numero_autos") or "")

        plano.append({
            "audiencia_id": a["id"],
            "skip": skip,
            "motivo": motivo,
            "assistido": a.get("assistido_nome"),
            "assistido_id": a.get("assistido_id"),
            "processo_id": a.get("processo_id"),
            "numero_autos": a.get("numero_autos"),
            "atribuicao": atribuicao,
            "subtipo_audiencia": subtipo,
            "tipo_audiencia": tipo,
            "skill": skill,
            "reference": ref,
            "paleta": PALETA.get(atribuicao, "amber"),
            "pdf_autos": pdf_autos,
            "pasta_assistido": info_pasta.get("pasta_assistido"),
            "pasta_autos": info_pasta.get("pasta_autos"),
            "output_dir": str(Path(info_pasta.get("pasta_assistido", "")) / "Análises"),
            "output_basename": f"{args.dia}-{subtipo}",
            "instrucao_orchestrator": (
                f"Invocar skill `{skill}` (referência: {ref}) para o defendido "
                f"{a.get('assistido_nome')} (proc {a.get('numero_autos')}). "
                f"Subtipo de audiência: {subtipo}. Ler {pdf_autos or '<pdf não encontrado>'}, "
                f"gerar tripla saída (PDF/MD/JSON) na pasta {Path(info_pasta.get('pasta_assistido', '')) / 'Análises'}. "
                "Depois popular `audiencias.registro_audiencia` e `audiencias.resumo_defesa` "
                "(via 07_popular_ombuds.ts) com o JSON estruturado contendo painel de depoentes, "
                "imputação, tese, pontos críticos, perguntas estratégicas e orientação ao defendido."
            ),
        })

    out_path = Path(f"/tmp/plano-analises-{args.dia}.json")
    out_path.write_text(json.dumps(plano, indent=2, ensure_ascii=False))

    print(f"\n=== Plano de análises {args.dia} → {out_path} ===\n")
    for p in plano:
        if p["skip"]:
            print(f"  [skip] #{p['audiencia_id']} {p['assistido']} — {p['motivo']}")
            continue
        print(f"  [todo] #{p['audiencia_id']} {p['assistido']}")
        print(f"     subtipo: {p['subtipo_audiencia']}  ·  skill: {p['skill']}  ·  ref: {p['reference']}")
        print(f"     pdf:     {p['pdf_autos'] or '<falta scraping>'}")
        print(f"     output:  {p['output_dir']}/")

    todos = [p for p in plano if not p["skip"]]
    print(f"\n  total: {len(todos)} análises a gerar (de {len(plano)} audiências)")


if __name__ == "__main__":
    main()
