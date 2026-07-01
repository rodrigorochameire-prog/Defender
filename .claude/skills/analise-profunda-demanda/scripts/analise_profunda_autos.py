#!/usr/bin/env python3
"""analise_profunda_autos.py — worker BROWSER da Fase 2c.

Dado um demandaId: baixa os autos do PJe (reusa baixar_pdf_autos), organiza no
Drive (distribuir-autos) e enfileira a task lane=ai `analise-autos` (o caminho do
coworkAnalise), embutindo o demandaId. Atualiza demandas.analise_profunda_status.
Roda no daemon do defensor (CDP :9222). Só as funções puras abaixo são unit-testadas.

O fluxo CDP (main_async/main) NÃO tem unit test — depende de um Chromium logado
com --remote-debugging-port=9222 e de um processo real no PJe. Sua validação é
a etapa de aceite ao vivo (ver task-5-report.md). O gate aqui é estrutural:
test_worker_structure.py + `--help` sem erro de import.
"""
import argparse, asyncio, json, shutil, subprocess, sys
from pathlib import Path


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


# ───── Fluxo CDP (browser-broker-daemon) ──────────────────────────────────────
#
# Reuso do varredura-triagem: conexão Supabase REST (Supabase, load_env),
# navegação do painel (_ensure_logged_in, navigate_to_unidade, find_in_panel) e a
# primitiva de download (baixar_pdf_autos). Nomes REAIS confirmados por grep em
# varredura_triagem.py — NÃO existem `abrir_cdp`/`resolver_link_autos`/
# `distribuir_autos_para_assistido`/`Supabase.insert_claude_code_task` (eram
# placeholders do brief); ver task-5-report.md §symbol-map.
_VT = Path(__file__).resolve().parents[2] / "varredura-triagem" / "scripts"
sys.path.insert(0, str(_VT))
import varredura_triagem as vt  # noqa: E402

# distribuir-autos vive FORA do repo (skill pessoal, ~/.claude/skills) — é o
# script real que casa CNJ→pasta do assistido no Drive. Best-effort: se ele não
# existir na máquina (ex.: CI), a distribuição falha isolada e o estado vira
# 'erro' sem tocar em nada no disco.
_DISTRIBUIR_SCRIPT = (
    Path.home() / ".claude" / "skills" / "distribuir-autos" / "scripts" / "distribuir_autos.py"
)
# Mesma pasta-inbox que distribuir_autos.py::INBOX (BASE/"2 - Distribuição").
# Duplicado aqui de propósito (evita importar aquele módulo — que faz
# `import psycopg2` e conecta ao Postgres no import — só para ler uma constante
# de path). Mantenha em sincronia se o inbox mudar de lugar.
_DISTRIBUIR_INBOX = (
    Path.home() / "Library" / "CloudStorage"
    / "GoogleDrive-rodrigorochameire@gmail.com" / "Meu Drive"
    / "1 - Defensoria 9ª DP" / "2 - Distribuição"
)


def insert_claude_code_task(sb: "vt.Supabase", task: dict) -> int | None:
    """POST /rest/v1/claude_code_tasks com um payload JÁ montado (o de
    build_analise_autos_task). Não existe um `Supabase.insert_claude_code_task`
    no varredura_triagem.py — o mais próximo é `enqueue_ai_task`, que monta seu
    próprio dict (skill/demanda_ids) e não serve para o nosso payload por-linha
    (assistido_id/processo_id/skill/lane/prompt/instrucao_adicional/status/
    created_by). Mesmo padrão de headers/url de Supabase.insert_registro."""
    import urllib.request, urllib.error

    headers = dict(sb.headers)
    headers["Prefer"] = "return=representation"
    data = json.dumps(task).encode()
    req = urllib.request.Request(
        f"{sb.url}/rest/v1/claude_code_tasks", data=data, headers=headers, method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            txt = r.read().decode()
            rows = json.loads(txt) if txt else []
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"POST claude_code_tasks → {e.code}: {e.read().decode()[:300]}")
    return rows[0]["id"] if isinstance(rows, list) and rows else None


def _distribuir_para_assistido(pdf_path: str, cnj: str) -> dict:
    """Copia o PDF baixado (em /tmp) para o inbox do distribuir-autos, nomeado
    pelo CNJ (casa com o regex CNJ_RE daquele script), e roda o script (mesmo
    Python do worker — já tem psycopg2, ver task-5-report.md) para movê-lo à
    pasta do assistido no Drive. Não apaga nada em caso de falha — o PDF fica
    parado no inbox (mesmo comportamento do watcher normal)."""
    if not _DISTRIBUIR_SCRIPT.exists():
        raise RuntimeError(f"distribuir_autos.py não encontrado em {_DISTRIBUIR_SCRIPT}")
    _DISTRIBUIR_INBOX.mkdir(parents=True, exist_ok=True)
    dest = _DISTRIBUIR_INBOX / f"{cnj}.pdf"
    shutil.copy2(pdf_path, dest)
    r = subprocess.run(
        [sys.executable, str(_DISTRIBUIR_SCRIPT), "--apply", "--create-folders", "--quiet"],
        capture_output=True, text=True, timeout=90,
    )
    if r.returncode != 0:
        raise RuntimeError(
            f"distribuir_autos.py saiu com código {r.returncode}: "
            f"{(r.stderr or r.stdout or '')[:200]}"
        )
    # Sucesso (código 0) normalmente MOVE o arquivo para fora do inbox. Se ele
    # ainda estiver lá, o CNJ não bateu com o regex do script (falha parcial
    # silenciosa) — a análise não pode seguir como se os autos tivessem sido
    # distribuídos.
    if dest.exists():
        raise RuntimeError(f"autos não distribuídos (arquivo ainda no inbox: {dest})")
    return {"invoked": True, "inbox_file": str(dest)}


