"use client";

import { Brain, FileText, Scale, Shield, MessageSquare, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { buildDelegatePrompt } from "@/lib/skills/delegate";
import type { SkillDelegate } from "@/lib/skills/types";

// Pre-defined Cowork actions mapped to existing skills
const COWORK_ACTIONS = {
  "analise-autos": {
    label: "Analisar Autos",
    description: "Análise estratégica completa",
    icon: Brain,
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
    description: "Perguntas, contradições e briefing",
    icon: Scale,
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
    description: "Peça processual institucional",
    icon: FileText,
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
    description: "Dossiê estratégico completo",
    icon: Shield,
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
    label: "Feedback Estágio",
    description: "Revisão educativa do trabalho",
    icon: MessageSquare,
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

// ─── Single action button ───────────────────────────────────────────────────

interface CoworkActionButtonProps {
  action: CoworkActionType;
  params: Record<string, string>;
  processoId?: number;
  context?: string;
  compact?: boolean;
  className?: string;
}

export function CoworkActionButton({
  action,
  params,
  processoId,
  context = "",
  compact = false,
  className = "",
}: CoworkActionButtonProps) {
  const [loading, setLoading] = useState(false);
  const config = COWORK_ACTIONS[action];
  const Icon = config.icon;

  async function handleClick() {
    setLoading(true);
    try {
      if (processoId) {
        try {
          const res = await fetch("/api/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ processoId, skill: action }),
          });
          const data = await res.json();
          if (data.success) {
            toast.success(`Análise enfileirada`, {
              description: `${data.assistido} — resultado aparecerá automaticamente`,
              duration: 8000,
            });
            return;
          }
        } catch {
          // API failed, fallback to clipboard
        }
      }

      const prompt = buildDelegatePrompt(config.delegate, params, context);
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

  if (compact) {
    return (
      <button
        onClick={handleClick}
        disabled={loading}
        title={config.label}
        className={cn(
          "inline-flex items-center justify-center rounded-lg border border-border p-2.5 transition-all",
          "text-muted-foreground",
          "hover:border-border hover:text-foreground hover:bg-muted/50",
          loading && "opacity-60",
          className,
        )}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={cn(
        "group flex items-center gap-3 rounded-xl border border-border px-4 py-3 transition-all text-left w-full",
        "hover:border-border hover:bg-muted/50",
        loading && "opacity-60 pointer-events-none",
        className,
      )}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted shrink-0">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <Icon className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-foreground leading-tight">{config.label}</p>
        <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
          {config.description}
        </p>
      </div>
    </button>
  );
}

// ─── Action group ───────────────────────────────────────────────────────────

interface CoworkActionGroupProps {
  assistidoNome: string;
  numeroAutos: string;
  processoId?: number;
  classeProcessual?: string;
  vara?: string;
  atribuicao?: string;
  drivePath?: string;
  actions?: CoworkActionType[];
  compact?: boolean;
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
  compact = false,
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
    <div className={cn(
      compact
        ? "flex items-center gap-2"
        : "grid grid-cols-1 sm:grid-cols-3 gap-2"
    )}>
      {actions.map((action) => (
        <CoworkActionButton
          key={action}
          action={action}
          params={params}
          processoId={processoId}
          compact={compact}
        />
      ))}
    </div>
  );
}
