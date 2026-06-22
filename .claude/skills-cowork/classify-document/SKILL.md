---
name: classify-document
description: Classifica pecas processuais (atos) de um bloco de paginas de processo criminal brasileiro, com foco na defesa. Recebe o texto do bloco e devolve as secoes identificadas em JSON. Acionada pelo daemon (claude_code_tasks) na assinatura Max — NAO usa API paga.
---

<!-- GERADO a partir de CLASSIFICATION_PROMPT em src/lib/services/pdf-classifier.ts. Regerar se o prompt mudar. -->

Analisador de processos criminais brasileiros (foco: DEFESA).
Identifique TODAS as pecas processuais no texto. Use EXATAMENTE estes valores para "tipo":

TIPOS VALIDOS:
denuncia, sentenca, depoimento_vitima, depoimento_testemunha, depoimento_investigado,
decisao, pronuncia, laudo_pericial, laudo_necroscopico, laudo_local,
laudo_toxicologico, laudo_balistico, laudo_medico_legal, laudo_psiquiatrico, pericia_digital,
ata_audiencia, interrogatorio, alegacoes_mp, alegacoes_defesa, resposta_acusacao,
recurso, habeas_corpus, midia_mensagens, midia_imagem_video,
boletim_ocorrencia, portaria_ip, relatorio_policial,
auto_prisao, termo_inquerito, certidao_relevante, diligencias_422, alegacoes,
auto_apreensao, mandado, reconhecimento_formal, acareacao, registro_telefonico,
documento_identidade, alvara_soltura, guia_execucao, outros, burocracia

PADROES DE CLASSIFICACAO POR TIPO:

=== PECAS PROCESSUAIS ===
| pronuncia | "PRONUNCIA", "PRONUNCIO O REU", "Decisao de Pronuncia" |
| resposta_acusacao | "RESPOSTA A ACUSACAO", "DEFESA PRELIMINAR", "Art. 396-A CPP" |
| habeas_corpus | "HABEAS CORPUS", "HC", "ORDEM DE HABEAS CORPUS", "LIBERDADE PROVISORIA" |
| diligencias_422 | "ART. 422", "DILIGENCIAS", "REQUERIMENTO DE DILIGENCIAS", "ROL DE TESTEMUNHAS" |
| ata_audiencia | "ATA DE AUDIENCIA", "TERMO DE AUDIENCIA", "AUDIENCIA DE INSTRUCAO" |
| alegacoes_mp | "ALEGACOES FINAIS DO MINISTERIO PUBLICO", "ALEGACOES FINAIS DA ACUSACAO", "MEMORIAIS DO MP" |
| alegacoes_defesa | "ALEGACOES FINAIS DA DEFESA", "MEMORIAIS DA DEFESA", "RAZOES FINAIS DEFENSIVAS" |

=== LAUDOS E PERICIAS (classificar pelo tipo especifico, nao generico) ===
| laudo_necroscopico | "LAUDO NECROSCOPICO", "EXAME CADAVERICO", "LAUDO DE NECROPSIA", "AUTO DE EXAME CADAVERICO", "CAUSA MORTIS" |
| laudo_local | "LAUDO DE LOCAL", "EXAME DE LOCAL", "LAUDO DE EXAME DO LOCAL DO FATO", "LEVANTAMENTO DE LOCAL" |
| laudo_toxicologico | "LAUDO TOXICOLOGICO", "EXAME TOXICOLOGICO", "LAUDO DEFINITIVO", "EXAME QUIMICO", substancias controladas, cocaina, maconha, crack |
| laudo_balistico | "LAUDO BALISTICO", "EXAME BALISTICO", "EXAME DE ARMA DE FOGO", "EXAME EM PROJETIL", "EXAME DE MUNICAO", "CONFRONTO BALISTICO" |
| laudo_medico_legal | "EXAME DE CORPO DE DELITO", "LAUDO MEDICO LEGAL", "EXAME DE LESOES CORPORAIS", "AUTO DE EXAME DE CORPO DE DELITO", "LAUDO DE EXAME DE CORPO DE DELITO" |
| laudo_psiquiatrico | "EXAME PSIQUIATRICO", "LAUDO PSIQUIATRICO", "PERICIA PSIQUIATRICA", "INCIDENTE DE INSANIDADE", "EXAME DE SANIDADE MENTAL", "LAUDO PSICOLOGICO" |
| pericia_digital | "PERICIA EM DISPOSITIVO", "EXAME EM CELULAR", "EXAME EM SMARTPHONE", "PERICIA EM MIDIA DIGITAL", "EXAME EM COMPUTADOR", "EXTRACAO DE DADOS", "RELATORIO DE EXTRACAO" |
| laudo_pericial | Qualquer outro laudo/pericia NAO coberto acima (papiloscopia, DNA, contabil, grafotecnico, etc) |

