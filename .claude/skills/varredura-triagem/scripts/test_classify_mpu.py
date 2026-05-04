#!/usr/bin/env python3
"""Suite de testes synthetics para classify(is_mpu=True).

Não usa framework — roda standalone:
    python3 test_classify_mpu.py
Sai com código 0 se todos passam, 1 se algum falha.

Cada caso é (id_curto, titulo, texto, ato_esperado, prioridade_esperada,
fase_esperada, motivo_esperado). Texto pode ser snippet curto realista.
"""
from __future__ import annotations
import sys
from pathlib import Path

# Importar módulo do script principal sem rodar main()
SCRIPT = Path(__file__).parent / "varredura_triagem.py"
ns: dict = {}
src = SCRIPT.read_text()
# Remover a chamada main() final para poder importar
src_no_main = "\n".join(
    l for l in src.splitlines()
    if not l.strip().startswith("main()")
       and not l.strip() == "if __name__ == \"__main__\":"
)
exec(src_no_main, ns)
classify = ns["classify"]

# (id, titulo, texto, ato, prioridade, fase, motivo)
CASES = [
    (
        "audiencia_justifica",
        "Decisão",
        "DESIGNO audiência de justificação para o dia 12/05/2026 às 14h",
        "Defesa em audiência de justificação",
        "URGENTE",
        "audiencia_designada",
        "ciencia_audiencia",
    ),
    (
        "mpu_deferida",
        "Decisão",
        "DEFIRO as medidas protetivas requeridas — afastamento do lar, proibição de aproximação",
        "Analisar viabilidade de agravo",
        "NORMAL",
        "decisao_liminar",
        "ciencia_decisao_mpu",
    ),
    (
        "prorrogacao",
        "Intimação",
        "intime-se o requerido para manifestar-se sobre o pedido de prorrogação das medidas protetivas formulado pela requerente",
        "Manifestar contra prorrogação de MPU",
        "URGENTE",
        "manifestacao_pendente",
        "manifestar_renovacao",
    ),
    (
        "revogacao_pela_requerente",
        "Petição",
        "a requerente manifestou interesse na revogação das medidas protetivas alegando reconciliação",
        "Acompanhar pedido de revogação",
        "BAIXA",
        "manifestacao_pendente",
        "manifestar_revogacao",
    ),
    (
        "descumprimento_24a",
        "Decisão",
        "notícia de descumprimento das medidas protetivas pelo requerido. Encaminhe-se ao MP (art. 24-A Lei 11.340)",
        "Defesa criminal — descumprimento art. 24-A",
        "URGENTE",
        "descumprimento_apurado",
        "manifestar_descumprimento",
    ),
    (
        "laudo_psicossocial",
        "Despacho",
        "juntado aos autos o laudo psicossocial elaborado pelo CRAM, abra-se vista ao requerido",
        "Manifestar sobre laudo psicossocial",
        "NORMAL",
        "manifestacao_pendente",
        "manifestar_laudo",
    ),
    (
        "modulacao",
        "Petição",
        "requereu o requerido a modulação da medida protetiva, reduzindo o raio de afastamento",
        "Manifestar sobre modulação de MPU",
        "NORMAL",
        "manifestacao_pendente",
        "manifestar_modulacao",
    ),
    (
        "tornozeleira",
        "Decisão",
        "em razão do reiterado descumprimento, decreto a aplicação de monitoramento eletrônico (tornozeleira)",
        "Contestar imposição de tornozeleira",
        "URGENTE",
        "manifestacao_pendente",
        "manifestar_modulacao",
    ),
    (
        "ciencia_generica",
        "Intimação",
        "TOMAR CIÊNCIA",
        "Ciência",
        "BAIXA",
        "manifestacao_pendente",
        "intimacao_generica",
    ),
]

# Casos negativos (is_mpu=False)
NEGATIVE_CASES = [
    (
        "criminal_comum_citando_mpu",
        "Sentença",
        "...denúncia oferecida por crime do art. 129, com antecedente de medida protetiva descumprida...",
        # Quando is_mpu=False, fallback é RULES_BASE → "Analisar sentença"
        "Analisar sentença",
    ),
]


def run() -> int:
    failed = 0
    for case in CASES:
        cid, titulo, texto, ato_esp, prio_esp, fase_esp, motivo_esp = case
        result = classify(texto, titulo=titulo, is_mpu=True)
        if result is None:
            print(f"  ✗ {cid}: classify retornou None")
            failed += 1
            continue
        ok = (result.get("ato") == ato_esp
              and result.get("prioridade") == prio_esp
              and result.get("fase") == fase_esp
              and result.get("motivo") == motivo_esp)
        if ok:
            print(f"  ✓ {cid}: {result['ato']} ({result['prioridade']}) [fase={fase_esp}|motivo={motivo_esp}]")
        else:
            print(f"  ✗ {cid}: esperado [{ato_esp}/{prio_esp}/{fase_esp}/{motivo_esp}], obtido [{result.get('ato')}/{result.get('prioridade')}/{result.get('fase')}/{result.get('motivo')}]")
            failed += 1

    for case in NEGATIVE_CASES:
        cid, titulo, texto, ato_esp = case
        result = classify(texto, titulo=titulo, is_mpu=False)
        if result is None:
            print(f"  ✗ {cid} (neg): classify retornou None — esperava {ato_esp}")
            failed += 1
            continue
        if result.get("ato") == ato_esp:
            print(f"  ✓ {cid} (neg): {result['ato']} (não acionou MPU)")
        else:
            print(f"  ✗ {cid} (neg): esperado {ato_esp}, obtido {result.get('ato')}")
            failed += 1

    total = len(CASES) + len(NEGATIVE_CASES)
    passed = total - failed
    print(f"\n{passed}/{total} testes passaram")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(run())
