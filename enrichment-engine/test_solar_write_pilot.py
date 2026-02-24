#!/usr/bin/env python3
"""
Solar Write Pilot Test — Testa escrita no Solar (DPEBA) via Playwright.

Executa sequencialmente:
1. Fase 1 (dry-run): Preenche formularios sem salvar
2. Fase 2 (write real): Cria Fase Processual + Anotacao
3. Fase 3 (verificacao): Confirma que registros apareceram

Uso:
    python3 test_solar_write_pilot.py --dry-run     # Apenas Fase 1
    python3 test_solar_write_pilot.py --real         # Fases 1 + 2 + 3
    python3 test_solar_write_pilot.py --anotacao     # Apenas teste de Anotacao
    python3 test_solar_write_pilot.py --fase         # Apenas teste de Fase Processual

Requisitos:
    - enrichment-engine rodando (ou importar diretamente)
    - Solar acessivel via Playwright
    - Conta rodrigo.meire configurada
"""

import argparse
import asyncio
import json
import logging
import sys
import time
from datetime import datetime
from pathlib import Path

# Setup path
sys.path.insert(0, str(Path(__file__).parent))

from config import get_settings
from services.solar_auth_service import get_solar_auth_service
from services.solar_write_service import SolarWriteService
from services.solar_selectors import TIPO_MAP, TIPO_NOME, QUALIFICACAO_MAP, ANOTACAO

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("solar-pilot")

# ==========================================
# Configuracao do Piloto
# ==========================================

# Processo de teste (Juliane Andrade, atendimento 260120000756)
TEST_ATENDIMENTO = "260120000756"
TEST_PROCESSO = "8000189-30.2025.8.05.0039"
TEST_GRAU = 1

# Tipo de fase para teste (Consulta/Orientacao = 52)
TEST_TIPO_ID = 52
TEST_TIPO_NOME = "Consulta/Orientacao"

# Qualificacao para teste de Anotacao (ANOTACOES = 302)
TEST_QUALIF_ID = 302
TEST_QUALIF_NOME = "ANOTACOES"

# Texto de teste (identificavel para limpeza posterior)
PILOT_TAG = "[PILOTO-OMBUDS]"


class PilotResult:
    """Resultado de um teste individual."""

    def __init__(self, name: str):
        self.name = name
        self.status = "pending"  # pending, pass, fail, skip
        self.message = ""
        self.screenshots: list[str] = []
        self.duration_ms = 0
        self.details: dict = {}

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "status": self.status,
            "message": self.message,
            "screenshots": self.screenshots,
            "duration_ms": self.duration_ms,
            "details": self.details,
        }


