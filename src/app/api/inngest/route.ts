/**
 * Inngest API Route Handler
 * 
 * Este endpoint recebe eventos do Inngest e executa as funções correspondentes.
 */

import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { functions } from "@/lib/inngest/functions";

// Servir o Inngest
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
});
