# MPU Importer — Design Spec

**Data:** 2026-05-04
**Autor:** Rodrigo Rocha Meire (via brainstorming colaborativo)
**Escopo:** importação automática de expedientes MPU (Medida Protetiva de Urgência) do PJe TJBA para o OMBUDS.
**Gap concreto:** 31 MPU pendentes no painel PJe nunca chegaram ao DB.
**Sucessor de:** Plano 2 da reforma MPU (skill `varredura-triagem` já preparada para classificar MPU defensivamente).

---

## Contexto

Hoje o pipeline `pje_intimacoes_scraper.py` → endpoint `/api/cron/pje-import` cobre apenas **Júri + Execuções Penais** de Camaçari. As intimações VVD (incluindo MPU) ficam inacessíveis ao OMBUDS, e o defensor precisa abrir cada expediente manualmente no PJe. Este spec descreve a extensão mínima necessária para fechar o gap.

**Atuação defensiva:** o assistido em MPU é o **REQUERIDO** (a pessoa demandada a cumprir a medida) — esta premissa atravessa todo o design (memória `user_atuacao_mpu`).

---

## Decisões tomadas no brainstorming

| # | Decisão | Justificativa |
|---|---|---|
| 1 | **Resolver sigilo no mesmo import** (não placeholder) | Importação completa em uma passada; assistido nomeado direto |
| 2 | **Cascata de identificação do REQUERIDO** com fallback placeholder | Robusto sem exigir intervenção humana per-processo |
| 3 | **One-shot agora, cron depois** | Resolve backlog de 31 com risco baixo; promoção a cron quando estabilizar |
| 4 | **Script standalone novo** (não refatorar scraper Júri) | Zero risco de regressão em pipeline que funciona; diff pequeno |
| 5 | **listView.seam como 1ª via, `ca` token como fallback** | Sessão de representante já tem privilégio (memória `feedback_pje_sessao_representante`) |

---

## Arquitetura

Novo script único `scripts/pje_mpu_import.py` (Python 3, ~300 linhas estimadas), fluxo linear sem concorrência:

```
1. Login HTTP no PJe (reusa login_requests do scraper Júri)
2. Navegar até VVD Camaçari → painel de expedientes pendentes
3. Parsear lista de expedientes
4. Para CADA expediente:
   a. resolve_polo_passivo(...) — 1ª via listView, fallback ca
   b. identify_requerido(partes) — cascata (tipo > CPF > não-DPE > None)
   c. format_for_endpoint(expediente, requerido) — bloco de texto
5. POST único ao endpoint /api/cron/pje-import com textoVvd
6. Relatório (importadas / placeholders / erros)
```

**Reuso máximo, mudança mínima:**
- Login, parser do endpoint (`parsePJeIntimacoesCompleto`) e dedup permanecem intocados.
- Endpoint ganha apenas um campo novo (`textoVvd`) que dispara branch para VVD.
- Quando promovermos para cron (fora deste escopo), refatoramos `pje_intimacoes_scraper.py` para multi-vara aproveitando as 3 funções específicas que ficam prontas e testadas neste spec.

---

## Componentes

### Script `scripts/pje_mpu_import.py`

| Função | Input | Output | Reaproveita |
|---|---|---|---|
| `login_requests(env)` | `PJE_CPF`, `PJE_SENHA` | `requests.Session` autenticada | Importa do scraper Júri (sem redefinir) |
| `navigate_to_vvd_panel(session)` | session | HTML do painel VVD | Espelho de `navigate_to_vara_expedientes` (Júri), troca regex de busca para "Vara de Violência Doméstica" |
| `parse_expedientes_list(html)` | HTML do painel | `list[dict]` `{numero_cnj, processo_pje_id, data_expedicao, tipo_documento, prazo}` | Regex de CNJ/data/prazo já validados no scraper Júri. **Novo**: extrair `processo_pje_id` do `onclick` do link "abrir processo" — o scraper Júri atual não captura esse ID, então é regex novo a desenvolver |
| `main(argv)` | flags CLI | exit code | Aceita `--dry-run` (não faz POST), `--processo-pje-id=ID` (filtra para 1 processo só, para validação manual), default = roda todos pendentes |
| `resolve_polo_passivo(session, processo_pje_id)` | session + ID | `dict` `{partes: [...], requerente, requerido}` | Novo — 1ª via listView, fallback `ca` |
| `identify_requerido(partes)` | lista de partes | `str` (nome) ou `None` | Novo — cascata Q2/B (ver abaixo) |
| `format_for_endpoint(expediente, requerido)` | dict + nome | bloco de texto formato `parsePJeIntimacoesCompleto` | Novo, espelha formato existente |

