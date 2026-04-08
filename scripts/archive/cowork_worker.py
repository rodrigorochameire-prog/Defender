#!/usr/bin/env python3
"""
COWORK WORKER — Daemon local que processa tarefas do OMBUDS via claude -p ($0).

Fluxo:
  1. Polls Supabase por cowork_tasks com status='pending'
  2. Para cada tarefa: roda claude -p com a skill do júri
  3. Grava resultado no banco (resultado_json, resultado_md, tese_defesa)
  4. Importa dados no banco (processos.analysis_data, testemunhas, etc.)

Uso:
  python3 scripts/cowork_worker.py              # Roda uma vez
  python3 scripts/cowork_worker.py --daemon      # Loop contínuo (poll a cada 30s)
  python3 scripts/cowork_worker.py --daemon &    # Background
"""

import argparse
import json
import logging
import os
import re
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

import httpx

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger("cowork-worker")

SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent
JURI_FOLDER = Path.home() / "Meu Drive" / "1 - Defensoria 9ª DP" / "Processos - Júri"
SKILL_CACHE_DIR = SCRIPT_DIR / ".skill_cache"
SKILLS_CONFIG = SCRIPT_DIR / "cowork_skills.json"
SKILLS_DIR = Path.home() / "Meu Drive" / "1 - Defensoria 9ª DP" / "Inteligencia artificial" / "Skills Atualizadas"

def load_env():
    env = {}
    with open(PROJECT_DIR / ".env.local") as f:
        for line in f:
            line = line.strip()
            if "=" in line and not line.startswith("#"):
                k, _, v = line.partition("=")
                env[k.strip()] = v.strip().strip('"')
    return env

ENV = load_env()
SUPABASE_URL = ENV["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_KEY = ENV["SUPABASE_SERVICE_ROLE_KEY"]
HEADERS = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}", "Content-Type": "application/json"}


def load_skills_config():
    """Carrega configuração de skills."""
    with open(SKILLS_CONFIG) as f:
        return json.load(f)


def extract_skill_prompt(skill_name: str) -> str:
    """Extrai o prompt de uma .skill file (zip com SKILL.md + references)."""
    SKILL_CACHE_DIR.mkdir(exist_ok=True)
    cache_file = SKILL_CACHE_DIR / f"{skill_name}.md"

    skill_file = SKILLS_DIR / f"{skill_name}.skill"
    if not skill_file.exists():
        raise FileNotFoundError(f"Skill não encontrada: {skill_file}")

    # Usar cache se skill não mudou
    if cache_file.exists() and cache_file.stat().st_mtime >= skill_file.stat().st_mtime:
        return cache_file.read_text()

    log.info("  📦 Extraindo skill: %s", skill_name)
    import zipfile
    parts = []
    with zipfile.ZipFile(skill_file, "r") as z:
        # Encontrar SKILL.md (pode estar em skill_src/ ou skill_src/<name>/)
        for name in z.namelist():
            if name.endswith("SKILL.md") and not name.endswith(".bak"):
                with z.open(name) as f:
                    parts.append(f.read().decode("utf-8"))
            elif "/references/" in name and name.endswith(".md") and not name.endswith(".bak"):
                with z.open(name) as f:
                    content = f.read().decode("utf-8")
                    if len(content) > 100:
                        parts.append(content)

    prompt = "\n\n---\n\n".join(parts)
    cache_file.write_text(prompt)
    log.info("  ✅ Skill extraída: %d chars", len(prompt))
    return prompt


def get_skill_prompt_for_task(tipo: str) -> str:
    """Retorna o prompt combinado das skills para um tipo de tarefa."""
    config = load_skills_config()

    # Mapear tipo da tarefa → funcionalidade
    func_map = {
        "juri": "relatorio_juri",
        "audiencia": "preparar_audiencia",
        "criminal": "analise_criminal",
        "vvd": "analise_vvd",
        "execucao_penal": "analise_ep",
        "peca": "gerar_peca",
        "briefing": "briefing_completo",
    }

    func_name = func_map.get(tipo, "relatorio_juri")
    func = config["funcionalidades"].get(func_name)
    if not func:
        func = config["funcionalidades"]["relatorio_juri"]

    # Carregar e combinar prompts das skills
    skill_names = func["skills"]
    prompts = []
    for sn in skill_names:
        skill_info = config["skills"].get(sn)
        if skill_info:
            try:
                prompt = extract_skill_prompt(sn)
                prompts.append(prompt)
            except Exception as e:
                log.warning("  ⚠️ Skill '%s' falhou: %s", sn, e)

    if not prompts:
        raise RuntimeError(f"Nenhuma skill carregada para tipo '{tipo}'")

    combined = "\n\n===== SKILL ADICIONAL =====\n\n".join(prompts)
    log.info("  📚 Skills carregadas: %s (%d chars)", ", ".join(skill_names), len(combined))
    return combined


