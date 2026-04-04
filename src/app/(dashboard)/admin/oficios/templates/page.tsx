"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  LayoutTemplate,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

const AREA_LABELS: Record<string, string> = {
  JURI: "Juri",
  EXECUCAO_PENAL: "Execucao Penal",
  VIOLENCIA_DOMESTICA: "VVD",
  SUBSTITUICAO: "Substituicao",
  CURADORIA: "Curadoria",
  FAMILIA: "Familia",
  CIVEL: "Civel",
  FAZENDA_PUBLICA: "Fazenda Publica",
};

const TIPO_OFICIO_LABELS: Record<string, string> = {
  requisitorio: "Requisitorio",
  comunicacao: "Comunicacao",
  encaminhamento: "Encaminhamento",
  solicitacao_providencias: "Solic. Providencias",
  intimacao: "Intimacao",
  pedido_informacao: "Pedido de Info",
  manifestacao: "Manifestacao",
  representacao: "Representacao",
  parecer_tecnico: "Parecer Tecnico",
  convite: "Convite",
  resposta_oficio: "Resposta",
  certidao: "Certidao",
};

export default function TemplatesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: templates, refetch, isLoading } = trpc.oficios.templates.useQuery(
    { search: search || undefined, limit: 100 },
  );

  const deleteMutation = trpc.oficios.deleteTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template excluido com sucesso");
      setDeleteId(null);
      refetch();
    },
    onError: (err) => {
      toast.error(`Erro ao excluir: ${err.message}`);
      setDeleteId(null);
    },
  });

  const handleDelete = () => {
    if (deleteId !== null) {
      deleteMutation.mutate({ id: deleteId });
    }
  };

  const tipoOficioLabel = (formatacao: unknown) => {
    const fmt = formatacao as Record<string, unknown> | null;
    if (!fmt?.tipoOficio) return null;
    return TIPO_OFICIO_LABELS[fmt.tipoOficio as string] ?? (fmt.tipoOficio as string);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <LayoutTemplate className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
              Templates de Oficios
            </h1>
            <p className="text-sm text-neutral-500">
              Modelos reutilizaveis com placeholders automaticos
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
            onClick={() => router.push("/admin/oficios")}
          >
            Ver Oficios
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => router.push("/admin/oficios/templates/novo")}
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Template
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-neutral-500" />
        <Input
          placeholder="Buscar templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-white dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-neutral-400 animate-spin" />
        </div>
      ) : !templates?.length ? (
        <EmptyState search={search} onNew={() => router.push("/admin/oficios/templates/novo")} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {templates.map((tmpl) => {
            const tipoLabel = tipoOficioLabel(tmpl.formatacao);
            return (
              <div
                key={tmpl.id}
                className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700/30 bg-white dark:bg-neutral-900/50 hover:border-emerald-500/30 transition-colors"
              >
                {/* Card top: icon + title */}
                <div className="flex items-start gap-2 mb-2">
                  <FileText className="w-4 h-4 text-emerald-500 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
                      {tmpl.titulo}
                    </p>
                    {tmpl.descricao && (
                      <p className="text-xs text-neutral-500 line-clamp-2 mt-0.5">
                        {tmpl.descricao}
                      </p>
                    )}
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                  {tipoLabel && (
                    <Badge
                      variant="outline"
                      className="text-[10px] text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700"
                    >
                      {tipoLabel}
                    </Badge>
                  )}
                  {tmpl.area && (
                    <Badge
                      variant="outline"
                      className="text-[10px] text-neutral-500 dark:text-neutral-400 border-neutral-300 dark:border-neutral-600"
                    >
                      {AREA_LABELS[tmpl.area] ?? tmpl.area}
                    </Badge>
                  )}
                  <span className="text-[10px] text-neutral-400 dark:text-neutral-600 ml-auto">
                    {tmpl.totalUsos ?? 0}x usado
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-7 text-xs border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    onClick={() => router.push(`/admin/oficios/templates/${tmpl.id}`)}
                  >
                    <Pencil className="w-3 h-3 mr-1.5" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 w-7 p-0 border-neutral-200 dark:border-neutral-700 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-300 dark:hover:border-red-800"
                    onClick={() => setDeleteId(tmpl.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir template?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao nao pode ser desfeita. O template sera removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EmptyState({
  search,
  onNew,
}: {
  search: string;
  onNew: () => void;
}) {
  return (
    <div className="text-center py-12">
      <LayoutTemplate className="w-10 h-10 mx-auto text-neutral-400 dark:text-neutral-600 mb-3" />
      <h3 className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">
        {search ? "Nenhum template encontrado" : "Nenhum template criado"}
      </h3>
      <p className="text-xs text-neutral-400 dark:text-neutral-600 mb-4 max-w-sm mx-auto">
        {search
          ? `Nenhum resultado para "${search}"`
          : "Crie templates de oficios com placeholders para agilizar a producao de documentos"}
      </p>
      {!search && (
        <Button
          variant="outline"
          className="border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
          onClick={onNew}
        >
          <Plus className="w-4 h-4 mr-2" />
          Criar template
        </Button>
      )}
    </div>
  );
}
