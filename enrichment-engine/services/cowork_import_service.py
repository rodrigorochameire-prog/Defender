"""
Cowork Import Service
Detecta e importa _analise_ia.json gerado pelo Cowork nas pastas Drive.
Popula: analises_cowork, processos (analysis_data), testemunhas, depoimentos_analise

ALINHADO com o schema real que as skills Cowork geram:
- pessoas, cronologia, acusacoes, depoimentos, laudos
- radar_liberdade, saneamento, teses, matriz_guerra
- resumo_fatos, inconsistencias, recomendacoes, achados_chave
- _metadata (schema_version, tipo, gerado_em, assistido, processo, model, source)
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

        # 2. Normalizar: aceitar ambos os schemas (Cowork atual + legado)
        norm = self._normalizar(analise)

        client = self.supabase._get_client()
        campos_atualizados: list[str] = []

        # 3. Salvar na tabela analises_cowork
        row = {
            "assistido_id": assistido_id,
            "processo_id": processo_id,
            "audiencia_id": audiencia_id,
            "tipo": norm["tipo"],
            "schema_version": norm["schema_version"],
            "resumo_fato": norm["resumo_fato"],
            "tese_defesa": norm["tese_defesa"],
            "estrategia_atual": norm["estrategia_atual"],
            "crime_principal": norm["crime_principal"],
            "pontos_criticos": norm["pontos_criticos"],
            "payload": norm["payload"],
            "fonte_arquivo": arquivo_nome,
        }
        result = client.table("analises_cowork").insert(row).execute()
        if not result.data:
            raise RuntimeError("Falha ao inserir em analises_cowork: resposta vazia")
        analise_cowork_id = result.data[0]["id"]
        campos_atualizados.append("analises_cowork")

        # 4. Atualizar processos.analysis_data
        if processo_id and norm["resumo_fato"]:
            analysis_data = {
                "resumo": norm["resumo_fato"],
                "achadosChave": norm.get("achados_chave", []),
                "recomendacoes": norm.get("recomendacoes", []),
                "inconsistencias": norm.get("inconsistencias", []),
                "teses": norm.get("teses_lista", []),
                "nulidades": norm.get("nulidades", []),
                "kpis": {
                    "totalPessoas": len(norm.get("pessoas", [])),
                    "totalAcusacoes": len(norm.get("acusacoes", [])),
                    "totalDocumentosAnalisados": 0,
                    "totalEventos": len(norm.get("cronologia", [])),
                    "totalNulidades": len(norm.get("nulidades", [])),
                    "totalRelacoes": 0,
                },
                "crimePrincipal": norm["crime_principal"],
                "estrategia": norm["estrategia_atual"],
                "pontosCriticos": norm["pontos_criticos"],
                "radarLiberdade": norm.get("radar_liberdade"),
                "saneamento": norm.get("saneamento"),
                "versaoModelo": norm.get("model"),
            }
            client.table("processos").update({
                "analysis_data": analysis_data,
                "analysis_status": "completed",
                "analyzed_at": norm.get("gerado_em"),
                "analysis_version": 1,
            }).eq("id", processo_id).execute()
            campos_atualizados.append("processos.analysis_data")

        # 5. Atualizar assistidos.analysis_data
        if assistido_id and norm["resumo_fato"]:
            assistido_data = {
                "resumo": norm["resumo_fato"],
                "achadosChave": norm.get("achados_chave", []),
                "inconsistencias": norm.get("inconsistencias", []),
                "radarLiberdade": norm.get("radar_liberdade"),
            }
            client.table("assistidos").update({
                "analysis_data": assistido_data,
                "analysis_status": "completed",
                "analyzed_at": norm.get("gerado_em"),
            }).eq("id", assistido_id).execute()
            campos_atualizados.append("assistidos.analysis_data")

        # 6. Atualizar testemunhas com perguntas sugeridas
        testemunhas_atualizadas = 0
        perguntas = norm["payload"].get("perguntas_por_testemunha", [])
        if perguntas and processo_id:
            testemunhas_atualizadas = await self._atualizar_testemunhas(
                client, processo_id, perguntas
            )
            if testemunhas_atualizadas:
                campos_atualizados.append(
                    f"testemunhas[{testemunhas_atualizadas}].perguntas_sugeridas"
                )

        # 7. Atualizar depoimentos_analise com contradições
        contradicoes = norm["payload"].get("contradicoes", [])
        if contradicoes and processo_id:
            await self._atualizar_contradicoes(client, processo_id, contradicoes)
            campos_atualizados.append("depoimentos_analise")

        return {
            "analise_cowork_id": analise_cowork_id,
            "tipo": norm["tipo"],
            "campos_atualizados": campos_atualizados,
            "testemunhas_atualizadas": testemunhas_atualizadas,
            "sucesso": True,
            "mensagem": f"Análise '{norm['tipo']}' importada com sucesso.",
        }

    def _normalizar(self, analise: dict) -> dict:
        """
        Normaliza o JSON para um formato unificado.
        Aceita tanto o schema Cowork (pessoas, cronologia, acusacoes...)
        quanto o schema legado (resumo_fato, tese_defesa, payload...).
        """
        meta = analise.get("_metadata", {})

        # Detectar qual schema: se tem "pessoas" é o novo, se tem "resumo_fato" é o legado
        is_cowork_schema = "pessoas" in analise or "acusacoes" in analise or "depoimentos" in analise

        if is_cowork_schema:
            return self._normalizar_cowork(analise, meta)
        else:
            return self._normalizar_legado(analise, meta)

    def _normalizar_cowork(self, a: dict, meta: dict) -> dict:
        """Normaliza schema das skills Cowork (pessoas, cronologia, acusacoes...)"""

        # Extrair crime principal das acusações
        acusacoes = a.get("acusacoes", [])
        crime_principal = acusacoes[0].get("crime", "") if acusacoes else ""

        # Extrair tese de defesa
        teses = a.get("teses", {})
        tese_defesa = ""
        teses_lista = []
        if isinstance(teses, dict):
            tese_defesa = teses.get("principal", teses.get("tese_principal", ""))
            teses_lista = teses.get("subsidiarias", teses.get("teses_subsidiarias", []))
            if tese_defesa:
                teses_lista = [tese_defesa] + teses_lista
        elif isinstance(teses, list):
            teses_lista = teses
            tese_defesa = teses[0] if teses else ""

        # Extrair perguntas por testemunha dos depoimentos
        depoimentos = a.get("depoimentos", [])
        perguntas_por_testemunha = []
        contradicoes = []
        for dep in depoimentos:
            nome = dep.get("nome", "")
            # Perguntas sugeridas (se existirem)
            perguntas = dep.get("perguntas_sugeridas", dep.get("perguntas", []))
            if perguntas:
                perguntas_por_testemunha.append({
                    "nome": nome,
                    "tipo": dep.get("tipo", "testemunha").upper(),
                    "perguntas": perguntas,
                })
            # Contradições
            for c in dep.get("contradicoes", []):
                if isinstance(c, str):
                    contradicoes.append({
                        "testemunha": nome,
                        "contradicao": c,
                        "delegacia": "",
                        "juizo": "",
                    })
                elif isinstance(c, dict):
                    contradicoes.append({
                        "testemunha": nome,
                        "delegacia": c.get("delegacia", c.get("versao_delegacia", "")),
                        "juizo": c.get("juizo", c.get("versao_juizo", "")),
                        "contradicao": c.get("descricao", c.get("contradicao", "")),
                    })

        # Nulidades
        nulidades = a.get("nulidades", [])
        nulidades_formatadas = []
        for n in nulidades:
            if isinstance(n, str):
                nulidades_formatadas.append({"tipo": "processual", "descricao": n, "severidade": "media", "fundamentacao": ""})
            elif isinstance(n, dict):
                nulidades_formatadas.append(n)

        return {
            "tipo": meta.get("tipo", a.get("_metadata", {}).get("tipo", "desconhecido")),
            "schema_version": meta.get("schema_version", "1.0"),
            "gerado_em": meta.get("gerado_em"),
            "model": meta.get("model"),
            "resumo_fato": a.get("resumo_fatos", a.get("resumo", "")),
            "tese_defesa": tese_defesa,
            "estrategia_atual": a.get("estrategia_atual", ""),
            "crime_principal": crime_principal,
            "pontos_criticos": a.get("achados_chave", a.get("pontos_criticos", [])),
            "achados_chave": a.get("achados_chave", []),
            "recomendacoes": a.get("recomendacoes", []),
            "inconsistencias": a.get("inconsistencias", []),
            "teses_lista": teses_lista,
            "nulidades": nulidades_formatadas,
            "pessoas": a.get("pessoas", []),
            "cronologia": a.get("cronologia", []),
            "acusacoes": acusacoes,
            "radar_liberdade": a.get("radar_liberdade"),
            "saneamento": a.get("saneamento"),
            "payload": {
                "perguntas_por_testemunha": perguntas_por_testemunha,
                "contradicoes": contradicoes,
                "orientacao_ao_assistido": a.get("orientacao_ao_assistido", ""),
                "perspectiva_plenaria": a.get("perspectiva_plenaria", ""),
                "quesitos_criticos": a.get("quesitos_criticos", []),
                "laudos": a.get("laudos", {}),
                "matriz_guerra": a.get("matriz_guerra", []),
                "osint": a.get("osint", {}),
                # Dados raw para consulta completa
                "pessoas": a.get("pessoas", []),
                "cronologia": a.get("cronologia", []),
                "depoimentos": depoimentos,
            },
        }

    def _normalizar_legado(self, a: dict, meta: dict) -> dict:
        """Normaliza schema legado (resumo_fato, tese_defesa, payload...)"""
        return {
            "tipo": a.get("tipo", meta.get("tipo", "desconhecido")),
            "schema_version": a.get("schema_version", meta.get("schema_version", "1.0")),
            "gerado_em": meta.get("gerado_em"),
            "model": meta.get("model"),
            "resumo_fato": a.get("resumo_fato", ""),
            "tese_defesa": a.get("tese_defesa", ""),
            "estrategia_atual": a.get("estrategia_atual", ""),
            "crime_principal": a.get("crime_principal", ""),
            "pontos_criticos": a.get("pontos_criticos", []),
            "achados_chave": a.get("pontos_criticos", []),
            "recomendacoes": [],
            "inconsistencias": [],
            "teses_lista": [a["tese_defesa"]] if a.get("tese_defesa") else [],
            "nulidades": [],
            "pessoas": [],
            "cronologia": [],
            "acusacoes": [],
            "radar_liberdade": None,
            "saneamento": None,
            "payload": a.get("payload", {}),
        }

    async def _atualizar_testemunhas(
        self, client, processo_id: int, perguntas: list[dict]
    ) -> int:
        """Atualiza perguntas sugeridas nas testemunhas do processo."""
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
        atualizadas = 0
        for item in perguntas:
            nome_busca = item.get("nome", "").lower().strip()
            match_id = testemunhas_map.get(nome_busca)
            if match_id:
                client.table("testemunhas").update({
                    "perguntas_sugeridas": _json.dumps(
                        item.get("perguntas", []), ensure_ascii=False
                    ),
                }).eq("id", match_id).execute()
                atualizadas += 1
        return atualizadas

    async def _atualizar_contradicoes(
        self, client, processo_id: int, contradicoes: list[dict]
    ) -> None:
        """Atualiza/insere contradições na tabela depoimentos_analise."""
        casos_result = (
            client.table("processos")
            .select("caso_id")
            .eq("id", processo_id)
            .execute()
        )
        caso_id = None
        if casos_result.data and casos_result.data[0].get("caso_id"):
            caso_id = casos_result.data[0]["caso_id"]

        if not caso_id:
            return

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
