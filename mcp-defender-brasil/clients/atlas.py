import httpx

BASE_URL = "https://www.ipea.gov.br/atlasviolencia/api/v1"

SERIES = {
    "homicidios": 328,
    "taxa_homicidios": 20,
}


async def buscar_violencia(
    cod_ibge: str, serie: str = "homicidios"
) -> list[dict]:
    serie_id = SERIES.get(serie, SERIES["homicidios"])
    url = f"{BASE_URL}/valores-series-por-regioes/{serie_id}/4/{cod_ibge}"
    async with httpx.AsyncClient(timeout=20) as client:
        try:
            resp = await client.get(url)
            resp.raise_for_status()
        except (httpx.TimeoutException, httpx.HTTPStatusError):
            return []
    data = resp.json()
    return [
        {
            "ano": int(item["periodo"][:4]),
            "valor": int(float(item["valor"])),
            "municipio": item.get("sigla", ""),
        }
        for item in data
        if item.get("valor")
    ]
