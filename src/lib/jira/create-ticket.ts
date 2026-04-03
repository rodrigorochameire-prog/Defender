const JIRA_BASE = "https://ombuds.atlassian.net";
const JIRA_PROJECT = "SCRUM";

const TIPO_TO_JIRA: Record<string, { issueType: string }> = {
  bug: { issueType: "Bug" },
  sugestao: { issueType: "Story" },
  duvida: { issueType: "Task" },
};

const PRIORIDADE_TO_JIRA: Record<string, string> = {
  baixa: "Low",
  media: "Medium",
  alta: "High",
};

interface CreateJiraTicketInput {
  tipo: string;
  mensagem: string;
  pagina?: string | null;
  contexto?: {
    viewport?: string;
    userAgent?: string;
    consoleErrors?: string[];
  } | null;
  userName?: string | null;
  createdAt: Date;
  prioridade: "baixa" | "media" | "alta";
}

export async function createJiraTicket(input: CreateJiraTicketInput) {
  const jiraEmail = process.env.JIRA_EMAIL;
  const jiraToken = process.env.JIRA_API_TOKEN;

  if (!jiraEmail || !jiraToken) {
    throw new Error("JIRA_EMAIL e JIRA_API_TOKEN não configurados. Adicione ao .env.local");
  }

  const tipoConfig = TIPO_TO_JIRA[input.tipo] ?? { issueType: "Task" };
  const errorsText =
    input.contexto?.consoleErrors?.length
      ? input.contexto.consoleErrors.map((e: string) => `- ${e}`).join("\n")
      : "nenhum";

  const description = [
    `h2. Feedback de usuário`,
    `${input.mensagem}`,
    ``,
    `h2. Contexto técnico`,
    `- *Página:* ${input.pagina ?? "—"}`,
    `- *Viewport:* ${input.contexto?.viewport ?? "—"}`,
    `- *Navegador:* ${input.contexto?.userAgent ?? "—"}`,
    `- *Data:* ${input.createdAt.toLocaleString("pt-BR")}`,
    `- *Usuário:* ${input.userName ?? "—"}`,
    `- *Erros console:* ${errorsText}`,
    ``,
    `----`,
    `_Enviado via OMBUDS Feedback_`,
  ].join("\n");

  const body = {
    fields: {
      project: { key: JIRA_PROJECT },
      summary: `[feedback-${input.tipo}] ${input.mensagem.slice(0, 80)}`,
      description,
      issuetype: { name: tipoConfig.issueType },
      priority: { name: PRIORIDADE_TO_JIRA[input.prioridade] ?? "Medium" },
      labels: ["feedback-usuario"],
    },
  };

  const res = await fetch(`${JIRA_BASE}/rest/api/2/issue`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${jiraEmail}:${jiraToken}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Jira API error (${res.status}): ${error}`);
  }

  const data = await res.json();
  return { key: data.key as string, id: data.id as string };
}