### Mudança em `src/app/api/cron/pje-import/route.ts`

Três alterações cirúrgicas:

1. Aceitar `textoVvd?: string` no payload JSON.
2. Quando presente, chamar `importarDemandas(textoVvd, "VVD_CAMACARI")`.
3. Após import, para cada processo criado/atualizado, detectar MPU (`numero_autos.startsWith("MPUMP")` ou classe contém "Medida Protetiva") e fazer upsert em `processos_vvd` com `tipo_processo='MPU'` e `mpu_ativa=true`.

A mudança é **não-quebrante** para Júri/EP — só adiciona branch quando `textoVvd` é passado.

---

## Heurística de identificação do REQUERIDO

Cascata em ordem; para na primeira regra que produzir candidato único:

```python
def identify_requerido(partes: list[dict]) -> str | None:
    """Cascata. Retorna nome ou None (None → placeholder no import)."""

    # Regra 1: tipo explícito "REQUERIDO" pelo PJe
    requeridos = [p for p in partes if normalize(p.get("tipo", "")) == "requerido"]
    if len(requeridos) == 1:
        return requeridos[0]["nome"]
    if len(requeridos) > 1:
        return " e ".join(p["nome"] for p in requeridos)  # múltiplos, raro

    # Regra 2: primeira parte com CPF que NÃO é a Defensoria
    for p in partes:
        if p.get("cpf") and not _is_dpe(p):
            return p["nome"]

    # Regra 3: primeira parte que NÃO é a DPE-BA (sem CPF)
    for p in partes:
        if not _is_dpe(p):
            return p["nome"]

    return None  # cascata esgotada → placeholder


def _is_dpe(parte: dict) -> bool:
    nome = normalize(parte.get("nome", ""))
    tipo = normalize(parte.get("tipo", ""))
    oab = normalize(parte.get("oab", ""))
    return ("defensoria" in nome) or (tipo == "representante") or ("dpe" in oab)
```

**Comportamentos garantidos:**
- Múltiplos REQUERIDOS → nomes unidos por `" e "`.
- REQUERENTE jamais é confundida com REQUERIDO.
- Placeholder `⚠ A identificar — <cnj>` quando cascata esgota (padrão `project_assistido_placeholder` já existente).

**Edge case explícito YAGNI:** processos onde o assistido é a REQUERENTE (raro na atuação atual). Se acontecer, cascata identifica errado e usuário corrige manualmente. Estender só se virar problema recorrente.

---

## Resolução de sigilo (parte mais sensível)

`resolve_polo_passivo(session, processo_pje_id) -> dict`:

```
1ª via (rápida — sessão de representante já vê partes):
  GET /pje/Processo/.../listView.seam?id=<processo_pje_id>
  → HTML do detalhe (partes visíveis quando session é autenticada)
  → parsear seção "Partes do Processo"
  → retornar dict

Fallback (apenas se 1ª via vier sem partes):
  Localizar popup "Peticionar" no HTML do detalhe
  → extrair atributo data-ca ou parâmetro ?ca=... (regex)
  → GET /pje/Processo/.../listProcessoCompleto.seam?ca=<token>
  → parsear partes
  → retornar dict
```

