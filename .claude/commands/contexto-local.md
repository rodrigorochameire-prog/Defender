# /contexto-local — Contexto Socioeconômico de Município

Gera parágrafo contextual com dados demográficos e de violência de um município,
pronto para inserir em dossiês e peças da Defensoria.

## Uso

/contexto-local <município>

Exemplos:
- /contexto-local camaçari
- /contexto-local lauro de freitas
- /contexto-local salvador

## Mapeamento de municípios (códigos IBGE)

Use esta tabela para os municípios mais frequentes da 7ª Regional:

| Município | Código IBGE |
|-----------|-------------|
| Camaçari | 2905701 |
| Lauro de Freitas | 2919207 |
| Salvador | 2927408 |
| Dias d'Ávila | 2910057 |
| Simões Filho | 2930709 |
| Candeias | 2906501 |
| Mata de São João | 2921005 |
| Pojuca | 2925204 |
| Catu | 2907905 |
| Alagoinhas | 2900702 |

Para outros municípios, busque o código em:
https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome

## Instruções

Ao receber o município "$ARGUMENTS":

1. Identifique o código IBGE na tabela acima. Se não estiver na tabela,
   use WebSearch para encontrar: "código IBGE {município}"

2. Chame a tool `dados_localidade` com:
   - consulta: "{código IBGE}"
   - incluir: ["demografia", "violencia"]

3. Com os dados retornados, gere um PARÁGRAFO NARRATIVO contextual:

   "{Município}/{UF}, com população de {X} habitantes (IBGE {ano}),
   localizado na {mesorregião}, registrou {N} homicídios em {ano mais recente}
   (Atlas da Violência/IPEA). [Se disponível: compare com anos anteriores para
   mostrar tendência — aumento/redução]. O contexto socioeconômico da região
   [complementar se relevante para a tese]."

4. Após o parágrafo, inclua os dados brutos em lista para referência.

5. Este parágrafo é para uso em dossiês e peças — mantenha tom técnico e objetivo.
