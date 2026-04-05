/**
 * Storage & Calendar Provider Abstraction
 *
 * Supports dual-provider: Google (Drive/Calendar) and Microsoft (OneDrive/Outlook).
 * Determined by env: CLOUD_PROVIDER=google|microsoft
 */

export type CloudProvider = "google" | "microsoft";

export interface CalendarEvent {
  id?: string;
  title: string;
  start: string;      // ISO datetime
  end?: string;
  location?: string;
  description?: string;
  processoNumero?: string;
  assistidoNome?: string;
}

export interface StorageFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  parentFolderId?: string;
}

// ─── Provider Detection ───────────────────────────────────────────────────

export function getProvider(): CloudProvider {
  return (process.env.CLOUD_PROVIDER as CloudProvider) || "google";
}

// ─── Calendar ─────────────────────────────────────────────────────────────

export async function createCalendarEvent(event: CalendarEvent): Promise<string> {
  const provider = getProvider();
  if (provider === "microsoft") {
    return createOutlookEvent(event);
  }
  return createGoogleCalendarEvent(event);
}

export async function listCalendarEvents(start: string, end: string): Promise<CalendarEvent[]> {
  const provider = getProvider();
  if (provider === "microsoft") {
    return listOutlookEvents(start, end);
  }
  return listGoogleCalendarEvents(start, end);
}

// ─── Storage ──────────────────────────────────────────────────────────────

export async function uploadFile(
  filePath: string,
  folderPath: string,
  fileName: string,
): Promise<StorageFile> {
  const provider = getProvider();
  if (provider === "microsoft") {
    return uploadToOneDrive(filePath, folderPath, fileName);
  }
  return uploadToGoogleDrive(filePath, folderPath, fileName);
}

export async function findOrCreateFolder(
  path: string,
  parentId?: string,
): Promise<string> {
  const provider = getProvider();
  if (provider === "microsoft") {
    return findOrCreateOneDriveFolder(path);
  }
  return findOrCreateGoogleDriveFolder(path, parentId);
}

// ─── Google Implementations ───────────────────────────────────────────────

async function createGoogleCalendarEvent(event: CalendarEvent): Promise<string> {
  const token = await getGoogleAccessToken();
  const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      summary: event.title,
      start: { dateTime: event.start, timeZone: "America/Bahia" },
      end: { dateTime: event.end || event.start, timeZone: "America/Bahia" },
      location: event.location,
      description: event.description,
    }),
  });
  const data = await res.json();
  return data.id;
}

async function listGoogleCalendarEvents(start: string, end: string): Promise<CalendarEvent[]> {
  const token = await getGoogleAccessToken();
  const params = new URLSearchParams({
    timeMin: start,
    timeMax: end,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "100",
  });
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return (data.items ?? []).map((e: any) => ({
    id: e.id,
    title: e.summary,
    start: e.start?.dateTime || e.start?.date,
    end: e.end?.dateTime || e.end?.date,
    location: e.location,
    description: e.description,
  }));
}

async function uploadToGoogleDrive(filePath: string, folderPath: string, fileName: string): Promise<StorageFile> {
  // Delegates to existing pje_upload_drive_curl.sh logic via exec
  // or uses googleapis directly
  const { execSync } = await import("child_process");
  const token = await getGoogleAccessToken();
  const folderId = await findOrCreateGoogleDriveFolder(folderPath);

  const metadata = JSON.stringify({ name: fileName, parents: [folderId] });
  const result = execSync(
    `curl -s -X POST "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart" ` +
    `-H "Authorization: Bearer ${token}" ` +
    `-F "metadata=${metadata};type=application/json" ` +
    `-F "file=@${filePath};type=application/pdf"`,
    { encoding: "utf-8" }
  );
  const file = JSON.parse(result);
  return {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    webViewLink: `https://drive.google.com/file/d/${file.id}/view`,
    parentFolderId: folderId,
  };
}