REGRA: SEMPRE prefira o tipo especifico de laudo. Use `laudo_pericial` generico APENAS se nenhum dos tipos especificos se aplica.

=== PROVAS DIGITAIS E MIDIAS ===
| midia_mensagens | Prints/capturas de WhatsApp, Telegram, SMS, Instagram DM, Facebook Messenger, emails. Contem baloes de conversa, nomes de contato, datas, horarios de mensagem. |
| midia_imagem_video | Fotografias (local do crime, lesoes, objetos apreendidos), frames de video, prints de redes sociais (posts, stories, fotos de perfil), stills de cameras de seguranca/CCTV. |
| registro_telefonico | Extratos de chamadas telefonicas (ERBs), registros de SMS, dados de geolocalizacao, logs de conexao, IMEI, listas de contatos extraidas. Formato tabelar com datas/horarios/numeros. |

REGRA: Se o conteudo e uma TABELA de registros de chamadas/SMS/ERB = registro_telefonico. Se e uma CONVERSA (baloes, mensagens entre pessoas) = midia_mensagens. Se e IMAGEM/FOTO/VIDEO/PRINT de rede social = midia_imagem_video.

=== ATOS INVESTIGATIVOS E PROCEDIMENTAIS ===
| interrogatorio | "INTERROGATORIO", "TERMO DE INTERROGATORIO" (judicial) |
| reconhecimento_formal | "AUTO DE RECONHECIMENTO", "TERMO DE RECONHECIMENTO DE PESSOA", "RECONHECIMENTO FOTOGRAFICO", "RECONHECIMENTO PESSOAL", "ALBUM FOTOGRAFICO" |
| acareacao | "TERMO DE ACAREACAO", "ACAREACAO", confronto entre versoes de diferentes depoentes |
| auto_apreensao | "AUTO DE APREENSAO", "TERMO DE APREENSAO", "AUTO DE EXIBICAO E APREENSAO", lista de objetos/armas/drogas apreendidos |
| mandado | "MANDADO DE PRISAO", "MANDADO DE BUSCA E APREENSAO", "MANDADO DE INTIMACAO", "MANDADO DE CONDUCAO" |
| alvara_soltura | "ALVARA DE SOLTURA", "CONTRA-MANDADO", ordem judicial de liberacao |
| guia_execucao | "GUIA DE RECOLHIMENTO", "GUIA DE EXECUCAO", "GUIA DE INTERNACAO", documentos de execucao penal |

Diferencie `alegacoes_mp` de `alegacoes_defesa` sempre que possivel. Use `alegacoes` generico apenas quando nao for possivel identificar a parte. Prefira `depoimento_investigado` para termos do inquerito policial e `interrogatorio` para interrogatorios judiciais.

REGRAS CRITICAS — IDENTIFICACAO DE DEPOIMENTOS E INTERROGATORIOS:

⚠️ DISTINCAO FUNDAMENTAL: FASE POLICIAL vs FASE JUDICIAL
Depoimentos/interrogatorios ocorrem em FASES DISTINTAS do processo, com valor probatorio DIFERENTE.
Voce DEVE identificar a fase e inclui-la no metadata.fase de CADA depoimento/interrogatorio.

FASE POLICIAL (INQUERITO) — valor probatorio MENOR, inquisitorial:
Marcadores:
- "TERMO DE DEPOIMENTO", "TERMO DE DECLARACOES", "TERMO DE DECLARACAO"
- "AUTO DE QUALIFICACAO E INTERROGATORIO" (policial)
- Presenca de: "Delegado(a) de Policia", "Escrivao(a) de Policia", "IP N°", "BO N°"
- Local: delegacia, DEAM, DT, DHPP
- Estrutura: cabecalho delegacia + "sob a presidencia do(a) Delegado(a)" + Escrivao + "compareceu" + "INQUIRIDO(A)" + "Nada mais disse"
Titulo: "[Inquerito] Depoimento de NOME (papel)" ou "[Inquerito] Interrogatorio de NOME"

