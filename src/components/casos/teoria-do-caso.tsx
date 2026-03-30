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
      "bg-card",
      "border border-border",
      "hover:border-border",
      `border-l-[4px] ${borderColor}`
    )}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <div className={cn(
            "flex items-center justify-between p-5 cursor-pointer",
            "hover:bg-muted/50 transition-colors"
          )}>
            <div className="flex items-center gap-3.5">
              <div className={cn(
                "p-2.5 rounded-xl",
                color
              )}>
                {icon}
              </div>
              <div>
                <h3 className="font-semibold text-base sm:text-lg text-foreground">
                  {title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {hint}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              {hasContent && (
                <Badge variant="outline" className="text-xs px-2 py-0.5 rounded-md bg-muted">
                  Preenchido
                </Badge>
              )}
              {isOpen ? (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-5 pb-5 border-t border-border pt-4">
            {isEditing ? (
              <div className="space-y-4">
                <Textarea
                  value={editValue}
                  onChange={(e) => onChangeValue(e.target.value)}
                  placeholder={placeholder}
                  className="min-h-[180px] resize-none font-serif text-base leading-relaxed
                    bg-background border-border
                    focus:border-ring"
                />
                <div className="flex items-center justify-end gap-3">
                  <Button
                    variant="ghost"
                    size="default"
                    onClick={onCancel}
                    disabled={isSaving}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button
                    size="default"
                    onClick={onSave}
                    disabled={isSaving}
                    className="bg-primary hover:bg-primary/90 text-white"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {hasContent ? (
                  <div className="prose prose-base dark:prose-invert max-w-none">
                    <p className="whitespace-pre-wrap font-serif text-base text-foreground/80 leading-relaxed">
                      {content}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                      <Lightbulb className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-base text-muted-foreground">
                      {placeholder}
                    </p>
                  </div>
                )}
                
                {!readOnly && (
                  <Button
                    variant="ghost"
                    size="default"
                    onClick={onEdit}
                    className="w-full text-muted-foreground hover:text-foreground
                      border border-dashed border-border
                      hover:border-border h-11"
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
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-muted to-muted/80">
            <Scale className="w-6 h-6 text-foreground/80" />
          </div>
          <div>
            <h2 className="font-semibold text-lg text-foreground">
              Estratégia da Defesa
            </h2>
            <p className="text-sm text-muted-foreground">
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
              text-xs font-medium text-muted-foreground
              bg-muted
              hover:bg-muted/80 transition-colors"
          >
            <FolderOpen className="w-4 h-4" />
            Pasta no Drive
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Três Colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 1. FATOS */}
        <TheorySection
          title="Fatos"
          icon={<BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
          content={teoriaFatos}
          color="bg-blue-100/80 dark:bg-blue-900/40"
          borderColor="border-l-blue-400 dark:border-l-blue-500"
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
          icon={<Link2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
          content={teoriaProvas}
          color="bg-emerald-100/80 dark:bg-emerald-900/40"
          borderColor="border-l-emerald-400 dark:border-l-emerald-500"
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
          icon={<FileText className="w-5 h-5 text-violet-600 dark:text-violet-400" />}
          content={teoriaDireito}
          color="bg-violet-100/80 dark:bg-violet-900/40"
          borderColor="border-l-violet-400 dark:border-l-violet-500"
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
      <div className="flex items-start gap-3.5 p-4 rounded-xl bg-muted/50 border border-border">
        <div className="p-1.5 rounded-lg bg-muted">
          <Lightbulb className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </div>
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground/80">Dica:</strong> Use tags no título do caso (ex: #NulidadeBusca, #LegitimaDefesa) para conectar casos com teses similares e encontrar petições de sucesso.
        </p>
      </div>
    </div>
  );
}
