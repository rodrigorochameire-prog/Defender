/**
 * 06-cleanup-webhooks.ts
 *
 * Deactivates expired Drive webhooks and optionally renews them.
 *
 * Usage: set -a && source .env.local && set +a && npx tsx scripts/drive-health/06-cleanup-webhooks.ts
 */

import { db } from '../../src/lib/db';
import { driveWebhooks } from '../../src/lib/db/schema/drive';
import { eq, sql, lt, and } from 'drizzle-orm';

async function main() {
  console.log('=== 06: CLEANUP EXPIRED WEBHOOKS ===');

  // Current state
  const stats = await db.execute(sql`
    SELECT
      count(*) as total,
      count(*) filter (where is_active) as active,
      count(*) filter (where not is_active) as inactive,
      count(*) filter (where is_active and expiration < now()) as expired_but_active
    FROM drive_webhooks
  `);
  console.log('\nCurrent state:');
  console.table(stats.rows);

  // Deactivate all expired
  const result = await db
    .update(driveWebhooks)
    .set({ isActive: false })
    .where(
      and(
        eq(driveWebhooks.isActive, true),
        lt(driveWebhooks.expiration, new Date())
      )
    )
    .returning({ id: driveWebhooks.id });

  console.log(`\nDeactivated ${result.length} expired webhooks`);

  // Final state
  const after = await db.execute(sql`
    SELECT
      count(*) as total,
      count(*) filter (where is_active) as active,
      count(*) filter (where not is_active) as inactive
    FROM drive_webhooks
  `);
  console.log('\nFinal state:');
  console.table(after.rows);

  console.log('\nTo renew webhooks, trigger sync from the OMBUDS UI or call:');
  console.log('  trpc.drive.smartSync({ dryRun: false })');
  console.log('This auto-registers webhooks after a successful sync.');

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
