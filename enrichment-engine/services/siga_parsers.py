"""Pure parsers for SIGA Carreira DataTables. Header-normalized + tolerant. No I/O."""
import re
import unicodedata


def _norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", s).strip().lower()


def parse_br_date(s: str | None) -> str | None:
    m = re.match(r"^(\d{2})/(\d{2})/(\d{4})$", (s or "").strip())
    if not m:
        return None
    d, mo, y = m.groups()
    return f"{y}-{mo}-{d}"


def _row(headers: list[str], cells: list[str]) -> dict[str, str]:
    return {_norm(h): (cells[i] if i < len(cells) else "") for i, h in enumerate(headers)}


def _get(row: dict[str, str], *aliases: str) -> str | None:
    for a in aliases:
        v = row.get(_norm(a))
        if v not in (None, "", "-"):
            return v
    return None


def _bool_cell(v: str | None) -> bool:
    n = _norm(v or "")
    return bool(n) and n not in ("nao", "-")


def parse_licenca(headers: list[str], cells: list[str]) -> dict:
    r = _row(headers, cells)
    return {
        "tipo": "licenca",
        "numeroSolicitacao": _get(r, "Número Solicitação", "Numero Solicitação"),
        "dataInicio": parse_br_date(_get(r, "Data Início", "Data Inicio")),
        "dataFim": parse_br_date(_get(r, "Data Final")),
        "situacaoSiga": _get(r, "Situação"),
        "motivo": _get(r, "Motivo Ausência", "Motivo Ausencia"),
        "dataPublicacao": parse_br_date(_get(r, "Data Publicação", "Publicação")),
        "nSiga": _get(r, "Nº Siga"),
        "observacao": _get(r, "Observação"),
        "interrompida": _bool_cell(_get(r, "Interrupção")),
        "suspensa": _bool_cell(_get(r, "Suspensão")),
    }


def parse_outra_ausencia(headers: list[str], cells: list[str]) -> dict:
    d = parse_licenca(headers, cells)
    d["tipo"] = "outra_ausencia"
    d["suspensa"] = False  # Outras Ausências has no Suspensão column
    return d


def parse_ferias(headers: list[str], cells: list[str]) -> dict:
    r = _row(headers, cells)
    return {
        "tipo": "ferias",
        "numeroSolicitacao": _get(r, "Número Solicitação", "Numero Solicitação"),
        "dataInicio": parse_br_date(_get(r, "Data Início", "Data Inicio")),
        "dataFim": parse_br_date(_get(r, "Data Final")),
        "situacaoSiga": _get(r, "Situação"),
        "provimento": _get(r, "Provimento"),
        "dataPublicacao": parse_br_date(_get(r, "Data Publicação", "Publicação")),
        "nSiga": _get(r, "Nº Siga"),
        "suspensa": _bool_cell(_get(r, "Suspensão")),
    }


def parse_afastamento(headers: list[str], cells: list[str]) -> dict:
    r = _row(headers, cells)
    return {
        "tipo": "afastamento",
        "numeroSolicitacao": _get(r, "Número da Solicitação", "Número Solicitação"),
        "dataPublicacao": parse_br_date(_get(r, "Data de Publicação", "Data Publicação")),
        "dataInicio": parse_br_date(_get(r, "Data Inicial", "Data Início")),
        "dataFim": parse_br_date(_get(r, "Data Final")),
        "situacaoSiga": _get(r, "Situação"),
    }
