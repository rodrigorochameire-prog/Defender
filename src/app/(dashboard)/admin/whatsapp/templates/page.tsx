"use client";

import { useState, useRef, useMemo } from "react";
import {
  FileText,
  Search,
  Plus,
  Pencil,
  Copy,
  Trash2,
  Zap,
  Loader2,
  BarChart3,
  MessageSquare,
  BookOpen,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

// ==========================================
// Constants
// ==========================================

const CATEGORY_LABELS: Record<string, string> = {
  orientacao: "Orientacao",
  solicitacao: "Solicitacao",
  audiencia: "Audiencia",
  resultado: "Resultado",
  encerramento: "Encerramento",
  geral: "Geral",
};

const CATEGORY_COLORS: Record<string, string> = {
  orientacao:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  solicitacao:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  audiencia:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800",
  resultado:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800",
  encerramento:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  geral:
    "bg-neutral-100 text-neutral-700 dark:bg-muted dark:text-muted-foreground border-neutral-200 dark:border-border",
};

const AVAILABLE_VARIABLES = [
  "{nome_assistido}",
  "{numero_processo}",
  "{data_audiencia}",
  "{nome_defensor}",
  "{vara}",
];

const CATEGORIES = [
  "orientacao",
  "solicitacao",
  "audiencia",
  "resultado",
  "encerramento",
  "geral",
] as const;

// ==========================================
// Helpers
// ==========================================

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function extractVariables(content: string): string[] {
  const matches = content.match(/\{[a-z_]+\}/g);
  return matches ? [...new Set(matches)] : [];
}

// ==========================================
// Types
// ==========================================

interface TemplateForm {
  name: string;
  title: string;
  shortcut: string;
  category: string;
  content: string;
  sortOrder: number;
}

const EMPTY_FORM: TemplateForm = {
  name: "",
  title: "",
  shortcut: "",
  category: "geral",
  content: "",
  sortOrder: 0,
};

// ==========================================
// Page
// ==========================================

export default function WhatsAppTemplatesPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<TemplateForm>(EMPTY_FORM);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const utils = trpc.useUtils();

  // Queries
  const { data: templates, isLoading } =
    trpc.whatsappChat.listTemplates.useQuery({
      category:
        categoryFilter !== "all" ? categoryFilter : undefined,
      search: search || undefined,
    });

  // We also fetch ALL templates (no filter) to compute KPI counts
  const { data: allTemplates } =
    trpc.whatsappChat.listTemplates.useQuery({});

  // Mutations
  const createMutation = trpc.whatsappChat.createTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template criado com sucesso!");
      utils.whatsappChat.listTemplates.invalidate();
      closeSheet();
    },
    onError: (error) => {
      toast.error(`Erro ao criar template: ${error.message}`);
    },
  });

  const updateMutation = trpc.whatsappChat.updateTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template atualizado!");
      utils.whatsappChat.listTemplates.invalidate();
      closeSheet();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  const deleteMutation = trpc.whatsappChat.deleteTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template removido!");
      utils.whatsappChat.listTemplates.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao remover: ${error.message}`);
    },
  });

  const duplicateMutation = trpc.whatsappChat.createTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template duplicado!");
      utils.whatsappChat.listTemplates.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao duplicar: ${error.message}`);
    },
  });

  // KPI computed values
  const kpis = useMemo(() => {
    const all = allTemplates ?? [];
    const total = all.length;
    const orientacao = all.filter((t) => t.category === "orientacao").length;
    const solicitacao = all.filter((t) => t.category === "solicitacao").length;
    const outros = total - orientacao - solicitacao;
    return { total, orientacao, solicitacao, outros };
  }, [allTemplates]);

  // Sheet handlers
  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setSheetOpen(true);
  }

  function openEdit(template: NonNullable<typeof templates>[number]) {
    setEditingId(template.id);
    setForm({
      name: template.name,
      title: template.title,
      shortcut: template.shortcut ?? "",
      category: template.category ?? "geral",
      content: template.content,
      sortOrder: template.sortOrder ?? 0,
    });
    setSheetOpen(true);
  }

  function closeSheet() {
    setSheetOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function handleTitleChange(title: string) {
    setForm((prev) => ({
      ...prev,
      title,
      name: editingId ? prev.name : slugify(title),
    }));
  }

  function insertVariable(variable: string) {
    const textarea = contentRef.current;
    if (!textarea) {
      setForm((prev) => ({ ...prev, content: prev.content + variable }));
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = form.content.substring(0, start);
    const after = form.content.substring(end);
    const newContent = before + variable + after;
    setForm((prev) => ({ ...prev, content: newContent }));

    // Restore cursor position after the inserted variable
    requestAnimationFrame(() => {
      textarea.focus();
      const pos = start + variable.length;
      textarea.setSelectionRange(pos, pos);
    });
  }

  function handleSave() {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("Titulo e conteudo sao obrigatorios");
      return;
    }

    const variables = extractVariables(form.content);
    const payload = {
      name: form.name || slugify(form.title),
      title: form.title,
      shortcut: form.shortcut || undefined,
      category: form.category,
      content: form.content,
      variables: variables.length > 0 ? variables : undefined,
      sortOrder: form.sortOrder,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function handleDuplicate(template: NonNullable<typeof templates>[number]) {
    duplicateMutation.mutate({
      name: `${template.name}-copia`,
      title: `${template.title} (copia)`,
      shortcut: template.shortcut
        ? `${template.shortcut}-copia`
        : undefined,
      category: template.category ?? "geral",
      content: template.content,
      variables: template.variables as string[] | undefined,
      sortOrder: (template.sortOrder ?? 0) + 1,
    });
  }

  function handleDelete(id: number) {
    if (confirm("Tem certeza que deseja remover este template?")) {
      deleteMutation.mutate({ id });
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const contentVariables = extractVariables(form.content);

  return (
    <div className="px-4 sm:px-5 md:px-8 py-5 sm:py-6 md:py-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <FileText className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              Templates WhatsApp
            </h1>
            <p className="text-sm text-muted-foreground">
              Gerencie os templates de mensagens rapidas
            </p>
          </div>
        </div>
        <Button
          onClick={openCreate}
          className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Template
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatsCard
          icon={BarChart3}
          label="Total de templates"
          value={kpis.total}
          color="text-muted-foreground"
        />
        <StatsCard
          icon={BookOpen}
          label="Orientacao"
          value={kpis.orientacao}
          color="text-blue-500 dark:text-blue-400"
        />
        <StatsCard
          icon={MessageSquare}
          label="Solicitacao"
          value={kpis.solicitacao}
          color="text-amber-500 dark:text-amber-400"
        />
        <StatsCard
          icon={FolderOpen}
          label="Outros"
          value={kpis.outros}
          color="text-purple-500 dark:text-purple-400"
        />
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white dark:bg-muted/50 border-neutral-200 dark:border-border text-foreground"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[160px] bg-white dark:bg-muted/50 border-neutral-200 dark:border-border text-foreground/80">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-48 rounded-xl border border-neutral-200 dark:border-border/30 bg-white dark:bg-card/50 animate-pulse"
            />
          ))}
        </div>
      ) : !templates?.length ? (
        <EmptyState
          icon={FileText}
          title="Nenhum template encontrado"
          description="Crie seu primeiro template de mensagem rapida"
          action={
            <Button
              variant="outline"
              className="border-neutral-300 dark:border-border text-foreground/80"
              onClick={openCreate}
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar template
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card
              key={template.id}
              className="border border-neutral-200 dark:border-border/30 bg-white dark:bg-card/50 hover:border-emerald-500/30 transition-colors"
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-foreground truncate text-sm">
                    {template.title}
                  </h3>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {template.shortcut && (
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-[10px]">
                        {template.shortcut}
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${CATEGORY_COLORS[template.category ?? "geral"] ?? CATEGORY_COLORS.geral}`}
                    >
                      {CATEGORY_LABELS[template.category ?? "geral"] ?? template.category}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-2">
                <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-line">
                  {template.content}
                </p>
                {template.variables &&
                  (template.variables as string[]).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(template.variables as string[]).map((v) => (
                        <span
                          key={v}
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-neutral-100 dark:bg-muted text-muted-foreground"
                        >
                          {v}
                        </span>
                      ))}
                    </div>
                  )}
              </CardContent>
              <CardFooter className="pt-2 border-t border-neutral-100 dark:border-border">
                <div className="flex items-center gap-1 w-full">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-emerald-600"
                    onClick={() => openEdit(template)}
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => handleDuplicate(template)}
                    disabled={duplicateMutation.isPending}
                  >
                    <Copy className="w-3.5 h-3.5 mr-1" />
                    Duplicar
                  </Button>
                  <div className="flex-1" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 h-8 w-8"
                    onClick={() => handleDelete(template.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg overflow-y-auto"
          aria-describedby="sheet-description"
        >
          <SheetHeader>
            <SheetTitle>
              {editingId ? "Editar Template" : "Novo Template"}
            </SheetTitle>
            <SheetDescription id="sheet-description">
              {editingId
                ? "Altere os campos abaixo para atualizar o template."
                : "Preencha os campos para criar um novo template de mensagem."}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 mt-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="template-title">Titulo *</Label>
              <Input
                id="template-title"
                value={form.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Ex: Orientacao sobre audiencia"
                className="bg-white dark:bg-muted/50 border-neutral-200 dark:border-border"
              />
            </div>

            {/* Name (slug) */}
            <div className="space-y-2">
              <Label htmlFor="template-name">
                Nome (slug)
              </Label>
              <Input
                id="template-name"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                placeholder="orientacao-audiencia"
                className="bg-white dark:bg-muted/50 border-neutral-200 dark:border-border font-mono text-sm"
              />
              <p className="text-[10px] text-neutral-400">
                Gerado automaticamente a partir do titulo
              </p>
            </div>

            {/* Shortcut */}
            <div className="space-y-2">
              <Label htmlFor="template-shortcut">Atalho</Label>
              <Input
                id="template-shortcut"
                value={form.shortcut}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    shortcut: e.target.value,
                  }))
                }
                placeholder="/consulta"
                className="bg-white dark:bg-muted/50 border-neutral-200 dark:border-border font-mono text-sm"
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={form.category}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, category: value }))
                }
              >
                <SelectTrigger className="bg-white dark:bg-muted/50 border-neutral-200 dark:border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="template-content">Conteudo *</Label>
              <Textarea
                ref={contentRef}
                id="template-content"
                value={form.content}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    content: e.target.value,
                  }))
                }
                placeholder="Ola {nome_assistido}, segue informacao sobre..."
                rows={10}
                className="bg-white dark:bg-muted/50 border-neutral-200 dark:border-border resize-none font-mono text-sm"
              />
            </div>

            {/* Quick-insert variables */}
            <div className="space-y-2">
              <Label className="text-xs text-neutral-500">
                Inserir variavel
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_VARIABLES.map((v) => (
                  <Button
                    key={v}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] font-mono border-neutral-300 dark:border-border text-muted-foreground hover:border-emerald-500 hover:text-emerald-600"
                    onClick={() => insertVariable(v)}
                  >
                    <Zap className="w-3 h-3 mr-1" />
                    {v}
                  </Button>
                ))}
              </div>
            </div>

            {/* Preview */}
            {form.content && (
              <div className="space-y-2">
                <Label className="text-xs text-neutral-500">
                  Preview
                </Label>
                <div className="p-3 rounded-lg border border-neutral-200 dark:border-border bg-neutral-50 dark:bg-muted/50 text-sm whitespace-pre-line">
                  {renderPreview(form.content)}
                </div>
                {contentVariables.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {contentVariables.map((v) => (
                      <span
                        key={v}
                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sort Order */}
            <div className="space-y-2">
              <Label htmlFor="template-sort">Ordem de exibicao</Label>
              <Input
                id="template-sort"
                type="number"
                value={form.sortOrder}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    sortOrder: parseInt(e.target.value) || 0,
                  }))
                }
                className="bg-white dark:bg-muted/50 border-neutral-200 dark:border-border w-24"
              />
            </div>

            {/* Save button */}
            <div className="flex justify-end gap-2 pt-4 border-t border-neutral-200 dark:border-border">
              <Button
                variant="outline"
                onClick={closeSheet}
                className="border-neutral-300 dark:border-border text-foreground/80"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isSaving && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {editingId ? "Salvar alteracoes" : "Criar template"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ==========================================
// Sub-components
// ==========================================

function StatsCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="p-3 rounded-xl border border-neutral-200 dark:border-border/30 bg-white dark:bg-card/50">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs text-neutral-500">{label}</span>
      </div>
      <p className="text-lg font-semibold text-foreground">
        {value}
      </p>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="text-center py-12">
      <Icon className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
      <h3 className="text-sm font-medium text-muted-foreground mb-1">
        {title}
      </h3>
      <p className="text-xs text-muted-foreground/50 mb-4 max-w-sm mx-auto">
        {description}
      </p>
      {action}
    </div>
  );
}

function renderPreview(content: string): React.ReactNode {
  // Split content by variable patterns and highlight them
  const parts = content.split(/(\{[a-z_]+\})/g);
  return parts.map((part, i) => {
    if (/^\{[a-z_]+\}$/.test(part)) {
      return (
        <span
          key={i}
          className="inline-block px-1 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-mono text-xs"
        >
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
