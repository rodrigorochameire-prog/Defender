"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, splitLink } from "@trpc/client";
import { useState, Suspense } from "react";
import superjson from "superjson";
import { trpc } from "@/lib/trpc/client";
import { ThemeProvider } from "@/contexts/theme-context";
import { AssignmentProvider } from "@/contexts/assignment-context";
import { ProfissionalProvider } from "@/contexts/profissional-context";
import { ProcessingQueueProvider } from "@/contexts/processing-queue";
import { Toaster } from "sonner";

function getBaseUrl() {
  if (typeof window !== "undefined") return "";
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

// Queries que devem resolver em batch separado e rápido
// (auth/notif sem DB + queries críticas de renderização do feed)
const FAST_QUERIES = new Set([
  // Auth / layout — sem hit ao banco (cache in-memory)
  "users.me",
  "auth.me",
  "notifications.unreadCount",
  "profissionais.getEscalaAtual",
  "whatsappChat.listConfigs",
  "whatsappChat.getStats",
  // Radar — críticos para renderizar o feed (disparam separado das queries secundárias)
  "radar.list",
  "radar.totalCount",
  "radar.matchesPendentesCount",
  "radar.enrichmentHealth",
]);

// Loading spinner minimalista
function LoadingSpinner() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-50">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      </div>
    </div>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 2 * 60 * 1000, // 2 minutos — dados mudam pouco
            gcTime: 10 * 60 * 1000, // 10 minutos
            refetchOnWindowFocus: false,
            refetchOnMount: false,
            retry: 1,
          },
          mutations: {
            retry: 1,
          },
        },
      })
  );

  const [trpcClient] = useState(() => {
    const url = `${getBaseUrl()}/api/trpc`;

    return trpc.createClient({
      links: [
        // Separar queries leves (auth) das pesadas (listas)
        splitLink({
          condition: (op) => FAST_QUERIES.has(op.path),
          true: httpBatchLink({
            url,
            transformer: superjson,
            maxURLLength: 2083,
            fetch: (input, init) =>
              fetch(input, { ...init, signal: AbortSignal.timeout(15_000) }),
          }),
          false: httpBatchLink({
            url,
            transformer: superjson,
            maxURLLength: 2083,
            fetch: (input, init) =>
              fetch(input, { ...init, signal: AbortSignal.timeout(30_000) }),
          }),
        }),
      ],
    });
  });

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AssignmentProvider>
            <ProfissionalProvider>
              <ProcessingQueueProvider>
              <Suspense fallback={<LoadingSpinner />}>
                {children}
              </Suspense>
              <Toaster
                richColors
                position="top-right"
                toastOptions={{
                  className: "glass",
                  duration: 3000,
                }}
              />
            </ProcessingQueueProvider>
            </ProfissionalProvider>
          </AssignmentProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
