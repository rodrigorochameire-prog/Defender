/**
 * Credit Engine - Serviço centralizado para gerenciamento de créditos
 * 
 * Este serviço garante:
 * 1. Operações atômicas (transações de banco)
 * 2. Registro automático de transações financeiras
 * 3. Notificações para alertas de créditos baixos
 * 4. Consistência de dados entre pets, transações e calendário
 */

import { db, pets, transactions, notifications, calendarEvents, users, petTutors } from "@/lib/db";
import { eq } from "drizzle-orm";

// Tipos para o Credit Engine
export type CreditOperationType = 
  | "purchase"      // Compra de pacote
  | "checkin"       // Consumo por check-in
  | "checkout"      // Consumo por check-out (alternativo)
  | "refund"        // Estorno
  | "adjustment"    // Ajuste manual
  | "bonus"         // Bônus/cortesia
  | "expiration";   // Expiração de créditos

export interface CreditOperation {
  petId: number;
  credits: number; // positivo para adicionar, negativo para debitar
  type: CreditOperationType;
  description?: string;
  amountInCents?: number; // valor monetário (se aplicável)
  performedById: number; // ID do usuário que realizou a operação
  relatedEventId?: number; // ID do evento de calendário relacionado
  stripePaymentId?: string; // ID do pagamento no Stripe (se aplicável)
}

export interface CreditOperationResult {
  success: boolean;
  previousBalance: number;
  newBalance: number;
  transactionId?: number;
  error?: string;
}

/**
 * Realiza uma operação de crédito de forma atômica
 * Inclui atualização do pet, registro de transação e notificações
 */
