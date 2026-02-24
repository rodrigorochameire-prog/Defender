"""
Seletores CSS do Solar (DPEBA) — mapeamento centralizado.
Atualizar conforme a interface do Solar mudar.

Mapeado via Chrome MCP Discovery em 2026-02-22 e 2026-02-24.
Solar v25.010.1 — AngularJS + Bootstrap + Select2 + Font Awesome

ARQUITETURA DO SOLAR:
- Framework: AngularJS (1.x) com Bootstrap 2.x
- Routing: hash-based (#/eproc, #/processos, #/historico, etc.)
- Controllers: BuscarProcessoCtrl, AtendimentoCtrl, BuscarCtrl, etc.
- Data binding: eproc.processo.eventos (movimentações PJe)
- API interna: /procapi/ (REST para documentos PJe)
- Formulários: Django forms + AngularJS ng-model (prefix 'audiencia.*')
- Dropdowns: Select2 (todos os selects dentro de modais)
"""

# === Keycloak Login (confirmados via discovery) ===
LOGIN = {
    "username_input": "#username",
    "password_input": "#password",
    "submit_button": "#kc-login",
    # URL patterns
    "login_url_pattern": "login.defensoria.ba.def.br",
    "solar_url_pattern": "solar.defensoria.ba.def.br",
    # Profile page (landing after login)
    "profile_url": "/atendimento/perfil/",
}

# === Navegação Principal (sidebar) ===
NAV = {
    # Sidebar links (ícones + texto)
    "sidebar_buscar": 'a[href="#"]',  # Abre dropdown com busca rápida
    "sidebar_recepcao": 'a[href="/atendimento/recepcao/"]',
    "sidebar_ged": 'a[href="/ged/painel/"]',
    "sidebar_defensor": 'a[href="/atendimento/perfil/"]',
    "sidebar_processos": 'a[href="#"]',  # Expande submenu Processos
    "sidebar_livre": 'a[href="#"]',  # Menu Livre
    "sidebar_relatorios": 'a[href="/relatorios/"]',
    "sidebar_admin": 'a[href="#"]',  # Menu Admin
    "sidebar_ajuda": 'a[href="#"]',  # Menu Ajuda
    # Busca rápida (dropdown do Buscar)
    "quick_search_input": 'input[name="filtro"][placeholder*="Atendimento"]',
    "quick_search_button": '.input-append .btn',
    # User menu (top-right)
    "user_menu": 'a[href="#"]',  # Avatar/nome no canto
    "logout_link": 'a[href="/logout/"]',
    "edit_profile_link": 'a[href="/perfil/editar/"]',
}

# === URLs Internas ===
URLS = {
    # Páginas principais
    "processos_listar": "/processo/listar/",
    "peticionamento_buscar": "/processo/peticionamento/buscar/",
    "avisos_painel": "/processo/intimacao/painel/",
    "atendimento_buscar": "/atendimento/buscar/",
    "atendimento_perfil": "/atendimento/perfil/",
    "atendimento_pendentes": "/atendimento/pendentes/listar/",
    "atendimento_acompanhamento": "/atendimento/acompanhamento/",
    "ged_painel": "/ged/painel/",
    # Padrão de URL de atendimento individual
    # /atendimento/{atendimento_numero}/#/processo/{numero_puro}/grau/{grau}
    "atendimento_detail_pattern": "/atendimento/{atendimento_numero}/",
    "atendimento_processo_pattern": "/atendimento/{atendimento_numero}/#/processo/{numero_puro}/grau/{grau}",
    "atendimento_eproc_pattern": "/atendimento/{atendimento_numero}/#/eproc/{numero_puro}/grau/{grau}",
    "atendimento_historico_pattern": "/atendimento/{atendimento_numero}/#/historico",
    # API REST — Fases Processuais (descoberto via Chrome MCP 2026-02-24)
    "fase_salvar": "/processo/fase/salvar/",
    "fase_documento_salvar": "/processo/fase/documento/salvar/",
    # API REST de documentos PJe (CRUCIAL!)
    # /procapi/processo/{numero_sem_pontos}{grau}/documento/{documento_id}/
    "procapi_documento_pattern": "/procapi/processo/{numero_processo_grau}/documento/{documento_id}/",
    "procapi_base": "/procapi/",
}

