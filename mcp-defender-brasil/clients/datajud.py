import httpx

BASE_URL = "https://api-publica.datajud.cnj.jus.br"
API_KEY = "cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw=="
HEADERS = {
    "Content-Type": "application/json",
    "Authorization": f"APIKey {API_KEY}",
}


def _build_query(query: str, campo: str, limite: int) -> dict:
    if campo == "numero":
        cleaned = query.replace("-", "").replace(".", "")
        return {
            "size": limite,
            "query": {"match": {"numeroProcesso": cleaned}},
        }
    if campo == "classe":
        return {
            "size": limite,
            "query": {"match": {"classe.nome": query}},
        }
    if campo == "texto_livre":
        return {
            "size": limite,
            "query": {
                "multi_match": {
                    "query": query,
                    "fields": ["assuntos.nome", "classe.nome", "orgaoJulgador.nome"],
                }
            },
        }
    # default: assuntos
    return {
        "size": limite,
        "query": {"match": {"assuntos.nome": query}},
    }


def _parse_hit(hit: dict) -> dict:
    src = hit.get("_source", {})
    movimentos = src.get("movimentos", [])
    ultima = movimentos[0] if movimentos else None
    return {
        "numero": src.get("numeroProcesso", ""),
        "classe": src.get("classe", {}).get("nome", ""),
        "tribunal": src.get("tribunal", ""),
        "grau": src.get("grau", ""),
        "data_ajuizamento": src.get("dataAjuizamento", ""),
        "assuntos": [a.get("nome", "") for a in src.get("assuntos", [])],
        "orgao": src.get("orgaoJulgador", {}).get("nome", ""),
        "ultima_movimentacao": (
            {"nome": ultima.get("nome", ""), "data": ultima.get("dataHora", "")}
            if ultima
            else None
        ),
    }


async def buscar_processos(
    query: str,
    tribunal: str = "stj",
    campo: str = "assuntos",
    limite: int = 5,
) -> list[dict]:
    url = f"{BASE_URL}/api_publica_{tribunal}/_search"
    body = _build_query(query, campo, limite)
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(url, json=body, headers=HEADERS)
        resp.raise_for_status()
    data = resp.json()
    hits = data.get("hits", {}).get("hits", [])
    return [_parse_hit(h) for h in hits]
