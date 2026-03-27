import type { Skill, SkillExecution, MatchResult } from "./types";
import { buildDelegateUrl, buildDelegatePrompt, copyPromptToClipboard } from "./delegate";

export interface ExecutionCallback {
  navigate: (url: string) => void;
  openPanel: (title: string, component: string, params: Record<string, string>) => void;
  showToast: (message: string) => void;
  openDelegate: (url: string, fallbackPrompt: string) => void;
}

export async function executeSkill(
  match: MatchResult,
  callbacks: ExecutionCallback,
  contextFetcher?: (params: Record<string, string>) => Promise<string>,
): Promise<SkillExecution> {
  const { skill, params } = match;

  switch (skill.type) {
    case "navigate": {
      const url = typeof skill.route === "function"
        ? skill.route(params)
        : skill.route ?? "/";
      callbacks.navigate(url);
      return { skill, params };
    }

    case "panel": {
      if (skill.panel) {
        callbacks.openPanel(skill.panel.title, skill.panel.component, params);
      }
      return { skill, params };
    }

    case "action": {
      callbacks.showToast(`Executando: ${skill.name}...`);
      return { skill, params };
    }

    case "delegate": {
      if (!skill.delegate) {
        return { skill, params, error: "Skill delegate sem configuração" };
      }

      let context = "";
      if (contextFetcher) {
        try {
          context = await contextFetcher(params);
        } catch {
          // Continue without context
        }
      }

      const url = buildDelegateUrl(skill.delegate, params, context);
      const prompt = buildDelegatePrompt(skill.delegate, params, context);

      callbacks.openDelegate(url, prompt);

      return { skill, params, delegateUrl: url };
    }

    default:
      return { skill, params, error: `Tipo desconhecido: ${skill.type}` };
  }
}
