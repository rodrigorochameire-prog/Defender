# Regra de Tripla Saída — Análises Processuais DPE-BA

**Regra obrigatória**: toda análise processual estratégica (júri, criminal comum, VVD, execução penal, audiência sumariante, APF, RA) DEVE gerar **três arquivos** na pasta do assistido:

## 1. PDF — Relatório Visual com Paleta Navy/Steel v3

Gerar o PDF usando **ReportLab** (não docx-to-pdf) com a paleta visual v3:

### Paleta v3 — Navy/Steel Soft
```python
C_NAVY      = HexColor('#1D3461')   # Títulos, bordas, header
C_STEEL     = HexColor('#2E6DA4')   # Acentos, destaques
C_STEEL_LT  = HexColor('#D6E8F7')   # Fundo seções (heading bg)
C_OFF_WHITE = HexColor('#F8FAFB')   # Linhas alternadas tabelas
C_WHITE     = HexColor('#FFFFFF')
C_GRAY_800  = HexColor('#1F2937')   # Texto corpo
C_GRAY_600  = HexColor('#4B5563')
C_GRAY_400  = HexColor('#9CA3AF')   # Notas de rodapé
C_FOOTER    = HexColor('#4A6F8A')   # Texto footer

# Alertas
C_RED_BG    = HexColor('#FEE2E2');  C_RED_TX  = HexColor('#7F1D1D');  C_RED_BD  = HexColor('#EF4444')
C_GREEN_BG  = HexColor('#D1FAE5');  C_GREEN_TX= HexColor('#065F46');  C_GREEN_BD= HexColor('#10B981')
C_AMBER_BG  = HexColor('#FEF9C3');  C_AMBER_TX= HexColor('#713F12');  C_AMBER_BD= HexColor('#F59E0B')
C_BLUE_BG   = HexColor('#DBEAFE');  C_BLUE_TX = HexColor('#1E3A8A');  C_BLUE_BD = HexColor('#3B82F6')
```

### Elementos visuais obrigatórios
- **Header**: faixa navy (28pt) com "DEFENSORIA PÚBLICA DO ESTADO DA BAHIA" + "7ª Regional — Camaçari | Uso Interno — Estratégia de Defesa" + "CONFIDENCIAL"
- **Section headings**: fundo `C_STEEL_LT` com borda esquerda navy (3pt) — equivale ao `add_heading()` do gerar_docx.py v3
- **Tabelas**: header navy com texto branco, linhas alternadas branco/off-white, grid `#D1D5DB`
- **Alertas**: boxes coloridos (red para riscos, blue para informações, green para pontos fortes, amber para atenção)
- **Footer**: linha `#8FA8C8` + texto `C_FOOTER` com "Defensoria Pública do Estado da Bahia — 7ª Regional — Camaçari" e paginação
- **Corpo**: Helvetica 9.5pt, justificado, cor `C_GRAY_800`

### Nome do arquivo PDF
`[Tipo da Análise] - [Nome do Assistido].pdf`
Exemplo: `Analise Estrategica Juri - Adenilson da Silva.pdf`

### Abordagem de geração
Gerar um script Python completo usando ReportLab que:
1. Define a paleta v3 completa
2. Cria estilos para cada tipo de elemento (Body, BulletV3, Quote, AlertRed/Blue/Green, TblCell, TblHead, etc.)
3. Implementa `header_footer()` com faixa navy + footer institucional
4. Implementa `section_heading()` como tabela 1-col com fundo steel_lt + borda navy
5. Constrói o conteúdo da análise seção a seção
6. Gera o PDF diretamente (sem passar por docx)

O script `scripts/gerar_pdf_v3_template.py` contém a biblioteca de estilos e helpers reutilizáveis. Use-o como base.

---

## 2. Markdown — Para exibição no Cowork

Gerar um arquivo `.md` com a análise completa, formatada para leitura no Cowork:
- Headers com `#`, `##`, `###`
- Tabelas em formato markdown
- Alertas em blockquotes (`> ⚠️ ...`)
- Timestamps de depoimentos entre colchetes `[HH:MM:SS]`
- Linguagem defensiva (ver skill linguagem-defensiva)

### Nome do arquivo MD
`[Tipo da Análise] - [Nome do Assistido] - YYYY-MM-DD.md`
Exemplo: `Analise Estrategica Juri - Adenilson da Silva - 2026-03-26.md`

---

## 3. JSON — Para integração OMBUDS

O `_analise_ia.json` segue o schema definido na seção "Output Estruturado" do SKILL.md principal. Salvar na pasta raiz do assistido substituindo versão anterior se existir.

---

## Ordem de geração

1. Primeiro: analisar o caso e estruturar o conteúdo
2. Segundo: gerar o MD (rápido, exibe no Cowork para o defensor acompanhar)
3. Terceiro: gerar o PDF com script ReportLab + paleta v3
4. Quarto: gerar o JSON para OMBUDS
5. Informar ao final:
   - Link para o PDF
   - Link para o MD
   - Confirmação do JSON salvo

## Mensagem final padrão

```
📄 [View PDF](computer:///caminho/arquivo.pdf)
📝 [View MD](computer:///caminho/arquivo.md)
✅ `_analise_ia.json` salvo — pronto para importar no OMBUDS
```
