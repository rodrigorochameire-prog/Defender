# Estratégia de Automação OMBUDS — Março 2026

## O Cenário Atual

Você tem hoje três pilares funcionando:

1. **OMBUDS** — sistema web (Next.js/Supabase/Vercel) usado por 4 defensores, com cadastro de processos, assistidos e funcionalidades em expansão
2. **Cowork** — análise de processos e elaboração de peças jurídicas com skills especializadas (VVD, criminal-comum, júri, execução penal, institucional etc.)
3. **Enrichment-engine no Railway** — backend Python para tarefas pesadas (AI, scraping, processamento de documentos)

O gargalo principal: **obter dados do PJe automaticamente**, sem depender de acesso manual ao portal.

---

## Parte 1: Integração OMBUDS ↔ Cowork

### Para uso pessoal (já possível)

A integração mais natural hoje é **via Google Drive como ponte**:

- OMBUDS gera dados estruturados (processos, assistidos, metadados)
- Documentos ficam organizados em pastas no Drive (por assistido/processo)
- Cowork acessa essas pastas para análise e geração de peças

**O que falta para funcionar melhor:**

- Padronizar a estrutura de pastas no Drive (assistido → processo → documentos do PJe + peças geradas)
- Criar uma skill no Cowork que leia os metadados do processo diretamente do OMBUDS (via API tRPC exposta publicamente ou via export JSON para o Drive)
- Usar o MCP do Google Drive que já está no Cowork para acessar os documentos

### Para escalabilidade (4+ defensores)

O caminho escalável é o OMBUDS ter uma **API própria** que o Cowork (ou qualquer outro agente) possa consumir. Na prática:

- Endpoint público/autenticado no OMBUDS: `GET /api/processo/:numero` → retorna metadados + links dos documentos no Drive
- Cada defensor acessa o Cowork com suas próprias skills e seu próprio Drive
- O OMBUDS funciona como fonte de verdade centralizada

**Recomendação**: por agora, o Drive como ponte é suficiente. Quando o número de defensores crescer, criar a API do OMBUDS faz sentido.

---

## Parte 2: Automação de Consulta ao PJe

### Opções disponíveis no mercado

#### 1. JUDIT API (recomendada para começar)
- **O que é**: API REST comercial que cobre +90 tribunais, incluindo PJe do TJ-BA
- **Funcionalidades**: consulta por número do processo, CPF, OAB; monitoramento com webhooks; retorna movimentações, partes, decisões
- **Preço**: a partir de R$ 9,90/mês, 3 consultas grátis para testar
- **Vantagem**: já pronta, REST simples, webhooks nativos, cobertura nacional
- **Desvantagem**: custo mensal, dependência de terceiro, pode não retornar PDFs dos documentos completos
- **Site**: https://judit.io

#### 2. Intima.AI
- **O que é**: API para automação de PJe, PROJUDI, e-SAJ, e-PROC
- **Funcionalidades**: consulta processual, captura de intimações, protocolo automatizado
- **Modelo**: créditos por consulta/documento capturado
- **Vantagem**: cobre múltiplos sistemas, protocolo automatizado
- **Desvantagem**: modelo de créditos pode ficar caro, menos transparente nos preços
- **Site**: https://intima.ai

#### 3. DocSmart 3.0 (API REST sobre MNI)
- **O que é**: wrapper REST/JSON sobre o protocolo SOAP/MNI do PJe
- **Funcionalidades**: consulta de metadados e download de documentos via endpoints REST simples
- **Preço**: R$ 99 (2.000 requisições) a R$ 200 (código-fonte completo em Python/Flask)
- **Vantagem**: barato, pode comprar o código-fonte e hospedar você mesmo
- **Cobertura TJ-BA**: não testada oficialmente, mas possível — precisa validar
- **Desvantagem**: projeto de uma pessoa só, sem suporte profissional
- **Site**: https://tecjustica.substack.com

#### 4. DataJud CNJ (já implementado no OMBUDS)
- **O que é**: API pública gratuita do CNJ
- **Funcionalidades**: metadados básicos (classe, assunto, vara, movimentos)
- **Vantagem**: gratuito, sem autenticação especial
- **Desvantagem**: sem documentos/PDFs, dados com delay de dias/semanas
- **Veredicto**: bom para enriquecimento de metadados, insuficiente como fonte principal

