export interface NoticiaExportRow {
  id: number;
  titulo: string;
  fonte: string;
  tipoCrime: string | null;
  bairro: string | null;
  dataFato: string | Date | null;
  dataPublicacao: string | Date | null;
  resumoIA: string | null;
  matchCount?: number;
  url: string;
  envolvidos: string; // "Nome (papel), ..."
}

function formatDate(d: string | Date | null): string {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("pt-BR");
  } catch {
    return "";
  }
}

function formatEnvolvidos(envolvidos: any[] | string | null): string {
  if (!envolvidos) return "";
  let arr: any[] = [];
  if (typeof envolvidos === "string") {
    try { arr = JSON.parse(envolvidos); } catch { return ""; }
  } else {
    arr = envolvidos;
  }
  if (!Array.isArray(arr)) return "";
  return arr
    .filter(e => e.nome && e.nome.trim())
    .map(e => `${e.nome}${e.papel ? ` (${e.papel})` : ""}`)
    .join("; ");
}

export function exportNoticiasToCsv(noticias: any[], filename = "radar-criminal.csv") {
  const HEADERS = [
    "ID", "Título", "Fonte", "Tipo de Crime", "Bairro",
    "Data do Fato", "Data Publicação", "Matches DPE",
    "Resumo IA", "Envolvidos", "URL",
  ];

  const rows = noticias.map(n => [
    n.id,
    `"${(n.titulo || "").replace(/"/g, '""')}"`,
    `"${(n.fonte || "").replace(/"/g, '""')}"`,
    n.tipoCrime || "",
    n.bairro || "",
    formatDate(n.dataFato),
    formatDate(n.dataPublicacao),
    n.matchCount ?? 0,
    `"${(n.resumoIA || "").replace(/"/g, '""')}"`,
    `"${formatEnvolvidos(n.envolvidos).replace(/"/g, '""')}"`,
    n.url || "",
  ]);

  const csvContent = [
    HEADERS.join(","),
    ...rows.map(row => row.join(",")),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