# === Busca de Processos (/processo/listar/) ===
# Controller: BuscarProcessoCtrl
SEARCH = {
    "form": "#BuscarProcessoForm",
    "search_input": "#id_filtro",  # "Nº do processo, nome ou CPF/CNPJ do assistido..."
    "search_button": 'button[ng-click="buscar(0, true)"]',
    "date_ini": "#id_data_ini",
    "date_fim": "#id_data_fim",
    "defensor_select": "#id_defensor",
    "defensoria_select": "#id_defensoria",
    "vara_select": "#id_vara",
    "situacao_hidden": "#id_situacao",
    # Tabela de resultados
    "results_table": "table.table-bordered",
    "result_row": "table.table-bordered tbody tr",
    "no_results": "Nenhum registro encontrado",
    # ng-click functions
    "ng_buscar": "buscar(0, true)",
    "ng_novo_extrajudicial": "limpar_busca()",
    "ng_novo_judicial": "limpar_busca(true, filtro.numero)",
    # Table headers: #, Número/Grau, Vara/Comarca, Área/Classe, Partes
}

# === Página do Atendimento/Processo ===
# Controller: AtendimentoCtrl
# URL: /atendimento/{id}/#/eproc/{numero}/grau/{grau}
ATENDIMENTO = {
    # Header info
    "processo_numero": ".processo-numero",  # Texto do número formatado
    "requerente_nome": ".requerente-nome",
    "atendimento_numero": ".atendimento-numero",
    # Tabs (Angular hash routes)
    "tab_historico": 'a[href="#/historico"]',
    "tab_documentos": 'a[href="#/documentos"]',
    "tab_tarefas": 'a[href="#/tarefas"]',
    "tab_processos": 'a[href="#/processos"]',
    "tab_pje": 'a[href="#/eproc"]',
    "tab_outros": 'a[href="#/outros"]',
    "tab_propacs": 'a[href="#/propac"]',
    # Action buttons
    "btn_visualizar": "Visualizar",
    "btn_editar": "Editar",
    "btn_transferir": "Transferir",
    "btn_excluir": "Excluir",
    "btn_voltar_painel": 'a[href="/atendimento/"]',
}

# === Aba Processos (dentro do atendimento) ===
# Hash route: #/processos
PROCESSO = {
    # Tabela "Dados do Processo"
    "dados_table": "table.table-bordered",
    "dados_headers": ["Tipo", "Número", "Chave", "Parte", "Cadastro", "Defensoria", "Classe"],
    # Tabela "Assuntos"
    "assuntos_headers": ["Código", "Descrição", "Principal"],
    # Tabela "Fases Processuais"
    "fases_headers": ["Evento", "Data/Hora", "Descrição", "Defensoria", "Defensor(a)", "Documentos", "Opções"],
    "btn_nova_fase": "Nova Fase",
    # Link para PJe
    "link_ver_pje": 'a:contains("ver na aba PJE")',
}

# === Aba PJE (Movimentações do PJe) ===
# Hash route: #/eproc/{numero}/grau/{grau}
# Data model: eproc.processo.eventos
PJE = {
    # Processo info table
    "processo_table_headers": ["Número", "Localidade / Órgão Julgador", "Classe", "Prioridades"],
    # Assuntos table
    "assuntos_headers": ["Código", "Descrição", "Principal"],
    # Prazos Relacionados table
    "prazos_headers": ["Código", "Evento", "Requerente", "Data", "Prazo Final", "Situação"],
    # Processos Relacionados table
    "vinculados_headers": ["Vínculo", "Número", "Localidade/Órgão Julgador", "Classe"],
    # Partes e Representantes table
    "partes_headers": ["Nome", "Sexo", "Nascimento", "Município", "UF"],
    # Materialização Completa (download todos os autos)
    "btn_materializacao": "Materialização Completa",
    # Eventos (MOVIMENTAÇÕES) - seção principal
    "eventos_section_title": "Eventos",
    "eventos_tab_tabela": "Tabela",   # Toggle view
    "eventos_tab_timeline": "Linha do Tempo",  # Toggle view
    "btn_forcar_atualizacao": "Forçar atualização do Processo",
    # Tabela de Eventos
    "eventos_table_parent": "#table",  # div.tab-pane que contém a tabela
    "eventos_table": "#table table.table-bordered",
    "eventos_headers": ["Evento", "Data/Hora", "Descrição", "Usuário", "Documentos"],
    # AngularJS data binding
    "ng_repeat_eventos": "evento in eproc.processo.eventos | orderBy:'-data_protocolo'",
    # ng-click functions
    "ng_forcar_atualizacao": "forcar_atulizacao",  # NOTA: typo no código-fonte do Solar
    "ng_download_unificado": "download_unificado",
    # Evento fields (AngularJS model)
    "evento_fields": [
        "id", "numero", "data_protocolo", "descricao",
        "descricao_amigavel", "descricao_complementar",
        "nivel_sigilo", "tipo_local", "tipo_nacional",
        "usuario", "defensoria", "ficticio",
        "complementos", "documentos", "eventos", "processo",
    ],
    # Documento fields (within evento.documentos[])
    "documento_fields": [
        "documento",  # ID numérico do documento
        "evento",     # ID do evento pai
        "vinculado",  # Doc vinculado (pode ser null)
        "vinculados", # Array de docs vinculados
        "tipo",       # Tipo do documento
        "tipo_local", # Tipo local
        "nome",       # Nome/descrição
        "data_protocolo",
        "nivel_sigilo",
        "mimetype",   # Ex: "application/pdf"
        "hash_conteudo",
        "parametros",
    ],
}

