# Preparar Audiências Skill Enhancement Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance the `preparar-audiencias` skill with three new capabilities: (1) extract and bookmark each deponent's testimony term from IP/APF PDFs; (2) map per-deponent timestamps from the whisper.cpp transcription JSON; (3) load term links and timestamps into `testemunhas` DB rows via a new `vincular_testemunhas.mjs` script.

**Architecture:** Two Python script changes + one new JS script. Scripts run in sequence during Step 5 of `preparar-audiencias`. `transcrever_midias.py` gains a `--registro` argument and timestamp detection. `05d_vincular_termos_ip.py` is a new script. A new `scripts/pje-cdp/vincular_testemunhas.mjs` writes the enriched data directly into `testemunhas` DB rows (existing `popular_ombuds.mjs` only writes to `audiencias.registro_audiencia` — do not modify it). `pinos_sugeridos` loading is a stub until the AI analysis step (spec D3) generates them.

**Tech Stack:** Python 3.11+ (stdlib only: `pathlib`, `subprocess`, `re`, `difflib`, `json`), `pdftotext` + `pdfinfo` CLI (macOS: `brew install poppler`), `whisper-cli` (already used by `transcrever_midias.py`), PostgreSQL `jsonb` via raw `postgres` SQL in Node.js.

**Spec:** `docs/superpowers/specs/2026-06-30-deponent-card-pins-skill-design.md`

**Soft dependency:** The DB migration from Plan 1 (`2026-06-30-deponent-card-ui-backend.md`, Task 1) must be applied before Task 9 (loading into `testemunhas`).

---

## Global Constraints

- Python stdlib only — zero extra packages; `difflib.SequenceMatcher` for name matching
- Name-matching threshold: **`>= 0.65`** (per spec D1)
- `pdftotext` page extraction: `subprocess.run(["pdftotext", "-f", str(page), "-l", str(page), pdf_path, "-"], capture_output=True, text=True)` — the `-` writes to stdout
- `pdfinfo` page count: `subprocess.run(["pdfinfo", pdf_path], capture_output=True, text=True)` — parse "Pages: N" line
- whisper.cpp JSON format: `{"transcription": [{"offsets": {"from": 0, "to": 2000}, "text": "..."}]}` where `offsets.from`/`offsets.to` are **milliseconds** — divide by 1000 for seconds. The JSON is written to `<trans_dir>/<stem>.json` by the `-oj` flag
- **JSON sidecar field names** (per spec D4 — must match exactly):
  - `dep.termo_delegacia.pagina_inicio` (not `pagina`)
  - `dep.gravacao_judicial.timestamp_inicio_s` (not `depoimento_timestamp_inicio_s`)
  - `dep.gravacao_judicial.timestamp_fim_s` (not `depoimento_timestamp_fim_s`)
  - `dep.pinos_sugeridos[].timestamp_s` (snake_case — the loader converts to `timestampS` for DB)
- `vincular_testemunhas.mjs` does **direct SQL** against `testemunhas` table — NOT HTTP tRPC
- `popular_ombuds.mjs` writes only to `audiencias.registro_audiencia` — do NOT modify it
- `pinos_sugeridos` stub: the field exists in the schema but is never populated until spec D3 (AI analysis prompt) is separately implemented; the loader must handle an empty array gracefully

---

## File Map

| Status | Path | Role |
|--------|------|------|
| CREATE | `.claude/skills/preparar-audiencias/scripts/05d_vincular_termos_ip.py` | Extract + bookmark deponent term from IP/APF PDF |
| MODIFY | `.claude/skills/preparar-audiencias/scripts/transcrever_midias.py` | Add `--registro` arg + timestamp detection per deponent |
| CREATE | `.claude/skills/preparar-audiencias/scripts/pje-cdp/vincular_testemunhas.mjs` | Load term links + timestamps + pinos into `testemunhas` DB rows |
| MODIFY | `.claude/skills/preparar-audiencias/SKILL.md` | Document new Step 5d |
| MODIFY | `.claude/skills/preparar-audiencias/references/schema_registro_audiencia.md` | Document new depoentes[] fields |