async def main_async(meta: dict) -> dict:
    """Baixa autos → Drive → enfileira análise ai → estado. Retorna dict de
    resultado (o daemon captura o último objeto JSON impresso em stdout)."""
    demanda_id = meta["demanda_id"]

    env = vt.load_env()
    sb_url = env.get("NEXT_PUBLIC_SUPABASE_URL")
    sb_key = env.get("SUPABASE_SERVICE_ROLE_KEY")
    if not sb_url or not sb_key:
        return {"ok": False, "erro": "NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ausentes"}
    sb = vt.Supabase(sb_url, sb_key)  # Supabase(url, key) — não é singleton do vt

    # 1. resolve demanda→processo→CNJ+assistido (mesmo shape usado pelo varredura
    # via list_demandas_by_ids/build_by_ids_params).
    rows = sb.list_demandas_by_ids([demanda_id])
    if not rows:
        sb.update_demanda(demanda_id, {"analise_profunda_status": "erro"})
        return {"ok": False, "erro": "demanda não encontrada"}
    row = rows[0]
    processo = row.get("processos") or {}
    cnj = processo.get("numero_autos")
    assistido_nome = (row.get("assistidos") or {}).get("nome") or "?"
    atribuicao = meta.get("atribuicao") or processo.get("atribuicao")
    if not cnj:
        sb.update_demanda(demanda_id, {"analise_profunda_status": "erro"})
        return {"ok": False, "erro": "processo sem numero_autos"}

    # resume-safe: se uma rodada anterior já deixou a demanda 'analisando'/
    # 'concluida', não repete download nem reenfileira a task ai.
    status_atual = sb._req(
        "GET", f"/rest/v1/demandas?id=eq.{demanda_id}&select=analise_profunda_status"
    )
    status_atual = (status_atual[0].get("analise_profunda_status") if status_atual else None)
    if status_atual in ("analisando", "concluida"):
        return {"ok": True, "skipped": True, "status": status_atual, "cnj": cnj}

    sb.update_demanda(demanda_id, {"analise_profunda_status": "baixando_autos"})

    try:
        if vt.async_playwright is None:
            raise RuntimeError("patchright não instalado — ative .venv do enrichment-engine")

        async with vt.async_playwright() as p:
            # Conexão CDP inline — mesmo padrão de varredura() (não há um
            # `abrir_cdp()` isolado no varredura_triagem.py).
            browser = await p.chromium.connect_over_cdp(vt.CDP_URL)
            ctx = browser.contexts[0]
            page = await vt._ensure_logged_in(ctx)

            if atribuicao:
                try:
                    await page.goto(vt.PANEL_URL, wait_until="domcontentloaded", timeout=30000)
                    await asyncio.sleep(2)
                    await vt.navigate_to_unidade(page, atribuicao)
                except Exception as e:  # noqa: BLE001
                    # segue mesmo assim: find_in_panel pode falhar se o painel
                    # não navegou até a vara certa — vira "expediente não
                    # encontrado" abaixo, que é reportável e re-disparável.
                    vt.log(f"  ⚠ navegação do painel falhou: {str(e)[:120]}")

            # 2. resolve o link de autos completos do processo (find_in_panel —
            # busca por doc_id e, na falta, por número do processo) e baixa
            # (baixar_pdf_autos reaplica a trava anti-ciência).
            doc_id = row.get("pje_documento_id") or (row.get("enrichment_data") or {}).get(
                "id_documento_pje"
            )
            doc_id = str(doc_id) if doc_id else None
            autos_url = await vt.find_in_panel(page, doc_id, cnj)
            if not autos_url:
                sb.update_demanda(demanda_id, {"analise_profunda_status": "erro"})
                return {"ok": False, "erro": "expediente não encontrado no painel PJe"}

            pdf_path = await vt.baixar_pdf_autos(ctx, autos_url)
            if not pdf_path:
                sb.update_demanda(demanda_id, {"analise_profunda_status": "erro"})
                return {"ok": False, "erro": "autos não baixados (sigilo/sem link)"}

        # 3. organiza no Drive (distribuir-autos por CNJ → <assistido>/Autos/).
        distribuido = _distribuir_para_assistido(pdf_path, cnj)

        # 4. enfileira a análise (lane ai) + estado analisando.
        task = build_analise_autos_task(
            {"assistido_id": row["assistido_id"], "processo_id": row["processo_id"]},
            demanda_id=demanda_id, created_by=meta["defensor_id"],
        )
        ai_id = insert_claude_code_task(sb, task)
        sb.update_demanda(demanda_id, {
            "analise_profunda_status": "analisando",
            "analise_profunda_task_id": ai_id,
        })
        return {
            "ok": True, "cnj": cnj, "assistido": assistido_nome,
            "ai_task_id": ai_id, "distribuido": distribuido,
        }
    except Exception as e:  # noqa: BLE001
        sb.update_demanda(demanda_id, {"analise_profunda_status": "erro"})
        return {"ok": False, "erro": str(e)[:200]}


def main():
    meta = parse_args_meta(sys.argv[1:])
    result = asyncio.run(main_async(meta))
    # O daemon captura o último objeto JSON do stdout em resultado.
    print(json.dumps(result, ensure_ascii=False))
    sys.exit(0 if result.get("ok") else 1)


if __name__ == "__main__":
    main()
