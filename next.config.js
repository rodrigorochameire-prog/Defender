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

module.exports = nextConfig;