FASE JUDICIAL (INSTRUCAO) — valor probatorio PLENO, contraditorio:
Marcadores:
- "ATA DE AUDIENCIA DE INSTRUCAO", "TERMO DE AUDIENCIA", "AUDIENCIA DE INSTRUCAO E JULGAMENTO"
- "OITIVA DE TESTEMUNHA", "OITIVA DA VITIMA", "DEPOIMENTO EM JUIZO"
- Presenca de: "Juiz(a) de Direito", "Magistrado(a)", "MM. Juiz", "Vara Criminal", "Promotor(a) de Justica"
- Menção a: "compromisso legal", "sob as penas da lei", "advertido(a)", "contraditorio"
- Perguntas de PARTES: "pelo(a) Promotor(a):", "pela Defesa:", "pelo(a) Juiz(a):"
- "INTERROGATORIO DO REU" judicial: ultimo ato da audiencia (art. 400 CPP)
Titulo: "[Instrucao] Oitiva de NOME (papel)" ou "[Instrucao] Interrogatorio de NOME"

FASE PLENARIO (JURI) — perante os jurados:
Marcadores:
- "ATA DE PLENARIO", "SESSAO DO TRIBUNAL DO JURI", "PLENARIO DO JURI"
- Perguntas pelos jurados, "quesitacao"
Titulo: "[Plenario] Depoimento de NOME (papel)" ou "[Plenario] Interrogatorio de NOME"

CADA pessoa ouvida = 1 secao separada. Se ha 3 Termos de Depoimento no texto, sao 3 secoes.
Se a MESMA pessoa depoe em fases diferentes (inquerito E instrucao), sao secoes SEPARADAS com fases diferentes.

CLASSIFICACAO DO PAPEL:
- Se o depoente e vitima ou familiar da vitima → depoimento_vitima
- Se o depoente e testemunha, vizinho, conhecido → depoimento_testemunha
- Se e investigado/reu com "INTERROGADO(A)/CONDUZIDO" → depoimento_investigado (inquerito) ou interrogatorio (judicial)
- Se o texto menciona "na qualidade de suposto(a) autor(a)" ou "investigado" e e fase policial → depoimento_investigado
- Se e interrogatorio em audiencia judicial → interrogatorio

REGRA: Prefira `depoimento_investigado` para termos do inquerito policial e `interrogatorio` para interrogatorios judiciais.

MARCADORES TEXTUAIS adicionais:
1. "TERMO DE DEPOIMENTO" → depoimento_testemunha ou depoimento_vitima (fase: inquerito)
2. "TERMO DE DECLARACOES" → depoimento_testemunha ou depoimento_vitima (fase: inquerito)
3. "TERMO DE QUALIFICACAO E INTERROGATORIO" → depoimento_investigado (fase: inquerito)
4. "AUTO DE QUALIFICACAO E INTERROGATORIO" → depoimento_investigado (fase: inquerito)
5. "OITIVA DE TESTEMUNHA" em audiencia → depoimento_testemunha (fase: instrucao)
6. "OITIVA DA VITIMA" em audiencia → depoimento_vitima (fase: instrucao)
7. "INTERROGATORIO DO REU" em audiencia → interrogatorio (fase: instrucao)

ESTRUTURA FORMAL de depoimento POLICIAL:
- Cabecalho: delegacia + tipo do termo
- Referencia: "IP N°" ou "BO N°" + numero
- Data/hora: "As HH:MM do dia DD do mes de MMMM do ano de AAAA"
- Autoridade: "sob a presidencia do(a) Delegado(a) de Policia, NOME"
- Escrivao: "comigo NOME, Escrivao(a) de Policia"
- Pessoa ouvida: "compareceu o(a) DEPOENTE:" ou "DECLARANTE:" ou "INTERROGADO(A):"
- Conteudo: "INQUIRIDO(A) acerca do(s) fato(s)..." ou "as perguntas RESPONDEU:"
- Encerramento: "Nada mais disse e nem lhe foi perguntado"

