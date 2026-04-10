import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, NetworkOnly, StaleWhileRevalidate, Serwist } from "serwist";

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
    // tRPC API calls — NEVER cache (always hit network).
    // Offline fallback is handled in-app by useOfflineQuery + IndexedDB,
    // which stores a structured snapshot per list. Caching tRPC responses
    // in the Service Worker caused stale/empty lists to be served across
    // sessions even after the backend returned fresh data. Keep SW out of
    // business data entirely.
    {
      matcher: /\/api\/trpc\//i,
      handler: new NetworkOnly(),
    },
    // All other /api/* routes — never cache either
    {
      matcher: /\/api\//i,
      handler: new NetworkOnly(),
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

// One-time migration: wipe caches from prior SW versions that stored tRPC
// responses. A previous NetworkFirst strategy cached empty/zero-row replies
// when the backend was briefly unreachable, and served them indefinitely on
// every subsequent navigation. This listener runs on every activation, so
// existing users pick it up the first time they open the app after the
// deploy — combined with skipWaiting + clientsClaim, the transition is
// effectively instant.
const LEGACY_API_CACHES = new Set(["trpc-api"]);
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((name) => LEGACY_API_CACHES.has(name))
          .map((name) => caches.delete(name))
      );
    })()
  );
});