# === API REST /procapi/ (Download de Documentos) ===
PROCAPI = {
    # Padrão de URL para download de documento individual
    # Número do processo sem formatação + grau concatenado
    # Ex: 80575183920218050039 + 1 = 805751839202180500391
    "documento_url": "/procapi/processo/{numero_processo_grau}/documento/{documento_id}/",
    # Exemplo real:
    # /procapi/processo/805751839202180500391/documento/543993519/
    # Target: _blank (abre em nova aba)
    # Retorna o PDF diretamente (binary)
    "numero_format": "remove_pontos(numero) + str(grau)",
}

# === Fase Processual (formulário "Nova Fase") ===
# Descoberto via Chrome MCP Discovery em 2026-02-24
# Controller: AtendimentoCtrl (mesmo controller do atendimento)
# Form: CadastroFaseForm → POST /processo/fase/salvar/
# IMPORTANTE: Todos os ng-model usam prefix "audiencia.*" (não "fase")
FASE_PROCESSUAL = {
    # Form info
    "form_name": "CadastroFaseForm",
    "form_action": "/processo/fase/salvar/",
    "doc_form_name": "CadastroDocumentoFaseForm",
    "doc_form_action": "/processo/fase/documento/salvar/",
    # Modal container
    "modal": ".modal.in",
    "modal_backdrop": ".modal-backdrop.in",
    # ng-model fields (dentro do modal)
    "ng_model": {
        "id": "audiencia.id",
        "defensor_id": "audiencia.defensor.id",
        "defensor": "audiencia.defensor",
        "defensoria_id": "audiencia.defensoria.id",
        "defensoria": "audiencia.defensoria",
        "tipo_id": "audiencia.tipo.id",
        "tipo": "audiencia.tipo",
        "data": "audiencia.data",
        "hora": "audiencia.hora",
        "status": "audiencia.audiencia_status",
        "itinerante_id": "audiencia.itinerante.id",
        "itinerante": "audiencia.itinerante",
        "descricao": "audiencia.descricao",
        "custodia": "audiencia.custodia",
        "conciliacao": "audiencia.conciliacao",
        "data_protocolo": "audiencia.data_hora_protocolo",
        "data_termino": "audiencia.data_termino_protocolo",
        "substituto_id": "audiencia.substituto.id",
        # Honorários (sub-objeto)
        "honorario_possivel": "audiencia.honorario.possivel",
        "honorario_valor": "audiencia.honorario.valor_estimado",
        "honorario_defensor": "audiencia.honorario.defensor",
        "honorario_defensoria": "audiencia.honorario.defensoria",
    },
    # Select2 containers (ordem no modal: Defensor, Defensoria, Tipo, Status, Itinerante)
    "select2": {
        # Seletor genérico para abrir qualquer Select2 dentro do modal
        "container_click": ".modal.in .select2-container a.select2-choice",
        "search_input": ".select2-search input",
        "results_list": ".select2-results li",
        "first_result": ".select2-results li:first-child",
        "highlighted": ".select2-results .select2-highlighted",
        "no_results": ".select2-no-results",
    },
    # Campos input (não-Select2)
    "input": {
        "data": '.modal.in input[ng-model="audiencia.data"]',
        "hora": '.modal.in input[ng-model="audiencia.hora"]',
        "descricao": '.modal.in textarea[ng-model="audiencia.descricao"]',
    },
    # Botões do modal
    "btn_salvar": '.modal.in .btn-primary[type="submit"]',
    "btn_salvar_ng_click": "salvando=true;",
    "btn_cancelar": '.modal.in a:has-text("Cancelar")',
    "btn_fechar": ".modal.in .close",
    "btn_nova_fase": 'a:has-text("Nova Fase"), button:has-text("Nova Fase")',
    # Scope data pré-carregada
    "scope_data": {
        "tipos": "tipos",           # Array de 263 objetos {id, nome, judicial, ...}
        "defensorias": "defensorias",
        "defensores": "defensores",
        "itinerantes": "itinerantes",
    },
}