#### 5. MNI/SOAP direto (Python + zeep)
- **O que é**: o protocolo oficial do CNJ para integração com PJe
- **Funcionalidades**: consulta completa + download de documentos em base64
- **Requisito**: certificado digital A1 (e-CPF)
- **Vantagem**: acesso completo, oficial, sem custo por consulta
- **Desvantagem**: protocolo SOAP complexo, MNI do TJ-BA pode ter instabilidades
- **Veredicto**: o mais poderoso, mas requer e-CPF A1 que você ainda não tem

#### 6. Scraping com Playwright (login/senha PJe)
- **O que é**: automação de navegador que faz login no PJe e navega pelos autos
- **Funcionalidades**: tudo que um humano faz no PJe, incluindo download de PDFs
- **Requisito**: CPF + senha do PJe de cada defensor
- **Vantagem**: funciona sem certificado A1, acesso completo
- **Desvantagem**: frágil a mudanças de UI do PJe, risco de bloqueio por rate limiting
- **Veredicto**: fallback robusto quando APIs não funcionam

### Comparativo consolidado

| Solução | Custo | PDFs | Facilidade | Escalável | Risco |
|---------|-------|------|------------|-----------|-------|
| JUDIT API | ~R$10-50/mês | Parcial | Alta | Sim | Baixo |
| Intima.AI | Créditos | Sim | Alta | Sim | Baixo |
| DocSmart | R$99-200 | Sim | Média | Sim | Médio |
| DataJud | Grátis | Não | Alta | Sim | Baixo |
| MNI direto | Grátis (+ A1) | Sim | Baixa | Sim | Médio |
| Playwright | Grátis | Sim | Baixa | Limitado | Alto |

---

## Parte 3: OpenClaw — Vale a pena?

### O que o OpenClaw realmente é

O OpenClaw (330k stars no GitHub em março/2026) é um **agente de IA pessoal de propósito geral** que roda localmente. Não é uma ferramenta jurídica — é uma plataforma de automação genérica com:

- Chat via Telegram/WhatsApp/Discord
- Controle de navegador (como Playwright)
- Execução de scripts e comandos
- Sistema de skills extensível
- Cron jobs e webhooks
- Memória persistente

### O que ele NÃO tem nativamente

- Nenhuma integração com PJe, MNI, ou sistemas jurídicos brasileiros
- Nenhuma skill jurídica pronta
- Nenhuma conexão com o OMBUDS

### Onde o OpenClaw faz sentido no seu caso

O OpenClaw seria útil como **orquestrador de automações no Mac Mini**, funcionando como um daemon 24/7 que:

1. Recebe comandos via Telegram ("consulta o processo X", "baixa os autos do processo Y")
2. Executa scripts de scraping/MNI que VOCÊ precisa escrever
3. Salva resultados no Drive
4. Notifica você de volta via Telegram

Ou seja: o OpenClaw não resolve o problema do PJe — ele é o **motor** onde você plugaria a solução.

### Alternativas ao OpenClaw para o mesmo papel

| Ferramenta | Tipo | Vantagem | Desvantagem |
|-----------|------|----------|-------------|
| **OpenClaw** | Agente IA local | Muito popular, extensível, multi-canal | Precisa escrever skills do zero |
| **n8n** | Workflow automation | Visual, fácil para iniciantes, 400+ integrações | Menos "inteligente", mais mecânico |
| **NanoClaw** | Agente IA local (leve) | Mais seguro (containers isolados) | Menos funcionalidades |
| **Script Python puro no Railway** | Cron job | Já tem infra, simples | Sem interface de chat |
| **Cron + Railway + Telegram Bot** | DIY | Controle total, sem dependências | Precisa construir tudo |

### Minha avaliação

O OpenClaw é a melhor opção **se você quer uma interface de chat (Telegram) para disparar automações e receber notificações**. É o mais maduro, mais documentado e com maior comunidade. Para rodar no Mac Mini 24/7, é ideal — consome ~1-2 USD/mês de energia.

