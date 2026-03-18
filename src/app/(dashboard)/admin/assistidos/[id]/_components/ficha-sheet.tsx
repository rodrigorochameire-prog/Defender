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
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

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
    processos: Array<{ id: number; numeroAutos?: string | null }>;
  };
  onExportarSolar: () => void;
  onSyncSolar: () => void;
  onAnalisarIA: () => void;
  isExportandoSolar: boolean;
  isSyncSolar: boolean;
  isAnalisando: boolean;
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
