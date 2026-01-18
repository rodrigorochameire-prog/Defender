/**
 * Serviço de integração com Notion API
 * Sincroniza demandas entre o sistema e um banco de dados Notion
 */

// Tipos
export interface NotionDemanda {
  id: string;
  notionPageId?: string;
  status: string;
  prisao: string;
  dataEntrada: string;
  assistido: string;
  processo: string;
  ato: string;
  tipoAto: string;
  prazo: string;
  providencias: string | null;
  area: string;
  comarca?: string;
  defensor?: string;
  reuPreso: boolean;
  observacoes?: string;
  lastSyncedAt?: Date;
}

export interface NotionSyncResult {
  success: boolean;
  created: number;
  updated: number;
  errors: string[];
}

// Mapeamento de status para cores do Notion
const STATUS_COLORS: Record<string, string> = {
  "1_URGENTE": "red",
  "2_ANALISAR": "yellow",
  "2_ATENDER": "yellow",
  "2_BUSCAR": "yellow",
  "2_ELABORANDO": "yellow",
  "2_ELABORAR": "yellow",
  "2_INVESTIGAR": "yellow",
  "2_RELATORIO": "yellow",
  "2_REVISANDO": "yellow",
  "2_REVISAR": "yellow",
  "3_PROTOCOLAR": "orange",
  "4_AMANDA": "blue",
  "4_EMILLY": "blue",
  "4_MONITORAR": "blue",
  "4_ESTAGIO_TARISSA": "blue",
  "5_FILA": "purple",
  "6_DOCUMENTOS": "gray",
  "6_TESTEMUNHAS": "gray",
  "7_CIENCIA": "green",
  "7_CONSTITUIU_ADVOGADO": "green",
  "7_PROTOCOLADO": "green",
  "7_RESOLVIDO": "green",
  "7_SEM_ATUACAO": "green",
  "7_SIGAD": "green",
};

// Mapeamento de área para cores
const AREA_COLORS: Record<string, string> = {
  JURI: "purple",
  EXECUCAO_PENAL: "blue",
  VIOLENCIA_DOMESTICA: "pink",
  SUBSTITUICAO: "orange",
  CURADORIA: "default",
  FAMILIA: "green",
  CIVEL: "gray",
  FAZENDA_PUBLICA: "blue",
};

/**
 * Busca demandas do Notion via API REST
 */
export async function fetchNotionDemandas(): Promise<NotionDemanda[]> {
  const notionToken = process.env.NOTION_API_KEY;
  const databaseId = process.env.NOTION_DATABASE_ID;

  if (!notionToken || !databaseId) {
    console.warn("Notion não configurado. Configure NOTION_API_KEY e NOTION_DATABASE_ID.");
    return [];
  }

  try {
    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${notionToken}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sorts: [{ property: "Prazo", direction: "ascending" }],
      }),
    });

    if (!response.ok) {
      console.error("Erro ao buscar do Notion:", await response.text());
      return [];
    }

    const data = await response.json();
    return data.results.map(pageTodemanda).filter(Boolean) as NotionDemanda[];
  } catch (error) {
    console.error("Erro ao conectar com Notion:", error);
    return [];
  }
}

/**
 * Cria ou atualiza uma demanda no Notion
 */
