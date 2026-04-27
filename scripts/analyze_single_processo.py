#!/usr/bin/env python3
"""
Análise one-off de um processo (sem necessidade de audiência).
Usa o mesmo prompt e fluxo do batch_vvd_audiencia.py.

Uso:
  python3 scripts/analyze_single_processo.py --processo-id 429 --pdf "Autos - 8009078-70.2025..."
"""
import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from batch_vvd_audiencia import (
    ENV, SUPABASE_URL, CLAUDE_MODEL, log,
    call_anthropic_with_pdf, parse_json_from_response,
    drive_create_or_update_file, get_access_token,
    supabase_update, supabase_insert, _hidratar_depoentes,
)
import httpx


def fetch_processo(pid: int) -> dict:
    r = httpx.get(
        f"{SUPABASE_URL}/rest/v1/processos?id=eq.{pid}&select=id,numero_autos,drive_folder_id,assistido_id,analysis_data,atribuicao,assistidos(nome)",
        headers={"apikey": ENV["SUPABASE_SERVICE_ROLE_KEY"], "Authorization": f"Bearer {ENV['SUPABASE_SERVICE_ROLE_KEY']}"},
        timeout=15,
    )
    r.raise_for_status()
    rows = r.json()
    return rows[0] if rows else {}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--processo-id", type=int, required=True)
    parser.add_argument("--pdf", required=True, help="Absolute PDF path")
    parser.add_argument("--tipo-audiencia", default="Audiência de Instrução e Julgamento")
    parser.add_argument("--data-audiencia", default=datetime.now().strftime("%Y-%m-%d"))
    parser.add_argument("--horario", default="")
    args = parser.parse_args()

    pdf = Path(args.pdf)
    if not pdf.exists():
        log.error("PDF not found: %s", pdf)
        return 1

    proc = fetch_processo(args.processo_id)
    if not proc:
        log.error("Processo %d not found", args.processo_id)
        return 1

    nome = (proc.get("assistidos") or {}).get("nome") or "Desconhecido"
    numero = proc["numero_autos"]
    folder_id = proc.get("drive_folder_id")

    log.info("=" * 60)
    log.info("One-off: %s | %s | %.1fMB", numero, nome, pdf.stat().st_size / 1024 / 1024)

    report_text = call_anthropic_with_pdf(pdf, nome, numero, args.tipo_audiencia, args.data_audiencia, args.horario)
    metadata = parse_json_from_response(report_text)
    log.info("  Metadata: tipo=%s, tese=%s", metadata.get("tipo_processo", "?"), (metadata.get("tese_principal") or "")[:60])

    pdf_dir = pdf.parent
    date_slug = datetime.now().strftime("%Y-%m-%d")
    local_report = pdf_dir / f"_analise_vvd_{date_slug}_{numero.replace('.', '-')}.md"
    local_report.write_text(report_text, encoding="utf-8")

    analysis_data = {
        "schema_version": 2,
        "tipo": "vvd",
        "assistido": nome,
        "processo": numero,
        "audiencia_data": args.data_audiencia,
        "audiencia_horario": args.horario,
        "audiencia_tipo": args.tipo_audiencia,
        "analyzed_at": datetime.now().isoformat(),
        "source": "analyze_single_processo",
        "model": CLAUDE_MODEL,
        **metadata,
    }
    local_json = pdf_dir / f"_analise_ia_{date_slug}_{numero.replace('.', '-')}.json"
    local_json.write_text(json.dumps(analysis_data, ensure_ascii=False, indent=2), encoding="utf-8")
    log.info("  Saved: %s + %s", local_report.name, local_json.name)

    if folder_id:
        token = get_access_token()
        drive_create_or_update_file(folder_id, f"_analise_vvd_{date_slug}.md", report_text, "text/markdown", token)
        drive_create_or_update_file(folder_id, f"_analise_ia_{date_slug}.json", json.dumps(analysis_data, ensure_ascii=False, indent=2), "application/json", token)
        log.info("  Drive uploaded")

    # Update processos.analysis_data (promove chaves ricas ao topo)
    existing_ad = proc.get("analysis_data") or {}
    if isinstance(existing_ad, str):
        existing_ad = json.loads(existing_ad)
    rich_keys = (
        "resumo_executivo", "narrativa_denuncia", "imputacao",
        "crimes_imputados", "tipo_processo", "medidas_protetivas_vigentes",
        "versao_delegacia", "laudos", "vulnerabilidades_acusacao",
        "testemunhas_acusacao", "testemunhas_defesa",
        "contradicoes", "pendencias_diligencia_pre_aij",
        "teses_defesa", "tese_principal", "viabilidade_tese_principal",
        "teses_subsidiarias", "riscos_principais", "urgencias", "prescricao",
        "dinamica_relacional", "historico_violencia",
    )
    for k in rich_keys:
        if k in metadata and metadata[k] not in (None, "", []):
            existing_ad[k] = metadata[k]
    existing_ad["vvd_analise_audiencia"] = analysis_data
    existing_ad["vvd_analyzed_at"] = datetime.now().isoformat()

    supabase_update("processos", args.processo_id, {
        "analysis_data": existing_ad,
        "analysis_status": "completed",
        "analyzed_at": datetime.now().isoformat(),
    })
    log.info("  OMBUDS: processos %d updated", args.processo_id)

    # analises_cowork
    supabase_insert("analises_cowork", {
        "processo_id": args.processo_id,
        "assistido_id": proc.get("assistido_id"),
        "tipo": "vvd_analise_audiencia",
        "schema_version": 2,
        "resumo_fato": (metadata.get("historico_violencia") or "")[:2000],
        "tese_defesa": (metadata.get("tese_principal") or "")[:2000],
        "estrategia_atual": json.dumps(metadata.get("teses_subsidiarias") or [], ensure_ascii=False)[:2000],
        "crime_principal": ", ".join(metadata.get("crimes_imputados") or [])[:500],
        "pontos_criticos": json.dumps(metadata.get("riscos_principais") or [], ensure_ascii=False)[:2000],
        "payload": json.dumps(analysis_data, ensure_ascii=False),
        "fonte_arquivo": f"analyze_single_processo/{CLAUDE_MODEL}",
        "created_at": datetime.now().isoformat(),
    })
    log.info("  OMBUDS: analises_cowork inserted")
    log.info("DONE")
    return 0


if __name__ == "__main__":
    sys.exit(main())
