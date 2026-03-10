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

export const maxDuration = 60;

/**
 * POST /api/whatsapp/send-media
 *
 * Upload and send media file via WhatsApp (Evolution API).
 * Accepts FormData with: file, contactId, configId, type (image|document|audio)
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("defesahub_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const contactIdStr = formData.get("contactId") as string | null;
    const configIdStr = formData.get("configId") as string | null;
    const fileType = (formData.get("type") as string) || "document";

    if (!file || !contactIdStr || !configIdStr) {
      return NextResponse.json(
        { error: "Campos obrigatórios: file, contactId, configId" },
        { status: 400 }
      );
    }

    const contactId = parseInt(contactIdStr, 10);
    const configId = parseInt(configIdStr, 10);

    // Check size (16MB)
    if (file.size > 16 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Arquivo muito grande (limite: 16MB)" },
        { status: 400 }
      );
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

    // Convert file to base64 data URL
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    const to = formatPhoneNumber(contact.phone);
    const apiOptions = {
      instanceName: config.instanceName,
      apiKey: config.apiKey,
    };

    let result;
    const mediaType = fileType === "image" || file.type.startsWith("image/")
      ? "image"
      : file.type.startsWith("audio/")
        ? "audio"
        : "document";

    if (mediaType === "image") {
      result = await sendImage(to, dataUrl, {
        ...apiOptions,
        caption: file.name,
      });
    } else if (mediaType === "audio") {
      result = await sendAudio(to, dataUrl, apiOptions);
    } else {
      result = await sendDocument(to, dataUrl, {
        ...apiOptions,
        filename: file.name,
      });
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
        mediaMimeType: file.type,
        mediaFilename: file.name,
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
