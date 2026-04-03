def formatar_processos(processos: list[dict], query: str, tribunal: str) -> str:
    if not processos:
        return f'## DataJud: "{query}" ({tribunal.upper()})\n\nNenhum processo encontrado para esta consulta.'

    lines = [f'## DataJud: "{query}" ({tribunal.upper()}, {len(processos)} resultado{"s" if len(processos) != 1 else ""})\n']

    for i, p in enumerate(processos, 1):
        data_aj = p["data_ajuizamento"][:10] if p["data_ajuizamento"] else "—"
        assuntos = ", ".join(p["assuntos"]) if p["assuntos"] else "—"
        mov = p.get("ultima_movimentacao")
        mov_text = f'{mov["nome"]} ({mov["data"][:10]})' if mov else "—"

        lines.append(f"{i}. {p['numero']} — {p['classe']}")
        lines.append(f"   Tribunal: {p['tribunal']} | Grau: {p['grau']} | Ajuizamento: {data_aj}")
        lines.append(f"   Assuntos: {assuntos}")
        lines.append(f"   Órgão: {p['orgao']}")
        lines.append(f"   Última movimentação: {mov_text}")
        lines.append("")

    return "\n".join(lines)
