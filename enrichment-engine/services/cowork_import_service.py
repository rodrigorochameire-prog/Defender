"""
Cowork Import Service — Framework v7
Detecta e importa _analise_ia.json gerado pelo Cowork nas pastas Drive.
Popula: analises_cowork, processos (analysis_data), assistidos, testemunhas, depoimentos_analise

Aceita 3 schemas:
- v2 (Framework v7): schema_version "2.0" com campos completos por atribuição
- v1 Cowork (pessoas, cronologia, acusacoes, depoimentos)
- Legado (resumo_fato, tese_defesa, payload)
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

        # 2. Normalizar para formato unificado
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
            raise RuntimeError("Falha ao inserir em analises_cowork")
        analise_cowork_id = result.data[0]["id"]
        campos_atualizados.append("analises_cowork")

        # 4. Atualizar processos.analysis_data com TODOS os campos
        if processo_id:
            analysis_data = {
                "resumo": norm["resumo_fato"],
                "achadosChave": norm.get("achados_chave", []),
                "recomendacoes": norm.get("recomendacoes", []),
                "inconsistencias": norm.get("inconsistencias", []),
                "teses": norm.get("teses_lista", []),
                "nulidades": norm.get("nulidades", []),
                "kpis": norm.get("kpis"),
                "crimePrincipal": norm["crime_principal"],
                "estrategia": norm["estrategia_atual"],
                "pontosCriticos": norm["pontos_criticos"],
                "radarLiberdade": norm.get("radar_liberdade"),
                "saneamento": norm.get("saneamento"),
                "versaoModelo": norm.get("model"),
                # Campos ricos v7
                "painelControle": norm.get("painel_controle"),
                "painelDepoentes": norm.get("painel_depoentes", []),
                "imputacoes": norm.get("imputacoes", []),
                "acusacaoRadiografia": norm.get("acusacao_radiografia"),
                "matrizGuerra": norm.get("matriz_guerra", []),
                "laudos": norm.get("laudos"),
                "inventarioProvas": norm.get("inventario_provas", []),
                "mapaDocumental": norm.get("mapa_documental", []),
                "alertasOperacionais": norm.get("alertas_operacionais", []),
                "checklistTatico": norm.get("checklist_tatico", []),
                "orientacaoAssistido": norm.get("orientacao_assistido", ""),
                "perspectivaPlenaria": norm.get("perspectiva_plenaria", ""),
                # Campos específicos por atribuição
                "ritoBifasico": norm.get("rito_bifasico"),
                "preparacaoPlenario": norm.get("preparacao_plenario"),
                "cadeiaCustodia": norm.get("cadeia_custodia"),
                "licitudeProva": norm.get("licitude_prova"),
                "calculoPena": norm.get("calculo_pena"),
                "cronogramaBeneficios": norm.get("cronograma_beneficios"),
                "mpu": norm.get("mpu"),
                "contextoRelacional": norm.get("contexto_relacional"),
                # Payload completo para acesso raw
                "payload": norm["payload"],
            }
            client.table("processos").update({
                "analysis_data": analysis_data,
                "analysis_status": "completed",
                "analyzed_at": norm.get("gerado_em"),
                "analysis_version": 2 if norm["schema_version"] == "2.0" else 1,
            }).eq("id", processo_id).execute()
            campos_atualizados.append("processos.analysis_data")

        # 5. Atualizar assistidos.analysis_data
        if assistido_id:
            assistido_data = {
                "resumo": norm["resumo_fato"],
                "achadosChave": norm.get("achados_chave", []),
                "inconsistencias": norm.get("inconsistencias", []),
                "radarLiberdade": norm.get("radar_liberdade"),
                "crimePrincipal": norm["crime_principal"],
                "estrategia": norm["estrategia_atual"],
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
            testemunhas_atualizadas = await self._atualizar_testemunhas(client, processo_id, perguntas)
            if testemunhas_atualizadas:
                campos_atualizados.append(f"testemunhas[{testemunhas_atualizadas}]")

        # 7. Atualizar depoimentos_analise com contradições
        contradicoes = norm["payload"].get("contradicoes", [])
        if contradicoes and processo_id:
            await self._atualizar_contradicoes(client, processo_id, contradicoes)
            campos_atualizados.append("depoimentos_analise")

        return {
            "analise_cowork_id": analise_cowork_id,
            "tipo": norm["tipo"],
            "schema_version": norm["schema_version"],
            "campos_atualizados": campos_atualizados,
            "testemunhas_atualizadas": testemunhas_atualizadas,
            "sucesso": True,
            "mensagem": f"Análise v{norm['schema_version']} '{norm['tipo']}' importada.",
        }

    # ==========================================
    # NORMALIZAÇÃO (3 schemas → formato unificado)
    # ==========================================

    def _normalizar(self, analise: dict) -> dict:
        meta = analise.get("_metadata", {})
        schema_version = meta.get("schema_version", analise.get("schema_version", "1.0"))

        if schema_version == "2.0":
            return self._normalizar_v2(analise, meta)
        elif "pessoas" in analise or "acusacoes" in analise or "depoimentos" in analise:
            return self._normalizar_cowork(analise, meta)
        else:
            return self._normalizar_legado(analise, meta)

    def _normalizar_v2(self, a: dict, meta: dict) -> dict:
        """Schema v2 (Framework v7) — campos completos por atribuição."""

        # Assistido pode ser string ou object
        assistido = a.get("assistido", {})
        assistido_nome = assistido.get("nome", assistido) if isinstance(assistido, dict) else str(assistido)

        # Processo pode ser string ou object
        processo = a.get("processo", {})
        processo_numero = processo.get("numero", processo) if isinstance(processo, dict) else str(processo)

        # Imputações
        imputacoes = a.get("imputacoes", [])
        crime_principal = ""
        if imputacoes:
            first = imputacoes[0]
            crime_principal = first.get("tipoPenal", first.get("crime", ""))

        # Estratégia
        estrategia = a.get("estrategia", {})
        estrategia_texto = ""
        tese_defesa = ""
        teses_lista = []
        if isinstance(estrategia, dict):
            tese_defesa = estrategia.get("tesePrincipal", "")
            pilares = estrategia.get("pilares", [])
            teses_lista = [tese_defesa] + pilares if tese_defesa else pilares
            estrategia_texto = tese_defesa
        elif isinstance(estrategia, str):
            estrategia_texto = estrategia
            tese_defesa = estrategia

        # Teses (pode vir separado)
        teses_raw = a.get("teses", {})
        if isinstance(teses_raw, dict) and teses_raw.get("principal"):
            tese_defesa = teses_raw["principal"]
            teses_lista = [tese_defesa] + teses_raw.get("subsidiarias", [])

        # Testemunhas → perguntas por testemunha
        testemunhas = a.get("testemunhas", [])
        perguntas_por_testemunha = []
        for t in testemunhas:
            pergs = t.get("perguntasSugeridas", t.get("perguntas_sugeridas", []))
            if pergs:
                perguntas_por_testemunha.append({
                    "nome": t.get("nome", ""),
                    "tipo": t.get("tipo", "TESTEMUNHA"),
                    "perguntas": pergs,
                })

        # Depoimentos → contradições
        depoimentos = a.get("depoimentosAnalise", a.get("depoimentos", []))
        contradicoes = []
        depoimentos_formatados = []
        for dep in depoimentos:
            nome = dep.get("nome", "")
            contras = dep.get("contradicoes", [])
            for c in contras:
                if isinstance(c, str):
                    contradicoes.append({"testemunha": nome, "contradicao": c, "delegacia": "", "juizo": ""})
                elif isinstance(c, dict):
                    contradicoes.append({
                        "testemunha": nome,
                        "delegacia": c.get("delegacia", c.get("versaoDelegacia", "")),
                        "juizo": c.get("juizo", c.get("versaoJuizo", "")),
                        "contradicao": c.get("contradicao", c.get("descricao", "")),
                    })
            depoimentos_formatados.append({
                "nome": nome,
                "tipo": dep.get("tipo", "testemunha"),
                "resumo": dep.get("resumo", ""),
                "fase_policial": dep.get("versaoDelegacia", dep.get("fase_policial", "")),
                "fase_judicial": dep.get("versaoJuizo", dep.get("fase_judicial", "")),
                "favoravel_defesa": dep.get("favoravel_defesa"),
                "credibilidade": dep.get("credibilidade"),
                "impacto_acusacao": dep.get("impacto_acusacao", dep.get("impactoAcusacao", "")),
                "impacto_defesa": dep.get("impacto_defesa", dep.get("impactoDefesa", "")),
                "contradicoes": contras,
                "perguntas_sugeridas": dep.get("perguntasSugeridas", dep.get("perguntas_sugeridas", [])),
                "deducao": dep.get("deducao", ""),
            })

        # Nulidades
        nulidades = a.get("nulidades", [])
        nulidades_fmt = []
        for n in nulidades:
            if isinstance(n, str):
                nulidades_fmt.append({"tipo": "processual", "descricao": n, "severidade": "media", "fundamentacao": ""})
            elif isinstance(n, dict):
                nulidades_fmt.append(n)

        # KPIs
        kpis = a.get("kpis", [])
        kpis_obj = None
        if isinstance(kpis, list):
            kpis_obj = {}
            for kpi in kpis:
                if isinstance(kpi, dict):
                    label = kpi.get("label", "").lower().replace(" ", "")
                    kpis_obj[f"total{label.title()}"] = kpi.get("valor", 0)
        elif isinstance(kpis, dict):
            kpis_obj = kpis

        # Pessoas (merge testemunhas + ofendido + assistido)
        pessoas = a.get("pessoas", [])
        if not pessoas:
            # Reconstruir de assistido + ofendido + testemunhas
            if isinstance(assistido, dict) and assistido.get("nome"):
                pessoas.append({**assistido, "tipo": "REU"})
            ofendido = a.get("ofendido", {})
            if isinstance(ofendido, dict) and ofendido.get("nome"):
                pessoas.append({**ofendido, "tipo": "VITIMA"})
            for t in testemunhas:
                pessoas.append({**t, "tipo": t.get("tipo", "TESTEMUNHA").upper()})

        return {
            "schema_version": "2.0",
            "tipo": meta.get("tipo", a.get("tipo", "desconhecido")),
            "gerado_em": meta.get("gerado_em", a.get("gerado_em")),
            "model": meta.get("model"),
            "resumo_fato": a.get("resumo_fatos", a.get("resumo_fato", a.get("resumo", ""))),
            "tese_defesa": tese_defesa,
            "estrategia_atual": estrategia_texto,
            "crime_principal": crime_principal,
            "pontos_criticos": a.get("pontos_criticos", a.get("achados_chave", [])),
            "achados_chave": a.get("achados_chave", a.get("achadosChave", [])),
            "recomendacoes": a.get("recomendacoes", []),
            "inconsistencias": a.get("inconsistencias", []),
            "teses_lista": teses_lista,
            "nulidades": nulidades_fmt,
            "pessoas": pessoas,
            "cronologia": a.get("cronologia", []),
            "imputacoes": imputacoes,
            "radar_liberdade": a.get("radar_liberdade", a.get("radarLiberdade")),
            "saneamento": a.get("saneamento"),
            "matriz_guerra": a.get("matriz_guerra", a.get("matrizGuerra", [])),
            "laudos": a.get("laudos"),
            # Campos v2/v7 específicos
            "painel_controle": a.get("painel_controle", a.get("painelControle")),
            "painel_depoentes": a.get("painel_depoentes", a.get("painelDepoentes", [])),
            "acusacao_radiografia": a.get("acusacao_radiografia", a.get("acusacaoRadiografia")),
            "inventario_provas": a.get("inventarioProvas", a.get("inventario_provas", [])),
            "mapa_documental": a.get("mapaDocumental", a.get("mapa_documental", [])),
            "alertas_operacionais": a.get("alertas_operacionais", a.get("alertasOperacionais", [])),
            "checklist_tatico": a.get("checklist_tatico", a.get("checklistTatico", [])),
            "orientacao_assistido": a.get("orientacaoAssistido", a.get("orientacao_assistido", "")),
            "perspectiva_plenaria": a.get("perspectivaPlenaria", a.get("perspectiva_plenaria", "")),
            # Campos específicos por atribuição
            "rito_bifasico": a.get("ritoBifasico", a.get("rito_bifasico")),
            "preparacao_plenario": a.get("preparacaoPlenario", a.get("preparacao_plenario")),
            "cadeia_custodia": a.get("cadeiaCustodia", a.get("cadeia_custodia")),
            "licitude_prova": a.get("licitudeProva", a.get("licitude_prova")),
            "calculo_pena": a.get("calculoPena", a.get("calculo_pena")),
            "cronograma_beneficios": a.get("cronogramaBeneficios", a.get("cronograma_beneficios")),
            "mpu": a.get("mpu"),
            "contexto_relacional": a.get("contextoRelacional", a.get("contexto_relacional")),
            "kpis": kpis_obj,
            "payload": {
                "perguntas_por_testemunha": perguntas_por_testemunha,
                "contradicoes": contradicoes,
                "orientacao_ao_assistido": a.get("orientacaoAssistido", a.get("orientacao_assistido", "")),
                "perspectiva_plenaria": a.get("perspectivaPlenaria", a.get("perspectiva_plenaria", "")),
                "pessoas": pessoas,
                "cronologia": a.get("cronologia", []),
                "depoimentos": depoimentos_formatados,
                "locais": a.get("locais", []),
                "alertas_operacionais": a.get("alertas_operacionais", a.get("alertasOperacionais", [])),
                "checklist_tatico": a.get("checklist_tatico", a.get("checklistTatico", [])),
                "inventario_provas": a.get("inventarioProvas", a.get("inventario_provas", [])),
                "mapa_documental": a.get("mapaDocumental", a.get("mapa_documental", [])),
            },
        }

    def _normalizar_cowork(self, a: dict, meta: dict) -> dict:
        """Schema v1 Cowork (pessoas, cronologia, acusacoes...)"""
        # Delegate to v2 normalizer — v1 is a subset of v2
        a_with_meta = {**a, "_metadata": {**meta, "schema_version": "1.0"}}
        result = self._normalizar_v2(a_with_meta, meta)
        result["schema_version"] = "1.0"
        return result

    def _normalizar_legado(self, a: dict, meta: dict) -> dict:
        """Schema legado (resumo_fato, tese_defesa, payload...)"""
        payload = a.get("payload", {})
        return {
            "schema_version": "1.0",
            "tipo": a.get("tipo", meta.get("tipo", "desconhecido")),
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
            "imputacoes": [],
            "radar_liberdade": None,
            "saneamento": None,
            "matriz_guerra": [],
            "laudos": None,
            "painel_controle": None,
            "painel_depoentes": [],
            "acusacao_radiografia": None,
            "inventario_provas": [],
            "mapa_documental": [],
            "alertas_operacionais": [],
            "checklist_tatico": [],
            "orientacao_assistido": payload.get("orientacao_ao_assistido", ""),
            "perspectiva_plenaria": payload.get("perspectiva_plenaria", ""),
            "rito_bifasico": None,
            "preparacao_plenario": None,
            "cadeia_custodia": None,
            "licitude_prova": None,
            "calculo_pena": None,
            "cronograma_beneficios": None,
            "mpu": None,
            "contexto_relacional": None,
            "kpis": None,
            "payload": payload,
        }

    # ==========================================
    # HELPERS
    # ==========================================

    async def _atualizar_testemunhas(self, client, processo_id: int, perguntas: list[dict]) -> int:
        testemunhas_db = (
            client.table("testemunhas").select("id, nome").eq("processo_id", processo_id).execute()
        )
        testemunhas_map = {t["nome"].lower().strip(): t["id"] for t in testemunhas_db.data}
        atualizadas = 0
        for item in perguntas:
            nome_busca = item.get("nome", "").lower().strip()
            match_id = testemunhas_map.get(nome_busca)
            if match_id:
                pergs = item.get("perguntas", [])
                # Perguntas podem ser strings ou objects {pergunta, objetivo}
                pergs_text = [p.get("pergunta", p) if isinstance(p, dict) else p for p in pergs]
                client.table("testemunhas").update({
                    "perguntas_sugeridas": _json.dumps(pergs_text, ensure_ascii=False),
                }).eq("id", match_id).execute()
                atualizadas += 1
        return atualizadas

    async def _atualizar_contradicoes(self, client, processo_id: int, contradicoes: list[dict]) -> None:
        casos_result = client.table("processos").select("caso_id").eq("id", processo_id).execute()
        caso_id = None
        if casos_result.data and casos_result.data[0].get("caso_id"):
            caso_id = casos_result.data[0]["caso_id"]
        if not caso_id:
            return
        for c in contradicoes:
            nome = c.get("testemunha")
            if not nome:
                continue
            existing = client.table("depoimentos_analise").select("id").eq("caso_id", caso_id).eq("testemunha_nome", nome).execute()
            update_data = {
                "caso_id": caso_id,
                "testemunha_nome": nome,
                "versao_delegacia": c.get("delegacia"),
                "versao_juizo": c.get("juizo"),
                "contradicoes_identificadas": c.get("contradicao"),
            }
            if existing.data:
                client.table("depoimentos_analise").update(update_data).eq("id", existing.data[0]["id"]).execute()
            else:
                client.table("depoimentos_analise").insert(update_data).execute()

    async def _baixar_json_drive(self, folder_id: str, arquivo_nome: str, access_token: str) -> dict:
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
                raise ValueError(f"Arquivo '{arquivo_nome}' não encontrado na pasta {folder_id}")
            file_id = files[0]["id"]
            dl = await client.get(
                f"https://www.googleapis.com/drive/v3/files/{file_id}",
                params={"alt": "media"},
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=30.0,
            )
            dl.raise_for_status()
            return dl.json()


_service: CoworkImportService | None = None


def get_cowork_import_service() -> CoworkImportService:
    global _service
    if _service is None:
        _service = CoworkImportService()
    return _service
