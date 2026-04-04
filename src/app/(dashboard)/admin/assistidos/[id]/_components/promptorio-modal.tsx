"use client";

import { useState, useCallback } from "react";
import { ClipboardCopy } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PromptorioModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assistidoNome: string;
  processoNumero?: string;
  classeProcessual?: string;
  vara?: string;
  atribuicao?: string;
  comarca?: string;
}

// ---------------------------------------------------------------------------
// Prompt Templates
// ---------------------------------------------------------------------------

const PROMPT_TEMPLATES: Record<string, string> = {
  "analise-autos": `Você é um assistente jurídico da Defensoria Pública de Camaçari.
Use a skill analise-audiencias para fazer uma análise estratégica completa do caso.

Assistido: {{assistidoNome}}
Processo: {{processoNumero}}
Classe: {{classeProcessual}}
Vara: {{vara}}
Comarca: {{comarca}}

Leia TODOS os documentos na pasta do assistido no Drive. Gere o relatório completo com análise de depoimentos, contradições, teses, provas e estratégia.`,

  "preparar-audiencia": `Você é um assistente jurídico da Defensoria Pública de Camaçari.
Use a skill analise-audiencias para preparar audiência.

Assistido: {{assistidoNome}}
Processo: {{processoNumero}}
Vara: {{vara}}

Gere briefing com perguntas estratégicas, contradições, orientação ao assistido e quesitos (se júri).`,

  "gerar-peca": `Você é um assistente jurídico da Defensoria Pública de Camaçari.
Use a skill dpe-ba-pecas para gerar peça processual.

Assistido: {{assistidoNome}}
Processo: {{processoNumero}}
Classe: {{classeProcessual}}
Vara: {{vara}}
Atribuição: {{atribuicao}}

Gere a peça em .docx com formatação institucional (Garamond, cabeçalho DPE-BA).`,

  "analise-juri": `Você é um assistente jurídico da Defensoria Pública de Camaçari.
Use a skill juri para análise estratégica de Tribunal do Júri.

Assistido: {{assistidoNome}}
Processo: {{processoNumero}}

Gere dossiê completo: quesitos, matriz de guerra, perspectiva plenária, slides de defesa.`,

  "feedback-estagiario": `Você é o Defensor Público Rodrigo Rocha Meire, orientando um estagiário.

Analise o trabalho feito no caso de {{assistidoNome}} (processo {{processoNumero}}).
Revise os documentos na pasta do Drive e forneça feedback construtivo:
1. O que está bem feito
2. O que precisa ser corrigido
3. Orientações para os próximos passos
4. Pontos de aprendizado`,
};

const TEMPLATE_OPTIONS = [
  { value: "analise-autos", label: "Analisar Autos" },
  { value: "preparar-audiencia", label: "Preparar Audiência" },
  { value: "gerar-peca", label: "Gerar Peça" },
  { value: "analise-juri", label: "Análise Júri" },
  { value: "feedback-estagiario", label: "Feedback Estagiário" },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PromptorioModal({
  open,
  onOpenChange,
  assistidoNome,
  processoNumero,
  classeProcessual,
  vara,
  atribuicao,
  comarca,
}: PromptorioModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [instrucaoAdicional, setInstrucaoAdicional] = useState("");

  const handleCopy = useCallback(async () => {
    if (!selectedTemplate) {
      toast.error("Selecione um tipo de instrução");
      return;
    }

    const template = PROMPT_TEMPLATES[selectedTemplate];
    if (!template) return;

    let prompt = template
      .replace(/\{\{assistidoNome\}\}/g, assistidoNome || "")
      .replace(/\{\{processoNumero\}\}/g, processoNumero || "")
      .replace(/\{\{classeProcessual\}\}/g, classeProcessual || "")
      .replace(/\{\{vara\}\}/g, vara || "")
      .replace(/\{\{atribuicao\}\}/g, atribuicao || "")
      .replace(/\{\{comarca\}\}/g, comarca || "");

    if (instrucaoAdicional.trim()) {
      prompt += `\n\nInstrução adicional: ${instrucaoAdicional.trim()}`;
    }

    try {
      await navigator.clipboard.writeText(prompt);
      toast.success("Prompt copiado — cole no Claude Code");
      onOpenChange(false);
      setSelectedTemplate("");
      setInstrucaoAdicional("");
    } catch {
      toast.error("Falha ao copiar para a área de transferência");
    }
  }, [
    selectedTemplate,
    assistidoNome,
    processoNumero,
    classeProcessual,
    vara,
    atribuicao,
    comarca,
    instrucaoAdicional,
    onOpenChange,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 rounded-xl">
        <DialogHeader>
          <DialogTitle className="font-sans text-base font-semibold">
            Promptório
          </DialogTitle>
          <DialogDescription className="text-xs text-neutral-500">
            Copie instruções para usar no Claude Code
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template select */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-neutral-500">
              TIPO DE INSTRUÇÃO
            </label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger className="bg-neutral-50 dark:bg-[#0f0f11] border-neutral-200 dark:border-neutral-800">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Additional instruction */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-neutral-500">
              INSTRUÇÃO ADICIONAL{" "}
              <span className="normal-case tracking-normal">(opcional)</span>
            </label>
            <Textarea
              value={instrucaoAdicional}
              onChange={(e) => setInstrucaoAdicional(e.target.value)}
              placeholder="Ex: Foque nas contradições entre os depoimentos..."
              className="bg-neutral-50 dark:bg-[#0f0f11] border-neutral-200 dark:border-neutral-800 min-h-[72px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="bg-transparent border-neutral-300 dark:border-neutral-700"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCopy}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <ClipboardCopy className="mr-1.5 h-4 w-4" />
            Copiar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
