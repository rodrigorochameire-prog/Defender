import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
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
} from "lucide-react";

interface PJeAgendaImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (eventos: any[]) => void;
}

interface AssistidoInfo {
  nome: string;
  cpf: string;
}

interface ParsedEvento {
  titulo: string;
  tipo: string;
  data: string;
  horarioInicio: string;
  horarioFim: string;
  local: string;
  processo: string;
  assistido: string;
  assistidos: AssistidoInfo[]; // Lista de assistidos com nome e CPF
  atribuicao: string;
  status: string;
  descricao: string;
  classeJudicial: string;
  situacaoAudiencia: string;
  orgaoJulgador: string;
}

export function PJeAgendaImportModal({ isOpen, onClose, onImport }: PJeAgendaImportModalProps) {
  const [htmlContent, setHtmlContent] = useState("");
  const [parsedEventos, setParsedEventos] = useState<ParsedEvento[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Conectivos que devem permanecer em minúsculo no Title Case
  const conectivos = ["de", "da", "do", "das", "dos", "e", "em", "para", "por", "com", "sem", "a", "o", "as", "os"];

  // Função para converter texto em Title Case (exceto conectivos)
  const toTitleCase = (texto: string): string => {
    if (!texto) return "";
    
    return texto
      .toLowerCase()
      .split(" ")
      .map((palavra, index) => {
        // Primeira palavra sempre em maiúsculo, conectivos em minúsculo
        if (index === 0 || !conectivos.includes(palavra)) {
          return palavra.charAt(0).toUpperCase() + palavra.slice(1);
        }
        return palavra;
      })
      .join(" ");
  };

  const mapearAtribuicao = (orgaoJulgador: string, classeJudicial: string, textoCompleto: string): string => {
    const texto = `${orgaoJulgador} ${classeJudicial} ${textoCompleto}`.toUpperCase();

    // Violência Doméstica - verificar múltiplas variações e padrões
    if (
      texto.includes("VIOLÊNCIA DOMÉSTICA") || 
      texto.includes("VIOLENCIA DOMESTICA") || 
      texto.includes("VIOLÊNCIA DOM") ||
      texto.includes("VIOLENCIA DOM") ||
      texto.includes("MARIA DA PENHA") ||
      texto.includes("MEDIDAS PROTETIVAS") ||
      texto.includes("MULHER DE CAMAÇARI") ||
      texto.includes("MULHER DE CAMACARI") ||
      texto.includes("VARA DE VIOLÊNCIA") ||
      texto.includes("VARA DE VIOLENCIA") ||
      /VIOL[EÊ]NCIA\s+DOM[EÉ]STICA\s+FAM/i.test(texto)
    ) {
      return "Violência Doméstica";
    }
    if (texto.includes("TRIBUNAL DO JÚRI") || texto.includes("TRIBUNAL DO JURI") || texto.includes("PLENÁRIO")) {
      return "Tribunal do Júri";
    }
    if (texto.includes("EXECUÇÃO PENAL") || texto.includes("EXECUCAO PENAL") || texto.includes("EXECUÇÕES")) {
      return "Execução Penal";
    }
    if (texto.includes("CURADORIA")) {
      return "Curadoria";
    }

    return "Criminal Geral";
  };

  const extrairAssistido = (partesTexto: string): string => {
    // Formato: "Autor X Réu"
    // O assistido da defensoria é o réu (segunda parte após o X)
    const partes = partesTexto.split(/\s+X\s+/);
    
    if (partes.length >= 2) {
      // Pegar a segunda parte (réu) e limpar
      let assistido = partes[1].trim();
      
      // Remover texto extra como "registrado(a) civilmente como"
      assistido = assistido.replace(/registrado\(a\) civilmente como.*/i, "").trim();
      
      return assistido;
    }

    return "";
  };

  // ============================================
  // TIPOS DE AUDIÊNCIA POR ATRIBUIÇÃO
  // ============================================
  // Júri: Júri, AIJ, Custódia, PAP
  // Violência Doméstica: AIJ, Justificação, Custódia, Oitiva especial, Retratação
  // Execução Penal: Justificação, Admonitória
  // Criminal Geral: AIJ, Custódia, ANPP, Justificação
  // ============================================
  
  const mapearTipoAudiencia = (tipoTexto: string, atribuicao: string): { sigla: string; descricao: string } => {
    const tipo = tipoTexto.toUpperCase();
    const isJuri = atribuicao === "Tribunal do Júri";
    const isViolenciaDomestica = atribuicao === "Violência Doméstica";
    const isExecucaoPenal = atribuicao === "Execução Penal";
    const isCriminalGeral = atribuicao === "Criminal Geral";

    // === TRIBUNAL DO JÚRI ===
    if (isJuri) {
      // Sessão de Julgamento do Júri (Plenário)
      if (tipo.includes("SESSÃO") || tipo.includes("PLENÁRIO") || tipo.includes("PLENARIO") || 
          tipo.includes("JULGAMENTO DO JÚRI") || tipo.includes("JULGAMENTO DO JURI") ||
          tipo.includes("TRIBUNAL DO JÚRI") || tipo.includes("TRIBUNAL DO JURI")) {
        return { sigla: "Júri", descricao: "Sessão de Julgamento do Tribunal do Júri" };
      }
      // AIJ - Audiência de Instrução e Julgamento (fase de instrução do júri)
      if (tipo.includes("INSTRUÇÃO") || tipo.includes("INSTRUCAO") || 
          (tipo.includes("JULGAMENTO") && !tipo.includes("SESSÃO"))) {
        return { sigla: "AIJ", descricao: "Audiência de Instrução e Julgamento" };
      }
      // Custódia
      if (tipo.includes("CUSTÓDIA") || tipo.includes("CUSTODIA")) {
        return { sigla: "Custódia", descricao: "Audiência de Custódia" };
      }
      // PAP - Produção Antecipada de Provas
      if (tipo.includes("PRODUÇÃO ANTECIPADA") || tipo.includes("PRODUCAO ANTECIPADA") || 
          tipo.includes("PAP") || tipo.includes("ANTECIPADA DE PROVAS") ||
          tipo.includes("PRESENCIAL")) {
        return { sigla: "PAP", descricao: "Produção Antecipada de Provas" };
      }
    }

    // === VIOLÊNCIA DOMÉSTICA ===
    if (isViolenciaDomestica) {
      // AIJ
      if (tipo.includes("INSTRUÇÃO") || tipo.includes("INSTRUCAO") || tipo.includes("JULGAMENTO")) {
        return { sigla: "AIJ", descricao: "Audiência de Instrução e Julgamento" };
      }
      // Justificação
      if (tipo.includes("JUSTIFICAÇÃO") || tipo.includes("JUSTIFICACAO")) {
        return { sigla: "Justificação", descricao: "Audiência de Justificação" };
      }
      // Custódia
      if (tipo.includes("CUSTÓDIA") || tipo.includes("CUSTODIA")) {
        return { sigla: "Custódia", descricao: "Audiência de Custódia" };
      }
      // Oitiva especial
      if (tipo.includes("OITIVA") || tipo.includes("DEPOIMENTO ESPECIAL")) {
        return { sigla: "Oitiva especial", descricao: "Oitiva Especial" };
      }
      // Retratação
      if (tipo.includes("RETRATAÇÃO") || tipo.includes("RETRATACAO")) {
        return { sigla: "Retratação", descricao: "Audiência de Retratação" };
      }
    }

    // === EXECUÇÃO PENAL ===
    if (isExecucaoPenal) {
      // Justificação
      if (tipo.includes("JUSTIFICAÇÃO") || tipo.includes("JUSTIFICACAO")) {
        return { sigla: "Justificação", descricao: "Audiência de Justificação" };
      }
      // Admonitória
      if (tipo.includes("ADMONITÓRIA") || tipo.includes("ADMONITORIA") || tipo.includes("ADMONIT")) {
        return { sigla: "Admonitória", descricao: "Audiência Admonitória" };
      }
    }

    // === CRIMINAL GERAL ===
    if (isCriminalGeral) {
      // AIJ
      if (tipo.includes("INSTRUÇÃO") || tipo.includes("INSTRUCAO") || tipo.includes("JULGAMENTO")) {
        return { sigla: "AIJ", descricao: "Audiência de Instrução e Julgamento" };
      }
      // Custódia
      if (tipo.includes("CUSTÓDIA") || tipo.includes("CUSTODIA")) {
        return { sigla: "Custódia", descricao: "Audiência de Custódia" };
      }
      // ANPP - Acordo de Não Persecução Penal
      if (tipo.includes("ANPP") || tipo.includes("NÃO PERSECUÇÃO") || tipo.includes("NAO PERSECUCAO") ||
          tipo.includes("ACORDO") || tipo.includes("NÃO-PERSECUÇÃO") || tipo.includes("NAO-PERSECUCAO")) {
        return { sigla: "ANPP", descricao: "Acordo de Não Persecução Penal" };
      }
      // Justificação
      if (tipo.includes("JUSTIFICAÇÃO") || tipo.includes("JUSTIFICACAO")) {
        return { sigla: "Justificação", descricao: "Audiência de Justificação" };
      }
    }

    // === TIPOS GENÉRICOS (qualquer atribuição) ===
    
    // AIJ - padrão para instrução em qualquer vara
    if (tipo.includes("INSTRUÇÃO") || tipo.includes("INSTRUCAO") || 
        (tipo.includes("JULGAMENTO") && !tipo.includes("SESSÃO") && !tipo.includes("TRIBUNAL"))) {
      return { sigla: "AIJ", descricao: "Audiência de Instrução e Julgamento" };
    }
    
    // Custódia
    if (tipo.includes("CUSTÓDIA") || tipo.includes("CUSTODIA")) {
      return { sigla: "Custódia", descricao: "Audiência de Custódia" };
    }
    
    // Justificação
    if (tipo.includes("JUSTIFICAÇÃO") || tipo.includes("JUSTIFICACAO")) {
      return { sigla: "Justificação", descricao: "Audiência de Justificação" };
    }
    
    // Retratação
    if (tipo.includes("RETRATAÇÃO") || tipo.includes("RETRATACAO")) {
      return { sigla: "Retratação", descricao: "Audiência de Retratação" };
    }
    
    // Oitiva especial
    if (tipo.includes("OITIVA") || tipo.includes("DEPOIMENTO ESPECIAL")) {
      return { sigla: "Oitiva especial", descricao: "Oitiva Especial" };
    }
    
    // ANPP
    if (tipo.includes("ANPP") || tipo.includes("NÃO PERSECUÇÃO") || tipo.includes("NAO PERSECUCAO")) {
      return { sigla: "ANPP", descricao: "Acordo de Não Persecução Penal" };
    }
    
    // Admonitória
    if (tipo.includes("ADMONITÓRIA") || tipo.includes("ADMONITORIA")) {
      return { sigla: "Admonitória", descricao: "Audiência Admonitória" };
    }
    
    // PAP
    if (tipo.includes("PRODUÇÃO ANTECIPADA") || tipo.includes("PRODUCAO ANTECIPADA") || tipo.includes("PAP")) {
      return { sigla: "PAP", descricao: "Produção Antecipada de Provas" };
    }
    
    // Conciliação
    if (tipo.includes("CONCILIAÇÃO") || tipo.includes("CONCILIACAO")) {
      return { sigla: "Conciliação", descricao: "Audiência de Conciliação" };
    }
    
    // Sessão de Julgamento do Júri
    if (tipo.includes("SESSÃO DE JULGAMENTO") || tipo.includes("TRIBUNAL DO JÚRI") || tipo.includes("TRIBUNAL DO JURI")) {
      return { sigla: "Júri", descricao: "Sessão de Julgamento do Tribunal do Júri" };
    }

    // Fallback - usa o texto original se não for reconhecido, mas nunca "Audiência" genérico
    const textoLimpo = tipoTexto.trim();
    if (textoLimpo && textoLimpo.toLowerCase() !== "audiência") {
      return { sigla: textoLimpo, descricao: textoLimpo };
    }
    
    // Se chegou aqui sem identificar, usa AIJ como padrão (mais comum)
    return { sigla: "AIJ", descricao: "Audiência de Instrução e Julgamento" };
  };

  const mapearSituacao = (situacaoTexto: string): string => {
    const situacao = situacaoTexto.toLowerCase();

    if (situacao.includes("designada")) return "confirmado";
    if (situacao.includes("cancelada")) return "cancelado";
    if (situacao.includes("redesignada")) return "remarcado";
    if (situacao.includes("realizada")) return "concluido";
    if (situacao.includes("não-realizada") || situacao.includes("nao-realizada")) return "cancelado";

    return "confirmado";
  };

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

        // Extrair partes - buscar assistidos após o separador "X"
        // Em violência doméstica, o assistido é quem vem APÓS o X (réu, requerido, investigado, flagranteado ou autoridade polo passivo)
        const partesAssistidas: AssistidoInfo[] = [];
        
        // Primeiro, encontrar a posição do X que separa as partes
        const separadorX = textoBloco.indexOf(" X\n") !== -1 ? textoBloco.indexOf(" X\n") : textoBloco.indexOf("\nX\n");
        const textoAposX = separadorX !== -1 ? textoBloco.substring(separadorX) : textoBloco;
        
        // Padrão expandido: captura NOME - CPF: XXX (TIPO) incluindo AUTORIDADE
        // Captura grupos: 1=nome, 2=cpf (opcional), 3=tipo
        const regexAssistido = /([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑa-záàâãéèêíïóôõöúçñ\s]+?)(?:\s*-\s*CPF:\s*([\d.-]+))?\s*\((REU|INVESTIGADO|REQUERIDO|FLAGRANTEADO|RECORRIDO|APELADO|AUTORIDADE)\)/gi;
        let assistidoMatch;
        while ((assistidoMatch = regexAssistido.exec(textoAposX)) !== null) {
          let nome = assistidoMatch[1].trim();
          const cpf = assistidoMatch[2] ? assistidoMatch[2].trim() : "";
          const tipoParte = assistidoMatch[3].toUpperCase();
          
          // Limpar "registrado(a) civilmente como"
          nome = nome.replace(/registrado\(a\)\s+civilmente\s+como\s*/gi, "").trim();
          // Remover prefixos como "X "
          nome = nome.replace(/^X\s+/i, "").trim();
          // Remover quebras de linha e espaços extras
          nome = nome.replace(/\s+/g, " ").trim();
          
          // Filtrar entidades que não são pessoas físicas
          const naoEPessoa = nome.includes("Ministério") || 
                            nome.includes("VARA") || 
                            nome.includes("DEAM") || 
                            nome.includes("Polícia") ||
                            nome.includes("DT ") ||
                            nome.includes("DELEGACIA") ||
                            nome.includes("segredo de justiça") ||
                            nome.match(/^\d{2}ª?\s*D[T]/i);
          
          if (nome && nome.length > 2 && !naoEPessoa) {
            partesAssistidas.push({
              nome: toTitleCase(nome),
              cpf: cpf,
            });
          }
        }

        // Remover duplicatas por CPF ou nome
        const assistidosUnicos = partesAssistidas.filter((assistido, index, self) =>
          index === self.findIndex((a) => 
            (a.cpf && a.cpf === assistido.cpf) || a.nome === assistido.nome
          )
        );
        const assistido = assistidosUnicos.length > 0 
          ? assistidosUnicos[0].nome // Pegar apenas o primeiro assistido para o título
          : "";

        // Extrair classe processual
        const classeMatch = textoBloco.match(/AÇÃO\s+PENAL\s*-?\s*PROCEDIMENTO\s+(ORDINÁRIO|SUMÁRIO)|AÇÃO\s+PENAL\s+DE\s+COMPETÊNC?IA\s+D[OAE]\s+JÚRI|AÇÃO\s+PENAL|MEDIDAS\s+PROTETIVAS\s+DE\s+URGÊNCIA|MEDIDAS\s+PROTETIVAS|INQUÉRITO\s+POLICIAL|AUTO\s+DE\s+PRISÃO\s+EM\s+FLAGRANTE|EXECUÇÃO\s+PENAL/i);
        let classeJudicial = classeMatch ? classeMatch[0].trim() : "Ação Penal";
        // Normalizar e converter classe processual para Title Case
        classeJudicial = toTitleCase(classeJudicial.replace(/\s+/g, " ").trim());

        // Mapear atribuição (precisa ser antes do tipo de audiência) - passa textoBloco para melhor detecção
        const atribuicao = mapearAtribuicao(orgaoJulgador, classeJudicial, textoBloco);

        // Extrair tipo de audiência do texto - ordem importa (mais específico primeiro)
        let tipoAudienciaTexto = "";
        
        // Sessão de Julgamento do Júri
        if (textoBloco.match(/Sessão\s+de\s+Julgamento/i) || 
            textoBloco.match(/Plenário/i) ||
            textoBloco.match(/TRIBUNAL\s+DO\s+J[UÚ]RI.*JULGAMENTO/i)) {
          tipoAudienciaTexto = "Sessão de Julgamento do Tribunal do Júri";
        } 
        // ANPP - Acordo de Não Persecução Penal
        else if (textoBloco.match(/ANPP/i) || 
                 textoBloco.match(/N[AÃ]O[\s-]*PERSECU[CÇ][AÃ]O/i) ||
                 textoBloco.match(/ACORDO.*PENAL/i)) {
          tipoAudienciaTexto = "ANPP";
        }
        // PAP - Produção Antecipada de Provas
        else if (textoBloco.match(/PRODU[CÇ][AÃ]O\s+ANTECIPADA/i) || 
                 textoBloco.match(/PAP/i) ||
                 textoBloco.match(/ANTECIPADA\s+DE\s+PROVAS/i) ||
                 textoBloco.match(/Coleta.*Provas/i)) {
          tipoAudienciaTexto = "PAP";
        }
        // Admonitória (Execução Penal)
        else if (textoBloco.match(/ADMONIT[OÓ]RIA/i)) {
          tipoAudienciaTexto = "Admonitória";
        }
        // Oitiva Especial (antes de justificação para não confundir)
        else if (textoBloco.match(/OITIVA\s*ESPECIAL/i) || 
                 textoBloco.match(/DEPOIMENTO\s+ESPECIAL/i)) {
          tipoAudienciaTexto = "Oitiva especial";
        }
        // Retratação
        else if (textoBloco.match(/RETRATA[CÇ][AÃ]O/i)) {
          tipoAudienciaTexto = "Retratação";
        }
        // Justificação
        else if (textoBloco.match(/JUSTIFICA[CÇ][AÃ]O/i)) {
          tipoAudienciaTexto = "Justificação";
        }
        // Custódia
        else if (textoBloco.match(/CUST[OÓ]DIA/i)) {
          tipoAudienciaTexto = "Custódia";
        }
        // AIJ - Instrução e Julgamento (detectar múltiplos padrões)
        else if (textoBloco.match(/AUDI[EÊ]NCIA\s+DE\s+INSTRU[CÇ][AÃ]O/i) || 
                 textoBloco.match(/INSTRU[CÇ][AÃ]O\s+E?\s*JULGAMENTO/i) ||
                 textoBloco.match(/INSTRU[CÇ][AÃ]O/i) ||
                 textoBloco.match(/AIJ/i)) {
          tipoAudienciaTexto = "Instrução e Julgamento";
        }
        // Conciliação
        else if (textoBloco.match(/CONCILIA[CÇ][AÃ]O/i)) {
          tipoAudienciaTexto = "Conciliação";
        }
        // Fallback - texto genérico para deixar o mapeador decidir baseado na atribuição
        else {
          tipoAudienciaTexto = "";
        }
        
        // Mapear tipo de audiência para sigla e descrição
        const tipoAudienciaMapeado = mapearTipoAudiencia(tipoAudienciaTexto, atribuicao);

        // Local fixo - Fórum Clemente Mariani de Camaçari
        const local = "Fórum Clemente Mariani - Camaçari";
        
        // Órgão julgador em Title Case
        const orgaoJulgadorFormatado = toTitleCase(orgaoJulgador);

        // Extrair situação
        let situacao = "designada";
        if (textoBloco.match(/cancelada/i)) situacao = "cancelada";
        else if (textoBloco.match(/redesignada/i)) situacao = "redesignada";
        else if (textoBloco.match(/realizada/i)) situacao = "realizada";
        else if (textoBloco.match(/designada/i)) situacao = "designada";

        // Criar título no formato: Tipo de audiência - Nome do assistido - número do processo
        const processoCurto = processo.substring(0, 20) + "...";
        const nomeAssistidoTitulo = assistido || "Sem assistido";
        const titulo = `${tipoAudienciaMapeado.sigla} - ${nomeAssistidoTitulo} - ${processo}`;

        // Calcular horário fim
        const [h, m] = bloco.hora.split(":").map(Number);
        let duracao = 30; // Padrão 30min
        if (tipoAudienciaMapeado.sigla === "AIJ") duracao = 90;
        else if (tipoAudienciaMapeado.sigla.includes("Júri")) duracao = 480; // 8 horas para plenário
        const fimMinutos = (h * 60 + m + duracao) % 1440;
        const horarioFim = `${String(Math.floor(fimMinutos / 60)).padStart(2, "0")}:${String(fimMinutos % 60).padStart(2, "0")}`;

        // Formatar data/horário para descrição
        const dataFormatada = `${bloco.data.substring(8, 10)}/${bloco.data.substring(5, 7)}/${bloco.data.substring(2, 4)} ${bloco.hora}`;

        // Formatar lista de assistidos para exibição
        const assistidosTexto = assistidosUnicos.map(a => a.nome).join(", ");
        
        // Criar descrição estruturada no formato padrão
        const descricaoCompleta = `📋 INFORMAÇÕES DA AUDIÊNCIA

📍 Órgão Julgador: ${orgaoJulgadorFormatado || "Não informado"}

⚖️ Tipo de Audiência: ${tipoAudienciaMapeado.descricao}

📂 Processo: ${processo}

📑 Classe Processual: ${classeJudicial}

👤 Parte(s) Assistida(s): ${assistidosTexto || "Não identificado"}

📅 Data e Horário: ${dataFormatada}

✅ Status: ${situacao}`;

        const evento: ParsedEvento = {
          titulo,
          tipo: "audiencia",
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
        console.log("Tentando método alternativo de parsing...");
        
        // Primeiro, encontrar todas as datas no formato DD/MM/AA HH:MM
        const regexData = /(\d{2})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})/g;
        const regexProcesso = /(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/g;
        
        // Encontrar todos os processos
        const processos = [...conteudo.matchAll(regexProcesso)];
        const datas = [...conteudo.matchAll(regexData)];
        
        console.log(`Encontradas ${datas.length} datas e ${processos.length} processos`);

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
            const inicio = Math.max(0, dataMatch.index! - 50);
            const fim = Math.min(conteudo.length, dataMatch.index! + 2000);
            const textoContexto = conteudo.substring(inicio, fim);
            
            // Extrair assistidos após o X (incluindo AUTORIDADE para casos específicos)
            const partesAssistitasAlt: AssistidoInfo[] = [];
            
            // Encontrar posição do X separador
            const separadorXAlt = textoContexto.indexOf(" X\n") !== -1 ? textoContexto.indexOf(" X\n") : textoContexto.indexOf("\nX\n");
            const textoAposXAlt = separadorXAlt !== -1 ? textoContexto.substring(separadorXAlt) : textoContexto;
            
            // Regex que captura nome, CPF e tipo
            const regexAssistidoAlt = /([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑa-záàâãéèêíïóôõöúçñ\s]+?)(?:\s*-\s*CPF:\s*([\d.-]+))?\s*\((REU|INVESTIGADO|REQUERIDO|FLAGRANTEADO|RECORRIDO|APELADO|AUTORIDADE)\)/gi;
            let assistidoMatchAlt;
            while ((assistidoMatchAlt = regexAssistidoAlt.exec(textoAposXAlt)) !== null) {
              let nome = assistidoMatchAlt[1].trim()
                .replace(/registrado\(a\)\s+civilmente\s+como\s*/gi, "")
                .replace(/^X\s+/i, "")
                .replace(/\s+/g, " ")
                .trim();
              const cpf = assistidoMatchAlt[2] ? assistidoMatchAlt[2].trim() : "";
              
              const naoEPessoa = nome.includes("Ministério") || 
                                nome.includes("VARA") || 
                                nome.includes("DEAM") || 
                                nome.includes("Polícia") ||
                                nome.includes("DT ") ||
                                nome.includes("DELEGACIA") ||
                                nome.includes("segredo de justiça") ||
                                nome.match(/^\d{2}ª?\s*D[T]/i);
              
              if (nome && nome.length > 2 && !naoEPessoa) {
                partesAssistitasAlt.push({
                  nome: toTitleCase(nome),
                  cpf: cpf,
                });
              }
            }
            
            // Remover duplicatas
            const assistidosUnicosAlt = partesAssistitasAlt.filter((assistido, index, self) =>
              index === self.findIndex((a) => 
                (a.cpf && a.cpf === assistido.cpf) || a.nome === assistido.nome
              )
            );
            const assistidoAlt = assistidosUnicosAlt.length > 0 ? assistidosUnicosAlt[0].nome : "";
            const assistidosTextoAlt = assistidosUnicosAlt.map(a => a.nome).join(", ");
            
            // Órgão julgador
            const orgaoMatchAlt = textoContexto.match(/(VARA\s+D[OAE]\s+[^()\n]+?)(?:\s+(?:Ministério|Em\s+segredo|DEAM|\d{2}ª\s+D[T])|$)/i);
            const orgao = orgaoMatchAlt ? toTitleCase(orgaoMatchAlt[1].trim()) : "Não informado";
            
            // Local fixo
            const localAlt = "Fórum Clemente Mariani - Camaçari";
            
            // Mapear atribuição
            const atribuicaoAlt = mapearAtribuicao(orgao, "", textoContexto);
            
            // Determinar tipo de audiência
            let tipoAudTexto = "Audiência";
            if (textoContexto.match(/Sessão\s+de\s+Julgamento.*Tribunal\s+do\s+Juri|Sessão\s+do\s+Tribunal\s+do\s+Júri/i)) {
              tipoAudTexto = "Sessão de Julgamento do Tribunal do Júri";
            } else if (textoContexto.match(/AUDIÊNCIA\s+DE\s+INSTRUÇÃO\s+E\s+JULGAMENTO/i) || textoContexto.match(/INSTRUÇÃO\s+E\s+JULGAMENTO/i)) {
              tipoAudTexto = "Audiência de Instrução e Julgamento";
            } else if (textoContexto.match(/JUSTIFICAÇÃO/i) || textoContexto.match(/JUSTIFICAÇ/i)) {
              tipoAudTexto = "Justificação";
            } else if (textoContexto.match(/CUSTÓDIA/i) || textoContexto.match(/CUSTODIA/i)) {
              tipoAudTexto = "Custódia";
            } else if (textoContexto.match(/RETRATAÇÃO/i) || textoContexto.match(/RETRATACAO/i)) {
              tipoAudTexto = "Retratação";
            } else if (textoContexto.match(/OITIVA\s+ESPECIAL/i) || textoContexto.match(/DEPOIMENTO\s+ESPECIAL/i)) {
              tipoAudTexto = "Oitiva especial";
            }
            
            const tipoAudMapeado = mapearTipoAudiencia(tipoAudTexto, atribuicaoAlt);
            
            // Situação
            let sit = "designada";
            if (textoContexto.match(/\bcancelada\b/i)) sit = "cancelada";
            else if (textoContexto.match(/\bredesignada\b/i)) sit = "redesignada";
            
            // Extrair classe processual e converter para Title Case
            const classeMatchAlt = textoContexto.match(/AÇÃO\s+PENAL|MEDIDAS\s+PROTETIVAS\s+DE\s+URGÊNCIA|MEDIDAS\s+PROTETIVAS|EXECUÇÃO\s+PENAL|INQUÉRITO\s+POLICIAL|AUTO\s+DE\s+PRISÃO/i);
            const classeAlt = classeMatchAlt ? toTitleCase(classeMatchAlt[0].trim()) : "Ação Penal";
            
            // Calcular horário fim
            const [hh, mm] = horarioInicio.split(":").map(Number);
            let dur = tipoAudMapeado.sigla.includes("Júri") ? 480 : tipoAudMapeado.sigla === "AIJ" ? 90 : 30;
            const fimMin = (hh * 60 + mm + dur) % 1440;
            const horFim = `${String(Math.floor(fimMin / 60)).padStart(2, "0")}:${String(fimMin % 60).padStart(2, "0")}`;
            
            // Formatar data/horário para descrição
            const dataFormatadaAlt = `${dataCompleta.substring(8, 10)}/${dataCompleta.substring(5, 7)}/${dataCompleta.substring(2, 4)} ${horarioInicio}`;
            
            // Criar descrição estruturada
            const descricaoAlt = `📋 INFORMAÇÕES DA AUDIÊNCIA

📍 Órgão Julgador: ${orgao}

⚖️ Tipo de Audiência: ${tipoAudMapeado.descricao}

📂 Processo: ${processoMaisProximo}

📑 Classe Processual: ${classeAlt}

👤 Parte(s) Assistida(s): ${assistidosTextoAlt || "Não identificado"}

📅 Data e Horário: ${dataFormatadaAlt}

✅ Status: ${sit}`;
            
            const eventoAlt: ParsedEvento = {
              titulo: `${tipoAudMapeado.sigla} - ${assistidoAlt || "Sem assistido"} - ${processoMaisProximo}`,
              tipo: "audiencia",
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
  };

  const getAtribuicaoIcon = (atribuicao: string) => {
    if (atribuicao.includes("Júri")) return Gavel;
    if (atribuicao.includes("Violência")) return Shield;
    if (atribuicao.includes("Execução")) return Scale;
    return FileText;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Upload className="w-6 h-6 text-blue-600" />
            Importar Pauta de Audiências do PJe
          </DialogTitle>
          <DialogDescription className="text-sm text-zinc-500 dark:text-zinc-400">
            Cole o HTML completo da pauta de audiências do PJe. O sistema irá extrair automaticamente
            todos os dados importantes.
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
            <li>Pressione <kbd className="px-1.5 py-0.5 bg-white dark:bg-zinc-800 rounded border">Ctrl+A</kbd> para selecionar tudo</li>
            <li>Pressione <kbd className="px-1.5 py-0.5 bg-white dark:bg-zinc-800 rounded border">Ctrl+C</kbd> para copiar</li>
            <li>Cole no campo abaixo e clique em &ldquo;Processar&rdquo;</li>
          </ol>
        </div>

        {/* Campo de input */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            HTML da Pauta do PJe
          </Label>
          <Textarea
            value={htmlContent}
            onChange={(e) => setHtmlContent(e.target.value)}
            placeholder="Cole aqui o conteúdo completo da página de pauta do PJe..."
            className="min-h-[200px] font-mono text-xs bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700"
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
              <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-50">
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
                  <Card key={index} className="p-4 border border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950/30 flex items-center justify-center flex-shrink-0">
                        <Gavel className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-zinc-900 dark:text-zinc-50 mb-2">
                          {evento.titulo}
                        </h4>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{new Date(evento.data).toLocaleDateString("pt-BR")} às {evento.horarioInicio}</span>
                          </div>

                          <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                            <MapPin className="w-3.5 h-3.5" />
                            <span className="truncate">{evento.local}</span>
                          </div>

                          <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                            <AtribuicaoIcon className="w-3.5 h-3.5" />
                            <span>{evento.atribuicao}</span>
                          </div>

                          <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
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
        <div className="flex justify-between items-center pt-4 border-t border-zinc-200 dark:border-zinc-800">
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
