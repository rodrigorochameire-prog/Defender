/**
 * Inngest API Route Handler
 *
 * Este endpoint recebe eventos do Inngest e executa as funções correspondentes.
 * maxDuration=300 permite que steps longos (transcrição, enrichment)
 * rodem por até 5 minutos sem timeout do Vercel.
 */

import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { functions } from "@/lib/inngest/functions";

// Permitir execuções longas (transcrição pode levar 5+ min)
export const maxDuration = 300;

// Servir o Inngest
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
});
