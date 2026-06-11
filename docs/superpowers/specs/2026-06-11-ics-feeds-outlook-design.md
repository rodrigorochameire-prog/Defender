# Feeds ICS — agenda OMBUDS no Outlook institucional

**Data:** 2026-06-11 · **Aprovado por:** Rodrigo (chat) · **Direção:** OMBUDS → Outlook (mão única, leitura)

## Problema

O Outlook institucional (MS365, `rodrigo.meire@defensoria.ba.def.br`) organiza a agenda
por calendários de atribuição ("Vara do Júri (audiências)", "Vara da Justiça pela Paz em
Casa", etc.), hoje alimentados à mão. O OMBUDS é a fonte da verdade da agenda e precisa
aparecer lá sem depender da TI da DPE (tenant governamental — registro de app/Graph API
exigiria admin consent).

## Solução

Feeds iCalendar (RFC 5545) publicados pelo OMBUDS, um por calendário, protegidos por
token secreto por defensor. No Outlook: "Adicionar Calendário → Assinar da web", uma vez
por feed. Feed assinado cria calendário novo (os "Vara..." manuais são ocultados pelo
usuário quando confiar nos feeds).

## Catálogo de feeds (`src/lib/ics/feeds.ts` — fonte única)

| slug | Calendário | Fonte |
|---|---|---|
| `juri-audiencias` | Vara do Júri (audiências) | audiências atribuição `JURI_CAMACARI` |
| `juri-plenario` | Vara do Júri (Sessão de Julgamento) | `sessoes_juri` |
| `grupo-juri` | Grupo especializado do Tribunal do Júri | audiências `GRUPO_JURI` |
| `vvd` | Vara da Justiça pela Paz em Casa | audiências `VVD_CAMACARI`+`VVD_MPU`+`MUTIRAO_PROTEGE` (mutirão com prefixo `[Mutirão]`) |
| `ep` | Vara da Execução Penal de Camaçari | audiências `EXECUCAO_PENAL` |
| `substituicao-automatica` | Vara – Substituição automática | audiências `SUBSTITUICAO` |
| `substituicao-cumulativa` | Vara – Substituição cumulativa | audiências `SUBSTITUICAO_CIVEL` |
| `atendimentos` | OMBUDS – Atendimentos | `registros` tipo=atendimento status=agendado |
| `prazos` | OMBUDS – Prazos | `demandas.prazo` (evento de dia inteiro) |

Mapeamento automática×cumulativa é **provisório** (banco não tem essa distinção; a
cumulação real é Dias d'Ávila/cível) — editável só no catálogo. Hoje há 0 audiências de
substituição, então o erro possível é zero-custo até existir dado.

## Componentes

1. **`src/lib/ics/serializar.ts`** (pura, testada): `serializarICS({ nome, eventos })` →
   string RFC 5545. `EventoICS = { uid, titulo, descricao?, local?, inicio, fim?,
   allDay?, cancelado?, atualizadoEm? }`. Regras: CRLF; escape de `, ; \` e quebras;
   line folding 75 octetos; `VTIMEZONE` America/Bahia embutido (UTC-3 fixo);
   `X-WR-CALNAME` com o nome do calendário; evento cancelado sai `STATUS:CANCELLED` +
   `METHOD` ausente (publish). UID estável: `audiencia-{id}@ombuds.app`,
   `sessao-{id}@ombuds.app`, `registro-{id}@ombuds.app`, `demanda-prazo-{id}@ombuds.app`.
2. **`src/lib/ics/fontes.ts`**: uma função por fonte → `EventoICS[]`. Janela −30/+180
   dias. Filtro `defensor_id` do dono do token. Audiências canceladas/redesignadas dentro
   da janela ENTRAM com `cancelado=true` (é o que faz o Outlook remover o evento).
   Título: `"{tipo} – {assistido} – {nº processo}"`; descrição: vara, comarca, link
   `https://<app>/admin/...`; prazos = all-day com título `"Prazo: {ato} – {assistido}"`.
3. **Rota `GET /api/ics/[slug]`** (`?t=<token>`): resolve defensor por `users.ics_token`,
   404 para slug ou token inválido (sem distinção, sem enumeração); resposta
   `text/calendar; charset=utf-8`, `Cache-Control: private, max-age=300`.
4. **Token**: coluna nova `users.ics_token` (text, nullable, índice único). Mutation
   `settings.gerarIcsToken` (gera 32 bytes hex; regenerar invalida URLs antigas).
5. **UI**: seção "Calendários (Outlook/ICS)" em Configurações: gerar/regenerar token,
   lista dos 9 feeds com URL completa + botão copiar + instruções.

## Decisões e limites

- Exchange atualiza feeds no ritmo dele (~3–24h). Aceito; fonte da verdade é o OMBUDS.
- Somente leitura; lembretes nativos limitados em calendários assinados.
- Sem PII além do necessário no título (nome do assistido + nº já são o padrão da agenda
  interna; a URL é secreta e por HTTPS).
- Migração de banco: `ALTER TABLE users ADD COLUMN ics_token text` com `lock_timeout`
  (lição registrada em memória: SELECT runaway segura lock).

## Testes

- Serializador: escape, folding, all-day, cancelado, UID/ordenação estáveis (snapshot).
- Catálogo: slugs únicos, toda atribuição de audiência mapeada em ≤1 feed de audiências.
- Rota: token inválido → 404; token válido → `BEGIN:VCALENDAR` e eventos do defensor.
