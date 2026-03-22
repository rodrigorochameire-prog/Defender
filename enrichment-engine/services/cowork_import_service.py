"""
Cowork Import Service
Detecta e importa _analise_ia.json gerado pelo Cowork nas pastas Drive.
Popula: analises_cowork, processos (analysis_data), testemunhas, depoimentos_analise
"""
from __future__ import annotations

import json as _json
import logging
from typing import Any

import httpx

from services.supabase_service import SupabaseService

logger = logging.getLogger("enrichment-engine.cowork_import")


class CoworkImportService:

    def __init__(self):
        self.supabase = SupabaseService()

    async def importar(
        self,
        assistido_id: int,
        processo_id: int | None,
        audiencia_id: int | None,
        drive_folder_id: str,
        arquivo_nome: str,
        access_token: str,
    ) -> dict[str, Any]:
        # 1. Baixar _analise_ia.json do Drive
        analise = await self._baixar_json_drive(drive_folder_id, arquivo_nome, access_token)

        tipo = analise.get("tipo", "desconhecido")
        payload = analise.get("payload", {})
        campos_atualizados: list[str] = []

        # 2. Salvar na tabela analises_cowork
        client = self.supabase._get_client()
        row = {
            "assistido_id": assistido_id,
            "processo_id": processo_id,
            "audiencia_id": audiencia_id,
            "tipo": tipo,
            "schema_version": analise.get("schema_version", "1.0"),
            "resumo_fato": analise.get("resumo_fato"),
            "tese_defesa": analise.get("tese_defesa"),
            "estrategia_atual": analise.get("estrategia_atual"),
            "crime_principal": analise.get("crime_principal"),
            "pontos_criticos": analise.get("pontos_criticos", []),
            "payload": payload,
            "fonte_arquivo": arquivo_nome,
        }
        result = client.table("analises_cowork").insert(row).execute()
        if not result.data:
            raise RuntimeError(f"Falha ao inserir em analises_cowork: resposta vazia do banco")
        analise_cowork_id = result.data[0]["id"]
        campos_atualizados.append("analises_cowork")

        # 3. Atualizar processos.analysis_data
        if processo_id and analise.get("resumo_fato"):
            analysis_data = {
                "resumo": analise.get("resumo_fato"),
                "teses": [analise["tese_defesa"]] if analise.get("tese_defesa") else [],
                "estrategia": analise.get("estrategia_atual"),
                "crimePrincipal": analise.get("crime_principal"),
                "pontosCriticos": analise.get("pontos_criticos", []),
            }
            client.table("processos").update({
                "analysis_data": analysis_data,
            }).eq("id", processo_id).execute()
            campos_atualizados.append("processos.analysis_data")

        # 4. Atualizar testemunhas com perguntas sugeridas
        testemunhas_atualizadas = 0
        perguntas = payload.get("perguntas_por_testemunha", [])
        if perguntas and processo_id:
            testemunhas_db = (
                client.table("testemunhas")
                .select("id, nome")
                .eq("processo_id", processo_id)
                .execute()
            )
            testemunhas_map = {
                t["nome"].lower().strip(): t["id"]
                for t in testemunhas_db.data
            }
            for item in perguntas:
                nome_busca = item.get("nome", "").lower().strip()
                match_id = testemunhas_map.get(nome_busca)
                if match_id:
                    client.table("testemunhas").update({
                        "perguntas_sugeridas": _json.dumps(
                            item.get("perguntas", []), ensure_ascii=False
                        ),
                    }).eq("id", match_id).execute()
                    testemunhas_atualizadas += 1

            if testemunhas_atualizadas:
                campos_atualizados.append(
                    f"testemunhas[{testemunhas_atualizadas}].perguntas_sugeridas"
                )

        # 5. Atualizar depoimentos_analise com contradições
        contradicoes = payload.get("contradicoes", [])
        if contradicoes and processo_id:
            casos_result = (
                client.table("processos")
                .select("caso_id")
                .eq("id", processo_id)
                .execute()
            )
            caso_id = None
            if casos_result.data and casos_result.data[0].get("caso_id"):
                caso_id = casos_result.data[0]["caso_id"]

            if caso_id:
                for c in contradicoes:
                    nome = c.get("testemunha")
                    if not nome:
                        continue
                    existing = (
                        client.table("depoimentos_analise")
                        .select("id")
                        .eq("caso_id", caso_id)
                        .eq("testemunha_nome", nome)
                        .execute()
                    )
                    update_data = {
                        "caso_id": caso_id,
                        "testemunha_nome": nome,
                        "versao_delegacia": c.get("delegacia"),
                        "versao_juizo": c.get("juizo"),
                        "contradicoes_identificadas": c.get("contradicao"),
                    }
                    if existing.data:
                        client.table("depoimentos_analise").update(
                            update_data
                        ).eq("id", existing.data[0]["id"]).execute()
                    else:
                        client.table("depoimentos_analise").insert(update_data).execute()
                campos_atualizados.append("depoimentos_analise")

        return {
            "analise_cowork_id": analise_cowork_id,
            "tipo": tipo,
            "campos_atualizados": campos_atualizados,
            "testemunhas_atualizadas": testemunhas_atualizadas,
            "sucesso": True,
            "mensagem": f"Análise '{tipo}' importada com sucesso.",
        }

    async def _baixar_json_drive(
        self, folder_id: str, arquivo_nome: str, access_token: str
    ) -> dict:
        """Busca arquivo por nome na pasta Drive e faz download do JSON."""
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://www.googleapis.com/drive/v3/files",
                params={
                    "q": f"'{folder_id}' in parents and name = '{arquivo_nome}' and trashed = false",
                    "fields": "files(id,name)",
                },
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=10.0,
            )
            resp.raise_for_status()
            files = resp.json().get("files", [])
            if not files:
                raise ValueError(
                    f"Arquivo '{arquivo_nome}' não encontrado na pasta {folder_id}"
                )
            file_id = files[0]["id"]
            dl = await client.get(
                f"https://www.googleapis.com/drive/v3/files/{file_id}",
                params={"alt": "media"},
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=15.0,
            )
            dl.raise_for_status()
            return dl.json()


_service: CoworkImportService | None = None


def get_cowork_import_service() -> CoworkImportService:
    global _service
    if _service is None:
        _service = CoworkImportService()
    return _service