# === Anotação (Histórico do Atendimento) ===
# Descoberto via Chrome MCP Discovery em 2026-02-24
# Formulário Django puro (NÃO AngularJS — sem ng-model)
# POST /atendimento/{atendimento_numero}/anotacao/nova/
ANOTACAO = {
    # Form info
    "form_action_pattern": "/atendimento/{atendimento_numero}/anotacao/nova/",
    "form_method": "POST",
    # Campos do formulário
    "csrf_token": 'input[name="csrfmiddlewaretoken"]',
    "next_field": 'input[name="next"]',
    "atuacao_select": "#id_atuacao",       # Defensoria + Defensor (valor numérico)
    "qualificacao_select": "#id_qualificacao",  # Tipo da anotação
    "historico_textarea": 'textarea[name="historico"]',  # Texto da anotação
    # Placeholder do textarea
    "historico_placeholder": "Digite a anotação...",
    # Botões
    "btn_nova_anotacao": 'a:has-text("Anotação")',  # Botão laranja no rodapé do Histórico
    "btn_salvar": 'button:has-text("Salvar")',
    "btn_cancelar": 'button:has-text("Cancelar")',
    # Qualificações disponíveis (id → nome)
    "qualificacoes": {
        304: "ANDAMENTO DE PROCESSO VINCULADO",
        302: "ANOTAÇÕES",
        303: "ARQUIVAMENTO",
        305: "DESPACHO DO(A) DEFENSOR(A)",
        306: "DILIGÊNCIAS",
        312: "ENTREGA/RECEBIMENTO DE DOCUMENTOS",
        307: "LEMBRETE",
        308: "NÃO COMPARECIMENTO DO ASSISTIDO",
        309: "RECEBIMENTO DE EXPEDIENTES (CARTAS, OFÍCIOS, ETC.)",
        310: "REGISTRO DE TENTATIVA DE CONTATO COM ASSISTIDO",
        311: "VISTA DE PROCESSO",
    },
}

# Mapeamento OMBUDS tipo_anotacao → Solar qualificacao_id (para Anotações)
QUALIFICACAO_MAP = {
    "nota": 302,              # ANOTAÇÕES
    "atendimento": 302,       # ANOTAÇÕES
    "observacao": 302,        # ANOTAÇÕES
    "lembrete": 307,          # LEMBRETE
    "solar:movimentacao": 304, # ANDAMENTO DE PROCESSO VINCULADO
    "providencia": 306,       # DILIGÊNCIAS
    "sigad": 302,             # ANOTAÇÕES
    "audiencia": 304,         # ANDAMENTO DE PROCESSO VINCULADO
    "peticao": 304,           # ANDAMENTO DE PROCESSO VINCULADO
    "sentenca": 304,          # ANDAMENTO DE PROCESSO VINCULADO
    "decisao": 304,           # ANDAMENTO DE PROCESSO VINCULADO
}


# === Mapeamento OMBUDS tipo → Solar tipo_id ===
# IDs confirmados via Chrome MCP Discovery em 2026-02-24
# Estrutura de cada tipo: {id, nome, judicial, extrajudicial, audiencia, juri, sentenca, recurso}
TIPO_MAP = {
    # OMBUDS tipo_anotacao → Solar tipo_id
    "nota": 52,                    # Consulta/Orientação
    "atendimento": 52,             # Consulta/Orientação
    "audiencia": 3,                # Audiência de Instrução e Julgamento
    "peticao": 1,                  # Petição
    "recurso": 53,                 # Apelação
    "sentenca": 5,                 # Sentença
    "decisao": 6,                  # Decisão Interlocutória
    "habeas_corpus": 9,            # Habeas Corpus
    "contestacao": 170,            # CONTESTAÇÃO
    "alegacoes_finais": 221,       # Alegações finais
    "resposta_acusacao": 267,      # Resposta à acusação
    "solar:movimentacao": 52,      # Consulta/Orientação (análise de movimentação)
    "sigad": 52,                   # Consulta/Orientação (dados do SIGAD)
    "observacao": 52,              # Consulta/Orientação
    "providencia": 1,              # Petição (providência jurídica)
    "lembrete": 52,                # Consulta/Orientação
}

