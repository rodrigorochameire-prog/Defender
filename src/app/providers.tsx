"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, httpLink, splitLink } from "@trpc/client";
import { useState, Suspense } from "react";
import superjson from "superjson";
import { trpc } from "@/lib/trpc/client";
import { ThemeProvider } from "@/contexts/theme-context";
import { AssignmentProvider } from "@/contexts/assignment-context";
import { DefensorProvider } from "@/contexts/defensor-context";
import { ProfissionalProvider } from "@/contexts/profissional-context";
import { ProcessingQueueProvider } from "@/contexts/processing-queue";
import { Toaster } from "sonner";
import { FeedbackFAB } from "@/components/shared/feedback-fab";

function getBaseUrl() {
  if (typeof window !== "undefined") return "";
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

// Queries leves que devem resolver rápido (auth, notificações, configs)
const FAST_QUERIES = new Set([
  "users.me",
  "auth.me",
  "notifications.unreadCount",
  "profissionais.list",
  "profissionais.getEscalaAtual",
  "whatsappChat.listConfigs",
  "whatsappChat.getStats",
]);

// Queries que recebem HTTP request próprio (sem batching) para não disputar pool de DB
const SOLO_QUERIES = new Set([
  "radar.list",
  "whatsappChat.listMessages",
  "whatsappChat.listContacts",
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
        // 1. radar.list → request HTTP próprio (sem batching) — nunca disputa pool
        splitLink({
          condition: (op) => SOLO_QUERIES.has(op.path),
          true: httpLink({
            url,
            transformer: superjson,
            fetch: (input, init) =>
              fetch(input, { ...init, signal: AbortSignal.timeout(15_000) }),
          }),
          // 2. Auth/notif → batch rápido (queries sem hit pesado ao banco)
          false: splitLink({
            condition: (op) => FAST_QUERIES.has(op.path),
            true: httpBatchLink({
              url,
              transformer: superjson,
              maxURLLength: 2083,
              fetch: (input, init) =>
                fetch(input, { ...init, signal: AbortSignal.timeout(10_000) }),
            }),
            // 3. Tudo mais → batch normal (pode ser mais lento)
            false: httpBatchLink({
              url,
              transformer: superjson,
              maxURLLength: 2083,
              fetch: (input, init) =>
                fetch(input, { ...init, signal: AbortSignal.timeout(30_000) }),
            }),
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
            <DefensorProvider>
            <ProfissionalProvider>
              <ProcessingQueueProvider>
              <Suspense fallback={<LoadingSpinner />}>
                {children}
              </Suspense>
              <FeedbackFAB />
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
          </DefensorProvider>
          </AssignmentProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
