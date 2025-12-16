import * as db from "../db";
import { sendTextMessage } from "../whatsappService";
import { notifyOwner } from "../_core/notification";

/**
 * Job to send alerts for pets with low credits
 * Should be run daily (e.g., at 9 AM)
 */
export async function sendLowCreditsAlerts() {
  console.log("[LowCreditsAlerts] Starting low credits alerts job...");

  try {
    // Get pets with low credits (< 3)
    const threshold = 3;
    const petsWithLowCredits = await db.getPetsWithLowCredits(threshold);

    console.log(`[LowCreditsAlerts] Found ${petsWithLowCredits.length} pets with low credits`);

    let sentCount = 0;
    let errorCount = 0;

    for (const pet of petsWithLowCredits) {
      try {
        const credits = pet.credits || 0;
        
        // Build message
        let message = `⚠️ *Alerta de Créditos Baixos*\n\n`;
        message += `🐾 Pet: *${pet.name}*\n`;
        message += `💳 Créditos restantes: *${credits}*\n\n`;
        
        if (credits === 0) {
          message += `❌ Sem créditos disponíveis! O pet não poderá fazer check-in na creche até que novos créditos sejam adicionados.\n\n`;
        } else {
          message += `⏰ Restam apenas ${credits} ${credits === 1 ? 'dia' : 'dias'} de creche. Recomendamos adicionar mais créditos em breve.\n\n`;
        }
        
        message += `💡 Entre em contato com a creche para adicionar mais créditos e garantir o atendimento contínuo do seu pet.`;

        // Get pet tutors
        const petTutors = await db.getPetTutorsWithDetails(pet.id);

        for (const tutor of petTutors) {
          // Note: phone number would need to be added to getPetTutorsWithDetails
          // For now, we'll just log
          console.log(
            `[LowCreditsAlerts] Would send alert to ${tutor.name} for pet: ${pet.name} (${credits} credits)`
          );
        }

        // Notify owner
        await notifyOwner({
          title: `Alerta: ${pet.name} com créditos baixos`,
          content: `O pet ${pet.name} possui apenas ${credits} créditos restantes. Entre em contato com os tutores para adicionar mais créditos.`,
        });

        sentCount++;
      } catch (error) {
        console.error(`[LowCreditsAlerts] Error processing pet ${pet.id}:`, error);
        errorCount++;
      }
    }

    console.log(
      `[LowCreditsAlerts] Job completed. Sent: ${sentCount}, Errors: ${errorCount}`
    );

    return {
      success: true,
      processed: petsWithLowCredits.length,
      sent: sentCount,
      errors: errorCount,
    };
  } catch (error) {
    console.error("[LowCreditsAlerts] Job failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
