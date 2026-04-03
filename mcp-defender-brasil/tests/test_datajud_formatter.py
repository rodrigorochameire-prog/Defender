from formatters.datajud import formatar_processos


def test_formatar_processos():
    processos = [
        {
            "numero": "00123456720238130001",
            "classe": "Agravo em Recurso Especial",
            "tribunal": "STJ",
            "grau": "SUP",
            "data_ajuizamento": "2023-06-15T00:00:00.000Z",
            "assuntos": ["Homicídio qualificado"],
            "orgao": "5ª Turma",
            "ultima_movimentacao": {"nome": "Julgado", "data": "2024-01-20T14:30:00.000Z"},
        }
    ]
    text = formatar_processos(processos, query="homicídio", tribunal="stj")
    assert "DataJud" in text
    assert "Agravo em Recurso Especial" in text
    assert "5ª Turma" in text
    assert "Homicídio qualificado" in text
    assert "Julgado" in text


def test_formatar_processos_vazio():
    text = formatar_processos([], query="xyz", tribunal="stj")
    assert "Nenhum processo encontrado" in text