---

### Task 7: `05d_vincular_termos_ip.py` — PDF term extraction + bookmarking

**Files:**
- Create: `.claude/skills/preparar-audiencias/scripts/05d_vincular_termos_ip.py`

This script receives the IP/APF PDF (already downloaded in Step 5b) and, for each deponent in `registro_audiencia.json`, finds the page where that person's testimony begins and records the Drive file ID + page number.

- [ ] **Step 1: Write a test inline (run manually)**

The test is invoked with `--test`:

```bash
python3 .claude/skills/preparar-audiencias/scripts/05d_vincular_termos_ip.py --test
```
Expected: "OK: name matching works"

- [ ] **Step 2: Implement the script**

```python
#!/usr/bin/env python3
"""
05d_vincular_termos_ip.py
Extrai o termo de depoimento em delegacia de cada depoente a partir do PDF do IP/APF.
Popula depoentes[].termo_delegacia = {drive_file_id, pagina_inicio} no registro_audiencia.json.

Inputs:
  --registro   path to registro_audiencia.json
  --pdf        path to IP/APF PDF (already downloaded)
  --file-id    Google Drive file ID of the PDF (for the link in OMBUDS)

Outputs: updates registro_audiencia.json in-place.

Dependencies: pdftotext + pdfinfo (brew install poppler)
"""
import argparse
import difflib
import json
import re
import subprocess
import sys
from pathlib import Path


SECTION_MARKERS = re.compile(
    r"TERMO DE DECLARAÇÃO|TERMO DE DEPOIMENTO|INTERROGATÓRIO|AUTO DE QUALIFICAÇÃO",
    re.IGNORECASE,
)
NAME_NOISE = re.compile(r"\b(de|da|do|dos|das|e|a|o)\b", re.IGNORECASE)


def normalize(name: str) -> str:
    return NAME_NOISE.sub("", name.lower()).strip()


def name_matches(deponent_name: str, page_text: str, threshold: float = 0.65) -> bool:
    n = normalize(deponent_name)
    for line in page_text.splitlines():
        line_norm = normalize(line)
        if not line_norm:
            continue
        ratio = difflib.SequenceMatcher(None, n, line_norm).ratio()
        if ratio >= threshold:
            return True
    return False


def extract_page(pdf_path: str, page_num: int) -> str:
    result = subprocess.run(
        ["pdftotext", "-f", str(page_num), "-l", str(page_num), pdf_path, "-"],
        capture_output=True,
        text=True,
    )
    return result.stdout


def count_pages(pdf_path: str) -> int:
    result = subprocess.run(["pdfinfo", pdf_path], capture_output=True, text=True)
    for line in result.stdout.splitlines():
        if line.startswith("Pages:"):
            return int(line.split(":")[1].strip())
    return 0


def find_term_page(pdf_path: str, deponent_name: str) -> int | None:
    n_pages = count_pages(pdf_path)
    for page_num in range(1, n_pages + 1):
        text = extract_page(pdf_path, page_num)
        if SECTION_MARKERS.search(text) and name_matches(deponent_name, text):
            return page_num
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--registro", required=True)
    ap.add_argument("--pdf", required=True)
    ap.add_argument("--file-id", required=True)
    ap.add_argument("--test", action="store_true")
    args = ap.parse_args()

    if args.test:
        ratio = difflib.SequenceMatcher(None, "maria santos", "maria dos santos").ratio()
        assert ratio >= 0.65, f"ratio too low: {ratio}"
        print("OK: name matching works")
        sys.exit(0)

    registro_path = Path(args.registro)
    registro = json.loads(registro_path.read_text())

    depoentes = registro.get("depoentes", [])
    updated = 0

    for dep in depoentes:
        nome = dep.get("nome", "")
        if not nome:
            continue
        page = find_term_page(args.pdf, nome)
        if page is not None:
            dep["termo_delegacia"] = {
                "drive_file_id": args.file_id,
                "pagina_inicio": page,          # spec field name: pagina_inicio
            }
            updated += 1
            print(f"  ✓ {nome} → pág. {page}")
        else:
            print(f"  – {nome}: termo não localizado no PDF")

    registro_path.write_text(json.dumps(registro, ensure_ascii=False, indent=2))
    print(f"\n{updated}/{len(depoentes)} depoentes vinculados ao termo do IP.")


if __name__ == "__main__":
    main()
```

