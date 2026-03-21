# Event Detail Sheet — Redesign Premium

**Data**: 2026-03-21
**Status**: Aprovado para implementação

## Objetivo

Elevar o `EventDetailSheet` ao padrão visual do `DemandaQuickPreview` — ficha de audiência rica com identidade visual por tipo, seção hero de depoentes e bottom bar com ações.

## Estrutura de Seções (em ordem)

### 1. Header premium
- Badge colorido por tipo de audiência (INSTRUÇÃO=indigo, SENTENÇA=amber, CONCILIAÇÃO=sky, JULGAMENTO=rose, default=zinc)
- Status badge à direita (Agendada=amber, Realizada=emerald, Cancelada=red)
- Countdown visual: "em 4 dias" (zinc), "amanhã" (amber bold), "hoje" (emerald bold), "há X dias" (zinc muted)
- Background tint sutilíssimo por tipo (bg-indigo-50/40 etc.)
- Data/hora em destaque, local com MapPin

### 2. Assistido + Processo
- Link para ficha do assistido
- Número do processo com botão copiar (font-mono)

### 3. Depoentes *(seção hero)*
- Header: "Depoentes · 3 ouvidos de 5"
- **Sem enrichment**: card placeholder com botão "Ativar análise"
- **Com enrichment**: cards por depoente com:
  - Border-left colorida: verde=ouvido, amber=pendente, red=não localizado
  - Nome + badge tipo (Testemunha, Vítima, Réu, Perito)
  - Status: "✓ Ouvido em 12/01" ou "⏳ Pendente" ou "✗ Não localizado"
  - Badge intimação: Intimado (emerald), Não intimado (amber), Edital (red)
  - Certidão colapsável (font-mono, text-[11px])

### 4. Dados estratégicos
- Grid 2 colunas com chips: Crime/assunto, Fase processual, Nº audiências anteriores, Última audiência, Atribuição
- Observações colapsável abaixo

### 5. Histórico (timeline vertical)
- Linha vertical conectando itens
- Ponto colorido por resultado (emerald=realizada, amber=adiada, red=não realizada)
- Máx 3 itens + "Ver todas"

### 6. Bottom bar sticky
- Esquerda: `Editar` (outline zinc)
- Direita: `Registrar audiência` (emerald filled) ou `✓ Ver registro` se já realizada
