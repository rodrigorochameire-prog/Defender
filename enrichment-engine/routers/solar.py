"""
Routers do Solar — Endpoints de sincronização com o Sistema Solar (DPEBA).

POST /solar/sync-processo    — Sincroniza um processo (leitura)
POST /solar/sync-batch       — Sincroniza múltiplos processos (leitura)
POST /solar/avisos           — Lista avisos pendentes (PJe/SEEU)
GET  /solar/status           — Status da sessão Solar
POST /solar/sync-to-solar    — Escreve anotações como fases/anotações no Solar
POST /solar/criar-anotacao   — Cria anotação no Histórico do atendimento
"""

import logging

from fastapi import APIRouter, HTTPException, status

from models.schemas import (
    SolarSyncInput,
    SolarSyncOutput,
    SolarBatchInput,
    SolarBatchOutput,
    SolarAvisosOutput,
    SolarStatusOutput,
    SolarNomeSyncInput,
    SolarNomeSyncOutput,
    SolarCadastrarInput,
    SolarCadastrarOutput,
    SolarSyncToInput,
    SolarSyncToOutput,
    SolarCriarAnotacaoInput,
    SolarCriarAnotacaoOutput,
)
from services.solar_orchestrator import get_solar_orchestrator
from services.solar_auth_service import get_solar_auth_service, SolarAuthService
from services.solar_scraper_service import SolarScraperService, get_solar_scraper_service
from services.solar_write_service import get_solar_write_service
from services.solar_selectors import get_unmapped_selectors

logger = logging.getLogger("enrichment-engine.solar-router")
router = APIRouter()


@router.post("/solar/sync-processo", response_model=SolarSyncOutput)
async def sync_processo(input_data: SolarSyncInput) -> SolarSyncOutput:
    """
    Sincroniza um processo do Solar com o OMBUDS.

    1. Consulta processo no Solar
    2. Extrai movimentações
    3. Gemini processa movimentações significativas
    4. Grava no Supabase (anotações, case_facts)
    5. Retorna PDFs em base64 para frontend uploadar ao Drive
    """
    logger.info(
        "Solar sync: %s | processo_id=%s download_pdfs=%s",
        input_data.numero_processo,
        input_data.processo_id,
        input_data.download_pdfs,
    )

    try:
        orchestrator = get_solar_orchestrator()
        result = await orchestrator.sync_processo(
            numero_processo=input_data.numero_processo,
            processo_id=input_data.processo_id,
            assistido_id=input_data.assistido_id,
            caso_id=input_data.caso_id,
            download_pdfs=input_data.download_pdfs,
        )
        return SolarSyncOutput(**result)

    except Exception as e:
        logger.error("Solar sync failed: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Solar sync failed: {str(e)}",
        )


@router.post("/solar/sync-batch", response_model=SolarBatchOutput)
async def sync_batch(input_data: SolarBatchInput) -> SolarBatchOutput:
    """
    Sincroniza múltiplos processos do Solar (max 20).

    Processos são sincronizados sequencialmente com delay entre eles.
    """
    logger.info("Solar batch sync: %d processos", len(input_data.processos))

    try:
        orchestrator = get_solar_orchestrator()
        processos_dicts = [p.model_dump() for p in input_data.processos]
        result = await orchestrator.sync_batch(
            processos=processos_dicts,
            max_concurrent=input_data.max_concurrent,
        )
        return SolarBatchOutput(**result)

    except Exception as e:
        logger.error("Solar batch sync failed: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Solar batch sync failed: {str(e)}",
        )


@router.post("/solar/avisos", response_model=SolarAvisosOutput)
async def check_avisos() -> SolarAvisosOutput:
    """
    Lista avisos pendentes do Solar (intimações PJe/SEEU).

    Tenta linkar cada aviso com processos existentes no OMBUDS.
    """
    logger.info("Checking Solar avisos pendentes")

    try:
        orchestrator = get_solar_orchestrator()
        result = await orchestrator.check_avisos()
        return SolarAvisosOutput(**result)

    except Exception as e:
        logger.error("Solar avisos check failed: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Solar avisos check failed: {str(e)}",
        )


@router.get("/solar/status", response_model=SolarStatusOutput)
async def solar_status() -> SolarStatusOutput:
    """
    Status da integração Solar.

    Retorna: configuração, autenticação, sessão, seletores mapeados.
    """
    auth = get_solar_auth_service()
    unmapped = get_unmapped_selectors()

    result = SolarStatusOutput(
        configured=SolarAuthService.is_configured(),
        authenticated=auth.is_authenticated,
        session_age_seconds=auth.session_age_seconds,
        solar_reachable=False,
        selectors_mapped=len(unmapped) == 0,
        unmapped_selectors=unmapped[:20],  # Limit to avoid huge response
    )

    # Quick reachability check
    if auth.is_authenticated:
        try:
            page = auth._page
            if page and "solar.defensoria.ba.def.br" in (page.url or ""):
                result.solar_reachable = True
        except Exception:
            pass

    return result