export async function upsertNotionDemanda(demanda: NotionDemanda): Promise<string | null> {
  const notionToken = process.env.NOTION_API_KEY;
  const databaseId = process.env.NOTION_DATABASE_ID;

  if (!notionToken || !databaseId) {
    return null;
  }

  try {
    if (demanda.notionPageId) {
      // Atualizar página existente
      const response = await fetch(`https://api.notion.com/v1/pages/${demanda.notionPageId}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${notionToken}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          properties: demandaToProperties(demanda),
        }),
      });

      if (!response.ok) {
        console.error("Erro ao atualizar no Notion:", await response.text());
        return null;
      }

      return demanda.notionPageId;
    } else {
      // Criar nova página
      const response = await fetch("https://api.notion.com/v1/pages", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${notionToken}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          parent: { database_id: databaseId },
          properties: demandaToProperties(demanda),
        }),
      });

      if (!response.ok) {
        console.error("Erro ao criar no Notion:", await response.text());
        return null;
      }

      const data = await response.json();
      return data.id;
    }
  } catch (error) {
    console.error("Erro ao salvar no Notion:", error);
    return null;
  }
}

/**
 * Sincroniza demandas locais com Notion
 */
export async function syncDemandasToNotion(demandas: NotionDemanda[]): Promise<NotionSyncResult> {
  const result: NotionSyncResult = {
    success: true,
    created: 0,
    updated: 0,
    errors: [],
  };

  for (const demanda of demandas) {
    try {
      const pageId = await upsertNotionDemanda(demanda);
      if (pageId) {
        if (demanda.notionPageId) {
          result.updated++;
        } else {
          result.created++;
        }
      }
    } catch (error) {
      result.errors.push(`Erro ao sincronizar demanda ${demanda.id}: ${error}`);
    }
  }

  result.success = result.errors.length === 0;
  return result;
}

/**
 * Converte uma página Notion para objeto Demanda
 */
function pageTodemanda(page: any): NotionDemanda | null {
  try {
    const props = page.properties;

    return {
      id: page.id,
      notionPageId: page.id,
      status: getSelectValue(props.Status) || "",
      prisao: getSelectValue(props["Prisão"]) || "NAO_INFORMADO",
      dataEntrada: getDateValue(props["Data Entrada"]) || "",
      assistido: getTitleValue(props.Assistido) || "",
      processo: getRichTextValue(props.Processo) || "",
      ato: getRichTextValue(props.Ato) || "",
      tipoAto: getSelectValue(props["Tipo Ato"]) || "",
      prazo: getDateValue(props.Prazo) || "",
      providencias: getRichTextValue(props["Providências"]) || null,
      area: getSelectValue(props["Área"]) || "",
      comarca: getSelectValue(props.Comarca) || undefined,
      defensor: getSelectValue(props.Defensor) || undefined,
      reuPreso: getCheckboxValue(props["Réu Preso"]) || false,
      observacoes: getRichTextValue(props["Observações"]) || undefined,
    };
  } catch (error) {
    console.error("Erro ao converter página Notion:", error);
    return null;
  }
}

/**
 * Converte demanda para propriedades do Notion
 */
function demandaToProperties(demanda: NotionDemanda): Record<string, any> {
  const statusColor = STATUS_COLORS[demanda.status] || "default";
  const areaColor = AREA_COLORS[demanda.area] || "default";

  return {
    Assistido: {
      title: [{ text: { content: demanda.assistido } }],
    },
    Status: {
      select: {
        name: demanda.status,
        color: statusColor,
      },
    },
    "Prisão": {
      select: demanda.prisao ? { name: demanda.prisao } : null,
    },
    "Data Entrada": {
      date: demanda.dataEntrada ? { start: demanda.dataEntrada } : null,
    },
    Processo: {
      rich_text: [{ text: { content: demanda.processo } }],
    },
    Ato: {
      rich_text: [{ text: { content: demanda.ato } }],
    },
    "Tipo Ato": {
      select: demanda.tipoAto ? { name: demanda.tipoAto } : null,
    },
    Prazo: {
      date: demanda.prazo ? { start: demanda.prazo } : null,
    },
    "Providências": {
      rich_text: [{ text: { content: demanda.providencias || "" } }],
    },
    "Área": {
      select: demanda.area ? { name: demanda.area, color: areaColor } : null,
    },
    Comarca: {
      select: demanda.comarca ? { name: demanda.comarca } : null,
    },
    Defensor: {
      select: demanda.defensor ? { name: demanda.defensor } : null,
    },
    "Réu Preso": {
      checkbox: demanda.reuPreso,
    },
    "Observações": {
      rich_text: [{ text: { content: demanda.observacoes || "" } }],
    },
  };
}

// Helpers para extrair valores de propriedades Notion
function getSelectValue(prop: any): string | null {
  return prop?.select?.name || null;
}

function getTitleValue(prop: any): string | null {
  return prop?.title?.[0]?.plain_text || null;
}

function getRichTextValue(prop: any): string | null {
  return prop?.rich_text?.[0]?.plain_text || null;
}

function getDateValue(prop: any): string | null {
  return prop?.date?.start || null;
}

function getCheckboxValue(prop: any): boolean {
  return prop?.checkbox || false;
}

/**
 * Verifica se a integração com Notion está configurada
 */
export function isNotionConfigured(): boolean {
  return !!(process.env.NOTION_API_KEY && process.env.NOTION_DATABASE_ID);
}