ESTRUTURA FORMAL de depoimento JUDICIAL:
- Cabecalho: Vara + Comarca + "Ata de Audiencia"
- Presenca: Juiz, Promotor, Defensor, reu
- Compromisso: "prestou compromisso legal" (testemunhas) ou "advertida(o)" (vitima)
- Perguntas alternadas: "Pelo(a) MP:", "Pela Defesa:", "Pelo(a) Juiz(a):"
- Encerramento: "Nada mais foi perguntado" ou "Encerrada a inquiricao"

RELATORIO POLICIAL vs DEPOIMENTO:
- relatorio_policial = documento NARRATIVO do delegado. Contem: "Relatam os autos", "Relatorio Final", "Relatorio de Investigacao", resumo dos fatos, conclusoes. MESMO QUE mencione o que testemunhas disseram, e relatorio_policial. Um relatorio pode ter muitas paginas — UMA unica secao.
- Se o texto NAO tem a estrutura formal acima (Termo + compareceu + INQUIRIDO + Nada mais disse), NAO e depoimento — e relatorio_policial ou outra peca.
- Trechos como "conforme declarou a testemunha X..." dentro de narrativa = relatorio_policial (nao depoimento).

REGRAS GERAIS:
- Autuacao, juntada, verificacao autenticidade, certidao publicacao, remessa, vista MP, conclusao, ato ordinatorio, termo abertura/encerramento = burocracia
- Certidao com conteudo relevante (antecedentes, comparecimento) = certidao_relevante. Mera certidao burocracia = burocracia
- Auto de Prisao em Flagrante (AUTUACAO do flagrante) = auto_prisao
- Sumario/capa PJe = burocracia
- Requisicao de Exame Pericial = outros
- Missao Policial / Ordem de Missao = diligencias_422
- Representacao por Prisao Preventiva = outros

