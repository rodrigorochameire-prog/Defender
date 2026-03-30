import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, NetworkFirst, StaleWhileRevalidate, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Fonts — cache-first, long TTL
    {
      matcher: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
      handler: new CacheFirst({
        cacheName: "google-fonts",
        matchOptions: { ignoreVary: true },
        plugins: [
          {
            cacheWillUpdate: async ({ response }) => {
              return response?.status === 200 ? response : null;
            },
          },
        ],
      }),
    },
    // Static assets (images, logos) — cache-first, 30 days
    {
      matcher: /\.(?:png|jpg|jpeg|svg|gif|ico|webp)$/i,
      handler: new CacheFirst({
        cacheName: "static-images",
        plugins: [
          {
            cacheWillUpdate: async ({ response }) => {
              return response?.status === 200 ? response : null;
            },
          },
        ],
      }),
    },
    // CSS/JS chunks — stale-while-revalidate
    {
      matcher: /\/_next\/static\/.*/i,
      handler: new StaleWhileRevalidate({
        cacheName: "next-static",
      }),
    },
    // tRPC GET API calls — network-first with cache fallback
    {
      matcher: /\/api\/trpc\/.+\?.*batch=1/i,
      handler: new NetworkFirst({
        cacheName: "trpc-api",
        networkTimeoutSeconds: 10,
        plugins: [
          {
            cacheWillUpdate: async ({ response }) => {
              return response?.status === 200 ? response : null;
            },
          },
        ],
      }),
      method: "GET",
    },
    // Supabase images — cache-first
    {
      matcher: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
      handler: new CacheFirst({
        cacheName: "supabase-storage",
        plugins: [
          {
            cacheWillUpdate: async ({ response }) => {
              return response?.status === 200 ? response : null;
            },
          },
        ],
      }),
    },
    // Default — use Serwist defaults for everything else
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
