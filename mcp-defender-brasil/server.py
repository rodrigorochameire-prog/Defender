from fastmcp import FastMCP
from clients.datajud import buscar_processos
from clients.ibge import buscar_municipio, buscar_populacao
from clients.atlas import buscar_violencia
from clients.brasilapi import buscar_cep
from formatters.datajud import formatar_processos
from formatters.localidade import formatar_localidade

mcp = FastMCP(
    "defender-brasil",
    instructions="Dados judiciais e demográficos brasileiros para a Defensoria Pública.",
)


@mcp.tool()
async def consultar_datajud(
    query: str,
    tribunal: str = "stj",
    campo: str = "assuntos",
    limite: int = 5,
) -> str:
    """Busca processos judiciais em qualquer tribunal brasileiro via DataJud/CNJ.
    Retorna metadados, classe, assuntos, movimentações e órgão julgador.
    Tribunais: stj, tjba, trf1..trf6, tj{uf}, trt1..trt24."""
    processos = await buscar_processos(query, tribunal, campo, limite)
    return formatar_processos(processos, query, tribunal)


@mcp.tool()
async def dados_localidade(
    consulta: str,
    incluir: list[str] | None = None,
) -> str:
    """Dados demográficos, violência e endereço de localidades brasileiras.
    Consulta: código IBGE (7 dígitos), UF (2 letras) ou CEP (8 dígitos).
    Incluir: demografia, violencia, endereco. Fontes: IBGE, Atlas da Violência, BrasilAPI."""
    if incluir is None:
        incluir = ["demografia"]

    cleaned = consulta.strip().replace("-", "").replace(".", "")
    municipio_data = None
    pop_data = None
    viol_data = None
    end_data = None

    if len(cleaned) == 8 and cleaned.isdigit():
        # CEP
        end_data = await buscar_cep(cleaned)
        return formatar_localidade(endereco=end_data)

    if len(cleaned) == 7 and cleaned.isdigit():
        cod = cleaned
    elif len(cleaned) == 2 and cleaned.isalpha():
        # UF — retorna info básica
        return f"## {cleaned.upper()}\n\nConsulta por UF: use código IBGE do município para dados completos."
    else:
        return f"Formato não reconhecido: '{consulta}'. Use código IBGE (7 dígitos), CEP (8 dígitos) ou UF (2 letras)."

    if "demografia" in incluir:
        municipio_data = await buscar_municipio(cod)
        pop_data = await buscar_populacao(cod)

    if "violencia" in incluir:
        viol_data = await buscar_violencia(cod)

    return formatar_localidade(
        municipio=municipio_data,
        populacao=pop_data,
        violencia=viol_data,
    )


if __name__ == "__main__":
    mcp.run()
