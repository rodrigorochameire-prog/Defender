"""
Drive Organizer Service — Organiza PDFs soltos no Google Drive local.

Escaneia diretórios raiz do Drive e de Defensoria em busca de PDFs que
contêm número CNJ no nome. Para cada PDF:
1. Extrai o número CNJ do nome do arquivo
2. Consulta Supabase para encontrar processo → assistido → atribuição
3. Move para {atribuição}/{assistido}/{processo}/ (se >1 processo) ou {atribuição}/{assistido}/

Depende de: Supabase configurado (service_role_key) com processos/assistidos populados.
"""
from __future__ import annotations

import logging
import re
import shutil
from pathlib import Path
from typing import Any

from config import get_settings
from services.supabase_service import get_supabase_service, SupabaseService
from services.pje_download_service import (
    DRIVE_BASE,
    ATRIBUICAO_FOLDER_MAP,
    MPU_FOLDER_NAME,
    _sanitize_folder_name,
    _extract_cnj_from_filename,
    _detect_existing_processos,
    _promote_to_subfolders,
    _looks_like_cnj,
    _is_classe_principal,
    _is_classe_ep,
    _is_classe_mpu,
    _is_classe_acessoria,
    _find_ap_folder,
    _find_ep_folder,
    _find_subfolder_for_cnj,
    _folder_name_for_processo,
    _resolve_drive_folder,
)

logger = logging.getLogger("enrichment-engine.drive-organizer")

# Diretório raiz do My Drive
DRIVE_ROOT = Path.home() / "My Drive"

# Regex CNJ completo
_CNJ_RE = re.compile(r"\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}")

# Extensões que serão organizadas
ORGANIZE_EXTENSIONS = {".pdf"}


def _resolve_atribuicao_folder(atribuicao: str | None) -> str:
    """Resolve atribuição (enum ou texto) para nome da pasta no Drive."""
    if not atribuicao:
        return "Processos"
    key = atribuicao.strip().lower()
    return ATRIBUICAO_FOLDER_MAP.get(key, "Processos")


