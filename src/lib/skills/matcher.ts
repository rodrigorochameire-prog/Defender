import type { MatchResult } from "./types";
import { getAllSkills } from "./registry";

export function matchByCommand(input: string): MatchResult | null {
  if (!input.startsWith("/")) return null;

  const parts = input.slice(1).split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const rest = parts.slice(1).join(" ").trim();

  const skills = getAllSkills();
  const skill = skills.find(s => s.id === cmd || s.id.startsWith(cmd));
  if (!skill) return null;

  const params: Record<string, string> = {};
  if (rest && skill.params?.[0]) {
    params[skill.params[0].name] = rest;
  }

  return { skill, score: 100, params, matchedBy: "command" };
}

export function matchByRegex(input: string): MatchResult | null {
  const normalized = input.toLowerCase().trim();
  const skills = getAllSkills();

  let bestMatch: MatchResult | null = null;
  let bestScore = 0;

  for (const skill of skills) {
    let score = 0;

    for (const trigger of skill.triggers) {
      if (normalized.includes(trigger.toLowerCase())) {
        score += 1;
      }
    }

    if (skill.triggerPattern && skill.triggerPattern.test(normalized)) {
      score += 2;
    }

    if (score > bestScore) {
      bestScore = score;

      const params: Record<string, string> = {};
      if (skill.params) {
        for (const p of skill.params) {
          if (p.extract instanceof RegExp) {
            const match = input.match(p.extract);
            if (match?.[1]) {
              params[p.name] = match[1].trim();
            }
          }
        }
      }

      bestMatch = { skill, score, params, matchedBy: "regex" };
    }
  }

  return bestScore >= 1 ? bestMatch : null;
}

export function buildGeminiPayload(input: string): {
  prompt: string;
  skillList: { id: string; name: string; description: string; triggers: string[] }[];
} {
  const skills = getAllSkills().map(s => ({
    id: s.id,
    name: s.name,
    description: s.description,
    triggers: s.triggers,
  }));

  return {
    prompt: `Dada esta lista de skills: ${JSON.stringify(skills)}, qual skill o usuário quer ativar com: "${input}"? Responda APENAS JSON: {"skillId": "...", "params": {}, "confidence": 0.0-1.0}. Se nenhuma skill se aplica, retorne {"skillId": null, "confidence": 0}.`,
    skillList: skills,
  };
}

export function matchSkill(input: string): MatchResult | null {
  const cmdMatch = matchByCommand(input);
  if (cmdMatch) return cmdMatch;

  const regexMatch = matchByRegex(input);
  if (regexMatch) return regexMatch;

  return null;
}