export async function performCreditOperation(
  operation: CreditOperation
): Promise<CreditOperationResult> {
  try {
    // Buscar pet atual
    const pet = await db.query.pets.findFirst({
      where: eq(pets.id, operation.petId),
    });

    if (!pet) {
      return {
        success: false,
        previousBalance: 0,
        newBalance: 0,
        error: "Pet não encontrado",
      };
    }

    const previousBalance = pet.credits || 0;
    const newBalance = previousBalance + operation.credits;

    // Não permitir saldo negativo (exceto em ajustes administrativos)
    if (newBalance < 0 && operation.type !== "adjustment") {
      return {
        success: false,
        previousBalance,
        newBalance: previousBalance,
        error: "Créditos insuficientes",
      };
    }

    // Determinar tipo de transação para o banco
    const transactionType = operation.credits > 0 ? "credit_purchase" : "credit_use";

    // Executar operação atômica usando transação do banco
    const result = await db.transaction(async (tx) => {
      // 1. Atualizar créditos do pet
      await tx
        .update(pets)
        .set({
          credits: newBalance,
          updatedAt: new Date(),
        })
        .where(eq(pets.id, operation.petId));

      // 2. Registrar transação financeira
      const [newTransaction] = await tx
        .insert(transactions)
        .values({
          petId: operation.petId,
          userId: operation.performedById,
          type: transactionType,
          amount: operation.amountInCents || 0,
          credits: Math.abs(operation.credits),
          description: operation.description || getDefaultDescription(operation.type, operation.credits),
          stripePaymentId: operation.stripePaymentId || null,
        })
        .returning();

      // 3. Criar notificação se créditos ficaram baixos
      if (newBalance <= 3 && newBalance > 0 && previousBalance > 3) {
        // Buscar tutores do pet para notificar
        const tutorRelations = await tx
          .select({ tutorId: petTutors.tutorId })
          .from(petTutors)
          .where(eq(petTutors.petId, operation.petId));
        
        for (const relation of tutorRelations) {
          await tx.insert(notifications).values({
            userId: relation.tutorId,
            petId: operation.petId,
            type: "warning",
            title: "Créditos baixos",
            message: `${pet.name} tem apenas ${newBalance} crédito(s) restante(s). Considere adquirir mais créditos.`,
            actionUrl: "/tutor/credits",
          });
        }
      }

      // 4. Criar notificação crítica se créditos acabaram
      if (newBalance === 0 && previousBalance > 0) {
        const tutorRelations = await tx
          .select({ tutorId: petTutors.tutorId })
          .from(petTutors)
          .where(eq(petTutors.petId, operation.petId));
        
        for (const relation of tutorRelations) {
          await tx.insert(notifications).values({
            userId: relation.tutorId,
            petId: operation.petId,
            type: "error",
            title: "Créditos esgotados",
            message: `${pet.name} ficou sem créditos. Adquira mais créditos para continuar utilizando a creche.`,
            actionUrl: "/tutor/credits",
          });
        }

        // Notificar administradores também
        const admins = await tx.select().from(users).where(eq(users.role, "admin"));
        for (const admin of admins) {
          await tx.insert(notifications).values({
            userId: admin.id,
            petId: operation.petId,
            type: "warning",
            title: "Pet sem créditos",
            message: `O pet ${pet.name} ficou sem créditos.`,
            actionUrl: `/admin/pets/${operation.petId}`,
          });
        }
      }

      return newTransaction;
    });

    return {
      success: true,
      previousBalance,
      newBalance,
      transactionId: result.id,
    };
  } catch (error) {
    console.error("Erro na operação de crédito:", error);
    return {
      success: false,
      previousBalance: 0,
      newBalance: 0,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

/**
 * Adiciona créditos a um pet (compra de pacote)
 */
export async function addCredits(
  petId: number,
  credits: number,
  performedById: number,
  options?: {
    amountInCents?: number;
    stripePaymentId?: string;
    packageName?: string;
  }
): Promise<CreditOperationResult> {
  return performCreditOperation({
    petId,
    credits: Math.abs(credits), // Garantir positivo
    type: "purchase",
    performedById,
    amountInCents: options?.amountInCents,
    stripePaymentId: options?.stripePaymentId,
    description: options?.packageName 
      ? `Compra de pacote: ${options.packageName}`
      : `Adição de ${credits} crédito(s)`,
  });
}

/**
 * Debita créditos de um pet (consumo por uso)
 */
export async function debitCredits(
  petId: number,
  credits: number,
  performedById: number,
  options?: {
    type?: "checkin" | "checkout";
    eventId?: number;
    description?: string;
  }
): Promise<CreditOperationResult> {
  return performCreditOperation({
    petId,
    credits: -Math.abs(credits), // Garantir negativo
    type: options?.type || "checkin",
    performedById,
    relatedEventId: options?.eventId,
    description: options?.description || "Consumo de crédito por dia de creche",
  });
}

/**
 * Verifica se pet tem créditos suficientes
 */
export async function hasCredits(petId: number, required: number = 1): Promise<boolean> {
  const pet = await db.query.pets.findFirst({
    where: eq(pets.id, petId),
    columns: { credits: true },
  });

  return (pet?.credits || 0) >= required;
}

/**
 * Retorna o saldo de créditos do pet
 */
export async function getCreditsBalance(petId: number): Promise<number> {
  const pet = await db.query.pets.findFirst({
    where: eq(pets.id, petId),
    columns: { credits: true },
  });

  return pet?.credits || 0;
}

/**
 * Estorna créditos (em caso de erro ou cancelamento)
 */
export async function refundCredits(
  petId: number,
  credits: number,
  performedById: number,
  reason: string
): Promise<CreditOperationResult> {
  return performCreditOperation({
    petId,
    credits: Math.abs(credits),
    type: "refund",
    performedById,
    description: `Estorno: ${reason}`,
  });
}

/**
 * Adiciona créditos de bônus/cortesia
 */
export async function addBonusCredits(
  petId: number,
  credits: number,
  performedById: number,
  reason: string
): Promise<CreditOperationResult> {
  return performCreditOperation({
    petId,
    credits: Math.abs(credits),
    type: "bonus",
    performedById,
    description: `Bônus: ${reason}`,
  });
}

/**
 * Ajuste manual de créditos (apenas admin)
 */
export async function adjustCredits(
  petId: number,
  credits: number,
  performedById: number,
  reason: string
): Promise<CreditOperationResult> {
  return performCreditOperation({
    petId,
    credits, // Pode ser positivo ou negativo
    type: "adjustment",
    performedById,
    description: `Ajuste manual: ${reason}`,
  });
}

/**
 * Obtém descrição padrão para tipo de operação
 */
function getDefaultDescription(type: CreditOperationType, credits: number): string {
  const absCredits = Math.abs(credits);
  switch (type) {
    case "purchase":
      return `Compra de ${absCredits} crédito(s)`;
    case "checkin":
      return "Consumo por check-in na creche";
    case "checkout":
      return "Consumo por check-out da creche";
    case "refund":
      return `Estorno de ${absCredits} crédito(s)`;
    case "adjustment":
      return credits > 0 
        ? `Ajuste: adição de ${absCredits} crédito(s)` 
        : `Ajuste: remoção de ${absCredits} crédito(s)`;
    case "bonus":
      return `Bônus de ${absCredits} crédito(s)`;
    case "expiration":
      return `Expiração de ${absCredits} crédito(s)`;
    default:
      return `Operação de créditos: ${absCredits}`;
  }
}

/**
 * Obtém histórico de transações de crédito de um pet
 */
export async function getCreditHistory(petId: number, limit: number = 50) {
  return db.query.transactions.findMany({
    where: eq(transactions.petId, petId),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
    limit,
  });
}

/**
 * Relatório de créditos por período
 */
export async function getCreditReport(petId: number, startDate: Date, endDate: Date) {
  const history = await db
    .select()
    .from(transactions)
    .where(eq(transactions.petId, petId));

  // Filtrar por período
  const filtered = history.filter(t => {
    const date = new Date(t.createdAt);
    return date >= startDate && date <= endDate;
  });

  const added = filtered
    .filter(t => t.type === "credit_purchase")
    .reduce((sum, t) => sum + (t.credits || 0), 0);

  const used = filtered
    .filter(t => t.type === "credit_use")
    .reduce((sum, t) => sum + (t.credits || 0), 0);

  return {
    period: { startDate, endDate },
    added,
    used,
    net: added - used,
    transactions: filtered,
  };
}
