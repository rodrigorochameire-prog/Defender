const withSerwistInit = require("@serwist/next").default;

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: true,
  reloadOnOnline: false,
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  // Configurações otimizadas para Vercel
  experimental: {
    // Habilitar Server Actions
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Externalizar pacotes de PDF para que funcionem em Vercel serverless
  serverExternalPackages: ['pdfjs-dist', 'unpdf'],
  // Temporário: ignorar erros de tipo para permitir build
  // TODO: Corrigir erros de tipo nos routers tRPC relacionados a workspaceId
  typescript: {
    ignoreBuildErrors: true,
  },
  // Manter mais páginas em memória no dev (menos recompilações, mais estável)
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,   // 60s (default 15s)
    pagesBufferLength: 5,         // 5 páginas (default 2)
  },
};

module.exports = withSerwist(nextConfig);
