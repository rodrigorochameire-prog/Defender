"use client";

import { CheckCircle, Users, AlertTriangle } from "lucide-react";

const TIER_CONFIG: Record<string, { label: string; color: string; rail: string }> = {
  critico: { label: "Crítico", color: "bg-red-100 text-red-700 border-red-200", rail: "bg-red-500" },
  alto: { label: "Alto", color: "bg-orange-100 text-orange-700 border-orange-200", rail: "bg-orange-500" },
  medio: { label: "Médio", color: "bg-blue-100 text-blue-700 border-blue-200", rail: "bg-blue-500" },
  baixo: { label: "Baixo", color: "bg-zinc-100 text-zinc-500 border-zinc-200", rail: "bg-zinc-400" },
  oculto: { label: "Burocracia", color: "bg-zinc-50 text-zinc-400 border-zinc-100", rail: "bg-zinc-300" },
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
  const faseLabel = fase === "inquerito" ? "Inquérito" : fase === "instrucao" ? "Instrução" : fase === "plenario" ? "Plenário" : null;
  const pessoasStr = pessoas && pessoas.length > 0 ? pessoas.map((p) => p.nome).join(", ") : null;
  // Confiança só vira sinal quando baixa (alta é o esperado — não polui o card).
  const lowConf = section.confianca !== null && section.confianca < 70;

  return (
    <button
      onClick={onClick}
      className="group w-full text-left flex items-stretch rounded-lg bg-neutral-50/50 dark:bg-neutral-800/20 border border-transparent hover:border-neutral-200/80 dark:hover:border-neutral-700/60 hover:bg-white dark:hover:bg-neutral-800/40 hover:shadow-sm transition-all duration-150 overflow-hidden cursor-pointer"
    >
      {/* Barra lateral — tier (único elemento cromático do card) */}
      <div className={`w-1 shrink-0 ${tierConfig.rail}`} />
      <div className="flex-1 min-w-0 px-3 py-2">
        {/* Linha 1: tipo · fase … páginas */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 truncate">
            {tipoLabel}
          </span>
          {faseLabel && (
            <>
              <span className="text-[10px] text-neutral-300 dark:text-neutral-600">·</span>
              <span className="text-[10px] text-neutral-400 dark:text-neutral-500 shrink-0">{faseLabel}</span>
            </>
          )}
          <span className="ml-auto shrink-0 text-[10px] font-mono tabular-nums text-neutral-400 dark:text-neutral-500">
            {pageRange}
          </span>
        </div>

        {/* Linha 2: título — dominante */}
        <p className="text-[13px] font-semibold text-foreground leading-snug mt-0.5 line-clamp-2 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
          {section.titulo}
        </p>

        {/* Linha 3: resumo */}
        {section.resumo && (
          <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">
            {section.resumo}
          </p>
        )}

        {/* Linha 4: pessoas + status (só renderiza se houver algo) */}
        {(pessoasStr || section.reviewStatus === "approved" || lowConf) && (
          <div className="flex items-center gap-2 mt-1.5">
            {pessoasStr && (
              <span className="inline-flex items-center gap-1 min-w-0 text-[10px] text-neutral-400 dark:text-neutral-500">
                <Users className="w-2.5 h-2.5 shrink-0" />
                <span className="truncate">{pessoasStr}</span>
              </span>
            )}
            <span className="ml-auto inline-flex items-center gap-2 shrink-0">
              {lowConf && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-500"
                  title={`Confiança ${section.confianca}% — revisar`}
                >
                  <AlertTriangle className="w-2.5 h-2.5" />
                  revisar
                </span>
              )}
              {section.reviewStatus === "approved" && (
                <CheckCircle className="w-3 h-3 text-emerald-500" />
              )}
            </span>
          </div>
        )}
      </div>
    </button>
  );
}

export { TIPO_TO_TIER, TIPO_LABELS, TIER_CONFIG };