class SolarWritePilot:
    """Executor do piloto de escrita no Solar."""

    def __init__(self):
        self.write_service = SolarWriteService()
        self.results: list[PilotResult] = []
        self.start_time = time.time()

    async def run_fase1_dry_run_fase(self) -> PilotResult:
        """Fase 1a: dry-run de Fase Processual."""
        result = PilotResult("Fase 1a: Dry-run Fase Processual")
        start = time.time()

        try:
            now = datetime.now()
            data = now.strftime("%d/%m/%Y")
            hora = now.strftime("%H:%M")
            descricao = f"{PILOT_TAG} Teste dry-run fase processual {now.isoformat()}"

            r = await self.write_service.criar_fase_processual(
                atendimento_id=TEST_ATENDIMENTO,
                numero_processo=TEST_PROCESSO,
                tipo_id=TEST_TIPO_ID,
                data_atividade=data,
                hora_atividade=hora,
                descricao=descricao,
                grau=TEST_GRAU,
                dry_run=True,
            )

            result.details = r
            result.screenshots = r.get("screenshots", [])

            if r.get("success") and r.get("dry_run"):
                result.status = "pass"
                result.message = "Formulario preenchido com sucesso (dry-run)"
            else:
                result.status = "fail"
                result.message = f"Falha: {r.get('error')} - {r.get('message')}"

        except Exception as e:
            result.status = "fail"
            result.message = f"Excecao: {e}"

        result.duration_ms = int((time.time() - start) * 1000)
        return result

    async def run_fase1_dry_run_anotacao(self) -> PilotResult:
        """Fase 1b: dry-run de Anotacao."""
        result = PilotResult("Fase 1b: Dry-run Anotacao")
        start = time.time()

        try:
            now = datetime.now()
            texto = f"{PILOT_TAG} Teste dry-run anotacao {now.isoformat()}"

            r = await self.write_service.criar_anotacao(
                atendimento_id=TEST_ATENDIMENTO,
                texto=texto,
                qualificacao_id=TEST_QUALIF_ID,
                dry_run=True,
            )

            result.details = r
            result.screenshots = r.get("screenshots", [])

            if r.get("success") and r.get("dry_run"):
                result.status = "pass"
                result.message = "Anotacao preenchida com sucesso (dry-run)"
            else:
                result.status = "fail"
                result.message = f"Falha: {r.get('error')} - {r.get('message')}"

        except Exception as e:
            result.status = "fail"
            result.message = f"Excecao: {e}"

        result.duration_ms = int((time.time() - start) * 1000)
        return result

    async def run_fase2_write_fase(self) -> PilotResult:
        """Fase 2a: Escrita REAL de Fase Processual."""
        result = PilotResult("Fase 2a: Write Real Fase Processual")
        start = time.time()

        try:
            now = datetime.now()
            data = now.strftime("%d/%m/%Y")
            hora = now.strftime("%H:%M")
            descricao = f"{PILOT_TAG} Fase processual piloto {now.strftime('%d/%m/%Y %H:%M')}"

            r = await self.write_service.criar_fase_processual(
                atendimento_id=TEST_ATENDIMENTO,
                numero_processo=TEST_PROCESSO,
                tipo_id=TEST_TIPO_ID,
                data_atividade=data,
                hora_atividade=hora,
                descricao=descricao,
                grau=TEST_GRAU,
                dry_run=False,
            )

            result.details = r
            result.screenshots = r.get("screenshots", [])

            if r.get("success"):
                verified = r.get("verified", False)
                fase_id = r.get("fase_id")
                result.status = "pass"
                result.message = (
                    f"Fase criada! verified={verified} fase_id={fase_id} "
                    f"hash={r.get('hash')}"
                )
            else:
                result.status = "fail"
                result.message = f"Falha: {r.get('error')} - {r.get('message')}"

        except Exception as e:
            result.status = "fail"
            result.message = f"Excecao: {e}"

        result.duration_ms = int((time.time() - start) * 1000)
        return result

    async def run_fase2_write_anotacao(self) -> PilotResult:
        """Fase 2b: Escrita REAL de Anotacao."""
        result = PilotResult("Fase 2b: Write Real Anotacao")
        start = time.time()

        try:
            now = datetime.now()
            texto = f"{PILOT_TAG} Anotacao piloto {now.strftime('%d/%m/%Y %H:%M')}"

            r = await self.write_service.criar_anotacao(
                atendimento_id=TEST_ATENDIMENTO,
                texto=texto,
                qualificacao_id=TEST_QUALIF_ID,
                dry_run=False,
            )

            result.details = r
            result.screenshots = r.get("screenshots", [])

            if r.get("success"):
                verified = r.get("verified", False)
                result.status = "pass"
                result.message = (
                    f"Anotacao criada! verified={verified} hash={r.get('hash')}"
                )
            else:
                result.status = "fail"
                result.message = f"Falha: {r.get('error')} - {r.get('message')}"

        except Exception as e:
            result.status = "fail"
            result.message = f"Excecao: {e}"

        result.duration_ms = int((time.time() - start) * 1000)
        return result

    async def run_all(self, dry_run_only: bool = False, test_fase: bool = True, test_anotacao: bool = True):
        """Executa todos os testes do piloto."""
        logger.info("=" * 60)
        logger.info("SOLAR WRITE PILOT - Inicio")
        logger.info("=" * 60)
        logger.info("Atendimento: %s", TEST_ATENDIMENTO)
        logger.info("Processo: %s", TEST_PROCESSO)
        logger.info("Dry-run only: %s", dry_run_only)
        logger.info("")

        # Fase 1: Dry-run
        logger.info("--- FASE 1: DRY-RUN ---")
        if test_fase:
            r = await self.run_fase1_dry_run_fase()
            self.results.append(r)
            logger.info("[%s] %s: %s (%dms)", r.status.upper(), r.name, r.message, r.duration_ms)

        if test_anotacao:
            r = await self.run_fase1_dry_run_anotacao()
            self.results.append(r)
            logger.info("[%s] %s: %s (%dms)", r.status.upper(), r.name, r.message, r.duration_ms)

        if dry_run_only:
            logger.info("")
            logger.info("--- DRY-RUN ONLY: parando aqui ---")
            return

        # Verificar se Fase 1 passou antes de prosseguir
        fase1_failed = any(r.status == "fail" for r in self.results)
        if fase1_failed:
            logger.error("Fase 1 falhou! Abortando Fase 2.")
            return

        # Fase 2: Write Real
        logger.info("")
        logger.info("--- FASE 2: WRITE REAL ---")
        if test_fase:
            r = await self.run_fase2_write_fase()
            self.results.append(r)
            logger.info("[%s] %s: %s (%dms)", r.status.upper(), r.name, r.message, r.duration_ms)

        if test_anotacao:
            r = await self.run_fase2_write_anotacao()
            self.results.append(r)
            logger.info("[%s] %s: %s (%dms)", r.status.upper(), r.name, r.message, r.duration_ms)

    def report(self) -> dict:
        """Gera relatorio final."""
        total_time = int((time.time() - self.start_time) * 1000)
        passed = sum(1 for r in self.results if r.status == "pass")
        failed = sum(1 for r in self.results if r.status == "fail")
        skipped = sum(1 for r in self.results if r.status == "skip")

        all_screenshots = []
        for r in self.results:
            all_screenshots.extend(r.screenshots)

        report = {
            "timestamp": datetime.now().isoformat(),
            "total_time_ms": total_time,
            "tests_total": len(self.results),
            "tests_passed": passed,
            "tests_failed": failed,
            "tests_skipped": skipped,
            "verdict": "PASS" if failed == 0 and passed > 0 else "FAIL",
            "config": {
                "atendimento": TEST_ATENDIMENTO,
                "processo": TEST_PROCESSO,
                "tipo_id": TEST_TIPO_ID,
                "qualif_id": TEST_QUALIF_ID,
            },
            "results": [r.to_dict() for r in self.results],
            "screenshots": all_screenshots,
        }
        return report