**Por que esta ordem (vs `ca` primeiro):** quando o login é do defensor representante, a sessão tem privilégio para ver o processo. O fluxo `ca` foi documentado para cenários sem essa sessão privilegiada. Memória: `feedback_pje_sessao_representante`.

**Pontos sensíveis e tratamento:**

1. **Token `ca` muda a cada sessão** — extrair fresh por processo, nunca cachear.
2. **Layout JSF imprevisível** — tentar 3 seletores em ordem; primeiro que retornar `ca` válido (32 hex chars) ganha. Se todos falharem → log + retornar partes vazias → `identify_requerido` devolve None → placeholder.
3. **Processo arquivado/sem permissão** — detectar via "Processo não encontrado" ou status ≠ 200 → log + placeholder + segue.
4. **Rate limit** — `time.sleep(0.3)` entre processos. 31 processos × ~1 request = ~30-60s total.

---

## Data flow concreto

```
PJe painel VVD (HTML JSF)
    ↓ parse_expedientes_list
expediente: {numero_cnj, processo_pje_id, data_expedicao, tipo_documento, prazo}
    ↓ resolve_polo_passivo
partes: [{tipo, nome, cpf?, oab?}, ...]
    ↓ identify_requerido (cascata)
"João Pereira"  (ou None → placeholder)
    ↓ format_for_endpoint
bloco texto:
  Defensoria Pública
  Designação de audiência
  Medida Protetiva 8001234-12.2026.8.05.0039
  Maria Silva X João Pereira
  /Vara de Violência Doméstica de Camaçari
  Expedição eletrônica (28/04/2026 às 10:23)
  Prazo de 5 dias
    ↓ POST /api/cron/pje-import { textoVvd: "..." }
    ↓ parsePJeIntimacoesCompleto + importarDemandas("...", "VVD_CAMACARI")
    ↓ inserts no banco:
      assistidos:    {nome: "João Pereira", ...}      (upsert)
      processos:     {numero_autos, atribuicao: "VVD_CAMACARI"} (upsert)
      processos_vvd: {processo_id, tipo_processo: "MPU", mpu_ativa: true} (upsert)
      demandas:      {processo_id, status: "5_TRIAGEM", data_expedicao, prazo} (insert)
```

**Ponto-chave:** o bloco de texto formatado é a **interface contratual** entre o script Python e o endpoint TS. Ambos podem evoluir independentemente sem quebrar o outro.

---

## Erros e tolerância

```python
for expediente in lista:
    try:
        partes = resolve_polo_passivo(...)
        requerido = identify_requerido(partes)
        bloco = format_for_endpoint(expediente, requerido)
        blocos.append(bloco)
        log_ok += 1
    except Exception as e:
        log(f"⚠ {expediente['numero_cnj']}: {e}")
        log_err += 1
        continue   # próximo, sem abortar a corrida toda

post_to_ombuds(blocos)   # uma única chamada com todos os blocos OK
print_relatorio(log_ok, log_err, placeholders, importados, duplicatas)
```

Tolerância **per-process**: falha em 1 expediente não derruba os outros 30.

---

## Testes (TDD, fixtures sintéticas, sem rede)

Arquivo: `scripts/test_pje_mpu_import.py` (mesma estrutura do `test_classify_mpu.py` da skill `varredura-triagem` — standalone Python, exit 0/1).

| Teste | Fixture | Verifica |
|---|---|---|
| `test_parse_expedientes_list` | HTML mock com 3 expedientes (1 MPU, 1 24-A, 1 ciência) | extrai os 3 corretamente |
| `test_resolve_polo_passivo_via_listview` | HTML mock de processo com partes visíveis | retorna 3 partes (REQUERENTE, REQUERIDO, REPRESENTANTE) |
| `test_resolve_polo_passivo_fallback_ca` | HTML sem partes na 1ª via + popup com `data-ca="abc..."` + `listProcessoCompleto` mock | retorna partes do fallback |
| `test_identify_requerido_caso_simples` | partes com 1 REQUERIDO claro | retorna o nome |
| `test_identify_requerido_dois_requeridos` | partes com 2 REQUERIDO | retorna `"Nome1 e Nome2"` |
| `test_identify_requerido_sem_tipo_explicito` | só REQUERENTE + DPE-BA | retorna None |
| `test_format_for_endpoint_com_nome` | expediente + "João Pereira" | bloco texto idêntico ao formato esperado |
| `test_format_for_endpoint_placeholder` | expediente + None | bloco com `⚠ A identificar — <cnj>` |

