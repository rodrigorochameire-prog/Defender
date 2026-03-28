"use client";

import { format, differenceInYears, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Copy,
  ExternalLink,
  Sun,
  Brain,
  FolderOpen,
  Loader2,
  Pencil,
  Check,
  AlertCircle,
  Lightbulb,
  AlertTriangle,
  Printer,
  CheckCircle2,
  Shield,
  Scale,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface AnalysisKpis {
  totalPessoas?: number;
  totalAcusacoes?: number;
  totalDocumentosAnalisados?: number;
  totalEventos?: number;
  totalNulidades?: number;
  totalRelacoes?: number;
}

interface AnalysisDataShape {
  resumo?: string;
  achadosChave?: string[];
  recomendacoes?: string[];
  inconsistencias?: string[];
  kpis?: AnalysisKpis;
  documentosProcessados?: number;
  documentosTotal?: number;
  versaoModelo?: string;
}

interface FichaSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assistido: {
    id: number;
    nome: string;
    cpf?: string | null;
    rg?: string | null;
    dataNascimento?: string | null;
    nomeMae?: string | null;
    nomePai?: string | null;
    naturalidade?: string | null;
    endereco?: string | null;
    telefone?: string | null;
    telefoneContato?: string | null;
    nomeContato?: string | null;
    parentescoContato?: string | null;
    driveFolderId?: string | null;
    updatedAt?: Date | string | null;
  };
  onExportarSolar: () => void;
  onSyncSolar: () => void;
  onAnalisarIA: () => void;
  isExportandoSolar: boolean;
  isSyncSolar: boolean;
  isAnalisando: boolean;
  analysisData?: AnalysisDataShape | null;
  analysisStatus?: string | null;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard not available — silently ignore
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="ml-1 text-zinc-300 hover:text-zinc-600 transition-colors"
      title="Copiar"
      aria-label={copied ? "Copiado" : "Copiar"}
    >
      {copied ? (
        <Check className="h-3 w-3 text-emerald-500" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </button>
  );
}

function FieldRow({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-b-0", className)}>
      <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-0.5">
        {label}
      </p>
      <div className="text-[11px] text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
        {children}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">
      {children}
    </p>
  );
}

export function AssistidoFichaSheet({
  open,
  onOpenChange,
  assistido,
  onExportarSolar,
  onSyncSolar,
  onAnalisarIA,
  isExportandoSolar,
  isSyncSolar,
  isAnalisando,
  analysisData,
  analysisStatus,
}: FichaSheetProps) {
  const idade =
    assistido.dataNascimento
      ? differenceInYears(new Date(), parseISO(assistido.dataNascimento))
      : null;

  const dataNascFormatada =
    assistido.dataNascimento
      ? format(parseISO(assistido.dataNascimento), "dd/MM/yyyy", { locale: ptBR })
      : null;

  // Strip non-digits for WhatsApp link
  const telefoneDigits = assistido.telefone?.replace(/\D/g, "") ?? "";

  // Analysis date — derived from assistido.updatedAt when analysisStatus is set
  const analysisDateFormatted =
    analysisStatus === "completed" && assistido.updatedAt
      ? format(
          typeof assistido.updatedAt === "string"
            ? parseISO(assistido.updatedAt)
            : assistido.updatedAt,
          "dd/MM/yyyy 'às' HH:mm",
          { locale: ptBR },
        )
      : null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-80 sm:w-96 p-0 overflow-y-auto"
      >
        {/* Sheet Header */}
        <SheetHeader className="px-4 pt-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <SheetTitle className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
            Ficha do Assistido
          </SheetTitle>
          <p className="text-[11px] text-zinc-400 truncate">{assistido.nome}</p>
        </SheetHeader>

        {/* Conteúdo */}
        <div className="px-4 py-3 space-y-5">

          {/* ── Identificação ── */}
          <div>
            <SectionTitle>Identificação</SectionTitle>
            <div>
              {assistido.cpf && (
                <FieldRow label="CPF">
                  <span className="font-mono tabular-nums">{assistido.cpf}</span>
                  <CopyButton value={assistido.cpf} />
                </FieldRow>
              )}
              {assistido.rg && (
                <FieldRow label="RG">
                  <span className="font-mono tabular-nums">{assistido.rg}</span>
                  <CopyButton value={assistido.rg} />
                </FieldRow>
              )}
              {dataNascFormatada && (
                <FieldRow label="Data de Nascimento">
                  <span>{dataNascFormatada}</span>
                  {idade !== null && (
                    <span className="text-zinc-400">({idade} anos)</span>
                  )}
                </FieldRow>
              )}
              {assistido.nomeMae && (
                <FieldRow label="Nome da Mãe">
                  <span>{assistido.nomeMae}</span>
                </FieldRow>
              )}
              {assistido.nomePai && (
                <FieldRow label="Nome do Pai">
                  <span>{assistido.nomePai}</span>
                </FieldRow>
              )}
              {assistido.naturalidade && (
                <FieldRow label="Naturalidade">
                  <span>{assistido.naturalidade}</span>
                </FieldRow>
              )}
            </div>
          </div>

          {/* ── Contato ── */}
          {(assistido.telefone || assistido.telefoneContato || assistido.nomeContato) && (
            <div>
              <SectionTitle>Contato</SectionTitle>
              <div>
                {assistido.telefone && (
                  <FieldRow label="Telefone">
                    <a
                      href={`tel:${assistido.telefone}`}
                      className="hover:text-emerald-600 transition-colors"
                    >
                      {assistido.telefone}
                    </a>
                    {telefoneDigits.length >= 10 && (
                      <a
                        href={`https://wa.me/55${telefoneDigits}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1 text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 transition-colors"
                        title="WhatsApp"
                      >
                        WhatsApp
                        <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
                      </a>
                    )}
                  </FieldRow>
                )}
                {(assistido.telefoneContato || assistido.nomeContato) && (
                  <FieldRow label="Contato">
                    <span>
                      {assistido.nomeContato && (
                        <span className="font-medium">{assistido.nomeContato}</span>
                      )}
                      {assistido.parentescoContato && (
                        <span className="text-zinc-400 ml-1">({assistido.parentescoContato})</span>
                      )}
                      {assistido.telefoneContato && (
                        <span className="ml-1 tabular-nums">{assistido.telefoneContato}</span>
                      )}
                    </span>
                  </FieldRow>
                )}
              </div>
            </div>
          )}

          {/* ── Endereço ── */}
          {assistido.endereco && (
            <div>
              <SectionTitle>Endereço</SectionTitle>
              <p className="text-[11px] text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {assistido.endereco}
              </p>
            </div>
          )}

          {/* ── Ações ── */}
          <div>
            <SectionTitle>Ações</SectionTitle>
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-[11px] gap-1.5 border-zinc-200 text-zinc-600 hover:bg-zinc-50 col-span-2"
                onClick={handlePrint}
              >
                <Printer className="h-3 w-3" />
                Baixar / Imprimir ficha
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-[11px] gap-1.5 border-amber-200 text-amber-700 hover:bg-amber-50"
                disabled={isExportandoSolar}
                onClick={onExportarSolar}
              >
                {isExportandoSolar ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sun className="h-3 w-3" />
                )}
                {isExportandoSolar ? "Exportando..." : "Solar via SIGAD"}
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="h-8 text-[11px] gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50"
                disabled={isSyncSolar}
                onClick={onSyncSolar}
              >
                {isSyncSolar ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sun className="h-3 w-3" />
                )}
                {isSyncSolar ? "Sincronizando..." : "Sync Fases Solar"}
              </Button>

              {assistido.driveFolderId && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-[11px] gap-1.5 border-purple-200 text-purple-700 hover:bg-purple-50"
                    disabled={isAnalisando}
                    onClick={onAnalisarIA}
                  >
                    {isAnalisando ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Brain className="h-3 w-3" />
                    )}
                    {isAnalisando ? "Analisando..." : "Analisar com IA"}
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-[11px] gap-1.5 border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                    asChild
                  >
                    <a
                      href={`https://drive.google.com/drive/folders/${assistido.driveFolderId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <FolderOpen className="h-3 w-3" />
                      Drive
                    </a>
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* ── Análise IA ── */}
          {(analysisStatus || analysisData) && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <SectionTitle>Análise IA</SectionTitle>
                {analysisStatus === "processing" && (
                  <Badge variant="outline" className="text-[9px] h-4 gap-1 border-purple-200 text-purple-600">
                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                    Processando
                  </Badge>
                )}
                {analysisStatus === "completed" && (
                  <Badge variant="outline" className="text-[9px] h-4 gap-1 border-emerald-200 text-emerald-600">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    Concluído
                  </Badge>
                )}
                {analysisStatus === "error" && (
                  <Badge variant="outline" className="text-[9px] h-4 gap-1 border-red-200 text-red-600">
                    <AlertCircle className="h-2.5 w-2.5" />
                    Erro
                  </Badge>
                )}
              </div>

              {analysisData && (
                <div className="space-y-3">
                  {/* Resumo */}
                  {analysisData.resumo && (
                    <div>
                      <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1">Resumo</p>
                      <p className="text-[11px] text-zinc-700 dark:text-zinc-300 leading-relaxed">
                        {analysisData.resumo}
                      </p>
                    </div>
                  )}

                  {/* KPIs */}
                  {analysisData.kpis && (
                    <div className="grid grid-cols-3 gap-1.5">
                      {analysisData.kpis.totalDocumentosAnalisados !== undefined && (
                        <div className="bg-zinc-50 dark:bg-zinc-900 rounded p-1.5 text-center">
                          <p className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-200 tabular-nums">
                            {analysisData.kpis.totalDocumentosAnalisados}
                          </p>
                          <p className="text-[9px] text-zinc-400 leading-tight">Docs</p>
                        </div>
                      )}
                      {analysisData.kpis.totalPessoas !== undefined && (
                        <div className="bg-zinc-50 dark:bg-zinc-900 rounded p-1.5 text-center">
                          <p className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-200 tabular-nums">
                            {analysisData.kpis.totalPessoas}
                          </p>
                          <p className="text-[9px] text-zinc-400 leading-tight">Pessoas</p>
                        </div>
                      )}
                      {analysisData.kpis.totalEventos !== undefined && (
                        <div className="bg-zinc-50 dark:bg-zinc-900 rounded p-1.5 text-center">
                          <p className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-200 tabular-nums">
                            {analysisData.kpis.totalEventos}
                          </p>
                          <p className="text-[9px] text-zinc-400 leading-tight">Eventos</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Achados-chave */}
                  {analysisData.achadosChave && analysisData.achadosChave.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1">Achados-chave</p>
                      <ul className="space-y-1">
                        {analysisData.achadosChave.map((achado, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-[11px] text-zinc-700 dark:text-zinc-300">
                            <AlertCircle className="h-3 w-3 text-blue-500 mt-0.5 shrink-0" />
                            <span className="leading-relaxed">{achado}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recomendações */}
                  {analysisData.recomendacoes && analysisData.recomendacoes.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1">Recomendações</p>
                      <ul className="space-y-1">
                        {analysisData.recomendacoes.map((rec, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-[11px] text-zinc-700 dark:text-zinc-300">
                            <Lightbulb className="h-3 w-3 text-emerald-500 mt-0.5 shrink-0" />
                            <span className="leading-relaxed">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Inconsistências */}
                  {analysisData.inconsistencias && analysisData.inconsistencias.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1">Inconsistências</p>
                      <ul className="space-y-1">
                        {analysisData.inconsistencias.map((inc, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-[11px] text-zinc-700 dark:text-zinc-300">
                            <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                            <span className="leading-relaxed">{inc}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Radar Liberdade */}
                  {analysisData.radarLiberdade && (
                    <div className={`rounded p-2 border-l-2 ${
                      analysisData.radarLiberdade.urgencia === "ALTA" ? "border-l-red-500 bg-red-50/50 dark:bg-red-950/10" :
                      analysisData.radarLiberdade.urgencia === "MEDIA" ? "border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/10" :
                      "border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/10"
                    }`}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Shield className="h-3 w-3" />
                        <span className="text-[10px] font-semibold">{analysisData.radarLiberdade.status}</span>
                      </div>
                      <p className="text-[10px] text-zinc-500">{analysisData.radarLiberdade.detalhes}</p>
                    </div>
                  )}

                  {/* Teses */}
                  {analysisData.teses && analysisData.teses.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1">Teses</p>
                      <ul className="space-y-1">
                        {analysisData.teses.map((tese: string, i: number) => (
                          <li key={i} className="flex items-start gap-1.5 text-[11px] text-zinc-700 dark:text-zinc-300">
                            <Scale className="h-3 w-3 text-blue-500 mt-0.5 shrink-0" />
                            <span className="leading-relaxed">{tese}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Saneamento */}
                  {analysisData.saneamento?.pendencias?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1">Pendências</p>
                      <ul className="space-y-0.5">
                        {analysisData.saneamento.pendencias.map((p: string, i: number) => (
                          <li key={i} className="text-[10px] text-orange-600 dark:text-orange-400 flex items-start gap-1">
                            <span>•</span> {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Rodapé: versão do modelo e data */}
                  <div className="pt-1 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    {analysisData.versaoModelo && (
                      <span className="text-[9px] text-zinc-400 font-mono">{analysisData.versaoModelo}</span>
                    )}
                    {analysisDateFormatted && (
                      <span className="text-[9px] text-zinc-400">{analysisDateFormatted}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Editar ── */}
          <div>
            <Button
              variant="outline"
              className="w-full h-8 text-[11px] gap-1.5 text-zinc-600 border-zinc-200 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50"
              asChild
            >
              <Link href={`/admin/assistidos/${assistido.id}/editar`}>
                <Pencil className="h-3 w-3" />
                Editar cadastro
              </Link>
            </Button>
          </div>

        </div>
      </SheetContent>
    </Sheet>
  );
}