@router.post("/solar/sync-por-nome", response_model=SolarNomeSyncOutput)
async def sync_por_nome(input_data: SolarNomeSyncInput) -> SolarNomeSyncOutput:
    """
    Busca todos os processos de um defensor no Solar pelo nome.

    O campo de busca do Solar aceita nome, CPF ou número de processo.
    Use "rodrigo rocha meire" ou "juliane andrade pereira" para listar
    todos os processos vinculados a esses defensores.
    """
    logger.info("Solar sync-por-nome: '%s'", input_data.nome)
    try:
        orchestrator = get_solar_orchestrator()
        result = await orchestrator.sync_por_nome(nome=input_data.nome)
        return SolarNomeSyncOutput(**result)
    except Exception as e:
        logger.error("sync-por-nome falhou: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Solar sync-por-nome failed: {str(e)}",
        )


@router.post("/solar/cadastrar-processo", response_model=SolarCadastrarOutput)
async def cadastrar_processo(input_data: SolarCadastrarInput) -> SolarCadastrarOutput:
    """
    Cadastra um processo no Solar se ainda não existir.

    Fluxo: busca pelo número → se não encontrado → clica 'Novo Processo Judicial'
    → captura o atendimento_id criado.
    """
    logger.info("Solar cadastrar-processo: %s grau=%d", input_data.numero_processo, input_data.grau)
    try:
        scraper = get_solar_scraper_service()
        result = await scraper.cadastrar_processo_solar(
            numero_processo=input_data.numero_processo,
            grau=input_data.grau,
        )
        return SolarCadastrarOutput(**result)
    except Exception as e:
        logger.error("cadastrar-processo falhou: %s", e)
        return SolarCadastrarOutput(
            success=False,
            cadastrado=False,
            ja_existia=False,
            numero=input_data.numero_processo,
            error=str(e),
        )


@router.post("/solar/sync-to-solar", response_model=SolarSyncToOutput)
async def sync_to_solar(input_data: SolarSyncToInput) -> SolarSyncToOutput:
    """
    Escreve dados do OMBUDS no Solar como Fases Processuais.

    Recebe anotacoes do OMBUDS e as registra como fases processuais
    nos respectivos processos no Solar. Se o processo nao existir no Solar,
    cria automaticamente via cadastrar_processo_solar().

    Safety:
    - dry_run=True: preenche mas nao salva (para testes)
    - Rate limit: 5s entre escritas
    - Concurrency lock: 1 escrita por vez
    - Screenshot antes/depois de cada operacao
    """
    logger.info(
        "Sync OMBUDS -> Solar: assistido=%d anotacoes=%d dry_run=%s",
        input_data.assistido_id,
        len(input_data.anotacoes),
        input_data.dry_run,
    )

    try:
        write_service = get_solar_write_service()

        # Converter Pydantic models para dicts
        anotacoes_dicts = [
            {
                "id": a.id,
                "processoId": a.processo_id,
                "numeroAutos": a.numero_autos,
                "conteudo": a.conteudo,
                "tipo": a.tipo,
                "createdAt": a.created_at,
            }
            for a in input_data.anotacoes
        ]

        result = await write_service.sync_anotacoes_to_solar(
            assistido_id=input_data.assistido_id,
            anotacoes=anotacoes_dicts,
            modo=input_data.modo,
            dry_run=input_data.dry_run,
        )

        return SolarSyncToOutput(**result)

    except Exception as e:
        logger.error("sync-to-solar falhou: %s", e)
        return SolarSyncToOutput(
            success=False,
            erros=[str(e)],
        )


@router.post("/solar/criar-anotacao", response_model=SolarCriarAnotacaoOutput)
async def criar_anotacao(input_data: SolarCriarAnotacaoInput) -> SolarCriarAnotacaoOutput:
    """
    Cria uma anotação no Histórico de um atendimento no Solar.

    Alternativa mais leve que sync-to-solar — cria uma única anotação
    diretamente no Histórico do atendimento via formulário Django.

    Qualificações disponíveis:
    - 302: ANOTAÇÕES (default)
    - 304: ANDAMENTO DE PROCESSO VINCULADO
    - 305: DESPACHO DO(A) DEFENSOR(A)
    - 306: DILIGÊNCIAS
    - 307: LEMBRETE
    - 310: REGISTRO DE TENTATIVA DE CONTATO COM ASSISTIDO
    """
    logger.info(
        "Criar anotacao Solar: atendimento=%s qualif=%d dry_run=%s",
        input_data.atendimento_id,
        input_data.qualificacao_id,
        input_data.dry_run,
    )

    try:
        write_service = get_solar_write_service()

        result = await write_service.criar_anotacao(
            atendimento_id=input_data.atendimento_id,
            texto=input_data.texto,
            qualificacao_id=input_data.qualificacao_id,
            atuacao_value=input_data.atuacao_value,
            dry_run=input_data.dry_run,
        )

        return SolarCriarAnotacaoOutput(**result)

    except Exception as e:
        logger.error("criar-anotacao falhou: %s", e)
        return SolarCriarAnotacaoOutput(
            success=False,
            message=str(e),
        )