async def main():
    parser = argparse.ArgumentParser(description="Solar Write Pilot Test")
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Apenas dry-run (nao salva nada no Solar)",
    )
    parser.add_argument(
        "--real", action="store_true",
        help="Executa dry-run + escrita real + verificacao",
    )
    parser.add_argument(
        "--fase", action="store_true",
        help="Testar apenas Fase Processual",
    )
    parser.add_argument(
        "--anotacao", action="store_true",
        help="Testar apenas Anotacao",
    )
    args = parser.parse_args()

    # Default: dry-run
    dry_run_only = True
    if args.real:
        dry_run_only = False

    # Default: testar ambos
    test_fase = True
    test_anotacao = True
    if args.fase and not args.anotacao:
        test_anotacao = False
    elif args.anotacao and not args.fase:
        test_fase = False

    pilot = SolarWritePilot()
    await pilot.run_all(
        dry_run_only=dry_run_only,
        test_fase=test_fase,
        test_anotacao=test_anotacao,
    )

    # Gerar relatorio
    report = pilot.report()

    logger.info("")
    logger.info("=" * 60)
    logger.info("RESULTADO FINAL: %s", report["verdict"])
    logger.info(
        "Testes: %d total, %d passed, %d failed, %d skipped",
        report["tests_total"], report["tests_passed"],
        report["tests_failed"], report["tests_skipped"],
    )
    logger.info("Tempo total: %dms", report["total_time_ms"])
    logger.info("Screenshots: %d", len(report["screenshots"]))
    logger.info("=" * 60)

    # Salvar relatorio JSON
    report_path = f"/tmp/solar_pilot_report_{int(time.time())}.json"
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2, default=str)
    logger.info("Relatorio salvo em: %s", report_path)

    # Exit code
    sys.exit(0 if report["verdict"] == "PASS" else 1)


if __name__ == "__main__":
    asyncio.run(main())
