#!/usr/bin/env python3
"""analise_profunda_autos.py — worker BROWSER da Fase 2c.

Dado um demandaId: baixa os autos do PJe (reusa baixar_pdf_autos), organiza no
Drive (distribuir-autos) e enfileira a task lane=ai `analise-autos` (o caminho do
coworkAnalise), embutindo o demandaId. Atualiza demandas.analise_profunda_status.
Roda no daemon do defensor (CDP :9222). Só as funções puras abaixo são unit-testadas.
"""
import argparse, json, os, sys


def parse_args_meta(argv: list[str]) -> dict:
    p = argparse.ArgumentParser()
    p.add_argument("--demanda-id", type=int, required=True)
    p.add_argument("--processo-id", type=int, required=True)
    p.add_argument("--assistido-id", type=int, required=True)
    p.add_argument("--atribuicao", default="")
    p.add_argument("--defensor-id", type=int, default=1)
    a = p.parse_args(argv)
    return {
        "demanda_id": a.demanda_id, "processo_id": a.processo_id,
        "assistido_id": a.assistido_id, "atribuicao": a.atribuicao,
        "defensor_id": a.defensor_id,
    }


def build_analise_autos_task(row: dict, demanda_id: int, created_by: int) -> dict:
    """Values da task lane=ai `analise-autos` (mesmo caminho do coworkAnalise),
    com demandaId embutido p/ o fechamento de estado ser derivável na leitura."""
    return {
        "assistido_id": row["assistido_id"],
        "processo_id": row["processo_id"],
        "skill": "analise-autos",
        "lane": "ai",
        "prompt": f"Análise profunda dos autos — demanda {demanda_id}",
        "instrucao_adicional": json.dumps({"demandaId": demanda_id, "fonte": "fase2c"}),
        "status": "pending",
        "created_by": created_by,
    }


def autos_pdf_no_drive_path(assistido_nome: str, cnj: str) -> str:
    """Caminho determinístico do PDF dos autos na pasta do assistido (resume-safe)."""
    safe = "".join(c for c in assistido_nome if c.isalnum() or c in " -_").strip()
    return f"{safe}/Autos/autos-{cnj}.pdf"