- [ ] **Step 3: Run the test flag**

```bash
python3 .claude/skills/preparar-audiencias/scripts/05d_vincular_termos_ip.py --test
```
Expected: "OK: name matching works"

- [ ] **Step 4: Update `SKILL.md` Step 5 — insert 5d AFTER Step 5c (the mídias/transcrição section)**

In `.claude/skills/preparar-audiencias/SKILL.md`, find Step 5c (the mídias/transcrição block). Insert immediately after it:

```markdown
**5d. Vincular termos do IP (05d_vincular_termos_ip.py)**
Para cada depoente, busca no PDF do IP/APF a página onde o seu termo de
depoimento/declaração começa (usa `pdftotext` + correspondência de nome via
`difflib`, threshold 0.65). Popula `depoentes[].termo_delegacia = {drive_file_id, pagina_inicio}`
no registro, habilitando o botão "ver termo (IP)" no sheet do OMBUDS.

Requer: `pdftotext` e `pdfinfo` instalados (`brew install poppler`).
Se o IP/APF não existir para o processo, skipa sem erro.
```

- [ ] **Step 5: Update `schema_registro_audiencia.md` — document new fields**

Add to the `depoentes[]` field list:

```markdown
- `termo_delegacia` (object|null): `{drive_file_id: string, pagina_inicio: int}` —
  Drive file ID do IP/APF e página onde o termo do depoente começa.
  Populado por `05d_vincular_termos_ip.py`.

- `pinos_sugeridos` (array): array of `{timestamp_s: number, nota: string, categoria: string}` —
  Pinos sugeridos pela IA (stub — populado quando spec D3 for implementado).
  O loader (`vincular_testemunhas.mjs`) converte para o formato `Pino` do DB
  injetando `id` (UUID) e `fonte: "IA"`.
```

- [ ] **Step 6: Commit**

```bash
git add .claude/skills/preparar-audiencias/scripts/05d_vincular_termos_ip.py \
        .claude/skills/preparar-audiencias/SKILL.md \
        .claude/skills/preparar-audiencias/references/schema_registro_audiencia.md
git commit -m "feat(skill): 05d_vincular_termos_ip — PDF term extraction per deponent"
```

---

### Task 8: Enhance `transcrever_midias.py` — timestamp mapping per deponent

**Files:**
- Modify: `.claude/skills/preparar-audiencias/scripts/transcrever_midias.py`

Current state: the script takes a `pasta` argument, finds media files, transcribes each with whisper-cli (flags `-osrt -otxt -oj`), writing output to `<pasta>/Mídias AIJ/Transcrições/<stem>.{srt,txt,json}`. The script does NOT read `registro_audiencia.json` and does NOT read back the whisper JSON.

Changes needed: (1) add `--registro` optional argument; (2) after transcribing each file, read back `<trans_dir>/<stem>.json`; (3) detect per-deponent timestamps using `difflib` name matching; (4) write results to `registro_audiencia.json`.

- [ ] **Step 1: Read current `transcrever_midias.py` structure**

Locate:
- `main()` function signature and `argparse` setup (lines 36-42)
- The per-media loop (line 55 onwards)
- Where whisper-cli is called (line 66) — output prefix is `os.path.join(trans_dir, stem)`
- The whisper JSON file is at `<trans_dir>/<stem>.json` after the call

- [ ] **Step 2: Add `detectar_timestamps_depoentes` helper function**

Add after the imports and before `main()`:

