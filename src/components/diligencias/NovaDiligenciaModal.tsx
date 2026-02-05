"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Globe,
  MapPin,
  FileText,
  MapPinned,
  Phone,
  Folder,
  Microscope,
  Users,
  Plus,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Diligencia,
  CATEGORIAS_DILIGENCIA,
  CHECKLISTS_DILIGENCIA,
  CATEGORIA_OPTIONS,
  STATUS_OPTIONS,
  EXECUTOR_OPTIONS,
  CategoriaDigilenciaKey,
  StatusDiligenciaKey,
  ExecutorDiligenciaKey,
} from "@/config/diligencias";

// Mapeamento de ícones
const CATEGORIA_ICONS: Record<CategoriaDigilenciaKey, React.ElementType> = {
  SOCIAL: Globe,
  CAMPO: MapPin,
  OFICIAL: FileText,
  GEO: MapPinned,
  TELEFONIA: Phone,
  DOCUMENTAL: Folder,
  PERICIAL: Microscope,
  TESTEMUNHAL: Users,
};

interface NovaDiligenciaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (diligencia: Diligencia) => void;
  casoId?: number;
  assistidoId?: number;
  processoId?: number;
}

export function NovaDiligenciaModal({
  open,
  onOpenChange,
  onSave,
  casoId,
  assistidoId,
  processoId,
}: NovaDiligenciaModalProps) {
  const [step, setStep] = useState<"categoria" | "detalhes">("categoria");
  const [categoria, setCategoria] = useState<CategoriaDigilenciaKey | null>(null);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [executor, setExecutor] = useState<ExecutorDiligenciaKey>("DEFENSOR");
  const [executorNome, setExecutorNome] = useState("");
  const [prazo, setPrazo] = useState("");
  const [selectedChecklist, setSelectedChecklist] = useState<string[]>([]);
  const [customChecklistItem, setCustomChecklistItem] = useState("");

  const resetForm = () => {
    setStep("categoria");
    setCategoria(null);
    setTitulo("");
    setDescricao("");
    setExecutor("DEFENSOR");
    setExecutorNome("");
    setPrazo("");
    setSelectedChecklist([]);
    setCustomChecklistItem("");
  };

  const handleCategoriaSelect = (cat: CategoriaDigilenciaKey) => {
    setCategoria(cat);
    // Pre-selecionar todos os itens do checklist padrão
    setSelectedChecklist(CHECKLISTS_DILIGENCIA[cat]);
    setStep("detalhes");
  };

  const handleAddCustomChecklist = () => {
    if (customChecklistItem.trim()) {
      setSelectedChecklist([...selectedChecklist, customChecklistItem.trim()]);
      setCustomChecklistItem("");
    }
  };

  const handleRemoveChecklistItem = (index: number) => {
    setSelectedChecklist(selectedChecklist.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!categoria || !titulo.trim()) return;

    const novaDiligencia: Diligencia = {
      id: `dilig-${Date.now()}`,
      casoId,
      assistidoId,
      processoId,
      titulo: titulo.trim(),
      descricao: descricao.trim() || undefined,
      categoria,
      status: "NAO_INICIADA",
      executor,
      executorNome: executorNome.trim() || undefined,
      prazo: prazo || undefined,
      checklist: selectedChecklist.map((texto, idx) => ({
        id: `check-${idx}`,
        texto,
        concluido: false,
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(novaDiligencia);
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(value) => {
      if (!value) resetForm();
      onOpenChange(value);
    }}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {step === "categoria" ? "Nova Diligência" : `${CATEGORIAS_DILIGENCIA[categoria!].label}`}
          </DialogTitle>
          <DialogDescription>
            {step === "categoria"
              ? "Selecione o tipo de diligência que deseja criar"
              : "Preencha os detalhes da diligência"}
          </DialogDescription>
        </DialogHeader>

        {step === "categoria" ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-4">
            {Object.values(CATEGORIAS_DILIGENCIA).map((cat) => {
              const Icon = CATEGORIA_ICONS[cat.id as CategoriaDigilenciaKey];
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategoriaSelect(cat.id as CategoriaDigilenciaKey)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-dashed",
                    "hover:border-solid hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20",
                    "transition-all duration-200 cursor-pointer"
                  )}
                >
                  <div className={cn(
                    "p-3 rounded-xl",
                    `bg-${cat.cor}-100 dark:bg-${cat.cor}-900/30`
                  )}>
                    <Icon className={cn("w-5 h-5", `text-${cat.cor}-600 dark:text-${cat.cor}-400`)} />
                  </div>
                  <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    {cat.label}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 py-4 pr-4">
              {/* Título */}
              <div className="space-y-2">
                <Label htmlFor="titulo">Título *</Label>
                <Input
                  id="titulo"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Localizar testemunha Maria Silva"
                />
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Detalhes adicionais sobre a diligência..."
                  className="min-h-[80px]"
                />
              </div>

              {/* Executor e Prazo */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Executor</Label>
                  <Select
                    value={executor}
                    onValueChange={(v) => setExecutor(v as ExecutorDiligenciaKey)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXECUTOR_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prazo">Prazo</Label>
                  <Input
                    id="prazo"
                    type="date"
                    value={prazo}
                    onChange={(e) => setPrazo(e.target.value)}
                  />
                </div>
              </div>

              {/* Nome do executor (se não for defensor) */}
              {executor !== "DEFENSOR" && (
                <div className="space-y-2">
                  <Label htmlFor="executorNome">Nome do Executor</Label>
                  <Input
                    id="executorNome"
                    value={executorNome}
                    onChange={(e) => setExecutorNome(e.target.value)}
                    placeholder="Nome de quem vai executar"
                  />
                </div>
              )}

              {/* Checklist */}
              <div className="space-y-2">
                <Label>Checklist</Label>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {selectedChecklist.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900"
                    >
                      <span className="flex-1 text-sm">{item}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => handleRemoveChecklistItem(idx)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={customChecklistItem}
                    onChange={(e) => setCustomChecklistItem(e.target.value)}
                    placeholder="Adicionar item personalizado..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomChecklist();
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleAddCustomChecklist}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          {step === "detalhes" && (
            <Button variant="outline" onClick={() => setStep("categoria")}>
              Voltar
            </Button>
          )}
          {step === "detalhes" && (
            <Button onClick={handleSave} disabled={!titulo.trim()}>
              Criar Diligência
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
