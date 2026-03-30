"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, FileText, Sparkles, ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc/client";

interface TemplateSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (template: {
    id: number;
    titulo: string;
    descricao: string | null;
    conteudo: string;
    variaveis: unknown;
    formatacao: unknown;
  }) => void;
}

export function TemplateSelector({ open, onClose, onSelect }: TemplateSelectorProps) {
  const [search, setSearch] = useState("");

  const { data: templates, isLoading } = trpc.oficios.templates.useQuery(
    { search: search || undefined },
    { enabled: open }
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl bg-card border-border max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-foreground">Selecionar Template de Oficio</DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar template..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-muted/50 border-border text-foreground"
          />
        </div>

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500" />
            </div>
          ) : !templates?.length ? (
            <div className="text-center py-12">
              <FileText className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground text-sm">
                {search
                  ? "Nenhum template encontrado"
                  : "Nenhum template de oficio cadastrado"}
              </p>
              <p className="text-muted-foreground/50 text-xs mt-1">
                Use Analisar meus oficios para gerar templates automaticamente
              </p>
            </div>
          ) : (
            templates.map((tmpl) => {
              const fmt = tmpl.formatacao as Record<string, unknown> | null;
              const tipoOficio = (fmt?.tipoOficio as string) || "";
              return (
                <button
                  key={tmpl.id}
                  onClick={() =>
                    onSelect({
                      id: tmpl.id,
                      titulo: tmpl.titulo,
                      descricao: tmpl.descricao,
                      conteudo: tmpl.conteudo,
                      variaveis: tmpl.variaveis,
                      formatacao: tmpl.formatacao,
                    })
                  }
                  className="w-full text-left p-3 rounded-lg border border-border bg-muted/50
                    hover:bg-muted hover:border-emerald-500/30 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
                        <span className="font-medium text-foreground truncate">
                          {tmpl.titulo}
                        </span>
                      </div>
                      {tmpl.descricao && (
                        <p className="text-xs text-muted-foreground line-clamp-2 ml-6">
                          {tmpl.descricao}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 ml-6">
                        {tipoOficio && (
                          <Badge
                            variant="outline"
                            className="text-[10px] text-muted-foreground border-border"
                          >
                            {tipoOficio}
                          </Badge>
                        )}
                        {tmpl.area && (
                          <Badge
                            variant="outline"
                            className="text-[10px] text-muted-foreground border-border"
                          >
                            {tmpl.area}
                          </Badge>
                        )}
                        {tmpl.totalUsos && tmpl.totalUsos > 0 && (
                          <span className="text-[10px] text-muted-foreground/50">
                            {tmpl.totalUsos}x usado
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-emerald-400 shrink-0 mt-1 transition-colors" />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer: criar template livre */}
        <div className="pt-3 border-t border-border">
          <Button
            variant="ghost"
            className="w-full text-muted-foreground hover:text-foreground"
            onClick={() =>
              onSelect({
                id: 0,
                titulo: "Oficio em branco",
                descricao: null,
                conteudo: "",
                variaveis: [],
                formatacao: null,
              })
            }
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Criar oficio em branco
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
