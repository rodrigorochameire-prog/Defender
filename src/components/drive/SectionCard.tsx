"use client";

import { Badge } from "@/components/ui/badge";
import { FileText, CheckCircle, Scissors } from "lucide-react";

const TIER_CONFIG: Record<string, { label: string; color: string }> = {
  critico: { label: "Crítico", color: "bg-red-100 text-red-700 border-red-200" },
  alto: { label: "Alto", color: "bg-orange-100 text-orange-700 border-orange-200" },
  medio: { label: "Médio", color: "bg-blue-100 text-blue-700 border-blue-200" },
  baixo: { label: "Baixo", color: "bg-zinc-100 text-zinc-500 border-zinc-200" },
  oculto: { label: "Burocracia", color: "bg-zinc-50 text-zinc-400 border-zinc-100" },
};

const TIPO_TO_TIER: Record<string, string> = {
  denuncia: "critico", sentenca: "critico", depoimento_vitima: "critico",
  depoimento_testemunha: "critico", depoimento_investigado: "critico",
  decisao: "alto", pronuncia: "alto", laudo_pericial: "alto",
  laudo_necroscopico: "alto", laudo_toxicologico: "alto", laudo_balistico: "alto",
  laudo_medico_legal: "alto", laudo_psiquiatrico: "alto", pericia_digital: "alto",
  ata_audiencia: "alto", interrogatorio: "alto", alegacoes_mp: "alto",
  alegacoes_defesa: "alto", resposta_acusacao: "alto", recurso: "alto",
  habeas_corpus: "alto", midia_mensagens: "alto", midia_imagem_video: "alto",
  boletim_ocorrencia: "medio", portaria_ip: "medio", relatorio_policial: "medio",
  auto_prisao: "medio", termo_inquerito: "medio", certidao_relevante: "medio",
  diligencias_422: "medio", alegacoes: "medio", auto_apreensao: "medio",
  mandado: "medio", reconhecimento_formal: "medio", acareacao: "medio",
  registro_telefonico: "medio",
  documento_identidade: "baixo", alvara_soltura: "baixo", guia_execucao: "baixo",
  outros: "baixo", certidao: "baixo",
  burocracia: "oculto",
};

const TIPO_LABELS: Record<string, string> = {
  denuncia: "Denúncia", sentenca: "Sentença", pronuncia: "Pronúncia",
  decisao: "Decisão", depoimento_vitima: "Depoimento Vítima",
  depoimento_testemunha: "Depoimento Testemunha",
  depoimento_investigado: "Depoimento Investigado",
  interrogatorio: "Interrogatório", ata_audiencia: "Ata de Audiência",
  laudo_pericial: "Laudo Pericial", laudo_necroscopico: "Laudo Necroscópico",
  laudo_toxicologico: "Laudo Toxicológico", laudo_balistico: "Laudo Balístico",
  laudo_medico_legal: "Laudo Médico Legal", laudo_psiquiatrico: "Laudo Psiquiátrico",
  pericia_digital: "Perícia Digital", alegacoes_mp: "Alegações MP",
  alegacoes_defesa: "Alegações Defesa", resposta_acusacao: "Resposta à Acusação",
  recurso: "Recurso", habeas_corpus: "Habeas Corpus",
  boletim_ocorrencia: "Boletim de Ocorrência", relatorio_policial: "Relatório Policial",
  auto_prisao: "Auto de Prisão", portaria_ip: "Portaria IP",
  termo_inquerito: "Termo de Inquérito", certidao_relevante: "Certidão Relevante",
  midia_mensagens: "Mensagens", midia_imagem_video: "Mídia",
  registro_telefonico: "Registro Telefônico", diligencias_422: "Diligências 422",
  mandado: "Mandado", reconhecimento_formal: "Reconhecimento",
  acareacao: "Acareação", auto_apreensao: "Auto de Apreensão",
  documento_identidade: "Documento de Identidade",
  alvara_soltura: "Alvará de Soltura", guia_execucao: "Guia de Execução",
  certidao: "Certidão", outros: "Outros", burocracia: "Burocracia",
  alegacoes: "Alegações", inquerito: "Inquérito",
};

export type SectionData = {
  id: number;
  tipo: string;
  titulo: string;
  paginaInicio: number;
  paginaFim: number;
  resumo: string | null;
  confianca: number | null;
  reviewStatus: string | null;
  metadata: any;
  fileName: string;
  fileWebViewLink: string | null;
};

interface SectionCardProps {
  section: SectionData;
  onClick: () => void;
}

export function SectionCard({ section, onClick }: SectionCardProps) {
  const tier = TIPO_TO_TIER[section.tipo] || "baixo";
  const tierConfig = TIER_CONFIG[tier];
  const tipoLabel = TIPO_LABELS[section.tipo] || section.tipo;
  const pageRange = section.paginaInicio === section.paginaFim
    ? `p. ${section.paginaInicio}`
    : `pp. ${section.paginaInicio}-${section.paginaFim}`;

  const pessoas = (section.metadata as any)?.pessoas as Array<{ nome: string; papel: string }> | undefined;
  const fase = (section.metadata as any)?.fase as string | undefined;

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-lg border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/50 transition-all group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant="outline" className={`text-[10px] shrink-0 ${tierConfig.color}`}>
            {tipoLabel}
          </Badge>
          {fase && (
            <Badge variant="outline" className="text-[10px] shrink-0 bg-violet-50 text-violet-600 border-violet-200">
              {fase === "inquerito" ? "Inquérito" : fase === "instrucao" ? "Instrução" : "Plenário"}
            </Badge>
          )}
        </div>
        <span className="text-[10px] text-zinc-400 font-mono shrink-0">{pageRange}</span>
      </div>
      <p className="text-sm font-medium text-zinc-800 mt-1.5 line-clamp-1">{section.titulo}</p>
      {section.resumo && (
        <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{section.resumo}</p>
      )}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1.5">
          {pessoas && pessoas.length > 0 && (
            <span className="text-[10px] text-zinc-400">
              {pessoas.map(p => p.nome).join(", ")}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {section.reviewStatus === "approved" && (
            <CheckCircle className="w-3 h-3 text-emerald-500" />
          )}
          {section.confianca !== null && (
            <span className={`text-[10px] font-mono ${
              section.confianca >= 90 ? "text-emerald-600" :
              section.confianca >= 70 ? "text-amber-600" : "text-red-500"
            }`}>
              {section.confianca}%
            </span>
          )}
          <FileText className="w-3 h-3 text-zinc-300" />
        </div>
      </div>
    </button>
  );
}

export { TIPO_TO_TIER, TIPO_LABELS, TIER_CONFIG };
