import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import {
  evolutionConfig,
  whatsappContacts,
  whatsappChatMessages,
} from "@/lib/db/schema";
import {
  sendImage,
  sendDocument,
  sendAudio,
  formatPhoneNumber,
} from "@/lib/services/evolution-api";
import { downloadFileContent } from "@/lib/services/google-drive";

export const maxDuration = 60;

/**
 * POST /api/whatsapp/send-media
 *
 * Send media file via WhatsApp (Evolution API).
 *
 * Accepts two modes:
 * 1. FormData: file (File), contactId, configId, type
 * 2. JSON: driveFileId, fileName, mimeType, contactId, configId, type
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("defesahub_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const contentType = request.headers.get("content-type") || "";
    let contactId: number;
    let configId: number;
    let fileType: string;
    let fileName: string;
    let fileMimeType: string;
    let dataUrl: string;

    if (contentType.includes("application/json")) {
      // Mode 2: Drive file
      const body = await request.json();
      const { driveFileId, fileName: fn, mimeType, type } = body;
      contactId = body.contactId;
      configId = body.configId;
      fileType = type || "document";
      fileName = fn || "file";
      fileMimeType = mimeType || "application/octet-stream";

      if (!driveFileId || !contactId || !configId) {
        return NextResponse.json(
          { error: "Campos obrigatórios: driveFileId, contactId, configId" },
          { status: 400 }
        );
      }

      // Download file from Drive
      const arrayBuffer = await downloadFileContent(driveFileId);
      if (!arrayBuffer) {
        return NextResponse.json(
          { error: "Não foi possível baixar o arquivo do Drive" },
          { status: 500 }
        );
      }

      // Check size (16MB)
      if (arrayBuffer.byteLength > 16 * 1024 * 1024) {
        return NextResponse.json(
          { error: "Arquivo muito grande (limite: 16MB)" },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString("base64");
      dataUrl = `data:${fileMimeType};base64,${base64}`;
    } else {
      // Mode 1: FormData upload
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const contactIdStr = formData.get("contactId") as string | null;
      const configIdStr = formData.get("configId") as string | null;
      fileType = (formData.get("type") as string) || "document";

      if (!file || !contactIdStr || !configIdStr) {
        return NextResponse.json(
          { error: "Campos obrigatórios: file, contactId, configId" },
          { status: 400 }
        );
      }

      contactId = parseInt(contactIdStr, 10);
      configId = parseInt(configIdStr, 10);
      fileName = file.name;
      fileMimeType = file.type;

      // Check size (16MB)
      if (file.size > 16 * 1024 * 1024) {
        return NextResponse.json(
          { error: "Arquivo muito grande (limite: 16MB)" },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString("base64");
      dataUrl = `data:${fileMimeType};base64,${base64}`;
    }

    // Get config
    const config = await db.query.evolutionConfig.findFirst({
      where: eq(evolutionConfig.id, configId),
    });
    if (!config) {
      return NextResponse.json({ error: "Config não encontrada" }, { status: 404 });
    }

    // Get contact
    const contact = await db.query.whatsappContacts.findFirst({
      where: eq(whatsappContacts.id, contactId),
    });
    if (!contact) {
      return NextResponse.json({ error: "Contato não encontrado" }, { status: 404 });
    }

    const to = formatPhoneNumber(contact.phone);
    const apiOptions = {
      instanceName: config.instanceName,
      apiKey: config.apiKey,
    };

    let result;
    const mediaType = fileType === "image" || fileMimeType.startsWith("image/")
      ? "image"
      : fileMimeType.startsWith("audio/")
        ? "audio"
        : "document";

    if (mediaType === "image") {
      result = await sendImage(to, dataUrl, {
        ...apiOptions,
        caption: fileName,
      });
    } else if (mediaType === "audio") {
      result = await sendAudio(to, dataUrl, apiOptions);
    } else {
      result = await sendDocument(to, dataUrl, fileName, apiOptions);
    }

    // Save message to database
    const [message] = await db
      .insert(whatsappChatMessages)
      .values({
        contactId,
        waMessageId: result?.key?.id || null,
        direction: "outbound",
        type: mediaType,
        content: null,
        mediaUrl: dataUrl.substring(0, 200), // Store truncated reference
        mediaMimeType: fileMimeType,
        mediaFilename: fileName,
        status: "sent",
      })
      .returning();

    // Update contact last message
    await db
      .update(whatsappContacts)
      .set({
        lastMessageAt: new Date(),
        lastMessageContent: `[${mediaType === "image" ? "Imagem" : mediaType === "audio" ? "Áudio" : "Documento"}]`,
        lastMessageDirection: "outbound",
        lastMessageType: mediaType,
        unreadCount: 0,
      })
      .where(eq(whatsappContacts.id, contactId));

    return NextResponse.json({
      success: true,
      messageId: message.id,
      type: mediaType,
    });
  } catch (error) {
    console.error("Error sending media:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao enviar mídia" },
      { status: 500 }
    );
  }
}
