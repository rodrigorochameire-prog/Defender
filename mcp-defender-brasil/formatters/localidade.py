from __future__ import annotations

from typing import Optional


def _formatar_numero(n: int) -> str:
    return f"{n:,}".replace(",", ".")


def formatar_localidade(
    municipio: Optional[dict] = None,
    populacao: Optional[dict] = None,
    violencia: Optional[list] = None,
    endereco: Optional[dict] = None,
) -> str:
    lines = []

    if endereco and not municipio:
        lines.append(f"## {endereco['cidade']}/{endereco['uf']}\n")
        lines.append("### Endereço")
        lines.append(f"- CEP: {endereco['cep']}")
        if endereco.get("logradouro"):
            lines.append(f"- Logradouro: {endereco['logradouro']}")
        if endereco.get("bairro"):
            lines.append(f"- Bairro: {endereco['bairro']}")
        return "\n".join(lines)

    if municipio:
        lines.append(f"## {municipio['nome']}/{municipio['uf']} (IBGE: {municipio['cod_ibge']})\n")

    if populacao:
        lines.append("### Demografia")
        lines.append(f"- População: {_formatar_numero(populacao['populacao'])} hab. (IBGE {populacao['ano']})")
        if municipio:
            lines.append(f"- Região: {municipio.get('regiao', '—')} / {municipio.get('mesorregiao', '—')}")
            lines.append(f"- UF: {municipio.get('uf_nome', '—')} ({municipio.get('uf', '—')})")
        lines.append("")

    if violencia:
        lines.append("### Violência (Atlas da Violência / IPEA)")
        sorted_v = sorted(violencia, key=lambda x: x["ano"], reverse=True)
        for v in sorted_v[:5]:
            lines.append(f"- Homicídios ({v['ano']}): {v['valor']}")
        lines.append("")
        lines.append("Fonte: Atlas da Violência (IPEA/FBSP).")

    return "\n".join(lines)
