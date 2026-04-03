import httpx

BASE_URL = "https://brasilapi.com.br/api"


async def buscar_cep(cep: str) -> dict:
    cleaned = cep.replace("-", "").replace(".", "").strip()
    url = f"{BASE_URL}/cep/v1/{cleaned}"
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(url)
        resp.raise_for_status()
    data = resp.json()
    return {
        "cep": data.get("cep", ""),
        "logradouro": data.get("street", ""),
        "bairro": data.get("neighborhood", ""),
        "cidade": data.get("city", ""),
        "uf": data.get("state", ""),
    }