```python
import difflib
import re as _re

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
```

- [ ] **Step 3: Add `--registro` argument to `argparse`**

In `main()`, after `ap.add_argument("--lang", ...)`, add:

```python
ap.add_argument("--registro", default=None,
                help="Path to registro_audiencia.json — enables per-deponent timestamp detection")
```

- [ ] **Step 4: Load registro if provided**

In `main()`, after `args = ap.parse_args()`, add:

```python
import json as _json

registro = None
registro_path = None
if args.registro:
    registro_path = args.registro
    registro = _json.loads(open(registro_path).read())
```

- [ ] **Step 5: Read back whisper JSON and detect timestamps after each transcription**

In the per-media loop, after the `os.unlink(wav)` line (currently line 69), add:

```python
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
```

- [ ] **Step 6: Add inline test**

At the end of the file (before `if __name__ == "__main__"`), add:

```python
def _test():
    segs = [
        {"offsets": {"from": 0, "to": 2000}, "text": "bom dia"},
        {"offsets": {"from": 2000, "to": 15000}, "text": "Maria Santos afirmou que estava em casa"},
        {"offsets": {"from": 15000, "to": 20000}, "text": "e saiu às 22h"},
        {"offsets": {"from": 30000, "to": 35000}, "text": "João Silva por sua vez disse que"},
    ]
    deps = [{"nome": "Maria Santos"}, {"nome": "João Silva"}, {"nome": "Fulano Inexistente"}]
    r = detectar_timestamps_depoentes(segs, deps)
    assert r.get("Maria Santos") == {"timestamp_inicio_s": 2, "timestamp_fim_s": 20}, r
    assert r.get("João Silva") == {"timestamp_inicio_s": 30, "timestamp_fim_s": 35}, r
    assert "Fulano Inexistente" not in r
    print("OK: timestamp detection works")
```

And in `main()`, check for `--test` before any other work:

```python
if "--test" in sys.argv:
    _test()
    sys.exit(0)
```

- [ ] **Step 7: Run the inline test**

```bash
python3 .claude/skills/preparar-audiencias/scripts/transcrever_midias.py --test
```
Expected: "OK: timestamp detection works"

- [ ] **Step 8: Commit**

```bash
git add .claude/skills/preparar-audiencias/scripts/transcrever_midias.py
git commit -m "feat(skill): transcrever_midias — detect per-deponent timestamps from whisper.cpp JSON"
```

---

### Task 9: New `vincular_testemunhas.mjs` — load term links + timestamps into `testemunhas` DB

**Files:**
- Create: `.claude/skills/preparar-audiencias/scripts/pje-cdp/vincular_testemunhas.mjs`

**Architecture:** A standalone Node.js script (using the same `postgres` client pattern as `popular_ombuds.mjs`) that reads the enriched `registro_audiencia.json` and writes directly to `testemunhas` DB rows — matched by `(audiencia_id, LOWER(TRIM(nome)))`. The existing `popular_ombuds.mjs` is NOT modified.

**Prerequisites:** DB migration from Plan 1 Task 1 must be applied (columns `termo_delegacia_drive_file_id`, `termo_delegacia_pagina`, `depoimento_timestamp_inicio_s`, `depoimento_timestamp_fim_s`, `pinos` must exist on `testemunhas`).

**Note on `pinos_sugeridos`:** The field is defined in the schema but will always be an empty array until spec D3 (AI analysis prompt generates pino suggestions) is separately implemented. The loader handles this gracefully — an empty `pinos_sugeridos` array silently skips the append step.

- [ ] **Step 1: Create `vincular_testemunhas.mjs`**