Porém, para o problema específico do PJe, o OpenClaw é **meio de transporte, não destino**. Você ainda precisa construir a skill de consulta ao PJe.

---

## Parte 4: Recomendação Estratégica — O Caminho

### Fase 1: Imediata (esta semana)
**Objetivo**: enriquecimento automático de processos no OMBUDS

- ✅ DataJud já implementado (enriquece metadados ao cadastrar processo)
- Testar JUDIT API (3 consultas grátis) para ver se retorna dados mais completos do TJ-BA
- Se JUDIT funcionar bem para TJ-BA: integrar no OMBUDS como segunda fonte de enriquecimento

### Fase 2: Curto prazo (2-4 semanas)
**Objetivo**: consulta completa ao PJe com download de documentos

- Implementar scraping com Playwright no enrichment-engine (Railway)
  - Login com CPF/senha do PJe
  - Botão "Importar do PJe" no card do processo no OMBUDS
  - Download de PDFs → upload para pasta do assistido no Drive
- OU contratar JUDIT/Intima.AI se o custo for aceitável e a cobertura do TJ-BA for boa

### Fase 3: Médio prazo (1-2 meses)
**Objetivo**: automação proativa + interface via Telegram

- Instalar OpenClaw no Mac Mini
- Criar skill de consulta ao PJe (reutilizando o código da Fase 2)
- Configurar monitoramento periódico de intimações (cron a cada 30-60 min)
- Alertas via Telegram quando houver nova movimentação
- Integrar com OMBUDS via webhook: nova movimentação → atualiza processo no sistema

### Fase 4: Longo prazo (3-6 meses)
**Objetivo**: integração completa OMBUDS ↔ Cowork ↔ PJe

- Obter e-CPF A1 para acesso MNI oficial (mais estável que scraping)
- API do OMBUDS para consumo externo (Cowork, OpenClaw, outros sistemas)
- Workflow completo: nova intimação detectada → OMBUDS notifica → defensor abre Cowork → skill analisa o processo → gera minuta da peça → salva na pasta Protocolar
- Se escalar: cada defensor com seu e-CPF A1 conectado ao OMBUDS

---

## Parte 5: Sobre Escalabilidade (para além de 4 defensores)

### O que já é escalável

- OMBUDS no Vercel/Supabase: escala naturalmente
- Skills do Cowork: cada defensor pode usar independentemente
- DataJud/JUDIT: APIs que funcionam para qualquer usuário

### O que NÃO escala

- OpenClaw no Mac Mini: é uma solução pessoal. Para mais defensores, cada um precisaria do seu
- Scraping com Playwright: sessões simultâneas no PJe podem gerar bloqueio
- Certificado A1: cada defensor precisa do seu próprio

### Caminho escalável real

Para uma solução que funcione para 10, 20, 50 defensores:

1. OMBUDS como hub central (já está sendo construído assim)
2. API de consulta processual via serviço pago (JUDIT ou Intima.AI) — custo previsível por consulta
3. Cada defensor conecta suas credenciais PJe ao OMBUDS (criptografadas)
4. OpenClaw/automação local fica como ferramenta pessoal de produtividade, não como infraestrutura compartilhada

---

## Decisão Síntese

| Pergunta | Resposta |
|----------|---------|
| OpenClaw vale? | Sim, mas como orquestrador pessoal no Mac Mini, não como solução para o PJe |
| Melhor alternativa ao OpenClaw? | Para seu perfil de iniciante, n8n é mais visual. Mas OpenClaw é mais poderoso |
| Melhor caminho para PJe? | Curto prazo: JUDIT API. Médio prazo: Playwright no Railway. Longo prazo: MNI com A1 |
| OMBUDS + Cowork? | Drive como ponte agora, API do OMBUDS depois |
| Escalável? | Sim, se a fonte de dados do PJe for uma API (JUDIT/Intima.AI) e não scraping local |

---

*Documento gerado em 22/03/2026 — Análise estratégica para Rodrigo (DPE-BA, 7ª Regional — Camaçari)*
