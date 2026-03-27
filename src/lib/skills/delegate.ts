import type { SkillDelegate } from "./types";

const DELEGATE_URLS: Record<string, string> = {
  cowork: "claude://cowork",
  manus: "manus://new",
};

export function buildDelegatePrompt(
  delegate: SkillDelegate,
  params: Record<string, string>,
  context: string,
): string {
  let prompt = delegate.promptTemplate;
  for (const [key, value] of Object.entries(params)) {
    prompt = prompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  if (context) {
    prompt += `\n\nContexto adicional:\n${context}`;
  }
  return prompt;
}

export function buildDelegateUrl(
  delegate: SkillDelegate,
  params: Record<string, string>,
  context: string,
): string {
  const prompt = buildDelegatePrompt(delegate, params, context);
  const baseUrl = DELEGATE_URLS[delegate.target] ?? DELEGATE_URLS.cowork;
  return `${baseUrl}?prompt=${encodeURIComponent(prompt)}`;
}

export function copyPromptToClipboard(prompt: string): void {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    navigator.clipboard.writeText(prompt);
  }
}
