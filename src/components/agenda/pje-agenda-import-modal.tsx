import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { detectarSituacao } from "./detectar-tipo-audiencia";
import { detectarSlug, tipoPorSlug, TIPOS_AUDIENCIA, type AtribuicaoTipo } from "@/lib/agenda/tipos-audiencia";
import {
  toTitleCase,
  mapearAtribuicao,
  mapearSituacao,
  extrairAssistidos,
  type AssistidoInfo,
  type ParsedEvento,
} from "@/lib/agenda/parse-pauta";
import {
  Upload,
  AlertTriangle,
  CheckCircle2,
  Gavel,
  Clock,
  Calendar,
  FileText,
  Users,
  MapPin,
  XCircle,
  Scale,
  Shield,
  Info,
  RefreshCw,
  Lock,
  Folder,
} from "lucide-react";

interface PJeAgendaImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (eventos: any[]) => void;
  /** Título customizável do modal */
  title?: string;
  /** Descrição customizável */
  description?: string;
  /** Atribuição pré-selecionada (ex: "Execução Penal" para SEEU) */
  defaultAtribuicao?: string;
}

// Opções de atribuição disponíveis com ícones Lucide
function siglasDe(attr: AtribuicaoTipo): string {
  return TIPOS_AUDIENCIA.filter((t) => t.atribuicoes.includes(attr)).map((t) => t.sigla).join(", ");
}

const ATRIBUICAO_OPTIONS = [
  { value: "auto", label: "Detectar automaticamente", description: "O sistema analisa o texto e identifica a atribuição", icon: RefreshCw },
  { value: "Tribunal do Júri", label: "Tribunal do Júri", description: siglasDe("JURI"), icon: Gavel },
  { value: "Violência Doméstica", label: "Violência Doméstica", description: siglasDe("VVD"), icon: Shield },
  { value: "Execução Penal", label: "Execução Penal", description: siglasDe("EP"), icon: Lock },
  { value: "Criminal Geral", label: "Criminal Geral", description: siglasDe("CRIMINAL"), icon: Folder },
] as const;

