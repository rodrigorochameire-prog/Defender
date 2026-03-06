/**
 * Excalidraw Timeline Generator para Execucao Penal
 *
 * Gera um arquivo .excalidraw com visualizacao da timeline de
 * progressao de regime, marcos e datas-chave.
 *
 * Pode ser aberto no excalidraw.com ou embarcado em Obsidian.
 */

import type { ExecucaoPenalResult, MarcoExecucao } from "./execucao-penal";

// ==========================================
// TYPES
// ==========================================

export interface ExcalidrawTimelineOptions {
  result: ExecucaoPenalResult;
  nomeReu: string;
  nomeProcesso?: string;
}

interface ExcalidrawElement {
  id: string;
  type: "rectangle" | "text" | "line" | "arrow";
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  strokeColor: string;
  backgroundColor: string;
  fillStyle: "solid" | "hachure" | "cross-hatch";
  strokeWidth: number;
  roughness: number;
  opacity: number;
  groupIds: string[];
  roundness: { type: number } | null;
  seed: number;
  version: number;
  versionNonce: number;
  isDeleted: boolean;
  boundElements: null;
  updated: number;
  link: null;
  locked: boolean;
  // Text-specific
  text?: string;
  fontSize?: number;
  fontFamily?: number;
  textAlign?: "left" | "center" | "right";
  verticalAlign?: "top" | "middle";
  baseline?: number;
  containerId?: null;
  originalText?: string;
}

// ==========================================
// COLORS
// ==========================================

const COLORS = {
  detracao: "#f97316", // orange
  fechado: "#e11d48", // rose
  semiaberto: "#f59e0b", // amber
  aberto: "#10b981", // emerald
  livramento: "#8b5cf6", // violet
  fim_pena: "#64748b", // slate
  text: "#1e293b", // zinc-800
  textLight: "#64748b", // zinc-500
  background: "#ffffff",
  border: "#e2e8f0", // zinc-200
} as const;

const MARCO_COLORS: Record<string, string> = {
  detracao: COLORS.detracao,
  progressao_1: COLORS.fechado,
  progressao_2: COLORS.semiaberto,
  saida_temporaria: COLORS.aberto,
  livramento_condicional: COLORS.livramento,
  fim_pena: COLORS.fim_pena,
};

// ==========================================
// HELPERS
// ==========================================

let _seed = 1;
function nextSeed(): number {
  _seed = (_seed * 16807) % 2147483647;
  return _seed;
}

function makeId(prefix: string, index: number): string {
  return `${prefix}_${index}_${Date.now().toString(36)}`;
}

function createRect(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  backgroundColor: string,
  strokeColor: string = "transparent",
  strokeWidth: number = 0
): ExcalidrawElement {
  return {
    id,
    type: "rectangle",
    x,
    y,
    width,
    height,
    angle: 0,
    strokeColor,
    backgroundColor,
    fillStyle: "solid",
    strokeWidth,
    roughness: 0,
    opacity: 100,
    groupIds: [],
    roundness: { type: 3 },
    seed: nextSeed(),
    version: 1,
    versionNonce: nextSeed(),
    isDeleted: false,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
  };
}

function createText(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  text: string,
  fontSize: number = 16,
  textAlign: "left" | "center" | "right" = "left",
  color: string = COLORS.text
): ExcalidrawElement {
  return {
    id,
    type: "text",
    x,
    y,
    width,
    height,
    angle: 0,
    strokeColor: color,
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 0,
    roughness: 0,
    opacity: 100,
    groupIds: [],
    roundness: null,
    seed: nextSeed(),
    version: 1,
    versionNonce: nextSeed(),
    isDeleted: false,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
    text,
    fontSize,
    fontFamily: 1,
    textAlign,
    verticalAlign: "top",
    baseline: Math.round(fontSize * 0.85),
    containerId: null,
    originalText: text,
  };
}

