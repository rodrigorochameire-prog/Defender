import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  evolutionConfig,
  whatsappContacts,
  whatsappConnectionLog,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const secret = request.headers.get("x-internal-secret");
    const expectedSecret = process.env.EVOLUTION_WEBHOOK_SECRET;
    if (expectedSecret && secret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { configId } = await request.json();
    if (!configId) {
      return NextResponse.json({ error: "Missing configId" }, { status: 400 });
    }

    const [config] = await db
      .select()
      .from(evolutionConfig)
      .where(eq(evolutionConfig.id, configId))
      .limit(1);

    if (!config) {
      return NextResponse.json({ error: "Config not found" }, { status: 404 });
    }

    console.log(`[SyncOnConnect] Starting sync for config ${configId}`);

    await db.insert(whatsappConnectionLog).values({
      configId,
      event: "sync_started",
      details: { trigger: "auto_on_connect" },
    });

    // Fetch contacts from Evolution API
    const contactsResponse = await fetch(
      `${config.apiUrl}/chat/findContacts/${config.instanceName}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: config.apiKey,
        },
        body: JSON.stringify({}),
      }
    );

    let contactsSynced = 0;

    if (contactsResponse.ok) {
      const contacts = await contactsResponse.json();
      const individualContacts = (Array.isArray(contacts) ? contacts : []).filter(
        (c: Record<string, unknown>) =>
          typeof c.id === "string" &&
          c.id.endsWith("@s.whatsapp.net") &&
          !c.id.includes("-")
      );

      for (const c of individualContacts) {
        const phone = (c.id as string).replace("@s.whatsapp.net", "");
        const name = (c.pushName || c.name || null) as string | null;

        try {
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
            if (name) {
              await db
                .update(whatsappContacts)
                .set({
                  pushName: name,
                  updatedAt: new Date(),
                })
                .where(eq(whatsappContacts.id, existing.id));
            }
          } else {
            await db.insert(whatsappContacts).values({
              configId,
              phone,
              pushName: name,
            });
          }
          contactsSynced++;
        } catch {
          // Skip individual contact errors
        }
      }
    }

    await db
      .update(evolutionConfig)
      .set({
        lastSyncContactsCount: contactsSynced,
        lastSyncAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(evolutionConfig.id, configId));

    await db.insert(whatsappConnectionLog).values({
      configId,
      event: "sync_completed",
      details: { contactsSynced, trigger: "auto_on_connect" },
    });

    console.log(`[SyncOnConnect] Completed: ${contactsSynced} contacts`);

    return NextResponse.json({ success: true, contactsSynced });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    console.error("[SyncOnConnect] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