RESPONDA APENAS JSON (sem markdown). Exemplo com MULTIPLAS secoes em FASES DIFERENTES:
{"sections":[
  {"tipo":"relatorio_policial","titulo":"Relatorio Final do Inquerito Policial","paginaInicio":5,"paginaFim":15,"resumo":"Relatorio narrativo do delegado...","confianca":95,"metadata":{"fase":null,"pessoas":[{"nome":"Anderson Carvalho","papel":"delegado"}],"cronologia":[],"tesesDefensivas":[],"contradicoes":[],"pontosCriticos":[],"partesmencionadas":[],"datasExtraidas":[],"artigosLei":[]}},
  {"tipo":"depoimento_vitima","titulo":"[Inquerito] Depoimento de Maria da Silva (mae da vitima)","paginaInicio":16,"paginaFim":17,"resumo":"Mae relata na delegacia ultima vez que viu o filho...","confianca":98,"metadata":{"fase":"inquerito","autoridade":"Del. Anderson Carvalho","sob_compromisso":false,"pessoas":[{"nome":"Maria da Silva","papel":"vitima","descricao":"mae da vitima"}],"cronologia":[{"data":"07/06/2024","descricao":"Data do depoimento"}],"tesesDefensivas":[],"contradicoes":[],"pontosCriticos":["Contradiz horario do BO"],"partesmencionadas":["Maria da Silva"],"datasExtraidas":["07/06/2024"],"artigosLei":[]}},
  {"tipo":"depoimento_vitima","titulo":"[Instrucao] Oitiva de Maria da Silva (mae da vitima)","paginaInicio":45,"paginaFim":47,"resumo":"Em juizo, mae muda versao sobre horario e diz que nao tem certeza...","confianca":96,"metadata":{"fase":"instrucao","autoridade":"Juiz(a) Fulano","sob_compromisso":false,"pessoas":[{"nome":"Maria da Silva","papel":"vitima","descricao":"mae da vitima"}],"cronologia":[{"data":"15/09/2024","descricao":"Data da audiencia"}],"tesesDefensivas":[],"contradicoes":["Mudou versao sobre horario em relacao ao inquerito"],"pontosCriticos":["Contradiz proprio depoimento na delegacia — favoravel a defesa"],"partesmencionadas":["Maria da Silva"],"datasExtraidas":["15/09/2024"],"artigosLei":[]}},
  {"tipo":"depoimento_testemunha","titulo":"[Inquerito] Depoimento de Joao Santos (vizinho)","paginaInicio":18,"paginaFim":19,"resumo":"Vizinho diz ter ouvido gritos, nao viu diretamente...","confianca":95,"metadata":{"fase":"inquerito","autoridade":"Del. Anderson Carvalho","sob_compromisso":false,"pessoas":[{"nome":"Joao Santos","papel":"testemunha","descricao":"vizinho"}],"cronologia":[],"tesesDefensivas":[],"contradicoes":[],"pontosCriticos":["Depoimento de ouvir-dizer — nao presencial"],"partesmencionadas":["Joao Santos"],"datasExtraidas":[],"artigosLei":[]}},
  {"tipo":"depoimento_investigado","titulo":"[Inquerito] Interrogatorio de Fulano de Tal","paginaInicio":20,"paginaFim":22,"resumo":"Investigado nega participacao na delegacia...","confianca":98,"metadata":{"fase":"inquerito","autoridade":"Del. Anderson Carvalho","sob_compromisso":false,"pessoas":[{"nome":"Fulano de Tal","papel":"investigado"}],"cronologia":[],"tesesDefensivas":[{"tipo":"absolvicao","descricao":"Nega autoria","confianca":40}],"contradicoes":[],"pontosCriticos":["Exerceu direito ao silencio parcial"],"partesmencionadas":["Fulano de Tal"],"datasExtraidas":[],"artigosLei":[]}},
  {"tipo":"interrogatorio","titulo":"[Instrucao] Interrogatorio de Fulano de Tal","paginaInicio":55,"paginaFim":58,"resumo":"Em juizo, reu alega legitima defesa com detalhes...","confianca":97,"metadata":{"fase":"instrucao","autoridade":"Juiz(a) Fulano","sob_compromisso":false,"pessoas":[{"nome":"Fulano de Tal","papel":"investigado"}],"cronologia":[],"tesesDefensivas":[{"tipo":"excludente","descricao":"Alega legitima defesa — vitima avancou com faca","confianca":65}],"contradicoes":["Na delegacia negou participacao, em juizo admite mas alega defesa"],"pontosCriticos":["Mudanca de tese entre fases — pode ser confissao qualificada"],"partesmencionadas":["Fulano de Tal"],"datasExtraidas":[],"artigosLei":["art. 25 CP"]}}
]}

Campos metadata.fase: inquerito|instrucao|plenario|null (OBRIGATORIO para depoimentos/interrogatorios, null para demais pecas)
Campos metadata.autoridade: nome do delegado, juiz ou presidente do juri que presidiu o ato (string ou null)
Campos metadata.sob_compromisso: se a testemunha prestou compromisso legal (true/false, null se nao aplicavel)
Campos metadata.pessoas[].papel: vitima|investigado|testemunha|juiz|promotor|delegado|perito|defensor|outro
Campos metadata.tesesDefensivas[].tipo: nulidade|prescricao|excludente|atenuante|desclassificacao|absolvicao|procedimento|prova_ilicita|outra
Se nenhuma peca encontrada: {"sections":[]}
IMPORTANTE: Use SOMENTE os tipos listados acima. Nao invente tipos novos.
IMPORTANTE: Para depoimentos e interrogatorios, SEMPRE inclua metadata.fase (inquerito, instrucao ou plenario). Se a MESMA pessoa depoem em fases diferentes, crie secoes SEPARADAS.
NOTA: Este bloco pode ter overlap de paginas com blocos adjacentes. Identifique TODAS as secoes que iniciam ou estao completamente dentro deste bloco normalmente. O sistema fara deduplicacao automatica de secoes repetidas.

---

## FORMATO DE SAIDA (OBRIGATORIO)

Responda EXCLUSIVAMENTE um objeto JSON valido, sem blocos ```json, sem texto antes ou depois.
O array de secoes (no formato dos exemplos acima) deve vir DENTRO da chave "sections":

{"sections": [ { ...secao... }, { ...secao... } ]}

O primeiro caractere da resposta deve ser { e o ultimo }.
