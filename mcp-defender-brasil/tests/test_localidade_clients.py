import pytest
import httpx
import respx
from clients.ibge import buscar_municipio, buscar_populacao
from clients.atlas import buscar_violencia
from clients.brasilapi import buscar_cep

MOCK_MUNICIPIO = {
    "id": 2905701,
    "nome": "Camaçari",
    "microrregiao": {
        "id": 29021,
        "nome": "Salvador",
        "mesorregiao": {
            "id": 2905,
            "nome": "Metropolitana de Salvador",
            "UF": {
                "id": 29,
                "sigla": "BA",
                "nome": "Bahia",
                "regiao": {"id": 2, "sigla": "NE", "nome": "Nordeste"},
            },
        },
    },
}

MOCK_POPULACAO = [
    {
        "id": "9324",
        "variavel": "População residente estimada",
        "unidade": "Pessoas",
        "resultados": [
            {
                "classificacoes": [],
                "series": [
                    {
                        "localidade": {"id": "2905701", "nome": "Camaçari (BA)"},
                        "serie": {"2025": "321636"},
                    }
                ],
            }
        ],
    }
]

MOCK_VIOLENCIA = [
    {"cod": "2905701", "sigla": "Camaçari", "valor": "250", "periodo": "2023-01-15"},
    {"cod": "2905701", "sigla": "Camaçari", "valor": "255", "periodo": "2022-01-15"},
]

MOCK_CEP = {
    "cep": "01001000",
    "state": "SP",
    "city": "São Paulo",
    "neighborhood": "Sé",
    "street": "Praça da Sé",
    "service": "open-cep",
}


@pytest.mark.asyncio
async def test_buscar_municipio():
    with respx.mock:
        respx.get(
            "https://servicodados.ibge.gov.br/api/v1/localidades/municipios/2905701"
        ).mock(return_value=httpx.Response(200, json=MOCK_MUNICIPIO))

        result = await buscar_municipio("2905701")

    assert result["nome"] == "Camaçari"
    assert result["uf"] == "BA"
    assert result["mesorregiao"] == "Metropolitana de Salvador"
    assert result["regiao"] == "Nordeste"


@pytest.mark.asyncio
async def test_buscar_populacao():
    with respx.mock:
        respx.get(
            url__regex=r"servicodados\.ibge\.gov\.br/api/v3/agregados/6579/.*"
        ).mock(return_value=httpx.Response(200, json=MOCK_POPULACAO))

        result = await buscar_populacao("2905701")

    assert result["populacao"] == 321636
    assert result["ano"] == "2025"


@pytest.mark.asyncio
async def test_buscar_violencia():
    with respx.mock:
        respx.get(
            url__regex=r"ipea\.gov\.br/atlasviolencia/api/v1/valores-series-por-regioes/.*"
        ).mock(return_value=httpx.Response(200, json=MOCK_VIOLENCIA))

        result = await buscar_violencia("2905701")

    assert len(result) == 2
    assert result[0]["valor"] == 250
    assert result[0]["ano"] == 2023


@pytest.mark.asyncio
async def test_buscar_cep():
    with respx.mock:
        respx.get("https://brasilapi.com.br/api/cep/v1/01001000").mock(
            return_value=httpx.Response(200, json=MOCK_CEP)
        )

        result = await buscar_cep("01001-000")

    assert result["cidade"] == "São Paulo"
    assert result["uf"] == "SP"
    assert result["logradouro"] == "Praça da Sé"
