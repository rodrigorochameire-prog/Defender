import type { AnaliseSentenca } from "@/lib/db/schema/sentencas";

const REQUIRED_KEYS = ["tipoDecisao", "resultado", "tesesDefensivas", "juizProlator", "confidence"] as const;

function tryParse(s: string): unknown {
  try { return JSON.parse(s); } catch { return undefined; }
}

function isAnalise(o: unknown): o is AnaliseSentenca {
  if (!o || typeof o !== "object") return false;
  return REQUIRED_KEYS.every((k) => k in (o as Record<string, unknown>));
}

export function parseAnaliseSentenca(raw: string): AnaliseSentenca | null {
  if (!raw) return null;
  let parsed = tryParse(raw.trim());
  if (isAnalise(parsed)) return parsed;
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) { parsed = tryParse(fence[1].trim()); if (isAnalise(parsed)) return parsed; }
  const a = raw.indexOf("{"), b = raw.lastIndexOf("}");
  if (a !== -1 && b > a) { parsed = tryParse(raw.slice(a, b + 1)); if (isAnalise(parsed)) return parsed; }
  return null;
}