function formatDateBR(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

function formatDaysToYearsMonths(days: number): string {
  const years = Math.floor(days / 360);
  const months = Math.floor((days % 360) / 30);
  const remainDays = days % 30;

  const parts: string[] = [];
  if (years > 0) parts.push(`${years}a`);
  if (months > 0) parts.push(`${months}m`);
  if (remainDays > 0 || parts.length === 0) parts.push(`${remainDays}d`);
  return parts.join(" ");
}

// ==========================================
// TIMELINE SEGMENTS
// ==========================================

interface TimelineSegment {
  label: string;
  color: string;
  days: number;
  percentage: number;
}

function buildSegments(result: ExecucaoPenalResult): TimelineSegment[] {
  const segments: TimelineSegment[] = [];
  const totalDays = result.penaTotalDias;

  if (totalDays <= 0) return segments;

  // Detracao
  if (result.detracaoDias > 0) {
    segments.push({
      label: "Detracao",
      color: COLORS.detracao,
      days: result.detracaoDias,
      percentage: (result.detracaoDias / totalDays) * 100,
    });
  }

  // Determine regime segments from marcos
  const marcos = result.marcos;
  const progressao1 = marcos.find((m) => m.tipo === "progressao_1");
  const progressao2 = marcos.find((m) => m.tipo === "progressao_2");
  const fimPena = marcos.find((m) => m.tipo === "fim_pena");

  if (progressao1 && progressao2 && fimPena) {
    // Fechado -> Semiaberto -> Aberto
    const fechadoDays = progressao1.diasCumpridos;
    const semiabertoDays = progressao2.diasCumpridos - progressao1.diasCumpridos;
    const abertoDays = fimPena.diasCumpridos - progressao2.diasCumpridos;

    segments.push({
      label: "Fechado",
      color: COLORS.fechado,
      days: fechadoDays,
      percentage: (fechadoDays / totalDays) * 100,
    });
    segments.push({
      label: "Semiaberto",
      color: COLORS.semiaberto,
      days: semiabertoDays,
      percentage: (semiabertoDays / totalDays) * 100,
    });
    if (abertoDays > 0) {
      segments.push({
        label: "Aberto",
        color: COLORS.aberto,
        days: abertoDays,
        percentage: (abertoDays / totalDays) * 100,
      });
    }
  } else if (progressao2 && fimPena) {
    // Semiaberto -> Aberto (started in semiaberto)
    const semiabertoDays = progressao2.diasCumpridos;
    const abertoDays = fimPena.diasCumpridos - progressao2.diasCumpridos;

    segments.push({
      label: "Semiaberto",
      color: COLORS.semiaberto,
      days: semiabertoDays,
      percentage: (semiabertoDays / totalDays) * 100,
    });
    if (abertoDays > 0) {
      segments.push({
        label: "Aberto",
        color: COLORS.aberto,
        days: abertoDays,
        percentage: (abertoDays / totalDays) * 100,
      });
    }
  } else if (fimPena) {
    // Aberto only
    segments.push({
      label: "Aberto",
      color: COLORS.aberto,
      days: result.saldoPenaDias,
      percentage: (result.saldoPenaDias / totalDays) * 100,
    });
  }

  return segments;
}

// ==========================================
// MAIN GENERATOR
// ==========================================

export function generateExcalidrawTimeline(
  options: ExcalidrawTimelineOptions
): object {
  _seed = 1; // Reset seed for deterministic output
  const { result, nomeReu, nomeProcesso } = options;
  const elements: ExcalidrawElement[] = [];

  let idx = 0;

  // Layout constants
  const PADDING = 40;
  const TIMELINE_WIDTH = 1000;
  const TIMELINE_HEIGHT = 60;
  const TIMELINE_Y = 160;
  const MARCO_CARD_WIDTH = 220;
  const MARCO_CARD_HEIGHT = 100;
  const MARCO_Y = TIMELINE_Y + TIMELINE_HEIGHT + 80;

  // ---- Title ----
  const titleText = nomeProcesso
    ? `Execucao Penal - ${nomeReu}\n${nomeProcesso}`
    : `Execucao Penal - ${nomeReu}`;

  elements.push(
    createText(
      makeId("title", idx++),
      PADDING,
      PADDING,
      TIMELINE_WIDTH,
      40,
      titleText,
      28,
      "left",
      COLORS.text
    )
  );

  // ---- Subtitle (fracao + regime legal) ----
  const regimeLabels: Record<string, string> = {
    pre_anticrime: "Lei anterior ao Pacote Anticrime",
    pos_anticrime: "Pacote Anticrime (Lei 13.964/2019)",
    pos_feminicidio_2024: "Lei 14.994/2024 (Feminicidio)",
  };

  const subtitleText = `Fracao: ${result.fracaoLabel} | ${regimeLabels[result.regimeLegal] || ""} | Pena: ${formatDaysToYearsMonths(result.penaTotalDias)}`;

  elements.push(
    createText(
      makeId("subtitle", idx++),
      PADDING,
      PADDING + 50,
      TIMELINE_WIDTH,
      24,
      subtitleText,
      16,
      "left",
      COLORS.textLight
    )
  );

  // ---- Detracao info ----
  if (result.detracaoDias > 0) {
    elements.push(
      createText(
        makeId("detracao_info", idx++),
        PADDING,
        PADDING + 80,
        TIMELINE_WIDTH,
        20,
        `Detracao: ${result.detracaoDias} dias | Saldo: ${formatDaysToYearsMonths(result.saldoPenaDias)}`,
        14,
        "left",
        COLORS.detracao
      )
    );
  }

  // ---- Timeline bar ----
  const segments = buildSegments(result);
  let xOffset = PADDING;

  // Background bar
  elements.push(
    createRect(
      makeId("bg", idx++),
      PADDING,
      TIMELINE_Y,
      TIMELINE_WIDTH,
      TIMELINE_HEIGHT,
      "#f1f5f9", // zinc-100
      COLORS.border,
      1
    )
  );

  for (const seg of segments) {
    const segWidth = Math.max((seg.percentage / 100) * TIMELINE_WIDTH, 2);

    // Colored segment
    elements.push(
      createRect(
        makeId("seg", idx++),
        xOffset,
        TIMELINE_Y,
        segWidth,
        TIMELINE_HEIGHT,
        seg.color,
        "transparent",
        0
      )
    );

    // Segment label (centered in segment)
    if (segWidth > 40) {
      const labelText = `${seg.label}\n${formatDaysToYearsMonths(seg.days)}`;
      elements.push(
        createText(
          makeId("seg_label", idx++),
          xOffset + 8,
          TIMELINE_Y + 12,
          segWidth - 16,
          TIMELINE_HEIGHT - 24,
          labelText,
          13,
          "center",
          "#ffffff"
        )
      );
    }

    xOffset += segWidth;
  }

  // ---- Date markers below timeline ----
  const startMarco = result.marcos[0];
  const endMarco = result.marcos[result.marcos.length - 1];

  if (startMarco) {
    elements.push(
      createText(
        makeId("date_start", idx++),
        PADDING,
        TIMELINE_Y + TIMELINE_HEIGHT + 8,
        200,
        18,
        formatDateBR(startMarco.data),
        12,
        "left",
        COLORS.textLight
      )
    );
  }

  if (endMarco && endMarco !== startMarco) {
    elements.push(
      createText(
        makeId("date_end", idx++),
        PADDING + TIMELINE_WIDTH - 200,
        TIMELINE_Y + TIMELINE_HEIGHT + 8,
        200,
        18,
        formatDateBR(endMarco.data),
        12,
        "right",
        COLORS.textLight
      )
    );
  }

  // ---- Marco cards ----
  const visibleMarcos = result.marcos.filter(
    (m) => m.tipo !== "detracao"
  );
  const cardGap = 20;
  const totalCardsWidth =
    visibleMarcos.length * MARCO_CARD_WIDTH +
    (visibleMarcos.length - 1) * cardGap;
  const startX = PADDING + (TIMELINE_WIDTH - totalCardsWidth) / 2;

  for (let i = 0; i < visibleMarcos.length; i++) {
    const marco = visibleMarcos[i];
    const cardX = startX + i * (MARCO_CARD_WIDTH + cardGap);
    const cardColor = MARCO_COLORS[marco.tipo] || COLORS.fim_pena;

    // Card background
    elements.push(
      createRect(
        makeId("card_bg", idx++),
        cardX,
        MARCO_Y,
        MARCO_CARD_WIDTH,
        MARCO_CARD_HEIGHT,
        "#ffffff",
        cardColor,
        2
      )
    );

    // Color accent bar at top
    elements.push(
      createRect(
        makeId("card_accent", idx++),
        cardX,
        MARCO_Y,
        MARCO_CARD_WIDTH,
        4,
        cardColor,
        "transparent",
        0
      )
    );

    // Marco label
    const marcoLabel = marco.tipo === "progressao_1"
      ? "Semiaberto"
      : marco.tipo === "progressao_2"
        ? "Aberto"
        : marco.tipo === "saida_temporaria"
          ? "Saida Temporaria"
          : marco.tipo === "livramento_condicional"
            ? "Livramento"
            : "Fim da Pena";

    elements.push(
      createText(
        makeId("card_title", idx++),
        cardX + 10,
        MARCO_Y + 12,
        MARCO_CARD_WIDTH - 20,
        20,
        marcoLabel,
        14,
        "center",
        cardColor
      )
    );

    // Date
    elements.push(
      createText(
        makeId("card_date", idx++),
        cardX + 10,
        MARCO_Y + 36,
        MARCO_CARD_WIDTH - 20,
        24,
        formatDateBR(marco.data),
        18,
        "center",
        COLORS.text
      )
    );

    // Fracao
    if (marco.fracao) {
      elements.push(
        createText(
          makeId("card_fracao", idx++),
          cardX + 10,
          MARCO_Y + 66,
          MARCO_CARD_WIDTH - 20,
          16,
          `${marco.fracao} - ${marco.fundamentoLegal}`,
          10,
          "center",
          COLORS.textLight
        )
      );
    }
  }

  // ---- Accessible labels below cards ----
  const ACCESSIBLE_Y = MARCO_Y + MARCO_CARD_HEIGHT + 30;
  for (let i = 0; i < visibleMarcos.length; i++) {
    const marco = visibleMarcos[i];
    const cardX = startX + i * (MARCO_CARD_WIDTH + cardGap);

    // Wrap text to ~30 chars per line
    const wrapped = wrapText(marco.labelAcessivel, 35);

    elements.push(
      createText(
        makeId("card_accessible", idx++),
        cardX,
        ACCESSIBLE_Y,
        MARCO_CARD_WIDTH,
        wrapped.split("\n").length * 16,
        wrapped,
        11,
        "center",
        COLORS.textLight
      )
    );
  }

  // ---- Vedado livramento alert ----
  if (result.vedadoLivramento) {
    const alertY = ACCESSIBLE_Y + 80;
    elements.push(
      createRect(
        makeId("alert_bg", idx++),
        PADDING,
        alertY,
        TIMELINE_WIDTH,
        40,
        "#fff1f2", // rose-50
        "#fda4af", // rose-300
        1
      )
    );
    elements.push(
      createText(
        makeId("alert_text", idx++),
        PADDING + 16,
        alertY + 10,
        TIMELINE_WIDTH - 32,
        20,
        `LIVRAMENTO CONDICIONAL VEDADO - ${result.incisoAplicado}`,
        14,
        "center",
        "#be123c" // rose-700
      )
    );
  }

  // ---- Legend ----
  const legendY = result.vedadoLivramento
    ? ACCESSIBLE_Y + 140
    : ACCESSIBLE_Y + 80;
  const legendItems = [
    { label: "Detracao", color: COLORS.detracao },
    { label: "Fechado", color: COLORS.fechado },
    { label: "Semiaberto", color: COLORS.semiaberto },
    { label: "Aberto", color: COLORS.aberto },
    { label: "Livramento", color: COLORS.livramento },
  ];

  let legendX = PADDING;
  for (const item of legendItems) {
    elements.push(
      createRect(
        makeId("legend_box", idx++),
        legendX,
        legendY,
        14,
        14,
        item.color,
        "transparent",
        0
      )
    );
    elements.push(
      createText(
        makeId("legend_label", idx++),
        legendX + 20,
        legendY - 1,
        80,
        16,
        item.label,
        12,
        "left",
        COLORS.textLight
      )
    );
    legendX += 120;
  }

  // ---- Source watermark ----
  elements.push(
    createText(
      makeId("watermark", idx++),
      PADDING,
      legendY + 40,
      400,
      14,
      "Gerado por OMBUDS - Defensoria Publica",
      10,
      "left",
      "#cbd5e1" // zinc-300
    )
  );

  return {
    type: "excalidraw",
    version: 2,
    source: "ombuds-defender",
    elements,
    appState: {
      gridSize: null,
      viewBackgroundColor: COLORS.background,
    },
    files: {},
  };
}

// ==========================================
// TEXT WRAPPING HELPER
// ==========================================

function wrapText(text: string, maxCharsPerLine: number): string {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (currentLine.length + word.length + 1 > maxCharsPerLine) {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = currentLine ? `${currentLine} ${word}` : word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines.join("\n");
}
