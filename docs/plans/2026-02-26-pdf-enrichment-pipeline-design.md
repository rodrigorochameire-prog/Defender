# PDF Enrichment Pipeline + Drive UX Improvements

> Design aprovado em 26/02/2026

## Contexto

O defensor recebe PDFs de processos inteiros (200+ paginas) e precisa localizar
pecas especificas: denuncia, sentenca, decisao, depoimentos, laudos.
Atualmente faz isso manualmente — scrollando centenas de paginas.

## Objetivo

Pipeline automatico que analisa PDFs, identifica pecas processuais, insere
bookmarks e habilita busca semantica. Combinacao das abordagens:
- **Abordagem 1**: Google Gemini + pdfjs-dist (imediata)
- **Abordagem 3**: RAG Pipeline com embeddings (futura)

---

## 1. Pipeline de Processamento

### Fluxo

```
PDF sync Drive → Inngest trigger "drive/file.synced"
  → Job "pdf-extract": pdfjs-dist extrai texto por pagina
  → Job "pdf-classify": Gemini classifica secoes em blocos de ~20 paginas
  → Job "pdf-store": Salva secoes no banco com resumos
  → Job "pdf-bookmark" (opcional): pdf-lib insere outline no PDF
  → Job "pdf-embed" (futuro): Gera embeddings por secao para RAG
```

### Stack Tecnica

| Ferramenta | Funcao | Custo |
|-----------|--------|-------|
| pdfjs-dist (Mozilla, 50k+ stars) | Extrai texto + estrutura por pagina | Gratuito |
| Google Gemini (ja tem API key) | Classifica pecas + gera resumos | Free tier |
| pdf-lib (7k+ stars) | Insere bookmarks/outline em PDFs | Gratuito |
| Inngest (ja no projeto) | Jobs async sem timeout | Ja integrado |
| pgvector (Supabase) | Embeddings para busca semantica | Ja disponivel |

### Tipos de Pecas Detectaveis

| Tipo | Padroes de Deteccao |
|------|-------------------|
| denuncia | "O MINISTERIO PUBLICO...", "DENUNCIA" |
| sentenca | "SENTENCA", "VISTOS...", "Julgo procedente" |
| decisao | "DECISAO", "DECIDO", "Decisao interlocutoria" |
| depoimento | "TERMO DE DEPOIMENTO", "OITIVA", "TERMO DE DECLARACOES" |
| alegacoes | "ALEGACOES FINAIS", "MEMORIAIS" |
| certidao | "CERTIDAO", "CERTIFICO" |
| laudo | "LAUDO PERICIAL", "EXAME DE CORPO DE DELITO" |
| inquerito | "INQUERITO POLICIAL", "RELATORIO POLICIAL" |
| recurso | "APELACAO", "RECURSO", "EMBARGOS" |
| outros | Fallback para secoes nao classificadas |

---

## 2. Modelo de Dados

### Tabela: driveDocumentSections

```sql
CREATE TABLE drive_document_sections (
  id SERIAL PRIMARY KEY,
  drive_file_id INTEGER NOT NULL REFERENCES drive_files(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, -- "denuncia", "sentenca", "decisao", etc.
  titulo TEXT NOT NULL, -- "Depoimento de FULANO DE TAL"
  pagina_inicio INTEGER NOT NULL,
  pagina_fim INTEGER NOT NULL,
  resumo TEXT, -- 2-3 frases geradas pelo Gemini
  texto_extraido TEXT, -- texto bruto das paginas
  confianca INTEGER DEFAULT 0, -- 0-100
  embedding vector(768), -- para busca semantica (pgvector)
  metadata JSONB DEFAULT '{}', -- partes mencionadas, datas, artigos
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sections_drive_file ON drive_document_sections(drive_file_id);
CREATE INDEX idx_sections_tipo ON drive_document_sections(tipo);
```

### Campo metadata (exemplos)

```json
{
  "partesmencionadas": ["Joao da Silva", "Maria Santos"],
  "datasExtraidas": ["2024-03-12", "2024-05-15"],
  "artigosLei": ["Art. 121 CP", "Art. 157 CP"],
  "juiz": "Dr. Fulano",
  "promotor": "Dr. Cicrano"
}
```