def get_pending_tasks():
    """Busca tarefas pendentes."""
    resp = httpx.get(
        f"{SUPABASE_URL}/rest/v1/cowork_tasks",
        headers=HEADERS,
        params={"status": "eq.pending", "order": "created_at.asc", "limit": "5"},
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()


def update_task(task_id, data):
    """Atualiza tarefa no banco."""
    resp = httpx.patch(
        f"{SUPABASE_URL}/rest/v1/cowork_tasks?id=eq.{task_id}",
        headers={**HEADERS, "Prefer": "return=minimal"},
        json=data,
        timeout=15,
    )
    return resp.status_code in (200, 204)


def get_assistido_docs(assistido_nome):
    """Busca documentos .md/.txt da pasta local do assistido no Drive."""
    pasta = None
    if (JURI_FOLDER / assistido_nome).is_dir():
        pasta = JURI_FOLDER / assistido_nome
    else:
        for d in JURI_FOLDER.iterdir():
            if d.is_dir() and assistido_nome.lower() in d.name.lower():
                pasta = d
                break
    if not pasta:
        return ""

    docs = []
    for f in sorted(pasta.glob("**/*.md")) + sorted(pasta.glob("**/*.txt")):
        fname = f.name
        if fname.startswith("_"):
            continue
        try:
            content = f.read_text(errors="replace")
            if len(content.strip()) > 50:
                docs.append(f"## Documento: {f.relative_to(pasta)}\n\n{content}")
        except Exception:
            pass
    return "\n\n---\n\n".join(docs)


def run_claude_p(system_prompt, user_prompt):
    """Executa claude -p e retorna resultado."""
    proc = subprocess.run(
        ["claude", "-p", "--system-prompt", system_prompt, "--output-format", "text", "--allowedTools", ""],
        input=user_prompt,
        capture_output=True,
        text=True,
        timeout=600,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"claude -p falhou: {proc.stderr[:300]}")
    return proc.stdout


def extract_json(text):
    """Extrai JSON do resultado."""
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    raw = match.group(1) if match else text
    if not match:
        bs = raw.find("{")
        be = raw.rfind("}")
        if bs >= 0 and be > bs:
            raw = raw[bs:be + 1]
    cleaned = raw.strip()
    cleaned = re.sub(r",\s*}", "}", cleaned)
    cleaned = re.sub(r",\s*]", "]", cleaned)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        pos = e.pos if hasattr(e, "pos") else len(cleaned) // 2
        partial = cleaned[:pos].rstrip(", \n\t")
        ob = partial.count("{") - partial.count("}")
        oq = partial.count("[") - partial.count("]")
        partial += "]" * oq + "}" * ob
        return json.loads(partial)


def import_to_db(analise, assistido_id, processo_id):
    """Importa resultado no banco."""
    updated = []

    # analises_cowork
    try:
        resp = httpx.post(f"{SUPABASE_URL}/rest/v1/analises_cowork", headers={**HEADERS, "Prefer": "return=minimal"}, json={
            "assistido_id": assistido_id,
            "processo_id": processo_id,
            "tipo": analise.get("tipo", "juri"),
            "schema_version": analise.get("schema_version", "1.0"),
            "resumo_fato": analise.get("resumo_fato"),
            "tese_defesa": analise.get("tese_defesa"),
            "estrategia_atual": analise.get("estrategia_atual"),
            "crime_principal": analise.get("crime_principal"),
            "pontos_criticos": analise.get("pontos_criticos", []),
            "payload": analise.get("payload", {}),
            "fonte_arquivo": "cowork_worker",
        }, timeout=15)
        if resp.status_code in (200, 201):
            updated.append("analises_cowork")
    except Exception as e:
        log.warning("  analises_cowork: %s", e)

    # processos.analysis_data
    if processo_id:
        payload = analise.get("payload", {})
        data = {
            "resumo": analise.get("resumo_fato", ""),
            "teses": [analise["tese_defesa"]] if analise.get("tese_defesa") else [],
            "estrategia": analise.get("estrategia_atual", ""),
            "crimePrincipal": analise.get("crime_principal", ""),
            "pontosCriticos": analise.get("pontos_criticos", []),
            "fonte": "cowork",
            "perspectivaPlenaria": payload.get("perspectiva_plenaria", ""),
            "quesitoscriticos": payload.get("quesitos_criticos", []),
            "orientacaoAssistido": payload.get("orientacao_ao_assistido", ""),
        }
        resp = httpx.patch(f"{SUPABASE_URL}/rest/v1/processos?id=eq.{processo_id}",
            headers={**HEADERS, "Prefer": "return=minimal"},
            json={"analysis_data": json.dumps(data, ensure_ascii=False), "analysis_status": "completed"},
            timeout=15)
        if resp.status_code in (200, 204):
            updated.append("processos.analysis_data")

    # testemunhas
    perguntas = analise.get("payload", {}).get("perguntas_por_testemunha", [])
    if perguntas and processo_id:
        resp = httpx.get(f"{SUPABASE_URL}/rest/v1/testemunhas",
            headers=HEADERS, params={"select": "id,nome", "processo_id": f"eq.{processo_id}"}, timeout=10)
        if resp.status_code == 200:
            t_map = {t["nome"].lower(): t["id"] for t in resp.json()}
            count = 0
            for item in perguntas:
                tid = t_map.get(item.get("nome", "").lower())
                if tid:
                    httpx.patch(f"{SUPABASE_URL}/rest/v1/testemunhas?id=eq.{tid}",
                        headers={**HEADERS, "Prefer": "return=minimal"},
                        json={"perguntas_sugeridas": json.dumps(item.get("perguntas", []), ensure_ascii=False)},
                        timeout=10)
                    count += 1
            if count:
                updated.append(f"testemunhas[{count}]")

    return updated


JSON_SCHEMA_PROMPT = """
Retorne TAMBÉM um bloco JSON com EXATAMENTE este schema:

```json
{
  "schema_version": "1.0",
  "tipo": "juri",
  "gerado_em": "ISO 8601",
  "assistido": "nome",
  "processo": "número",
  "resumo_fato": "síntese factual 3-5 frases",
  "tese_defesa": "tese principal",
  "estrategia_atual": "estratégia recomendada",
  "crime_principal": "tipo penal",
  "pontos_criticos": ["ponto 1"],
  "payload": {
    "perguntas_por_testemunha": [{"nome": "Nome", "tipo": "ACUSACAO|DEFESA", "perguntas": ["p1"]}],
    "contradicoes": [{"testemunha": "Nome", "delegacia": "versão", "juizo": "versão", "contradicao": "desc"}],
    "orientacao_ao_assistido": "orientação",
    "perspectiva_plenaria": "estratégia plenário",
    "quesitos_criticos": ["quesito 1"]
  }
}
```
"""


def process_task(task):
    """Processa uma tarefa."""
    task_id = task["id"]
    assistido_id = task["assistido_id"]
    processo_id = task.get("processo_id")
    briefing = task.get("briefing", "")
    tipo = task.get("tipo", "juri")

    # Buscar nome do assistido
    resp = httpx.get(f"{SUPABASE_URL}/rest/v1/assistidos",
        headers=HEADERS, params={"select": "nome", "id": f"eq.{assistido_id}", "limit": "1"}, timeout=10)
    assistidos_data = resp.json() if resp.status_code == 200 else []
    nome = assistidos_data[0]["nome"] if assistidos_data else f"ID-{assistido_id}"

    log.info("━━━ Tarefa #%d: %s ━━━", task_id, nome)

    # Marcar como processing
    update_task(task_id, {"status": "processing", "started_at": datetime.now().isoformat()})

    try:
        # Carregar skills para o tipo da tarefa
        skill_prompt = get_skill_prompt_for_task(tipo)

        # Buscar docs do Drive local
        docs = get_assistido_docs(nome)
        full_content = briefing
        if docs:
            full_content += "\n\n---\n\n## Documentos do Processo\n\n" + docs
            log.info("  📄 %d chars do Drive local", len(docs))

        if len(full_content) > 120000:
            full_content = full_content[:120000] + "\n\n[... truncado ...]"

        # Etapa 1: Relatório
        log.info("  📄 Gerando relatório (claude -p)...")
        report_prompt = f"Analise os autos para o Tribunal do Júri.\n\nASSISTIDO: {nome}\n\n{full_content}"
        report = run_claude_p(skill_prompt, report_prompt)
        if not report or len(report.strip()) < 50:
            raise RuntimeError(f"Relatório vazio ou muito curto ({len(report or '')} chars)")
        log.info("  ✅ Relatório: %d chars", len(report))

        # Etapa 2: JSON
        log.info("  📋 Gerando _analise_ia.json (claude -p)...")
        json_prompt = f"Com base no relatório, extraia dados no formato JSON.\n\nRELATÓRIO:\n{report[:80000]}\n\n{JSON_SCHEMA_PROMPT}"
        json_text = run_claude_p(
            "Você é extrator de dados jurídicos. Retorne APENAS JSON válido.",
            json_prompt,
        )
        if not json_text or len(json_text.strip()) < 10:
            raise RuntimeError(f"JSON vazio ({len(json_text or '')} chars)")
        analise = extract_json(json_text)

        # Garantir campos mínimos
        analise.setdefault("schema_version", "1.0")
        analise.setdefault("tipo", "juri")
        analise.setdefault("pontos_criticos", [])
        analise.setdefault("payload", {})

        tese = analise.get("tese_defesa", "N/A")
        log.info("  🎯 Tese: %s", tese[:80])

        # Importar no banco
        updated = import_to_db(analise, assistido_id, processo_id)
        log.info("  📊 Campos: %s", ", ".join(updated))

        # Salvar no Drive local
        pasta = None
        if (JURI_FOLDER / nome).is_dir():
            pasta = JURI_FOLDER / nome
        if pasta:
            date_slug = datetime.now().strftime("%Y-%m-%d")
            (pasta / f"_relatorio_juri_{date_slug}.md").write_text(report)
            (pasta / "_analise_ia.json").write_text(json.dumps(analise, ensure_ascii=False, indent=2))
            log.info("  💾 Salvo no Drive local")

        # Marcar tarefa como concluída
        update_task(task_id, {
            "status": "completed",
            "resultado_json": analise,
            "resultado_md": report[:50000],  # limitar tamanho
            "tese_defesa": tese[:500],
            "completed_at": datetime.now().isoformat(),
        })
        log.info("  ✅ Tarefa #%d concluída", task_id)

    except Exception as e:
        log.error("  ❌ Tarefa #%d falhou: %s", task_id, str(e)[:200])
        update_task(task_id, {
            "status": "failed",
            "error": str(e)[:500],
            "completed_at": datetime.now().isoformat(),
        })


def main():
    parser = argparse.ArgumentParser(description="Cowork Worker — processa tarefas via claude -p ($0)")
    parser.add_argument("--daemon", action="store_true", help="Loop contínuo (poll a cada 30s)")
    parser.add_argument("--interval", type=int, default=30, help="Intervalo de polling em segundos")
    args = parser.parse_args()

    log.info("🔧 COWORK WORKER iniciado")
    log.info("   Supabase: %s", SUPABASE_URL[:40])
    log.info("   Drive: %s", JURI_FOLDER)
    log.info("   Modo: %s", "daemon" if args.daemon else "one-shot")

    # Pré-extrair skill principal para validar
    try:
        test_prompt = get_skill_prompt_for_task("juri")
        log.info("   Skill juri: %d chars ✅", len(test_prompt))
    except Exception as e:
        log.error("   Skill juri falhou: %s", e)

    while True:
        tasks = get_pending_tasks()
        if tasks:
            log.info("📬 %d tarefas pendentes", len(tasks))
            for task in tasks:
                process_task(task)
        else:
            if not args.daemon:
                log.info("Nenhuma tarefa pendente.")
                break
            # Silêncio no daemon

        if not args.daemon:
            break

        time.sleep(args.interval)


if __name__ == "__main__":
    main()