# Mapeamento reverso: Solar tipo_id → nome (para logging/display)
TIPO_NOME: dict[int, str] = {
    1: "Petição",
    2: "Audiência de Conciliação",
    3: "Audiência de Instrução e Julgamento",
    4: "Sessão do Tribunal do Júri",
    5: "Sentença",
    6: "Decisão Interlocutória",
    7: "Recurso de Apelação",
    8: "Recurso de Agravo",
    9: "Habeas Corpus",
    10: "Cumprimento de Sentença",
    21: "Audiência judicial",
    22: "Audiência ANPP",
    25: "Audiência Custódia",
    27: "Apelação Cível",
    28: "Agravo de Instrumento",
    29: "Assistência",
    48: "Audiência De Justificação",
    50: "Audiência De Conciliação / Mediação",
    51: "Alegações Finais/memoriais",
    52: "Consulta/Orientação",
    53: "Apelação",
    65: "Apelação Criminal",
    87: "Pedido de Liberdade Provisória",
    88: "Pedido de Revogação de Prisão Preventiva",
    90: "Resposta Acusação",
    93: "Progressão de Regime",
    94: "Livramento Condicional",
    95: "Indulto",
    96: "Comutação de Pena",
    97: "Detração",
    98: "Remição",
    99: "Unificação",
    100: "Visitas em Estabelecimentos Prisionais",
    101: "Audiência de Custódia",
    103: "Ação Rescisória",
    104: "Agravo em Execução",
    106: "Agravo em Execução Penal",
    107: "Atendimento ao Sistema Criminal",
    108: "Habeas Corpus Cível",
    109: "Audiência Admonitória",
    128: "Pedido de Revogação de Medida Protetiva",
    163: "Pedido de Extinção de Punibilidade em Razão da Prescrição",
    165: "Pedido de Flexibilização de Medida Protetiva de Urgência",
    167: "Razões/contrarrazões",
    169: "Transação Penal",
    170: "CONTESTAÇÃO",
    210: "Petição Intermediaria",
    211: "Arquivamento",
    221: "Alegações finais",
    225: "Audiência - Escuta especializada",
    226: "Audiência condicional do processo",
    227: "Audiência de Acordo de não Persecução Penal (ANPP)",
    236: "Certidão",
    253: "Execuções penais e medidas alternativas",
    254: "Expedição de ofício",
    256: "Juntada de documento",
    259: "Justificativa",
    261: "Medidas protetivas de urgência (Lei Maria da penha) criminal",
    267: "Resposta à acusação",
    268: "Sessão Plenária do Júri",
}


# === Avisos Pendentes (/processo/intimacao/painel/) ===
# Accordion com categorias Bootstrap collapse
AVISOS = {
    # URL
    "url": "/processo/intimacao/painel/",
    # Filtros
    "sistema_select": "#id_sistema_webservice",  # Options: PJE-1G-BA, PJE-2G-BA
    "defensoria_select": "#id_setor_responsavel",
    "defensor_select": "#id_responsavel",
    "search_button": 'button[type="submit"] i.fa-search',
    # Accordion toggles (Bootstrap collapse)
    "toggle_class": "accordion-toggle more collapsed bg-silver color-black",
    # Accordion panel IDs
    "panel_urgente": "#collapse_prateleirasURG",
    "panel_intimacao": "#collapse_prateleirasINT",
    "panel_citacao": "#collapse_prateleirasCIT",
    "panel_notificacao": "#collapse_prateleirasNOT",
    "panel_vista": "#collapse_prateleirasVIS",
    "panel_pauta": "#collapse_prateleirasPTA",
    "panel_forum": "#collapse_prateleirasFCO",
    # Categorias com códigos
    "categorias": {
        "URG": "Urgente",
        "INT": "Intimação",
        "CIT": "Citação",
        "NOT": "Notificação",
        "VIS": "Vista para manifestação",
        "PTA": "Pauta de julgamento/audiência",
        "FCO": "Fórum de conciliação",
    },
}

