#!/usr/bin/env python3
"""Testes para extração + classificação de MOVIMENTOS de audiência da timeline PJe.

Cobre o caso em que o objeto da intimação (audiência designada/redesignada) NÃO
está no corpo do documento intimado (despacho vago), mas num MOVIMENTO da timeline
do PJe — formato `AUDIÊNCIA <tipo> (RE)DESIGNADA CONDUZIDA POR DD/MM/AAAA HH:MM
EM/PARA <vara>, #NÃO PREENCHIDO#.`

Caso real: André Chaves de Oliveira — 8016157-03.2025.8.05.0039 (VVD Camaçari).

Standalone:  python3 test_movimento_audiencia.py
Sai 0 se todos passam, 1 se algum falha.
"""
from __future__ import annotations
import sys
from pathlib import Path

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))
from designacao_parse import extrair_movimentos_audiencia  # noqa: E402

# carregar classify do script principal sem rodar main()
ns: dict = {"__file__": str(HERE / "varredura_triagem.py")}
src = (HERE / "varredura_triagem.py").read_text()
src_no_main = "\n".join(
    l for l in src.splitlines()
    if not l.strip().startswith("main()")
    and l.strip() != 'if __name__ == "__main__":'
)
exec(src_no_main, ns)
classify = ns["classify"]

# ── Fixture: timeline real (André Chaves) ─────────────────────────────────────
TIMELINE_ANDRE = """
19 jun 2026
JUNTADA DE PETIÇÃO DE #NÃO PREENCHIDO#
565650853 - Petição (CIÊNCIA DESIGNAÇÃO AUDIÊNCIA)
18 jun 2026
AUDIÊNCIA OITIVA ESPECIAL REDESIGNADA CONDUZIDA POR 16/07/2026 09:15 EM/PARA VARA DE VIOLÊNCIA DOMÉSTICA FAM CONTRA A MULHER DE CAMAÇARI, #NÃO PREENCHIDO#.
16 jun 2026
PROFERIDO DESPACHO DE MERO EXPEDIENTE
564295037 - Despacho
"""

DESPACHO_VAGO = (
    "DESPACHO. Vistos, etc. Proceda a secretaria à juntada dos documentos "
    "relacionados à audiência retro. Caso o ato não tenha sido realizado, "
    "certifique-se, com a inclusão em nova data na pauta de audiência. Após, "
    "retornem os autos conclusos."
)

failures: list[str] = []


def check(name: str, cond: bool) -> None:
    print(f"  {'OK ' if cond else 'FALHOU'} {name}")
    if not cond:
        failures.append(name)


# 1. extrai o movimento de redesignação com data/hora/tipo corretos
movs = extrair_movimentos_audiencia(TIMELINE_ANDRE)
check("extrai 1 movimento", len(movs) == 1)
if movs:
    m = movs[0]
    check("data 2026-07-16", m["data"] == "2026-07-16")
    check("horario 09:15", m["horario"] == "09:15")
    check("redesignacao=True", m["redesignacao"] is True)
    check("tipo = depoimento especial", "Especial" in m["tipo"])

# 2. audiência CANCELADA não vira movimento agendável
movs_cancel = extrair_movimentos_audiencia(
    "AUDIÊNCIA OITIVA ESPECIAL CANCELADA CONDUZIDA POR 16/07/2026 09:15 EM/PARA VARA X."
)
check("cancelada ignorada", movs_cancel == [])

# 3. sem audiência → vazio
check("sem audiencia → vazio",
      extrair_movimentos_audiencia("PROFERIDO DESPACHO DE MERO EXPEDIENTE") == [])

# 4. despacho vago + movimento → Ciência redesignação + reagendar (carrega designação)
rule = classify(DESPACHO_VAGO, titulo="Despacho", movimentos=movs)
check("despacho+movimento → redesignação",
      bool(rule) and rule["ato"] == "Ciência redesignação de audiência")
check("side-effect reagendar",
      bool(rule) and "reagendar_audiencia" in rule["side_effects"])
check("designação carregada em extras",
      bool(rule) and (rule["extras"].get("_designacao") or {}).get("data") == "2026-07-16")

# 5. petição (título fraco) + movimento de designação → designação + agendar
desig = extrair_movimentos_audiencia(
    "AUDIÊNCIA INSTRUÇÃO E JULGAMENTO DESIGNADA CONDUZIDA POR 20/08/2026 14:00 "
    "EM/PARA 1A VARA, #NÃO PREENCHIDO#."
)
rule5 = classify("CIÊNCIA DESIGNAÇÃO AUDIÊNCIA", titulo="Petição", movimentos=desig)
check("petição+movimento → designação",
      bool(rule5) and rule5["ato"] == "Ciência designação de audiência")
check("side-effect agendar",
      bool(rule5) and "agendar_audiencia" in rule5["side_effects"])

# 6. GUARDA: título FORTE terminal (sentença) não é sobrescrito NEM aumentado
rule6 = classify("JULGO PROCEDENTE a denúncia e CONDENO o réu.",
                 titulo="Sentença", movimentos=desig)
check("sentença mantém ato",
      bool(rule6) and rule6["ato"] == "Ciência condenação")
check("sentença não ganha agendamento espúrio",
      bool(rule6) and "agendar_audiencia" not in (rule6["side_effects"] or [])
      and "reagendar_audiencia" not in (rule6["side_effects"] or []))

# 6b. CASO REAL (André Chaves): doc titulado "Decisão" que redesignou a audiência.
#     O corpo não casa o regex de designação, então o ato fica "Analisar decisão"
#     — MAS a audiência futura do movimento NÃO pode ser perdida: agenda mesmo
#     assim (sinal preservado, não dicotomia).
rule6b = classify("Defiro o pedido. Intime-se.", titulo="Decisão", movimentos=movs)
check("decisão mantém ato analítico",
      bool(rule6b) and rule6b["ato"] == "Analisar decisão")
check("decisão + movimento → agenda mesmo assim",
      bool(rule6b) and "reagendar_audiencia" in (rule6b["side_effects"] or []))
check("decisão carrega designação p/ agendamento",
      bool(rule6b) and (rule6b["extras"].get("_designacao") or {}).get("data") == "2026-07-16")

# 7. REGRESSÃO: classify sem movimentos não agenda audiência a partir de despacho vago
rule7 = classify(DESPACHO_VAGO, titulo="Despacho")
fx7 = (rule7 or {}).get("side_effects") or []
check("despacho vago sem movimento → não agenda",
      "agendar_audiencia" not in fx7 and "reagendar_audiencia" not in fx7)

print(f"\n{'TODOS OK' if not failures else f'{len(failures)} FALHA(S): ' + ', '.join(failures)}")
sys.exit(0 if not failures else 1)
