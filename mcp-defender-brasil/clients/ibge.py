import httpx

BASE_URL = "https://servicodados.ibge.gov.br/api"


async def buscar_municipio(cod_ibge: str) -> dict:
    url = f"{BASE_URL}/v1/localidades/municipios/{cod_ibge}"
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(url)
        resp.raise_for_status()
    data = resp.json()
    meso = data.get("microrregiao", {}).get("mesorregiao", {})
    uf_data = meso.get("UF", {})
    return {
        "nome": data.get("nome", ""),
        "cod_ibge": str(data.get("id", "")),
        "uf": uf_data.get("sigla", ""),
        "uf_nome": uf_data.get("nome", ""),
        "mesorregiao": meso.get("nome", ""),
        "regiao": uf_data.get("regiao", {}).get("nome", ""),
    }


async def buscar_populacao(cod_ibge: str) -> dict:
    url = (
        f"{BASE_URL}/v3/agregados/6579/periodos/-1/variaveis/9324"
        f"?localidades=N6%5B{cod_ibge}%5D"
    )
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(url)
        resp.raise_for_status()
    data = resp.json()
    series = data[0]["resultados"][0]["series"][0]["serie"]
    ano = max(series.keys())
    return {
        "populacao": int(series[ano]),
        "ano": ano,
    }