```javascript
/**
 * vincular_testemunhas.mjs
 * Popula testemunhas.termo_delegacia_drive_file_id / pagina,
 * depoimento_timestamp_inicio_s / fim_s, e pinos (JSONB append)
 * a partir do registro_audiencia enriquecido.
 *
 * Uso: node scripts/pje-cdp/vincular_testemunhas.mjs /tmp/registros-2026-06-30.json
 * Entrada: mesmo formato do popular_ombuds.mjs —
 *   [{ audiencia_id, registro_audiencia: { depoentes: [...] }, ... }]
 *
 * Requer migração 20260630_testemunhas_pins_timestamps.sql aplicada.
 * pinos_sugeridos: stub — silenciosamente no-op enquanto spec D3 não for implementado.
 */
import * as dotenv from "dotenv";
dotenv.config({ path: "/Users/rodrigorochameire/Projetos/Defender/.env.local" });
import postgres from "postgres";
import * as fs from "fs";
import { randomUUID } from "crypto";

const DRY_RUN = process.env.DRY_RUN === "1";

const sql = postgres(process.env.DATABASE_URL.replace(/^"|"$/g, ""), {
  prepare: false, connect_timeout: 20, ssl: "require",
});

const items = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));

async function appendPinos(depoenteId, pinosToAdd) {
  if (!pinosToAdd || pinosToAdd.length === 0) return 0;
  let appended = 0;
  for (const p of pinosToAdd) {
    // Convert from JSON sidecar format (timestamp_s, snake_case)
    // to DB Pino format (timestampS, camelCase) per the Pino interface
    const dbPino = {
      id: randomUUID(),
      timestampS: p.timestamp_s,        // convert snake_case → camelCase
      nota: p.nota ?? undefined,
      fonte: "IA",
      categoria: p.categoria ?? undefined,
    };
    if (DRY_RUN) {
      console.log(`    [DRY] appendPino depoenteId=${depoenteId} ts=${dbPino.timestampS}`);
      appended++;
      continue;
    }
    const result = await sql`
      UPDATE testemunhas
      SET pinos = pinos || ${JSON.stringify(dbPino)}::jsonb
      WHERE id = ${depoenteId}
        AND NOT EXISTS (
          SELECT 1 FROM jsonb_array_elements(pinos) p2
          WHERE (p2->>'timestampS')::float = ${dbPino.timestampS}
            AND p2->>'fonte' = 'IA'
        )
      RETURNING id
    `;
    if (result.length) appended++;
  }
  return appended;
}

let ok = 0, skipped = 0, notFound = 0;

for (const item of items) {
  const audienciaId = item.audiencia_id;
  const depoentes = item.registro_audiencia?.depoentes ?? [];

  for (const dep of depoentes) {
    const nome = dep.nome?.trim();
    if (!nome) continue;

    const termoDriveFileId = dep.termo_delegacia?.drive_file_id ?? null;
    const termoPagina = dep.termo_delegacia?.pagina_inicio ?? null;    // spec: pagina_inicio
    const tsInicio = dep.gravacao_judicial?.timestamp_inicio_s ?? null; // spec: timestamp_inicio_s
    const tsFim = dep.gravacao_judicial?.timestamp_fim_s ?? null;       // spec: timestamp_fim_s
    const pinosSugeridos = dep.pinos_sugeridos ?? [];                   // stub: usually []

    // Nothing to write — skip
    if (!termoDriveFileId && tsInicio === null && pinosSugeridos.length === 0) {
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`[DRY] audiencia=${audienciaId} nome="${nome}" termo=${termoDriveFileId} pg=${termoPagina} ts=${tsInicio}→${tsFim}`);
      ok++;
      continue;
    }

    // Find testemunha row by audiencia_id + name match
    const rows = await sql`
      SELECT id FROM testemunhas
      WHERE audiencia_id = ${audienciaId}
        AND LOWER(TRIM(nome)) = LOWER(TRIM(${nome}))
      LIMIT 1
    `;
    if (!rows.length) {
      console.warn(`  ⚠ não encontrado: audiencia=${audienciaId} nome="${nome}"`);
      notFound++;
      continue;
    }
    const depoenteId = rows[0].id;

    // Update new columns — COALESCE so null values don't overwrite existing data
    await sql`
      UPDATE testemunhas
      SET
        termo_delegacia_drive_file_id = COALESCE(${termoDriveFileId}, termo_delegacia_drive_file_id),
        termo_delegacia_pagina        = COALESCE(${termoPagina},      termo_delegacia_pagina),
        depoimento_timestamp_inicio_s = COALESCE(${tsInicio},         depoimento_timestamp_inicio_s),
        depoimento_timestamp_fim_s    = COALESCE(${tsFim},            depoimento_timestamp_fim_s),
        updated_at = NOW()
      WHERE id = ${depoenteId}
    `;

    const pinosAppended = await appendPinos(depoenteId, pinosSugeridos);
    console.log(`  ✓ ${nome} (id=${depoenteId}) → termo=${termoDriveFileId ?? "—"} pg=${termoPagina ?? "—"} ts=${tsInicio ?? "—"}s pinos+=${pinosAppended}`);
    ok++;
  }
}

console.log(`\nResumo: ${ok} ok, ${skipped} sem dados (skip), ${notFound} testemunha não encontrada`);
if (DRY_RUN) console.log("(DRY RUN — nada foi escrito no banco)");
await sql.end();
```

