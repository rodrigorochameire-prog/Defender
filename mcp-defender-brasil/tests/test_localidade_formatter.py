from formatters.localidade import formatar_localidade


def test_formatar_com_demografia_e_violencia():
    municipio = {"nome": "Camaçari", "cod_ibge": "2905701", "uf": "BA", "uf_nome": "Bahia", "mesorregiao": "Metropolitana de Salvador", "regiao": "Nordeste"}
    populacao = {"populacao": 321636, "ano": "2025"}
    violencia = [
        {"ano": 2023, "valor": 250, "municipio": "Camaçari"},
        {"ano": 2022, "valor": 255, "municipio": "Camaçari"},
    ]
    text = formatar_localidade(municipio=municipio, populacao=populacao, violencia=violencia)
    assert "Camaçari/BA" in text
    assert "321.636" in text or "321636" in text
    assert "2023" in text
    assert "250" in text
    assert "IBGE" in text
    assert "Atlas da Violência" in text


def test_formatar_so_endereco():
    endereco = {"cep": "01001000", "logradouro": "Praça da Sé", "bairro": "Sé", "cidade": "São Paulo", "uf": "SP"}
    text = formatar_localidade(endereco=endereco)
    assert "Praça da Sé" in text
    assert "São Paulo/SP" in text
