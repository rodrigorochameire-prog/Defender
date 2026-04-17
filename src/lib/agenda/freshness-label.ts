export interface FreshnessOutput {
  label: string;
  tone: "emerald" | "neutral" | "amber" | "rose";
}

export function freshnessLabel(analyzedAt?: Date | string | null): FreshnessOutput | null {
  if (!analyzedAt) return null;
  const ts = new Date(analyzedAt).getTime();
  if (Number.isNaN(ts)) return null;
  const deltaMs = Date.now() - ts;
  const h = deltaMs / 3_600_000;
  const d = h / 24;

  if (h < 1) return { label: "agora", tone: "emerald" };
  if (h < 24) return { label: "hoje", tone: "emerald" };
  if (d < 7) return { label: `${Math.floor(d)}d atrás`, tone: "neutral" };
  if (d < 30) return { label: `${Math.floor(d)}d atrás`, tone: "amber" };
  return { label: `${Math.floor(d)}d · reanalisar?`, tone: "rose" };
}