---

## 3. UI — Visualizador de Processo

### Layout

```
+------------------+--------------------------------------+
| INDICE           |                                      |
|                  |     [PDF Viewer - pagina atual]      |
| Denuncia    pg1  |                                      |
| Inquerito  pg16  |                                      |
| Depoimentos     |                                      |
|  - Testemunha 1 |                                      |
|    pg 46        |                                      |
|  - Vitima       |                                      |
|    pg 58        |                                      |
| Sentenca  pg183  |                                      |
|                  |                                      |
| [Buscar...]     |                                      |
+------------------+--------------------------------------+
| Resumo IA: "Homicidio qualificado. Denuncia oferecida  |
| em 12/03/2024. Reu preso preventivamente..."            |
+---------------------------------------------------------+
```

### Funcionalidades

1. **Indice lateral**: Clique na peca → PDF navega para a pagina
2. **Badges coloridos**: Denuncia=vermelho, Sentenca=roxo, Depoimento=azul
3. **Busca inline**: Filtra texto dentro do PDF
4. **Resumo IA**: Preview de cada secao no rodape
5. **Comparar depoimentos**: Side-by-side de 2 depoimentos
6. **Timeline**: Linha do tempo automatica com datas extraidas
7. **Contradicoes**: Gemini destaca inconsistencias entre depoimentos
8. **Export**: Relatorio com resumo de cada peca para audiencia

---

## 4. Sidebar Scrollavel + Melhorias

### Sidebar com Scroll Virtual

- Busca inline em cada atribuicao (filtrar assistidos por nome)
- Scroll virtual: so renderiza itens visiveis (performance)
- max-height com overflow-y-auto por atribuicao expandida
- Contagem de assistidos por atribuicao
- Indicador de novidades (novo documento desde ultima visita)

### Melhorias Funcionais

1. **Busca inline** em cada atribuicao
2. **Contagem** de assistidos/processos por atribuicao
3. **Indicador de novidades** (ponto colorido)
4. **Drag & drop** de PDFs direto na pasta do assistido
5. **Ctrl+K** busca global com assistidos

---

## 5. Fases de Implementacao

### Fase 1 — Fundacao (1 sessao)
- [ ] Instalar pdfjs-dist + pdf-lib
- [ ] Criar tabela driveDocumentSections (migration Drizzle)
- [ ] Sidebar scrollavel com busca inline
- [ ] tRPC router para sections (CRUD + busca)

### Fase 2 — Pipeline de Extracao (1-2 sessoes)
- [ ] Service: pdf-extractor.ts (pdfjs-dist extrai texto por pagina)
- [ ] Service: pdf-classifier.ts (Gemini classifica secoes)
- [ ] Inngest jobs: pdf-extract → pdf-classify → pdf-store
- [ ] Trigger automatico no sync de PDFs

### Fase 3 — Visualizador (1-2 sessoes)
- [ ] Componente PdfViewer com react-pdf
- [ ] Painel lateral com indice de secoes
- [ ] Navegacao por clique (peca → pagina)
- [ ] Resumo IA por secao

### Fase 4 — Bookmarks + Export (1 sessao)
- [ ] pdf-lib insere outline/bookmarks no PDF original
- [ ] Upload do PDF modificado de volta ao Drive
- [ ] Export de relatorio (resumo de todas as pecas)

### Fase 5 — RAG + Busca Semantica (futuro)
- [ ] pgvector embeddings por secao
- [ ] Busca semantica: "encontre mencoes a arma"
- [ ] Comparacao de depoimentos
- [ ] Deteccao de contradicoes via Gemini

---

## Dependencias npm Novas

```json
{
  "pdfjs-dist": "^5.x",
  "pdf-lib": "^1.17.x",
  "react-pdf": "^9.x"
}
```

## Decisoes Tecnicas

- **Foxit Editor pago NAO ajuda** — SDK eh produto separado
- **pdfjs-dist** eh a melhor opcao gratuita (Mozilla, 50k+ stars)
- **Gemini free tier** cobre volume de escritorio de defensoria
- **Inngest** evita timeouts em PDFs grandes (jobs async)
- **pgvector** ja disponivel no Supabase para embeddings futuros
