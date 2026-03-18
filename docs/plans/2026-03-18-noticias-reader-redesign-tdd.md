# TDD - Redesign do Reader de Notícias Jurídicas

| Campo | Valor |
|-------|-------|
| Tech Lead | @rodrigo |
| Status | Aprovado |
| Criado | 2026-03-18 |

---

## Contexto

A Central de Notícias Jurídicas do OMBUDS teve seu feed redesenhado recentemente. O reader panel, contudo, ainda apresenta problemas arquiteturais e de UX que degradam a experiência de leitura.

---

## Definição do Problema

- **Layout espremido**: A `NoticiasPastasSidebar` está aninhada dentro do `NoticiasFeed`. Quando o reader abre, o feed vai para 38% da tela, comprimindo sidebar + cards num espaço ilegível (~20% real).
- **Feed sem respiração**: Cards mantêm tamanho completo mesmo num espaço inadequado.
- **Tipografia pobre no reader**: `prose-sm` + `font-sans` para artigos longos prejudica legibilidade. `Source_Serif_4` já está disponível e não é usado.
- **Header poluído**: Título cortado em `line-clamp-3`, badges e ações na mesma linha sem hierarquia.

---

## Escopo

### ✅ V1

- Reader como drawer/overlay (Sheet) da direita, 75% da tela
- Feed sempre em largura total — sem reajuste ao abrir reader
- Tipografia serif (`Source_Serif_4`) no corpo do artigo, `max-w-[65ch]`
- Header do reader limpo: meta (linha 1) · título completo (linha 2) · ações (toolbar)
- Overlay semitransparente, clique fora fecha

### ❌ Fora do Escopo

- Modo leitura responsivo/mobile (futuro)
- Fontes configuráveis pelo usuário

---

## Solução Técnica

### Mudanças por arquivo

**`noticias/page.tsx`**
- Remover lógica de split (`readerOpen ? "w-[38%]" : "flex-1"`)
- Feed sempre `flex-1`
- Reader envolvido em `<Sheet open={readerOpen} onOpenChange>` com `side="right"`
- SheetContent com `w-[75vw] sm:max-w-[75vw] p-0`

**`noticias-reader-panel.tsx`**
- Remover `border-l` do container externo (Sheet já provê separação)
- Header: linha 1 = badges fonte/categoria/data | linha 2 = título sem clamp | ações em toolbar à direita
- Artigo: `font-[family-name:var(--font-serif)]` no container do conteúdo, `max-w-[65ch] mx-auto`, `prose-base`
- Separador artigo: mais espaçoso

**`noticias-feed.tsx`**
- Sem mudanças estruturais — sidebar continua dentro do feed (agora sempre full width)

---

## Plano de Implementação

| Tarefa | Estimativa |
|--------|------------|
| Atualizar `noticias/page.tsx` | 30min |
| Redesenhar `noticias-reader-panel.tsx` | 1h |
| Verificar no browser | 30min |
| Commit | 15min |
