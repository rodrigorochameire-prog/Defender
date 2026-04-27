const PLACEHOLDER_PATTERNS: RegExp[] = [
  /^\s*$/,
  /^\s*[-?.]+\s*$/,
  /^\s*n\/c\s*$/i,
  /^\s*n\.?a\.?\s*$/i,
  /\bn[aã]o\s+informad/i,
  /\bn[aã]o\s+consta\b/i,
  /\bsem\s+endere[çc]o\b/i,
  /\ba\s+confirmar\b/i,
  /\ba\s+extrair\b/i,
  /\bA\s+EXTRAIR\b/,
  /\bdesconhecid/i,
];

export function isPlaceholderLugar(raw: string | null | undefined): boolean {
  if (!raw) return true;
  const s = String(raw).trim();
  if (s.length < 3) return true;
  return PLACEHOLDER_PATTERNS.some((re) => re.test(s));
}
