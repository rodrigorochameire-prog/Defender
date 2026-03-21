/**
 * Sync contacts from Evolution API on connection
 *
 * Called internally by the CONNECTION_UPDATE webhook handler when
 * the WhatsApp instance connects (state === "open").
 *
 * Fetches all contacts from Evolution API and upserts them into
 * the whatsapp_contacts table.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { evolutionConfig, whatsappContacts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import {
  EvolutionApiClient,
  extractPhoneFromJid,
} from "@/lib/services/evolution-api";

export async function POST(request: NextRequest) {
  try {
    // Validate internal secret
    const secret = request.headers.get("x-internal-secret");
    const expectedSecret = process.env.EVOLUTION_WEBHOOK_SECRET;

    if (expectedSecret && secret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { configId } = (await request.json()) as { configId: number };

    if (!configId) {
      return NextResponse.json({ error: "configId required" }, { status: 400 });
    }

    // Fetch config from DB
    const [config] = await db
      .select()
      .from(evolutionConfig)
      .where(eq(evolutionConfig.id, configId))
      .limit(1);

    if (!config) {
      return NextResponse.json({ error: "Config not found" }, { status: 404 });
    }

    console.log(`[Sync] Starting contact sync for instance: ${config.instanceName}`);

    // Create Evolution API client with config from DB
    const client = new EvolutionApiClient({
      apiUrl: config.apiUrl,
      apiKey: config.apiKey,
      instanceName: config.instanceName,
    });

    // Fetch chats (conversations) and contacts (names/pics) from Evolution API
    const [chats, contacts] = await Promise.all([
      client.findChats().catch(() => []),
      client.findContacts().catch(() => []),
    ]);
    console.log(`[Sync] Fetched ${chats.length} chats and ${contacts.length} contacts from Evolution API`);

    // Build a map of phone -> contact info for quick lookup
    const contactMap = new Map<string, { pushName?: string; profilePictureUrl?: string | null }>();
    for (const c of contacts) {
      if (c.id && c.id.endsWith("@s.whatsapp.net")) {
        const phone = extractPhoneFromJid(c.id);
        if (phone) contactMap.set(phone, { pushName: c.pushName, profilePictureUrl: c.profilePictureUrl });
      }
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const chat of chats) {
      try {
        const jid = chat.remoteJid || chat.id;

        // Skip group JIDs, status broadcast and invalid entries
        if (!jid || jid.endsWith("@g.us") || jid === "status@broadcast" || jid.includes("-")) {
          skipped++;
          continue;
        }

        const phone = extractPhoneFromJid(jid);

        // Skip invalid phone numbers
        if (!phone || phone.length < 8) {
          skipped++;
          continue;
        }

        const contactInfo = contactMap.get(phone);
        const lastMessageAt = chat.lastMsgTimestamp ? new Date(chat.lastMsgTimestamp * 1000) : null;

        // Check if contact already exists
        const [existing] = await db
          .select({ id: whatsappContacts.id })
          .from(whatsappContacts)
          .where(
            and(
              eq(whatsappContacts.configId, configId),
              eq(whatsappContacts.phone, phone)
            )
          )
          .limit(1);

        if (existing) {
          await db
            .update(whatsappContacts)
            .set({
              ...(contactInfo?.pushName ? { pushName: contactInfo.pushName } : {}),
              ...(contactInfo?.profilePictureUrl ? { profilePicUrl: contactInfo.profilePictureUrl } : {}),
              ...(lastMessageAt ? { lastMessageAt } : {}),
              ...(chat.unreadCount !== undefined ? { unreadCount: chat.unreadCount } : {}),
              updatedAt: new Date(),
            })
            .where(eq(whatsappContacts.id, existing.id));
          updated++;
        } else {
          await db.insert(whatsappContacts).values({
            configId,
            phone,
            pushName: contactInfo?.pushName || chat.name || null,
            profilePicUrl: contactInfo?.profilePictureUrl || null,
            lastMessageAt,
            unreadCount: chat.unreadCount ?? 0,
          });
          created++;
        }
      } catch (contactError) {
        console.warn(`[Sync] Error processing chat ${chat.id}:`, contactError);
        skipped++;
      }
    }

    // Update config with sync stats
    await db
      .update(evolutionConfig)
      .set({
        lastSyncAt: new Date(),
        lastSyncContactsCount: chats.length,
        updatedAt: new Date(),
      })
      .where(eq(evolutionConfig.id, configId));

    const result = {
      status: "ok",
      total: chats.length,
      created,
      updated,
      skipped,
    };

    console.log(`[Sync] Complete:`, result);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Sync] Error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
