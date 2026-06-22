/**
 * Geometria pura da caneta livre (ink) do leitor de PDF.
 *
 * Coordenadas dos traços são guardadas NORMALIZADAS [0..1] relativas à página
 * (como os grifos), para sobreviver a zoom e a mudanças de tamanho do canvas.
 *
 * Spec: docs/specs/leitor-ink.md
 */

export interface Point {
  x: number;
  y: number;
}

/** Par normalizado [x, y] em [0,1]. */
export type NormPoint = [number, number];

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

/** Ponto em px → normalizado [0,1] relativo a (w,h). w/h ≤ 0 → [0,0]. */
export function normalizePoint(p: Point, w: number, h: number): NormPoint {
  if (w <= 0 || h <= 0) return [0, 0];
  return [clamp01(p.x / w), clamp01(p.y / h)];
}

/** Normalizado [0,1] → ponto em px relativo a (w,h). */
export function denormalizePoint([x, y]: NormPoint, w: number, h: number): Point {
  return { x: x * w, y: y * h };
}

/** Distância perpendicular de `p` à reta `a→b`. */
function perpendicularDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  // |produto vetorial| / |a→b|
  return Math.abs(dx * (a.y - p.y) - (a.x - p.x) * dy) / len;
}

/**
 * Simplificação Ramer–Douglas–Peucker: remove pontos a menos de `epsilon` da reta,
 * preservando os extremos e os vértices que desviam mais que `epsilon`.
 */
export function simplify(points: Point[], epsilon: number): Point[] {
  if (points.length <= 2) return points.slice();

  const first = points[0];
  const last = points[points.length - 1];
  let maxDist = 0;
  let idx = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], first, last);
    if (d > maxDist) {
      maxDist = d;
      idx = i;
    }
  }

  if (maxDist <= epsilon) return [first, last];

  const left = simplify(points.slice(0, idx + 1), epsilon);
  const right = simplify(points.slice(idx), epsilon);
  // junta sem duplicar o ponto de articulação
  return [...left.slice(0, -1), ...right];
}

// 3 casas decimais: preciso o bastante tanto em px quanto em coords normalizadas
// [0..1] (onde 0.001 ≈ 1px numa página de ~1000px).
const fmt = (n: number) => String(Math.round(n * 1000) / 1000);

/**
 * Constrói um path SVG suavizado (curvas quadráticas via pontos originais como
 * controle) começando em M e terminando exatamente no último ponto.
 */
export function toSvgPath(points: Point[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${fmt(points[0].x)} ${fmt(points[0].y)}`;

  let d = `M ${fmt(points[0].x)} ${fmt(points[0].y)}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const cur = points[i];
    const mx = (prev.x + cur.x) / 2;
    const my = (prev.y + cur.y) / 2;
    d += ` Q ${fmt(prev.x)} ${fmt(prev.y)} ${fmt(mx)} ${fmt(my)}`;
  }
  const last = points[points.length - 1];
  d += ` L ${fmt(last.x)} ${fmt(last.y)}`;
  return d;
}