export function PJeAgendaImportModal({ isOpen, onClose, onImport, title, description, defaultAtribuicao }: PJeAgendaImportModalProps) {
  const [htmlContent, setHtmlContent] = useState("");
  const [parsedEventos, setParsedEventos] = useState<ParsedEvento[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [forcedAtribuicao, setForcedAtribuicao] = useState<string>(defaultAtribuicao || "auto");

  const handleParse = () => {
    setIsProcessing(true);

    try {
      const eventos: ParsedEvento[] = [];
      
      // Limpar o texto: remover quebras de linha dentro de números de processo
      // e normalizar espaços
      let conteudo = htmlContent
        .replace(/(\d{7})-\s*\n\s*(\d{2}\.\d{4})/g, "$1-$2") // Juntar processo quebrado
        .replace(/(\d{2}\.\d{4})\.\s*\n\s*(\d\.\d{2}\.\d{4})/g, "$1.$2") // Continuar juntando
        .replace(/\r\n/g, "\n") // Normalizar quebras
        .replace(/\n{3,}/g, "\n\n"); // Reduzir múltiplas quebras

      // ============================================
      // PARSER PARA TEXTO DA PAUTA DO PJe
      // Formato: DD/MM/AA HH:MM + Processo + Partes
      // ============================================

      // Regex para encontrar padrões de audiência
      // Formato: "DD/MM/AA HH:MM NNNNNNN-NN.AAAA.D.DD.DDDD"
      const regexAudiencia = /(\d{2})\/(\d{2})\/(\d{2,4})\s+(\d{2}):(\d{2})\s+(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/g;
      
      let match;
      const blocos: { inicio: number; dataHora: string; processo: string; data: string; hora: string }[] = [];
      
      while ((match = regexAudiencia.exec(conteudo)) !== null) {
        const [fullMatch, dia, mes, ano, hora, minuto, processo] = match;
        const anoCompleto = ano.length === 2 ? `20${ano}` : ano;
        
        blocos.push({
          inicio: match.index,
          dataHora: fullMatch,
          processo,
          data: `${anoCompleto}-${mes}-${dia}`,
          hora: `${hora}:${minuto}`,
        });
      }

      // Processar cada bloco encontrado
      for (let i = 0; i < blocos.length; i++) {
        const bloco = blocos[i];
        const proximoBloco = blocos[i + 1];
        
        // Pegar o texto deste bloco até o próximo
        const fimBloco = proximoBloco ? proximoBloco.inicio : conteudo.length;
        const textoBloco = conteudo.substring(bloco.inicio, fimBloco);

        // Extrair informações do bloco
        const processo = bloco.processo;
        
        // Extrair órgão julgador (VARA DE VIOLÊNCIA DOMÉSTICA FAM CONTRA A MULHER DE CAMAÇARI, etc)
        // Primeiro tentar padrão específico de Violência Doméstica
        let orgaoMatch = textoBloco.match(/VARA\s+DE\s+VIOL[ÊE]NCIA\s+DOM[ÉE]STICA\s+FAM\s+CONTRA\s+A\s+MULHER\s+DE\s+CAMA[ÇC]ARI/i);
        if (!orgaoMatch) {
          // Tentar padrão genérico
          orgaoMatch = textoBloco.match(/(VARA\s+D[OAE]\s+[^()\n]+?)(?:\s+(?:Ministério|Em\s+segredo|DEAM|\d{2}ª\s+D[T])|$)/i);
        }
        let orgaoJulgador = orgaoMatch ? orgaoMatch[0].trim() : "";
        // Limpar espaços extras
        orgaoJulgador = orgaoJulgador.replace(/\s+/g, " ").trim();

        // Extrair partes — delegar para extrairAssistidos (fonte única em parse-pauta.ts)
        const separadorX = textoBloco.indexOf(" X\n") !== -1 ? textoBloco.indexOf(" X\n") : textoBloco.indexOf("\nX\n");
        const textoAposX = separadorX !== -1 ? textoBloco.substring(separadorX) : textoBloco;
        const assistidosUnicos = extrairAssistidos(textoAposX);
        const assistido = assistidosUnicos.length > 0 ? assistidosUnicos[0].nome : "";

        // Extrair classe processual
        const classeMatch = textoBloco.match(/AÇÃO\s+PENAL\s*-?\s*PROCEDIMENTO\s+(ORDINÁRIO|SUMÁRIO)|AÇÃO\s+PENAL\s+DE\s+COMPETÊNC?IA\s+D[OAE]\s+JÚRI|AÇÃO\s+PENAL|MEDIDAS\s+PROTETIVAS\s+DE\s+URGÊNCIA|MEDIDAS\s+PROTETIVAS|INQUÉRITO\s+POLICIAL|AUTO\s+DE\s+PRISÃO\s+EM\s+FLAGRANTE|EXECUÇÃO\s+PENAL/i);
        let classeJudicial = classeMatch ? classeMatch[0].trim() : "Ação Penal";
        // Normalizar e converter classe processual para Title Case
        classeJudicial = toTitleCase(classeJudicial.replace(/\s+/g, " ").trim());

        // Mapear atribuição (precisa ser antes do tipo de audiência) - passa textoBloco para melhor detecção
        // Se o usuário forçou uma atribuição, usar ela; caso contrário, detectar automaticamente
        const atribuicao = forcedAtribuicao !== "auto"
          ? forcedAtribuicao
          : mapearAtribuicao(orgaoJulgador, classeJudicial, textoBloco);

        // Detecta o tipo via catálogo único (imune à quebra de coluna do PJe).
        const tipo = tipoPorSlug(detectarSlug(textoBloco));

        // Local fixo - Fórum Clemente Mariani de Camaçari
        const local = "Fórum Clemente Mariani - Camaçari";

        // Órgão julgador em Title Case
        const orgaoJulgadorFormatado = toTitleCase(orgaoJulgador);

        // Extrair situação (lógica pura e testável; robusta contra quebra mid-word)
        const situacao = detectarSituacao(textoBloco);

        // Criar título no formato: Tipo de audiência - Nome do assistido - número do processo
        const nomeAssistidoTitulo = assistido || "Sem assistido";
        const titulo = `${tipo.sigla} - ${nomeAssistidoTitulo} - ${processo}`;

        // Calcular horário fim usando duração do catálogo
        const [h, m] = bloco.hora.split(":").map(Number);
        const duracao = tipo.duracaoMin;
        const fimMinutos = (h * 60 + m + duracao) % 1440;
        const horarioFim = `${String(Math.floor(fimMinutos / 60)).padStart(2, "0")}:${String(fimMinutos % 60).padStart(2, "0")}`;

        // Formatar data/horário para descrição
        const dataFormatada = `${bloco.data.substring(8, 10)}/${bloco.data.substring(5, 7)}/${bloco.data.substring(2, 4)} ${bloco.hora}`;

        // Formatar lista de assistidos para exibição
        const assistidosTexto = assistidosUnicos.map(a => a.nome).join(", ");

        // Criar descrição estruturada no formato padrão
        const descricaoCompleta = `INFORMAÇÕES DA AUDIÊNCIA

Órgão Julgador: ${orgaoJulgadorFormatado || "Não informado"}

Tipo de Audiência: ${tipo.descricao}

Processo: ${processo}

Classe Processual: ${classeJudicial}

Parte(s) Assistida(s): ${assistidosTexto || "Não identificado"}

Data e Horário: ${dataFormatada}

Status: ${situacao}`;

        const evento: ParsedEvento = {
          titulo,
          // Enviar o tipo real da audiência para o backend poder diferenciar
          // Sessão de Julgamento do Tribunal do Júri vs Instrução e Julgamento
          tipo: tipo.descricao,
          data: bloco.data,
          horarioInicio: bloco.hora,
          horarioFim,
          local,
          processo: processo.trim(),
          assistido: assistidosTexto,
          assistidos: assistidosUnicos,
          atribuicao,
          status: mapearSituacao(situacao),
          descricao: descricaoCompleta,
          classeJudicial,
          situacaoAudiencia: situacao,
          orgaoJulgador,
        };

        eventos.push(evento);
      }

      // ============================================
      // MÉTODO ALTERNATIVO: Buscar por data + processo em linhas separadas
      // Formato da pauta do PJe pode ter quebras de linha
      // ============================================
      if (eventos.length === 0) {
        // Primeiro, encontrar todas as datas no formato DD/MM/AA HH:MM
        const regexData = /(\d{2})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})/g;
        const regexProcesso = /(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/g;
        
        // Encontrar todos os processos
        const processos = [...conteudo.matchAll(regexProcesso)];
        const datas = [...conteudo.matchAll(regexData)];

        // Para cada data, tentar encontrar o processo mais próximo
        for (let i = 0; i < datas.length; i++) {
          const dataMatch = datas[i];
          const [, dia, mes, ano, hora, minuto] = dataMatch;
          const dataCompleta = `20${ano}-${mes}-${dia}`;
          const horarioInicio = `${hora}:${minuto}`;
          
          // Encontrar o processo mais próximo após a data
          let processoMaisProximo = "";
          let distanciaMinima = Infinity;
          
          for (const procMatch of processos) {
            const distancia = procMatch.index! - dataMatch.index!;
            if (distancia > 0 && distancia < distanciaMinima && distancia < 100) {
              distanciaMinima = distancia;
              processoMaisProximo = procMatch[1];
            }
          }
          
          if (processoMaisProximo) {
            // Pegar texto ao redor para extrair mais informações
            // Reduzido de 2000 para 500 caracteres para evitar pegar dados de outra audiência
            const inicio = Math.max(0, dataMatch.index! - 50);
            const fim = Math.min(conteudo.length, dataMatch.index! + 500);
            const textoContexto = conteudo.substring(inicio, fim);
            
            // Extrair assistidos — delegar para extrairAssistidos (fonte única em parse-pauta.ts)
            const separadorXAlt = textoContexto.indexOf(" X\n") !== -1 ? textoContexto.indexOf(" X\n") : textoContexto.indexOf("\nX\n");
            const textoAposXAlt = separadorXAlt !== -1 ? textoContexto.substring(separadorXAlt) : textoContexto;
            const assistidosUnicosAlt = extrairAssistidos(textoAposXAlt);
            const assistidoAlt = assistidosUnicosAlt.length > 0 ? assistidosUnicosAlt[0].nome : "";
            const assistidosTextoAlt = assistidosUnicosAlt.map(a => a.nome).join(", ");
            
            // Órgão julgador
            const orgaoMatchAlt = textoContexto.match(/(VARA\s+D[OAE]\s+[^()\n]+?)(?:\s+(?:Ministério|Em\s+segredo|DEAM|\d{2}ª\s+D[T])|$)/i);
            const orgao = orgaoMatchAlt ? toTitleCase(orgaoMatchAlt[1].trim()) : "Não informado";
            
            // Local fixo
            const localAlt = "Fórum Clemente Mariani - Camaçari";
            
            // Mapear atribuição (usar forçada se selecionada)
            const atribuicaoAlt = forcedAtribuicao !== "auto"
              ? forcedAtribuicao
              : mapearAtribuicao(orgao, "", textoContexto);
            
            // Detecta o tipo via catálogo único (imune à quebra de coluna do PJe).
            const tipoAud = tipoPorSlug(detectarSlug(textoContexto));

            // Situação
            // Situação: buscar na LINHA inteira do evento (desta data até a próxima),
            // não na janela de 500 caracteres — em linhas longas (vários réus) a coluna
            // "Situação" fica além da janela e a situação caía no default "designada".
            const fimLinha = datas[i + 1]?.index ?? conteudo.length;
            const textoLinha = conteudo.substring(dataMatch.index!, fimLinha);
            let sit = "designada";
            if (/\bcancelada\b/i.test(textoLinha)) sit = "cancelada";
            else if (/\bredesignada\b/i.test(textoLinha)) sit = "redesignada";
            else if (/\bn[ãa]o[\s-]?realizada\b/i.test(textoLinha)) sit = "não-realizada";
            else if (/\brealizada\b/i.test(textoLinha)) sit = "realizada";

            // Extrair classe processual e converter para Title Case
            const classeMatchAlt = textoContexto.match(/AÇÃO\s+PENAL|MEDIDAS\s+PROTETIVAS\s+DE\s+URGÊNCIA|MEDIDAS\s+PROTETIVAS|EXECUÇÃO\s+PENAL|INQUÉRITO\s+POLICIAL|AUTO\s+DE\s+PRISÃO/i);
            const classeAlt = classeMatchAlt ? toTitleCase(classeMatchAlt[0].trim()) : "Ação Penal";
            
            // Calcular horário fim usando duração do catálogo
            const [hh, mm] = horarioInicio.split(":").map(Number);
            const dur = tipoAud.duracaoMin;
            const fimMin = (hh * 60 + mm + dur) % 1440;
            const horFim = `${String(Math.floor(fimMin / 60)).padStart(2, "0")}:${String(fimMin % 60).padStart(2, "0")}`;

            // Formatar data/horário para descrição
            const dataFormatadaAlt = `${dataCompleta.substring(8, 10)}/${dataCompleta.substring(5, 7)}/${dataCompleta.substring(2, 4)} ${horarioInicio}`;

            // Criar descrição estruturada
            const descricaoAlt = `INFORMAÇÕES DA AUDIÊNCIA

Órgão Julgador: ${orgao}

Tipo de Audiência: ${tipoAud.descricao}

Processo: ${processoMaisProximo}

Classe Processual: ${classeAlt}

Parte(s) Assistida(s): ${assistidosTextoAlt || "Não identificado"}

Data e Horário: ${dataFormatadaAlt}

Status: ${sit}`;

            const eventoAlt: ParsedEvento = {
              titulo: `${tipoAud.sigla} - ${assistidoAlt || "Sem assistido"} - ${processoMaisProximo}`,
              // Enviar o tipo real da audiência para o backend poder diferenciar
              tipo: tipoAud.descricao,
              data: dataCompleta,
              horarioInicio,
              horarioFim: horFim,
              local: localAlt,
              processo: processoMaisProximo,
              assistido: assistidosTextoAlt,
              assistidos: assistidosUnicosAlt,
              atribuicao: atribuicaoAlt,
              status: mapearSituacao(sit),
              descricao: descricaoAlt,
              classeJudicial: classeAlt,
              situacaoAudiencia: sit,
              orgaoJulgador: orgao,
            };
            
            // Verificar se já não adicionamos este evento (mesmo processo e data)
            const jaExiste = eventos.some(e => 
              e.processo === eventoAlt.processo && e.data === eventoAlt.data && e.horarioInicio === eventoAlt.horarioInicio
            );
            
            if (!jaExiste) {
              eventos.push(eventoAlt);
            }
          }
        }
      }

      // ============================================
      // MÉTODO 3: Parser SEEU — Pauta de Execução Penal
      // Formato: header com "Pauta ( Tipo )" + "Data: DD/MM/YYYY"
      // Blocos: Estado da Bahia → NOME → PROCESSO SITUAÇÃO → Classe
      // ============================================
      if (eventos.length === 0) {
        const isSEEUPauta =
          conteudo.match(/Pauta\s*\(/i) ||
          (conteudo.includes("Estado da Bahia") && conteudo.match(/Data:\s*\d{2}\/\d{2}\/\d{4}/));

        if (isSEEUPauta) {
          // 1. Extrair header: vara, tipo de audiência, data, hora
          const varaMatch = conteudo.match(/^(.+?)\s*-\s*(Aberto|Fechado|Em andamento)/im);
          const vara = varaMatch ? varaMatch[1].trim() : "";

          const tipoPautaMatch = conteudo.match(/Pauta\s*\(\s*(.+?)\s*\)/i);
          const tipoPautaRaw = tipoPautaMatch ? tipoPautaMatch[1].trim() : "";

          const dataMatch = conteudo.match(/Data:\s*(\d{2})\/(\d{2})\/(\d{4})/);
          const dataSEEU = dataMatch
            ? `${dataMatch[3]}-${dataMatch[2]}-${dataMatch[1]}`
            : "";

          // Hora: aparece uma vez após "Hora Processo Partes Situação" ou no início dos blocos
          const horaMatch = conteudo.match(/(?:Hora\s+Processo\s+Partes\s+Situa[çc][aã]o\s*\n?)(\d{2}:\d{2})/i)
            || conteudo.match(/\n(\d{2}:\d{2})\s+Estado da Bahia/i)
            || conteudo.match(/\n(\d{2}:\d{2})\s/);
          const horaSEEU = horaMatch ? horaMatch[1] : "08:00";

          // 2. Detectar atribuição e tipo de audiência a partir do header
          const atribuicaoSEEU = forcedAtribuicao !== "auto"
            ? forcedAtribuicao
            : mapearAtribuicao(vara, "", `${vara} ${tipoPautaRaw} Execução Penal`);

          // Detecta o tipo via catálogo único
          const tipoAudienciaSEEU = tipoPorSlug(detectarSlug(`${vara} ${tipoPautaRaw}`));

          // 3. Extrair blocos de eventos
          // Cada bloco segue o padrão:
          //   Estado da Bahia\nNOME EM CAPS\nPROCESSO SITUAÇÃO\nClasse Processual
          // Ou variações com "Ministério Público" no lugar de "Estado da Bahia"
          const regexProcessoSEEU = /(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})\s+(DESIGNADA|CANCELADA|REDESIGNADA|REALIZADA|NÃO[\s-]*REALIZADA)/gi;
          let procMatch;
          const blocosSeeu: { processo: string; situacao: string; posicao: number }[] = [];

          while ((procMatch = regexProcessoSEEU.exec(conteudo)) !== null) {
            blocosSeeu.push({
              processo: procMatch[1],
              situacao: procMatch[2],
              posicao: procMatch.index,
            });
          }

          for (const bloco of blocosSeeu) {
            // Pegar texto ANTES do processo para encontrar o nome do réu
            // O nome geralmente está 1-3 linhas antes do processo
            const textoAntes = conteudo.substring(Math.max(0, bloco.posicao - 300), bloco.posicao);
            const linhasAntes = textoAntes.split("\n").map(l => l.trim()).filter(Boolean);

            // Pegar texto DEPOIS do processo para encontrar a classe processual
            const textoDepois = conteudo.substring(
              bloco.posicao + bloco.processo.length + bloco.situacao.length + 1,
              bloco.posicao + bloco.processo.length + bloco.situacao.length + 200
            );
            const linhasDepois = textoDepois.split("\n").map(l => l.trim()).filter(Boolean);

            // Nome do réu: linha em CAPS logo antes do processo
            // Filtrar linhas que não são nomes (Estado da Bahia, Ministério Público, cabeçalhos, etc.)
            const naoEhNome = (linha: string) =>
              /^(Estado|Minist[eé]rio|Hora|Processo|Partes|Situa[çc][aã]o|TRIBUNAL|PODER|BAHIA|Data:|Pauta|Vara|\d{2}:\d{2}|\d{2}\/\d{2}\/|Página)/i.test(linha) ||
              linha.length < 3 ||
              /^\d+$/.test(linha);

            let nomeReu = "";
            // Procurar de trás para frente nas linhas antes do processo
            for (let i = linhasAntes.length - 1; i >= 0; i--) {
              const linha = linhasAntes[i];
              if (!naoEhNome(linha) && linha === linha.toUpperCase() && /[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]/.test(linha)) {
                nomeReu = linha;
                break;
              }
            }

            // Classe processual: primeira linha válida depois do processo
            let classeProcessual = "";
            for (const linha of linhasDepois) {
              if (linha && !naoEhNome(linha) && !/^(Estado|Minist)/i.test(linha) && !/^\d{7}/.test(linha)) {
                classeProcessual = linha;
                break;
              }
            }

            // Formatar nome em Title Case
            const nomeFormatado = nomeReu ? toTitleCase(nomeReu) : "";

            // Calcular horário fim usando duração do catálogo
            const [hSEEU, mSEEU] = horaSEEU.split(":").map(Number);
            const duracaoSEEU = tipoAudienciaSEEU.duracaoMin;
            const fimMinSEEU = (hSEEU * 60 + mSEEU + duracaoSEEU) % 1440;
            const horFimSEEU = `${String(Math.floor(fimMinSEEU / 60)).padStart(2, "0")}:${String(fimMinSEEU % 60).padStart(2, "0")}`;

            const situacaoSEEU = bloco.situacao.toLowerCase().includes("design") ? "designada"
              : bloco.situacao.toLowerCase().includes("cancel") ? "cancelada"
              : bloco.situacao.toLowerCase().includes("redesign") ? "redesignada"
              : bloco.situacao.toLowerCase().includes("realiz") ? "realizada"
              : "designada";

            const tituloSEEU = `${tipoAudienciaSEEU.sigla} - ${nomeFormatado || "Sem assistido"} - ${bloco.processo}`;

            const descricaoSEEU = `INFORMAÇÕES DA AUDIÊNCIA

Órgão Julgador: ${vara || "Não informado"}

Tipo de Audiência: ${tipoAudienciaSEEU.descricao}

Processo: ${bloco.processo}

Classe Processual: ${classeProcessual || "Execução da Pena"}

Parte(s) Assistida(s): ${nomeFormatado || "Não identificado"}

Data e Horário: ${dataSEEU.substring(8, 10)}/${dataSEEU.substring(5, 7)}/${dataSEEU.substring(0, 4)} ${horaSEEU}

Status: ${situacaoSEEU}

Fonte: Pauta SEEU - ${tipoPautaRaw}`;

            eventos.push({
              titulo: tituloSEEU,
              tipo: tipoAudienciaSEEU.descricao,
              data: dataSEEU,
              horarioInicio: horaSEEU,
              horarioFim: horFimSEEU,
              local: "Fórum Clemente Mariani - Camaçari",
              processo: bloco.processo,
              assistido: nomeFormatado,
              assistidos: nomeFormatado ? [{ nome: nomeFormatado, cpf: "" }] : [],
              atribuicao: atribuicaoSEEU,
              status: mapearSituacao(situacaoSEEU),
              descricao: descricaoSEEU,
              classeJudicial: classeProcessual || "Execução da Pena",
              situacaoAudiencia: situacaoSEEU,
              orgaoJulgador: vara,
            });
          }
        }
      }

      setParsedEventos(eventos);

      if (eventos.length > 0) {
        toast.success(`${eventos.length} audiência(s) identificada(s)!`);
      } else {
        toast.error("Nenhum evento identificado. Verifique se você colou o texto da PAUTA DE AUDIÊNCIAS (não expedientes).");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao processar HTML do PJe");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = () => {
    onImport(parsedEventos);
    toast.success(`${parsedEventos.length} evento(s) importado(s) com sucesso!`);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setHtmlContent("");
    setParsedEventos([]);
    setForcedAtribuicao(defaultAtribuicao || "auto");
  };

  const getAtribuicaoIcon = (atribuicao: string) => {
    if (atribuicao.includes("Júri")) return Gavel;
    if (atribuicao.includes("Violência")) return Shield;
    if (atribuicao.includes("Execução")) return Scale;
    return FileText;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-white dark:bg-neutral-900">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 flex items-center gap-2">
            <Upload className="w-6 h-6 text-blue-600" />
            {title || "Importar Pauta de Audiências do PJe"}
          </DialogTitle>
          <DialogDescription className="text-sm text-neutral-500 dark:text-neutral-400">
            {description || "Cole o HTML completo da pauta de audiências do PJe. O sistema irá extrair automaticamente todos os dados importantes."}
          </DialogDescription>
        </DialogHeader>

        {/* Instruções */}
        <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Como importar:
          </h3>
          <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
            <li>Acesse a pauta de audiências no PJe</li>
            <li>Pressione <kbd className="px-1.5 py-0.5 bg-white dark:bg-neutral-800 rounded border">Ctrl+A</kbd> para selecionar tudo</li>
            <li>Pressione <kbd className="px-1.5 py-0.5 bg-white dark:bg-neutral-800 rounded border">Ctrl+C</kbd> para copiar</li>
            <li>Cole no campo abaixo e clique em &ldquo;Processar&rdquo;</li>
          </ol>
        </div>

        {/* Seletor de Atribuição */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
            <Scale className="w-4 h-4" />
            Atribuição da Pauta
          </Label>
          <Select value={forcedAtribuicao} onValueChange={setForcedAtribuicao}>
            <SelectTrigger className="w-full bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700">
              <SelectValue placeholder="Selecione a atribuição" />
            </SelectTrigger>
            <SelectContent>
              {ATRIBUICAO_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-start gap-2">
                      <Icon className="w-4 h-4 mt-0.5 text-neutral-500 flex-shrink-0" />
                      <div className="flex flex-col">
                        <span className="font-medium">{option.label}</span>
                        <span className="text-xs text-neutral-500">{option.description}</span>
                      </div>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {forcedAtribuicao !== "auto" && (
            <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-950/30 rounded border border-amber-200 dark:border-amber-800">
              <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                <strong>Atribuição forçada:</strong> Todos os eventos serão classificados como &ldquo;{forcedAtribuicao}&rdquo;.
                Útil quando a pauta é de uma única vara e a detecção automática não está funcionando corretamente.
              </p>
            </div>
          )}
        </div>

        {/* Campo de input */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            Conteúdo da Pauta do PJe
          </Label>
          <Textarea
            value={htmlContent}
            onChange={(e) => setHtmlContent(e.target.value)}
            placeholder="Cole aqui o conteúdo completo da página de pauta do PJe..."
            className="min-h-[200px] font-mono text-xs bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700"
          />
          <div className="flex gap-2">
            <Button
              onClick={handleParse}
              disabled={!htmlContent || isProcessing}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {isProcessing ? "Processando..." : "Processar HTML"}
            </Button>
            {htmlContent && (
              <Button variant="outline" onClick={handleReset}>
                <XCircle className="w-4 h-4 mr-2" />
                Limpar
              </Button>
            )}
          </div>
        </div>

        {/* Preview dos eventos parseados */}
        {parsedEventos.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-neutral-900 dark:text-neutral-50">
                Eventos Identificados ({parsedEventos.length})
              </h3>
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Pronto para importar
              </Badge>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {parsedEventos.map((evento, index) => {
                const AtribuicaoIcon = getAtribuicaoIcon(evento.atribuicao);
                
                return (
                  <Card key={index} className="p-4 border border-neutral-200 dark:border-neutral-800">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950/30 flex items-center justify-center flex-shrink-0">
                        <Gavel className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-neutral-900 dark:text-neutral-50 mb-2">
                          {evento.titulo}
                        </h4>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{evento.data.split("-").reverse().join("/")} às {evento.horarioInicio}</span>
                          </div>

                          <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400">
                            <MapPin className="w-3.5 h-3.5" />
                            <span className="truncate">{evento.local}</span>
                          </div>

                          <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400">
                            <AtribuicaoIcon className="w-3.5 h-3.5" />
                            <span>{evento.atribuicao}</span>
                          </div>

                          <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400">
                            <FileText className="w-3.5 h-3.5" />
                            <span className="truncate">{evento.classeJudicial}</span>
                          </div>
                        </div>

                        <div className="flex gap-1.5 mt-2">
                          <Badge 
                            variant="secondary"
                            className={
                              evento.status === "confirmado"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                                : evento.status === "cancelado"
                                ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                            }
                          >
                            {evento.situacaoAudiencia}
                          </Badge>
                          
                          {evento.assistido && (
                            <Badge variant="secondary">
                              <Users className="w-3 h-3 mr-1" />
                              {evento.assistido.substring(0, 30)}
                              {evento.assistido.length > 30 ? "..." : ""}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={parsedEventos.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Upload className="w-4 h-4 mr-2" />
            Importar {parsedEventos.length} Evento(s)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