---

## Validação manual obrigatória

**ANTES** de rodar o script nos 31 MPU pendentes:

1. Pegar 1 dos 31 MPU pendentes (qualquer).
2. Rodar `python3 scripts/pje_mpu_import.py --dry-run --processo-pje-id=XXX`.
3. Verificar no terminal:
   - Token `ca` extraído (se 1ª via falhar) — ou partes via listView (caminho esperado).
   - Lista de partes.
   - REQUERIDO identificado.
   - Bloco de texto formatado.
4. Se tudo bate, rodar SEM `--dry-run` para apenas esse 1 processo.
5. Verificar no OMBUDS: assistido criado/atualizado, `processo_vvd.tipo_processo='MPU'`, demanda em `5_TRIAGEM`.
6. Se OK, rodar nos 30 restantes.

**Flag `--dry-run`** imprime tudo no stdout sem POST. Essencial para iterar nos parsers sem poluir banco.

---

## Arquivos novos / modificados

**Novos:**
- `scripts/pje_mpu_import.py` (~300 linhas)
- `scripts/test_pje_mpu_import.py` (~200 linhas)

**Modificados:**
- `src/app/api/cron/pje-import/route.ts` — aceitar `textoVvd`, branch para VVD_CAMACARI + upsert MPU em `processos_vvd`

**Sem mudança:**
- `src/lib/pje-parser.ts` (`parsePJeIntimacoesCompleto`) — formato de bloco preservado
- `src/lib/services/pje-import.ts` (`importarDemandas`) — recebe atribuição como parâmetro já hoje
- `scripts/pje_intimacoes_scraper.py` (Júri/EP) — intocado

---

## Promoção para cron (fora do escopo deste spec)

Após estabilizar o fluxo one-shot, a "promoção" para execução recorrente envolve:

1. Refatorar `pje_intimacoes_scraper.py` para multi-vara, absorvendo `pje_mpu_import.py`.
2. Adicionar entrada no LaunchAgent do Mac Mini (memória `project_macmini_worker_setup`).
3. Configurar alerta de falha (e-mail ou push notification).

Estimativa: ~1 sessão de trabalho. Não bloqueia este spec.

---

## Não-objetivos (YAGNI)

Explicitamente FORA do escopo:

- Importação de expedientes VVD que NÃO são MPU (criminal comum 24-A com processo já em curso, etc.) — provavelmente reaproveita o mesmo fluxo, mas validar caso a caso.
- Resolução de sigilo via OAuth/SSO certificado digital — fluxo HTTP basta para o usuário do defensor.
- UI no OMBUDS para disparar import — escolha "rodar pelo terminal" é deliberada (controle manual).
- Trigger automático da `varredura-triagem` após import — você roda separadamente, mantém duas etapas legíveis no log.

---

## Critérios de pronto

- [ ] Script roda nos 31 MPU pendentes sem exception não-tratada.
- [ ] ≥80% dos 31 importados com REQUERIDO nomeado (≤20% como placeholder é aceitável dada incerteza do PJe).
- [ ] Banco mostra: 31 (ou ≥28) demandas em `5_TRIAGEM`, 31 entradas em `processos_vvd` com `tipo_processo='MPU'`.
- [ ] Após o import, `varredura-triagem` consegue processar essas demandas com as `RULES_MPU` (validação E2E do Plano 2 do MPU reform).
- [ ] Testes sintéticos 8/8 passam.
