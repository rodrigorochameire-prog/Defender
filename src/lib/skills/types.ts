import type { LucideIcon } from "lucide-react";

export type SkillType = "navigate" | "panel" | "action" | "delegate";
export type SkillCategory = "urgente" | "consulta" | "acao" | "analise" | "comunicacao";
export type DelegateTarget = "cowork" | "manus" | "auto";

export interface SkillParam {
  name: string;
  extract: RegExp | "entity";
  required: boolean;
  entityType?: "assistido" | "processo" | "usuario";
}

export interface SkillDelegate {
  target: DelegateTarget;
  promptTemplate: string;
  context?: (params: Record<string, string>) => Promise<string>;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  icon: string;
  triggers: string[];
  triggerPattern?: RegExp;
  params?: SkillParam[];
  type: SkillType;
  route?: string | ((params: Record<string, string>) => string);
  panel?: {
    component: string;
    title: string;
  };
  action?: string;
  delegate?: SkillDelegate;
  category: SkillCategory;
}

export interface MatchResult {
  skill: Skill;
  score: number;
  params: Record<string, string>;
  matchedBy: "command" | "regex" | "gemini";
}

export interface SkillExecution {
  skill: Skill;
  params: Record<string, string>;
  result?: unknown;
  error?: string;
  delegateUrl?: string;
}
