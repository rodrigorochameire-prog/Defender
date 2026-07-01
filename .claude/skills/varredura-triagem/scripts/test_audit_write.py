#!/usr/bin/env python3
"""build_audit_payload — shape do audit_logs. Standalone."""
from __future__ import annotations
import sys
from pathlib import Path
SCRIPT = Path(__file__).parent / "varredura_triagem.py"
ns: dict = {"__file__": str(SCRIPT)}
src = SCRIPT.read_text()
src_no_main = "\n".join(l for l in src.splitlines()
    if not l.strip().startswith("main()") and l.strip() != 'if __name__ == "__main__":')
exec(src_no_main, ns)
build_audit_payload = ns["build_audit_payload"]

def main():
    fails = 0
    p = build_audit_payload(entity_type="demanda", entity_id=42, action="update",
                            changes={"ato": {"old": "Ciência", "new": "Analisar pronúncia (RESE)"}},
                            defensor_id=1, defensor_nome="Rodrigo", job_id=1352)
    checks = [
        (p["entity_type"], "demanda"), (p["entity_id"], 42), (p["action"], "update"),
        (p["user_id"], 1), (p["user_name"], "Rodrigo"),
        (p["metadata"]["job_id"], 1352), (p["metadata"]["source"], "varredura"),
        (p["changes"]["ato"]["new"], "Analisar pronúncia (RESE)"),
    ]
    for got, exp in checks:
        if got != exp: print(f"FAIL {got!r}!={exp!r}"); fails += 1
    print("OK" if not fails else f"{fails} FALHAS")
    sys.exit(1 if fails else 0)

if __name__ == "__main__":
    main()
