"use client";

import { useDefensor } from "@/contexts/defensor-context";
import { usePermissions } from "@/hooks/use-permissions";

export function useIsViewingAsPeer(): boolean {
  const { selectedDefensorId } = useDefensor();
  const { user } = usePermissions();

  if (!user) return false;
  if (selectedDefensorId === null) return false;
  return selectedDefensorId !== user.id;
}
