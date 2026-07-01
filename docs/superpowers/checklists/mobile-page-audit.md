# Checklist de Auditoria Mobile — por página

Testar a 375px e 390px (DevTools device toolbar), modo claro e escuro.

## Layout & overflow
- [ ] Sem scroll horizontal (nada empurra a página além da viewport).
- [ ] Sem larguras fixas em px que estourem (`w-[NNNpx]`, tabelas largas).
- [ ] Imagens/embeds com `max-width: 100%`.

## Navegação & chrome
- [ ] Bottom nav visível; conteúdo tem folga inferior (MobilePageShell / `pb-20`).
- [ ] Header não sobrepõe conteúdo; sticky funciona.
- [ ] ☰ ausente no mobile; magnifier abre a busca; "Mais" abre o launcher.

## Alvos de toque & tipografia
- [ ] Todos os alvos ≥44×44px.
- [ ] Texto legível sem zoom (mínimo ~14px em corpo).

## Componentes densos
- [ ] Tabelas → `ResponsiveTable`/cards.
- [ ] Diálogos → `ResponsiveDialog` (bottom sheet).
- [ ] Filtros inline → `FilterSheet`.
- [ ] Ações primárias → `MobileActionBar` (zona do polegar).

## Estado & segurança
- [ ] Safe-area respeitada (notch + home indicator).
- [ ] Teclado não cobre o input focado.
- [ ] `prefers-reduced-motion` respeitado.
- [ ] Sem regressão desktop (≥768px idêntico ao anterior).