- [ ] **Step 2: Dry-run test with a minimal JSON fixture**

Create a fixture file:

```bash
cat > /tmp/test_vincular.json << 'EOF'
[{
  "audiencia_id": 1,
  "registro_audiencia": {
    "depoentes": [{
      "nome": "Maria Teste",
      "termo_delegacia": {"drive_file_id": "1abc123", "pagina_inicio": 12},
      "gravacao_judicial": {"timestamp_inicio_s": 120, "timestamp_fim_s": 480},
      "pinos_sugeridos": []
    }]
  }
}]
EOF
```

Run dry-run:

```bash
DRY_RUN=1 node .claude/skills/preparar-audiencias/scripts/pje-cdp/vincular_testemunhas.mjs \
  /tmp/test_vincular.json
```

Expected output:
```
[DRY] audiencia=1 nome="Maria Teste" termo=1abc123 pg=12 ts=120→480
```

- [ ] **Step 3: Update `schema_registro_audiencia.md` — add loader usage note**

Append at the end of the document (or in a "Loaders" section):

```markdown
## Loaders

| Script | Target | Writes |
|--------|--------|--------|
| `scripts/pje-cdp/popular_ombuds.mjs` | `audiencias.registro_audiencia` | Full registro JSONB blob |
| `scripts/pje-cdp/vincular_testemunhas.mjs` | `testemunhas` rows (matched by `audiencia_id + nome`) | `termo_delegacia_drive_file_id`, `termo_delegacia_pagina`, `depoimento_timestamp_inicio_s`, `depoimento_timestamp_fim_s`, `pinos` (JSONB append with dedup) |
```

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/preparar-audiencias/scripts/pje-cdp/vincular_testemunhas.mjs \
        .claude/skills/preparar-audiencias/references/schema_registro_audiencia.md
git commit -m "feat(skill): vincular_testemunhas — load term links + timestamps into testemunhas DB rows"
```

---

## Final Verification

- [ ] `python3 .claude/skills/preparar-audiencias/scripts/05d_vincular_termos_ip.py --test` → "OK: name matching works"
- [ ] `python3 .claude/skills/preparar-audiencias/scripts/transcrever_midias.py --test` → "OK: timestamp detection works"
- [ ] `DRY_RUN=1 node .claude/skills/preparar-audiencias/scripts/pje-cdp/vincular_testemunhas.mjs /tmp/test_vincular.json` → prints DRY RUN lines, no crash
- [ ] Full skill run on a real audiência with an IP PDF → confirm `registro_audiencia.json` has `dep.termo_delegacia.pagina_inicio` set
- [ ] After `vincular_testemunhas.mjs` run → confirm DB row has `termo_delegacia_drive_file_id` set
- [ ] In OMBUDS sheet → "ver termo (IP)" button appears for deponents where term was found; clicking opens Drive PDF at the correct page
