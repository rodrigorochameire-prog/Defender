# Feature: WhatsApp Defender Premium UI Polish

## Contexto
O chat WhatsApp funcional precisa de polimento visual para parecer profissional, sofisticado e premium. Atualmente os componentes usam estilos basicos do shadcn/ui sem refinamento — bubbles quadrados, input simples, empty states sem ilustracao, transicoes ausentes.

## User Stories

### US-01: Message Bubbles Premium
**Como** defensor
**Quero** bubbles de mensagem com visual refinado (arredondados, sombras, timestamps inline)
**Para** ter experiencia visual comparavel ao WhatsApp Web/iMessage

#### Criterios de Aceitacao
- [ ] CA-01: Bubbles usam rounded-2xl com sombra sutil
- [ ] CA-02: Outbound tem bg emerald suave, inbound bg branco/zinc
- [ ] CA-03: Timestamp + status icons inline no canto inferior direito do bubble
- [ ] CA-04: Status read mostra checkmarks azuis
- [ ] CA-05: Mensagens novas entram com animacao sutil slide-up

### US-02: Conversation List Polish
**Como** defensor
**Quero** lista de conversas com avatares indicativos, previews de midia e tipografia refinada
**Para** identificar rapidamente o status de cada conversa

#### Criterios de Aceitacao
- [ ] CA-01: Avatar com ring colorido (esperando=amber, padrao=zinc)
- [ ] CA-02: Preview mostra icone de midia (camera, mic, documento) antes do texto
- [ ] CA-03: Unread badge com micro-animacao ao receber msg
- [ ] CA-04: Hover com transicao suave e destaque sutil

### US-03: Header Limpo
**Como** defensor
**Quero** header compacto sem excesso de botoes e bordas
**Para** interface limpa e profissional

#### Criterios de Aceitacao
- [ ] CA-01: Shadow-xs sutil em vez de borda dura
- [ ] CA-02: Connection status como dot ao lado do nome (nao badge separado)
- [ ] CA-03: Acoes agrupadas em menu contextual

### US-04: Input Bar Estilo WhatsApp Web
**Como** defensor
**Quero** barra de input arredondada com botao de envio circular
**Para** experiencia familiar e premium

#### Criterios de Aceitacao
- [ ] CA-01: Textarea com rounded-2xl e borda suave
- [ ] CA-02: Fundo com contraste sutil (bg-zinc-50 / bg-zinc-900)
- [ ] CA-03: Botao de envio circular emerald com icone SendHorizontal
- [ ] CA-04: Attachment button com animacao de rotacao ao abrir

### US-05: Empty States com Ilustracoes
**Como** defensor
**Quero** telas vazias com visual elegante e informativo
**Para** app nao parecer vazio/quebrado

#### Criterios de Aceitacao
- [ ] CA-01: "Selecione uma conversa" com ilustracao SVG de chat bubbles
- [ ] CA-02: "Nenhuma conversa" com ilustracao de inbox vazio
- [ ] CA-03: Fundo com pattern sutil (doodle juridico minimalista)

### US-06: Loading Skeletons Refinados
**Como** defensor
**Quero** loading states com skeletons que imitam o layout real
**Para** transicao suave sem layout shift

#### Criterios de Aceitacao
- [ ] CA-01: Skeleton de mensagens (3-4 bubbles alternando lados)
- [ ] CA-02: Skeleton de lista de contatos (avatar + 2 linhas)
- [ ] CA-03: Shimmer effect em vez de pulse simples

### US-07: Selection Mode Fluido
**Como** defensor
**Quero** modo selecao com barra flutuante e animacoes suaves
**Para** experiencia moderna de selecao em massa

#### Criterios de Aceitacao
- [ ] CA-01: Checkboxes aparecem com animacao scale-in
- [ ] CA-02: Barra de acoes flutuante no bottom com backdrop-blur
- [ ] CA-03: Contador com transicao de numero

### US-08: Scroll e Transicoes
**Como** defensor
**Quero** scroll suave e transicoes elegantes
**Para** experiencia fluida sem saltos visuais

#### Criterios de Aceitacao
- [ ] CA-01: FAB circular "scroll to bottom" com badge de novas msgs
- [ ] CA-02: Smooth scroll ao clicar no FAB
- [ ] CA-03: Transicao suave ao trocar de conversa

### US-09: Contact Details Panel Premium
**Como** defensor
**Quero** painel de detalhes com visual premium e informacoes bem organizadas
**Para** consulta rapida de dados do contato

#### Criterios de Aceitacao
- [ ] CA-01: Header com blur sutil do avatar (glassmorphism leve)
- [ ] CA-02: Secoes com icones coloridos e labels uppercase tracking-wider
- [ ] CA-03: Processos como mini-cards com badge de status

### US-10: Micro-Interacoes
**Como** defensor
**Quero** micro-animacoes em acoes comuns
**Para** feedback visual imediato e satisfatorio

#### Criterios de Aceitacao
- [ ] CA-01: Enviar msg: bubble faz scale sutil ao aparecer
- [ ] CA-02: Favoritar: estrela faz scale+rotate
- [ ] CA-03: FAB de scroll aparece/desaparece com transicao

## Fora do Escopo
- Redesign completo do layout (manter estrutura 3-colunas)
- Novos endpoints tRPC (apenas visual)
- Mudancas no schema do banco
- Funcionalidades novas (apenas polish do existente)

## Requisitos Nao-Funcionais
- Performance: animacoes a 60fps, sem jank
- Acessibilidade: manter WCAG AA, prefers-reduced-motion respeitado
- Bundle: animacoes via CSS (Tailwind), sem libs extras (framer-motion)
- Compatibilidade: dark mode em todos os elementos
