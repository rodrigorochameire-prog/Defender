"use client";

import { Button } from "@/components/ui/button";
import { Brain, FileText, Scale, Shield, MessageSquare, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { buildDelegatePrompt } from "@/lib/skills/delegate";
import type { SkillDelegate } from "@/lib/skills/types";

// Pre-defined Cowork actions mapped to existing skills
const COWORK_ACTIONS = {
  "analise-autos": {
    label: "Analisar Autos",
    icon: Brain,
    color: "text-violet-600 dark:text-violet-400",
    bgHover: "hover:bg-violet-50 dark:hover:bg-violet-950/20",
    delegate: {
      target: "cowork" as const,
      promptTemplate: `Você é um assistente jurídico da Defensoria Pública de Camaçari.

Use a skill analise-audiencias para fazer uma análise estratégica completa do caso:
- Assistido: {{assistidoNome}}
- Processo: {{numeroAutos}}
- Classe: {{classeProcessual}}
- Vara: {{vara}}
- Atribuição: {{atribuicao}}

Leia os documentos na pasta do Google Drive e gere:
1. _analise_ia.json (schema padrão)
2. Relatório em PDF
3. Relatório em Markdown

Foque em: teses defensivas, contradições nos depoimentos, pontos fortes e fracos, nulidades, recomendações.

Salve os arquivos na pasta: {{drivePath}}`,
    } satisfies SkillDelegate,
  },
  "preparar-audiencia": {
    label: "Preparar Audiência",
    icon: Scale,
    color: "text-blue-600 dark:text-blue-400",
    bgHover: "hover:bg-blue-50 dark:hover:bg-blue-950/20",
    delegate: {
      target: "cowork" as const,
      promptTemplate: `Você é um assistente jurídico da Defensoria Pública de Camaçari.

Use a skill analise-audiencias para preparar a audiência:
- Assistido: {{assistidoNome}}
- Processo: {{numeroAutos}}
- Tipo de audiência: {{tipoAudiencia}}
- Vara: {{vara}}

Gere:
1. Briefing com perguntas estratégicas para cada testemunha
2. Contradições nos depoimentos anteriores
3. Orientação ao assistido
4. Quesitos críticos (se júri)
5. _analise_ia.json + PDF

Salve na pasta: {{drivePath}}`,
    } satisfies SkillDelegate,
  },
  "gerar-peca": {
    label: "Gerar Peça",
    icon: FileText,
    color: "text-emerald-600 dark:text-emerald-400",
    bgHover: "hover:bg-emerald-50 dark:hover:bg-emerald-950/20",
    delegate: {
      target: "cowork" as const,
      promptTemplate: `Você é um assistente jurídico da Defensoria Pública de Camaçari.

Use a skill dpe-ba-pecas para gerar uma peça processual:
- Assistido: {{assistidoNome}}
- Processo: {{numeroAutos}}
- Tipo de peça: {{tipoPeca}}
- Vara: {{vara}}
- Atribuição: {{atribuicao}}

Gere a peça em .docx com formatação institucional (Garamond, cabeçalho DPE-BA).
Salve na pasta: {{drivePath}}
Depois copie para a pasta Protocolar com nome padronizado.`,
    } satisfies SkillDelegate,
  },
  "analise-juri": {
    label: "Análise de Júri",
    icon: Shield,
    color: "text-amber-600 dark:text-amber-400",
    bgHover: "hover:bg-amber-50 dark:hover:bg-amber-950/20",
    delegate: {
      target: "cowork" as const,
      promptTemplate: `Você é um assistente jurídico da Defensoria Pública de Camaçari.

Use a skill juri para análise estratégica de Tribunal do Júri:
- Assistido: {{assistidoNome}}
- Processo: {{numeroAutos}}
- Vara: {{vara}}

Gere:
1. Dossiê estratégico completo
2. Análise de quesitos
3. Matriz de guerra (pontos fortes vs fracos)
4. Perspectiva plenária
5. _analise_ia.json + PDF

Salve na pasta: {{drivePath}}`,
    } satisfies SkillDelegate,
  },
  "feedback-estagiario": {
    label: "Feedback para Estagiário",
    icon: MessageSquare,
    color: "text-cyan-600 dark:text-cyan-400",
    bgHover: "hover:bg-cyan-50 dark:hover:bg-cyan-950/20",
    delegate: {
      target: "cowork" as const,
      promptTemplate: `Você é o Defensor Público Rodrigo Rocha Meire, orientando um estagiário.

Analise o trabalho feito no caso:
- Assistido: {{assistidoNome}}
- Processo: {{numeroAutos}}

Revise os documentos na pasta do Drive e forneça feedback construtivo:
1. O que está bem feito
2. O que precisa ser corrigido
3. Orientações para os próximos passos
4. Pontos de aprendizado

Tom: educativo, encorajador, técnico.

Pasta: {{drivePath}}`,
    } satisfies SkillDelegate,
  },
} as const;

type CoworkActionType = keyof typeof COWORK_ACTIONS;

interface CoworkActionButtonProps {
  action: CoworkActionType;
  params: Record<string, string>;
  processoId?: number;
  context?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showLabel?: boolean;
}

export function CoworkActionButton({
  action,
  params,
  processoId,
  context = "",
  variant = "outline",
  size = "sm",
  className = "",
  showLabel = true,
}: CoworkActionButtonProps) {
  const [loading, setLoading] = useState(false);
  const config = COWORK_ACTIONS[action];
  const Icon = config.icon;

  async function handleClick() {
    setLoading(true);
    try {
      // Strategy 1: Worker API (runs claude -p locally, zero cost)
      // Only works on localhost (developer machine)
      if (processoId && window.location.hostname === "localhost") {
        try {
          const res = await fetch("/api/cowork/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ processoId, skill: action }),
          });
          const data = await res.json();
          if (data.success) {
            toast.success(`${config.label}: análise disparada`, {
              description: `${data.assistido} — resultado aparecerá automaticamente`,
              duration: 8000,
            });
            return;
          }
        } catch {
          // Worker failed, fallback
        }
      }

      // Strategy 2+3: Copy to clipboard + open Cowork/Manus
      const prompt = buildDelegatePrompt(config.delegate, params, context);

      // Build instruction header
      const pastaAssistido = params.assistidoNome
        ? `Processos - ${params.atribuicao === "JURI_CAMACARI" ? "Júri" : params.atribuicao === "VVD_CAMACARI" ? "VVD" : "Criminal"} / ${params.assistidoNome}`
        : "";

      const instruction = [
        `--- ${config.label.toUpperCase()} ---`,
        `Assistido: ${params.assistidoNome}`,
        `Processo: ${params.numeroAutos}`,
        pastaAssistido ? `Pasta: ${pastaAssistido}` : "",
        "",
        "INSTRUÇÕES:",
        "1. Abra o Claude Cowork ou Manus Desktop",
        pastaAssistido ? `2. Selecione a pasta: ${pastaAssistido}` : "2. Selecione a pasta do assistido no Drive",
        "3. Cole este prompt (já está no clipboard)",
        "4. Execute e aguarde o resultado",
        "",
        "--- PROMPT ---",
        "",
        prompt,
      ].filter(Boolean).join("\n");

      await navigator.clipboard?.writeText(instruction);

      toast(`${config.label}`, {
        description: `Prompt copiado! Abra o Cowork, selecione a pasta de ${params.assistidoNome || "assistido"} e cole (Cmd+V)`,
        duration: 10000,
        action: {
          label: "Abrir Cowork",
          onClick: () => {
            try { window.open("claude://", "_blank"); } catch { /* ok */ }
          },
        },
      });
    } catch (err) {
      toast.error("Erro ao preparar análise");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={loading}
      className={`gap-1.5 ${config.color} ${config.bgHover} ${className}`}
      title={config.label}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Icon className="h-4 w-4" />
      )}
      {showLabel && <span>{config.label}</span>}
    </Button>
  );
}

// Convenience: group of action buttons for a case
interface CoworkActionGroupProps {
  assistidoNome: string;
  numeroAutos: string;
  processoId?: number;
  classeProcessual?: string;
  vara?: string;
  atribuicao?: string;
  drivePath?: string;
  actions?: CoworkActionType[];
  size?: "sm" | "default";
}

export function CoworkActionGroup({
  assistidoNome,
  numeroAutos,
  processoId,
  classeProcessual = "",
  vara = "",
  atribuicao = "",
  drivePath = "",
  actions = ["analise-autos", "gerar-peca", "preparar-audiencia"],
  size = "sm",
}: CoworkActionGroupProps) {
  const params = {
    assistidoNome,
    numeroAutos,
    classeProcessual,
    vara,
    atribuicao,
    drivePath,
    tipoPeca: "",
    tipoAudiencia: "",
  };

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <CoworkActionButton
          key={action}
          action={action}
          params={params}
          processoId={processoId}
          size={size}
        />
      ))}
    </div>
  );
}