# === Peticionamento (/processo/peticionamento/buscar/) ===
PETICIONAMENTO = {
    "url": "/processo/peticionamento/buscar/",
    "table_headers": [
        "Número", "Tipo", "Processo/Classe", "Vara/Comarca",
        "Requerente", "Defensoria", "Data Registro", "Data Resposta",
        "Situação", "Ações",
    ],
    # Status cards
    "status_erro": "Erro no protocolo",
    "status_aguardando": "Aguardando análise",
    "status_analisados": "Analisados",
    "status_fila": "Na fila para protocolo",
    "status_protocoladas": "Protocoladas",
}

# === Busca de Atendimentos (/atendimento/buscar/) ===
# Controller: BuscarCtrl
ATENDIMENTO_BUSCA = {
    "url": "/atendimento/buscar/",
    "filtro_input": 'input[name="filtro"]',  # "Nº do Atendimento/Processo"
    "defensor_select": "#id_defensor",
    "defensoria_select": "#id_defensoria",
    "area_select": "#id_area",
    "situacao_select": "#id_situacao",
    "forma_select": "#id_forma_atendimento",
    "table_headers": [
        "#", "Número", "Data", "Tipo/Agenda", "Requerente",
        "Requerido", "Área/Pedido", "Defensoria", "Defensor", "Ações",
    ],
}

# === AngularJS Scope Functions (key actions) ===
SCOPE_FUNCTIONS = {
    # BuscarProcessoCtrl
    "buscar_processos": "buscar(0, true)",
    "novo_processo": "novo_processo({'numero': busca.numero, 'grau': busca.grau})",
    # AtendimentoCtrl (aba PJE)
    "forcar_atualizacao": "forcar_atulizacao",  # Typo no código-fonte Solar
    "download_unificado": "download_unificado",
    "listar_documentos": "listar_documentos",
    "carregar_eproc": "carregar_eproc",
    "carregar_processo": "carregar_processo",
    "buscar_numero": "buscar_numero",
    "editar_processo": "editar_processo",
    "transferir_processo": "transferir_processo",
}


# === Helper Functions ===

def is_mapped(selector: str) -> bool:
    """Verifica se um seletor já foi mapeado (não é TODO)."""
    return selector != "TODO" and selector != ""


def get_unmapped_selectors() -> list[str]:
    """Retorna lista de seletores ainda não mapeados."""
    unmapped = []
    for group_name, group in [
        ("NAV", NAV),
        ("SEARCH", SEARCH),
        ("ATENDIMENTO", ATENDIMENTO),
        ("PROCESSO", PROCESSO),
        ("PJE", PJE),
        ("PROCAPI", PROCAPI),
        ("AVISOS", AVISOS),
    ]:
        for key, value in group.items():
            if isinstance(value, str) and not is_mapped(value):
                unmapped.append(f"{group_name}.{key}")
    return unmapped


def format_numero_processo_grau(numero_autos: str, grau: int = 1) -> str:
    """
    Formata número do processo para uso na API /procapi/.
    Remove pontos e traços, concatena o grau no final.

    Ex: "8057518-39.2021.8.05.0039" + grau 1 → "805751839202180500391"
    """
    numero_limpo = numero_autos.replace("-", "").replace(".", "")
    return f"{numero_limpo}{grau}"


def build_documento_url(numero_autos: str, documento_id: str, grau: int = 1) -> str:
    """
    Constrói URL para download de documento do PJe via /procapi/.

    Ex: build_documento_url("8057518-39.2021.8.05.0039", "543993519")
    → "/procapi/processo/805751839202180500391/documento/543993519/"
    """
    numero_grau = format_numero_processo_grau(numero_autos, grau)
    return f"/procapi/processo/{numero_grau}/documento/{documento_id}/"


def build_atendimento_eproc_url(atendimento_id: str, numero_autos: str, grau: int = 1) -> str:
    """
    Constrói URL para a aba PJE de um atendimento.

    Ex: build_atendimento_eproc_url("260220002321", "8057518-39.2021.8.05.0039")
    → "/atendimento/260220002321/#/eproc/80575183920218050039/grau/1"
    """
    numero_limpo = numero_autos.replace("-", "").replace(".", "")
    return f"/atendimento/{atendimento_id}/#/eproc/{numero_limpo}/grau/{grau}"