class DriveOrganizerService:
    """
    Organiza PDFs soltos no Google Drive local por assistido/processo.

    Fluxo:
    1. Escaneia pastas-alvo (raiz do Drive, raiz de Defensoria)
    2. Filtra arquivos com número CNJ no nome
    3. Consulta Supabase para cada CNJ
    4. Move para estrutura {atribuição}/{assistido}/[{processo}/]
    """

    def __init__(self):
        self.settings = get_settings()
        self._supabase: SupabaseService | None = None
        self._processo_cache: dict[str, dict | None] = {}
        self._assistido_cache: dict[int, dict | None] = {}

    def _get_supabase(self) -> SupabaseService:
        if self._supabase is None:
            self._supabase = get_supabase_service()
        return self._supabase

    async def _lookup_processo(self, cnj: str) -> dict | None:
        """
        Busca processo no Supabase pelo número CNJ.

        Returns: {id, numero, assistido_id, caso_id} ou None
        """
        if cnj in self._processo_cache:
            return self._processo_cache[cnj]

        supabase = self._get_supabase()
        result = await supabase.find_processo_by_numero(cnj)
        self._processo_cache[cnj] = result
        return result

    async def _lookup_assistido(self, assistido_id: int) -> dict | None:
        """
        Busca assistido no Supabase pelo ID.

        Returns: {id, nome, atribuicao_primaria} ou None
        """
        if assistido_id in self._assistido_cache:
            return self._assistido_cache[assistido_id]

        supabase = self._get_supabase()
        client = supabase._get_client()
        try:
            result = (
                client.table("assistidos")
                .select("id, nome, atribuicao_primaria")
                .eq("id", assistido_id)
                .limit(1)
                .execute()
            )
            data = result.data[0] if result.data else None
            self._assistido_cache[assistido_id] = data
            return data
        except Exception as e:
            logger.error("Failed to lookup assistido %d: %s", assistido_id, e)
            self._assistido_cache[assistido_id] = None
            return None

    async def _lookup_processo_full(self, cnj: str) -> dict | None:
        """
        Busca processo + atribuição + nome do assistido.

        Returns: {cnj, assistido_name, atribuicao, processo_id, assistido_id} ou None
        """
        supabase = self._get_supabase()
        client = supabase._get_client()
        try:
            result = (
                client.table("processos")
                .select("id, numero_autos, assistido_id, atribuicao, area, classe_processual")
                .eq("numero_autos", cnj)
                .is_("deleted_at", "null")
                .limit(1)
                .execute()
            )
            if not result.data:
                return None

            proc = result.data[0]
            assistido = await self._lookup_assistido(proc["assistido_id"])
            if not assistido:
                return None

            # Prioridade: atribuicao do processo > area > atribuicao_primaria do assistido
            atribuicao = (
                proc.get("atribuicao")
                or proc.get("area")
                or assistido.get("atribuicao_primaria")
                or "criminal"
            )

            return {
                "cnj": cnj,
                "assistido_name": assistido["nome"],
                "atribuicao": atribuicao,
                "classe_processual": proc.get("classe_processual"),
                "processo_id": proc["id"],
                "assistido_id": proc["assistido_id"],
            }
        except Exception as e:
            logger.error("Failed full lookup for %s: %s", cnj, e)
            return None

    def _scan_loose_pdfs(self, folders: list[Path]) -> list[tuple[Path, str]]:
        """
        Escaneia pastas em busca de PDFs soltos com número CNJ no nome.

        Returns: Lista de (path_do_arquivo, cnj_extraido)
        """
        found: list[tuple[Path, str]] = []
        for folder in folders:
            if not folder.exists():
                logger.warning("Folder not found: %s", folder)
                continue
            for f in folder.iterdir():
                if not f.is_file():
                    continue
                if f.suffix.lower() not in ORGANIZE_EXTENSIONS:
                    continue
                if f.name.startswith("."):
                    continue
                cnj = _extract_cnj_from_filename(f.name)
                if cnj:
                    found.append((f, cnj))

        logger.info("Found %d loose PDFs with CNJ numbers", len(found))
        return found

    def _move_file(
        self,
        file_path: Path,
        atribuicao: str,
        assistido_name: str,
        numero_processo: str,
        classe_processual: str | None = None,
    ) -> Path | None:
        """
        Move arquivo para a estrutura correta no Drive.

        Regra de organização:
        - Apenas Ações Penais criam subpastas separadas.
        - Acessórios (IP, APF) ficam na mesma pasta da AP correspondente.
        - Se não há AP, tudo na pasta do assistido.
        """
        assistido_folder_name = _sanitize_folder_name(assistido_name)

        is_ap = _is_classe_principal(classe_processual)
        is_ep = _is_classe_ep(classe_processual)
        is_mpu = _is_classe_mpu(classe_processual)
        is_acessorio = _is_classe_acessoria(classe_processual)

        # MPU autônoma → "Processos - MPU", senão pasta da atribuição
        if is_mpu:
            vvd_base = DRIVE_BASE / _resolve_atribuicao_folder(atribuicao)
            vvd_assistido = vvd_base / assistido_folder_name
            ap_in_vvd = _find_ap_folder(vvd_assistido) if vvd_assistido.exists() else None
            if ap_in_vvd:
                atrib_folder = vvd_base
            else:
                atrib_folder = DRIVE_BASE / MPU_FOLDER_NAME
        else:
            atrib_folder = DRIVE_BASE / _resolve_atribuicao_folder(atribuicao)

        assistido_folder = atrib_folder / assistido_folder_name
        assistido_folder.mkdir(parents=True, exist_ok=True)

        ap_folder = _find_ap_folder(assistido_folder)
        ep_folder = _find_ep_folder(assistido_folder)
        existing_subfolders = [
            d for d in assistido_folder.iterdir()
            if d.is_dir() and _extract_cnj_from_filename(d.name)
        ]

        if is_ep:
            folder_name = _folder_name_for_processo(numero_processo, classe_processual)
            existing = _find_subfolder_for_cnj(assistido_folder, numero_processo)
            if existing:
                dest_folder = existing
            elif existing_subfolders:
                dest_folder = assistido_folder / folder_name
                dest_folder.mkdir(exist_ok=True)
            else:
                dest_folder = assistido_folder
        elif is_ap:
            if ep_folder:
                dest_folder = ep_folder
            else:
                existing_cnjs = _detect_existing_processos(assistido_folder)
                other_cnjs = existing_cnjs - {numero_processo}
                folder_name = _folder_name_for_processo(numero_processo, classe_processual)
                existing = _find_subfolder_for_cnj(assistido_folder, numero_processo)
                if existing:
                    dest_folder = existing
                elif other_cnjs and not existing_subfolders:
                    _promote_to_subfolders(assistido_folder, existing_cnjs)
                    dest_folder = assistido_folder / folder_name
                    dest_folder.mkdir(exist_ok=True)
                elif existing_subfolders:
                    dest_folder = assistido_folder / folder_name
                    dest_folder.mkdir(exist_ok=True)
                else:
                    dest_folder = assistido_folder
        elif is_mpu:
            if ap_folder:
                dest_folder = ap_folder
            else:
                folder_name = _folder_name_for_processo(numero_processo, classe_processual)
                existing = _find_subfolder_for_cnj(assistido_folder, numero_processo)
                if existing:
                    dest_folder = existing
                elif existing_subfolders:
                    dest_folder = assistido_folder / folder_name
                    dest_folder.mkdir(exist_ok=True)
                else:
                    dest_folder = assistido_folder
        elif is_acessorio:
            if ep_folder:
                dest_folder = ep_folder
            elif ap_folder:
                dest_folder = ap_folder
            else:
                dest_folder = assistido_folder
        else:
            if existing_subfolders:
                folder_name = _folder_name_for_processo(numero_processo, classe_processual)
                dest_folder = assistido_folder / folder_name
                dest_folder.mkdir(exist_ok=True)
            else:
                dest_folder = assistido_folder

        dest_file = dest_folder / file_path.name
        if dest_file.exists():
            logger.debug("File already exists at destination: %s", dest_file)
            return None

        try:
            shutil.move(str(file_path), str(dest_file))
            logger.info("Organized: %s → %s", file_path.name, dest_file)
            return dest_file
        except Exception as e:
            logger.error("Failed to move %s: %s", file_path.name, e)
            return None

    async def organize(
        self,
        scan_drive_root: bool = True,
        scan_defensoria_root: bool = True,
        dry_run: bool = False,
    ) -> dict[str, Any]:
        """
        Organiza PDFs soltos em pastas por assistido/processo.

        Args:
            scan_drive_root: Escanear ~/My Drive/ (raiz)
            scan_defensoria_root: Escanear ~/My Drive/1 - Defensoria 9ª DP/ (raiz)
            dry_run: Se True, apenas simula sem mover arquivos

        Returns:
            Relatório com resultados da organização
        """
        folders_to_scan: list[Path] = []
        if scan_drive_root:
            folders_to_scan.append(DRIVE_ROOT)
        if scan_defensoria_root:
            folders_to_scan.append(DRIVE_BASE)

        loose_pdfs = self._scan_loose_pdfs(folders_to_scan)

        results: list[dict[str, Any]] = []
        moved = 0
        skipped_no_match = 0
        skipped_exists = 0
        errors = 0

        for file_path, cnj in loose_pdfs:
            # Verificar se o arquivo já está dentro de uma pasta de assistido
            # (evitar mover arquivos que já estão organizados)
            rel_to_base = None
            try:
                rel_to_base = file_path.relative_to(DRIVE_BASE)
                # Se tem 2+ partes no path, já está em subpasta (organizado)
                if len(rel_to_base.parts) > 1:
                    continue
            except ValueError:
                pass  # Arquivo está fora de DRIVE_BASE (ex: raiz do Drive)

            # Consultar Supabase
            info = await self._lookup_processo_full(cnj)

            if not info:
                skipped_no_match += 1
                results.append({
                    "file": file_path.name,
                    "cnj": cnj,
                    "action": "skipped",
                    "reason": "processo não encontrado no banco",
                })
                continue

            if dry_run:
                folder_name = _resolve_atribuicao_folder(info["atribuicao"])
                classe = info.get("classe_processual") or ""
                tipo = "principal" if _is_classe_principal(classe) else "acessório" if _is_classe_acessoria(classe) else "?"
                dest_preview = f"{folder_name}/{_sanitize_folder_name(info['assistido_name'])}/"
                results.append({
                    "file": file_path.name,
                    "cnj": cnj,
                    "assistido": info["assistido_name"],
                    "atribuicao": info["atribuicao"],
                    "action": "would_move",
                    "dest": dest_preview,
                    "reason": f"classe={classe} ({tipo})" if classe else None,
                })
                moved += 1
                continue

            dest = self._move_file(
                file_path,
                info["atribuicao"],
                info["assistido_name"],
                cnj,
                classe_processual=info.get("classe_processual"),
            )

            if dest:
                moved += 1
                results.append({
                    "file": file_path.name,
                    "cnj": cnj,
                    "assistido": info["assistido_name"],
                    "atribuicao": info["atribuicao"],
                    "action": "moved",
                    "dest": str(dest),
                })
            else:
                skipped_exists += 1
                results.append({
                    "file": file_path.name,
                    "cnj": cnj,
                    "action": "skipped",
                    "reason": "já existe no destino",
                })

        summary = {
            "total_scanned": len(loose_pdfs),
            "moved": moved,
            "skipped_no_match": skipped_no_match,
            "skipped_exists": skipped_exists,
            "errors": errors,
            "dry_run": dry_run,
            "details": results,
        }

        logger.info(
            "Drive organize complete | scanned=%d moved=%d skipped=%d dry_run=%s",
            len(loose_pdfs),
            moved,
            skipped_no_match + skipped_exists,
            dry_run,
        )

        return summary


# === Singleton ===
_service: DriveOrganizerService | None = None


def get_drive_organizer_service() -> DriveOrganizerService:
    """Singleton do Drive Organizer service."""
    global _service
    if _service is None:
        _service = DriveOrganizerService()
    return _service
