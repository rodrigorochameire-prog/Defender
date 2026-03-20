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

    // Fetch contacts from Evolution API
    const contacts = await client.findContacts();
    console.log(`[Sync] Fetched ${contacts.length} contacts from Evolution API`);

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const contact of contacts) {
      try {
        // Skip group JIDs and status broadcast
        if (!contact.id || contact.id.endsWith("@g.us") || contact.id === "status@broadcast") {
          skipped++;
          continue;
        }

        const phone = extractPhoneFromJid(contact.id);

        // Skip invalid phone numbers
        if (!phone || phone.length < 8) {
          skipped++;
          continue;
        }

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
          // Update pushName if changed
          if (contact.pushName) {
            await db
              .update(whatsappContacts)
              .set({
                pushName: contact.pushName,
                profilePicUrl: contact.profilePictureUrl || undefined,
                updatedAt: new Date(),
              })
              .where(eq(whatsappContacts.id, existing.id));
            updated++;
          } else {
            skipped++;
          }
        } else {
          // Create new contact
          await db.insert(whatsappContacts).values({
            configId,
            phone,
            pushName: contact.pushName || null,
            profilePicUrl: contact.profilePictureUrl || null,
          });
          created++;
        }
      } catch (contactError) {
        console.warn(`[Sync] Error processing contact ${contact.id}:`, contactError);
        skipped++;
      }
    }

    // Update config with sync stats
    await db
      .update(evolutionConfig)
      .set({
        lastSyncAt: new Date(),
        lastSyncContactsCount: contacts.length,
        updatedAt: new Date(),
      })
      .where(eq(evolutionConfig.id, configId));

    const result = {
      status: "ok",
      total: contacts.length,
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
