/**
 * Attendance Service
 * 
 * Centraliza a lógica de check-in/check-out com transações atômicas.
 * Usa o Credit Engine para operações de crédito.
 * Garante que todas as operações sejam executadas como uma única unidade.
 */

import { db } from "@/lib/db";
import { pets, calendarEvents, dailyLogs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { debitCredits, hasCredits } from "./credit-engine";

// Tipos
export interface CheckInResult {
  success: boolean;
  pet: {
    id: number;
    name: string;
    credits: number;
    status: string;
  };
  eventId: number;
  logId?: number;
  message: string;
}

export interface CheckOutResult {
  success: boolean;
  pet: {
    id: number;
    name: string;
    credits: number;
    status: string;
  };
  eventId: number;
  logId?: number;
  message: string;
}

export interface CheckInOptions {
  petId: number;
  userId: number;
  bypassReason?: string; // Se fornecido, significa que houve bypass de bloqueio
  notes?: string;
}

export interface CheckOutOptions {
  petId: number;
  userId: number;
  notes?: string;
}

/**
 * Realiza o check-in de um pet usando transação atômica
 * 
 * Fluxo:
 * 1. Valida o pet existe e não está já na creche
 * 2. Valida se tem créditos (a menos que seja bypass)
 * 3. Atualiza status do pet para "checked-in"
 * 4. Debita 1 crédito
 * 5. Cria evento no calendário
 * 6. Cria log diário (se houver observações ou bypass)
 * 7. Cria transação financeira de uso de crédito
 */
export async function performCheckIn(options: CheckInOptions): Promise<CheckInResult> {
  const { petId, userId, bypassReason, notes } = options;

  return await db.transaction(async (tx) => {
    // 1. Buscar pet
    const [pet] = await tx
      .select()
      .from(pets)
      .where(eq(pets.id, petId))
      .limit(1);

    if (!pet) {
      throw new Error("Pet não encontrado");
    }

    if (pet.status === "checked-in") {
      throw new Error("Pet já está na creche");
    }

    // 2. Validar créditos (a menos que seja bypass)
    if ((pet.credits || 0) <= 0 && !bypassReason) {
      throw new Error("Pet sem créditos disponíveis");
    }

    const newCredits = Math.max((pet.credits || 0) - 1, 0);

    // 3. Atualizar status do pet e debitar crédito
    const [updatedPet] = await tx
      .update(pets)
      .set({
        status: "checked-in",
        credits: newCredits,
        updatedAt: new Date(),
      })
      .where(eq(pets.id, petId))
      .returning();

    // 4. Criar evento no calendário
    const [event] = await tx
      .insert(calendarEvents)
      .values({
        title: `Check-in: ${pet.name}`,
        eventDate: new Date(),
        eventType: "checkin",
        petId: petId,
        isAllDay: false,
        notes: bypassReason ? `BYPASS: ${bypassReason}` : notes,
        createdById: userId,
      })
      .returning();

    // 5. Criar log diário (se houver bypass ou observações importantes)
    let logId: number | undefined;
    if (bypassReason || notes) {
      const [log] = await tx
        .insert(dailyLogs)
        .values({
          petId: petId,
          logDate: new Date(),
          source: "daycare",
          logType: "general",
          notes: bypassReason 
            ? `[CHECK-IN COM BYPASS] Motivo: ${bypassReason}${notes ? `. Obs: ${notes}` : ""}`
            : `[CHECK-IN] ${notes}`,
          createdById: userId,
        })
        .returning();
      logId = log.id;
    }

    // 6. O débito de crédito já foi feito pelo Credit Engine no router
    // A transação financeira é registrada automaticamente pelo Credit Engine

    return {
      success: true,
      pet: {
        id: updatedPet.id,
        name: updatedPet.name,
        credits: updatedPet.credits,
        status: updatedPet.status,
      },
      eventId: event.id,
      logId,
      message: `${pet.name} fez check-in com sucesso!`,
    };
  });
}

/**
 * Realiza o check-out de um pet usando transação atômica
 * 
 * Fluxo:
 * 1. Valida o pet existe e está na creche
 * 2. Atualiza status do pet para "active"
 * 3. Cria evento no calendário
 * 4. Cria log diário (se houver observações)
 */
export async function performCheckOut(options: CheckOutOptions): Promise<CheckOutResult> {
  const { petId, userId, notes } = options;

  return await db.transaction(async (tx) => {
    // 1. Buscar pet
    const [pet] = await tx
      .select()
      .from(pets)
      .where(eq(pets.id, petId))
      .limit(1);

    if (!pet) {
      throw new Error("Pet não encontrado");
    }

    if (pet.status !== "checked-in") {
      throw new Error("Pet não está na creche");
    }

    // 2. Atualizar status do pet
    const [updatedPet] = await tx
      .update(pets)
      .set({
        status: "active",
        updatedAt: new Date(),
      })
      .where(eq(pets.id, petId))
      .returning();

    // 3. Criar evento no calendário
    const [event] = await tx
      .insert(calendarEvents)
      .values({
        title: `Check-out: ${pet.name}`,
        eventDate: new Date(),
        eventType: "checkout",
        petId: petId,
        isAllDay: false,
        notes: notes,
        createdById: userId,
      })
      .returning();

    // 4. Criar log diário (se houver observações)
    let logId: number | undefined;
    if (notes) {
      const [log] = await tx
        .insert(dailyLogs)
        .values({
          petId: petId,
          logDate: new Date(),
          source: "daycare",
          logType: "general",
          notes: `[CHECK-OUT] ${notes}`,
          createdById: userId,
        })
        .returning();
      logId = log.id;
    }

    // 5. Se precisar debitar crédito no checkout, usar Credit Engine
    // (normalmente o débito é feito no check-in)
    
    return {
      success: true,
      pet: {
        id: updatedPet.id,
        name: updatedPet.name,
        credits: updatedPet.credits,
        status: updatedPet.status,
      },
      eventId: event.id,
      logId,
      message: `${pet.name} fez check-out com sucesso!`,
    };
  });
}

/**
 * Verifica se um pet pode fazer check-in
 * Retorna lista de alertas/bloqueios
 */
export async function validateCheckIn(petId: number): Promise<{
  canCheckIn: boolean;
  alerts: Array<{
    type: string;
    severity: "warning" | "critical";
    message: string;
    blocking: boolean;
  }>;
}> {
  const [pet] = await db
    .select()
    .from(pets)
    .where(eq(pets.id, petId))
    .limit(1);

  if (!pet) {
    return {
      canCheckIn: false,
      alerts: [{ type: "error", severity: "critical", message: "Pet não encontrado", blocking: true }],
    };
  }

  const alerts: Array<{ type: string; severity: "warning" | "critical"; message: string; blocking: boolean }> = [];

  // Verificar status
  if (pet.status === "checked-in") {
    alerts.push({
      type: "status",
      severity: "critical",
      message: "Pet já está na creche",
      blocking: true,
    });
  }

  // Verificar créditos
  if ((pet.credits || 0) <= 0) {
    alerts.push({
      type: "credits",
      severity: "critical",
      message: "Sem créditos disponíveis",
      blocking: true,
    });
  } else if ((pet.credits || 0) <= 3) {
    alerts.push({
      type: "credits",
      severity: "warning",
      message: `Poucos créditos: ${pet.credits}`,
      blocking: false,
    });
  }

  // TODO: Adicionar verificação de vacinas vencidas
  // TODO: Adicionar verificação de preventivos vencidos
  // TODO: Adicionar verificação de incompatibilidade com outros pets na creche

  const hasBlockingAlert = alerts.some(a => a.blocking);

  return {
    canCheckIn: !hasBlockingAlert,
    alerts,
  };
}