async function findOrCreateGoogleDriveFolder(path: string, parentId?: string): Promise<string> {
  const token = await getGoogleAccessToken();
  const segments = path.split("/").filter(Boolean);
  let currentParent = parentId || "root";

  for (const segment of segments) {
    const q = `name='${segment}' and '${currentParent}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const searchData = await searchRes.json();

    if (searchData.files?.length > 0) {
      currentParent = searchData.files[0].id;
    } else {
      const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: segment,
          mimeType: "application/vnd.google-apps.folder",
          parents: [currentParent],
        }),
      });
      const created = await createRes.json();
      currentParent = created.id;
    }
  }
  return currentParent;
}

async function getGoogleAccessToken(): Promise<string> {
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken!,
      client_id: clientId!,
      client_secret: clientSecret!,
    }),
  });
  const data = await res.json();
  return data.access_token;
}

// ─── Microsoft Implementations ────────────────────────────────────────────

async function getMicrosoftAccessToken(): Promise<string> {
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;
  const refreshToken = process.env.AZURE_REFRESH_TOKEN;

  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken!,
      client_id: clientId!,
      client_secret: clientSecret!,
      scope: "https://graph.microsoft.com/.default",
    }),
  });
  const data = await res.json();
  return data.access_token;
}

async function createOutlookEvent(event: CalendarEvent): Promise<string> {
  const token = await getMicrosoftAccessToken();
  const res = await fetch("https://graph.microsoft.com/v1.0/me/events", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      subject: event.title,
      start: { dateTime: event.start, timeZone: "America/Bahia" },
      end: { dateTime: event.end || event.start, timeZone: "America/Bahia" },
      location: { displayName: event.location },
      body: { contentType: "Text", content: event.description || "" },
    }),
  });
  const data = await res.json();
  return data.id;
}

async function listOutlookEvents(start: string, end: string): Promise<CalendarEvent[]> {
  const token = await getMicrosoftAccessToken();
  const params = new URLSearchParams({
    startDateTime: start,
    endDateTime: end,
    $orderby: "start/dateTime",
    $top: "100",
  });
  const res = await fetch(`https://graph.microsoft.com/v1.0/me/calendarView?${params}`, {
    headers: { Authorization: `Bearer ${token}`, Prefer: 'outlook.timezone="America/Bahia"' },
  });
  const data = await res.json();
  return (data.value ?? []).map((e: any) => ({
    id: e.id,
    title: e.subject,
    start: e.start?.dateTime,
    end: e.end?.dateTime,
    location: e.location?.displayName,
    description: e.bodyPreview,
  }));
}

async function uploadToOneDrive(filePath: string, folderPath: string, fileName: string): Promise<StorageFile> {
  const token = await getMicrosoftAccessToken();
  const fs = await import("fs");
  const fileBuffer = fs.readFileSync(filePath);
  const drivePath = `${folderPath}/${fileName}`.replace(/\/+/g, "/");

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/drive/root:/${drivePath}:/content`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/pdf",
      },
      body: fileBuffer,
    }
  );
  const data = await res.json();
  return {
    id: data.id,
    name: data.name,
    mimeType: data.file?.mimeType || "application/pdf",
    webViewLink: data.webUrl,
  };
}

async function findOrCreateOneDriveFolder(path: string): Promise<string> {
  const token = await getMicrosoftAccessToken();
  // OneDrive creates folders automatically on file upload via path
  // But for explicit creation:
  const segments = path.split("/").filter(Boolean);
  let currentPath = "";

  for (const segment of segments) {
    currentPath = currentPath ? `${currentPath}/${segment}` : segment;
    const checkRes = await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/root:/${currentPath}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!checkRes.ok) {
      const parentPath = currentPath.includes("/")
        ? currentPath.substring(0, currentPath.lastIndexOf("/"))
        : "";
      const parentUrl = parentPath
        ? `https://graph.microsoft.com/v1.0/me/drive/root:/${parentPath}:/children`
        : "https://graph.microsoft.com/v1.0/me/drive/root/children";

      await fetch(parentUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: segment,
          folder: {},
          "@microsoft.graph.conflictBehavior": "fail",
        }),
      });
    }
  }

  const finalRes = await fetch(
    `https://graph.microsoft.com/v1.0/me/drive/root:/${path}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await finalRes.json();
  return data.id;
}
