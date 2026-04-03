import pytest
import httpx
import respx
from clients.datajud import buscar_processos

MOCK_RESPONSE = {
    "hits": {
        "total": {"value": 1},
        "hits": [
            {
                "_source": {
                    "numeroProcesso": "00123456720238130001",
                    "classe": {"codigo": 1116, "nome": "Agravo em Recurso Especial"},
                    "tribunal": "STJ",
                    "grau": "SUP",
                    "dataAjuizamento": "2023-06-15T00:00:00.000Z",
                    "assuntos": [{"codigo": 3421, "nome": "Homicídio qualificado"}],
                    "orgaoJulgador": {"codigo": 10, "nome": "5ª Turma"},
                    "movimentos": [
                        {
                            "codigo": 22,
                            "nome": "Julgado",
                            "dataHora": "2024-01-20T14:30:00.000Z",
                        }
                    ],
                }
            }
        ],
    }
}


@pytest.mark.asyncio
async def test_buscar_processos_by_assunto():
    with respx.mock:
        respx.post(
            "https://api-publica.datajud.cnj.jus.br/api_publica_stj/_search"
        ).mock(return_value=httpx.Response(200, json=MOCK_RESPONSE))

        results = await buscar_processos(
            query="homicídio qualificado", tribunal="stj", campo="assuntos", limite=5
        )

    assert len(results) == 1
    assert results[0]["numero"] == "00123456720238130001"
    assert results[0]["classe"] == "Agravo em Recurso Especial"
    assert results[0]["tribunal"] == "STJ"
    assert results[0]["assuntos"] == ["Homicídio qualificado"]
    assert results[0]["orgao"] == "5ª Turma"
    assert results[0]["ultima_movimentacao"]["nome"] == "Julgado"


@pytest.mark.asyncio
async def test_buscar_processos_empty():
    with respx.mock:
        respx.post(
            "https://api-publica.datajud.cnj.jus.br/api_publica_stj/_search"
        ).mock(
            return_value=httpx.Response(
                200, json={"hits": {"total": {"value": 0}, "hits": []}}
            )
        )

        results = await buscar_processos(query="xyz inexistente", tribunal="stj")

    assert results == []


@pytest.mark.asyncio
async def test_buscar_processos_by_numero():
    with respx.mock:
        respx.post(
            "https://api-publica.datajud.cnj.jus.br/api_publica_stj/_search"
        ).mock(return_value=httpx.Response(200, json=MOCK_RESPONSE))

        results = await buscar_processos(
            query="0012345-67.2023.8.13.0001", tribunal="stj", campo="numero"
        )

    assert len(results) == 1
