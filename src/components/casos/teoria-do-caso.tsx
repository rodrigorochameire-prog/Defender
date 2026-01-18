"use client";

import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  BookOpen, 
  Scale, 
  FileText, 
  ChevronDown, 
  ChevronRight,
  Edit3,
  Save,
  X,
  Lightbulb,
  Link2,
  ExternalLink,
  FolderOpen
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TeoriaDoCasoProps {
  casoId: number;
  teoriaFatos?: string | null;
  teoriaProvas?: string | null;
  teoriaDireito?: string | null;
  linkDrive?: string | null;
  onUpdate?: (field: "teoriaFatos" | "teoriaProvas" | "teoriaDireito", value: string) => Promise<void>;
  readOnly?: boolean;
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  content?: string | null;
  color: string;
  borderColor: string;
  field: "teoriaFatos" | "teoriaProvas" | "teoriaDireito";
  placeholder: string;
  hint: string;
  isEditing: boolean;
  editValue: string;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onChangeValue: (value: string) => void;
  readOnly?: boolean;
  isSaving?: boolean;
}

function TheorySection({
  title,
  icon,
  content,
  color,
  borderColor,
  placeholder,
  hint,
  isEditing,
  editValue,
  onEdit,
  onSave,
  onCancel,
  onChangeValue,
  readOnly,
  isSaving,
}: SectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const hasContent = content && content.trim().length > 0;

  return (
    <Card className={cn(
      "overflow-hidden transition-all duration-200",
      "bg-white dark:bg-zinc-950",
      "border border-zinc-200 dark:border-zinc-800",
      "hover:border-zinc-300 dark:hover:border-zinc-700",
      `border-l-[4px] ${borderColor}`
    )}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <div className={cn(
            "flex items-center justify-between p-4 cursor-pointer",
            "hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors"
          )}>
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                color
              )}>
                {icon}
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {title}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {hint}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasContent && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 rounded-sm bg-zinc-50 dark:bg-zinc-900">
                  Preenchido
                </Badge>
              )}
              {isOpen ? (
                <ChevronDown className="w-4 h-4 text-zinc-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 border-t border-zinc-100 dark:border-zinc-800/50 pt-3">
            {isEditing ? (
              <div className="space-y-3">
                <Textarea
                  value={editValue}
                  onChange={(e) => onChangeValue(e.target.value)}
                  placeholder={placeholder}
                  className="min-h-[150px] resize-none font-serif text-sm leading-relaxed
                    bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700
                    focus:border-zinc-400 dark:focus:border-zinc-600"
                />
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onCancel}
                    disabled={isSaving}
                    className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={onSave}
                    disabled={isSaving}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Save className="w-4 h-4 mr-1" />
                    {isSaving ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {hasContent ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="whitespace-pre-wrap font-serif text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                      {content}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                      <Lightbulb className="w-5 h-5 text-zinc-400" />
                    </div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {placeholder}
                    </p>
                  </div>
                )}
                
                {!readOnly && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onEdit}
                    className="w-full text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300
                      border border-dashed border-zinc-200 dark:border-zinc-700
                      hover:border-zinc-300 dark:hover:border-zinc-600"
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    {hasContent ? "Editar" : "Adicionar conteúdo"}
                  </Button>
                )}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export function TeoriaDoCaso({
  casoId,
  teoriaFatos,
  teoriaProvas,
  teoriaDireito,
  linkDrive,
  onUpdate,
  readOnly = false,
}: TeoriaDoCasoProps) {
  const [editingField, setEditingField] = useState<"teoriaFatos" | "teoriaProvas" | "teoriaDireito" | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleEdit = useCallback((field: "teoriaFatos" | "teoriaProvas" | "teoriaDireito", currentValue?: string | null) => {
    setEditingField(field);
    setEditValue(currentValue || "");
  }, []);

  const handleSave = useCallback(async () => {
    if (!editingField || !onUpdate) return;
    
    setIsSaving(true);
    try {
      await onUpdate(editingField, editValue);
      setEditingField(null);
      setEditValue("");
    } catch (error) {
      console.error("Erro ao salvar:", error);
    } finally {
      setIsSaving(false);
    }
  }, [editingField, editValue, onUpdate]);

  const handleCancel = useCallback(() => {
    setEditingField(null);
    setEditValue("");
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30">
            <Scale className="w-5 h-5 text-amber-700 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
              Teoria do Caso
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              O tripé da defesa: Fatos, Provas e Direito
            </p>
          </div>
        </div>

        {linkDrive && (
          <a
            href={linkDrive}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg
              text-xs font-medium text-zinc-600 dark:text-zinc-400
              bg-zinc-100 dark:bg-zinc-800 
              hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            <FolderOpen className="w-4 h-4" />
            Pasta no Drive
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Três Colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 1. FATOS */}
        <TheorySection
          title="Fatos"
          icon={<BookOpen className="w-4 h-4 text-blue-700 dark:text-blue-400" />}
          content={teoriaFatos}
          color="bg-blue-100 dark:bg-blue-900/30"
          borderColor="border-l-blue-500 dark:border-l-blue-600"
          field="teoriaFatos"
          placeholder="Descreva a narrativa defensiva dos fatos..."
          hint="A versão da defesa sobre o ocorrido"
          isEditing={editingField === "teoriaFatos"}
          editValue={editValue}
          onEdit={() => handleEdit("teoriaFatos", teoriaFatos)}
          onSave={handleSave}
          onCancel={handleCancel}
          onChangeValue={setEditValue}
          readOnly={readOnly}
          isSaving={isSaving}
        />

        {/* 2. PROVAS */}
        <TheorySection
          title="Provas"
          icon={<Link2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />}
          content={teoriaProvas}
          color="bg-emerald-100 dark:bg-emerald-900/30"
          borderColor="border-l-emerald-500 dark:border-l-emerald-600"
          field="teoriaProvas"
          placeholder="Liste as provas que corroboram a tese defensiva..."
          hint="Evidências e documentos favoráveis"
          isEditing={editingField === "teoriaProvas"}
          editValue={editValue}
          onEdit={() => handleEdit("teoriaProvas", teoriaProvas)}
          onSave={handleSave}
          onCancel={handleCancel}
          onChangeValue={setEditValue}
          readOnly={readOnly}
          isSaving={isSaving}
        />

        {/* 3. DIREITO */}
        <TheorySection
          title="Direito"
          icon={<FileText className="w-4 h-4 text-violet-700 dark:text-violet-400" />}
          content={teoriaDireito}
          color="bg-violet-100 dark:bg-violet-900/30"
          borderColor="border-l-violet-500 dark:border-l-violet-600"
          field="teoriaDireito"
          placeholder="Fundamente as teses jurídicas aplicáveis..."
          hint="Teses, jurisprudência e doutrina"
          isEditing={editingField === "teoriaDireito"}
          editValue={editValue}
          onEdit={() => handleEdit("teoriaDireito", teoriaDireito)}
          onSave={handleSave}
          onCancel={handleCancel}
          onChangeValue={setEditValue}
          readOnly={readOnly}
          isSaving={isSaving}
        />
      </div>

      {/* Dica de conexões */}
      <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50">
        <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-amber-800 dark:text-amber-300">
          <strong>Dica:</strong> Use tags no título do caso (ex: #NulidadeBusca, #LegitimaDefesa) para conectar casos com teses similares e encontrar petições de sucesso.
        </p>
      </div>
    </div>
  );
}
