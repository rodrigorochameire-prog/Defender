// Creator id for tasks enqueued by daemons/automation (no ctx.user).
// claude_code_tasks.createdBy is notNull FK -> users.id.
// Defaults to user id=1 (Rodrigo Rocha Meire, admin — confirmed seeded, defensor_ba_id=239).
// Override per environment via OMBUDS_SYSTEM_USER_ID.
export const SYSTEM_USER_ID = Number(process.env.OMBUDS_SYSTEM_USER_ID ?? 1);
