"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { useState, Suspense, ReactNode, useEffect } from "react";
import superjson from "superjson";
import { trpc } from "@/lib/trpc/client";
import { ThemeProvider } from "@/contexts/theme-context";
import { Toaster } from "sonner";

function getBaseUrl() {
  if (typeof window !== "undefined") return "";
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

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

// Wrapper condicional para Clerk - carrega dinamicamente apenas se disponível
function ClerkWrapper({ children }: { children: ReactNode }) {
  const [ClerkProvider, setClerkProvider] = useState<React.ComponentType<any> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verificar se a chave do Clerk está disponível
    const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    
    if (clerkKey) {
      // Importar Clerk dinamicamente
      import("@clerk/nextjs").then(({ ClerkProvider: CP }) => {
        import("@clerk/localizations").then(({ ptBR }) => {
          const WrappedProvider = ({ children }: { children: ReactNode }) => (
            <CP 
              localization={ptBR}
              signInFallbackRedirectUrl="/auth-redirect"
              signUpFallbackRedirectUrl="/auth-redirect"
              signInUrl="/sign-in"
              signUpUrl="/sign-up"
            >
              {children}
            </CP>
          );
          setClerkProvider(() => WrappedProvider);
          setIsLoading(false);
        });
      }).catch(() => {
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, []);

  if (isLoading) {
    return <>{children}</>;
  }

  if (ClerkProvider) {
    return <ClerkProvider>{children}</ClerkProvider>;
  }

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000, // 30 segundos - melhor cache
            gcTime: 5 * 60 * 1000, // 5 minutos
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

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
          transformer: superjson,
          // Batching para melhor performance
          maxURLLength: 2083,
        }),
      ],
    })
  );

  return (
    <ClerkWrapper>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
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
          </ThemeProvider>
        </QueryClientProvider>
      </trpc.Provider>
    </ClerkWrapper>
  );
}
