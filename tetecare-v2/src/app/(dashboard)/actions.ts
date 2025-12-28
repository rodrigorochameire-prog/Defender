"use server";

import { destroySession } from "@/lib/auth/session";

export async function logoutAction() {
  await destroySession();
}
